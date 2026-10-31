// apps/tool-urlshortener/src/services/shortener.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShortenerSecurityService } from './shortener-security.service';
import { ShortenerStorageService, computeLinkStatus, ShortLinkRecord } from './shortener-storage.service';
import { ShortenerService, ShortenRequest } from './shortener.service';
import { TOOL_REGISTRY } from '@acklet/tool-registry';
import { of } from 'rxjs';

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('URL Shortener - Client Specification Tests', () => {

  describe('Manifest & Navigation Integrity', () => {
    const manifest = TOOL_REGISTRY['urlshortener'];

    it('should declare subItems with My links route', () => {
      expect(manifest.subItems).toBeDefined();
      expect(manifest.subItems!.length).toBeGreaterThan(0);
      const linksSubItem = manifest.subItems!.find(s => s.id === 'links');
      expect(linksSubItem).toBeDefined();
      expect(linksSubItem!.label).toBe('My links');
      expect(linksSubItem!.path).toBe('/links');
    });

    it('should preserve isolated amber/bronze identity', () => {
      expect(manifest.accent).toBe('amber');
      expect(manifest.accentHue).toBe(38);
    });
  });

  describe('ShortenerSecurityService - Password & URL Validation', () => {
    let security: ShortenerSecurityService;

    beforeEach(() => {
      security = new ShortenerSecurityService();
    });

    it('should validate minimum password length from config', () => {
      expect(security.validatePassword('').isValid).toBe(false);
      expect(security.validatePassword('12345').isValid).toBe(false);
      expect(security.validatePassword('123456').isValid).toBe(true);
      expect(security.validatePassword('strong-pass-99').isValid).toBe(true);
    });

    it('should block SSRF and unsafe schemes', () => {
      expect(security.validateDestinationUrl('javascript:alert(1)').isValid).toBe(false);
      expect(security.validateDestinationUrl('data:text/html,bad').isValid).toBe(false);
      expect(security.validateDestinationUrl('http://127.0.0.1/admin').isValid).toBe(false);
      expect(security.validateDestinationUrl('http://localhost:8080').isValid).toBe(false);
      expect(security.validateDestinationUrl('http://192.168.1.1').isValid).toBe(false);
      expect(security.validateDestinationUrl('https://example.com').isValid).toBe(true);
    });
  });

  describe('ShortenerStorageService - Token Management & Offline Cache', () => {
    let storage: ShortenerStorageService;

    beforeEach(() => {
      storage = new ShortenerStorageService();
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });

    it('should compute status deterministically according to specifications', () => {
      const now = Date.now();

      // 1. Deactivated takes highest priority
      const deactivated: ShortLinkRecord = {
        code: 'd1',
        targetUrl: 'https://example.com',
        domain: 'example.com',
        createdAt: now,
        expiresAt: now + 100000,
        clicks: 0,
        isDeactivated: true
      };
      expect(computeLinkStatus(deactivated)).toBe('DEACTIVATED');

      // 2. Scheduled in future
      const scheduled: ShortLinkRecord = {
        code: 's1',
        targetUrl: 'https://example.com',
        domain: 'example.com',
        createdAt: now,
        expiresAt: now + 100000,
        startDate: now + 50000,
        clicks: 0
      };
      expect(computeLinkStatus(scheduled)).toBe('SCHEDULED');

      // 3. Expired in past
      const expired: ShortLinkRecord = {
        code: 'e1',
        targetUrl: 'https://example.com',
        domain: 'example.com',
        createdAt: now - 100000,
        expiresAt: now - 1000,
        clicks: 0
      };
      expect(computeLinkStatus(expired)).toBe('EXPIRED');

      // 4. Click limit reached
      const limitReached: ShortLinkRecord = {
        code: 'l1',
        targetUrl: 'https://example.com',
        domain: 'example.com',
        createdAt: now,
        expiresAt: now + 100000,
        clicks: 10,
        maxClicks: 10
      };
      expect(computeLinkStatus(limitReached)).toBe('LIMIT_REACHED');

      // 5. Active
      const active: ShortLinkRecord = {
        code: 'a1',
        targetUrl: 'https://example.com',
        domain: 'example.com',
        createdAt: now,
        expiresAt: now + 100000,
        clicks: 3,
        maxClicks: 10
      };
      expect(computeLinkStatus(active)).toBe('ACTIVE');
    });

    it('should export links to RFC 4180 CSV correctly', () => {
      const links: ShortLinkRecord[] = [
        {
          code: 'testcode',
          targetUrl: 'https://example.com/test,with,commas',
          domain: 'example.com',
          label: 'Test "Label"',
          createdAt: 1700000000000,
          expiresAt: null,
          clicks: 5,
          hasPassword: true
        }
      ];

      const csv = storage.exportToCsv(links, 'https://urlshortener.acklet.com/s');
      expect(csv).toContain('Short Code');
      expect(csv).toContain('"testcode"');
      expect(csv).toContain('"https://urlshortener.acklet.com/s/testcode"');
      expect(csv).toContain('"https://example.com/test,with,commas"');
      expect(csv).toContain('"Test ""Label"""');
      expect(csv).toContain('"Yes"');
    });

    it('should export and import recovery backup files and restore owner token', async () => {
      const token = storage.getOrCreateOwnerToken();
      const sampleLinks: ShortLinkRecord[] = [{
        code: 'rec1',
        targetUrl: 'https://example.com/saved',
        domain: 'example.com',
        ownerToken: token,
        createdAt: Date.now(),
        expiresAt: null,
        clicks: 3
      }];

      const recoveryJson = await storage.exportRecoveryFile(sampleLinks);
      expect(recoveryJson).toContain('rec1');
      expect(recoveryJson).toContain(token);

      // Simulate a fresh browser
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      const freshStorage = new ShortenerStorageService();

      const importResult = await freshStorage.importRecoveryFile(recoveryJson);
      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBe(1);
      expect(freshStorage.getOrCreateOwnerToken()).toBe(token);
    });

    it('should extract legacy migration candidates and mark migration complete', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('acklet_urlshortener_all_links', JSON.stringify([
          { code: 'old1', targetUrl: 'https://example.com/old' }
        ]));
      }

      const candidates = storage.getLegacyMigrationCandidates();
      expect(candidates.length).toBe(1);
      expect(candidates[0].code).toBe('old1');

      storage.markMigrationComplete();
      expect(storage.isMigrated()).toBe(true);
      expect(storage.getLegacyMigrationCandidates().length).toBe(0);
    });

    it('should strip passwords, hashes, and mask protected destinations in storage cache', () => {
      const records: ShortLinkRecord[] = [
        {
          code: 'pub1',
          targetUrl: 'https://example.com/public',
          domain: 'example.com',
          createdAt: Date.now(),
          expiresAt: null,
          clicks: 0,
          hasPassword: false
        },
        {
          code: 'prot1',
          targetUrl: 'https://secret.com/vault',
          domain: 'secret.com',
          createdAt: Date.now(),
          expiresAt: null,
          clicks: 0,
          hasPassword: true,
          passwordHash: '$2a$10$hashed_test_password'
        }
      ];

      storage.updateDisplayCache(records);
      const cached = storage.getCachedMyLinks();

      expect(cached.length).toBe(2);
      expect(cached[0].targetUrl).toBe('https://example.com/public');
      expect(cached[1].targetUrl).toBe('', 'Protected link destination must be masked in local storage');
      expect((cached[1] as any).passwordHash).toBeUndefined('Password hash must never be stored in local cache');
    });
  });

  describe('ShortenerService - Backend API Integration', () => {
    let service: ShortenerService;
    let storage: ShortenerStorageService;
    let security: ShortenerSecurityService;
    let mockHttp: any;

    beforeEach(() => {
      security = new ShortenerSecurityService();
      storage = new ShortenerStorageService();
      mockHttp = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      };
      service = new ShortenerService(security, storage, mockHttp as any);
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });

    it('should build canonical short URL targeting /s/ prefix', () => {
      const shortUrl = service.buildShortUrl('mySlug');
      expect(shortUrl).toContain('/s/mySlug');
      const previewUrl = service.buildPreviewUrl('mySlug');
      expect(previewUrl).toContain('/s/mySlug+');
    });

    it('should call backend POST /api/v1/short-links when shortening a URL', async () => {
      const mockBackendResponse = {
        success: true,
        data: {
          code: 'new123',
          shortUrl: 'http://localhost:8080/s/new123',
          targetUrl: 'https://example.com/target',
          ownerToken: 'tok_server_token_123',
          createdAt: new Date().toISOString(),
          status: 'ACTIVE'
        }
      };

      mockHttp.post.mockReturnValue(of(mockBackendResponse));

      const req: ShortenRequest = {
        url: 'https://example.com/target',
        expiryPreset: '30_days',
        label: 'My Link'
      };

      const result = await service.shortenUrl(req);
      expect(result.success).toBe(true);
      expect(result.code).toBe('new123');
      expect(storage.getOrCreateOwnerToken()).toBe('tok_server_token_123');
      expect(mockHttp.post).toHaveBeenCalled();
    });

    it('should fetch links from backend and update display cache', async () => {
      const mockListResponse = {
        success: true,
        data: {
          items: [
            {
              code: 'srv1',
              targetUrl: 'https://example.com',
              createdAt: new Date().toISOString(),
              clicks: 4,
              status: 'ACTIVE'
            }
          ],
          total: 1
        }
      };

      mockHttp.get.mockReturnValue(of(mockListResponse));

      const links = await service.getMyLinks();
      expect(links.length).toBe(1);
      expect(links[0].code).toBe('srv1');
      expect(links[0].clicks).toBe(4);

      // Verify display cache is updated
      const cached = storage.getCachedMyLinks();
      expect(cached.length).toBe(1);
      expect(cached[0].code).toBe('srv1');
    });

    it('should build QR Generator deep link handoff parameters correctly', () => {
      const handoffUrl = service.buildQrGeneratorHandoffUrl('http://localhost:4200/s/test');
      expect(handoffUrl).toContain('type=url');
      expect(handoffUrl).toContain('source=urlshortener');
      expect(handoffUrl).toContain(encodeURIComponent('http://localhost:4200/s/test'));
    });
  });

});
