import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
            <span>Mis Cursos</span>
          </a>
          <span class="breadcrumb-separator">/</span>
          <a [routerLink]="['/courses', currentLesson.courseId]" class="breadcrumb-link">
            <span>{{ currentLesson.courseTitle }}</span>
          </a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">Clase #{{ currentLesson.orderNumber }}</span>
        </nav>

        <!-- Lesson Header -->
        <header class="lesson-header animate-fade-in">
          <div class="header-badges">
            <span class="badge badge-available">Clase {{ currentLesson.orderNumber }}</span>
            <span *ngIf="currentLesson.status === 'COMPLETED'" class="badge badge-completed">
              ✓ Aprobada ({{ currentLesson.score }}%)
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
          <a [href]="currentLesson.meetUrl || currentLesson.courseMeetUrl" target="_blank" class="btn btn-sm btn-meet-join">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Unirse a Meet</span>
          </a>
        </div>

        <!-- LESSON VIEW MODE TABS -->
        <div class="lesson-mode-tabs animate-fade-in">
          <button
            (click)="activeLessonView.set('content')"
            class="mode-tab-btn"
            [class.mode-tab-active]="activeLessonView() === 'content'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>📖 Guía y Contenido de la Clase</span>
          </button>

          <button
            (click)="activeLessonView.set('presentation')"
            class="mode-tab-btn"
            [class.mode-tab-active]="activeLessonView() === 'presentation'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>📊 Pantalla de Presentación PowerPoint</span>
            <span *ngIf="currentLesson.presentationUrl" class="tab-badge-ppt">PPT Disponible</span>
          </button>
        </div>

        <!-- TAB 1: HTML / CONTENT VIEW -->
        <div *ngIf="activeLessonView() === 'content'" class="tab-content-pane animate-fade-in">
          <!-- Presentation Material (PowerPoint / PDF) Quick Box -->
          <div *ngIf="currentLesson.presentationUrl" class="lesson-presentation-box glass-card animate-fade-in">
            <div class="presentation-main-row">
              <div class="presentation-icon-box">
                <span>📊</span>
              </div>
              <div class="presentation-info">
                <h4>Presentación y Diapositivas de la Clase</h4>
                <p>Material de diapositivas preparado por el profesor.</p>
                <span class="presentation-filename-badge">
                  📎 {{ currentLesson.presentationFilename || 'Presentación.pptx' }}
                </span>
              </div>
            </div>
            <div class="presentation-actions">
              <button
                (click)="activeLessonView.set('presentation')"
                class="btn btn-secondary btn-view-ppt"
              >
                <span>👁️ Ver Diapositivas</span>
              </button>
              <a
                [href]="currentLesson.presentationUrl"
                target="_blank"
                [download]="currentLesson.presentationFilename || 'presentacion'"
                class="btn btn-primary btn-download-ppt"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Descargar (.pptx)</span>
              </a>
            </div>
          </div>

          <!-- Lesson Content Viewer (HTML / Slides / Video) -->
          <section class="lesson-player glass-card animate-fade-in">
            <div class="lesson-html-content" [innerHTML]="currentLesson.content"></div>
          </section>
        </div>

        <!-- TAB 2: POWERPOINT PRESENTATION SCREEN -->
        <div *ngIf="activeLessonView() === 'presentation'" class="tab-content-pane animate-fade-in">
          <!-- If Presentation Exists -->
          <section *ngIf="currentLesson.presentationUrl" class="presentation-screen-container glass-card animate-fade-in" id="presentation-fullscreen-box">
            <!-- Screen Header Controls -->
            <div class="presentation-screen-header">
              <div class="ppt-title-group">
                <div class="ppt-icon-badge">📊</div>
                <div>
                  <h3>{{ currentLesson.presentationFilename || 'Presentación de la Clase' }}</h3>
                  <span class="ppt-meta-label">Diapositivas oficiales de la lección</span>
                </div>
              </div>

              <div class="ppt-header-actions">
                <button (click)="toggleFullscreenPresentation()" class="btn btn-secondary btn-sm" title="Modo Pantalla Completa">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Pantalla Completa</span>
                </button>

                <a
                  [href]="currentLesson.presentationUrl"
                  target="_blank"
                  [download]="currentLesson.presentationFilename || 'presentacion'"
                  class="btn btn-primary btn-sm btn-download-ppt"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Descargar .pptx</span>
                </a>
              </div>
            </div>

            <!-- Embedded Slide Viewer Frame -->
            <div class="presentation-frame-wrapper">
              <iframe
                *ngIf="getSafePresentationUrl(currentLesson.presentationUrl) as safeUrl"
                [src]="safeUrl"
                class="presentation-iframe"
                frameborder="0"
                allowfullscreen="true"
              ></iframe>

              <!-- Fallback / In-App Presentation Player Card -->
              <div class="presentation-player-fallback">
                <div class="fallback-hero-content">
                  <div class="slide-deck-icon">📊</div>
                  <h3>{{ currentLesson.presentationFilename || 'Diapositivas de la Clase' }}</h3>
                  <p>Presentación lista para ver, proyectar o estudiar.</p>

                  <div class="fallback-cta-row">
                    <a
                      [href]="currentLesson.presentationUrl"
                      target="_blank"
                      class="btn btn-secondary"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      <span>Abrir Presentación en Nueva Pestaña</span>
                    </a>

                    <a
                      [href]="currentLesson.presentationUrl"
                      target="_blank"
                      [download]="currentLesson.presentationFilename || 'presentacion'"
                      class="btn btn-primary btn-download-ppt"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>Descargar Archivo (.pptx)</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- If No Presentation in Lesson -->
          <div *ngIf="!currentLesson.presentationUrl" class="empty-presentation-box glass-card animate-fade-in">
            <div class="empty-icon">📊</div>
            <h3>Esta clase aún no cuenta con PowerPoint adjunto</h3>
            <p>Puedes consultar la explicación teórica en la pestaña <strong>"Guía y Contenido de la Clase"</strong>.</p>
            <button (click)="activeLessonView.set('content')" class="btn btn-primary" style="margin-top: 12px;">
              Ir a la Guía de la Clase ➔
            </button>
          </div>
        </div>

        <!-- LESSON FINISHED & QUIZ TRIGGER PROMPT -->
        <section
          *ngIf="!isQuizStarted() && !quizResult() && currentLesson.status !== 'COMPLETED' && currentLesson.quizQuestions.length > 0"
          class="lesson-end-action-box glass-card animate-fade-in"
        >
          <div class="end-action-badge">Fin de la Clase</div>
          <h2>¿Has terminado de revisar la clase?</h2>
          <p>
            Rinde el examen de opción múltiple para evaluar lo aprendido y desbloquear automáticamente la siguiente lección del curso.
          </p>

          <div class="end-action-buttons">
            <button (click)="startQuizSection()" class="btn btn-primary btn-start-quiz-cta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Realizar Examen de la Clase ➔</span>
            </button>

            <a [routerLink]="['/courses', currentLesson.courseId]" class="btn btn-secondary">
              Volver al Temario
            </a>
          </div>
        </section>

        <!-- QUIZ & PROGRESSION EVALUATION SECTION -->
        <section
          *ngIf="(isQuizStarted() || quizResult() || currentLesson.status === 'COMPLETED') && currentLesson.quizQuestions.length > 0"
          class="quiz-section glass-card animate-fade-in"
          id="quiz-section"
        >
          <div class="quiz-header">
            <div class="quiz-badge-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- If Passed and Course Completed -->
              <a
                *ngIf="result.passed && !result.nextLessonId"
                routerLink="/dashboard"
                class="btn btn-primary"
              >
                <span>🎓 Volver a Mis Cursos</span>
              </a>

              <!-- If Failed: Try Again Button -->
              <button
                *ngIf="!result.passed"
                (click)="resetQuiz()"
                class="btn btn-secondary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"></path>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>Reintentar Examen</span>
              </button>
            </div>
          </div>

          <!-- Quiz Questions Form -->
          <div *ngIf="!quizResult()" class="questions-list">
            <div
              *ngFor="let question of currentLesson.quizQuestions; let qIndex = index"
              class="question-block"
            >
              <div class="question-title-row">
                <span class="question-number">Pregunta {{ qIndex + 1 }}</span>
                <h4 class="question-text">{{ question.questionText }}</h4>
              </div>

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
                * Responde todas las preguntas antes de enviar.
              </span>
            </div>
          </div>
        </section>
      </main>

      <!-- SYLLABUS / TEMARIO SIDEBAR -->
      <aside class="syllabus-sidebar">
        <div class="sidebar-header">
          <div>
            <h3>Temario del Curso</h3>
            <span class="syllabus-count">{{ currentLesson.syllabus.length }} Clases</span>
          </div>
          <a [routerLink]="['/courses', currentLesson.courseId]" class="btn-return-syllabus-link" title="Ver temario completo">
            <span>← Ver Temario</span>
          </a>
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
              <svg *ngIf="item.status === 'COMPLETED'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-completed">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <!-- Available / Active -->
              <svg *ngIf="item.status === 'AVAILABLE'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-available">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <!-- Locked -->
              <svg *ngIf="item.status === 'LOCKED'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-locked">
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
        <a routerLink="/dashboard" class="btn btn-primary" style="margin-top: 14px;">
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
      max-width: 1240px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 28px;
      padding: 28px 24px 64px;
      align-items: start;
      background-color: var(--bg-main);
    }

    .content-area {
      min-width: 0;
    }

    .lesson-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      margin-bottom: 16px;
    }

    .breadcrumb-link {
      color: var(--text-secondary);
      font-weight: 500;
      transition: color 0.15s;
    }

    .breadcrumb-link:hover {
      color: #0f172a;
    }

    .breadcrumb-separator {
      color: #cbd5e1;
    }

    .breadcrumb-current {
      color: #0f172a;
      font-weight: 600;
    }

    .lesson-header {
      margin-bottom: 20px;
    }

    .header-badges {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .lesson-header h1 {
      font-size: 1.65rem;
      line-height: 1.25;
      color: #0f172a;
    }

    .live-meet-lesson-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 18px;
      margin-bottom: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      flex-wrap: wrap;
    }

    .meet-banner-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .meet-banner-content strong {
      color: #b91c1c;
      font-size: 0.88rem;
      display: block;
    }

    .meet-banner-content p {
      color: #475569;
      font-size: 0.78rem;
      margin: 0;
    }

    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #dc2626;
    }

    .btn-meet-join {
      background: #dc2626 !important;
      border: none !important;
      color: #fff !important;
      font-weight: 600;
      font-size: 0.82rem;
      padding: 6px 12px;
    }

    /* Lesson Mode Tabs */
    .lesson-mode-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
      flex-wrap: wrap;
    }

    .mode-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-tab-btn:hover {
      color: #0f172a;
      background: #f8fafc;
    }

    .mode-tab-active {
      background: #0f172a !important;
      border-color: #0f172a !important;
      color: #ffffff !important;
    }

    .tab-badge-ppt {
      font-size: 0.68rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      font-weight: 600;
    }

    .mode-tab-active .tab-badge-ppt {
      background: #ffffff;
      color: #0f172a;
      border-color: #ffffff;
    }

    .btn-view-ppt {
      font-size: 0.82rem;
      padding: 8px 14px;
    }

    /* Dedicated Presentation Screen */
    .presentation-screen-container {
      padding: 24px;
      margin-bottom: 28px;
      border: 1px solid var(--border-subtle);
      background: #ffffff;
    }

    .presentation-screen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .ppt-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ppt-icon-badge {
      width: 38px;
      height: 38px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .ppt-title-group h3 {
      font-size: 1.05rem;
      margin: 0 0 1px;
      color: #0f172a;
    }

    .ppt-meta-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .ppt-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .presentation-frame-wrapper {
      position: relative;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
    }

    .presentation-iframe {
      width: 100%;
      height: 560px;
      border: none;
      display: block;
    }

    .presentation-player-fallback {
      padding: 40px 20px;
      text-align: center;
      background: #f8fafc;
    }

    .fallback-hero-content {
      max-width: 500px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .slide-deck-icon {
      font-size: 3rem;
      margin-bottom: 4px;
    }

    .fallback-hero-content h3 {
      font-size: 1.2rem;
      margin: 0;
      color: #0f172a;
    }

    .fallback-hero-content p {
      color: var(--text-secondary);
      font-size: 0.88rem;
      margin: 0;
    }

    .fallback-cta-row {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .empty-presentation-box {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-secondary);
      background: #ffffff;
    }

    /* Presentation Box */
    .lesson-presentation-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      margin-bottom: 24px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      flex-wrap: wrap;
    }

    .presentation-main-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .presentation-icon-box {
      width: 40px;
      height: 40px;
      background: #ffffff;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .presentation-info h4 {
      font-size: 0.95rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .presentation-info p {
      color: #475569;
      font-size: 0.8rem;
      margin-bottom: 4px;
    }

    .presentation-filename-badge {
      display: inline-block;
      font-size: 0.72rem;
      color: #b45309;
      background: #ffffff;
      border: 1px solid #fde68a;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-weight: 600;
    }

    .btn-download-ppt {
      font-size: 0.82rem;
      padding: 8px 14px;
    }

    .presentation-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Lesson Player Content */
    .lesson-player {
      padding: 32px;
      margin-bottom: 28px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .lesson-html-content {
      font-size: 0.98rem;
      line-height: 1.7;
      color: #334155;
    }

    .lesson-html-content h2 {
      font-size: 1.35rem;
      margin: 20px 0 10px;
      color: #0f172a;
    }

    .lesson-html-content h3 {
      font-size: 1.15rem;
      margin: 16px 0 8px;
      color: #0f172a;
    }

    .lesson-html-content p {
      margin-bottom: 14px;
      color: #334155;
    }

    .lesson-html-content ul {
      margin: 12px 0 16px 20px;
      color: #334155;
    }

    .lesson-html-content li {
      margin-bottom: 6px;
    }

    .lesson-html-content code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.88em;
    }

    /* Lesson Finished Box */
    .lesson-end-action-box {
      padding: 28px 32px;
      margin-bottom: 28px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .end-action-badge {
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .lesson-end-action-box h2 {
      font-size: 1.35rem;
      margin: 0;
      color: #0f172a;
    }

    .lesson-end-action-box p {
      color: var(--text-secondary);
      font-size: 0.88rem;
      max-width: 520px;
      margin: 0 auto;
    }

    .end-action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-start-quiz-cta {
      padding: 10px 20px;
      font-size: 0.92rem;
      font-weight: 600;
    }

    .btn-return-syllabus-link {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
    }

    .btn-return-syllabus-link:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* Quiz Section */
    .quiz-section {
      padding: 28px 32px;
      border: 1px solid var(--border-subtle);
      background: #ffffff;
    }

    .quiz-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .quiz-badge-icon {
      width: 40px;
      height: 40px;
      background: #0f172a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
    }

    .quiz-header h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .quiz-subtitle {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin: 0;
    }

    .result-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-sm);
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .result-passed {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .result-passed .result-text h3 {
      color: #15803d;
    }

    .result-failed {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .result-failed .result-text h3 {
      color: #b91c1c;
    }

    .result-icon {
      font-size: 1.8rem;
    }

    .result-text {
      flex: 1;
    }

    .result-text h3 {
      font-size: 1.1rem;
      margin-bottom: 2px;
    }

    .result-text p {
      color: #475569;
      font-size: 0.85rem;
      margin: 0;
    }

    .result-actions {
      display: flex;
      gap: 8px;
    }

    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .question-block {
      padding: 18px;
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .question-title-row {
      margin-bottom: 12px;
    }

    .question-number {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }

    .question-text {
      font-size: 0.98rem;
      color: #0f172a;
      line-height: 1.4;
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .option-item:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .option-selected {
      background: #f1f5f9 !important;
      border-color: #0f172a !important;
    }

    .option-radio {
      display: none;
    }

    .option-indicator {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .option-selected .option-indicator {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }

    .option-text {
      font-size: 0.9rem;
      color: #334155;
    }

    .quiz-footer {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .btn-submit {
      padding: 10px 20px;
      font-size: 0.9rem;
    }

    .unanswered-warning {
      font-size: 0.82rem;
      color: #b91c1c;
    }

    /* Sidebar Syllabus */
    .syllabus-sidebar {
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px;
      position: sticky;
      top: 80px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sidebar-header h3 {
      font-size: 1.05rem;
      margin: 0;
      color: #0f172a;
    }

    .syllabus-count {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .syllabus-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .syllabus-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
    }

    .syllabus-item:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .active-lesson {
      background: #f1f5f9 !important;
      border-color: #0f172a !important;
    }

    .locked-lesson {
      opacity: 0.55;
      cursor: not-allowed !important;
      background: #f8fafc;
    }

    .item-status-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .icon-completed {
      color: #16a34a;
    }

    .icon-available {
      color: #0f172a;
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
      font-size: 0.84rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
    }

    .item-meta {
      font-size: 0.7rem;
    }

    .text-completed {
      color: #16a34a;
      font-weight: 600;
    }

    .text-available {
      color: #0f172a;
      font-weight: 600;
    }

    .text-locked {
      color: var(--text-muted);
    }

    .lesson-loading {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert-error-box {
      max-width: 440px;
      padding: 28px 24px;
      text-align: center;
      margin: 0 auto;
      border: 1px solid #fecaca;
      background: #fef2f2;
    }

    .error-emoji {
      font-size: 2rem;
      display: block;
      margin-bottom: 8px;
    }

    .alert-error-box h3 {
      font-size: 1.15rem;
      color: #b91c1c;
      margin-bottom: 4px;
    }

    .alert-error-box p {
      color: #475569;
      font-size: 0.88rem;
    }

    @media (max-width: 960px) {
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
  private readonly sanitizer = inject(DomSanitizer);

  readonly lesson = signal<LessonDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);

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
  }

  loadLesson(lessonId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.quizResult.set(null);
    this.isQuizStarted.set(false);
    this.selectedAnswers.set({});

    this.coursesService.getLessonById(lessonId).subscribe({
      next: (data) => {
        this.lesson.set(data);
        this.isLoading.set(false);
        const requestedView = this.route.snapshot.queryParams['view'];
        if (requestedView === 'presentation' || (data.presentationUrl && requestedView !== 'content')) {
          this.activeLessonView.set('presentation');
        } else {
          this.activeLessonView.set('content');
        }
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

  getSafePresentationUrl(presentationUrl: string): SafeResourceUrl | null {
    if (!presentationUrl) return null;
    const fullUrl = presentationUrl.startsWith('http')
      ? presentationUrl
      : `${window.location.origin}${presentationUrl}`;
    const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(officeViewer);
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
