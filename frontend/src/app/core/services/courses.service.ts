import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseSummary, CourseDetail, LessonDetail } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CoursesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getCourses(): Observable<CourseSummary[]> {
    return this.http.get<CourseSummary[]>(`${this.apiUrl}/courses`);
  }

  getCourseById(courseId: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${this.apiUrl}/courses/${courseId}`);
  }

  getLessonById(lessonId: string): Observable<LessonDetail> {
    return this.http.get<LessonDetail>(`${this.apiUrl}/lessons/${lessonId}`);
  }
}
