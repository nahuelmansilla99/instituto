import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-wrapper">
      <div class="navbar-container">
        <!-- Logo -->
        <a routerLink="/dashboard" class="brand-logo">
          <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">Instituto Virtual</span>
            <span class="brand-subtitle">Plataforma de E-Learning</span>
          </div>
        </a>

        <!-- Right Side Nav -->
        <div class="nav-actions" *ngIf="authService.currentUser() as user">
          <a routerLink="/dashboard" routerLinkActive="active-link" class="nav-link">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Mis Cursos</span>
          </a>

          <!-- Teacher Admin Panel Button (Only for ADMIN role) -->
          <a
            *ngIf="user.role === 'ADMIN'"
            routerLink="/admin"
            routerLinkActive="active-link-admin"
            class="nav-link nav-link-admin"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Panel del Profesor</span>
          </a>

          <!-- User Profile & Logout -->
          <div class="user-chip">
            <div class="avatar-circle">
              {{ getInitials(user.name) }}
            </div>
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-role">{{ user.role === 'ADMIN' ? 'Profesor' : 'Alumno' }}</span>
            </div>
          </div>

          <button (click)="logout()" class="btn-logout" title="Cerrar Sesión">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #ffffff;
      border-bottom: 1px solid var(--border-subtle);
    }

    .navbar-container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: #0f172a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-family: var(--font-heading);
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.15;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text-secondary);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }

    .nav-link:hover, .active-link {
      color: #0f172a;
      background: #f1f5f9;
    }

    .nav-link-admin {
      background: #f8fafc;
      color: #0f172a !important;
      border: 1px solid var(--border-active);
      font-weight: 600;
    }

    .nav-link-admin:hover, .active-link-admin {
      background: #f1f5f9 !important;
      border-color: #94a3b8 !important;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 3px 10px 3px 4px;
      background: #f8fafc;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
    }

    .avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.1;
    }

    .user-role {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: 1px solid #fee2e2;
      color: #dc2626;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-logout:hover {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    @media (max-width: 640px) {
      .brand-subtitle, .user-info {
        display: none;
      }
      .nav-actions {
        gap: 8px;
      }
    }
  `],
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}
