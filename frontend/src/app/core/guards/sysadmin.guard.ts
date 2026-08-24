import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const sysadminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user && user.role === UserRole.SYSADMIN) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
