import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id?: string;
  conversationId?: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt?: string | Date;
}

export interface ChatConversation {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChatQuota {
  used: number;
  max: number;
  remaining: number;
}

export interface ChatResponse {
  reply: string;
  remainingQuota: number;
  conversationId: string;
  conversationTitle: string;
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

  getConversations(courseId: string, search?: string): Observable<ChatConversation[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ChatConversation[]>(`${this.apiUrl}/courses/${courseId}/tutor/conversations`, { params });
  }

  getConversationMessages(courseId: string, conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/courses/${courseId}/tutor/conversations/${conversationId}/messages`);
  }

  deleteConversation(courseId: string, conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/courses/${courseId}/tutor/conversations/${conversationId}`);
  }

  getHistory(courseId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/courses/${courseId}/tutor/history`);
  }

  askTutor(courseId: string, question: string, conversationId?: string): Observable<ChatResponse> {
    const payload: { question: string; conversationId?: string } = { question };
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    return this.http.post<ChatResponse>(`${this.apiUrl}/courses/${courseId}/tutor/chat`, payload);
  }
}

