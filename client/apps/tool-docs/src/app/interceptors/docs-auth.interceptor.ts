// client/apps/tool-docs/src/app/interceptors/docs-auth.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';

export const docsAuthInterceptor: HttpInterceptorFn = (req, next) => {
  let token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('acklet_access_token')
    : null;

  // Check document cookie for cross-subdomain auth token (e.g. from docs.localhost or docs.acklet.com)
  if (!token && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)acklet_access_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  // In local/dev environments (localhost or *.localhost), fallback to demo_dev_access_token
  // to ensure docs operations succeed without 403 when unauthenticated in local testing
  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname.endsWith('.localhost') || 
     window.location.hostname === '127.0.0.1');

  if (!token && isLocalHost) {
    token = 'demo_dev_access_token';
  }

  const correlationId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'docs-' + Math.random().toString(36).substring(2);

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Forward XSRF-TOKEN if present in cookies for CSRF validation
  if (typeof document !== 'undefined') {
    const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (xsrfMatch) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
    }
  }

  const authReq = req.clone({
    setHeaders: headers,
    withCredentials: true
  });

  return next(authReq);
};
