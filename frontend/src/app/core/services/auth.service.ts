import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, UserRole } from '../models';
import { SocialAuthService } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly socialAuthService = inject(SocialAuthService);
  private readonly apiUrl = environment.apiUrl;

  private currentUserSignal = signal<User | null>(this.getUserFromStorage());
  private simulatedRoleSignal = signal<UserRole | null>(localStorage.getItem('simulated_role') as UserRole || null);

  readonly simulatedRole = this.simulatedRoleSignal.asReadonly();

  readonly currentUser = computed(() => {
    const user = this.currentUserSignal();
    if (!user) return null;

    const sim = this.simulatedRoleSignal();
    if (sim) {
      if (user.role === UserRole.SYSADMIN && (sim === UserRole.ADMIN || sim === UserRole.STUDENT)) {
        return { ...user, role: sim };
      }
      if (user.role === UserRole.ADMIN && sim === UserRole.STUDENT) {
        return { ...user, role: sim };
      }
    }
    return user;
  });

  readonly isRealSysadmin = computed(() => this.currentUserSignal()?.role === UserRole.SYSADMIN);
  readonly isRealAdmin = computed(() => this.currentUserSignal()?.role === UserRole.ADMIN);

  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    return user ? (user.role === 'ADMIN' || user.role === 'SYSADMIN') : false;
  });

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((res) => this.handleAuthSuccess(res)),
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, data).pipe(
      tap((res) => this.handleAuthSuccess(res)),
    );
  }

  loginWithGoogle(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token }).pipe(
      tap((res) => this.handleAuthSuccess(res)),
    );
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('simulated_role');
    this.currentUserSignal.set(null);
    this.simulatedRoleSignal.set(null);
    
    // Attempt to sign out from Google as well so it doesn't auto-login next time
    try {
      await this.socialAuthService.signOut();
    } catch (e) {
      // Ignore error if user wasn't logged in with Google
    }

    // Force a full page reload to clear Google Identity Services internal state
    // and avoid the 403 Forbidden iframe error when re-rendering the button.
    window.location.href = '/login';
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    this.updateUser(response.user);
  }

  updateUser(user: User): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  setSimulatedRole(role: UserRole | null): void {
    const realUser = this.currentUserSignal();
    if (!realUser) return;

    if (role) {
      const isAllowed = 
        (realUser.role === UserRole.SYSADMIN && (role === UserRole.ADMIN || role === UserRole.STUDENT)) ||
        (realUser.role === UserRole.ADMIN && role === UserRole.STUDENT);

      if (isAllowed) {
        localStorage.setItem('simulated_role', role);
        this.simulatedRoleSignal.set(role);
        return;
      }
    }

    localStorage.removeItem('simulated_role');
    this.simulatedRoleSignal.set(null);
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem('auth_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }
}
