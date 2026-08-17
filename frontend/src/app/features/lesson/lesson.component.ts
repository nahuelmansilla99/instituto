import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { PresentationViewerComponent } from '../../shared/components/presentation-viewer/presentation-viewer.component';
import { CoursesService } from '../../core/services/courses.service';
import { QuizService } from '../../core/services/quiz.service';
import { LessonDetail, QuizEvaluationResponse } from '../../core/models';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink, PresentationViewerComponent],
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
          <a [href]="currentLesson.meetUrl || currentLesson.courseMeetUrl" target="_blank" class="btn btn-primary btn-meet-join">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Unirse a la Clase en Vivo</span>
          </a>
        </div>

        <!-- LESSON VIEW MODE TABS -->
        <div class="lesson-mode-tabs animate-fade-in">
          <button
            (click)="activeLessonView.set('content')"
            class="mode-tab-btn"
            [class.mode-tab-active]="activeLessonView() === 'content'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span *ngIf="isPreziUrl(currentLesson.presentationUrl)">🌀 Pantalla de Presentación Prezi</span>
            <span *ngIf="!isPreziUrl(currentLesson.presentationUrl)">📊 Pantalla de Presentación / Diapositivas</span>
            <span *ngIf="currentLesson.presentationUrl" class="tab-badge-ppt">Disponible</span>
          </button>
        </div>

        <!-- TAB 1: HTML / CONTENT VIEW -->
        <div *ngIf="activeLessonView() === 'content'" class="tab-content-pane animate-fade-in">
          <!-- Presentation Material (PowerPoint / Prezi / PDF) Quick Box -->
          <div *ngIf="currentLesson.presentationUrl" class="lesson-presentation-box glass-card animate-fade-in">
            <div class="presentation-main-row">
              <div class="presentation-icon-box">
                <span *ngIf="isPreziUrl(currentLesson.presentationUrl)">🌀</span>
                <span *ngIf="!isPreziUrl(currentLesson.presentationUrl)">📊</span>
              </div>
              <div class="presentation-info">
                <h4>{{ isPreziUrl(currentLesson.presentationUrl) ? 'Presentación Interactiva Prezi' : 'Presentación y Diapositivas de la Clase' }}</h4>
                <p>{{ isPreziUrl(currentLesson.presentationUrl) ? 'Explora la presentación de Prezi con zoom y animaciones interactivas.' : 'Material de diapositivas preparado por el profesor.' }}</p>
                <span class="presentation-filename-badge">
                  📎 {{ currentLesson.presentationFilename || (isPreziUrl(currentLesson.presentationUrl) ? 'Presentación Prezi' : 'Presentación.pptx') }}
                </span>
              </div>
            </div>
            <div class="presentation-actions">
              <button
                (click)="activeLessonView.set('presentation')"
                class="btn btn-secondary btn-view-ppt"
              >
                <span>👁️ Ver en Pantalla de Diapositivas</span>
              </button>
              <a
                *ngIf="!isPreziUrl(currentLesson.presentationUrl)"
                [href]="currentLesson.presentationUrl"
                target="_blank"
                [download]="currentLesson.presentationFilename || 'presentacion'"
                class="btn btn-primary btn-download-ppt"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Descargar Archivo</span>
              </a>
              <a
                *ngIf="isPreziUrl(currentLesson.presentationUrl)"
                [href]="currentLesson.presentationUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-download-ppt"
              >
                <span>↗️ Abrir en Prezi</span>
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
          <!-- If Presentation Exists: Native Interactive Viewer -->
          <div *ngIf="currentLesson.presentationUrl" class="presentation-active-wrapper animate-fade-in">
            <app-presentation-viewer
              [presentationUrl]="currentLesson.presentationUrl"
              [presentationFilename]="currentLesson.presentationFilename || 'Presentación.pptx'"
              [title]="currentLesson.title"
            ></app-presentation-viewer>
          </div>

          <!-- If No Presentation in Lesson -->
          <div *ngIf="!currentLesson.presentationUrl" class="empty-presentation-box glass-card animate-fade-in">
            <div class="empty-icon">📊</div>
            <h3>Esta clase aún no cuenta con PowerPoint adjunto</h3>
            <p>Puedes consultar la explicación teórica completa en la pestaña <strong>"Guía y Contenido de la Clase"</strong>.</p>
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
          <div class="end-action-badge">🎯 Fin del Contenido de la Clase</div>
          <h2>¿Has terminado de revisar la clase?</h2>
          <p>
            Rinde el examen de opción múltiple para evaluar lo aprendido y desbloquear automáticamente la siguiente lección del curso.
          </p>

          <div class="end-action-buttons">
            <button (click)="startQuizSection()" class="btn btn-primary btn-lg btn-start-quiz-cta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>📝 Iniciar Examen de la Clase ➔</span>
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
      animation: pulse 1.5s infinite;
    }

    /* Lesson Mode Tabs */
    .lesson-mode-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 12px;
      flex-wrap: wrap;
    }

    .mode-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }

    .mode-tab-active {
      background: rgba(139, 92, 246, 0.2) !important;
      border-color: #a855f7 !important;
      color: #fff !important;
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
    }

    .tab-badge-ppt {
      font-size: 0.7rem;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-weight: 700;
    }

    .btn-view-ppt {
      background: rgba(245, 158, 11, 0.15) !important;
      border-color: rgba(245, 158, 11, 0.4) !important;
      color: #fbbf24 !important;
      font-weight: 600;
    }

    .btn-view-ppt:hover {
      background: rgba(245, 158, 11, 0.3) !important;
      color: #fff !important;
    }

    /* Dedicated Presentation Screen */
    .presentation-screen-container {
      padding: 28px 32px;
      margin-bottom: 36px;
      border: 1px solid rgba(245, 158, 11, 0.4);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .presentation-screen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .ppt-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .ppt-icon-badge {
      width: 44px;
      height: 44px;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .ppt-title-group h3 {
      font-size: 1.2rem;
      margin: 0 0 2px;
      color: #fff;
    }

    .ppt-meta-label {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .ppt-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .presentation-frame-wrapper {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #0b0f19;
      border: 1px solid var(--border-subtle);
    }

    .presentation-iframe {
      width: 100%;
      height: 620px;
      border: none;
      display: block;
    }

    .presentation-player-fallback {
      padding: 40px 24px;
      text-align: center;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(11, 15, 25, 0.98) 100%);
    }

    .fallback-hero-content {
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .slide-deck-icon {
      font-size: 3.5rem;
      margin-bottom: 8px;
    }

    .fallback-hero-content h3 {
      font-size: 1.4rem;
      margin: 0;
      color: #fff;
    }

    .fallback-hero-content p {
      color: var(--text-secondary);
      font-size: 0.92rem;
      margin: 0;
    }

    .fallback-cta-row {
      display: flex;
      gap: 14px;
      margin-top: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .empty-presentation-box {
      padding: 56px 32px;
      text-align: center;
      color: var(--text-secondary);
    }

    /* Presentation Box */
    .lesson-presentation-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 28px;
      margin-bottom: 28px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(30, 41, 59, 0.8) 100%);
      border: 1px solid rgba(245, 158, 11, 0.35);
      flex-wrap: wrap;
    }

    .presentation-main-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .presentation-icon-box {
      width: 48px;
      height: 48px;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .presentation-info h4 {
      font-size: 1.05rem;
      margin-bottom: 3px;
      color: #fff;
    }

    .presentation-info p {
      color: var(--text-secondary);
      font-size: 0.84rem;
      margin-bottom: 6px;
    }

    .presentation-filename-badge {
      display: inline-block;
      font-size: 0.76rem;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .btn-download-ppt {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      border: none !important;
      color: #fff !important;
      font-weight: 700;
      white-space: nowrap;
    }

    .btn-download-ppt:hover {
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.45);
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

    /* Lesson Finished & Quiz Trigger Box */
    .lesson-end-action-box {
      padding: 36px 40px;
      margin-bottom: 36px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid rgba(139, 92, 246, 0.4);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .end-action-badge {
      font-size: 0.8rem;
      font-weight: 700;
      color: #c084fc;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .lesson-end-action-box h2 {
      font-size: 1.6rem;
      margin: 0;
    }

    .lesson-end-action-box p {
      color: var(--text-secondary);
      font-size: 0.95rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .end-action-buttons {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-start-quiz-cta {
      padding: 14px 28px;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    }

    .btn-return-syllabus-link {
      font-size: 0.78rem;
      font-weight: 600;
      color: #c084fc;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      transition: all 0.2s;
    }

    .btn-return-syllabus-link:hover {
      background: rgba(139, 92, 246, 0.25);
      color: #fff;
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
