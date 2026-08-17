import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { CoursesService } from '../../../core/services/courses.service';
import { CourseSummary } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly coursesService = inject(CoursesService);
  private readonly fb = inject(FormBuilder);

  readonly courses = signal<CourseSummary[]>([]);
  readonly isLoading = signal(true);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly currentEditingId = signal<string | null>(null);

  readonly courseForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
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
      thumbnailUrl: course.thumbnailUrl || '',
      meetUrl: course.meetUrl || '',
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.courseForm.reset();
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;

    this.isSaving.set(true);
    const formValue = this.courseForm.value;

    if (this.isEditing() && this.currentEditingId()) {
      this.adminService.updateCourse(this.currentEditingId()!, formValue).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadCourses();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Error al actualizar el curso: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    } else {
      this.adminService.createCourse(formValue).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadCourses();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Error al crear el curso: ' + (err.error?.message || 'Error desconocido'));
        },
      });
    }
  }

  deleteCourse(course: CourseSummary): void {
    if (!confirm(`¿Estás seguro de eliminar el curso "${course.title}" y todas sus clases?`)) {
      return;
    }

    this.adminService.deleteCourse(course.id).subscribe({
      next: () => {
        this.loadCourses();
      },
      error: (err) => {
        alert('Error al eliminar curso: ' + (err.error?.message || 'Error desconocido'));
      },
    });
  }
}
