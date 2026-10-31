import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { SHORTENER_MESSAGE_CATALOG } from './shortener-messages';

/**
 * HTTP Interceptor for URL Shortener.
 * Maps any failure (status codes, network errors, timeouts, raw responses)
 * into friendly catalog error text so that raw server or library text never leaks to the UI.
 */
export function shortenerErrorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    catchError((err: unknown) => {
      let friendlyMessage: string = SHORTENER_MESSAGE_CATALOG.SERVER_ERROR;
      let errorCode = 'SERVER_ERROR';

      if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
          errorCode = 'OFFLINE_OR_NETWORK';
          friendlyMessage = SHORTENER_MESSAGE_CATALOG.OFFLINE_OR_NETWORK;
        } else if (err.status === 404 || err.status === 410) {
          errorCode = 'LINK_UNAVAILABLE';
          friendlyMessage = SHORTENER_MESSAGE_CATALOG.LINK_UNAVAILABLE;
        } else if (err.status === 401 || err.status === 403) {
          errorCode = 'NO_PERMISSION';
          friendlyMessage = SHORTENER_MESSAGE_CATALOG.NO_PERMISSION;
        } else if (err.status === 429) {
          errorCode = 'RATE_LIMITED';
          friendlyMessage = SHORTENER_MESSAGE_CATALOG.RATE_LIMITED;
        } else if (err.status === 400) {
          // Check if server sent a catalog code or friendly text in ApiResponse
          const serverMsg = err.error?.message;
          if (serverMsg && typeof serverMsg === 'string') {
            friendlyMessage = serverMsg;
          } else {
            errorCode = 'LINK_INVALID';
            friendlyMessage = SHORTENER_MESSAGE_CATALOG.LINK_INVALID;
          }
        } else if (err.error?.message && typeof err.error.message === 'string') {
          friendlyMessage = err.error.message;
        }
      }

      return throwError(() => ({
        errorCode,
        message: friendlyMessage
      }));
    })
  );
}
