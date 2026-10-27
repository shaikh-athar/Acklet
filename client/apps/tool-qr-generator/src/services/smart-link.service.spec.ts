// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/smart-link.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { SmartLinkService } from './smart-link.service';
import {
  DYNAMIC_THRESHOLD_BYTES,
  NON_ASCII_THRESHOLD_BYTES,
  HYSTERESIS
} from './smart-link.config';

describe('SmartLinkService', () => {
  let service: SmartLinkService;
  let mockHttp: any;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();

    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    service = new SmartLinkService(mockHttp);
  });

  afterEach(() => {
    vi.useRealTimers();
    service.ngOnDestroy();
  });

  describe('decideMode() Thresholds and Logic', () => {
    it('returns direct for always-direct content types regardless of size', () => {
      const longWifi = 'WIFI:S:MyVeryLongNetworkNameThatTakesUpLotsOfBytes123456789;T:WPA;P:SuperLongSecretKey12345678901234567890;;';
      expect(service.decideMode('wifi', longWifi)).toBe('direct');
      expect(service.decideMode('phone', '+12345678901234567890')).toBe('direct');
      expect(service.decideMode('sms', 'SMSTO:+1234567890:Hello there this is an sms')).toBe('direct');
      expect(service.decideMode('geo', 'geo:37.7749,-122.4194?q=restaurants')).toBe('direct');
    });

    it('returns direct for empty or whitespace content', () => {
      expect(service.decideMode('url', '')).toBe('direct');
      expect(service.decideMode('text', '   \n\t  ')).toBe('direct');
    });

    it('returns direct for pure ASCII content at or below 180 bytes', () => {
      const ascii180 = 'A'.repeat(180);
      expect(service.decideMode('text', ascii180)).toBe('direct');
    });

    it('promotes to dynamic for pure ASCII content above 180 bytes', () => {
      const ascii181 = 'A'.repeat(181);
      expect(service.decideMode('text', ascii181)).toBe('dynamic');
    });

    it('promotes to dynamic for non-ASCII (Hindi/emoji) above 60 bytes', () => {
      // 'नमस्ते' is 6 characters, 18 bytes
      const hindiUnder60 = 'नमस्ते '.repeat(3); // 21 bytes
      expect(service.decideMode('text', hindiUnder60)).toBe('direct');

      const hindiOver60 = 'नमस्ते दुनिया भारत '.repeat(3); // ~63 bytes
      expect(new TextEncoder().encode(hindiOver60).length).toBeGreaterThan(NON_ASCII_THRESHOLD_BYTES);
      expect(service.decideMode('text', hindiOver60)).toBe('dynamic');

      const emojiOver60 = '🚀🎉🔥✨🌟💡🎯'.repeat(3); // 7 * 4 * 3 = 84 bytes
      expect(service.decideMode('text', emojiOver60)).toBe('dynamic');
    });

    it('applies hysteresis buffer: does NOT flip back to direct immediately when slightly below threshold', () => {
      // Start in dynamic mode
      const currentMode = 'dynamic';

      // 175 bytes ASCII: below 180 bytes, but above demote threshold (180 * (1 - 0.15) = 153 bytes)
      const ascii175 = 'A'.repeat(175);
      expect(service.decideMode('text', ascii175, currentMode)).toBe('dynamic');

      // 160 bytes ASCII: still above 153 bytes
      const ascii160 = 'A'.repeat(160);
      expect(service.decideMode('text', ascii160, currentMode)).toBe('dynamic');

      // 150 bytes ASCII: <= 153 bytes, demotes back to direct
      const ascii150 = 'A'.repeat(150);
      expect(service.decideMode('text', ascii150, currentMode)).toBe('direct');
    });

    it('applies hysteresis buffer for non-ASCII content', () => {
      const currentMode = 'dynamic';

      // Demote threshold for non-ASCII: 60 * (1 - 0.15) = 51 bytes
      // 55 bytes of non-ASCII holds at dynamic
      const hindi55 = 'न'.repeat(18); // 18 chars * 3 bytes = 54 bytes
      expect(service.decideMode('text', hindi55, currentMode)).toBe('dynamic');

      // 48 bytes of non-ASCII (<= 51 bytes) demotes to direct
      const hindi48 = 'न'.repeat(16); // 16 chars * 3 bytes = 48 bytes
      expect(service.decideMode('text', hindi48, currentMode)).toBe('direct');
    });
  });

  describe('Sync Pipeline & Network Integration', () => {
    it('creates dynamic link on initial sync via POST', () => {
      mockHttp.post.mockReturnValue(
        of({
          success: true,
          message: 'Created',
          data: {
            code: 'xyz9876',
            shortUrl: 'https://acklet.dev/q/xyz9876',
            manageToken: 'tok_abc',
            expiresAt: '2026-11-25T00:00:00Z',
            status: 'ACTIVE',
            type: 'TEXT',
            contentBytes: 250
          }
        })
      );

      const longPayload = 'Meeting notes: '.repeat(20);
      service.syncPayload('text', longPayload);

      expect(service.isSmartLink()).toBe(true);
      expect(service.isLoading()).toBe(true);

      // Fast-forward debounce
      vi.advanceTimersByTime(650);

      expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/qr-links', {
        type: 'TEXT',
        payload: longPayload,
        mime: undefined
      });
      expect(service.shortUrl()).toBe('https://acklet.dev/q/xyz9876');
      expect(service.activeCode()).toBe('xyz9876');
      expect(service.activeToken()).toBe('tok_abc');
      expect(service.isLoading()).toBe(false);
    });

    it('reuses existing code via PUT when payload updates within same session', () => {
      mockHttp.post.mockReturnValue(
        of({
          success: true,
          data: {
            code: 'xyz9876',
            shortUrl: 'https://acklet.dev/q/xyz9876',
            manageToken: 'tok_abc',
            status: 'ACTIVE',
            type: 'TEXT'
          }
        })
      );
      mockHttp.put.mockReturnValue(
        of({
          success: true,
          data: {
            code: 'xyz9876',
            shortUrl: 'https://acklet.dev/q/xyz9876',
            status: 'ACTIVE',
            type: 'TEXT'
          }
        })
      );

      const initialPayload = 'First version of long content: '.repeat(15);
      service.syncPayload('text', initialPayload);
      vi.advanceTimersByTime(650);

      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      // Edit text while typing (second sync)
      const editedPayload = 'Second edited version of long content: '.repeat(15);
      service.syncPayload('text', editedPayload);
      vi.advanceTimersByTime(650);

      // Must call PUT with active code and X-Manage-Token header
      expect(mockHttp.put).toHaveBeenCalledWith(
        '/api/v1/qr-links/xyz9876',
        {
          type: 'TEXT',
          payload: editedPayload,
          mime: undefined
        },
        expect.objectContaining({
          headers: expect.anything()
        })
      );
      expect(service.shortUrl()).toBe('https://acklet.dev/q/xyz9876');
    });

    it('handles sync error gracefully and exposes error signal', () => {
      mockHttp.post.mockReturnValue(throwError(() => ({ error: { message: 'Network offline' } })));

      service.syncPayload('text', 'A'.repeat(300));
      vi.advanceTimersByTime(650);

      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Network offline');
    });

    it('resets active session when resetActiveSession() is called', () => {
      service.activeCode.set('abc');
      service.activeToken.set('tok');
      service.shortUrl.set('https://acklet.dev/q/abc');

      service.resetActiveSession();

      expect(service.activeCode()).toBeNull();
      expect(service.activeToken()).toBeNull();
      expect(service.shortUrl()).toBeNull();
    });

    it('calls markDownloaded on download', () => {
      mockHttp.post.mockReturnValue(of({ success: true }));
      service.activeCode.set('k8s9x2a');

      service.markDownloaded();

      expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/qr-links/k8s9x2a/mark-downloaded', {});
    });
  });

  describe('LocalStorage Persistence', () => {
    it('saves created smart links and loads them', () => {
      service.saveStoredLink({
        code: 'item1',
        manageToken: 'tok1',
        type: 'TEXT',
        shortUrl: 'https://acklet.dev/q/item1',
        createdAt: '2026-10-25T00:00:00Z',
        status: 'ACTIVE'
      });

      const loaded = service.loadStoredLinks();
      expect(loaded.length).toBe(1);
      expect(loaded[0].code).toBe('item1');
    });

    it('removes stored link by code', () => {
      service.saveStoredLink({
        code: 'item1',
        manageToken: 'tok1',
        type: 'TEXT',
        shortUrl: 'https://acklet.dev/q/item1',
        createdAt: '2026-10-25T00:00:00Z'
      });
      service.saveStoredLink({
        code: 'item2',
        manageToken: 'tok2',
        type: 'URL',
        shortUrl: 'https://acklet.dev/q/item2',
        createdAt: '2026-10-25T00:00:00Z'
      });

      expect(service.loadStoredLinks().length).toBe(2);

      service.removeStoredLink('item1');
      const remaining = service.loadStoredLinks();
      expect(remaining.length).toBe(1);
      expect(remaining[0].code).toBe('item2');
    });
  });

  describe('Phase 3 Dynamic Links Management API', () => {
    beforeEach(() => {
      mockHttp.post.mockReturnValue(of({ success: true, data: [] }));
      service.saveStoredLink({
        code: 'dyn101',
        manageToken: 'tok_secret_101',
        type: 'URL',
        shortUrl: 'https://acklet.link/q/dyn101',
        createdAt: '2026-10-24T10:00:00Z',
        preview: 'https://example.com/initial',
        payload: 'https://example.com/initial',
        status: 'ACTIVE'
      });
      service.managedLinks.set([
        {
          code: 'dyn101',
          shortUrl: 'https://acklet.link/q/dyn101',
          type: 'URL',
          preview: 'https://example.com/initial',
          payload: 'https://example.com/initial',
          scanCount: 0,
          createdAt: '2026-10-24T10:00:00Z',
          status: 'ACTIVE',
          manageToken: 'tok_secret_101'
        }
      ]);
    });

    it('fetches live summaries for stored links via /lookup endpoint', () => {
      mockHttp.post.mockReturnValue(
        of({
          success: true,
          data: [
            {
              code: 'dyn101',
              shortUrl: 'https://acklet.link/q/dyn101',
              type: 'URL',
              preview: 'https://example.com/initial',
              scanCount: 15,
              createdAt: '2026-10-24T10:00:00Z',
              expiresAt: '2027-10-24T10:00:00Z',
              lastScanAt: '2026-10-24T12:00:00Z',
              status: 'ACTIVE',
              contentBytes: 28
            }
          ]
        })
      );

      service.fetchLiveSummaries().subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].code).toBe('dyn101');
        expect(results[0].scanCount).toBe(15);
      });

      expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/qr-links/lookup', {
        links: [{ code: 'dyn101', token: 'tok_secret_101' }]
      });
      expect(service.isFetchingSummaries()).toBe(false);
      expect(service.isOffline()).toBe(false);
    });

    it('falls back to cached links and sets isOffline when lookup fails', () => {
      mockHttp.post.mockReturnValue(throwError(() => ({ message: 'Network disconnected' })));

      service.fetchLiveSummaries().subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].code).toBe('dyn101');
      });

      expect(service.isOffline()).toBe(true);
      expect(service.summaryError()).toContain('Offline');
    });

    it('toggles link status from ACTIVE to DISABLED', () => {
      mockHttp.post.mockReturnValue(of({ success: true }));

      service.toggleLinkStatus('dyn101').subscribe();

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/v1/qr-links/dyn101/disable',
        {},
        expect.objectContaining({
          headers: expect.anything()
        })
      );
    });

    it('extends link retention by +1 year', () => {
      mockHttp.post.mockReturnValue(
        of({
          success: true,
          data: {
            expiresAt: '2028-10-24T10:00:00Z',
            status: 'ACTIVE'
          }
        })
      );

      service.extendLink('dyn101').subscribe(res => {
        expect(res.expiresAt).toBe('2028-10-24T10:00:00Z');
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/v1/qr-links/dyn101/extend',
        {},
        expect.objectContaining({
          headers: expect.anything()
        })
      );
    });

    it('deletes link and cleans up from state and storage', () => {
      mockHttp.delete.mockReturnValue(of({ success: true }));

      service.deleteLink('dyn101').subscribe();

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/api/v1/qr-links/dyn101',
        expect.objectContaining({
          headers: expect.anything()
        })
      );
      expect(service.loadStoredLinks().length).toBe(0);
      expect(service.managedLinks().length).toBe(0);
    });

    it('updates link payload via PUT request', () => {
      mockHttp.put.mockReturnValue(
        of({
          success: true,
          data: {
            code: 'dyn101',
            contentBytes: 45,
            status: 'ACTIVE'
          }
        })
      );

      service.updateLinkPayload('dyn101', 'https://example.com/updated-target', 'URL').subscribe();

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/api/v1/qr-links/dyn101',
        {
          type: 'URL',
          payload: 'https://example.com/updated-target',
          mime: undefined
        },
        expect.objectContaining({
          headers: expect.anything()
        })
      );

      const updated = service.loadStoredLinks().find(l => l.code === 'dyn101');
      expect(updated?.payload).toBe('https://example.com/updated-target');
    });

    it('fetches full details via getLinkDetails', () => {
      mockHttp.get.mockReturnValue(
        of({
          success: true,
          data: {
            code: 'dyn101',
            payload: 'Full text payload here...',
            type: 'TEXT',
            scanCount: 10
          }
        })
      );

      service.getLinkDetails('dyn101').subscribe(details => {
        expect(details.payload).toBe('Full text payload here...');
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/api/v1/qr-links/dyn101/stats',
        expect.objectContaining({
          headers: expect.anything()
        })
      );
    });

    it('loads link into studio editing mode', () => {
      service.loadLinkIntoStudio('dyn101', 'tok_custom', 'https://acklet.link/q/dyn101');

      expect(service.activeCode()).toBe('dyn101');
      expect(service.activeToken()).toBe('tok_custom');
      expect(service.shortUrl()).toBe('https://acklet.link/q/dyn101');
      expect(service.mode()).toBe('dynamic');
    });

    it('computeEffectiveShortUrl uses configured public base URL when provided', () => {
      (window as any).__ACKLET_CONFIG__ = { qrPublicBaseUrl: 'https://qr.publicdomain.org/q' };
      const effective = service.computeEffectiveShortUrl({
        code: 'pub123',
        shortUrl: 'http://localhost:8080/q/pub123'
      });
      expect(effective).toBe('https://qr.publicdomain.org/q/pub123');
      delete (window as any).__ACKLET_CONFIG__;
    });

    it('isShortUrlLocalOrPrivate accurately flags local and RFC1918 private addresses', () => {
      expect(service.isShortUrlLocalOrPrivate('http://localhost:8080/q/abc')).toBe(true);
      expect(service.isShortUrlLocalOrPrivate('http://127.0.0.1:8080/q/abc')).toBe(true);
      expect(service.isShortUrlLocalOrPrivate('http://192.168.1.25:4200/q/abc')).toBe(true);
      expect(service.isShortUrlLocalOrPrivate('http://10.0.1.5/q/abc')).toBe(true);

      expect(service.isShortUrlLocalOrPrivate('https://acklet.dev/q/abc')).toBe(false);
      expect(service.isShortUrlLocalOrPrivate('https://melvin-tunnel.ngrok-free.dev/q/abc')).toBe(false);
    });

    it('emits onShortUrlReady$ only upon confirmed HTTP sync', () => {
      let readyUrl: string | null = null;
      service.onShortUrlReady$.subscribe(url => {
        readyUrl = url;
      });

      mockHttp.post.mockReturnValue(
        of({
          success: true,
          data: {
            code: 'ready77',
            shortUrl: 'https://acklet.dev/q/ready77',
            manageToken: 'tok_ready',
            expiresAt: '2027-01-01T00:00:00Z',
            status: 'ACTIVE',
            type: 'URL',
            contentBytes: 250
          }
        })
      );

      service.syncPayload('url', 'https://example.com/very-long-url-requiring-shortlink-promotion-'.repeat(5));
      vi.advanceTimersByTime(650);

      expect(readyUrl).toBe('https://acklet.dev/q/ready77');
    });

    it('emits onSyncError$ when HTTP request fails', () => {
      let errorReceived: string | null = null;
      service.onSyncError$.subscribe(err => {
        errorReceived = err;
      });

      mockHttp.post.mockReturnValue(
        throwError(() => ({ error: { message: 'Network offline: server unreachable' } }))
      );

      service.syncPayload('url', 'https://example.com/very-long-url-requiring-shortlink-promotion-'.repeat(5));
      vi.advanceTimersByTime(650);

      expect(errorReceived).toBe('Network offline: server unreachable');
      expect(service.error()).toBe('Network offline: server unreachable');
    });
  });
});
