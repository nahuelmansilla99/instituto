import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { AdminService, AdminCourseDetail } from '../../../core/services/admin.service';
import {
  AdminQuizQuestion,
  EnrolledStudentReport,
  StudentSummary,
  StudentCourseProgressReport,
} from '../../../core/models';

export interface MergedStudentRow {
  studentId: string;
  name: string;
  email: string;
  isEnrolled: boolean;
  enrollmentId?: string;
  enrolledAt?: string;
  totalLessons?: number;
  completedLessons?: number;
  progressPercentage?: number;
  averageScore?: number | null;
}

@Component({
  selector: 'app-admin-course-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink],
  templateUrl: './admin-course-editor.component.html',
  styleUrl: './admin-course-editor.component.css',
})
export class AdminCourseEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly course = signal<AdminCourseDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly presentationSuccessMessage = signal<string | null>(null);

  // Tab: 'content' | 'students'
  readonly activeTab = signal<'content' | 'students'>('content');

  // Students Tab State
  readonly enrolledStudents = signal<EnrolledStudentReport[]>([]);
  readonly allPlatformStudents = signal<StudentSummary[]>([]);
  readonly isLoadingStudents = signal(false);
  
  readonly mergedStudentsList = computed<MergedStudentRow[]>(() => {
    const all = this.allPlatformStudents();
    const enrolled = this.enrolledStudents();
    
    return all.map(student => {
      const enrolledData = enrolled.find(e => e.studentId === student.id);
      if (enrolledData) {
        return {
          studentId: enrolledData.studentId,
          name: enrolledData.name,
          email: enrolledData.email,
          isEnrolled: true,
          enrollmentId: enrolledData.enrollmentId,
          enrolledAt: enrolledData.enrolledAt,
          totalLessons: enrolledData.totalLessons,
          completedLessons: enrolledData.completedLessons,
          progressPercentage: enrolledData.progressPercentage,
          averageScore: enrolledData.averageScore
        };
      } else {
        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
          isEnrolled: false
        };
      }
    });
  });

  readonly showStudentProgressModal = signal(false);
  readonly selectedStudentReport = signal<StudentCourseProgressReport | null>(null);

  // Course Edit Modal
  readonly showEditCourseModal = signal(false);
  readonly isSavingCourse = signal(false);
  readonly courseEditForm = this.fb.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    thumbnailUrl: [''],
    meetUrl: [''],
  });

  // Meet Modal
  readonly showMeetModal = signal(false);
  readonly meetForm = this.fb.group({
    meetUrl: [''],
  });

  // Lesson Modal
  readonly showLessonModal = signal(false);
  readonly isEditingLesson = signal(false);
  readonly currentEditingLessonId = signal<string | null>(null);
  readonly selectedModalPresentationFile = signal<File | null>(null);
  readonly lessonForm = this.fb.group({
    title: ['', [Validators.required]],
    content: ['', [Validators.required]],
    orderNumber: [null],
    meetUrl: [''],
    presentationUrl: [''],
    availableAt: [''],
  });

  // Dedicated Prezi / Presentation Link Modal
  readonly showPreziModal = signal(false);
  readonly selectedPreziLesson = signal<any | null>(null);
  readonly preziInputUrl = signal('');
  readonly preziInputTitle = signal('');
  readonly isSavingPrezi = signal(false);

  // Questions Modal
  readonly showQuestionsModal = signal(false);
  readonly activeLesson = signal<any | null>(null);
  readonly activeQuestions = signal<AdminQuizQuestion[]>([]);
  readonly isSavingQuestion = signal(false);
  
  readonly isEditingQuestion = signal(false);
  readonly currentEditingQuestionId = signal<string | null>(null);

  readonly questionForm = this.fb.group({
    questionText: ['', [Validators.required]],
    optionA: ['', [Validators.required]],
    optionB: ['', [Validators.required]],
    optionC: [''],
    optionD: [''],
    correctOptionIndex: [0, [Validators.required]],
  });

  // Lesson Students Modal
  readonly showLessonStudentsModal = signal(false);
  readonly activeLessonForStudents = signal<any | null>(null);
  readonly lessonStudentsList = signal<any[]>([]);
  readonly isLoadingLessonStudents = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const courseId = params.get('id');
      if (courseId) {
        this.loadCourse(courseId);
        this.loadEnrolledStudents(courseId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const tab = queryParams.get('tab');
      if (tab === 'students') {
        this.activeTab.set('students');
      } else if (tab === 'content') {
        this.activeTab.set('content');
      }
    });
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);
    this.adminService.getCourseAdmin(courseId).subscribe({
      next: (data) => {
        this.course.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  // ----------------------------------------------------
  // STUDENTS MANAGEMENT
  // ----------------------------------------------------
  switchTabToStudents(): void {
    this.activeTab.set('students');
    const c = this.course();
    if (c) {
      this.loadEnrolledStudents(c.id);
    }
  }

  loadEnrolledStudents(courseId: string): void {
    this.isLoadingStudents.set(true);
    
    this.adminService.getAllStudents().subscribe({
      next: (allStudents) => {
        this.allPlatformStudents.set(allStudents);
        this.adminService.getCourseStudents(courseId).subscribe({
          next: (enrolled) => {
            this.enrolledStudents.set(enrolled);
            this.isLoadingStudents.set(false);
          },
          error: () => {
            this.isLoadingStudents.set(false);
          },
        });
      },
      error: () => {
        this.isLoadingStudents.set(false);
      },
    });
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getAverageCourseProgress(): number {
    const list = this.enrolledStudents();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + (s.progressPercentage || 0), 0);
    return Math.round(sum / list.length);
  }

  getOverallAverageScore(): number {
    const list = this.enrolledStudents().filter((s) => s.averageScore !== null);
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + (s.averageScore || 0), 0);
    return Math.round(sum / list.length);
  }

  readonly showUnenrollConfirmModal = signal(false);
  readonly studentToUnenroll = signal<MergedStudentRow | null>(null);

  toggleEnrollment(student: MergedStudentRow): void {
    const c = this.course();
    if (!c) return;

    if (student.isEnrolled) {
      this.studentToUnenroll.set(student);
      this.showUnenrollConfirmModal.set(true);
    } else {
      this.adminService.enrollStudent(c.id, student.email).subscribe({
        next: () => {
          this.loadEnrolledStudents(c.id);
        },
        error: (err) => {
          alert('Error al matricular: ' + (err.error?.message || ''));
        }
      });
    }
  }

  cancelUnenroll(): void {
    this.showUnenrollConfirmModal.set(false);
    this.studentToUnenroll.set(null);
  }

  confirmUnenroll(): void {
    const student = this.studentToUnenroll();
    const c = this.course();
    if (!c || !student) return;

    this.adminService.unenrollStudent(c.id, student.studentId).subscribe({
      next: () => {
        this.loadEnrolledStudents(c.id);
        this.cancelUnenroll();
      },
      error: (err) => {
        alert('Error al desmatricular: ' + (err.error?.message || ''));
        this.cancelUnenroll();
      }
    });
  }

  viewStudentProgress(student: MergedStudentRow): void {
    const c = this.course();
    if (!c || !student.isEnrolled) return;

    this.adminService.getStudentCourseProgress(c.id, student.studentId).subscribe({
      next: (report) => {
        this.selectedStudentReport.set(report);
        this.showStudentProgressModal.set(true);
      },
      error: (err) => {
        alert('Error al cargar progreso del alumno: ' + (err.error?.message || 'Error'));
      }
    });
  }

  // ----------------------------------------------------
  // GOOGLE MEET MODAL
  // ----------------------------------------------------
  openMeetModal(): void {
    const c = this.course();
    if (!c) return;
    this.meetForm.patchValue({ meetUrl: c.meetUrl || '' });
    this.showMeetModal.set(true);
  }

  saveMeetUrl(): void {
    const c = this.course();
    if (!c) return;
    this.isSaving.set(true);
    const meetUrl = this.meetForm.value.meetUrl || '';

    this.adminService.updateCourse(c.id, { meetUrl }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showMeetModal.set(false);
        this.loadCourse(c.id);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  // ----------------------------------------------------
  // LESSON MANAGEMENT
  // ----------------------------------------------------
  isPreziUrl(url?: string | null): boolean {
    return !!url && url.toLowerCase().includes('prezi.com');
  }

  onModalPresentationFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedModalPresentationFile.set(file);
    }
  }

  removeSelectedModalPresentationFile(): void {
    this.selectedModalPresentationFile.set(null);
  }

  openCreateLessonModal(): void {
    this.isEditingLesson.set(false);
    this.currentEditingLessonId.set(null);
    this.selectedModalPresentationFile.set(null);
    this.lessonForm.reset();
    const c = this.course();
    if (c) {
      this.lessonForm.patchValue({ orderNumber: c.lessons.length + 1 as any });
    }
    this.showLessonModal.set(true);
  }

  openEditLessonModal(lesson: any): void {
    this.isEditingLesson.set(true);
    this.currentEditingLessonId.set(lesson.id);
    this.selectedModalPresentationFile.set(null);

    let formattedDate = '';
    if (lesson.availableAt) {
      const d = new Date(lesson.availableAt);
      const pad = (n: number) => n.toString().padStart(2, '0');
      formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    this.lessonForm.patchValue({
      title: lesson.title,
      content: lesson.content,
      orderNumber: lesson.orderNumber,
      meetUrl: lesson.meetUrl || '',
      presentationUrl: lesson.presentationUrl || '',
      availableAt: formattedDate,
    });
    this.showLessonModal.set(true);
  }

  closeLessonModal(): void {
    this.showLessonModal.set(false);
    this.selectedModalPresentationFile.set(null);
    this.lessonForm.reset();
  }

  saveLesson(): void {
    const c = this.course();
    if (!c || this.lessonForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.lessonForm.value;
    const payload = {
      title: formVal.title!,
      content: formVal.content!,
      orderNumber: formVal.orderNumber ? Number(formVal.orderNumber) : undefined,
      meetUrl: formVal.meetUrl || undefined,
      presentationUrl: formVal.presentationUrl?.trim() || undefined,
      presentationFilename: formVal.presentationUrl?.trim()
        ? (formVal.presentationUrl.includes('prezi.com') ? 'Presentación Prezi' : 'Presentación Online')
        : undefined,
      availableAt: formVal.availableAt ? new Date(formVal.availableAt).toISOString() : null,
    };

    const pptFile = this.selectedModalPresentationFile();

    if (this.isEditingLesson() && this.currentEditingLessonId()) {
      const lessonId = this.currentEditingLessonId()!;
      this.adminService.updateLesson(lessonId, payload).subscribe({
        next: () => {
          if (pptFile) {
            this.adminService.uploadLessonPresentation(lessonId, pptFile).subscribe({
              next: () => {
                this.isSaving.set(false);
                this.closeLessonModal();
                this.loadCourse(c.id);
              },
              error: (err) => {
                this.isSaving.set(false);
                alert('Clase actualizada pero ocurrió un error al subir la presentación: ' + (err.error?.message || 'Error'));
                this.closeLessonModal();
                this.loadCourse(c.id);
              },
            });
          } else {
            this.isSaving.set(false);
            this.closeLessonModal();
            this.loadCourse(c.id);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Error al actualizar la clase: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    } else {
      this.adminService.createLesson(c.id, payload).subscribe({
        next: (createdLesson) => {
          if (pptFile && createdLesson && createdLesson.id) {
            this.adminService.uploadLessonPresentation(createdLesson.id, pptFile).subscribe({
              next: () => {
                this.isSaving.set(false);
                this.closeLessonModal();
                this.loadCourse(c.id);
              },
              error: (err) => {
                this.isSaving.set(false);
                alert('Clase creada pero ocurrió un error al subir la presentación: ' + (err.error?.message || 'Error'));
                this.closeLessonModal();
                this.loadCourse(c.id);
              },
            });
          } else {
            this.isSaving.set(false);
            this.closeLessonModal();
            this.loadCourse(c.id);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Error al crear la clase: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    }
  }

  deleteLesson(lesson: any): void {
    if (!confirm(`¿Estás seguro de eliminar la clase "${lesson.title}" y su cuestionario?`)) {
      return;
    }
    const c = this.course();
    if (!c) return;

    this.adminService.deleteLesson(lesson.id).subscribe({
      next: () => {
        this.loadCourse(c.id);
      },
      error: (err) => {
        alert('Error al eliminar clase: ' + (err.error?.message || 'Error desconocido'));
      },
    });
  }

  // ----------------------------------------------------
  // PREZI / ONLINE PRESENTATION MODAL
  // ----------------------------------------------------
  openPreziModal(lesson: any): void {
    this.selectedPreziLesson.set(lesson);
    this.preziInputUrl.set(lesson.presentationUrl || '');
    this.preziInputTitle.set(lesson.presentationFilename || (this.isPreziUrl(lesson.presentationUrl) ? 'Presentación Prezi' : 'Diapositivas Online'));
    this.showPreziModal.set(true);
  }

  closePreziModal(): void {
    this.showPreziModal.set(false);
    this.selectedPreziLesson.set(null);
    this.preziInputUrl.set('');
    this.preziInputTitle.set('');
  }

  onPreziUrlChange(event: any): void {
    this.preziInputUrl.set(event.target.value || '');
  }

  onPreziTitleChange(event: any): void {
    this.preziInputTitle.set(event.target.value || '');
  }

  savePreziLink(): void {
    const lesson = this.selectedPreziLesson();
    const c = this.course();
    if (!lesson || !c) return;

    const url = this.preziInputUrl().trim();
    if (!url) return;

    this.isSavingPrezi.set(true);
    const title = this.preziInputTitle().trim() || (url.includes('prezi.com') ? 'Presentación Prezi' : 'Diapositivas Online');

    this.adminService.updateLesson(lesson.id, {
      presentationUrl: url,
      presentationFilename: title,
    }).subscribe({
      next: () => {
        this.isSavingPrezi.set(false);
        this.closePreziModal();
        this.presentationSuccessMessage.set(`Presentación vinculada exitosamente a "${lesson.title}"`);
        setTimeout(() => this.presentationSuccessMessage.set(null), 4000);
        this.loadCourse(c.id);
      },
      error: (err) => {
        this.isSavingPrezi.set(false);
        alert('Error al vincular presentación: ' + (err.error?.message || 'Error'));
      },
    });
  }

  // ----------------------------------------------------
  // QUESTIONS & QUIZ MANAGER (MULTIPLE CHOICE)
  // ----------------------------------------------------
  openQuestionsModal(lesson: any): void {
    this.activeLesson.set(lesson);
    this.showQuestionsModal.set(true);
    this.cancelEditQuestionMode();
    this.loadQuestions(lesson.id);
  }

  closeQuestionsModal(): void {
    this.showQuestionsModal.set(false);
    this.activeLesson.set(null);
    this.cancelEditQuestionMode();
    const c = this.course();
    if (c) this.loadCourse(c.id);
  }

  loadQuestions(lessonId: string): void {
    this.adminService.getQuestions(lessonId).subscribe({
      next: (data) => {
        this.activeQuestions.set(data);
      },
    });
  }

  getOptionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  openEditQuestionMode(q: AdminQuizQuestion): void {
    this.isEditingQuestion.set(true);
    this.currentEditingQuestionId.set(q.id);
    this.questionForm.patchValue({
      questionText: q.questionText,
      optionA: q.options[0] || '',
      optionB: q.options[1] || '',
      optionC: q.options[2] || '',
      optionD: q.options[3] || '',
      correctOptionIndex: q.correctOptionIndex,
    });
  }

  cancelEditQuestionMode(): void {
    this.isEditingQuestion.set(false);
    this.currentEditingQuestionId.set(null);
    this.questionForm.reset({ correctOptionIndex: 0 });
  }

  saveQuestion(): void {
    const lesson = this.activeLesson();
    if (!lesson || this.questionForm.invalid) return;

    this.isSavingQuestion.set(true);
    const formVal = this.questionForm.value;

    const options = [
      formVal.optionA,
      formVal.optionB,
      formVal.optionC,
      formVal.optionD,
    ].filter((o) => o && String(o).trim().length > 0) as string[];

    const payload = {
      questionText: formVal.questionText!,
      options,
      correctOptionIndex: Number(formVal.correctOptionIndex || 0),
    };

    if (this.isEditingQuestion() && this.currentEditingQuestionId()) {
      this.adminService.updateQuestion(this.currentEditingQuestionId()!, payload).subscribe({
        next: () => {
          this.isSavingQuestion.set(false);
          this.cancelEditQuestionMode();
          this.loadQuestions(lesson.id);
        },
        error: (err) => {
          this.isSavingQuestion.set(false);
          alert('Error al actualizar pregunta: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    } else {
      this.adminService.createQuestion(lesson.id, payload).subscribe({
        next: () => {
          this.isSavingQuestion.set(false);
          this.questionForm.reset({ correctOptionIndex: 0 });
          this.loadQuestions(lesson.id);
        },
        error: (err) => {
          this.isSavingQuestion.set(false);
          alert('Error al agregar pregunta: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    }
  }

  deleteQuestion(questionId: string): void {
    if (!confirm('¿Eliminar esta pregunta del cuestionario?')) return;
    const lesson = this.activeLesson();
    if (!lesson) return;

    this.adminService.deleteQuestion(questionId).subscribe({
      next: () => {
        this.loadQuestions(lesson.id);
      },
      error: (err) => {
        alert('Error al eliminar pregunta: ' + (err.error?.message || 'Error'));
      },
    });
  }

  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CADA CLASE
  // ----------------------------------------------------
  openLessonStudentsModal(lesson: any): void {
    this.activeLessonForStudents.set(lesson);
    this.showLessonStudentsModal.set(true);
    this.loadLessonStudents(lesson.id);
  }

  loadLessonStudents(lessonId: string): void {
    this.isLoadingLessonStudents.set(true);
    this.adminService.getLessonStudents(lessonId).subscribe({
      next: (res) => {
        this.lessonStudentsList.set(res.students || []);
        this.isLoadingLessonStudents.set(false);
      },
      error: () => {
        this.isLoadingLessonStudents.set(false);
      },
    });
  }

  setStudentLessonStatus(
    lessonId: string,
    studentId: string,
    status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED',
    score?: number | null,
  ): void {
    this.adminService
      .updateLessonStudentProgress(lessonId, studentId, status, score)
      .subscribe({
        next: () => {
          this.loadLessonStudents(lessonId);
          const c = this.course();
          if (c) this.loadEnrolledStudents(c.id);
        },
        error: (err) => {
          alert('Error al actualizar estado del alumno: ' + (err.error?.message || 'Error'));
        },
      });
  }

  // ----------------------------------------------------
  // GESTIÓN DE PRESENTACIONES POWERPOINT / PREZI
  // ----------------------------------------------------
  onPresentationFileSelected(event: any, lesson: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const c = this.course();
    if (!c) return;

    this.adminService.uploadLessonPresentation(lesson.id, file).subscribe({
      next: () => {
        this.presentationSuccessMessage.set(`Presentación subida correctamente a "${lesson.title}"`);
        setTimeout(() => this.presentationSuccessMessage.set(null), 4000);
        this.loadCourse(c.id);
      },
      error: (err) => {
        alert('Error al subir presentación: ' + (err.error?.message || 'Error desconocido'));
      },
    });

    // Reset input
    event.target.value = '';
  }

  removePresentation(lesson: any): void {
    if (!confirm(`¿Estás seguro de quitar el archivo de presentación de la clase "${lesson.title}"?`)) {
      return;
    }

    const c = this.course();
    if (!c) return;

    this.adminService.deleteLessonPresentation(lesson.id).subscribe({
      next: () => {
        this.loadCourse(c.id);
      },
      error: (err) => {
        alert('Error al quitar presentación: ' + (err.error?.message || 'Error'));
      },
    });
  }

  // ----------------------------------------------------
  // GESTIÓN DE FICHAS TÉCNICAS
  // ----------------------------------------------------
  onTechnicalSheetSelected(event: any, lesson: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const c = this.course();
    if (!c) return;

    this.adminService.uploadTechnicalSheet(lesson.id, file).subscribe({
      next: () => {
        this.presentationSuccessMessage.set(`Ficha técnica subida correctamente a "${lesson.title}"`);
        setTimeout(() => this.presentationSuccessMessage.set(null), 4000);
        this.loadCourse(c.id);
      },
      error: (err) => {
        alert('Error al subir ficha técnica: ' + (err.error?.message || 'Error desconocido'));
      },
    });

    event.target.value = '';
  }

  removeTechnicalSheet(sheet: any): void {
    if (!confirm(`¿Estás seguro de eliminar la ficha técnica "${sheet.originalName}"?`)) {
      return;
    }

    const c = this.course();
    if (!c) return;

    this.adminService.deleteTechnicalSheet(sheet.id).subscribe({
      next: () => {
        this.loadCourse(c.id);
      },
      error: (err) => {
        alert('Error al eliminar ficha técnica: ' + (err.error?.message || 'Error'));
      },
    });
  }

  // ----------------------------------------------------
  // GESTIÓN DEL CURSO (EDITAR / ELIMINAR / PREVIEW)
  // ----------------------------------------------------
  openEditCourseModal(): void {
    const c = this.course();
    if (!c) return;

    this.courseEditForm.patchValue({
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl || '',
      meetUrl: c.meetUrl || '',
    });
    this.showEditCourseModal.set(true);
  }

  closeEditCourseModal(): void {
    this.showEditCourseModal.set(false);
  }

  saveCourseEdit(): void {
    const c = this.course();
    if (!c || this.courseEditForm.invalid) return;

    this.isSavingCourse.set(true);
    const formVal = this.courseEditForm.value;

    this.adminService
      .updateCourse(c.id, {
        title: formVal.title!,
        description: formVal.description!,
        thumbnailUrl: formVal.thumbnailUrl || undefined,
        meetUrl: formVal.meetUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.isSavingCourse.set(false);
          this.closeEditCourseModal();
          this.loadCourse(c.id);
        },
        error: (err) => {
          this.isSavingCourse.set(false);
          alert('Error al actualizar el curso: ' + (err.error?.message || 'Error'));
        },
      });
  }

  deleteCourse(): void {
    const c = this.course();
    if (!c) return;

    const confirmMsg = `¿Estás seguro de que deseas eliminar permanentemente el curso "${c.title}"?\n\nEsta acción borrará todas sus clases, diapositivas, exámenes y matrículas de alumnos.`;
    if (!confirm(confirmMsg)) return;

    this.adminService.deleteCourse(c.id).subscribe({
      next: () => {
        alert('Curso eliminado exitosamente.');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Error al eliminar el curso: ' + (err.error?.message || 'Error'));
      },
    });
  }

  previewLesson(lessonId: string): void {
    this.router.navigate(['/lessons', lessonId]);
  }

  previewLessonPresentation(lessonId: string): void {
    this.router.navigate(['/lessons', lessonId], {
      queryParams: { view: 'presentation' },
    });
  }
}
