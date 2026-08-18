import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseDetail, CourseLessonItem, AdminQuizQuestion, StudentSummary, EnrolledStudentReport, StudentCourseProgressReport } from '../models';

export interface AdminCourseDetail extends CourseDetail {
  lessons: (CourseLessonItem & {
    content?: string;
    questions?: AdminQuizQuestion[];
  })[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Cursos
  createCourse(data: {
    title: string;
    description: string;
    thumbnailUrl?: string;
    meetUrl?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/courses`, data);
  }

  getCourseAdmin(courseId: string): Observable<AdminCourseDetail> {
    return this.http.get<AdminCourseDetail>(`${this.apiUrl}/admin/courses/${courseId}`);
  }

  updateCourse(
    courseId: string,
    data: Partial<{
      title: string;
      description: string;
      thumbnailUrl?: string;
      meetUrl?: string;
    }>,
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/courses/${courseId}`, data);
  }

  deleteCourse(courseId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/admin/courses/${courseId}`);
  }

  // Lecciones
  createLesson(
    courseId: string,
    data: {
      title: string;
      content: string;
      orderNumber?: number;
      meetUrl?: string;
      presentationUrl?: string;
      presentationFilename?: string;
      availableAt?: string | null;
    },
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/courses/${courseId}/lessons`, data);
  }

  updateLesson(
    lessonId: string,
    data: Partial<{
      title: string;
      content: string;
      orderNumber?: number;
      meetUrl?: string;
      presentationUrl?: string;
      presentationFilename?: string;
      availableAt?: string | null;
    }>,
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/lessons/${lessonId}`, data);
  }

  deleteLesson(lessonId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/admin/lessons/${lessonId}`);
  }

  // Presentaciones PowerPoint (.pptx, .ppt, .pdf)
  uploadLessonPresentation(lessonId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/admin/lessons/${lessonId}/presentation`, formData);
  }

  deleteLessonPresentation(lessonId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/lessons/${lessonId}/presentation`);
  }

  // Preguntas de Cuestionario
  getQuestions(lessonId: string): Observable<AdminQuizQuestion[]> {
    return this.http.get<AdminQuizQuestion[]>(`${this.apiUrl}/admin/lessons/${lessonId}/questions`);
  }

  createQuestion(
    lessonId: string,
    data: {
      questionText: string;
      options: string[];
      correctOptionIndex: number;
    },
  ): Observable<AdminQuizQuestion> {
    return this.http.post<AdminQuizQuestion>(
      `${this.apiUrl}/admin/lessons/${lessonId}/questions`,
      data,
    );
  }

  updateQuestion(
    questionId: string,
    data: Partial<{
      questionText: string;
      options: string[];
      correctOptionIndex: number;
    }>,
  ): Observable<AdminQuizQuestion> {
    return this.http.put<AdminQuizQuestion>(
      `${this.apiUrl}/admin/questions/${questionId}`,
      data,
    );
  }

  deleteQuestion(questionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/admin/questions/${questionId}`,
    );
  }



  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS (MATRÍCULAS Y SEGUIMIENTO)
  // ----------------------------------------------------
  getAllStudents(): Observable<StudentSummary[]> {
    return this.http.get<StudentSummary[]>(`${this.apiUrl}/admin/students`);
  }

  getCourseStudents(courseId: string): Observable<EnrolledStudentReport[]> {
    return this.http.get<EnrolledStudentReport[]>(`${this.apiUrl}/admin/courses/${courseId}/students`);
  }

  enrollStudent(courseId: string, emailOrUserId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/courses/${courseId}/students`, {
      emailOrUserId,
    });
  }

  unenrollStudent(courseId: string, studentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/admin/courses/${courseId}/students/${studentId}`,
    );
  }

  getStudentCourseProgress(
    courseId: string,
    studentId: string,
  ): Observable<StudentCourseProgressReport> {
    return this.http.get<StudentCourseProgressReport>(
      `${this.apiUrl}/admin/courses/${courseId}/students/${studentId}/progress`,
    );
  }

  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CLASE
  // ----------------------------------------------------
  getLessonStudents(lessonId: string): Observable<{
    lesson: { id: string; courseId: string; title: string; orderNumber: number };
    students: {
      studentId: string;
      name: string;
      email: string;
      status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
      score: number | null;
      completedAt: string | null;
    }[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/admin/lessons/${lessonId}/students`);
  }

  updateLessonStudentProgress(
    lessonId: string,
    studentId: string,
    status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED',
    score?: number,
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/lessons/${lessonId}/students/${studentId}`, {
      status,
      score,
    });
  }
}
