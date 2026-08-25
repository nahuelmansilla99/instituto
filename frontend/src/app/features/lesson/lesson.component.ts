import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { PresentationViewerComponent } from '../../shared/components/presentation-viewer/presentation-viewer.component';
import { CoursesService } from '../../core/services/courses.service';
import { QuizService } from '../../core/services/quiz.service';
import { AuthService } from '../../core/services/auth.service';
import { LessonDetail, QuizEvaluationResponse } from '../../core/models';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink, PresentationViewerComponent],
  templateUrl: './lesson.component.html',
  styleUrl: './lesson.component.css',
})
export class LessonComponent implements OnInit {
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

  // View Mode: 'content' | 'presentation'
  readonly activeLessonView = signal<'content' | 'presentation'>('content');

  // Selected answers: { [questionId: string]: optionIndex }
  readonly selectedAnswers = signal<Record<string, number>>({});
  readonly quizResult = signal<QuizEvaluationResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isQuizStarted = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const lessonId = params.get('id');
      if (lessonId) {
        this.loadLesson(lessonId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const view = queryParams.get('view');
      if (view === 'presentation') {
        this.activeLessonView.set('presentation');
      } else if (view === 'content') {
        this.activeLessonView.set('content');
      }
    });
  }

  loadLesson(lessonId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.quizResult.set(null);
    this.isQuizStarted.set(false);
    this.activeLessonView.set('content');
    this.selectedAnswers.set({});

    this.coursesService.getLessonById(lessonId).subscribe({
      next: (data) => {
        this.lesson.set(data);
        if (data.savedAnswers) {
          this.selectedAnswers.set(data.savedAnswers);
        } else {
          this.selectedAnswers.set({});
        }
        this.isLoading.set(false);
        const requestedView = this.route.snapshot.queryParams['view'];
        const requestedAction = this.route.snapshot.queryParams['action'];
        
        if (requestedAction === 'start-quiz' && data.quizQuestions?.length > 0) {
          this.isQuizStarted.set(true);
          this.activeLessonView.set('content');
          setTimeout(() => {
            document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else if (requestedView === 'presentation' || (data.presentationUrl && requestedView !== 'content')) {
          this.activeLessonView.set('presentation');
        } else {
          this.activeLessonView.set('content');
        }
        
        if (requestedAction !== 'start-quiz') {
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
        // Optionally show a toast or success message here
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
    this.isQuizStarted.set(true);
    setTimeout(() => {
      document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
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

        // Update local lesson state
        this.lesson.update(l => {
          if (l) {
            return { ...l, attemptsCount: l.attemptsCount + 1 };
          }
          return l;
        });

        // If passed, refresh lesson syllabus to show updated status immediately
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
    if (this.authService.currentUser()?.role !== 'ADMIN' && item.status === 'LOCKED') return;
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
}
