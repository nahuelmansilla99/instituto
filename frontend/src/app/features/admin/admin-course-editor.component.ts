import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AdminService, AdminCourseDetail } from '../../core/services/admin.service';
import {
  AdminQuizQuestion,
  EnrolledStudentReport,
  StudentSummary,
  StudentCourseProgressReport,
} from '../../core/models';

@Component({
  selector: 'app-admin-course-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar></app-navbar>

    <div class="editor-page" *ngIf="course() as c">
      <div class="container">
        <!-- Breadcrumbs -->
        <nav class="editor-breadcrumb">
          <a routerLink="/admin" class="breadcrumb-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver a Cursos
          </a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ c.title }}</span>
        </nav>

        <!-- Course Header & Google Meet Management -->
        <header class="course-header-card glass-card animate-fade-in">
          <div class="header-main-info">
            <span class="badge-role">Configuración del Curso</span>
            <h1>{{ c.title }}</h1>
            <p class="course-desc-full">{{ c.description }}</p>

            <!-- Google Meet Box -->
            <div class="meet-config-box">
              <div class="meet-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div class="meet-text-info">
                <span class="meet-label">Enlace de Google Meet para Clases en Vivo:</span>
                <span *ngIf="c.meetUrl" class="meet-url-text">{{ c.meetUrl }}</span>
                <span *ngIf="!c.meetUrl" class="meet-url-none">No configurado aún</span>
              </div>
              <button (click)="openMeetModal()" class="btn btn-secondary btn-sm">
                {{ c.meetUrl ? '✏️ Cambiar Enlace' : '➕ Añadir Meet' }}
              </button>
            </div>
          </div>
        </header>

        <!-- NAVIGATION TABS -->
        <div class="admin-tabs-nav">
          <button
            (click)="activeTab.set('content')"
            class="tab-btn"
            [class.tab-btn-active]="activeTab() === 'content'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>Clases y Exámenes ({{ c.lessons.length }})</span>
          </button>

          <button
            (click)="switchTabToStudents()"
            class="tab-btn"
            [class.tab-btn-active]="activeTab() === 'students'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Alumnos Matriculados ({{ enrolledStudents().length }})</span>
          </button>
        </div>

        <!-- ==================================================== -->
        <!-- TAB 1: CLASES Y EXÁMENES                             -->
        <!-- ==================================================== -->
        <div *ngIf="activeTab() === 'content'" class="tab-content-pane animate-fade-in">
          <!-- LESSONS & QUIZ QUESTIONS MANAGEMENT -->
          <section class="lessons-management-section">
            <div class="section-title-row">
              <div>
                <h2>Clases del Curso ({{ c.lessons.length }})</h2>
                <p class="section-desc">Administra el temario, redacta el contenido, adjunta presentaciones PowerPoint y configura los exámenes de opción múltiple</p>
              </div>
              <button (click)="openCreateLessonModal()" class="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Agregar Nueva Clase</span>
              </button>
            </div>

            <div *ngIf="presentationSuccessMessage()" class="alert-success-box animate-fade-in" style="margin-bottom: 20px;">
              <span>✅ {{ presentationSuccessMessage() }}</span>
            </div>

            <!-- Empty Lessons State -->
            <div *ngIf="c.lessons.length === 0" class="empty-state glass-card">
              <div class="empty-icon">📂</div>
              <h3>No hay clases creadas en este curso</h3>
              <p>Haz clic en 'Agregar Nueva Clase' para crear la primera lección del curso.</p>
            </div>

            <!-- Lessons List -->
            <div class="lessons-list" *ngIf="c.lessons.length > 0">
              <div
                *ngFor="let lesson of c.lessons"
                class="lesson-card glass-card animate-fade-in"
              >
                <div class="lesson-top-row">
                  <div class="lesson-order-badge">
                    <span>#{{ lesson.orderNumber }}</span>
                  </div>
                  <div class="lesson-info">
                    <h3 class="lesson-title">{{ lesson.title }}</h3>
                    <div class="lesson-meta-badges">
                      <span *ngIf="lesson.meetUrl" class="badge-meet-pill">
                        🔴 Meet: {{ lesson.meetUrl }}
                      </span>
                      <span *ngIf="lesson.presentationUrl" class="badge-ppt-pill">
                        📊 PPT: {{ lesson.presentationFilename || 'Presentación adjunta' }}
                      </span>
                      <span class="badge-questions-count">
                        📝 {{ lesson.questions?.length || 0 }} Preguntas de Examen
                      </span>
                    </div>
                  </div>

                  <div class="lesson-actions-group">
                    <!-- Upload or Manage PowerPoint / Prezi -->
                    <div *ngIf="!lesson.presentationUrl" class="ppt-unattached-group">
                      <label class="btn btn-secondary btn-sm btn-ppt-upload-btn" title="Subir archivo de PowerPoint (.pptx, .ppt, .pdf)">
                        <input
                          type="file"
                          accept=".pptx, .ppt, .pdf, .odp"
                          (change)="onPresentationFileSelected($event, lesson)"
                          class="file-input-hidden"
                        />
                        <span>📁 Subir PPT</span>
                      </label>
                      <button
                        (click)="openPreziModal(lesson)"
                        class="btn btn-secondary btn-sm btn-prezi-btn"
                        title="Vincular presentación de Prezi o Diapositivas Online"
                      >
                        <span>🌀 Prezi / Enlace</span>
                      </button>
                    </div>

                    <div *ngIf="lesson.presentationUrl" class="ppt-attached-group">
                      <a *ngIf="!isPreziUrl(lesson.presentationUrl)" [href]="lesson.presentationUrl" target="_blank" class="btn btn-secondary btn-sm" title="Descargar / Ver presentación">
                        📥 PPT
                      </a>
                      <a *ngIf="isPreziUrl(lesson.presentationUrl)" [href]="lesson.presentationUrl" target="_blank" class="btn btn-secondary btn-sm" title="Abrir presentación en Prezi">
                        🌀 Prezi
                      </a>
                      <button (click)="openPreziModal(lesson)" class="btn btn-secondary btn-sm" title="Editar enlace de Prezi o presentación">
                        🔗
                      </button>
                      <label class="btn btn-secondary btn-sm btn-ppt-change" title="Reemplazar por archivo local (.pptx, .pdf)">
                        <input
                          type="file"
                          accept=".pptx, .ppt, .pdf, .odp"
                          (change)="onPresentationFileSelected($event, lesson)"
                          class="file-input-hidden"
                        />
                        <span>🔄 Archivo</span>
                      </label>
                      <button (click)="removePresentation(lesson)" class="btn-icon btn-icon-delete" title="Quitar presentación de esta clase">
                        ❌
                      </button>
                    </div>

                    <button
                      (click)="openLessonStudentsModal(lesson)"
                      class="btn btn-secondary btn-sm btn-lesson-students"
                      title="Ver y gestionar qué alumnos completaron esta clase"
                    >
                      <span>👥 Alumnos</span>
                    </button>
                    <button
                      (click)="openQuestionsModal(lesson)"
                      class="btn btn-secondary btn-sm btn-quiz-manage"
                    >
                      <span>📝 Cuestionario ({{ lesson.questions?.length || 0 }})</span>
                    </button>
                    <button (click)="openEditLessonModal(lesson)" class="btn-icon" title="Editar Clase">
                      ✏️
                    </button>
                    <button (click)="deleteLesson(lesson)" class="btn-icon btn-icon-delete" title="Eliminar Clase">
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- Content Preview -->
                <div class="lesson-content-preview">
                  <span class="preview-label">Vista Previa del Contenido:</span>
                  <div class="preview-box" [innerHTML]="lesson.content || 'Sin contenido'"></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ==================================================== -->
        <!-- TAB 2: GESTIÓN DE ALUMNOS INSCRITOS                  -->
        <!-- ==================================================== -->
        <div *ngIf="activeTab() === 'students'" class="tab-content-pane animate-fade-in">
          <!-- Stats Row -->
          <div class="students-stats-grid">
            <div class="stat-card glass-card">
              <span class="stat-label">Total Alumnos Matriculados</span>
              <span class="stat-value text-accent">{{ enrolledStudents().length }}</span>
              <span class="stat-desc">Estudiantes con acceso al curso</span>
            </div>

            <div class="stat-card glass-card">
              <span class="stat-label">Avance Promedio del Curso</span>
              <span class="stat-value text-primary">{{ getAverageCourseProgress() }}%</span>
              <span class="stat-desc">Progreso medio de clases aprobadas</span>
            </div>

            <div class="stat-card glass-card">
              <span class="stat-label">Promedio General en Quizes</span>
              <span class="stat-value text-success">{{ getOverallAverageScore() }}%</span>
              <span class="stat-desc">Rendimiento en exámenes aprobados</span>
            </div>
          </div>

          <!-- Students Management Section -->
          <section class="students-management-card glass-card">
            <div class="students-header-row">
              <div>
                <h2>Alumnos Inscritos en este Curso</h2>
                <p class="section-desc">Monitorea el progreso, calificaciones y matricula a nuevos alumnos</p>
              </div>

              <div class="students-top-actions">
                <button (click)="openEnrollModal()" class="btn btn-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="19" y1="8" x2="19" y2="14"></line>
                    <line x1="22" y1="11" x2="16" y2="11"></line>
                  </svg>
                  <span>Matricular Alumno</span>
                </button>
              </div>
            </div>

            <!-- Loading Students -->
            <div *ngIf="isLoadingStudents()" class="loading-state">
              <div class="spinner-large"></div>
              <p>Cargando alumnos inscritos...</p>
            </div>

            <!-- Empty Students State -->
            <div *ngIf="!isLoadingStudents() && enrolledStudents().length === 0" class="empty-state">
              <div class="empty-icon">👥</div>
              <h3>No hay alumnos inscritos en este curso aún</h3>
              <p>Haz clic en "Matricular Alumno" para dar acceso a un estudiante registrado.</p>
            </div>

            <!-- Students Table -->
            <div class="table-responsive" *ngIf="!isLoadingStudents() && enrolledStudents().length > 0">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Fecha Matrícula</th>
                    <th>Progreso en el Curso</th>
                    <th>Promedio Quizes</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let student of enrolledStudents()" class="table-row">
                    <td>
                      <div class="student-profile-cell">
                        <div class="student-avatar">{{ getInitials(student.name) }}</div>
                        <div class="student-meta">
                          <span class="student-name">{{ student.name }}</span>
                          <span class="student-email">{{ student.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="date-text">{{ student.enrolledAt | date:'mediumDate' }}</span>
                    </td>
                    <td>
                      <div class="student-progress-col">
                        <div class="progress-numbers">
                          <span>{{ student.completedLessons }} de {{ student.totalLessons }} clases</span>
                          <span class="progress-bold">{{ student.progressPercentage }}%</span>
                        </div>
                        <div class="progress-bar-sm">
                          <div
                            class="progress-fill-sm"
                            [style.width.%]="student.progressPercentage"
                            [class.fill-done]="student.progressPercentage === 100"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        *ngIf="student.averageScore !== null"
                        class="badge-score"
                        [class.badge-score-high]="student.averageScore >= 80"
                      >
                        ⭐ {{ student.averageScore }}%
                      </span>
                      <span *ngIf="student.averageScore === null" class="badge-score-none">
                        Sin evaluaciones
                      </span>
                    </td>
                    <td class="text-right">
                      <div class="table-actions">
                        <button
                          (click)="viewStudentProgress(student)"
                          class="btn btn-secondary btn-sm"
                          title="Ver desglose clase por clase y calificaciones de quizes"
                        >
                          <span>📊 Ver Notas</span>
                        </button>
                        <button
                          (click)="unenrollStudent(student)"
                          class="btn-icon btn-icon-delete"
                          title="Desmatricular / Dar de baja alumno"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- MODAL: ENROLL STUDENT -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showEnrollModal()">
      <div class="modal-content glass-card animate-fade-in">
        <div class="modal-header">
          <h3>Matricular Alumno al Curso</h3>
          <button (click)="showEnrollModal.set(false)" class="btn-close">&times;</button>
        </div>

        <form [formGroup]="enrollForm" (ngSubmit)="submitEnrollStudent()">
          <div class="form-group">
            <label class="form-label" for="registeredStudent">Seleccionar de Alumnos Registrados</label>
            <select
              id="registeredStudent"
              class="form-control"
              (change)="onSelectStudentDropdown($event)"
            >
              <option value="">-- Seleccionar un estudiante --</option>
              <option *ngFor="let s of allPlatformStudents()" [value]="s.email">
                {{ s.name }} ({{ s.email }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="studentEmailInput">O ingresar Email o ID del Estudiante *</label>
            <input
              id="studentEmailInput"
              type="text"
              class="form-control"
              placeholder="ejemplo@correo.com"
              formControlName="emailOrUserId"
            />
            <span class="form-hint">El alumno debe tener una cuenta creada en la plataforma.</span>
          </div>

          <div class="modal-footer">
            <button type="button" (click)="showEnrollModal.set(false)" class="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="enrollForm.invalid || isEnrolling()"
            >
              <span>{{ isEnrolling() ? 'Matriculando...' : 'Confirmar Matrícula' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: STUDENT DETAILED PROGRESS & QUIZ SCORES -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showStudentProgressModal()">
      <div class="modal-content glass-card animate-fade-in modal-large" *ngIf="selectedStudentReport() as report">
        <div class="modal-header">
          <div>
            <h3>📊 Rendimiento Académico: {{ report.student.name }}</h3>
            <p class="modal-subtitle">{{ report.student.email }} &bull; Curso: {{ report.course.title }}</p>
          </div>
          <button (click)="showStudentProgressModal.set(false)" class="btn-close">&times;</button>
        </div>

        <div class="student-breakdown-body">
          <div class="breakdown-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Clase</th>
                  <th>Estado</th>
                  <th>Calificación Quiz</th>
                  <th>Fecha de Aprobación</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of report.lessons">
                  <td>
                    <div class="lesson-name-cell">
                      <span class="lesson-num-pill">#{{ l.orderNumber }}</span>
                      <span class="lesson-text">{{ l.title }}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="badge-status-pill"
                      [ngClass]="{
                        'status-pill-completed': l.status === 'COMPLETED',
                        'status-pill-available': l.status === 'AVAILABLE',
                        'status-pill-locked': l.status === 'LOCKED'
                      }"
                    >
                      {{ l.status === 'COMPLETED' ? '✓ Aprobada' : (l.status === 'AVAILABLE' ? 'En Curso' : '🔒 Bloqueada') }}
                    </span>
                  </td>
                  <td>
                    <span *ngIf="l.score !== null" class="score-pill" [class.score-pass]="l.score >= 80">
                      {{ l.score }}%
                    </span>
                    <span *ngIf="l.score === null" class="score-none">-</span>
                  </td>
                  <td>
                    <span *ngIf="l.completedAt" class="date-text">{{ l.completedAt | date:'medium' }}</span>
                    <span *ngIf="!l.completedAt" class="date-text text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="showStudentProgressModal.set(false)" class="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: EDIT GOOGLE MEET URL -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showMeetModal()">
      <div class="modal-content glass-card animate-fade-in">
        <div class="modal-header">
          <h3>Enlace de Google Meet del Curso</h3>
          <button (click)="showMeetModal.set(false)" class="btn-close">&times;</button>
        </div>
        <form [formGroup]="meetForm" (ngSubmit)="saveMeetUrl()">
          <div class="form-group">
            <label class="form-label" for="meetUrlInput">URL de la Reunión (Google Meet / Zoom)</label>
            <input
              id="meetUrlInput"
              type="url"
              class="form-control"
              placeholder="https://meet.google.com/abc-defg-hij"
              formControlName="meetUrl"
            />
            <span class="form-hint">Este enlace se mostrará con un botón destacado a todos los estudiantes inscritos.</span>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="showMeetModal.set(false)" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving()">Guardar Enlace</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: CREATE / EDIT LESSON -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showLessonModal()">
      <div class="modal-content glass-card animate-fade-in modal-large">
        <div class="modal-header">
          <h3>{{ isEditingLesson() ? 'Editar Clase' : 'Nueva Clase' }}</h3>
          <button (click)="closeLessonModal()" class="btn-close">&times;</button>
        </div>

        <form [formGroup]="lessonForm" (ngSubmit)="saveLesson()">
          <div class="form-group">
            <label class="form-label" for="lTitle">Título de la Clase *</label>
            <input
              id="lTitle"
              type="text"
              class="form-control"
              placeholder="Ej: 1. Introducción a los Módulos"
              formControlName="title"
            />
          </div>

          <div class="form-group-row">
            <div class="form-group flex-1">
              <label class="form-label" for="lOrder">Número de Orden</label>
              <input
                id="lOrder"
                type="number"
                class="form-control"
                placeholder="1"
                formControlName="orderNumber"
              />
            </div>
            <div class="form-group flex-2">
              <label class="form-label" for="lMeet">Enlace de Google Meet Específico (Opcional)</label>
              <input
                id="lMeet"
                type="url"
                class="form-control"
                placeholder="https://meet.google.com/..."
                formControlName="meetUrl"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="lContent">Contenido de la Clase (HTML / Texto / Embed Video) *</label>
            <textarea
              id="lContent"
              rows="6"
              class="form-control font-mono"
              placeholder="<h2>Título</h2><p>Explicación...</p><iframe src='https://www.youtube.com/embed/...'></iframe>"
              formControlName="content"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="lPresentationUrl">
              <span>🌀 Enlace a Presentación (Prezi, Google Slides, Canva o Web - Opcional)</span>
            </label>
            <input
              id="lPresentationUrl"
              type="url"
              class="form-control"
              placeholder="https://prezi.com/p/xxxxxx/ o https://docs.google.com/presentation/d/.../edit"
              formControlName="presentationUrl"
            />
            <span class="form-hint">Si pegas un enlace de Prezi o Google Slides, se incrustará de forma interactiva en la clase para los alumnos.</span>
          </div>

          <div class="modal-footer">
            <button type="button" (click)="closeLessonModal()" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="lessonForm.invalid || isSaving()">
              <span>{{ isSaving() ? 'Guardando...' : (isEditingLesson() ? 'Actualizar Clase' : 'Crear Clase') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DEDICATED PREZI / ONLINE PRESENTATION LINK -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showPreziModal()">
      <div class="modal-content glass-card animate-fade-in">
        <div class="modal-header">
          <div>
            <h3>🌀 Vincular Presentación de Prezi o Enlace Online</h3>
            <p class="modal-subtitle" *ngIf="selectedPreziLesson() as l">Clase: {{ l.title }}</p>
          </div>
          <button (click)="closePreziModal()" class="btn-close">&times;</button>
        </div>

        <div class="form-group">
          <label class="form-label" for="preziUrlInput">URL o Enlace de la Presentación Prezi *</label>
          <input
            id="preziUrlInput"
            type="url"
            class="form-control"
            placeholder="https://prezi.com/p/xxxxxx/ o https://prezi.com/view/xxxxxx/"
            [value]="preziInputUrl()"
            (input)="onPreziUrlChange($event)"
          />
          <span class="form-hint">Pega cualquier enlace público de Prezi (ej: <code>https://prezi.com/p/...</code> o <code>https://prezi.com/view/...</code>) o de Google Slides.</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="preziTitleInput">Nombre descriptivo de la presentación (Opcional)</label>
          <input
            id="preziTitleInput"
            type="text"
            class="form-control"
            placeholder="Ej: Presentación Interactiva Prezi"
            [value]="preziInputTitle()"
            (input)="onPreziTitleChange($event)"
          />
        </div>

        <div class="modal-footer">
          <button type="button" (click)="closePreziModal()" class="btn btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            (click)="savePreziLink()"
            class="btn btn-primary"
            [disabled]="!preziInputUrl().trim() || isSavingPrezi()"
          >
            <span>{{ isSavingPrezi() ? 'Guardando...' : 'Vincular Presentación Prezi' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: QUIZ QUESTIONS MANAGER (MULTIPLE CHOICE) -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showQuestionsModal()">
      <div class="modal-content glass-card animate-fade-in modal-extra-large">
        <div class="modal-header">
          <div>
            <h3>📝 Cuestionario de Evaluación: {{ activeLesson()?.title }}</h3>
            <p class="modal-subtitle">Configura las preguntas de opción múltiple y marca la respuesta correcta (umbral de aprobación: 80%)</p>
          </div>
          <button (click)="closeQuestionsModal()" class="btn-close">&times;</button>
        </div>

        <div class="questions-manager-body">
          <!-- Existing Questions List -->
          <div class="existing-questions-list">
            <h4>Preguntas Actuales ({{ activeQuestions().length }})</h4>

            <div *ngIf="activeQuestions().length === 0" class="empty-questions-notice">
              ⚠️ Esta clase aún no tiene preguntas de evaluación. Agrega preguntas abajo para activar el examen.
            </div>

            <div
              *ngFor="let q of activeQuestions(); let qIdx = index"
              class="admin-question-item"
            >
              <div class="q-header-row">
                <span class="q-badge">#{{ qIdx + 1 }}</span>
                <span class="q-text-bold">{{ q.questionText }}</span>
                <button (click)="deleteQuestion(q.id)" class="btn-delete-q" title="Eliminar Pregunta">
                  🗑️
                </button>
              </div>

              <div class="q-options-grid">
                <div
                  *ngFor="let opt of q.options; let optIdx = index"
                  class="q-opt-item"
                  [class.q-opt-correct]="optIdx === q.correctOptionIndex"
                >
                  <span class="opt-letter">{{ getOptionLetter(optIdx) }}.</span>
                  <span class="opt-text">{{ opt }}</span>
                  <span *ngIf="optIdx === q.correctOptionIndex" class="badge-correct-check">✓ Correcta</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Add New Question Form Box -->
          <div class="add-question-box">
            <h4>➕ Agregar Nueva Pregunta</h4>
            <form [formGroup]="questionForm" (ngSubmit)="addQuestion()">
              <div class="form-group">
                <label class="form-label" for="qText">Enunciado de la Pregunta *</label>
                <input
                  id="qText"
                  type="text"
                  class="form-control"
                  placeholder="Ej: ¿Qué decorador se usa para definir un módulo en NestJS?"
                  formControlName="questionText"
                />
              </div>

              <div class="options-inputs-list">
                <label class="form-label">Opciones de Respuesta y Selección de la Opción Correcta *</label>

                <div class="option-input-row" [class.option-row-selected]="questionForm.value.correctOptionIndex === 0">
                  <input
                    type="radio"
                    name="correctOptionIndex"
                    [value]="0"
                    formControlName="correctOptionIndex"
                    id="radio_0"
                  />
                  <label for="radio_0" class="radio-label">A</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Opción A..."
                    formControlName="optionA"
                  />
                </div>

                <div class="option-input-row" [class.option-row-selected]="questionForm.value.correctOptionIndex === 1">
                  <input
                    type="radio"
                    name="correctOptionIndex"
                    [value]="1"
                    formControlName="correctOptionIndex"
                    id="radio_1"
                  />
                  <label for="radio_1" class="radio-label">B</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Opción B..."
                    formControlName="optionB"
                  />
                </div>

                <div class="option-input-row" [class.option-row-selected]="questionForm.value.correctOptionIndex === 2">
                  <input
                    type="radio"
                    name="correctOptionIndex"
                    [value]="2"
                    formControlName="correctOptionIndex"
                    id="radio_2"
                  />
                  <label for="radio_2" class="radio-label">C</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Opción C..."
                    formControlName="optionC"
                  />
                </div>

                <div class="option-input-row" [class.option-row-selected]="questionForm.value.correctOptionIndex === 3">
                  <input
                    type="radio"
                    name="correctOptionIndex"
                    [value]="3"
                    formControlName="correctOptionIndex"
                    id="radio_3"
                  />
                  <label for="radio_3" class="radio-label">D</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Opción D..."
                    formControlName="optionD"
                  />
                </div>
              </div>

              <div class="q-add-actions">
                <button
                  type="submit"
                  class="btn btn-primary w-full"
                  [disabled]="questionForm.invalid || isSavingQuestion()"
                >
                  <span>{{ isSavingQuestion() ? 'Guardando...' : 'Guardar Pregunta' }}</span>
                </button>
              </div>
            </form>
    <!-- MODAL: LESSON STUDENTS PROGRESSION & MANUAL GRADING -->
    <div class="modal-backdrop animate-fade-in" *ngIf="showLessonStudentsModal()">
      <div class="modal-content glass-card animate-fade-in modal-large" *ngIf="activeLessonForStudents() as l">
        <div class="modal-header">
          <div>
            <h3>👥 Alumnos en la Clase: #{{ l.orderNumber }} {{ l.title }}</h3>
            <p class="modal-subtitle">Gestiona el progreso individual, revisa notas de examen o habilita el acceso manualmente.</p>
          </div>
          <button (click)="showLessonStudentsModal.set(false)" class="btn-close">&times;</button>
        </div>

        <div class="lesson-students-body">
          <div *ngIf="isLoadingLessonStudents()" class="loading-state">
            <div class="spinner-large"></div>
            <p>Cargando alumnos de esta clase...</p>
          </div>

          <div *ngIf="!isLoadingLessonStudents() && lessonStudentsList().length === 0" class="empty-state">
            <p>No hay alumnos matriculados en el curso.</p>
          </div>

          <div class="table-responsive" *ngIf="!isLoadingLessonStudents() && lessonStudentsList().length > 0">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado en esta Clase</th>
                  <th>Nota Quiz</th>
                  <th class="text-right">Acción del Profesor</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of lessonStudentsList()" class="table-row">
                  <td>
                    <div class="student-profile-cell">
                      <div class="student-avatar">{{ getInitials(s.name) }}</div>
                      <div class="student-meta">
                        <span class="student-name">{{ s.name }}</span>
                        <span class="student-email">{{ s.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      class="badge-status-pill"
                      [ngClass]="{
                        'status-pill-completed': s.status === 'COMPLETED',
                        'status-pill-available': s.status === 'AVAILABLE',
                        'status-pill-locked': s.status === 'LOCKED'
                      }"
                    >
                      {{ s.status === 'COMPLETED' ? '✓ Aprobada' : (s.status === 'AVAILABLE' ? 'En Curso / Disponible' : '🔒 Bloqueada') }}
                    </span>
                  </td>
                  <td>
                    <span *ngIf="s.score !== null" class="score-pill" [class.score-pass]="s.score >= 80">
                      {{ s.score }}%
                    </span>
                    <span *ngIf="s.score === null" class="score-none">-</span>
                  </td>
                  <td class="text-right">
                    <div class="table-actions">
                      <button
                        *ngIf="s.status !== 'COMPLETED'"
                        (click)="setStudentLessonStatus(l.id, s.studentId, 'COMPLETED', 100)"
                        class="btn-sub-action btn-approve"
                        title="Marcar clase como completada y desbloquear siguiente"
                      >
                        ✓ Aprobar (100%)
                      </button>
                      <button
                        *ngIf="s.status === 'LOCKED'"
                        (click)="setStudentLessonStatus(l.id, s.studentId, 'AVAILABLE')"
                        class="btn-sub-action btn-unlock"
                        title="Desbloquear clase para el alumno"
                      >
                        🔓 Habilitar
                      </button>
                      <button
                        *ngIf="s.status !== 'LOCKED'"
                        (click)="setStudentLessonStatus(l.id, s.studentId, 'LOCKED')"
                        class="btn-sub-action btn-lock"
                        title="Bloquear clase"
                      >
                        🔒 Bloquear
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="showLessonStudentsModal.set(false)" class="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-sub-action {
      padding: 5px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .btn-approve {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    .btn-approve:hover {
      background: rgba(16, 185, 129, 0.3);
      color: #fff;
    }

    .btn-unlock {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #818cf8;
    }

    .btn-unlock:hover {
      background: rgba(99, 102, 241, 0.3);
      color: #fff;
    }

    .btn-lock {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .btn-lock:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #fff;
    }

    .editor-page {
      padding: 32px 0 80px;
    }

    .editor-breadcrumb {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.88rem;
      margin-bottom: 24px;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .breadcrumb-link:hover {
      color: #fff;
    }

    .breadcrumb-separator {
      color: var(--text-muted);
    }

    .breadcrumb-current {
      color: var(--text-muted);
    }

    .course-header-card {
      padding: 32px 36px;
      margin-bottom: 28px;
      border: 1px solid rgba(139, 92, 246, 0.4);
    }

    .badge-role {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #c084fc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .course-header-card h1 {
      font-size: 2rem;
      margin-bottom: 8px;
    }

    .course-desc-full {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-bottom: 24px;
      max-width: 800px;
    }

    .meet-config-box {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 14px 20px;
      border-radius: var(--radius-md);
    }

    .meet-icon-badge {
      width: 40px;
      height: 40px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .meet-text-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .meet-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .meet-url-text {
      font-size: 0.95rem;
      font-weight: 600;
      color: #34d399;
      word-break: break-all;
    }

    .meet-url-none {
      font-size: 0.88rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 0.85rem;
    }

    /* Tabs Navigation */
    .admin-tabs-nav {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 12px;
    }

    .tab-btn {
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

    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }

    .tab-btn-active {
      background: rgba(139, 92, 246, 0.2) !important;
      border-color: #a855f7 !important;
      color: #fff !important;
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
    }

    /* Students Stats Grid */
    .students-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: var(--font-heading);
      line-height: 1.1;
    }

    .text-accent { color: #c084fc; }
    .text-primary { color: #818cf8; }
    .text-success { color: #34d399; }

    .stat-desc {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    /* Students Management Card */
    .students-management-card {
      padding: 32px;
    }

    .students-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .students-header-row h2 {
      font-size: 1.4rem;
      margin-bottom: 4px;
    }

    /* Admin Table */
    .table-responsive {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .admin-table th {
      padding: 14px 16px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-subtle);
      letter-spacing: 0.04em;
    }

    .admin-table td {
      padding: 16px;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    .student-profile-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      background: var(--accent-gradient);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 700;
      color: #fff;
    }

    .student-meta {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .student-email {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .date-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .student-progress-col {
      min-width: 180px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-numbers {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .progress-bold {
      font-weight: 700;
      color: var(--text-primary);
    }

    .progress-bar-sm {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill-sm {
      height: 100%;
      background: var(--accent-gradient);
      border-radius: var(--radius-full);
      transition: width 0.4s ease;
    }

    .fill-done {
      background: #10b981;
    }

    .badge-score {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #c084fc;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .badge-score-high {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .badge-score-none {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .table-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }

    .text-right {
      text-align: right;
    }

    /* Student Breakdown Modal */
    .student-breakdown-body {
      padding: 16px 0;
    }

    .breakdown-table-wrapper {
      max-height: 480px;
      overflow-y: auto;
    }

    .lesson-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lesson-num-pill {
      font-size: 0.75rem;
      font-weight: 700;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge-status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--radius-full);
    }

    .status-pill-completed {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .status-pill-available {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.35);
    }

    .status-pill-locked {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
    }

    .score-pill {
      font-weight: 700;
      color: #f87171;
    }

    .score-pass {
      color: #34d399;
    }

    .score-none {
      color: var(--text-muted);
    }

    /* Lessons Section */
    .lessons-management-section {
      margin-top: 24px;
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }

    .section-title-row h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .lesson-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .lesson-top-row {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .lesson-order-badge {
      width: 42px;
      height: 42px;
      background: var(--primary-light);
      border: 1px solid var(--primary);
      color: var(--primary);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .lesson-info {
      flex-grow: 1;
    }

    .lesson-title {
      font-size: 1.15rem;
      margin-bottom: 6px;
    }

    .lesson-meta-badges {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge-meet-pill {
      font-size: 0.72rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .badge-ppt-pill {
      font-size: 0.72rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .badge-questions-count {
      font-size: 0.72rem;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: #c084fc;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .lesson-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-ppt-upload-btn {
      background: rgba(245, 158, 11, 0.15) !important;
      border-color: rgba(245, 158, 11, 0.4) !important;
      color: #fbbf24 !important;
      cursor: pointer;
    }

    .btn-ppt-upload-btn:hover {
      background: rgba(245, 158, 11, 0.3) !important;
      color: #fff !important;
    }

    .ppt-attached-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    .btn-ppt-change {
      cursor: pointer;
      padding: 6px 10px;
    }

    .btn-quiz-manage {
      background: rgba(139, 92, 246, 0.15);
      border-color: rgba(139, 92, 246, 0.4);
      color: #c084fc;
    }

    .btn-quiz-manage:hover {
      background: rgba(139, 92, 246, 0.3);
      color: #fff;
    }

    .btn-icon {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.95rem;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-icon-delete:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
    }

    .lesson-content-preview {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
    }

    .preview-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--text-muted);
      display: block;
      margin-bottom: 6px;
    }

    .preview-box {
      font-size: 0.88rem;
      color: var(--text-secondary);
      max-height: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 32px;
      background: rgba(18, 24, 38, 0.96);
      border: 1px solid rgba(139, 92, 246, 0.4);
    }

    .modal-large {
      max-width: 760px;
    }

    .modal-extra-large {
      max-width: 960px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .modal-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .form-group-row {
      display: flex;
      gap: 16px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .font-mono {
      font-family: monospace;
      font-size: 0.88rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 28px;
    }

    .form-hint {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .loading-state {
      text-align: center;
      padding: 60px 0;
      color: var(--text-secondary);
    }

    .spinner-large {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(139, 92, 246, 0.2);
      border-top-color: #a855f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Questions Manager Body */
    .questions-manager-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }

    .existing-questions-list {
      max-height: 520px;
      overflow-y: auto;
      padding-right: 8px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .empty-questions-notice {
      padding: 16px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
    }

    .admin-question-item {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 16px;
    }

    .q-header-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }

    .q-badge {
      font-size: 0.78rem;
      font-weight: 700;
      color: #c084fc;
      background: rgba(139, 92, 246, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .q-text-bold {
      font-size: 0.92rem;
      font-weight: 600;
      flex-grow: 1;
    }

    .btn-delete-q {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.95rem;
      opacity: 0.7;
    }

    .btn-delete-q:hover {
      opacity: 1;
    }

    .q-options-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .q-opt-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 0.82rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
    }

    .q-opt-correct {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-weight: 600;
    }

    .opt-letter {
      font-weight: 700;
    }

    .opt-text {
      flex-grow: 1;
    }

    .badge-correct-check {
      font-size: 0.7rem;
      background: #10b981;
      color: #fff;
      padding: 2px 6px;
      border-radius: var(--radius-full);
    }

    /* Add Question Box */
    .add-question-box {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-md);
      padding: 20px;
    }

    .add-question-box h4 {
      font-size: 1.1rem;
      margin-bottom: 16px;
    }

    .options-inputs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .option-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .option-row-selected {
      background: rgba(16, 185, 129, 0.1) !important;
      border-color: rgba(16, 185, 129, 0.4) !important;
    }

    .radio-label {
      font-weight: 700;
      font-size: 0.9rem;
      color: #c084fc;
      min-width: 16px;
      cursor: pointer;
    }

    .option-row-selected .radio-label {
      color: #34d399;
    }

    .w-full { width: 100%; }

    @media (max-width: 900px) {
      .questions-manager-body {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminCourseEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
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
  readonly showEnrollModal = signal(false);
  readonly isEnrolling = signal(false);
  readonly showStudentProgressModal = signal(false);
  readonly selectedStudentReport = signal<StudentCourseProgressReport | null>(null);

  readonly enrollForm = this.fb.group({
    emailOrUserId: ['', [Validators.required]],
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
  readonly lessonForm = this.fb.group({
    title: ['', [Validators.required]],
    content: ['', [Validators.required]],
    orderNumber: [null],
    meetUrl: [''],
    presentationUrl: [''],
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
    this.adminService.getCourseStudents(courseId).subscribe({
      next: (data) => {
        this.enrolledStudents.set(data);
        this.isLoadingStudents.set(false);
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

  openEnrollModal(): void {
    this.enrollForm.reset();
    this.showEnrollModal.set(true);
    this.adminService.getAllStudents().subscribe({
      next: (students) => {
        this.allPlatformStudents.set(students);
      },
    });
  }

  onSelectStudentDropdown(event: any): void {
    const selectedEmail = event.target.value;
    if (selectedEmail) {
      this.enrollForm.patchValue({ emailOrUserId: selectedEmail });
    }
  }

  submitEnrollStudent(): void {
    const c = this.course();
    if (!c || this.enrollForm.invalid) return;

    this.isEnrolling.set(true);
    const emailOrUserId = this.enrollForm.value.emailOrUserId!;

    this.adminService.enrollStudent(c.id, emailOrUserId).subscribe({
      next: () => {
        this.isEnrolling.set(false);
        this.showEnrollModal.set(false);
        this.loadEnrolledStudents(c.id);
      },
      error: (err) => {
        this.isEnrolling.set(false);
        alert('Error al matricular alumno: ' + (err.error?.message || 'Verifica el correo'));
      },
    });
  }

  unenrollStudent(student: EnrolledStudentReport): void {
    if (!confirm(`¿Estás seguro de desmatricular a "${student.name}" de este curso?`)) {
      return;
    }
    const c = this.course();
    if (!c) return;

    this.adminService.unenrollStudent(c.id, student.studentId).subscribe({
      next: () => {
        this.loadEnrolledStudents(c.id);
      },
      error: (err) => {
        alert('Error al desmatricular alumno: ' + (err.error?.message || 'Error'));
      },
    });
  }

  viewStudentProgress(student: EnrolledStudentReport): void {
    const c = this.course();
    if (!c) return;

    this.adminService.getStudentCourseProgress(c.id, student.studentId).subscribe({
      next: (report) => {
        this.selectedStudentReport.set(report);
        this.showStudentProgressModal.set(true);
      },
      error: (err) => {
        alert('Error al cargar progreso del alumno: ' + (err.error?.message || 'Error'));
      },
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

  openCreateLessonModal(): void {
    this.isEditingLesson.set(false);
    this.currentEditingLessonId.set(null);
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
    this.lessonForm.patchValue({
      title: lesson.title,
      content: lesson.content,
      orderNumber: lesson.orderNumber,
      meetUrl: lesson.meetUrl || '',
      presentationUrl: lesson.presentationUrl || '',
    });
    this.showLessonModal.set(true);
  }

  closeLessonModal(): void {
    this.showLessonModal.set(false);
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
    };

    if (this.isEditingLesson() && this.currentEditingLessonId()) {
      this.adminService.updateLesson(this.currentEditingLessonId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeLessonModal();
          this.loadCourse(c.id);
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Error al actualizar la clase: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    } else {
      this.adminService.createLesson(c.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeLessonModal();
          this.loadCourse(c.id);
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
    this.questionForm.reset({ correctOptionIndex: 0 });
    this.loadQuestions(lesson.id);
  }

  closeQuestionsModal(): void {
    this.showQuestionsModal.set(false);
    this.activeLesson.set(null);
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

  addQuestion(): void {
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
    score?: number,
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
}
