import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATTERNS = ['/auth/login', '/auth/google', '/auth/refresh', '/.well-known/jwks.json'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toastSvc = inject(ToastService);
  const authSvc = inject(AuthService);

  const isPublic = PUBLIC_PATTERNS.some(p => req.url.includes(p));
  const token = authSvc.getAccessToken();
  const correlationId = crypto.randomUUID();

  // Read CSRF token cookie if present
  const xsrfCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId
  };

  if (xsrfCookie) {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfCookie);
  }

  if (!isPublic && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headers,
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        toastSvc.warning('Network Unreachable', 'Please check your internet connection.');
      } else if (err.status === 401 && !isPublic) {
        return authSvc.refreshToken().pipe(
          switchMap(res => {
            if (res.success && res.data) {
              const retryReq = req.clone({
                setHeaders: {
                  ...headers,
                  Authorization: `Bearer ${res.data.accessToken}`
                },
                withCredentials: true
              });
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
        const retryAfter = err.headers.get('Retry-After') || '300';
        toastSvc.warning('Rate Limit Exceeded', `Too many requests. Please wait ${retryAfter} seconds before trying again.`);
      } else if (err.status >= 500) {
        toastSvc.error('Server Error', 'Our server encountered an issue. Please try again shortly.');
      }

      return throwError(() => err);
    })
  );
};
