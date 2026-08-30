import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { PresentationViewerComponent } from '../../shared/components/presentation-viewer/presentation-viewer.component';
import { CoursesService } from '../../core/services/courses.service';
import { QuizService } from '../../core/services/quiz.service';
import { AuthService } from '../../core/services/auth.service';
import { LessonDetail, QuizEvaluationResponse } from '../../core/models';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfViewerModalComponent } from '../../shared/components/pdf-viewer-modal/pdf-viewer-modal.component';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink, PresentationViewerComponent, PdfViewerModalComponent],
  templateUrl: './lesson.component.html',
  styleUrl: './lesson.component.css',
})
export class LessonComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly quizService = inject(QuizService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly lesson = signal<LessonDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly isSavingProgress = signal(false);

  // Interaction tracking for unlocking exam
  readonly hasViewedContent = signal(false);
  readonly downloadedSheets = signal<Set<string>>(new Set());
  readonly manualSheetsViewed = signal(false); // Fallback for manual checkbox

  // Selected answers: { [questionId: string]: optionIndex }
  readonly selectedAnswers = signal<Record<string, number>>({});
  readonly quizResult = signal<QuizEvaluationResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isQuizStarted = signal(false);

  // New UI states
  readonly isPresentationOpen = signal(false);
  readonly pdfPreviews = signal<Record<string, SafeResourceUrl>>({});
  private generatedBlobUrls: string[] = [];
  readonly pdfBlobUrls = signal<Record<string, SafeResourceUrl>>({});
  readonly activeModalPdfUrl = signal<SafeResourceUrl | null>(null);
  readonly activeModalPdfTitle = signal<string>('');
  readonly activeModalItem = signal<any | null>(null);
  readonly activeModalType = signal<'sheet' | 'doc' | null>(null);
  readonly isPdfModalOpen = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const lessonId = params.get('id');
      if (lessonId) {
        this.loadLesson(lessonId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const action = queryParams.get('action');
      if (action === 'start-quiz') {
        this.isQuizStarted.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    for (const url of this.generatedBlobUrls) {
      window.URL.revokeObjectURL(url);
    }
  }

  loadLesson(lessonId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.quizResult.set(null);
    this.isQuizStarted.set(false);
    this.selectedAnswers.set({});
    this.hasViewedContent.set(false);
    this.downloadedSheets.set(new Set());
    this.manualSheetsViewed.set(false);
    this.isPresentationOpen.set(false);
    this.pdfPreviews.set({});
    for (const url of this.generatedBlobUrls) {
      window.URL.revokeObjectURL(url);
    }
    this.generatedBlobUrls = [];
    this.pdfBlobUrls.set({});
    this.activeModalPdfUrl.set(null);
    this.activeModalPdfTitle.set('');
    this.activeModalItem.set(null);
    this.activeModalType.set(null);
    this.isPdfModalOpen.set(false);

    this.coursesService.getLessonById(lessonId).subscribe({
      next: (data) => {
        this.lesson.set(data);
        if (data.savedAnswers) {
          this.selectedAnswers.set(data.savedAnswers);
        } else {
          this.selectedAnswers.set({});
        }
        
        // Restore progress from DB
        this.hasViewedContent.set(data.hasViewedContent ?? false);
        this.manualSheetsViewed.set(data.hasViewedSheets ?? false);
        this.manualDocsViewed.set(data.hasViewedDocs ?? false);

        // Auto-complete content if none exists
        if (!data.presentationUrl && !data.content && !this.hasViewedContent()) {
          this.hasViewedContent.set(true);
          this.coursesService.updateLessonProgress(data.id, { hasViewedContent: true }).subscribe();
        }
        
        this.isLoading.set(false);

        // Load PDF previews in the background
        if (data.technicalSheets) {
          for (const sheet of data.technicalSheets) {
            this.generatePdfPreview(data.id, sheet.id, sheet.fileUrl, 'sheet');
          }
        }
        if (data.lessonDocuments) {
          for (const doc of data.lessonDocuments) {
            this.generatePdfPreview(data.id, doc.id, doc.fileUrl, 'doc');
          }
        }

        const requestedAction = this.route.snapshot.queryParams['action'];
        
        if (requestedAction === 'start-quiz' && data.quizQuestions?.length > 0) {
          this.isQuizStarted.set(true);
          setTimeout(() => {
            document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg =
          err.error?.message ||
          'No tienes acceso a esta clase o ocurrió un problema al cargarla.';
        this.errorMessage.set(Array.isArray(msg) ? msg[0] : msg);
      },
    });
  }

  get isSheetsViewed(): boolean {
    const l = this.lesson();
    if (!l) return false;
    if (!l.technicalSheets || l.technicalSheets.length === 0) return true;
    if (this.manualSheetsViewed()) return true;
    return this.downloadedSheets().size === l.technicalSheets.length;
  }

  get isExamUnlocked(): boolean {
    // Admins always bypass locks
    if (this.authService.isAdmin()) return true;
    
    // If lesson is completed, exam is unlocked
    if (this.lesson()?.status === 'COMPLETED') return true;
    
    return this.hasViewedContent() && this.isSheetsViewed && this.isDocsViewed;
  }

  openPresentation(): void {
    this.isPresentationOpen.set(true);
    if (!this.hasViewedContent()) {
      this.hasViewedContent.set(true);
      const l = this.lesson();
      if (l) this.coursesService.updateLessonProgress(l.id, { hasViewedContent: true }).subscribe();
    }
  }

  closePresentation(): void {
    this.isPresentationOpen.set(false);
  }

  toggleManualSheetsViewed(): void {
    const newVal = !this.manualSheetsViewed();
    this.manualSheetsViewed.set(newVal);
    const l = this.lesson();
    if (l) this.coursesService.updateLessonProgress(l.id, { hasViewedSheets: newVal }).subscribe();
  }

  onSelectOption(questionId: string, optionIndex: number): void {
    this.selectedAnswers.update((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  saveQuizProgress(): void {
    const currentLesson = this.lesson();
    if (!currentLesson) return;

    this.isSavingProgress.set(true);

    const answersPayload = Object.entries(this.selectedAnswers()).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));

    this.quizService.saveProgress(currentLesson.id, answersPayload).subscribe({
      next: () => {
        this.isSavingProgress.set(false);
      },
      error: (err) => {
        console.error('Failed to save progress', err);
        this.isSavingProgress.set(false);
      }
    });
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  startQuizSection(): void {
    if (!this.isExamUnlocked) return;
    this.isQuizStarted.set(true);
    setTimeout(() => {
      document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  isAllAnswered(): boolean {
    const currentLesson = this.lesson();
    if (!currentLesson || !currentLesson.quizQuestions.length) return false;
    const answeredCount = Object.keys(this.selectedAnswers()).length;
    return answeredCount === currentLesson.quizQuestions.length;
  }

  submitQuiz(): void {
    const currentLesson = this.lesson();
    if (!currentLesson || !this.isAllAnswered()) return;

    this.isSubmitting.set(true);

    const answersPayload = Object.entries(this.selectedAnswers()).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));

    this.quizService.submitQuiz(currentLesson.id, answersPayload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.quizResult.set(res);

        this.lesson.update(l => {
          if (l) {
            return { ...l, attemptsCount: l.attemptsCount + 1, status: res.passed ? 'COMPLETED' : l.status };
          }
          return l;
        });

        if (res.passed) {
          this.coursesService.getLessonById(currentLesson.id).subscribe((updated) => {
            this.lesson.set(updated);
          });
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  isQuestionCorrect(questionId: string): boolean | null {
    const result = this.quizResult();
    if (!result || !result.questionResults) return null;
    const qRes = result.questionResults.find(r => r.questionId === questionId);
    return qRes ? qRes.isCorrect : null;
  }

  resetQuiz(): void {
    this.quizResult.set(null);
    this.selectedAnswers.set({});
  }

  goToNextLesson(nextLessonId: string): void {
    this.router.navigate(['/lessons', nextLessonId]);
  }

  getNextLesson(): any {
    const l = this.lesson();
    if (!l || !l.syllabus) return null;
    const currentIndex = l.syllabus.findIndex((item) => item.id === l.id);
    if (currentIndex >= 0 && currentIndex < l.syllabus.length - 1) {
      return l.syllabus[currentIndex + 1];
    }
    return null;
  }

  goToNextSyllabusLesson(): void {
    const next = this.getNextLesson();
    if (next) {
      this.router.navigate(['/lessons', next.id]);
    }
  }

  selectLesson(item: { id: string; status: string }): void {
    if (!this.authService.isAdmin() && item.status === 'LOCKED') return;
    this.router.navigate(['/lessons', item.id]);
  }

  getSafePresentationUrl(presentationUrl: string): SafeResourceUrl | null {
    if (!presentationUrl) return null;
    const fullUrl = presentationUrl.startsWith('http')
      ? presentationUrl
      : `${window.location.origin}${presentationUrl}`;
    const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(officeViewer);
  }

  isPreziUrl(url?: string | null): boolean {
    return !!url && url.toLowerCase().includes('prezi.com');
  }

  toggleFullscreenPresentation(): void {
    const el = document.getElementById('presentation-fullscreen-box');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  downloadTechnicalSheet(sheet: any): void {
    // Register the sheet as viewed
    this.downloadedSheets.update(set => {
      const newSet = new Set(set);
      newSet.add(sheet.id);
      return newSet;
    });

    if (!this.manualSheetsViewed()) {
      this.manualSheetsViewed.set(true);
      const l = this.lesson();
      if (l) this.coursesService.updateLessonProgress(l.id, { hasViewedSheets: true }).subscribe();
    }

    this.coursesService.downloadTechnicalSheet(sheet.fileUrl).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sheet.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('No se pudo descargar el archivo.');
      }
    });
  }

  // --- Documentation Documents ---
  readonly downloadedDocs = signal<Set<string>>(new Set());
  readonly manualDocsViewed = signal(false);

  get isDocsViewed(): boolean {
    const l = this.lesson();
    if (!l) return false;
    if (!l.lessonDocuments || l.lessonDocuments.length === 0) return true;
    if (this.manualDocsViewed()) return true;
    return this.downloadedDocs().size === l.lessonDocuments.length;
  }

  toggleManualDocsViewed(): void {
    const newVal = !this.manualDocsViewed();
    this.manualDocsViewed.set(newVal);
    const l = this.lesson();
    if (l) this.coursesService.updateLessonProgress(l.id, { hasViewedDocs: newVal }).subscribe();
  }

  downloadLessonDocument(doc: any): void {
    this.downloadedDocs.update(set => {
      const newSet = new Set(set);
      newSet.add(doc.id);
      return newSet;
    });

    if (!this.manualDocsViewed()) {
      this.manualDocsViewed.set(true);
      const l = this.lesson();
      if (l) this.coursesService.updateLessonProgress(l.id, { hasViewedDocs: true }).subscribe();
    }

    this.coursesService.downloadLessonDocument(doc.fileUrl).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('No se pudo descargar el documento.');
      }
    });
  }

  private async generatePdfPreview(lessonId: string, id: string, fileUrl: string, type: 'sheet' | 'doc'): Promise<void> {
    if (!id || !fileUrl) return;
    try {
      const obs = type === 'sheet'
        ? this.coursesService.downloadTechnicalSheet(fileUrl)
        : this.coursesService.downloadLessonDocument(fileUrl);

      const blob = await new Promise<Blob>((resolve, reject) => {
        obs.subscribe({
          next: (b) => resolve(b),
          error: (e) => reject(e)
        });
      });

      // Explicitly set MIME type to application/pdf to prevent browser from downloading the Blob URL
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const arrayBuffer = await pdfBlob.arrayBuffer();

      // Set worker to match our package version 6.2.108 unconditionally
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set target width to 300px for high-definition scaling in the 44px card preview container
      const targetWidth = 300;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);

      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl + '#toolbar=0&navpanes=0&view=Fit');

      // Verify we are still on the same lesson before updating signal state
      if (this.lesson()?.id !== lessonId) {
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      this.generatedBlobUrls.push(blobUrl);

      this.pdfPreviews.update((prev) => ({
        ...prev,
        [id]: safeUrl,
      }));

      this.pdfBlobUrls.update((prev) => ({
        ...prev,
        [id]: safeBlobUrl,
      }));

      // If this item is the currently open modal item, set the active URL immediately
      if (this.isPdfModalOpen() && this.activeModalItem()?.id === id) {
        this.activeModalPdfUrl.set(safeBlobUrl);
      }
    } catch (error) {
      console.warn(`Could not generate PDF preview for ${id}:`, error);
    }
  }

  openPdfModal(item: any, type: 'sheet' | 'doc'): void {
    this.activeModalItem.set(item);
    this.activeModalType.set(type);
    this.activeModalPdfTitle.set(item.originalName || 'Visualizador de PDF');
    this.isPdfModalOpen.set(true);

    const safeUrl = this.pdfBlobUrls()[item.id];
    if (safeUrl) {
      this.activeModalPdfUrl.set(safeUrl);
    } else {
      this.activeModalPdfUrl.set(null);
    }
  }

  closePdfModal(): void {
    this.isPdfModalOpen.set(false);
    this.activeModalPdfUrl.set(null);
    this.activeModalPdfTitle.set('');
    this.activeModalItem.set(null);
    this.activeModalType.set(null);
  }

  downloadPdfFromModal(): void {
    const item = this.activeModalItem();
    const type = this.activeModalType();
    if (item && type) {
      if (type === 'sheet') {
        this.downloadTechnicalSheet(item);
      } else {
        this.downloadLessonDocument(item);
      }
    }
  }
}
