import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AdminService } from '../../core/services/admin.service';
import { CoursesService } from '../../core/services/courses.service';
import { CourseSummary } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>

    <main class="admin-page">
      <div class="container">
        <!-- Hero Section -->
        <section class="admin-hero glass-card animate-fade-in">
          <div class="hero-content">
            <span class="hero-badge">Área de Gestión Docente</span>
            <h1>Panel del Profesor</h1>
            <p>Gestiona cursos, sube clases y exámenes, adjunta presentaciones PowerPoint y matricula a tus alumnos.</p>
          </div>
          <div class="hero-actions">
            <button (click)="openCreateModal()" class="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Crear Nuevo Curso</span>
            </button>
            <button (click)="downloadExcelTemplate()" class="btn btn-secondary" title="Descargar archivo Excel de ejemplo para subir clases masivamente">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Plantilla Excel</span>
            </button>
          </div>
        </section>

        <!-- Section Title -->
        <div class="section-header">
          <div>
            <h2>Tus Cursos</h2>
            <p class="section-desc">Selecciona un curso para gestionar su contenido, importar clases y editar exámenes</p>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-state">
          <div class="spinner-large"></div>
          <p>Cargando cursos...</p>
        </div>

        <!-- Courses Grid -->
        <div class="courses-grid" *ngIf="!isLoading()">
          <article
            *ngFor="let course of courses()"
            class="course-card glass-card animate-fade-in"
          >
            <!-- Card Thumbnail -->
            <div class="card-image-wrapper">
              <img [src]="course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60'" [alt]="course.title" class="course-thumb" />
              <div class="lesson-count-badge">
                <span>{{ course.totalLessons }} Clases</span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <div class="card-header-row">
                <h3 class="course-title">{{ course.title }}</h3>
              </div>

              <!-- Google Meet Info Badge -->
              <div class="meet-status-row" *ngIf="course.meetUrl">
                <span class="badge-meet-active">
                  <span class="meet-dot"></span>
                  Google Meet activo
                </span>
                <a [href]="course.meetUrl" target="_blank" class="meet-link-btn" title="Abrir sala de Meet">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  Probar Enlace
                </a>
              </div>
              <div class="meet-status-row" *ngIf="!course.meetUrl">
                <span class="badge-meet-none">Sin enlace de Meet</span>
              </div>

              <p class="course-desc">{{ course.description }}</p>

              <!-- Action Buttons -->
              <div class="card-actions">
                <a
                  [routerLink]="['/admin/courses', course.id]"
                  [queryParams]="{ tab: 'students' }"
                  class="btn btn-primary w-full"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>👥 Gestionar Alumnos</span>
                </a>

                <a
                  [routerLink]="['/admin/courses', course.id]"
                  [queryParams]="{ tab: 'content' }"
                  class="btn btn-secondary w-full"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>📝 Clases, Exámenes y Excel</span>
                </a>

                <div class="sub-actions">
                  <button (click)="openEditModal(course)" class="btn-sub-edit" title="Editar detalles del curso">
                    ✏️ Editar
                  </button>
                  <button (click)="deleteCourse(course)" class="btn-sub-delete" title="Eliminar curso">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>

    <!-- CREATE / EDIT COURSE MODAL -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showModal()">
      <div class="modal-content glass-card animate-fade-in">
        <div class="modal-header">
          <h3>{{ isEditing() ? 'Editar Curso' : 'Crear Nuevo Curso' }}</h3>
          <button (click)="closeModal()" class="btn-close">&times;</button>
        </div>

        <form [formGroup]="courseForm" (ngSubmit)="saveCourse()">
          <div class="form-group">
            <label class="form-label" for="title">Título del Curso *</label>
            <input
              id="title"
              type="text"
              class="form-control"
              placeholder="Ej: Arquitectura de Software y NestJS"
              formControlName="title"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Descripción *</label>
            <textarea
              id="description"
              rows="3"
              class="form-control"
              placeholder="Resumen del contenido que aprenderán los alumnos..."
              formControlName="description"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="thumbnailUrl">URL Imagen de Portada (Opcional)</label>
            <input
              id="thumbnailUrl"
              type="text"
              class="form-control"
              placeholder="https://images.unsplash.com/..."
              formControlName="thumbnailUrl"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="meetUrl">
              <span>Enlace de Google Meet para Clases en Vivo (Opcional)</span>
            </label>
            <input
              id="meetUrl"
              type="url"
              class="form-control"
              placeholder="https://meet.google.com/abc-defg-hij"
              formControlName="meetUrl"
            />
            <span class="form-hint">Los alumnos verán un botón directo para unirse a la videollamada.</span>
          </div>

          <div class="modal-footer">
            <button type="button" (click)="closeModal()" class="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="courseForm.invalid || isSaving()"
            >
              <span>{{ isSaving() ? 'Guardando...' : (isEditing() ? 'Actualizar Curso' : 'Crear Curso') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      padding: 28px 0 64px;
      background-color: var(--bg-main);
    }

    .admin-hero {
      padding: 32px 36px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .hero-content {
      max-width: 600px;
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

    .admin-hero h1 {
      font-size: 1.75rem;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .hero-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .section-desc {
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
      background: #f1f5f9;
    }

    .course-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .lesson-count-badge {
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
    }

    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .course-title {
      font-size: 1.1rem;
      margin-bottom: 8px;
      line-height: 1.35;
      color: #0f172a;
    }

    .meet-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .badge-meet-active {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #16a34a;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .meet-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
    }

    .meet-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #2563eb;
    }

    .badge-meet-none {
      font-size: 0.72rem;
      color: var(--text-muted);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
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

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .w-full {
      width: 100%;
    }

    .sub-actions {
      display: flex;
      gap: 8px;
      margin-top: 2px;
    }

    .btn-sub-edit, .btn-sub-delete {
      flex: 1;
      padding: 6px 10px;
      font-size: 0.78rem;
      font-weight: 500;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-sub-edit {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    .btn-sub-edit:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .btn-sub-delete {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }

    .btn-sub-delete:hover {
      background: #fee2e2;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      width: 100%;
      max-width: 500px;
      padding: 28px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .modal-header h3 {
      font-size: 1.2rem;
      color: #0f172a;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.4rem;
      color: var(--text-muted);
      cursor: pointer;
    }

    .btn-close:hover {
      color: #0f172a;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
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
  `],
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly coursesService = inject(CoursesService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly courses = signal<CourseSummary[]>([]);
  readonly isLoading = signal(true);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly currentEditingId = signal<string | null>(null);

  readonly courseForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required]],
    thumbnailUrl: [''],
    meetUrl: [''],
  });

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

  openCreateModal(): void {
    this.isEditing.set(false);
    this.currentEditingId.set(null);
    this.courseForm.reset();
    this.showModal.set(true);
  }

  openEditModal(course: CourseSummary): void {
    this.isEditing.set(true);
    this.currentEditingId.set(course.id);
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      meetUrl: course.meetUrl,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.courseForm.value;

    if (this.isEditing() && this.currentEditingId()) {
      this.adminService.updateCourse(this.currentEditingId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadCourses();
        },
        error: () => {
          this.isSaving.set(false);
          alert('Error al actualizar el curso.');
        },
      });
    } else {
      this.adminService.createCourse(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadCourses();
        },
        error: () => {
          this.isSaving.set(false);
          alert('Error al crear el curso.');
        },
      });
    }
  }

  deleteCourse(course: CourseSummary): void {
    if (confirm(`¿Estás seguro de eliminar el curso "${course.title}" y todo su contenido?`)) {
      this.adminService.deleteCourse(course.id).subscribe({
        next: () => {
          this.loadCourses();
        },
        error: () => {
          alert('Error al eliminar el curso.');
        },
      });
    }
  }

  downloadExcelTemplate(): void {
    this.adminService.downloadExcelTemplate();
  }
}
