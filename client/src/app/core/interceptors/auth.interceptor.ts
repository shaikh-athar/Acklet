// src/app/core/interceptors/auth.interceptor.ts

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

const PUBLIC_PATTERNS = ['/auth/login', '/auth/google', '/auth/refresh'];

/**
 * Attaches the stored JWT to every outgoing request.
 * Displays user-friendly Toast notifications for HTTP status code errors.
 * On 401 → clears session and redirects to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastSvc = inject(ToastService);

  const isPublic = PUBLIC_PATTERNS.some(p => req.url.includes(p));
  const token = localStorage.getItem('acklet_access_token');

  const authReq = (!isPublic && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        toastSvc.warning('Network Unreachable', 'Please check your internet connection or backend server.');
      } else if (err.status === 401 && !isPublic) {
        localStorage.removeItem('acklet_access_token');
        localStorage.removeItem('acklet_refresh_token');
        toastSvc.error('Session Expired', 'Please sign in again to access your workspace.');
        router.navigate(['/auth/login']);
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
