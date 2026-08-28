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

  updateLessonProgress(lessonId: string, data: { hasViewedContent?: boolean; hasViewedSheets?: boolean; hasViewedDocs?: boolean }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/lessons/${lessonId}/progress`, data);
  }

  getStudentProgress(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/progress/${userId}`);
  }

  downloadTechnicalSheet(filename: string): Observable<Blob> {
    const url = filename.startsWith('http') 
      ? filename 
      : `${this.apiUrl}/lessons/downloads/technical-sheets/${filename}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadLessonDocument(filename: string): Observable<Blob> {
    const url = filename.startsWith('http') 
      ? filename 
      : `${this.apiUrl}/lessons/downloads/lesson-documents/${filename}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
