import { environment } from '../../../environments/environment';

/**
 * Builds the fully-qualified URL for a tool's subdomain based on current environment config.
 * Production: https://<slug>.acklet.<domain> (or https://<slug>.acklet.com)
 * Local: http://<slug>.localhost:<port>
 */
export function buildToolSubdomainUrl(slug: string): string {
  const { protocol, baseDomain, port } = environment;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}://${slug}.${baseDomain}${portSuffix}`;
}

/**
 * Resolves tool slug from the current browser hostname, if present.
 * Examples:
 * - json-formatter.localhost -> 'json-formatter'
 * - json-formatter.acklet.com -> 'json-formatter'
 * - localhost / acklet.com / www.acklet.com -> null
 */
export function getToolSlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname.toLowerCase();
  const baseDomain = environment.baseDomain.toLowerCase();

  // If exact match with base domain, or www prefix, or raw localhost/IP without subdomain
  if (hostname === baseDomain || hostname === `www.${baseDomain}` || hostname === '127.0.0.1') {
    return null;
  }

  // Handle <slug>.localhost or <slug>.acklet.com
  const suffix = `.${baseDomain}`;
  if (hostname.endsWith(suffix)) {
    const subdomain = hostname.slice(0, -suffix.length);
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app') {
      return subdomain;
    }
  }

  // Fallback for *.acklet.* patterns
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const first = parts[0];
    if (first !== 'www' && first !== 'api' && first !== 'app' && first !== 'localhost') {
      return first;
    }
  }

  return null;
}
