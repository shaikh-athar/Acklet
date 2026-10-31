// apps/tool-urlshortener/src/services/shortener.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SHORTENER_CONFIG, ExpiryPreset } from './shortener.config';
import { ShortenerSecurityService } from './shortener-security.service';
import { ShortenerStorageService, ShortLinkRecord, LinkStatus, computeLinkStatus } from './shortener-storage.service';
import { environment } from '../environments/environment';
import { getToolUrl } from '@acklet/shared';
import { firstValueFrom } from 'rxjs';

export interface ShortenRequest {
  url: string;
  customAlias?: string;
  expiryPreset: ExpiryPreset;
  password?: string;
  maxClicks?: number | null;
  isOneTime?: boolean;
  startDate?: number | null;
  label?: string;
}

export interface ShortenResult {
  success: boolean;
  code?: string;
  shortUrl?: string;
  previewUrl?: string;
  record?: ShortLinkRecord;
  error?: string;
}

export type ResolutionStatus =
  | 'ACTIVE'
  | 'NOT_FOUND'
  | 'DEACTIVATED'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'LIMIT_REACHED'
  | 'PASSWORD_REQUIRED';

@Injectable({
  providedIn: 'root'
})
export class ShortenerService {
  private readonly security: ShortenerSecurityService;
  private readonly storage: ShortenerStorageService;
  private readonly http: HttpClient;

  private readonly API_BASE = '/api/v1/short-links';

  constructor(
    security?: ShortenerSecurityService,
    storage?: ShortenerStorageService,
    http?: HttpClient
  ) {
    this.security = security ?? inject(ShortenerSecurityService, { optional: true }) ?? new ShortenerSecurityService();
    this.storage = storage ?? inject(ShortenerStorageService, { optional: true }) ?? new ShortenerStorageService();
    this.http = http ?? inject(HttpClient);
  }

  /**
   * Generates a shortened URL by calling the server-side Shortener API.
   */
  async shortenUrl(request: ShortenRequest): Promise<ShortenResult> {
    // 1. Client-side sanity checks
    const urlValidation = this.security.validateDestinationUrl(request.url);
    if (!urlValidation.isValid || !urlValidation.cleanUrl) {
      return { success: false, error: urlValidation.error || 'Enter a valid link starting with http:// or https://' };
    }

    if (request.password && request.password.trim()) {
      const pwValidation = this.security.validatePassword(request.password);
      if (!pwValidation.isValid) {
        return { success: false, error: pwValidation.error || 'Password is too short' };
      }
    }

    if (request.customAlias && request.customAlias.trim()) {
      const aliasValidation = this.security.validateCustomAlias(request.customAlias.trim());
      if (!aliasValidation.isValid) {
        return { success: false, error: aliasValidation.error || 'Enter a valid alias' };
      }
    }

    // 2. Compute expiration timestamp
    const now = Date.now();
    const expiryOption = SHORTENER_CONFIG.expiryOptions.find(o => o.id === request.expiryPreset)
      || SHORTENER_CONFIG.expiryOptions.find(o => o.id === SHORTENER_CONFIG.defaultExpiry)!;
    const expiresAt = expiryOption.durationMs ? new Date(now + expiryOption.durationMs).toISOString() : null;
    const startDate = request.startDate && request.startDate > now ? new Date(request.startDate).toISOString() : null;

    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    const body = {
      targetUrl: urlValidation.cleanUrl,
      customAlias: request.customAlias?.trim() || undefined,
      password: request.password?.trim() || undefined,
      label: request.label?.trim() || undefined,
      maxClicks: request.maxClicks && request.maxClicks > 0 ? request.maxClicks : undefined,
      isOneTime: !!request.isOneTime,
      startDate: startDate || undefined,
      expiresAt: expiresAt || undefined
    };

    try {
      const response: any = await firstValueFrom(
        this.http.post<any>(this.API_BASE, body, { headers })
      );

      if (response && response.success && response.data) {
        const data = response.data;
        if (data.ownerToken) {
          this.storage.setOwnerToken(data.ownerToken);
        }
        const record = this.mapResponseToRecord(data);
        return {
          success: true,
          code: data.code,
          shortUrl: data.shortUrl || this.buildShortUrl(data.code),
          previewUrl: data.previewUrl || this.buildPreviewUrl(data.code),
          record
        };
      }

      return {
        success: false,
        error: response?.message || 'Could not shorten link'
      };
    } catch (err: any) {
      const status = err?.status;
      if (status === 409) {
        return { success: false, error: 'That alias is already taken. Try another.' };
      }
      if (status === 429) {
        return { success: false, error: 'Rate limit reached. Try again in a moment.' };
      }
      return {
        success: false,
        error: err?.error?.message || err?.message || 'Could not shorten link. Try again in a moment.'
      };
    }
  }

  /**
   * Fetches the owner's links from the backend server.
   */
  async getMyLinks(search?: string, status?: string): Promise<ShortLinkRecord[]> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    let params: any = { page: 0, size: 50 };
    if (search) params.search = search;
    if (status) params.status = status;

    try {
      const res: any = await firstValueFrom(
        this.http.get<any>(this.API_BASE, { headers, params })
      );

      if (res && res.success && res.data && res.data.items) {
        const records = res.data.items.map((i: any) => this.mapResponseToRecord(i));
        this.storage.updateDisplayCache(records);
        return records;
      }
    } catch (err) {
      console.warn('[ShortenerService] Failed to fetch links from backend, falling back to cache:', err);
    }

    return this.storage.getCachedMyLinks();
  }

  /**
   * Updates an existing link on the backend.
   */
  async updateLink(code: string, updates: Partial<ShortLinkRecord>): Promise<ShortLinkRecord> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    const body: any = {};
    if (updates.targetUrl) body.targetUrl = updates.targetUrl;
    if (updates.label !== undefined) body.label = updates.label;
    if (updates.maxClicks !== undefined) body.maxClicks = updates.maxClicks;
    if (updates.isDeactivated !== undefined) body.isDeactivated = updates.isDeactivated;
    if (updates.expiresAt !== undefined) {
      body.expiresAt = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null;
    }
    if (updates.startDate !== undefined) {
      body.startDate = updates.startDate ? new Date(updates.startDate).toISOString() : null;
    }

    const res: any = await firstValueFrom(
      this.http.put<any>(`${this.API_BASE}/${encodeURIComponent(code)}`, body, { headers })
    );

    if (res && res.success && res.data) {
      return this.mapResponseToRecord(res.data);
    }
    throw new Error(res?.message || 'Failed to update link');
  }

  /**
   * Deactivates a link on the backend.
   */
  async deactivateLink(code: string): Promise<ShortLinkRecord> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/${encodeURIComponent(code)}/deactivate`, {}, { headers })
    );

    if (res && res.success && res.data) {
      return this.mapResponseToRecord(res.data);
    }
    throw new Error(res?.message || 'Failed to deactivate link');
  }

  /**
   * Reactivates a link on the backend.
   */
  async reactivateLink(code: string): Promise<ShortLinkRecord> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/${encodeURIComponent(code)}/reactivate`, {}, { headers })
    );

    if (res && res.success && res.data) {
      return this.mapResponseToRecord(res.data);
    }
    throw new Error(res?.message || 'Failed to reactivate link');
  }

  /**
   * Deletes a link on the backend.
   */
  async deleteLink(code: string): Promise<void> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({
      'X-Owner-Token': ownerToken
    });

    await firstValueFrom(
      this.http.delete<any>(`${this.API_BASE}/${encodeURIComponent(code)}`, { headers })
    );
  }

  /**
   * Bulk deactivates multiple links.
   */
  async bulkDeactivate(codes: string[]): Promise<number> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({ 'X-Owner-Token': ownerToken });
    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/bulk/deactivate`, { codes }, { headers })
    );
    return res?.data || 0;
  }

  /**
   * Bulk reactivates multiple links.
   */
  async bulkReactivate(codes: string[]): Promise<number> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({ 'X-Owner-Token': ownerToken });
    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/bulk/reactivate`, { codes }, { headers })
    );
    return res?.data || 0;
  }

  /**
   * Bulk deletes multiple links.
   */
  async bulkDelete(codes: string[]): Promise<number> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({ 'X-Owner-Token': ownerToken });
    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/bulk/delete`, { codes }, { headers })
    );
    return res?.data || 0;
  }

  async bulkRestore(codes: string[]): Promise<number> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({ 'X-Owner-Token': ownerToken });
    const res: any = await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/bulk/restore`, { codes }, { headers })
    );
    return res?.data || 0;
  }

  /**
   * Retrieves 7d/30d analytics for a link.
   */
  async getLinkStats(code: string): Promise<any> {
    const ownerToken = this.storage.getOrCreateOwnerToken();
    const headers = new HttpHeaders({ 'X-Owner-Token': ownerToken });
    const res: any = await firstValueFrom(
      this.http.get<any>(`${this.API_BASE}/${encodeURIComponent(code)}/stats`, { headers })
    );
    return res?.data || null;
  }

  /**
   * Reports a link for policy violations.
   */
  async reportLink(code: string, reason: string, comment?: string): Promise<void> {
    await firstValueFrom(
      this.http.post<any>(`${this.API_BASE}/${encodeURIComponent(code)}/report`, { reason, comment })
    );
  }

  /**
   * Duplicates an existing link by creating a fresh copy on the backend.
   */
  async duplicateLink(code: string): Promise<ShortenResult> {
    const links = await this.getMyLinks();
    const source = links.find(l => l.code === code);
    if (!source) {
      return { success: false, error: 'Link not found' };
    }

    return this.shortenUrl({
      url: source.targetUrl,
      label: source.label ? `${source.label} (Copy)` : 'Copy',
      expiryPreset: '1_year',
      maxClicks: source.maxClicks,
      isOneTime: source.isOneTime
    });
  }

  /**
   * Checks custom alias availability against the server.
   */
  async checkAliasAvailability(alias: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.get<any>(`${this.API_BASE}/availability?code=${encodeURIComponent(alias)}`)
      );
      return !!(res && res.data && res.data.available);
    } catch {
      return false;
    }
  }

  /**
   * Silent one-time background migration of legacy local links to the backend.
   */
  async migrateLocalLinks(): Promise<void> {
    if (this.storage.isMigrated()) return;

    const candidates = this.storage.getLegacyMigrationCandidates();
    if (candidates.length === 0) {
      this.storage.markMigrationComplete();
      return;
    }

    const ownerToken = this.storage.getOrCreateOwnerToken();
    const body = {
      ownerToken,
      items: candidates.map(c => ({
        code: c.code,
        targetUrl: c.targetUrl,
        label: c.label,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        startDate: c.startDate,
        clicks: c.clicks,
        maxClicks: c.maxClicks,
        isOneTime: c.isOneTime,
        isDeactivated: c.isDeactivated,
        hasPassword: c.hasPassword,
        passwordHash: c.passwordHash
      }))
    };

    try {
      await firstValueFrom(this.http.post<any>(`${this.API_BASE}/migrate`, body));
      this.storage.markMigrationComplete();
      console.info(`[Shortener] Migrated ${candidates.length} legacy links to backend.`);
    } catch (e) {
      console.warn('[Shortener] Failed to migrate local links, will retry on next startup:', e);
    }
  }

  /**
   * Constructs the canonical short URL pointing to the /s/{code} redirect endpoint.
   */
  buildShortUrl(code: string): string {
    if (typeof window !== 'undefined') {
      const loc = window.location;
      return `${loc.protocol}//${loc.host}/s/${encodeURIComponent(code)}`;
    }
    return `https://${environment.shortDomain}/s/${encodeURIComponent(code)}`;
  }

  /**
   * Builds the safe preview URL (with + suffix).
   */
  buildPreviewUrl(code: string): string {
    const base = this.buildShortUrl(code);
    return `${base}+`;
  }

  /**
   * Generates the deep link URL for handoff to QR Generator with the short link prefilled.
   */
  buildQrGeneratorHandoffUrl(shortUrl: string): string {
    const encoded = encodeURIComponent(shortUrl);
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tool') || !host.includes('.')) {
        return `${window.location.origin}/?tool=qr&url=${encoded}&text=${encoded}&type=url&source=urlshortener`;
      }
    }
    try {
      const qrBaseUrl = getToolUrl('qr');
      return `${qrBaseUrl}?url=${encoded}&text=${encoded}&type=url&source=urlshortener`;
    } catch {
      if (typeof window !== 'undefined') {
        const host = window.location.host;
        const qrHost = host.replace(/^urlshortener\./, 'qr.');
        return `${window.location.protocol}//${qrHost}?url=${encoded}&text=${encoded}&type=url&source=urlshortener`;
      }
      return `https://qr.acklet.com?url=${encoded}&text=${encoded}&type=url&source=urlshortener`;
    }
  }

  private mapResponseToRecord(data: any): ShortLinkRecord {
    const parseEpoch = (val: any): number | null => {
      if (!val) return null;
      if (typeof val === 'number') return val;
      const parsed = Date.parse(val);
      return isNaN(parsed) ? null : parsed;
    };

    let domain = '';
    try {
      if (data.targetUrl) {
        domain = new URL(data.targetUrl).host;
      }
    } catch (_) {}

    return {
      code: data.code,
      targetUrl: data.targetUrl,
      domain,
      fallbackUrl: data.fallbackUrl,
      ownerToken: data.ownerToken,
      isOwner: true,
      createdAt: parseEpoch(data.createdAt) || Date.now(),
      expiresAt: parseEpoch(data.expiresAt),
      startDate: parseEpoch(data.startDate),
      clicks: data.clicks != null ? Number(data.clicks) : 0,
      label: data.label,
      tags: data.tags,
      maxClicks: data.maxClicks != null ? Number(data.maxClicks) : null,
      isOneTime: !!data.isOneTime,
      isDeactivated: !!data.isDeactivated,
      hasPassword: !!data.hasPassword,
      lastOpenedAt: parseEpoch(data.lastOpenedAt),
      flagged: !!data.flagged,
      reportCount: data.reportCount != null ? Number(data.reportCount) : 0,
      utmParams: data.utmParams
    };
  }
}
