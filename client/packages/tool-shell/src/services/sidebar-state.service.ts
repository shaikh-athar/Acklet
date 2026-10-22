// packages/tool-shell/src/services/sidebar-state.service.ts
import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';

export type SidebarMode = 'hidden' | 'peek' | 'pinned';

export const PINNED_COOKIE_KEY = 'acklet_sidebar_pinned';
export const HOVER_COOKIE_KEY = 'acklet_sidebar_hover';
export const FIRST_HINT_KEY = 'acklet_sidebar_hint_seen';
export const MIN_PIN_VIEWPORT_WIDTH = 1100;
export const COOKIE_MAX_AGE_SEC = 31536000; // 1 year

/**
 * Resolves the parent cookie domain for cross-subdomain sharing.
 * Production: .acklet.com
 * Localhost / Dev: .localhost (if supported) or undefined (host-only)
 */
export function resolveCookieDomain(hostname: string): string | undefined {
  const host = hostname.toLowerCase().trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return undefined;
  }
  if (host.endsWith('.acklet.com') || host === 'acklet.com') {
    return '.acklet.com';
  }
  if (host.endsWith('.localhost')) {
    return '.localhost';
  }
  const parts = host.split('.');
  if (parts.length >= 2) {
    return '.' + parts.slice(-2).join('.');
  }
  return undefined;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const target = `${encodeURIComponent(name)}=`;
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith(target)) {
        return decodeURIComponent(trimmed.slice(target.length));
      }
    }
  } catch {
    // Cookie access blocked or restricted
  }
  return null;
}

export function writeCookie(
  name: string,
  value: string,
  domain?: string,
  maxAgeSec: number = COOKIE_MAX_AGE_SEC
): void {
  if (typeof document === 'undefined') return;
  try {
    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
    if (domain) {
      cookieStr += `; domain=${domain}`;
    }
    document.cookie = cookieStr;
  } catch {
    // Cookie write blocked
  }
}

function readPreference(key: string): string | null {
  const fromCookie = readCookie(key);
  if (fromCookie !== null) return fromCookie;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function writePreference(key: string, value: string, domain?: string): void {
  writeCookie(key, value, domain);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

@Injectable({
  providedIn: 'root'
})
export class SidebarStateService {
  private destroyRef: DestroyRef | null = null;

  // Core state
  readonly mode = signal<SidebarMode>('hidden');
  readonly isHoverEnabled = signal<boolean>(true);
  readonly hoverEnabled = this.isHoverEnabled;
  readonly isMobileOpen = signal<boolean>(false);
  readonly canPin = signal<boolean>(true);
  readonly canHover = signal<boolean>(true);

  // Computed state
  readonly isPinned = computed(() => this.mode() === 'pinned');
  readonly isPeek = computed(() => this.mode() === 'peek');
  readonly isHidden = computed(() => this.mode() === 'hidden');
  readonly isVisible = computed(() => this.mode() !== 'hidden');
  readonly isOverlay = computed(() => this.mode() === 'peek' || this.isMobileOpen());

  // Remember if user explicitly pinned even when temporarily below MIN_PIN_VIEWPORT_WIDTH
  private userPinnedIntent = false;
  private cookieDomain?: string;

  constructor() {
    try {
      this.destroyRef = inject(DestroyRef, { optional: true });
    } catch {
      this.destroyRef = null;
    }
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.cookieDomain = resolveCookieDomain(window.location.hostname);

    // 1. Check capability signals
    this.updateCapabilities();

    // 2. Read stored hover preference (default true)
    const hoverPref = readPreference(HOVER_COOKIE_KEY);
    if (hoverPref !== null) {
      this.isHoverEnabled.set(hoverPref !== 'false');
    }

    // 3. Read stored pinned state
    const pinnedPref = readPreference(PINNED_COOKIE_KEY);
    this.userPinnedIntent = pinnedPref === 'true';

    // 4. Set initial mode
    if (this.userPinnedIntent && this.canPin()) {
      this.mode.set('pinned');
      this.syncHtmlAttributes('pinned');
    } else {
      this.mode.set('hidden');
      this.syncHtmlAttributes('hidden');
    }

    // 5. Setup media query & resize listeners
    this.bindWindowListeners();
  }

  private updateCapabilities(): void {
    if (typeof window === 'undefined') return;

    // Viewport check
    const allowsPin = window.innerWidth >= MIN_PIN_VIEWPORT_WIDTH;
    this.canPin.set(allowsPin);

    // Pointer hover check
    const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    this.canHover.set(hoverMedia.matches);
  }

  private bindWindowListeners(): void {
    if (typeof window === 'undefined') return;

    const onResize = () => {
      const prevCanPin = this.canPin();
      this.updateCapabilities();
      const nextCanPin = this.canPin();

      if (prevCanPin !== nextCanPin) {
        if (!nextCanPin && this.mode() === 'pinned') {
          // Viewport shrunk below minimum for push-pinned layout; downgrade to hidden
          this.mode.set('hidden');
          this.syncHtmlAttributes('hidden');
        } else if (nextCanPin && this.userPinnedIntent && this.mode() === 'hidden') {
          // Viewport expanded back and user intended pinned mode; restore
          this.mode.set('pinned');
          this.syncHtmlAttributes('pinned');
        }
      }
    };

    const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onHoverChange = (e: MediaQueryListEvent) => {
      this.canHover.set(e.matches);
      if (!e.matches && this.mode() === 'peek') {
        this.peekClose();
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    hoverMedia.addEventListener?.('change', onHoverChange);

    this.destroyRef?.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      hoverMedia.removeEventListener?.('change', onHoverChange);
    });
  }

  pin(): void {
    if (!this.canPin()) {
      return;
    }
    this.userPinnedIntent = true;
    this.mode.set('pinned');
    writePreference(PINNED_COOKIE_KEY, 'true', this.cookieDomain);
    this.syncHtmlAttributes('pinned');
  }

  unpin(): void {
    this.userPinnedIntent = false;
    this.mode.set('hidden');
    writePreference(PINNED_COOKIE_KEY, 'false', this.cookieDomain);
    this.syncHtmlAttributes('hidden');
  }

  toggle(): void {
    if (this.isPinned()) {
      this.unpin();
    } else {
      this.pin();
    }
  }

  peekOpen(): void {
    // If pinned, already visible in push layout
    if (this.isPinned()) return;
    // Guard against hover disabled or non-hover devices
    if (!this.isHoverEnabled() || !this.canHover()) return;
    // Guard against mobile drawer being open
    if (this.isMobileOpen()) return;

    this.mode.set('peek');
    this.syncHtmlAttributes('peek');
  }

  peekClose(): void {
    if (this.mode() === 'peek') {
      this.mode.set('hidden');
      this.syncHtmlAttributes('hidden');
    }
  }

  setHoverEnabled(enabled: boolean): void {
    this.isHoverEnabled.set(enabled);
    writePreference(HOVER_COOKIE_KEY, String(enabled), this.cookieDomain);
    if (!enabled && this.mode() === 'peek') {
      this.peekClose();
    }
  }

  toggleHoverEnabled(): void {
    this.setHoverEnabled(!this.isHoverEnabled());
  }

  setMobileOpen(open: boolean): void {
    this.isMobileOpen.set(open);
    if (open && this.mode() === 'peek') {
      this.peekClose();
    }
  }

  toggleMobileOpen(): void {
    this.setMobileOpen(!this.isMobileOpen());
  }

  closeMobile(): void {
    this.setMobileOpen(false);
  }

  private syncHtmlAttributes(mode: SidebarMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-sidebar-state', mode);
    root.setAttribute('data-sidebar-pinned', mode === 'pinned' ? 'true' : 'false');
  }
}
