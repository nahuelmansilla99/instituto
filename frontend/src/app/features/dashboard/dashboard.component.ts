import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CoursesService } from '../../core/services/courses.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { CourseSummary } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly coursesService = inject(CoursesService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly courses = signal<CourseSummary[]>([]);
  readonly isLoading = signal(true);

  // Create Course Modal (Teacher)
  readonly showCreateModal = signal(false);
  readonly isSavingCourse = signal(false);

  readonly courseForm = this.fb.group({
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

  getTotalCompletedLessons(): number {
    return this.courses().reduce((sum, c) => sum + (c.completedLessons || 0), 0);
  }

  getTotalLessons(): number {
    return this.courses().reduce((sum, c) => sum + (c.totalLessons || 0), 0);
  }

  openCourse(courseId: string): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/courses', courseId]);
    } else {
      this.router.navigate(['/courses', courseId]);
    }
  }

  openCreateModal(): void {
    this.courseForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;

    this.isSavingCourse.set(true);
    const formVal = this.courseForm.value;

    this.adminService
      .createCourse({
        title: formVal.title!,
        description: formVal.description!,
        thumbnailUrl: formVal.thumbnailUrl || undefined,
        meetUrl: formVal.meetUrl || undefined,
      })
      .subscribe({
        next: (created) => {
          this.isSavingCourse.set(false);
          this.closeCreateModal();
          this.loadCourses();
          if (created && created.id) {
            this.router.navigate(['/admin/courses', created.id]);
          }
        },
        error: (err) => {
          this.isSavingCourse.set(false);
          alert(err.error?.message || 'Error al crear el curso');
        },
      });
  }
}
