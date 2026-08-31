import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const isExternal = req.url.startsWith('http') && !req.url.includes(window.location.host);
    if (!isExternal) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      const simulatedRole = authService.simulatedRole();
      if (simulatedRole) {
        headers['x-simulated-role'] = simulatedRole;
      }

      req = req.clone({
        setHeaders: headers,
      });
    }
  }

  return next(req);
};
