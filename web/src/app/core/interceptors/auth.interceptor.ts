import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, from, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const alreadyRetried = req.headers.has('X-Auth-Retried');

  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't retry for auth endpoints (login, register, refresh)
      const isAuthUrl = req.url.includes('/auth/');
      if (error.status === 401 && !isAuthUrl && !alreadyRetried) {
        return from(authService.refreshTokens()).pipe(
          switchMap((success) => {
            if (success) {
              const newToken = authService.getToken();
              const retryReq = req.clone({
                headers: req.headers
                  .set('Authorization', `Bearer ${newToken}`)
                  .set('X-Auth-Retried', '1'),
              });
              return next(retryReq);
            }
            return throwError(() => error);
          }),
          catchError((refreshErr) => throwError(() => refreshErr)),
        );
      }
      return throwError(() => error);
    }),
  );
};
