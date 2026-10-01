/**
 * AirVault API Base URL resolver
 * Seamlessly resolves backend target for local dev (http://<current-host>:8080), LAN IPs, ngrok tunnels, and production origins.
 */
export function getAirVaultApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location) {
    const isDevPort = window.location.port === '4200' || window.location.port === '3000' || window.location.port === '5173';
    if (isDevPort) {
      // Connect to the backend on the same host (works for localhost, 127.0.0.1, LAN IP e.g. 192.168.1.X)
      const host = window.location.hostname;
      const protocol = window.location.protocol || 'http:';
      return `${protocol}//${host}:8080${cleanPath}`;
    }
  }
  return cleanPath;
}

