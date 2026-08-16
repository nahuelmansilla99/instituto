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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">Instituto<span class="gradient-text">Virtual</span></span>
            <span class="brand-subtitle">Plataforma de E-Learning</span>
          </div>
        </a>

        <!-- Right Side Nav -->
        <div class="nav-actions" *ngIf="authService.currentUser() as user">
          <a routerLink="/dashboard" routerLinkActive="active-link" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
    }

    .navbar-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-gradient);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .gradient-text {
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-left: 3px;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
    }

    .nav-link:hover, .active-link {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-link-admin {
      background: rgba(139, 92, 246, 0.12);
      color: #c084fc !important;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .nav-link-admin:hover, .active-link-admin {
      background: rgba(139, 92, 246, 0.25) !important;
      border-color: #a855f7 !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(139, 92, 246, 0.3);
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 12px 4px 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
    }

    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary-light);
      border: 1px solid var(--primary);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .user-role {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      padding: 7px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: #ef4444;
      transform: translateY(-1px);
    }

    @media (max-width: 640px) {
      .brand-subtitle, .user-info {
        display: none;
      }
      .nav-actions {
        gap: 10px;
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
