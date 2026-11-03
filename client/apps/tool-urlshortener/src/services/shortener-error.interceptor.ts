import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { SHORTENER_MESSAGE_CATALOG, sanitizeErrorMessage } from './shortener-messages';

/**
 * HTTP Interceptor for URL Shortener.
 * Maps any failure (status codes, network errors, timeouts, raw responses)
 * into friendly catalog error text so that raw server or library text never leaks to the UI.
 */
export function shortenerErrorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    catchError((err: unknown) => {
      let errorCode = 'SERVER_ERROR';

      if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
          errorCode = 'OFFLINE_OR_NETWORK';
        } else if (err.status === 404 || err.status === 410) {
          errorCode = 'LINK_UNAVAILABLE';
        } else if (err.status === 401 || err.status === 403) {
          errorCode = 'NO_PERMISSION';
        } else if (err.status === 409) {
          errorCode = 'NAME_TAKEN';
        } else if (err.status === 429) {
          errorCode = 'RATE_LIMITED';
        } else if (err.status === 400) {
          errorCode = 'LINK_INVALID';
        }
      }

      const friendlyMessage = sanitizeErrorMessage(err, SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);

      return throwError(() => ({
        errorCode,
        message: friendlyMessage,
        status: (err as any)?.status
      }));
    })
  );
}
