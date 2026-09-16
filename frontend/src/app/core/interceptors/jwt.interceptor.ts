import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Determinar si la petición es a nuestra propia API o si es externa (Cloudinary, CDNs, etc.)
  const isApiRequest =
    req.url.startsWith(environment.apiUrl) ||
    req.url.startsWith('/api') ||
    (!req.url.startsWith('http://') && !req.url.startsWith('https://') && !req.url.startsWith('//')) ||
    req.url.includes(window.location.host);

  const isExternal = !isApiRequest;

  if (token && !isExternal) {
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

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo cerrar sesión si el 401 proviene de nuestra propia API y no es un endpoint de login/registro
      if (
        error.status === 401 &&
        !isExternal &&
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
