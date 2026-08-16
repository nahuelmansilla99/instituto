import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CoursesService } from '../../core/services/courses.service';
import { CourseDetail, CourseLessonItem } from '../../core/models';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>

    <main class="course-detail-page">
      <div class="container">
        <!-- Breadcrumb Navigation -->
        <nav class="breadcrumb-nav animate-fade-in">
          <a routerLink="/dashboard" class="breadcrumb-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Mis Cursos</span>
          </a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ course()?.title || 'Cargando curso...' }}</span>
        </nav>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-container">
          <div class="spinner-large"></div>
          <p>Cargando temario y clases del curso...</p>
        </div>

        <!-- Course Header Card -->
        <div *ngIf="course() as c" class="course-hero-card glass-card animate-fade-in">
          <div class="hero-layout">
            <div class="hero-media" *ngIf="c.thumbnailUrl">
              <img [src]="c.thumbnailUrl" [alt]="c.title" class="hero-image" />
            </div>

            <div class="hero-details">
              <div class="hero-badge-row">
                <span class="badge-tag">Curso Virtual</span>
                <span class="badge-status-completion" [class.badge-completed]="c.progressPercentage === 100">
                  {{ c.progressPercentage === 100 ? '✅ Completado' : (c.progressPercentage > 0 ? 'En Progreso' : 'Por Iniciar') }}
                </span>
              </div>

              <h1 class="course-title">{{ c.title }}</h1>
              <p class="course-description">{{ c.description }}</p>

              <!-- Live Meet Button if active in Course -->
              <div *ngIf="c.meetUrl" class="live-meet-callout">
                <span class="live-pulse-dot"></span>
                <div class="meet-callout-text">
                  <strong>🔴 Clase en Vivo Disponible</strong>
                  <span>Accede a la sala de Google Meet del curso</span>
                </div>
                <a [href]="c.meetUrl" target="_blank" class="btn btn-sm btn-meet">
                  Unirse a Meet
                </a>
              </div>

              <!-- Overall Progress Bar -->
              <div class="course-overall-progress">
                <div class="progress-info-row">
                  <span class="progress-label">Tu Progreso de Aprendizaje</span>
                  <span class="progress-percent">{{ c.progressPercentage }}% ({{ c.completedLessons }} de {{ c.totalLessons }} clases aprobadas)</span>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    [style.width.%]="c.progressPercentage"
                    [class.fill-completed]="c.progressPercentage === 100"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lessons Syllabus Section -->
        <section *ngIf="course() as c" class="syllabus-section animate-fade-in">
          <div class="syllabus-header">
            <div>
              <h2>Clases y Módulos del Curso ({{ c.lessons.length }})</h2>
              <p class="syllabus-subtitle">Selecciona la clase que deseas cursar. Al terminar cada lección podrás rendir su examen de aprobación.</p>
            </div>
          </div>

          <!-- Empty Lessons State -->
          <div *ngIf="c.lessons.length === 0" class="empty-syllabus glass-card">
            <div class="empty-icon">📂</div>
            <h3>Este curso aún no tiene clases disponibles</h3>
            <p>El profesor está preparando el temario y las diapositivas. Vuelve a consultar pronto.</p>
          </div>

          <!-- Lessons Grid / List -->
          <div class="lessons-syllabus-list" *ngIf="c.lessons.length > 0">
            <article
              *ngFor="let lesson of c.lessons; let idx = index"
              class="lesson-syllabus-card glass-card animate-fade-in"
              [class.card-completed]="lesson.status === 'COMPLETED'"
              [class.card-available]="lesson.status === 'AVAILABLE'"
              [class.card-locked]="lesson.status === 'LOCKED'"
            >
              <div class="lesson-card-main">
                <!-- Order Indicator -->
                <div class="order-indicator">
                  <span class="order-number">#{{ lesson.orderNumber || (idx + 1) }}</span>
                </div>

                <!-- Lesson Info -->
                <div class="lesson-card-info">
                  <div class="lesson-header-line">
                    <h3 class="lesson-card-title">{{ lesson.title }}</h3>
                    <span
                      class="badge-lesson-status"
                      [ngClass]="{
                        'status-badge-completed': lesson.status === 'COMPLETED',
                        'status-badge-available': lesson.status === 'AVAILABLE',
                        'status-badge-locked': lesson.status === 'LOCKED'
                      }"
                    >
                      <ng-container *ngIf="lesson.status === 'COMPLETED'">✓ Aprobada ({{ lesson.score }}%)</ng-container>
                      <ng-container *ngIf="lesson.status === 'AVAILABLE'">Disponible</ng-container>
                      <ng-container *ngIf="lesson.status === 'LOCKED'">Bloqueada</ng-container>
                    </span>
                  </div>

                  <div class="lesson-card-meta">
                    <span *ngIf="lesson.presentationUrl" class="meta-badge meta-ppt">
                      📊 PowerPoint Adjunto
                    </span>
                    <span *ngIf="lesson.meetUrl" class="meta-badge meta-meet">
                      🔴 Sesión Meet
                    </span>
                    <span class="meta-badge meta-quiz">
                      📝 Examen (80% req.)
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Button for this Lesson -->
              <div class="lesson-card-action">
                <button
                  *ngIf="lesson.status !== 'LOCKED'"
                  (click)="startLesson(lesson.id)"
                  class="btn w-full"
                  [ngClass]="lesson.status === 'COMPLETED' ? 'btn-secondary' : 'btn-primary'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>{{ lesson.status === 'COMPLETED' ? 'Ver / Repasar Clase' : 'Iniciar Clase ➔' }}</span>
                </button>

                <div *ngIf="lesson.status === 'LOCKED'" class="locked-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Completa la clase anterior</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .course-detail-page {
      padding: 28px 0 64px;
      background-color: var(--bg-main);
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
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

    .loading-container {
      text-align: center;
      padding: 60px 0;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 14px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Hero Card */
    .course-hero-card {
      padding: 28px 32px;
      margin-bottom: 32px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .hero-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 28px;
      align-items: center;
    }

    @media (max-width: 800px) {
      .hero-layout {
        grid-template-columns: 1fr;
      }
    }

    .hero-media {
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid #e2e8f0;
      aspect-ratio: 16 / 10;
    }

    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .hero-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .hero-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-status-completion {
      font-size: 0.72rem;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }

    .badge-completed {
      color: #16a34a !important;
      background: #f0fdf4 !important;
      border-color: #bbf7d0 !important;
    }

    .course-title {
      font-size: 1.6rem;
      line-height: 1.25;
      margin: 0;
      color: #0f172a;
    }

    .course-description {
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
    }

    /* Live Meet Callout */
    .live-meet-callout {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      margin-top: 2px;
      flex-wrap: wrap;
    }

    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #dc2626;
      flex-shrink: 0;
    }

    .meet-callout-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
    }

    .meet-callout-text strong {
      color: #b91c1c;
      font-size: 0.84rem;
    }

    .meet-callout-text span {
      color: #475569;
      font-size: 0.76rem;
    }

    .btn-meet {
      background: #dc2626 !important;
      border: none !important;
      font-size: 0.78rem;
      padding: 6px 12px;
      color: #fff !important;
      font-weight: 600;
    }

    .btn-meet:hover {
      background: #b91c1c !important;
    }

    /* Overall Progress */
    .course-overall-progress {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .progress-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
    }

    .progress-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .progress-percent {
      color: #0f172a;
      font-weight: 700;
    }

    .progress-track {
      height: 6px;
      background: #f1f5f9;
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #0f172a;
      border-radius: var(--radius-full);
      transition: width 0.4s ease;
    }

    .fill-completed {
      background: #16a34a !important;
    }

    /* Syllabus Section */
    .syllabus-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .syllabus-header h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .syllabus-subtitle {
      color: var(--text-secondary);
      font-size: 0.88rem;
      margin: 0;
    }

    .empty-syllabus {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      background: #ffffff;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    /* Lessons List */
    .lessons-syllabus-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .lesson-syllabus-card {
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      transition: all 0.2s ease;
      flex-wrap: wrap;
    }

    .lesson-syllabus-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-sm);
    }

    .card-completed {
      border-left: 3px solid #16a34a;
    }

    .card-available {
      border-left: 3px solid #0f172a;
    }

    .card-locked {
      opacity: 0.65;
      background: #f8fafc;
    }

    .lesson-card-main {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 260px;
    }

    .order-indicator {
      width: 38px;
      height: 38px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .card-completed .order-indicator {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #16a34a;
    }

    .card-locked .order-indicator {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: var(--text-muted);
    }

    .lesson-card-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .lesson-header-line {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .lesson-card-title {
      font-size: 1.05rem;
      margin: 0;
      color: #0f172a;
    }

    .badge-lesson-status {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }

    .status-badge-completed {
      color: #16a34a;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .status-badge-available {
      color: #0f172a;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }

    .status-badge-locked {
      color: var(--text-muted);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .lesson-card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .meta-badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-weight: 500;
    }

    .meta-ppt {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
    }

    .meta-meet {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }

    .meta-quiz {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
    }

    .lesson-card-action {
      min-width: 180px;
    }

    @media (max-width: 600px) {
      .lesson-card-action {
        width: 100%;
      }
    }

    .locked-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
      color: var(--text-muted);
      padding: 6px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
    }

    .w-full { width: 100%; }
  `],
})
export class CourseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);

  readonly course = signal<CourseDetail | null>(null);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const courseId = params.get('id');
      if (courseId) {
        this.loadCourse(courseId);
      }
    });
  }

  loadCourse(courseId: string): void {
    this.isLoading.set(true);
    this.coursesService.getCourseById(courseId).subscribe({
      next: (data) => {
        this.course.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        alert('No tienes acceso a este curso o no existe.');
        this.router.navigate(['/dashboard']);
      },
    });
  }

  startLesson(lessonId: string): void {
    this.router.navigate(['/lessons', lessonId], {
      queryParams: { view: 'presentation' },
    });
  }
}
