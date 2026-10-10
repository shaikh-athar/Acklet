// packages/shared/src/subdomain.util.spec.ts
import { describe, it, expect } from 'vitest';
import {
  getPortalUrl,
  getToolsHubUrl,
  getToolUrl,
  isToolsHubHostname,
  extractToolSlugFromHostname,
  RESERVED_SUBDOMAINS
} from './subdomain.util';

describe('Central URL Builder (subdomain.util)', () => {
  describe('Local Development (Port 4200)', () => {
    const devConfig = {
      isProduction: false,
      baseDomain: 'localhost',
      protocol: 'http',
      portMap: {
        portal: 4200
      }
    };

    it('builds portal url on local port 4200', () => {
      expect(getPortalUrl(devConfig)).toBe('http://localhost:4200');
    });

    it('builds tools hub url on local port 4200 (same port as portal)', () => {
      expect(getToolsHubUrl(undefined, devConfig)).toBe('http://tools.localhost:4200');
    });

    it('builds tools hub url with category parameter on port 4200', () => {
      expect(getToolsHubUrl('utilities', devConfig)).toBe('http://tools.localhost:4200?category=utilities');
    });

    it('builds tool subdomain url on local port 4200 (same port as portal)', () => {
      expect(getToolUrl('clipboard', devConfig)).toBe('http://clipboard.localhost:4200');
      expect(getToolUrl('formatter', devConfig)).toBe('http://formatter.localhost:4200');
    });
  });

  describe('Local Development (Custom Port e.g. 5000)', () => {
    const customPortConfig = {
      isProduction: false,
      baseDomain: 'localhost',
      protocol: 'http',
      portMap: {
        portal: 5000
      }
    };

    it('builds portal, tools hub, and tool URLs matching the custom port', () => {
      expect(getPortalUrl(customPortConfig)).toBe('http://localhost:5000');
      expect(getToolsHubUrl(undefined, customPortConfig)).toBe('http://tools.localhost:5000');
      expect(getToolsHubUrl('productivity', customPortConfig)).toBe('http://tools.localhost:5000?category=productivity');
      expect(getToolUrl('clipboard', customPortConfig)).toBe('http://clipboard.localhost:5000');
    });
  });

  describe('Production', () => {
    const prodConfig = {
      isProduction: true,
      baseDomain: 'acklet.com',
      protocol: 'https'
    };

    it('builds root portal url without port', () => {
      expect(getPortalUrl(prodConfig)).toBe('https://acklet.com');
    });

    it('builds tools hub url without port', () => {
      expect(getToolsHubUrl(undefined, prodConfig)).toBe('https://tools.acklet.com');
    });

    it('builds tools hub url with category query in prod', () => {
      expect(getToolsHubUrl('developer-tools', prodConfig)).toBe('https://tools.acklet.com?category=developer-tools');
    });

    it('builds tool subdomain url without port', () => {
      expect(getToolUrl('clipboard', prodConfig)).toBe('https://clipboard.acklet.com');
    });
  });

  describe('Reserved Subdomains Validation', () => {
    it('throws when attempting to build tool URL for a reserved subdomain', () => {
      for (const reserved of Array.from(RESERVED_SUBDOMAINS)) {
        expect(() => getToolUrl(reserved)).toThrowError(/reserved subdomain/);
      }
    });
  });

  describe('Hostname-based App Selection (isToolsHubHostname & extractToolSlugFromHostname)', () => {
    it('identifies tools.localhost as Tools Hub', () => {
      expect(isToolsHubHostname('tools.localhost')).toBe(true);
      expect(extractToolSlugFromHostname('tools.localhost')).toBeNull();
    });

    it('identifies tools.acklet.com as Tools Hub', () => {
      expect(isToolsHubHostname('tools.acklet.com')).toBe(true);
      expect(isToolsHubHostname('TOOLS.ACKLET.COM')).toBe(true);
      expect(extractToolSlugFromHostname('tools.acklet.com')).toBeNull();
    });

    it('identifies localhost as Acklet Portal', () => {
      expect(isToolsHubHostname('localhost')).toBe(false);
      expect(isToolsHubHostname('127.0.0.1')).toBe(false);
      expect(extractToolSlugFromHostname('localhost')).toBeNull();
    });

    it('identifies acklet.com and www.acklet.com as Acklet Portal', () => {
      expect(isToolsHubHostname('acklet.com')).toBe(false);
      expect(isToolsHubHostname('www.acklet.com')).toBe(false);
      expect(extractToolSlugFromHostname('acklet.com')).toBeNull();
    });

    it('identifies tool subdomains and extracts their slug', () => {
      expect(isToolsHubHostname('clipboard.localhost')).toBe(false);
      expect(extractToolSlugFromHostname('clipboard.localhost')).toBe('clipboard');
      expect(extractToolSlugFromHostname('clipboard.acklet.com')).toBe('clipboard');
    });
  });
});
