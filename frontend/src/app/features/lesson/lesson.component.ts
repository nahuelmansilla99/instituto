import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CoursesService } from '../../core/services/courses.service';
import { QuizService } from '../../core/services/quiz.service';
import { LessonDetail, QuizEvaluationResponse } from '../../core/models';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>

    <div class="lesson-layout" *ngIf="lesson() as currentLesson">
      <!-- MAIN LESSON CONTENT AREA -->
      <main class="content-area">
        <!-- Breadcrumb & Top bar -->
        <nav class="lesson-breadcrumb">
          <a routerLink="/dashboard" class="breadcrumb-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver a Cursos
          </a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ currentLesson.courseTitle }}</span>
        </nav>

        <!-- Lesson Header -->
        <header class="lesson-header animate-fade-in">
          <div class="header-badges">
            <span class="badge badge-available">Clase {{ currentLesson.orderNumber }}</span>
            <span *ngIf="currentLesson.status === 'COMPLETED'" class="badge badge-completed">
              ✓ Completada ({{ currentLesson.score }}%)
            </span>
          </div>
          <h1>{{ currentLesson.title }}</h1>
        </header>

        <!-- Live Google Meet Banner if available -->
        <div *ngIf="currentLesson.meetUrl || currentLesson.courseMeetUrl" class="live-meet-lesson-banner glass-card animate-fade-in">
          <div class="meet-banner-content">
            <span class="live-pulse-dot"></span>
            <div>
              <strong>🔴 Sesión en Vivo Disponible</strong>
              <p>Únete a la clase interactiva con el profesor vía Google Meet</p>
            </div>
          </div>
          <a [href]="currentLesson.meetUrl || currentLesson.courseMeetUrl" target="_blank" class="btn btn-primary btn-meet-join">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Unirse a la Clase en Vivo</span>
          </a>
        </div>

        <!-- Lesson Content Viewer (HTML / Slides / Video) -->
        <section class="lesson-player glass-card animate-fade-in">
          <div class="lesson-html-content" [innerHTML]="currentLesson.content"></div>
        </section>

        <!-- QUIZ & PROGRESSION EVALUATION SECTION -->
        <section class="quiz-section glass-card animate-fade-in" id="quiz-section">
          <div class="quiz-header">
            <div class="quiz-badge-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </div>
            <div>
              <h2>Evaluación de la Clase</h2>
              <p class="quiz-subtitle">
                Responde las siguientes preguntas. Necesitas al menos un <strong>80%</strong> para aprobar y desbloquear la siguiente lección.
              </p>
            </div>
          </div>

          <!-- EVALUATION RESULT BANNER -->
          <div *ngIf="quizResult() as result" class="result-banner animate-fade-in" [class.result-passed]="result.passed" [class.result-failed]="!result.passed">
            <div class="result-icon">
              <span *ngIf="result.passed">🎉</span>
              <span *ngIf="!result.passed">⚠️</span>
            </div>
            <div class="result-text">
              <h3>{{ result.passed ? '¡Cuestionario Aprobado!' : 'Cuestionario No Aprobado' }}</h3>
              <p>{{ result.message }}</p>
            </div>
            <div class="result-actions">
              <!-- If Passed and Next Lesson Exists -->
              <button
                *ngIf="result.passed && result.nextLessonId"
                (click)="goToNextLesson(result.nextLessonId)"
                class="btn btn-success"
              >
                <span>Siguiente Lección</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- If Passed and Course Completed -->
              <a
                *ngIf="result.passed && !result.nextLessonId"
                routerLink="/dashboard"
                class="btn btn-primary"
              >
                <span>¡Curso Completado! Volver al Panel</span>
              </a>

              <!-- If Failed: Retry Button -->
              <button
                *ngIf="!result.passed"
                (click)="resetQuiz()"
                class="btn btn-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Reintentar Cuestionario</span>
              </button>
            </div>
          </div>

          <!-- QUIZ QUESTIONS LIST -->
          <div class="questions-list" *ngIf="!quizResult() || !quizResult()?.passed">
            <div
              *ngFor="let question of currentLesson.quizQuestions; let qIndex = index"
              class="question-card"
            >
              <h4 class="question-title">
                <span class="q-number">{{ qIndex + 1 }}.</span>
                {{ question.questionText }}
              </h4>

              <div class="options-group">
                <label
                  *ngFor="let option of question.options; let optIndex = index"
                  class="option-item"
                  [class.option-selected]="selectedAnswers()[question.id] === optIndex"
                >
                  <input
                    type="radio"
                    [name]="'question_' + question.id"
                    [value]="optIndex"
                    [checked]="selectedAnswers()[question.id] === optIndex"
                    (change)="onSelectOption(question.id, optIndex)"
                    class="option-radio"
                  />
                  <span class="option-indicator">{{ getOptionLetter(optIndex) }}</span>
                  <span class="option-text">{{ option }}</span>
                </label>
              </div>
            </div>

            <!-- Quiz Submit CTA -->
            <div class="quiz-footer">
              <button
                (click)="submitQuiz()"
                class="btn btn-primary btn-submit"
                [disabled]="!isAllAnswered() || isSubmitting()"
              >
                <span *ngIf="isSubmitting()" class="spinner"></span>
                <span>{{ isSubmitting() ? 'Evaluando respuestas...' : 'Enviar Respuestas y Calificar' }}</span>
              </button>
              <span *ngIf="!isAllAnswered()" class="unanswered-warning">
                * Por favor responde todas las preguntas antes de enviar.
              </span>
            </div>
          </div>
        </section>
      </main>

      <!-- SYLLABUS / TEMARIO SIDEBAR -->
      <aside class="syllabus-sidebar">
        <div class="sidebar-header">
          <h3>Temario del Curso</h3>
          <span class="syllabus-count">{{ currentLesson.syllabus.length }} Clases</span>
        </div>

        <nav class="syllabus-nav">
          <button
            *ngFor="let item of currentLesson.syllabus"
            (click)="selectLesson(item)"
            class="syllabus-item"
            [class.active-lesson]="item.id === currentLesson.id"
            [class.completed-lesson]="item.status === 'COMPLETED'"
            [class.locked-lesson]="item.status === 'LOCKED'"
            [disabled]="item.status === 'LOCKED'"
          >
            <!-- Status Icon -->
            <div class="item-status-icon">
              <!-- Completed -->
              <svg *ngIf="item.status === 'COMPLETED'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-completed">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <!-- Available / Active -->
              <svg *ngIf="item.status === 'AVAILABLE'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-available">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <!-- Locked -->
              <svg *ngIf="item.status === 'LOCKED'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-locked">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <!-- Item Text -->
            <div class="item-info">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-meta">
                <span *ngIf="item.status === 'COMPLETED'" class="text-completed">Aprobada ({{ item.score }}%)</span>
                <span *ngIf="item.status === 'AVAILABLE'" class="text-available">Disponible</span>
                <span *ngIf="item.status === 'LOCKED'" class="text-locked">Bloqueada</span>
              </span>
            </div>
          </button>
        </nav>
      </aside>
    </div>

    <!-- Error Screen -->
    <div *ngIf="errorMessage()" class="lesson-loading animate-fade-in">
      <div class="alert-error-box glass-card">
        <span class="error-emoji">⚠️</span>
        <h3>No se pudo cargar la clase</h3>
        <p>{{ errorMessage() }}</p>
        <a routerLink="/dashboard" class="btn btn-primary" style="margin-top: 16px;">
          Volver a Mis Cursos
        </a>
      </div>
    </div>

    <!-- Loading Screen -->
    <div *ngIf="isLoading() && !errorMessage()" class="lesson-loading">
      <div class="spinner-large"></div>
      <p>Cargando clase y temario...</p>
    </div>
  `,
  styles: [`
    .lesson-layout {
      max-width: 1440px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 32px;
      padding: 32px 24px 64px;
      align-items: start;
    }

    .content-area {
      min-width: 0; /* Prevents overflow issues */
    }

    .lesson-breadcrumb {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.88rem;
      margin-bottom: 20px;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .breadcrumb-link:hover {
      color: var(--text-primary);
    }

    .breadcrumb-separator {
      color: var(--text-muted);
    }

    .breadcrumb-current {
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lesson-header {
      margin-bottom: 24px;
    }

    .header-badges {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }

    .lesson-header h1 {
      font-size: 2rem;
      line-height: 1.25;
    }

    .live-meet-lesson-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 24px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(239, 68, 68, 0.4);
      flex-wrap: wrap;
    }

    .meet-banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .meet-banner-content strong {
      color: #fca5a5;
      font-size: 0.95rem;
      display: block;
    }

    .meet-banner-content p {
      color: var(--text-secondary);
      font-size: 0.82rem;
      margin: 0;
    }

    .live-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      animation: livePulse 1.2s infinite;
      flex-shrink: 0;
    }

    .btn-meet-join {
      background: #ef4444;
      color: #fff;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
    }

    .btn-meet-join:hover {
      background: #dc2626;
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
    }

    /* Lesson Content Viewer */
    .lesson-player {
      padding: 36px;
      margin-bottom: 40px;
      line-height: 1.8;
      font-size: 1.05rem;
      border: 1px solid var(--border-subtle);
    }

    .lesson-html-content h2 {
      font-size: 1.5rem;
      margin: 20px 0 12px;
      color: #fff;
    }

    .lesson-html-content h3 {
      font-size: 1.2rem;
      margin: 18px 0 10px;
      color: #cbd5e1;
    }

    .lesson-html-content p {
      margin-bottom: 16px;
      color: #cbd5e1;
    }

    .lesson-html-content ul {
      margin: 16px 0 20px 24px;
      color: #cbd5e1;
    }

    .lesson-html-content li {
      margin-bottom: 8px;
    }

    .lesson-html-content code {
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    /* Quiz Section */
    .quiz-section {
      padding: 36px;
      border: 1px solid var(--border-active);
      background: rgba(18, 24, 38, 0.95);
    }

    .quiz-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .quiz-badge-icon {
      width: 48px;
      height: 48px;
      background: var(--accent-gradient);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: var(--shadow-glow);
      flex-shrink: 0;
    }

    .quiz-header h2 {
      font-size: 1.4rem;
      margin-bottom: 4px;
    }

    .quiz-subtitle {
      color: var(--text-secondary);
      font-size: 0.92rem;
    }

    /* Result Banner */
    .result-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      border-radius: var(--radius-md);
      margin-bottom: 32px;
    }

    .result-passed {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: var(--shadow-glow-success);
    }

    .result-failed {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .result-icon {
      font-size: 2.2rem;
    }

    .result-text {
      flex-grow: 1;
    }

    .result-text h3 {
      font-size: 1.25rem;
      margin-bottom: 4px;
    }

    .result-passed .result-text h3 {
      color: #34d399;
    }

    .result-failed .result-text h3 {
      color: #f87171;
    }

    .result-text p {
      color: var(--text-secondary);
      font-size: 0.92rem;
    }

    /* Questions */
    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .question-card {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
    }

    .question-title {
      font-size: 1.05rem;
      margin-bottom: 18px;
      color: var(--text-primary);
      display: flex;
      gap: 8px;
    }

    .q-number {
      color: var(--primary);
      font-weight: 700;
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .option-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(99, 102, 241, 0.3);
    }

    .option-selected {
      background: rgba(99, 102, 241, 0.12) !important;
      border-color: var(--primary) !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
    }

    .option-radio {
      display: none;
    }

    .option-indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .option-selected .option-indicator {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .option-text {
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .quiz-footer {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      margin-top: 12px;
    }

    .btn-submit {
      padding: 14px 32px;
      font-size: 1rem;
    }

    .unanswered-warning {
      font-size: 0.82rem;
      color: var(--status-warning);
    }

    /* Sidebar */
    .syllabus-sidebar {
      position: sticky;
      top: 88px;
      background: var(--bg-card);
      backdrop-filter: var(--backdrop-blur);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sidebar-header h3 {
      font-size: 1.1rem;
    }

    .syllabus-count {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .syllabus-nav {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .syllabus-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .syllabus-item:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.3);
    }

    .active-lesson {
      background: rgba(99, 102, 241, 0.15) !important;
      border-color: var(--primary) !important;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
    }

    .locked-lesson {
      opacity: 0.45;
      cursor: not-allowed !important;
      background: rgba(15, 23, 42, 0.2);
    }

    .item-status-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .icon-completed {
      color: #34d399;
    }

    .icon-available {
      color: #818cf8;
    }

    .icon-locked {
      color: var(--text-muted);
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .item-meta {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .text-completed {
      color: #34d399;
    }

    .text-available {
      color: #818cf8;
    }

    .text-locked {
      color: var(--text-muted);
    }

    .lesson-loading {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert-error-box {
      max-width: 480px;
      padding: 32px 24px;
      text-align: center;
      margin: 0 auto;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(18, 24, 38, 0.95);
    }

    .error-emoji {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 12px;
    }

    .alert-error-box h3 {
      font-size: 1.3rem;
      color: #f87171;
      margin-bottom: 8px;
    }

    .alert-error-box p {
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    @media (max-width: 1024px) {
      .lesson-layout {
        grid-template-columns: 1fr;
      }
      .syllabus-sidebar {
        position: static;
        order: 2;
      }
      .content-area {
        order: 1;
      }
    }
  `],
})
export class LessonComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly quizService = inject(QuizService);

  readonly lesson = signal<LessonDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);

  // Selected answers: { [questionId: string]: optionIndex }
  readonly selectedAnswers = signal<Record<string, number>>({});
  readonly quizResult = signal<QuizEvaluationResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const lessonId = params.get('id');
      if (lessonId) {
        this.loadLesson(lessonId);
      }
    });
  }

  loadLesson(lessonId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.quizResult.set(null);
    this.selectedAnswers.set({});

    this.coursesService.getLessonById(lessonId).subscribe({
      next: (data) => {
        this.lesson.set(data);
        this.isLoading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
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

  resetQuiz(): void {
    this.quizResult.set(null);
    this.selectedAnswers.set({});
  }

  goToNextLesson(nextLessonId: string): void {
    this.router.navigate(['/lessons', nextLessonId]);
  }

  selectLesson(item: { id: string; status: string }): void {
    if (item.status === 'LOCKED') return;
    this.router.navigate(['/lessons', item.id]);
  }
}
