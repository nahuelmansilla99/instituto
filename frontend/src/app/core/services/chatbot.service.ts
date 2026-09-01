import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt?: string | Date;
}

export interface ChatQuota {
  used: number;
  max: number;
  remaining: number;
}

export interface ChatResponse {
  reply: string;
  remainingQuota: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getQuota(courseId: string): Observable<ChatQuota> {
    return this.http.get<ChatQuota>(`${this.apiUrl}/courses/${courseId}/tutor/quota`);
  }

  getHistory(courseId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/courses/${courseId}/tutor/history`);
  }

  askTutor(courseId: string, question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/courses/${courseId}/tutor/chat`, { question });
  }
}
