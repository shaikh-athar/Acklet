// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SidebarStateService,
  resolveCookieDomain,
  readCookie,
  writeCookie,
  PINNED_COOKIE_KEY,
  HOVER_COOKIE_KEY
} from './sidebar-state.service';

describe('SidebarStateService & Subdomain Cookie Utilities', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar-state');
    document.documentElement.removeAttribute('data-sidebar-pinned');
    // Default window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280
    });
    // Default matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveCookieDomain', () => {
    it('resolves .acklet.com for root and subdomains', () => {
      expect(resolveCookieDomain('acklet.com')).toBe('.acklet.com');
      expect(resolveCookieDomain('qr-generator.acklet.com')).toBe('.acklet.com');
      expect(resolveCookieDomain('tools.acklet.com')).toBe('.acklet.com');
      expect(resolveCookieDomain('nested.sub.acklet.com')).toBe('.acklet.com');
    });

    it('handles localhost and IP addresses safely', () => {
      expect(resolveCookieDomain('localhost')).toBeUndefined();
      expect(resolveCookieDomain('127.0.0.1')).toBeUndefined();
      expect(resolveCookieDomain('tools.localhost')).toBe('.localhost');
    });

    it('resolves generic multi-part domains', () => {
      expect(resolveCookieDomain('tools.example.org')).toBe('.example.org');
    });
  });

  describe('Cookie read & write helpers', () => {
    it('writes and reads a cookie value correctly', () => {
      writeCookie('test_cookie', 'hello_world');
      expect(readCookie('test_cookie')).toBe('hello_world');
    });

    it('returns null for non-existent cookie', () => {
      expect(readCookie('non_existent')).toBeNull();
    });
  });

  describe('SidebarStateService state transitions', () => {
    it('defaults to hidden mode on desktop when no cookie is set', () => {
      const service = new SidebarStateService();
      expect(service.mode()).toBe('hidden');
      expect(service.isHidden()).toBe(true);
      expect(service.isPinned()).toBe(false);
      expect(service.isPeek()).toBe(false);
      expect(service.isVisible()).toBe(false);
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('hidden');
      expect(document.documentElement.getAttribute('data-sidebar-pinned')).toBe('false');
    });

    it('initializes to pinned if cookie was previously set to true and viewport >= 1100', () => {
      writeCookie(PINNED_COOKIE_KEY, 'true');
      const service = new SidebarStateService();
      expect(service.mode()).toBe('pinned');
      expect(service.isPinned()).toBe(true);
      expect(service.isVisible()).toBe(true);
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('pinned');
      expect(document.documentElement.getAttribute('data-sidebar-pinned')).toBe('true');
    });

    it('does not pin on initialization if viewport is < 1100 even with cookie', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900
      });
      writeCookie(PINNED_COOKIE_KEY, 'true');
      const service = new SidebarStateService();
      expect(service.canPin()).toBe(false);
      expect(service.mode()).toBe('hidden');
      expect(service.isPinned()).toBe(false);
    });

    it('pin() updates state, sets attributes, and persists to cookie/storage', () => {
      const service = new SidebarStateService();
      service.pin();

      expect(service.mode()).toBe('pinned');
      expect(service.isPinned()).toBe(true);
      expect(readCookie(PINNED_COOKIE_KEY)).toBe('true');
      expect(localStorage.getItem(PINNED_COOKIE_KEY)).toBe('true');
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('pinned');
      expect(document.documentElement.getAttribute('data-sidebar-pinned')).toBe('true');
    });

    it('unpin() returns state to hidden and updates cookie/storage', () => {
      writeCookie(PINNED_COOKIE_KEY, 'true');
      const service = new SidebarStateService();
      expect(service.isPinned()).toBe(true);

      service.unpin();
      expect(service.mode()).toBe('hidden');
      expect(service.isPinned()).toBe(false);
      expect(readCookie(PINNED_COOKIE_KEY)).toBe('false');
      expect(localStorage.getItem(PINNED_COOKIE_KEY)).toBe('false');
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('hidden');
      expect(document.documentElement.getAttribute('data-sidebar-pinned')).toBe('false');
    });

    it('toggle() flips between pinned and hidden', () => {
      const service = new SidebarStateService();
      expect(service.mode()).toBe('hidden');

      service.toggle();
      expect(service.mode()).toBe('pinned');

      service.toggle();
      expect(service.mode()).toBe('hidden');
    });

    it('peekOpen() and peekClose() control peek overlay state', () => {
      const service = new SidebarStateService();
      expect(service.mode()).toBe('hidden');

      service.peekOpen();
      expect(service.mode()).toBe('peek');
      expect(service.isPeek()).toBe(true);
      expect(service.isVisible()).toBe(true);
      expect(service.isOverlay()).toBe(true);
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('peek');

      service.peekClose();
      expect(service.mode()).toBe('hidden');
      expect(service.isPeek()).toBe(false);
      expect(document.documentElement.getAttribute('data-sidebar-state')).toBe('hidden');
    });

    it('peekOpen() is ignored when already pinned', () => {
      const service = new SidebarStateService();
      service.pin();
      expect(service.mode()).toBe('pinned');

      service.peekOpen();
      expect(service.mode()).toBe('pinned'); // stays pinned
    });

    it('peekOpen() is ignored when hover is disabled', () => {
      const service = new SidebarStateService();
      service.setHoverEnabled(false);

      service.peekOpen();
      expect(service.mode()).toBe('hidden');
    });

    it('peekOpen() is ignored when device cannot hover (touch)', () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }));

      const service = new SidebarStateService();
      expect(service.canHover()).toBe(false);

      service.peekOpen();
      expect(service.mode()).toBe('hidden');
    });

    it('disabling hover closes active peek', () => {
      const service = new SidebarStateService();
      service.peekOpen();
      expect(service.isPeek()).toBe(true);

      service.setHoverEnabled(false);
      expect(service.isPeek()).toBe(false);
      expect(service.mode()).toBe('hidden');
      expect(readCookie(HOVER_COOKIE_KEY)).toBe('false');
    });

    it('setMobileOpen() manages mobile drawer and closes peek', () => {
      const service = new SidebarStateService();
      service.peekOpen();
      expect(service.isPeek()).toBe(true);

      service.setMobileOpen(true);
      expect(service.isMobileOpen()).toBe(true);
      expect(service.isOverlay()).toBe(true);
      expect(service.isPeek()).toBe(false);

      service.closeMobile();
      expect(service.isMobileOpen()).toBe(false);
    });

    it('handles responsive resize downgrade and restoration', () => {
      const service = new SidebarStateService();
      service.pin();
      expect(service.mode()).toBe('pinned');

      // Shrink viewport below minimum
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800
      });
      window.dispatchEvent(new Event('resize'));

      expect(service.canPin()).toBe(false);
      expect(service.mode()).toBe('hidden');

      // Expand viewport back
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280
      });
      window.dispatchEvent(new Event('resize'));

      expect(service.canPin()).toBe(true);
      expect(service.mode()).toBe('pinned');
    });
  });
});
