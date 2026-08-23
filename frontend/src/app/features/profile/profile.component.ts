import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  public authService = inject(AuthService);

  profileForm: FormGroup;
  passwordForm: FormGroup;

  profileMessage = '';
  profileError = '';
  passwordMessage = '';
  passwordError = '';

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          name: user.name
        });
      },
      error: (err) => {
        this.profileError = 'Error al cargar los datos del perfil.';
      }
    });
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid) return;

    this.profileMessage = '';
    this.profileError = '';

    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (updatedUser) => {
        this.authService.updateUser(updatedUser);
        this.profileMessage = 'Perfil actualizado correctamente.';
      },
      error: (err) => {
        this.profileError = err.error?.message || 'Error al actualizar el perfil.';
      }
    });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) return;

    this.passwordMessage = '';
    this.passwordError = '';

    this.userService.changePassword(this.passwordForm.value).subscribe({
      next: (res) => {
        this.passwordMessage = res.message || 'Contraseña actualizada correctamente.';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordError = err.error?.message || 'Error al cambiar la contraseña.';
      }
    });
  }
}
