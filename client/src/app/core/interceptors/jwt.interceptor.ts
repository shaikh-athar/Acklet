import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Retrieve token from localStorage
  const token = localStorage.getItem('acklet_access_token');
  
  // Generate random UUID for X-Correlation-ID header
  const correlationId = crypto.randomUUID();

  let clonedReq = req.clone({
    setHeaders: {
      'X-Correlation-ID': correlationId
    }
  });

  if (token) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear session on unauthorized access
        localStorage.removeItem('acklet_access_token');
        localStorage.removeItem('acklet_refresh_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
