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
        <!-- TAB 1: CLASES, EXCEL Y EXÁMENES                      -->
        <!-- ==================================================== -->
        <div *ngIf="activeTab() === 'content'" class="tab-content-pane animate-fade-in">
          <!-- EXCEL IMPORT & EXPORT SUITE -->
          <section class="excel-import-section glass-card">
            <div class="excel-content">
              <div class="excel-info">
                <div class="excel-badge-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h3>Subida Masiva con Archivos Excel (.xlsx / .csv)</h3>
                  <p>Importa múltiples clases, contenidos y preguntas de examen con sus respuestas correctas en un solo clic.</p>
                </div>
              </div>

              <div class="excel-actions">
                <button (click)="downloadTemplate()" class="btn btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Descargar Plantilla Excel</span>
                </button>

                <label class="btn btn-primary btn-upload-label">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    (change)="onExcelFileSelected($event)"
                    class="file-input-hidden"
                    [disabled]="isUploadingExcel()"
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>{{ isUploadingExcel() ? 'Procesando Excel...' : 'Subir Archivo Excel' }}</span>
                </label>
              </div>
            </div>

            <div *ngIf="uploadSuccessMessage()" class="alert-success-box animate-fade-in">
              <span>✅ {{ uploadSuccessMessage() }}</span>
            </div>
          </section>

          <!-- LESSONS & QUIZ QUESTIONS MANAGEMENT -->
          <section class="lessons-management-section">
            <div class="section-title-row">
              <div>
                <h2>Clases del Curso ({{ c.lessons.length }})</h2>
                <p class="section-desc">Administra el temario, redacta el contenido y configura los exámenes de opción múltiple</p>
              </div>
              <button (click)="openCreateLessonModal()" class="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Agregar Clase Manualmente</span>
              </button>
            </div>

            <!-- Empty Lessons State -->
            <div *ngIf="c.lessons.length === 0" class="empty-state glass-card">
              <div class="empty-icon">📂</div>
              <h3>No hay clases creadas en este curso</h3>
              <p>Puedes agregar clases manualmente o importar un archivo Excel usando los botones de arriba.</p>
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
                    <!-- Upload or Manage PowerPoint -->
                    <label *ngIf="!lesson.presentationUrl" class="btn btn-secondary btn-sm btn-ppt-upload-btn" title="Subir archivo de PowerPoint (.pptx, .ppt, .pdf)">
                      <input
                        type="file"
                        accept=".pptx, .ppt, .pdf, .odp"
                        (change)="onPresentationFileSelected($event, lesson)"
                        class="file-input-hidden"
                      />
                      <span>📊 Subir PowerPoint</span>
                    </label>

                    <div *ngIf="lesson.presentationUrl" class="ppt-attached-group">
                      <a [href]="lesson.presentationUrl" target="_blank" class="btn btn-secondary btn-sm" title="Descargar / Ver presentación">
                        📥 PPT
                      </a>
                      <label class="btn btn-secondary btn-sm btn-ppt-change" title="Reemplazar archivo de PowerPoint">
                        <input
                          type="file"
                          accept=".pptx, .ppt, .pdf, .odp"
                          (change)="onPresentationFileSelected($event, lesson)"
                          class="file-input-hidden"
                        />
                        <span>🔄 Cambiar</span>
                      </label>
                      <button (click)="removePresentation(lesson)" class="btn-icon btn-icon-delete" title="Quitar archivo de PowerPoint">
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

          <div class="modal-footer">
            <button type="button" (click)="closeLessonModal()" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="lessonForm.invalid || isSaving()">
              <span>{{ isSaving() ? 'Guardando...' : (isEditingLesson() ? 'Actualizar Clase' : 'Crear Clase') }}</span>
            </button>
          </div>
        </form>
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
      padding: 4px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }

    .btn-approve {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #16a34a;
    }

    .btn-approve:hover {
      background: #dcfce7;
    }

    .btn-unlock {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .btn-unlock:hover {
      background: #e2e8f0;
    }

    .btn-lock {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    .btn-lock:hover {
      background: #fee2e2;
      color: #b91c1c;
    }

    .editor-page {
      padding: 28px 0 64px;
      background-color: var(--bg-main);
    }

    .editor-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      margin-bottom: 20px;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--text-secondary);
      font-weight: 500;
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

    .course-header-card {
      padding: 28px 32px;
      margin-bottom: 24px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .badge-role {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .course-header-card h1 {
      font-size: 1.75rem;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .course-desc-full {
      color: var(--text-secondary);
      font-size: 0.92rem;
      margin-bottom: 20px;
      max-width: 800px;
    }

    .meet-config-box {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px 18px;
      border-radius: var(--radius-sm);
    }

    .meet-icon-badge {
      width: 36px;
      height: 36px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
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
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .meet-url-text {
      font-size: 0.88rem;
      font-weight: 600;
      color: #16a34a;
      word-break: break-all;
    }

    .meet-url-none {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.82rem;
    }

    /* Tabs Navigation */
    .admin-tabs-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
    }

    .tab-btn {
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

    .tab-btn:hover {
      color: #0f172a;
      background: #f8fafc;
    }

    .tab-btn-active {
      background: #0f172a !important;
      border-color: #0f172a !important;
      color: #ffffff !important;
    }

    /* Students Stats Grid */
    .students-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .stat-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      font-family: var(--font-heading);
      line-height: 1.1;
      color: #0f172a;
    }

    .text-accent { color: #0f172a; }
    .text-primary { color: #0f172a; }
    .text-success { color: #16a34a; }

    .stat-desc {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    /* Students Management Card */
    .students-management-card {
      padding: 24px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .students-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 14px;
      flex-wrap: wrap;
    }

    .students-header-row h2 {
      font-size: 1.25rem;
      margin-bottom: 2px;
      color: #0f172a;
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
      padding: 12px 14px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-subtle);
      background: #f8fafc;
      letter-spacing: 0.04em;
    }

    .admin-table td {
      padding: 14px;
      font-size: 0.88rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #334155;
    }

    .student-profile-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .student-avatar {
      width: 32px;
      height: 32px;
      background: #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: #0f172a;
    }

    .student-meta {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-weight: 600;
      color: #0f172a;
    }

    .student-email {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .date-text {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    .student-progress-col {
      min-width: 160px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .progress-numbers {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .progress-bold {
      font-weight: 700;
      color: #0f172a;
    }

    .progress-bar-sm {
      width: 100%;
      height: 5px;
      background: #f1f5f9;
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill-sm {
      height: 100%;
      background: #0f172a;
      border-radius: var(--radius-full);
      transition: width 0.4s ease;
    }

    .fill-done {
      background: #16a34a;
    }

    .badge-score {
      display: inline-block;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .badge-score-high {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #16a34a;
    }

    .badge-score-none {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .table-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
    }

    .text-right {
      text-align: right;
    }

    /* Student Breakdown Modal */
    .student-breakdown-body {
      padding: 12px 0;
    }

    .breakdown-table-wrapper {
      max-height: 440px;
      overflow-y: auto;
    }

    .lesson-name-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .lesson-num-pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 3px;
    }

    .badge-status-pill {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }

    .status-pill-completed {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }

    .status-pill-available {
      background: #f1f5f9;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }

    .status-pill-locked {
      background: #f8fafc;
      color: var(--text-muted);
    }

    .score-pill {
      font-weight: 700;
      color: #dc2626;
    }

    .score-pass {
      color: #16a34a;
    }

    .score-none {
      color: var(--text-muted);
    }

    /* Excel Section */
    .excel-import-section {
      padding: 24px;
      margin-bottom: 32px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .excel-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .excel-info {
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: 600px;
    }

    .excel-badge-icon {
      width: 42px;
      height: 42px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .excel-info h3 {
      font-size: 1.05rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .excel-info p {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .excel-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-upload-label {
      position: relative;
      cursor: pointer;
      overflow: hidden;
      margin: 0;
    }

    .file-input-hidden {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .alert-success-box {
      margin-top: 14px;
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
    }

    /* Lessons Section */
    .lessons-management-section {
      margin-top: 20px;
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 14px;
    }

    .section-title-row h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      background: #ffffff;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .lesson-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .lesson-top-row {
      display: flex;
      align-items: center;
      gap: 14px;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .lesson-order-badge {
      width: 36px;
      height: 36px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .lesson-info {
      flex-grow: 1;
    }

    .lesson-title {
      font-size: 1.05rem;
      margin-bottom: 4px;
      color: #0f172a;
    }

    .lesson-meta-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-meet-pill {
      font-size: 0.7rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }

    .badge-ppt-pill {
      font-size: 0.7rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      font-weight: 600;
    }

    .badge-questions-count {
      font-size: 0.7rem;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }

    .lesson-actions-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .btn-ppt-upload-btn {
      background: #fffbeb !important;
      border-color: #fde68a !important;
      color: #b45309 !important;
      font-size: 0.8rem;
      padding: 6px 10px;
      cursor: pointer;
    }

    .btn-ppt-upload-btn:hover {
      background: #fef3c7 !important;
    }

    .ppt-attached-group {
      display: flex;
      align-items: center;
      gap: 3px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 2px 5px;
      border-radius: var(--radius-sm);
    }

    .btn-ppt-change {
      cursor: pointer;
      padding: 4px 8px;
      font-size: 0.75rem;
    }

    .btn-quiz-manage {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
      font-size: 0.8rem;
      padding: 6px 10px;
    }

    .btn-quiz-manage:hover {
      background: #f1f5f9;
    }

    .btn-icon {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.88rem;
      color: #334155;
    }

    .btn-icon:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    .btn-icon-delete:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    .lesson-content-preview {
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
    }

    .preview-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-muted);
      display: block;
      margin-bottom: 4px;
    }

    .preview-box {
      font-size: 0.85rem;
      color: var(--text-secondary);
      max-height: 70px;
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
      background: rgba(15, 23, 42, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
    }

    .modal-large {
      max-width: 720px;
    }

    .modal-extra-large {
      max-width: 900px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .modal-header h3 {
      font-size: 1.2rem;
      color: #0f172a;
    }

    .modal-subtitle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-top: 2px;
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

    .form-group-row {
      display: flex;
      gap: 14px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .font-mono {
      font-family: monospace;
      font-size: 0.85rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
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

    /* Questions Manager Body */
    .questions-manager-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .existing-questions-list {
      max-height: 480px;
      overflow-y: auto;
      padding-right: 6px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-questions-notice {
      padding: 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
    }

    .admin-question-item {
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
    }

    .q-header-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }

    .q-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #0f172a;
      background: #e2e8f0;
      padding: 2px 5px;
      border-radius: 3px;
    }

    .q-text-bold {
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
      flex-grow: 1;
    }

    .btn-delete-q {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      opacity: 0.6;
    }

    .btn-delete-q:hover {
      opacity: 1;
    }

    .q-options-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .q-opt-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 3px;
      font-size: 0.8rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    .q-opt-correct {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #15803d;
      font-weight: 600;
    }

    .opt-letter {
      font-weight: 700;
    }

    .opt-text {
      flex-grow: 1;
    }

    .badge-correct-check {
      font-size: 0.68rem;
      background: #16a34a;
      color: #ffffff;
      padding: 1px 5px;
      border-radius: var(--radius-sm);
    }

    /* Add Question Box */
    .add-question-box {
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 18px;
    }

    .add-question-box h4 {
      font-size: 1rem;
      margin-bottom: 14px;
      color: #0f172a;
    }

    .options-inputs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .option-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      transition: all 0.15s;
    }

    .option-row-selected {
      background: #f0fdf4 !important;
      border-color: #bbf7d0 !important;
    }

    .radio-label {
      font-weight: 700;
      font-size: 0.85rem;
      color: #475569;
      min-width: 14px;
      cursor: pointer;
    }

    .option-row-selected .radio-label {
      color: #16a34a;
    }

    .w-full { width: 100%; }

    @media (max-width: 860px) {
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
  readonly isUploadingExcel = signal(false);
  readonly uploadSuccessMessage = signal<string | null>(null);

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
  });

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
  // EXCEL IMPORT & EXPORT
  // ----------------------------------------------------
  downloadTemplate(): void {
    this.adminService.downloadExcelTemplate();
  }

  onExcelFileSelected(event: any): void {
    const file = event.target.files?.[0];
    const c = this.course();
    if (!file || !c) return;

    this.isUploadingExcel.set(true);
    this.uploadSuccessMessage.set(null);

    this.adminService.uploadExcel(c.id, file).subscribe({
      next: (res) => {
        this.isUploadingExcel.set(false);
        this.uploadSuccessMessage.set(
          `Archivo procesado con éxito: ${res.lessonsCreated} clases y ${res.questionsCreated} preguntas importadas/actualizadas.`,
        );
        this.loadCourse(c.id);
      },
      error: (err) => {
        this.isUploadingExcel.set(false);
        alert('Error al procesar el archivo Excel: ' + (err.error?.message || 'Verifica el formato'));
      },
    });
  }

  // ----------------------------------------------------
  // LESSON MANAGEMENT
  // ----------------------------------------------------
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
  // GESTIÓN DE PRESENTACIONES POWERPOINT
  // ----------------------------------------------------
  onPresentationFileSelected(event: any, lesson: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const c = this.course();
    if (!c) return;

    this.adminService.uploadLessonPresentation(lesson.id, file).subscribe({
      next: () => {
        this.uploadSuccessMessage.set(`Presentación subida correctamente a "${lesson.title}"`);
        setTimeout(() => this.uploadSuccessMessage.set(null), 4000);
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
