import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly socialAuthService = inject(SocialAuthService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const authSub = this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.isLoading.set(true);
        this.authService.loginWithGoogle(user.idToken).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.isLoading.set(false);
            const msg = err.error?.message || 'Error al iniciar sesión con Google.';
            this.errorMessage.set(Array.isArray(msg) ? msg[0] : msg);
          }
        });
      }
    });

    // Cleanup subscription
    const destroyRef = inject(DestroyRef, { optional: true });
    destroyRef?.onDestroy(() => authSub.unsubscribe());
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
