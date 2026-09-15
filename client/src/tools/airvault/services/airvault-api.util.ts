/**
 * AirVault API Base URL resolver
 * Seamlessly resolves backend target for local dev (http://localhost:8080), ngrok tunnels, and production origins.
 */
export function getAirVaultApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location) {
    const isLocal4200 = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '4200';
    if (isLocal4200) {
      return `http://localhost:8080${cleanPath}`;
    }
  }
  return cleanPath;
}
