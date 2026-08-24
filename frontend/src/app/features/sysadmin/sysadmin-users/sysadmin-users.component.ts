import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SysadminService, PaginatedUsers } from '../../../core/services/sysadmin.service';
import { User, UserRole } from '../../../core/models';

import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-sysadmin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './sysadmin-users.component.html',
  styleUrl: './sysadmin-users.component.css'
})
export class SysadminUsersComponent implements OnInit {
  private readonly sysadminService = inject(SysadminService);
  protected readonly Math = Math;

  users = signal<User[]>([]);
  totalUsers = signal(0);
  currentPage = signal(1);
  limit = signal(10);
  isLoading = signal(false);

  // Edit State
  editingUser = signal<User | null>(null);
  editRole = signal<UserRole>(UserRole.STUDENT);
  
  // Password State
  isChangingPassword = signal(false);
  editPassword = signal('');
  confirmPassword = signal('');
  roles = Object.values(UserRole);

  // Confirm Modal State
  confirmingUser = signal<User | null>(null);
  confirmAction = signal<'deactivate' | 'reactivate'>('deactivate');

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.sysadminService.getUsers(this.currentPage(), this.limit()).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.totalUsers.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  nextPage(): void {
    if (this.currentPage() * this.limit() < this.totalUsers()) {
      this.currentPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  openEditModal(user: User): void {
    this.editingUser.set(user);
    this.editRole.set(user.role);
    this.isChangingPassword.set(false);
    this.editPassword.set('');
    this.confirmPassword.set('');
  }

  closeEditModal(): void {
    this.editingUser.set(null);
  }

  togglePasswordChange(): void {
    this.isChangingPassword.set(true);
  }

  toggleUserStatus(user: User): void {
    this.confirmingUser.set(user);
    this.confirmAction.set(user.deletedAt ? 'reactivate' : 'deactivate');
  }

  closeConfirmModal(): void {
    this.confirmingUser.set(null);
  }

  executeStatusChange(): void {
    const user = this.confirmingUser();
    if (!user) return;

    if (this.confirmAction() === 'reactivate') {
      this.sysadminService.reactivateUser(user.id).subscribe(() => {
        this.loadUsers();
        this.closeConfirmModal();
      });
    } else {
      this.sysadminService.deactivateUser(user.id).subscribe(() => {
        this.loadUsers();
        this.closeConfirmModal();
      });
    }
  }

  saveChanges(): void {
    const user = this.editingUser();
    if (!user) return;

    if (this.isChangingPassword()) {
      if (this.editPassword() !== this.confirmPassword()) {
        alert('Las contraseñas no coinciden');
        return;
      }
      if (this.editPassword().length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    }

    // Update Role
    if (user.role !== this.editRole()) {
      this.sysadminService.updateRole(user.id, this.editRole()).subscribe({
        next: () => {
          this.loadUsers();
          if (!this.isChangingPassword() || !this.editPassword()) {
            this.closeEditModal();
          }
        }
      });
    }

    // Update Password
    if (this.isChangingPassword() && this.editPassword()) {
      this.sysadminService.resetPassword(user.id, this.editPassword()).subscribe({
        next: () => {
          this.closeEditModal();
        }
      });
    } else if (user.role === this.editRole()) {
       this.closeEditModal();
    }
  }
}
