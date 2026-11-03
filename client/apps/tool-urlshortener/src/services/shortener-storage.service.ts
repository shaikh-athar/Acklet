// apps/tool-urlshortener/src/services/shortener-storage.service.ts
import { Injectable } from '@angular/core';

export type LinkStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'LIMIT_REACHED' | 'DEACTIVATED';

export interface ShortLinkRecord {
  code: string;
  targetUrl: string;
  domain: string;
  ownerToken?: string;
  isOwner?: boolean;
  createdAt: number;
  expiresAt: number | null;
  clicks: number;
  isCustomAlias?: boolean;
  isDeleted?: boolean;
  isReported?: boolean;
  reportCount?: number;
  label?: string;
  tags?: string[];
  startDate?: number | null;
  maxClicks?: number | null;
  isOneTime?: boolean;
  isDeactivated?: boolean;
  lastOpenedAt?: number | null;
  passwordHash?: string | null;
  hasPassword?: boolean;
  fallbackUrl?: string;
  flagged?: boolean;
  utmParams?: Record<string, string>;
}

export interface LinkReport {
  code: string;
  reason: string;
  comment?: string;
  timestamp: number;
}

export interface RecoveryFileData {
  version: number;
  exportedAt: number;
  ownerToken: string;
  links: ShortLinkRecord[];
}

/**
 * Computes link status following the deterministic evaluation order:
 * 1. Deactivated -> 'DEACTIVATED'
 * 2. Scheduled in future -> 'SCHEDULED'
 * 3. Expired in past -> 'EXPIRED'
 * 4. Limit reached -> 'LIMIT_REACHED'
 * 5. Otherwise -> 'ACTIVE'
 */
export function computeLinkStatus(record: ShortLinkRecord): LinkStatus {
  if (record.isDeactivated || record.isDeleted) {
    return 'DEACTIVATED';
  }
  const now = Date.now();
  if (record.startDate && record.startDate > now) {
    return 'SCHEDULED';
  }
  if (record.expiresAt && record.expiresAt <= now) {
    return 'EXPIRED';
  }
  if (record.isOneTime && record.clicks >= 1) {
    return 'LIMIT_REACHED';
  }
  if (record.maxClicks != null && record.clicks >= record.maxClicks) {
    return 'LIMIT_REACHED';
  }
  return 'ACTIVE';
}

@Injectable({
  providedIn: 'root'
})
export class ShortenerStorageService {
  private readonly STORAGE_CACHE_KEY = 'acklet_urlshortener_display_cache';
  private readonly OWNER_TOKEN_KEY = 'acklet_urlshortener_owner_token';
  private readonly MIGRATION_FLAG_KEY = 'acklet_urlshortener_migrated_v1';
  private readonly OLD_ALL_LINKS_KEY = 'acklet_urlshortener_all_links';
  private readonly OLD_MY_LINKS_KEY = 'acklet_urlshortener_my_links';

  private cachedOwnerToken: string | null = null;
  private inMemoryDisplayCache: ShortLinkRecord[] = [];

  constructor() {
    this.purgeLegacySensitiveStorage();
  }

  /**
   * Safely purges any legacy unencrypted sensitive credentials from client-only iterations.
   */
  private purgeLegacySensitiveStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const keysToPurge = [
        'acklet_urlshortener_passwords',
        'acklet_urlshortener_keys',
        'acklet_shortener_pins'
      ];
      for (const k of keysToPurge) {
        localStorage.removeItem(k);
      }
    } catch (_) {}
  }

  /**
   * Retrieves or creates a durable owner management token for this browser.
   */
  getOrCreateOwnerToken(): string {
    if (this.cachedOwnerToken) return this.cachedOwnerToken;

    if (typeof localStorage !== 'undefined') {
      try {
        let tok = localStorage.getItem(this.OWNER_TOKEN_KEY);
        if (!tok) {
          tok = 'tok_' + this.generateCryptoRandomString(16);
          localStorage.setItem(this.OWNER_TOKEN_KEY, tok);
        }
        this.cachedOwnerToken = tok;
        return tok;
      } catch {
        // Fallback below
      }
    }

    this.cachedOwnerToken = 'tok_' + this.generateCryptoRandomString(16);
    return this.cachedOwnerToken;
  }

  /**
   * Sets the owner management token (e.g. from recovery import).
   */
  setOwnerToken(token: string): void {
    if (!token) return;
    this.cachedOwnerToken = token.trim();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.OWNER_TOKEN_KEY, this.cachedOwnerToken);
      } catch (_) {}
    }
  }

  /**
   * Updates the sanitized local display cache.
   * Strips passwords, password hashes, and masks destination URLs for protected links.
   */
  updateDisplayCache(records: ShortLinkRecord[]): void {
    if (!records) return;
    // Strip any sensitive credentials or protected destinations before caching
    const sanitized = records.map(r => {
      const isProtected = r.hasPassword || !!r.passwordHash;
      return {
        ...r,
        targetUrl: isProtected ? '' : r.targetUrl,
        passwordHash: undefined
      };
    });
    this.inMemoryDisplayCache = sanitized;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_CACHE_KEY, JSON.stringify(sanitized.slice(0, 100)));
      } catch (_) {}
    }
  }

  /**
   * Reads from the local display cache for instant UI rendering.
   */
  getCachedMyLinks(): ShortLinkRecord[] {
    if (this.inMemoryDisplayCache.length > 0) {
      return this.inMemoryDisplayCache;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.inMemoryDisplayCache = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  }

  /**
   * Checks whether legacy client-side storage has already been migrated.
   */
  isMigrated(): boolean {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(this.MIGRATION_FLAG_KEY) === 'true';
      } catch (_) {}
    }
    return false;
  }

  /**
   * Retrieves unmigrated legacy client links.
   */
  getLegacyMigrationCandidates(): ShortLinkRecord[] {
    if (this.isMigrated()) return [];
    if (typeof localStorage === 'undefined') return [];

    try {
      const allRaw = localStorage.getItem(this.OLD_ALL_LINKS_KEY);
      const myRaw = localStorage.getItem(this.OLD_MY_LINKS_KEY);
      const items: ShortLinkRecord[] = [];

      if (allRaw) {
        const parsedAll = JSON.parse(allRaw);
        if (Array.isArray(parsedAll)) {
          items.push(...parsedAll);
        }
      }
      if (myRaw) {
        const parsedMy = JSON.parse(myRaw);
        if (Array.isArray(parsedMy)) {
          for (const item of parsedMy) {
            if (!items.some(i => i.code === item.code)) {
              items.push(item);
            }
          }
        }
      }

      return items.filter(i => i && i.code && i.targetUrl);
    } catch (_) {
      return [];
    }
  }

  /**
   * Flags migration complete and safely removes legacy plaintext link storage.
   */
  markMigrationComplete(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.MIGRATION_FLAG_KEY, 'true');
        localStorage.removeItem(this.OLD_ALL_LINKS_KEY);
        localStorage.removeItem(this.OLD_MY_LINKS_KEY);
      } catch (_) {}
    }
  }

  /**
   * Exports link records to RFC 4180 standard CSV format.
   */
  exportToCsv(links: ShortLinkRecord[], baseUrl: string): string {
    const headers = [
      'Short Code',
      'Short URL',
      'Original URL',
      'Label',
      'Created At (UTC)',
      'Expires At (UTC)',
      'Scheduled Start (UTC)',
      'Clicks',
      'Max Clicks',
      'One-Time',
      'Password Protected',
      'Status'
    ];

    const escapeCsv = (val: any): string => {
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatDate = (epochMs: number | null | undefined): string => {
      if (!epochMs) return '';
      try {
        return new Date(epochMs).toISOString();
      } catch {
        return '';
      }
    };

    const rows = links.map(link => {
      const shortUrl = `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(link.code)}`;
      const status = computeLinkStatus(link);
      return [
        escapeCsv(link.code),
        escapeCsv(shortUrl),
        escapeCsv(link.targetUrl),
        escapeCsv(link.label || ''),
        escapeCsv(formatDate(link.createdAt)),
        escapeCsv(formatDate(link.expiresAt)),
        escapeCsv(formatDate(link.startDate)),
        escapeCsv(link.clicks || 0),
        escapeCsv(link.maxClicks != null ? link.maxClicks : ''),
        escapeCsv(link.isOneTime ? 'Yes' : 'No'),
        escapeCsv(link.hasPassword ? 'Yes' : 'No'),
        escapeCsv(status)
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Exports a structured JSON recovery file containing owner token and link definitions.
   */
  async exportRecoveryFile(links: ShortLinkRecord[]): Promise<string> {
    const ownerToken = this.getOrCreateOwnerToken();
    const data: RecoveryFileData = {
      version: 1,
      exportedAt: Date.now(),
      ownerToken,
      links: links.map(l => ({
        ...l,
        passwordHash: undefined // Never export hashes
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Imports a recovery file, restoring the owner token.
   */
  async importRecoveryFile(jsonContent: string): Promise<{
    success: boolean;
    importedCount: number;
    error?: string;
  }> {
    try {
      const parsed: RecoveryFileData = JSON.parse(jsonContent);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.links)) {
        return { success: false, importedCount: 0, error: "That file couldn't be read. Choose a backup file downloaded from this tool." };
      }

      if (parsed.ownerToken) {
        this.setOwnerToken(parsed.ownerToken);
      }

      const validLinks = parsed.links.filter(item =>
        item && typeof item === 'object' && item.code && item.targetUrl
      );

      this.updateDisplayCache(validLinks);

      return {
        success: true,
        importedCount: validLinks.length
      };
    } catch (err: any) {
      return {
        success: false,
        importedCount: 0,
        error: "That file couldn't be read. Choose a backup file downloaded from this tool."
      };
    }
  }

  private generateCryptoRandomString(bytesCount: number): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const arr = new Uint8Array(bytesCount);
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }
}
