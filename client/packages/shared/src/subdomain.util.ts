// packages/shared/src/subdomain.util.ts

export interface SubdomainConfig {
  protocol?: string;
  baseDomain?: string;
  portMap?: Record<string, number>;
  isProduction?: boolean;
}

/**
 * Reserved subdomains that should never be resolved as a tool slug.
 */
export const RESERVED_SUBDOMAINS = new Set([
  'tools',
  'www',
  'api',
  'app',
  'admin',
  'static',
  'cdn',
  'assets',
  'mail',
  'dev'
]);

export const DEFAULT_LOCAL_PORT_MAP: Record<string, number> = {
  portal: 4200
};

/**
 * Detects whether the current runtime environment is production.
 */
function resolveConfig(config?: SubdomainConfig): {
  protocol: string;
  baseDomain: string;
  isProduction: boolean;
  portMap: Record<string, number>;
  currentPort?: string;
} {
  let isProduction = config?.isProduction;
  let baseDomain = config?.baseDomain;
  let protocol = config?.protocol;
  let currentPort: string | undefined;

  const portMap = config?.portMap || DEFAULT_LOCAL_PORT_MAP;
  const explicitPortalPort = config?.portMap?.['portal'];

  if (typeof window !== 'undefined') {
    const loc = window.location;
    if (baseDomain === undefined) {
      baseDomain = loc.hostname.includes('localhost') ? 'localhost' : 'acklet.com';
    }
    if (protocol === undefined) {
      protocol = loc.protocol.replace(':', '');
    }
    if (isProduction === undefined) {
      isProduction = !loc.hostname.includes('localhost') && loc.hostname !== '127.0.0.1';
    }
    currentPort = explicitPortalPort ? String(explicitPortalPort) : (loc.port || '4200');
  } else {
    isProduction = isProduction ?? false;
    baseDomain = baseDomain ?? (isProduction ? 'acklet.com' : 'localhost');
    protocol = protocol ?? (isProduction ? 'https' : 'http');
    currentPort = explicitPortalPort ? String(explicitPortalPort) : '4200';
  }

  return {
    protocol,
    baseDomain,
    isProduction,
    portMap,
    currentPort
  };
}

/**
 * Builds the root Acklet portal URL.
 * Production: https://acklet.com
 * Local: http://localhost:4200 (or current runtime port)
 */
export function getPortalUrl(config?: SubdomainConfig): string {
  const { protocol, baseDomain, isProduction, portMap, currentPort } = resolveConfig(config);
  if (!isProduction && baseDomain === 'localhost') {
    const port = currentPort || (portMap['portal'] ? String(portMap['portal']) : '4200');
    return `${protocol}://localhost:${port}`;
  }
  return `${protocol}://${baseDomain}`;
}

/**
 * Builds the Tools Hub URL.
 * Production: https://tools.acklet.com
 * Local: http://tools.localhost:4200 (runs on the SAME dev port as the portal)
 */
export function getToolsHubUrl(categorySlug?: string, config?: SubdomainConfig): string {
  const { protocol, baseDomain, isProduction, portMap, currentPort } = resolveConfig(config);
  let url: string;
  if (!isProduction && baseDomain === 'localhost') {
    const port = currentPort || (portMap['portal'] ? String(portMap['portal']) : '4200');
    url = `${protocol}://tools.localhost:${port}`;
  } else {
    url = `${protocol}://tools.${baseDomain}`;
  }

  if (categorySlug) {
    url += `?category=${encodeURIComponent(categorySlug)}`;
  }
  return url;
}

/**
 * Builds a specific tool's standalone subdomain URL.
 * Production: https://<slug>.acklet.com
 * Local: http://<slug>.localhost:4200 (runs on the SAME dev port as the portal)
 */
export function getToolUrl(slug: string, config?: SubdomainConfig): string {
  const normalizedSlug = slug.toLowerCase().trim();
  if (RESERVED_SUBDOMAINS.has(normalizedSlug)) {
    throw new Error(`Cannot build tool URL for reserved subdomain: "${normalizedSlug}"`);
  }

  const { protocol, baseDomain, isProduction, portMap, currentPort } = resolveConfig(config);

  if (!isProduction && baseDomain === 'localhost') {
    const port = currentPort || (portMap['portal'] ? String(portMap['portal']) : '4200');
    return `${protocol}://${normalizedSlug}.localhost:${port}`;
  }

  return `${protocol}://${normalizedSlug}.${baseDomain}`;
}

/**
 * Detects whether a given hostname (or window.location.hostname) belongs to the Tools Hub.
 * Examples: 'tools.localhost', 'tools.acklet.com'
 */
export function isToolsHubHostname(hostname?: string): boolean {
  const host = hostname !== undefined 
    ? hostname 
    : (typeof window !== 'undefined' ? window.location.hostname : '');
  
  const normalized = host.toLowerCase().trim();
  return normalized.startsWith('tools.') || normalized === 'tools';
}

/**
 * Extracts a tool slug from a hostname if it represents a tool subdomain.
 * Examples: 'clipboard.localhost' -> 'clipboard', 'clipboard.acklet.com' -> 'clipboard'
 * Returns null if the hostname is root portal, tools hub, or a reserved subdomain.
 */
export function extractToolSlugFromHostname(hostname?: string): string | null {
  const host = hostname !== undefined 
    ? hostname 
    : (typeof window !== 'undefined' ? window.location.hostname : '');

  const normalized = host.toLowerCase().trim();
  if (!normalized || normalized === 'localhost' || normalized === '127.0.0.1' || normalized === 'acklet.com' || normalized === 'www.acklet.com') {
    return null;
  }

  const parts = normalized.split('.');
  if (parts.length < 2) return null;

  const subdomain = parts[0];
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

// Backward compatibility alias for gradual refactor
export const buildToolSubdomainUrl = (slug: string, config?: SubdomainConfig) => getToolUrl(slug, config);
export const buildPortalUrl = (config?: SubdomainConfig) => getPortalUrl(config);
