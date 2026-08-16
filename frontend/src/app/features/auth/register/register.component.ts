import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card glass-card animate-fade-in">
        <!-- Header -->
        <div class="auth-header">
          <div class="auth-logo-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2>Crear Cuenta</h2>
          <p>Únete a nuestra plataforma para comenzar tu aprendizaje</p>
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

        <!-- Register Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="name">Nombre Completo</label>
            <input
              id="name"
              type="text"
              class="form-control"
              placeholder="Ej. Juan Pérez"
              formControlName="name"
            />
            <div *ngIf="isFieldInvalid('name')" class="form-error">
              El nombre es obligatorio
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              class="form-control"
              placeholder="tu.email@ejemplo.com"
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
              placeholder="Mínimo 6 caracteres"
              formControlName="password"
            />
            <div *ngIf="isFieldInvalid('password')" class="form-error">
              La contraseña debe tener al menos 6 caracteres
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            [disabled]="registerForm.invalid || isLoading()"
          >
            <span *ngIf="isLoading()" class="spinner"></span>
            <span>{{ isLoading() ? 'Creando cuenta...' : 'Registrarse y Comenzar' }}</span>
          </button>
        </form>

        <!-- Footer -->
        <div class="auth-footer">
          <span>¿Ya tienes una cuenta?</span>
          <a routerLink="/login" class="auth-link">Inicia sesión</a>
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Error al registrar la cuenta.';
        this.errorMessage.set(Array.isArray(msg) ? msg[0] : msg);
      },
    });
  }
}
