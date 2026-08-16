import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QuizAnswerSubmission, QuizEvaluationResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  submitQuiz(
    lessonId: string,
    answers: QuizAnswerSubmission[],
  ): Observable<QuizEvaluationResponse> {
    return this.http.post<QuizEvaluationResponse>(
      `${this.apiUrl}/lessons/${lessonId}/quiz/submit`,
      { answers },
    );
  }
}
