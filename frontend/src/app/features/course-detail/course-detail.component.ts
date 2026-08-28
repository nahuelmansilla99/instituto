import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CoursesService } from '../../core/services/courses.service';
import { AuthService } from '../../core/services/auth.service';
import { CourseDetail, CourseLessonItem } from '../../core/models';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css',
})
export class CourseDetailComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);

  readonly course = signal<CourseDetail | null>(null);
  readonly isLoading = signal(true);
  readonly activeTab = signal<'temario' | 'materiales'>('temario');

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
    this.router.navigate(['/lessons', lessonId]);
  }

  startExam(lessonId: string): void {
    this.router.navigate(['/lessons', lessonId], {
      queryParams: { action: 'start-quiz' },
    });
  }

  isPreziUrl(url?: string | null): boolean {
    return !!url && url.toLowerCase().includes('prezi.com');
  }

  openLessonPresentation(lessonId: string): void {
    this.router.navigate(['/lessons', lessonId], {
      queryParams: { view: 'presentation' },
    });
  }

  isFutureDate(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    return new Date() < new Date(dateStr);
  }

  downloadTechnicalSheet(sheet: any): void {
    this.coursesService.downloadTechnicalSheet(sheet.fileUrl).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sheet.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('No se pudo descargar el archivo.');
      }
    });
  }

  hasAnyTechnicalSheets(): boolean {
    const c = this.course();
    if (!c || !c.lessons) return false;
    return c.lessons.some(l => l.technicalSheets && l.technicalSheets.length > 0);
  }
}
