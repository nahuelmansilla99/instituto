import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models';

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class SysadminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getUsers(page: number = 1, limit: number = 10): Observable<PaginatedUsers> {
    return this.http.get<PaginatedUsers>(`${this.apiUrl}/users?page=${page}&limit=${limit}`);
  }

  updateRole(userId: string, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  resetPassword(userId: string, password: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/users/${userId}/password`, { password });
  }

  deactivateUser(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${userId}/deactivate`, {});
  }

  reactivateUser(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${userId}/reactivate`, {});
  }
}
