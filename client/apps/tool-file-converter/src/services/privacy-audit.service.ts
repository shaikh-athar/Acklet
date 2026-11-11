// client/apps/tool-file-converter/src/services/privacy-audit.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface NetworkAuditRecord {
  url: string;
  initiatorType?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrivacyAuditService {
  readonly networkRequestsCount = signal<number>(0);
  readonly isAuditing = signal<boolean>(false);
  readonly isOfflineReady = signal<boolean>(false);
  readonly isPopoverOpen = signal<boolean>(false);

  private observer: PerformanceObserver | null = null;
  private currentOrigin: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentOrigin = window.location.origin;
      this.initObserver();
      this.checkOfflineReadiness();
    }
  }

  /**
   * Evaluates whether a requested resource URL constitutes an active network request.
   * Ignores in-memory blob:, data: URIs, and non-HTTP protocols.
   */
  shouldCountResource(url: string, origin: string = this.currentOrigin): boolean {
    if (!url) return false;
    const lower = url.trim().toLowerCase();

    // 1. Ignore in-memory browser blobs and embedded data strings
    if (lower.startsWith('blob:') || lower.startsWith('data:') || lower.startsWith('about:') || lower.startsWith('javascript:')) {
      return false;
    }

    // 2. Filter to same-origin or any external network fetch
    try {
      const parsed = new URL(url, origin || 'http://localhost');
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Resets the network audit counter and arms active tracking for conversion workloads.
   */
  startAudit(): void {
    this.networkRequestsCount.set(0);
    this.isAuditing.set(true);
  }

  /**
   * Disarms tracking when conversion completes or halts.
   */
  stopAudit(): void {
    this.isAuditing.set(false);
  }

  /**
   * Toggles the visible privacy proof popover.
   */
  togglePopover(): void {
    this.isPopoverOpen.update(v => !v);
  }

  closePopover(): void {
    this.isPopoverOpen.set(false);
  }

  /**
   * Verifies if the tool shell or service worker is actively cached in the browser.
   * Only claims offline capability if verified by CacheStorage or ServiceWorker controller.
   */
  async checkOfflineReadiness(): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.isOfflineReady.set(false);
      return false;
    }

    try {
      // 1. Check ServiceWorker controller
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller !== null) {
        this.isOfflineReady.set(true);
        return true;
      }

      // 2. Check CacheStorage for non-empty cached app shell
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        if (cacheKeys.length > 0) {
          for (const key of cacheKeys) {
            const cache = await window.caches.open(key);
            const requests = await cache.keys();
            if (requests.length > 0) {
              this.isOfflineReady.set(true);
              return true;
            }
          }
        }
      }
    } catch (_) {
      // Degrade gracefully if storage APIs are restricted
    }

    this.isOfflineReady.set(false);
    return false;
  }

  /**
   * Initializes browser PerformanceObserver to inspect resource traffic in real time.
   */
  private initObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        if (!this.isAuditing()) return;

        for (const entry of list.getEntries()) {
          if (this.shouldCountResource(entry.name)) {
            this.networkRequestsCount.update(c => c + 1);
          }
        }
      });

      this.observer.observe({ type: 'resource', buffered: false });
    } catch (_) {
      // PerformanceObserver resource type might not be supported in older test runners
    }
  }
}

