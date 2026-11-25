// client/apps/tool-docs/src/app/guards/docs-auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { DocsAuthService } from '../services/docs-auth.service';

export const docsAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(DocsAuthService);

  const handleUnauthenticated = (): boolean => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost'))) {
      return true;
    }
    const fullReturnUrl = typeof window !== 'undefined'
      ? window.location.origin + state.url
      : state.url;
    authService.redirectToLogin(fullReturnUrl);
    return false;
  };

  if (authService.isLoaded()) {
    if (authService.isAuthenticated()) {
      return true;
    }
    return handleUnauthenticated();
  }

  // If initial auth token check is in-flight, wait until isLoaded becomes true
  return toObservable(authService.isLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => {
      if (authService.isAuthenticated()) {
        return true;
      }
      return handleUnauthenticated();
    }),
  );
};

