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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                <span class="badge-tag">🎓 Curso Virtual</span>
                <span class="badge-status-completion" [class.badge-completed]="c.progressPercentage === 100">
                  {{ c.progressPercentage === 100 ? '✅ Completado' : (c.progressPercentage > 0 ? '⏳ En Progreso' : '✨ Por Iniciar') }}
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
                <a [href]="c.meetUrl" target="_blank" class="btn btn-primary btn-sm btn-meet">
                  Unirse a Google Meet
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
                      <ng-container *ngIf="lesson.status === 'AVAILABLE'">🔓 Disponible</ng-container>
                      <ng-container *ngIf="lesson.status === 'LOCKED'">🔒 Bloqueada</ng-container>
                    </span>
                  </div>

                  <div class="lesson-card-meta">
                    <span *ngIf="lesson.presentationUrl" class="meta-badge meta-ppt">
                      📊 PowerPoint Disponible
                    </span>
                    <span *ngIf="lesson.meetUrl" class="meta-badge meta-meet">
                      🔴 Sesión Meet
                    </span>
                    <span class="meta-badge meta-quiz">
                      📝 Examen Multiple Choice (80% req.)
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>{{ lesson.status === 'COMPLETED' ? 'Ver / Repasar Clase' : 'Iniciar Clase ➔' }}</span>
                </button>

                <div *ngIf="lesson.status === 'LOCKED'" class="locked-indicator">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Completa la clase anterior para desbloquear</span>
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
      padding: 32px 0 80px;
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      font-size: 0.9rem;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-weight: 500;
      transition: color 0.2s;
    }

    .breadcrumb-link:hover {
      color: #fff;
    }

    .breadcrumb-separator {
      color: var(--text-muted);
    }

    .breadcrumb-current {
      color: #c084fc;
      font-weight: 600;
    }

    .loading-container {
      text-align: center;
      padding: 80px 0;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(139, 92, 246, 0.2);
      border-top-color: #a855f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Hero Card */
    .course-hero-card {
      padding: 36px;
      margin-bottom: 40px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid rgba(139, 92, 246, 0.35);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .hero-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 32px;
      align-items: center;
    }

    @media (max-width: 860px) {
      .hero-layout {
        grid-template-columns: 1fr;
      }
    }

    .hero-media {
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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
      gap: 12px;
    }

    .hero-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge-tag {
      font-size: 0.78rem;
      font-weight: 700;
      color: #c084fc;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      padding: 3px 10px;
      border-radius: var(--radius-full);
    }

    .badge-status-completion {
      font-size: 0.78rem;
      font-weight: 600;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 3px 10px;
      border-radius: var(--radius-full);
    }

    .badge-completed {
      color: #34d399 !important;
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(16, 185, 129, 0.35) !important;
    }

    .course-title {
      font-size: 1.85rem;
      line-height: 1.25;
      margin: 0;
    }

    .course-description {
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
    }

    /* Live Meet Callout */
    .live-meet-callout {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.7) 100%);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--radius-sm);
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .live-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      animation: pulse 1.5s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .meet-callout-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .meet-callout-text strong {
      color: #fca5a5;
      font-size: 0.88rem;
    }

    .meet-callout-text span {
      color: var(--text-secondary);
      font-size: 0.78rem;
    }

    .btn-meet {
      background: #ef4444 !important;
      border: none !important;
      font-size: 0.82rem;
      padding: 6px 14px;
      font-weight: 700;
    }

    /* Overall Progress */
    .course-overall-progress {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.84rem;
    }

    .progress-label {
      color: var(--text-muted);
      font-weight: 600;
    }

    .progress-percent {
      color: #c084fc;
      font-weight: 700;
    }

    .progress-track {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
      border-radius: var(--radius-full);
      transition: width 0.6s ease;
    }

    .fill-completed {
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%) !important;
    }

    /* Syllabus Section */
    .syllabus-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .syllabus-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .syllabus-subtitle {
      color: var(--text-secondary);
      font-size: 0.92rem;
      margin: 0;
    }

    .empty-syllabus {
      padding: 48px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    /* Lessons List */
    .lessons-syllabus-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .lesson-syllabus-card {
      padding: 22px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      transition: all 0.25s ease;
      flex-wrap: wrap;
    }

    .card-available {
      border: 1px solid rgba(139, 92, 246, 0.45);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.12);
    }

    .card-available:hover {
      border-color: #a855f7;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.25);
    }

    .card-completed {
      border: 1px solid rgba(16, 185, 129, 0.35);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.85) 100%);
    }

    .card-locked {
      opacity: 0.6;
      border: 1px solid var(--border-subtle);
      background: rgba(15, 23, 42, 0.5);
    }

    .lesson-card-main {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
      min-width: 280px;
    }

    .order-indicator {
      width: 44px;
      height: 44px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #c084fc;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .card-completed .order-indicator {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    .card-locked .order-indicator {
      background: rgba(255, 255, 255, 0.03);
      border-color: var(--border-subtle);
      color: var(--text-muted);
    }

    .lesson-card-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .lesson-header-line {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .lesson-card-title {
      font-size: 1.15rem;
      margin: 0;
      color: #fff;
    }

    .badge-lesson-status {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .status-badge-completed {
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .status-badge-available {
      color: #c084fc;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
    }

    .status-badge-locked {
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
    }

    .lesson-card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .meta-badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .meta-ppt {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .meta-meet {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .meta-quiz {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
    }

    .lesson-card-action {
      min-width: 200px;
    }

    @media (max-width: 600px) {
      .lesson-card-action {
        width: 100%;
      }
    }

    .locked-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--text-muted);
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .locked-indicator svg {
      flex-shrink: 0;
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
      error: (err) => {
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
