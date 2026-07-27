import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATTERNS = ['/auth/login', '/auth/google', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastSvc = inject(ToastService);
  const authSvc = inject(AuthService);

  const isPublic = PUBLIC_PATTERNS.some(p => req.url.includes(p));
  const token = authSvc.getAccessToken();

  const authReq = (!isPublic && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        toastSvc.warning('Network Unreachable', 'Please check your internet connection or backend server.');
      } else if (err.status === 401 && !isPublic) {
        return authSvc.refreshToken().pipe(
          switchMap(res => {
            if (res.success && res.data) {
              const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${res.data.accessToken}` } });
              return next(retryReq);
            }
            authSvc.handleExpiredSession();
            return throwError(() => err);
          }),
          catchError(refreshErr => {
            authSvc.handleExpiredSession();
            toastSvc.error('Session Expired', 'Please sign in again to access your workspace.');
            return throwError(() => refreshErr);
          })
        );
      } else if (err.status === 403) {
        toastSvc.error('Access Denied', 'You do not have permission to perform this action.');
      } else if (err.status === 429) {
        toastSvc.warning('Rate Limit Exceeded', 'Too many requests. Please slow down and try again in a few moments.');
      } else if (err.status >= 500) {
        toastSvc.error('Server Error', 'Our server encountered an issue. Please try again shortly.');
      }

      return throwError(() => err);
    })
  );
};
