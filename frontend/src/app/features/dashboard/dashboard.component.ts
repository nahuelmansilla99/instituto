import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CoursesService } from '../../core/services/courses.service';
import { AuthService } from '../../core/services/auth.service';
import { CourseSummary } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>

    <main class="dashboard-page">
      <div class="container">
        <!-- Teacher Role Banner if Admin -->
        <div *ngIf="authService.currentUser()?.role === 'ADMIN'" class="teacher-admin-banner glass-card animate-fade-in">
          <div class="teacher-banner-text">
            <span class="badge-role-tag">👨‍🏫 Perfil de Profesor Activo</span>
            <h3>Panel de Gestión de Cursos, Clases y Alumnos</h3>
            <p>Puedes matricular estudiantes, ver el rendimiento clase por clase, subir exámenes por Excel y configurar salas de Google Meet.</p>
          </div>
          <a routerLink="/admin" class="btn btn-primary btn-teacher-portal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Ir al Panel del Profesor (Gestión de Alumnos) ➔</span>
          </a>
        </div>

        <!-- Hero Section -->
        <section class="hero-section glass-card animate-fade-in" *ngIf="authService.currentUser() as user">
          <div class="hero-content">
            <span class="hero-badge">🎓 Panel del Estudiante</span>
            <h1>¡Hola de nuevo, <span class="gradient-text">{{ user.name }}</span>!</h1>
            <p>Continúa con tus clases y responde los cuestionarios para desbloquear los siguientes módulos.</p>
          </div>
          <div class="hero-stats">
            <div class="stat-box">
              <span class="stat-number">{{ courses().length }}</span>
              <span class="stat-label">Cursos Activos</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">{{ getTotalCompletedLessons() }}</span>
              <span class="stat-label">Clases Aprobadas</span>
            </div>
          </div>
        </section>

        <!-- Courses Grid Header -->
        <div class="section-header">
          <div>
            <h2>Cursos Disponibles</h2>
            <p class="section-desc">Selecciona un curso para continuar tu aprendizaje paso a paso</p>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-state">
          <div class="spinner-large"></div>
          <p>Cargando tus cursos...</p>
        </div>

        <!-- Empty State if no enrolled courses -->
        <div *ngIf="!isLoading() && courses().length === 0" class="empty-state glass-card animate-fade-in">
          <div class="empty-icon">📚</div>
          <h3>Aún no tienes cursos asignados</h3>
          <p>El profesor debe matricularte en los cursos correspondientes para que puedas acceder al contenido y rendir los exámenes.</p>
        </div>

        <!-- Courses Grid -->
        <div class="courses-grid" *ngIf="!isLoading() && courses().length > 0">
          <article
            *ngFor="let course of courses()"
            class="course-card glass-card animate-fade-in"
          >
            <!-- Card Thumbnail -->
            <div class="card-image-wrapper">
              <img [src]="course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60'" [alt]="course.title" class="course-thumb" />
              <div class="progress-badge">
                <span [class.text-success]="course.progressPercentage === 100">
                  {{ course.progressPercentage }}% Completado
                </span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <h3 class="course-title">{{ course.title }}</h3>
              <p class="course-desc">{{ course.description }}</p>

              <!-- Progress Bar -->
              <div class="course-progress-section">
                <div class="progress-info">
                  <span>Progreso del Curso</span>
                  <span class="progress-count">{{ course.completedLessons }} de {{ course.totalLessons }} clases</span>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    [style.width.%]="course.progressPercentage"
                    [class.fill-completed]="course.progressPercentage === 100"
                  ></div>
                </div>
              </div>

              <!-- Google Meet Button if active -->
              <a
                *ngIf="course.meetUrl"
                [href]="course.meetUrl"
                target="_blank"
                class="btn-live-meet"
              >
                <span class="live-dot"></span>
                <span>🔴 Unirse a Clase en Vivo (Meet)</span>
              </a>

              <!-- Action Button -->
              <button
                (click)="openCourse(course.id)"
                class="btn w-full"
                [ngClass]="course.progressPercentage > 0 ? 'btn-primary' : 'btn-secondary'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>{{ course.progressPercentage === 100 ? 'Revisar Curso' : (course.progressPercentage > 0 ? 'Continuar Clase' : 'Iniciar Curso') }}</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .dashboard-page {
      padding: 32px 0 64px;
    }

    .teacher-admin-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 24px 32px;
      margin-bottom: 32px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(30, 41, 59, 0.9) 100%);
      border: 1px solid rgba(139, 92, 246, 0.45);
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.25);
      flex-wrap: wrap;
    }

    .badge-role-tag {
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 700;
      color: #c084fc;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      margin-bottom: 6px;
    }

    .teacher-banner-text h3 {
      font-size: 1.25rem;
      margin-bottom: 4px;
    }

    .teacher-banner-text p {
      color: var(--text-secondary);
      font-size: 0.88rem;
      max-width: 650px;
      margin: 0;
    }

    .btn-teacher-portal {
      padding: 12px 24px;
      font-size: 0.95rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .hero-section {
      padding: 36px 40px;
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid var(--border-active);
    }

    .hero-content {
      max-width: 600px;
    }

    .hero-badge {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #818cf8;
      background: var(--primary-light);
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      margin-bottom: 12px;
    }

    .hero-content h1 {
      font-size: 2rem;
      margin-bottom: 8px;
    }

    .gradient-text {
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-content p {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .hero-stats {
      display: flex;
      gap: 16px;
    }

    .stat-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-subtle);
      padding: 16px 24px;
      border-radius: var(--radius-md);
      text-align: center;
      min-width: 120px;
    }

    .stat-number {
      display: block;
      font-size: 1.8rem;
      font-weight: 800;
      font-family: var(--font-heading);
      color: #fff;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .section-desc {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 28px;
    }

    .course-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .course-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .card-image-wrapper {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #1e293b;
    }

    .course-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .course-card:hover .course-thumb {
      transform: scale(1.05);
    }

    .progress-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      color: #818cf8;
      border: 1px solid var(--border-subtle);
    }

    .text-success {
      color: #34d399 !important;
    }

    .card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .course-title {
      font-size: 1.2rem;
      margin-bottom: 8px;
      line-height: 1.35;
    }

    .course-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-bottom: 20px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
    }

    .course-progress-section {
      margin-bottom: 20px;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .progress-count {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .progress-track {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent-gradient);
      border-radius: var(--radius-full);
      transition: width 0.6s ease;
    }

    .fill-completed {
      background: var(--status-completed);
    }

    .btn-live-meet {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      margin-bottom: 10px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: var(--radius-md);
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-live-meet:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #fff;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: livePulse 1.2s infinite;
    }

    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }

    .w-full {
      width: 100%;
    }

    .loading-state {
      text-align: center;
      padding: 60px 0;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .hero-section {
        flex-direction: column;
        align-items: flex-start;
        padding: 24px;
      }
      .hero-stats {
        width: 100%;
      }
      .stat-box {
        flex: 1;
      }
      .courses-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly coursesService = inject(CoursesService);
  private readonly router = inject(Router);

  readonly courses = signal<CourseSummary[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.coursesService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getTotalCompletedLessons(): number {
    return this.courses().reduce((sum, c) => sum + (c.completedLessons || 0), 0);
  }

  openCourse(courseId: string): void {
    this.coursesService.getCourseById(courseId).subscribe({
      next: (course) => {
        if (course && course.lessons && course.lessons.length > 0) {
          // Find first available lesson or first completed, or fallback to first
          const targetLesson =
            course.lessons.find((l) => l.status === 'AVAILABLE') ||
            course.lessons.find((l) => l.status === 'COMPLETED') ||
            course.lessons[0];

          if (targetLesson) {
            this.router.navigate(['/lessons', targetLesson.id]);
            return;
          }
        }
        alert('Este curso aún no tiene clases configuradas.');
      },
      error: (err) => {
        console.error('Error al abrir el curso:', err);
        alert('No se pudo acceder al curso. Por favor intenta de nuevo.');
      },
    });
  }
}
