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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h2>Iniciar Sesión</h2>
          <p>Ingresa a tu cuenta de estudiante para continuar tus clases</p>
        </div>

        <!-- Quick Demo Credentials Fill -->
        <div class="demo-box">
          <span class="demo-title">💡 Acceso Rápido de Prueba:</span>
          <div class="demo-buttons">
            <button type="button" (click)="fillCredentials('alumno@instituto.com', 'student123')" class="demo-btn">
              🧑‍🎓 Alumno Demo
            </button>
            <button type="button" (click)="fillCredentials('admin@instituto.com', 'admin123')" class="demo-btn">
              👨‍🏫 Profesor Demo
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
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      background: rgba(18, 24, 38, 0.85);
      border: 1px solid var(--border-subtle);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .auth-logo-badge {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: var(--accent-gradient);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: var(--shadow-glow);
    }

    .auth-header h2 {
      font-size: 1.6rem;
      margin-bottom: 6px;
    }

    .auth-header p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .demo-box {
      background: rgba(99, 102, 241, 0.08);
      border: 1px dashed rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 20px;
    }

    .demo-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: #818cf8;
      display: block;
      margin-bottom: 8px;
    }

    .demo-buttons {
      display: flex;
      gap: 8px;
    }

    .demo-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .demo-btn:hover {
      background: rgba(99, 102, 241, 0.2);
      border-color: var(--primary);
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--status-danger-bg);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      margin-bottom: 20px;
    }

    .w-full {
      width: 100%;
      margin-top: 10px;
    }

    .auth-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.88rem;
      color: var(--text-secondary);
    }

    .auth-link {
      font-weight: 600;
      margin-left: 6px;
      color: #818cf8;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
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
