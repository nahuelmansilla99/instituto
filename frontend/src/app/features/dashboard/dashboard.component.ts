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
        <!-- Welcome Hero Banner -->
        <header class="hero-section glass-card animate-fade-in">
          <div class="hero-content">
            <span class="hero-badge">Portal de Aprendizaje</span>
            <h1>Bienvenido, {{ authService.currentUser()?.name }}</h1>
            <p>Accede a tus cursos matriculados, estudia las clases y rinde las evaluaciones.</p>
          </div>

          <div class="hero-stats">
            <div class="stat-box">
              <span class="stat-number">{{ courses().length }}</span>
              <span class="stat-label">Cursos Asignados</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">{{ getTotalCompletedLessons() }}</span>
              <span class="stat-label">Clases Aprobadas</span>
            </div>
          </div>
        </header>

        <!-- Teacher Notice Banner (If Admin / Teacher) -->
        <div *ngIf="authService.currentUser()?.role === 'ADMIN'" class="teacher-admin-banner glass-card animate-fade-in">
          <div class="teacher-banner-info">
            <strong>👨‍🏫 Modo Profesor / Administrador</strong>
            <p>Puedes crear nuevos cursos, subir presentaciones PowerPoint (.pptx), organizar exámenes y matricular alumnos desde el panel de gestión.</p>
          </div>
          <a routerLink="/admin" class="btn btn-secondary btn-sm">
            Ir al Panel del Profesor ➔
          </a>
        </div>

        <!-- Section Title -->
        <div class="section-header">
          <h2>Mis Cursos Matriculados</h2>
          <p class="section-subtitle">Selecciona un curso para continuar tu aprendizaje o abrir directamente la presentación de la clase.</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-state">
          <div class="spinner-large"></div>
          <p>Cargando tus cursos asignados...</p>
        </div>

        <!-- Empty State (No courses assigned yet) -->
        <div *ngIf="!isLoading() && courses().length === 0" class="empty-state-card glass-card animate-fade-in">
          <div class="empty-icon">📂</div>
          <h3>Aún no tienes cursos asignados</h3>
          <p>El profesor debe matricularte en los cursos correspondientes para que puedas acceder al contenido y rendir los exámenes.</p>
        </div>

        <!-- Courses Grid -->
        <div class="courses-grid" *ngIf="!isLoading() && courses().length > 0">
          <article
            *ngFor="let course of courses()"
            class="course-card glass-card animate-fade-in"
          >
            <!-- Card Thumbnail (Clickable to open Class & PowerPoint) -->
            <div
              class="card-image-wrapper clickable-thumb"
              (click)="openCourseClassWithPowerPoint(course.id)"
              role="button"
              tabindex="0"
              title="Haz clic para abrir la clase y ver el PowerPoint"
            >
              <img [src]="course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60'" [alt]="course.title" class="course-thumb" />
              
              <!-- Hover Overlay -->
              <div class="thumb-hover-overlay">
                <div class="thumb-cta-pill">
                  <span class="pill-icon">📊</span>
                  <span class="pill-text">Abrir Clase y PowerPoint</span>
                </div>
              </div>

              <div class="progress-badge">
                <span [class.text-success]="course.progressPercentage === 100">
                  {{ course.progressPercentage }}% Completado
                </span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <h3 class="course-title" (click)="openCourseClassWithPowerPoint(course.id)" style="cursor: pointer;">
                {{ course.title }}
              </h3>
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

              <!-- Action Buttons -->
              <div class="card-buttons-group">
                <button
                  (click)="openCourseClassWithPowerPoint(course.id)"
                  class="btn btn-primary w-full btn-open-ppt"
                >
                  <span class="btn-emoji">📊</span>
                  <span>Abrir Clase y Ver PowerPoint ➔</span>
                </button>

                <button
                  (click)="openCourseSyllabus(course.id)"
                  class="btn btn-secondary w-full btn-view-syllabus"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>Temario de Clases ({{ course.totalLessons }})</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .dashboard-page {
      padding: 28px 0 64px;
      background-color: var(--bg-main);
    }

    .hero-section {
      padding: 32px 36px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .hero-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hero-content h1 {
      font-size: 1.75rem;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .hero-content p {
      color: var(--text-secondary);
      font-size: 0.92rem;
    }

    .hero-stats {
      display: flex;
      gap: 12px;
    }

    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px 20px;
      border-radius: var(--radius-sm);
      text-align: center;
      min-width: 110px;
    }

    .stat-number {
      display: block;
      font-size: 1.6rem;
      font-weight: 700;
      font-family: var(--font-heading);
      color: #0f172a;
    }

    .stat-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .teacher-admin-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      margin-bottom: 28px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: var(--radius-sm);
      flex-wrap: wrap;
    }

    .teacher-banner-info strong {
      font-size: 0.9rem;
      color: #0f172a;
      display: block;
      margin-bottom: 2px;
    }

    .teacher-banner-info p {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .btn-sm {
      padding: 8px 14px;
      font-size: 0.82rem;
    }

    .empty-state-card {
      padding: 48px 24px;
      text-align: center;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      margin-top: 16px;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .empty-state-card h3 {
      font-size: 1.2rem;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .empty-state-card p {
      color: var(--text-secondary);
      font-size: 0.88rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .section-subtitle {
      color: var(--text-secondary);
      font-size: 0.88rem;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    .course-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .course-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }

    .card-image-wrapper {
      position: relative;
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: #f1f5f9;
    }

    .clickable-thumb {
      cursor: pointer;
    }

    .course-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .course-card:hover .course-thumb {
      transform: scale(1.04);
    }

    .thumb-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .course-card:hover .thumb-hover-overlay {
      opacity: 1;
    }

    .thumb-cta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.8rem;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-md);
    }

    .progress-badge {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: #ffffff;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.72rem;
      font-weight: 600;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      z-index: 2;
    }

    .text-success {
      color: #16a34a !important;
    }

    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .course-title {
      font-size: 1.1rem;
      margin-bottom: 6px;
      line-height: 1.35;
      color: #0f172a;
    }

    .course-title:hover {
      color: #2563eb;
    }

    .course-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
      line-height: 1.45;
    }

    .course-progress-section {
      margin-bottom: 14px;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .progress-count {
      font-weight: 600;
      color: #0f172a;
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

    .btn-live-meet {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn-live-meet:hover {
      background: #fee2e2;
      border-color: #f87171;
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #dc2626;
    }

    .card-buttons-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .btn-open-ppt {
      background: #0f172a !important;
      border: 1px solid #0f172a !important;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 0.88rem;
      padding: 10px 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-open-ppt:hover {
      background: #1e293b !important;
    }

    .btn-view-syllabus {
      font-size: 0.82rem;
      padding: 8px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-view-syllabus:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    .btn-emoji {
      font-size: 1rem;
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

  openCourseClassWithPowerPoint(courseId: string): void {
    this.isLoading.set(true);
    this.coursesService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.isLoading.set(false);
        if (course && course.lessons && course.lessons.length > 0) {
          const targetLesson =
            course.lessons.find((l) => l.status === 'AVAILABLE') ||
            course.lessons.find((l) => l.status === 'COMPLETED') ||
            course.lessons[0];

          if (targetLesson) {
            this.router.navigate(['/lessons', targetLesson.id], {
              queryParams: { view: 'presentation' },
            });
            return;
          }
        }
        this.router.navigate(['/courses', courseId]);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/courses', courseId]);
      },
    });
  }

  openCourseSyllabus(courseId: string): void {
    this.router.navigate(['/courses', courseId]);
  }
}
