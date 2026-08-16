import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card glass-card animate-fade-in">
        <!-- Header -->
        <div class="auth-header">
          <div class="auth-logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h2>Iniciar Sesión</h2>
          <p>Ingresa a tu cuenta para continuar tus clases</p>
        </div>

        <!-- Quick Demo Credentials Fill -->
        <div class="demo-box">
          <span class="demo-title">Acceso rápido de prueba:</span>
          <div class="demo-buttons">
            <button type="button" (click)="fillCredentials('alumno@instituto.com', 'student123')" class="demo-btn">
              Alumno Demo
            </button>
            <button type="button" (click)="fillCredentials('admin@instituto.com', 'admin123')" class="demo-btn">
              Profesor Demo
            </button>
          </div>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage()" class="alert-error animate-fade-in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              class="form-control"
              placeholder="tu.email@instituto.com"
              formControlName="email"
            />
            <div *ngIf="isFieldInvalid('email')" class="form-error">
              Ingresa un correo electrónico válido
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              class="form-control"
              placeholder="••••••••"
              formControlName="password"
            />
            <div *ngIf="isFieldInvalid('password')" class="form-error">
              La contraseña es obligatoria
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            [disabled]="loginForm.invalid || isLoading()"
          >
            <span *ngIf="isLoading()" class="spinner"></span>
            <span>{{ isLoading() ? 'Iniciando sesión...' : 'Entrar a la Plataforma' }}</span>
          </button>
        </form>

        <!-- Footer -->
        <div class="auth-footer">
          <span>¿No tienes una cuenta aún?</span>
          <a routerLink="/register" class="auth-link">Regístrate aquí</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-color: var(--bg-main);
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .auth-logo-badge {
      width: 48px;
      height: 48px;
      margin: 0 auto 14px;
      background: #0f172a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .auth-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
      color: #0f172a;
    }

    .auth-header p {
      color: var(--text-secondary);
      font-size: 0.88rem;
    }

    .demo-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 20px;
    }

    .demo-title {
      font-size: 0.76rem;
      font-weight: 600;
      color: #475569;
      display: block;
      margin-bottom: 6px;
    }

    .demo-buttons {
      display: flex;
      gap: 8px;
    }

    .demo-btn {
      flex: 1;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .demo-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #94a3b8;
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      margin-bottom: 18px;
    }

    .w-full {
      width: 100%;
      margin-top: 8px;
    }

    .auth-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .auth-link {
      font-weight: 600;
      margin-left: 4px;
      color: #0f172a;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  fillCredentials(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        this.errorMessage.set(Array.isArray(msg) ? msg[0] : msg);
      },
    });
  }
}
