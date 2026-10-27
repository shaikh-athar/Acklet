/**
 * QR API Base URL resolver.
 * Resolves the backend target for local development (http://<current-host>:8080),
 * LAN IPs, and production origins, following Acklet's canonical multi-surface API pattern.
 */
export function getQrApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // In test runners (Vitest/Jest), maintain mock-friendly relative URLs
  const isTest =
    typeof (globalThis as Record<string, unknown>)['vi'] !== 'undefined' ||
    (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'test');
  if (isTest) {
    return cleanPath;
  }

  if (typeof window !== 'undefined' && window.location) {
    const isDevPort =
      window.location.port === '4200' ||
      window.location.port === '3000' ||
      window.location.port === '5173';
    if (isDevPort) {
      const host = window.location.hostname;
      const protocol = window.location.protocol || 'http:';
      return `${protocol}//${host}:8080${cleanPath}`;
    }
  }
  return cleanPath;
}
