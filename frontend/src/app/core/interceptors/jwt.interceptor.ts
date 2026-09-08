import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

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

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized is returned and it is not an authentication endpoint
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/google')
      ) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
