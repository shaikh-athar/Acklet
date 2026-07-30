import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes that require authentication.
 * Redirects unauthenticated users to /auth/login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};

/**
 * Protects routes that require PUBLISHER or ADMIN role.
 */
export const publisherGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (!user) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  if (user.role === 'PUBLISHER' || user.role === 'ADMIN' || user.role === 'developer') {
    return true;
  }

  return router.createUrlTree(['/workspace']);
};

/**
 * Protects routes that require ADMIN role.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (!user) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  if (user.role === 'ADMIN' || user.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/workspace']);
};
