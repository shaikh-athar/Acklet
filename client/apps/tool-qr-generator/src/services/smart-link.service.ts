// client/apps/tool-qr-generator/src/services/smart-link.service.ts
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Observable, of, EMPTY } from 'rxjs';
import { debounceTime, switchMap, catchError, tap, map } from 'rxjs/operators';
import { ContentType } from '../models/qr-generator.models';
import { getQrApiUrl } from './qr-api.util';
import {
  DYNAMIC_THRESHOLD_BYTES,
  MAX_DIRECT_VERSION,
  HYSTERESIS,
  DEBOUNCE_MS,
  NON_ASCII_THRESHOLD_BYTES,
  ALWAYS_DIRECT_TYPES,
  SMART_LINK_ELIGIBLE_TYPES
} from './smart-link.config';

export interface StoredSmartLink {
  code: string;
  manageToken: string;
  type: string;
  shortUrl: string;
  createdAt: string;
  preview?: string;
  payload?: string;
  status?: string;
  title?: string;
  explicit?: boolean;
}

export interface LiveSmartLink {
  code: string;
  shortUrl: string;
  type: string;
  preview?: string;
  payload?: string;
  scanCount: number;
  createdAt: string;
  expiresAt?: string;
  lastScanAt?: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED' | string;
  contentBytes?: number;
  manageToken: string;
  title?: string;
  isExtending?: boolean;
  isToggling?: boolean;
  isDeleting?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface QrLinkResponseData {
  code: string;
  shortUrl: string;
  manageToken?: string;
  expiresAt: string;
  status: string;
  type: string;
  contentBytes: number;
}

interface QrLinkLookupSummaryData {
  code: string;
  shortUrl: string;
  type: string;
  preview?: string;
  scanCount: number;
  createdAt: string;
  expiresAt?: string;
  lastScanAt?: string;
  status: string;
  contentBytes?: number;
  mime?: string;
}

const STORAGE_KEY = 'acklet_qr_smart_links';
const MAX_STORED_LINKS = 100;

@Injectable({
  providedIn: 'root'
})
export class SmartLinkService implements OnDestroy {
  private readonly http: HttpClient;

  get apiBase(): string {
    return getQrApiUrl('/api/v1/qr-links');
  }

  readonly mode = signal<'direct' | 'dynamic'>('direct');
  readonly isSmartLink = computed(() => this.mode() === 'dynamic');
  readonly shortUrl = signal<string | null>(null);
  readonly activeCode = signal<string | null>(null);
  readonly activeToken = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly storedLinks = signal<StoredSmartLink[]>([]);
  readonly onShortUrlReady$ = new Subject<string>();
  readonly onSyncError$ = new Subject<string>();

  readonly managedLinks = signal<LiveSmartLink[]>([]);
  readonly isFetchingSummaries = signal<boolean>(false);
  readonly isOffline = signal<boolean>(false);
  readonly summaryError = signal<string | null>(null);

  private currentContentType: ContentType | null = null;
  private readonly syncQueue$ = new Subject<{
    type: ContentType;
    payload: string;
    mime?: string;
  }>();

  constructor(http?: HttpClient) {
    this.http = http ?? inject(HttpClient);
    this.loadStoredLinks();
    this.initSyncPipeline();
  }

  ngOnDestroy(): void {
    this.syncQueue$.complete();
    this.onShortUrlReady$.complete();
    this.onSyncError$.complete();
  }

  /**
   * Decide between direct encoding and dynamic short link using byte counts,
   * non-ASCII checks, version capacity at EC level M, and hysteresis to prevent mode flickering.
   */
  decideMode(
    type: ContentType,
    payload: string,
    currentMode: 'direct' | 'dynamic' = this.mode()
  ): 'direct' | 'dynamic' {
    if (ALWAYS_DIRECT_TYPES.includes(type)) {
      return 'direct';
    }

    if (!payload || !payload.trim()) {
      return 'direct';
    }

    const trimmed = payload.trim();
    const bytes = new TextEncoder().encode(trimmed).length;
    const hasNonAscii = /[^\x00-\x7F]/.test(trimmed);

    if (currentMode === 'direct') {
      // Direct -> Dynamic promotion criteria
      if (hasNonAscii && bytes > NON_ASCII_THRESHOLD_BYTES) {
        return 'dynamic';
      }
      if (bytes > DYNAMIC_THRESHOLD_BYTES) {
        return 'dynamic';
      }
      return 'direct';
    } else {
      // Dynamic -> Direct demotion criteria (with hysteresis buffer)
      const byteDemoteThreshold = DYNAMIC_THRESHOLD_BYTES * (1 - HYSTERESIS); // 153 bytes
      const nonAsciiDemoteThreshold = NON_ASCII_THRESHOLD_BYTES * (1 - HYSTERESIS); // 51 bytes

      if (hasNonAscii) {
        if (bytes <= nonAsciiDemoteThreshold) {
          return 'direct';
        }
        return 'dynamic';
      }

      if (bytes <= byteDemoteThreshold) {
        return 'direct';
      }
      return 'dynamic';
    }
  }

  private lastSyncedPayload: string | null = null;
  private lastSyncedType: ContentType | null = null;

  /**
   * Enqueue a dynamic link sync request (debounced, cancels in-flight changes).
   */
  syncPayload(type: ContentType, payload: string, mime?: string): void {
    if (this.currentContentType && this.currentContentType !== type) {
      // Reset active session if the content type changed
      this.resetActiveSession();
    }
    this.currentContentType = type;

    const newMode = this.decideMode(type, payload, this.mode());
    this.mode.set(newMode);

    if (newMode === 'direct') {
      this.shortUrl.set(null);
      this.isLoading.set(false);
      this.error.set(null);
      this.lastSyncedPayload = null;
      this.lastSyncedType = null;
      return;
    }

    const trimmed = payload.trim();
    if (
      this.lastSyncedPayload === trimmed &&
      this.lastSyncedType === type &&
      (this.activeCode() || this.shortUrl())
    ) {
      // Content is already synchronized with the backend; avoid redundant network calls
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.syncQueue$.next({ type, payload, mime });
  }

  /**
   * Reset active code and token (e.g. when content is cleared or user switches content type).
   */
  resetActiveSession(): void {
    this.activeCode.set(null);
    this.activeToken.set(null);
    this.shortUrl.set(null);
    this.error.set(null);
    this.isLoading.set(false);
    this.lastSyncedPayload = null;
    this.lastSyncedType = null;
    this.lastQueuedPayload = '';
  }

  /**
   * Mark the active QR link as downloaded so the backend rescues it from 24h orphan cleanup.
   */
  markDownloaded(code?: string): void {
    const targetCode = code || this.activeCode();
    if (!targetCode) return;

    this.http.post<ApiResponse<void>>(`${this.apiBase}/${targetCode}/mark-downloaded`, {}).subscribe({
      next: () => { },
      error: () => { }
    });
  }

  /**
   * Retrieve stored smart links from local storage.
   */
  loadStoredLinks(): StoredSmartLink[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Only show explicitly created dynamic links (not auto-shortened raw text/long-urls)
          const explicitOnly = parsed.filter(item => item.explicit === true);
          this.storedLinks.set(explicitOnly);
          return explicitOnly;
        }
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
    return [];
  }

  /**
   * Save a newly created smart link to localStorage.
   */
  saveStoredLink(item: StoredSmartLink): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const itemToSave: StoredSmartLink = {
        ...item,
        explicit: item.explicit ?? true
      };
      const current = this.loadStoredLinks();
      const filtered = current.filter(l => l.code !== itemToSave.code);
      const updated = [itemToSave, ...filtered].slice(0, MAX_STORED_LINKS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.storedLinks.set(updated);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Remove a link from localStorage.
   */
  removeStoredLink(code: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const current = this.loadStoredLinks();
      const updated = current.filter(l => l.code !== code);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.storedLinks.set(updated);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Fetch live summaries and scan metrics from the backend for all stored links.
   * If network fails, falls back gracefully to cached items with an offline warning.
   */
  fetchLiveSummaries(): Observable<LiveSmartLink[]> {
    const stored = this.loadStoredLinks();
    if (stored.length === 0) {
      this.managedLinks.set([]);
      this.isFetchingSummaries.set(false);
      this.isOffline.set(false);
      return of([]);
    }

    // Set immediate cached state
    const cached: LiveSmartLink[] = stored.map(s => ({
      code: s.code,
      shortUrl: s.shortUrl,
      type: s.type,
      preview: s.preview || '',
      payload: s.payload,
      scanCount: 0,
      createdAt: s.createdAt,
      status: s.status || 'ACTIVE',
      manageToken: s.manageToken,
      title: s.title
    }));
    this.managedLinks.set(cached);
    this.isFetchingSummaries.set(true);
    this.summaryError.set(null);

    const lookupPayload = {
      links: stored.map(s => ({ code: s.code, token: s.manageToken }))
    };

    return this.http
      .post<ApiResponse<QrLinkLookupSummaryData[]>>(`${this.apiBase}/lookup`, lookupPayload)
      .pipe(
        tap(res => {
          this.isFetchingSummaries.set(false);
          this.isOffline.set(false);
          if (res && res.data) {
            const summaryMap = new Map<string, QrLinkLookupSummaryData>(
              res.data.map(item => [item.code, item])
            );
            const live: LiveSmartLink[] = stored.map(s => {
              const item = summaryMap.get(s.code);
              if (item) {
                return {
                  code: s.code,
                  shortUrl: item.shortUrl || s.shortUrl,
                  type: item.type || s.type,
                  preview: item.preview || s.preview || '',
                  payload: s.payload,
                  scanCount: item.scanCount ?? 0,
                  createdAt: item.createdAt || s.createdAt,
                  expiresAt: item.expiresAt,
                  lastScanAt: item.lastScanAt,
                  status: item.status || 'ACTIVE',
                  contentBytes: item.contentBytes,
                  manageToken: s.manageToken,
                  title: s.title
                };
              }
              return {
                code: s.code,
                shortUrl: s.shortUrl,
                type: s.type,
                preview: s.preview || '',
                payload: s.payload,
                scanCount: 0,
                createdAt: s.createdAt,
                status: s.status || 'ACTIVE',
                manageToken: s.manageToken,
                title: s.title
              };
            });
            this.managedLinks.set(live);
          }
        }),
        map(() => this.managedLinks()),
        catchError(err => {
          this.isFetchingSummaries.set(false);
          this.isOffline.set(true);
          const message = err?.error?.message || 'Offline mode: displaying cached links from this device.';
          this.summaryError.set(message);
          return of(this.managedLinks());
        })
      );
  }

  /**
   * Toggle a link between ACTIVE and DISABLED.
   */
  toggleLinkStatus(code: string): Observable<void> {
    const list = this.managedLinks();
    const target = list.find(l => l.code === code);
    if (!target) return EMPTY;

    const newStatus = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const endpoint = target.status === 'ACTIVE' ? 'disable' : 'enable';

    // Optimistic local update
    this.managedLinks.update(items =>
      items.map(l => (l.code === code ? { ...l, status: newStatus, isToggling: true } : l))
    );

    const headers = new HttpHeaders({ 'X-Manage-Token': target.manageToken });
    return this.http.post<ApiResponse<void>>(`${this.apiBase}/${code}/${endpoint}`, {}, { headers }).pipe(
      tap(() => {
        this.managedLinks.update(items =>
          items.map(l => (l.code === code ? { ...l, isToggling: false } : l))
        );
        // Also update storedLinks in localStorage
        const stored = this.loadStoredLinks();
        const updated = stored.map(s => (s.code === code ? { ...s, status: newStatus } : s));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        this.storedLinks.set(updated);
      }),
      map(() => void 0),
      catchError(err => {
        // Rollback optimistic update
        this.managedLinks.update(items =>
          items.map(l => (l.code === code ? { ...l, status: target.status, isToggling: false } : l))
        );
        throw err;
      })
    );
  }

  /**
   * Extend link retention by +1 year.
   */
  extendLink(code: string): Observable<QrLinkResponseData> {
    const list = this.managedLinks();
    const target = list.find(l => l.code === code);
    if (!target) return EMPTY;

    this.managedLinks.update(items =>
      items.map(l => (l.code === code ? { ...l, isExtending: true } : l))
    );

    const headers = new HttpHeaders({ 'X-Manage-Token': target.manageToken });
    return this.http
      .post<ApiResponse<QrLinkResponseData>>(`${this.apiBase}/${code}/extend`, {}, { headers })
      .pipe(
        tap(res => {
          if (res && res.data) {
            const data = res.data;
            this.managedLinks.update(items =>
              items.map(l =>
                l.code === code
                  ? {
                    ...l,
                    expiresAt: data.expiresAt,
                    status: 'ACTIVE',
                    isExtending: false
                  }
                  : l
              )
            );
          }
        }),
        map(res => res.data),
        catchError(err => {
          this.managedLinks.update(items =>
            items.map(l => (l.code === code ? { ...l, isExtending: false } : l))
          );
          throw err;
        })
      );
  }

  /**
   * Delete a dynamic link.
   */
  deleteLink(code: string): Observable<void> {
    const list = this.managedLinks();
    const target = list.find(l => l.code === code);
    if (!target) {
      this.removeStoredLink(code);
      return of(void 0);
    }

    this.managedLinks.update(items =>
      items.map(l => (l.code === code ? { ...l, isDeleting: true } : l))
    );

    const headers = new HttpHeaders({ 'X-Manage-Token': target.manageToken });
    return this.http.delete<ApiResponse<void>>(`${this.apiBase}/${code}`, { headers }).pipe(
      tap(() => {
        this.removeStoredLink(code);
        this.managedLinks.update(items => items.filter(l => l.code !== code));
      }),
      map(() => void 0),
      catchError(err => {
        this.managedLinks.update(items =>
          items.map(l => (l.code === code ? { ...l, isDeleting: false } : l))
        );
        throw err;
      })
    );
  }

  /**
   * Update dynamic link payload.
   */
  updateLinkPayload(code: string, payload: string, type?: string, mime?: string): Observable<QrLinkResponseData> {
    const list = this.managedLinks();
    const target = list.find(l => l.code === code);
    if (!target) return EMPTY;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Manage-Token': target.manageToken
    });

    return this.http
      .put<ApiResponse<QrLinkResponseData>>(
        `${this.apiBase}/${code}`,
        {
          type: type || target.type,
          payload,
          mime
        },
        { headers }
      )
      .pipe(
        tap(res => {
          if (res && res.data) {
            const data = res.data;
            this.managedLinks.update(items =>
              items.map(l =>
                l.code === code
                  ? {
                    ...l,
                    preview: payload.slice(0, 60),
                    payload,
                    contentBytes: data.contentBytes,
                    status: data.status || l.status
                  }
                  : l
              )
            );
            const stored = this.loadStoredLinks();
            const updated = stored.map(s => (s.code === code ? { ...s, payload, preview: payload.slice(0, 60) } : s));
            if (typeof window !== 'undefined' && window.localStorage) {
              try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch { }
            }
            this.storedLinks.set(updated);
          }
        }),
        map(res => res.data)
      );
  }

  /**
   * Fetch full details (including un-truncated payload) for a specific dynamic link.
   */
  getLinkDetails(code: string): Observable<{
    code: string;
    payload?: string;
    type: string;
    status: string;
    scanCount: number;
    expiresAt?: string;
    lastScanAt?: string;
    preview?: string;
    contentBytes?: number;
  }> {
    const list = this.managedLinks();
    const target = list.find(l => l.code === code);
    const headers = target?.manageToken
      ? new HttpHeaders({ 'X-Manage-Token': target.manageToken })
      : undefined;

    return this.http.get<ApiResponse<any>>(`${this.apiBase}/${code}/stats`, { headers }).pipe(
      tap(res => {
        if (res && res.data && res.data.payload) {
          this.managedLinks.update(items =>
            items.map(l => (l.code === code ? { ...l, payload: res.data.payload } : l))
          );
        }
      }),
      map(res => res.data)
    );
  }

  /**
   * Load an existing dynamic link into active studio editing state.
   */
  loadLinkIntoStudio(code: string, manageToken?: string, shortUrl?: string): void {
    this.activeCode.set(code);
    if (manageToken) {
      this.activeToken.set(manageToken);
    } else {
      const stored = this.loadStoredLinks().find(l => l.code === code);
      if (stored) this.activeToken.set(stored.manageToken);
    }
    if (shortUrl) {
      this.shortUrl.set(shortUrl);
    }
    this.mode.set('dynamic');
  }

  private lastQueuedPayload: string = '';

  computeEffectiveShortUrl(data: QrLinkResponseData | { code: string; shortUrl: string }): string {
    if (typeof window !== 'undefined') {
      const configBase = (window as unknown as { __ACKLET_CONFIG__?: { qrPublicBaseUrl?: string } })?.__ACKLET_CONFIG__?.qrPublicBaseUrl;
      if (configBase && data.code) {
        return `${configBase.replace(/\/+$/, '')}/${data.code}`;
      }

      if (window.location) {
        const origin = window.location.origin;
        // In development / ngrok: if backend returned localhost:8080 URL and user is accessing
        // via an ngrok tunnel or custom host, rewrite origin so mobile devices scanning the QR reach this host
        if (
          origin &&
          (origin.includes('ngrok') || !origin.includes('localhost') || !data.shortUrl) &&
          data.shortUrl?.includes('localhost:8080') &&
          data.code
        ) {
          return `${origin}/q/${data.code}`;
        }
      }
    }
    return data.shortUrl;
  }

  isShortUrlLocalOrPrivate(url?: string | null): boolean {
    const target = url || this.shortUrl();
    if (!target) return false;
    try {
      const parsed = new URL(target);
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.localhost')) {
        return true;
      }
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
      const match172 = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
      if (match172) {
        const second = parseInt(match172[1], 10);
        if (second >= 16 && second <= 31) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private initSyncPipeline(): void {
    this.syncQueue$
      .pipe(
        debounceTime(DEBOUNCE_MS),
        switchMap(({ type, payload, mime }) => {
          this.lastQueuedPayload = payload;
          return this.executeSync(type, payload, mime).pipe(
            catchError(err => {
              this.isLoading.set(false);
              const message = err?.error?.message || err?.message || 'Failed to sync smart link';
              this.error.set(message);
              this.onSyncError$.next(message);
              return EMPTY;
            })
          );
        })
      )
      .subscribe(res => {
        this.isLoading.set(false);
        this.error.set(null);
        if (res && res.data) {
          const data = res.data;
          this.lastSyncedPayload = this.lastQueuedPayload.trim();
          this.lastSyncedType = this.currentContentType;

          const effectiveShortUrl = this.computeEffectiveShortUrl(data);
          const hadShortUrl = !!this.shortUrl();
          const isChanged = this.shortUrl() !== effectiveShortUrl;
          this.shortUrl.set(effectiveShortUrl);

          if (!hadShortUrl || isChanged) {
            this.onShortUrlReady$.next(effectiveShortUrl);
          }

          if (data.code) {
            this.activeCode.set(data.code);
          }
          if (data.manageToken) {
            this.activeToken.set(data.manageToken);
            // Do NOT auto-save ephemeral payload-sync links to storedLinks.
            // Only explicitly created dynamic links are stored and shown in the Dynamic Links studio.
          }
        }
      });
  }

  private executeSync(
    type: ContentType,
    payload: string,
    mime?: string
  ): Observable<ApiResponse<QrLinkResponseData>> {
    const code = this.activeCode();
    const token = this.activeToken();
    const backendType = this.mapContentTypeToBackend(type);

    if (code && token) {
      // Reuse the same code and shortUrl while typing (PUT request)
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Manage-Token': token
      });
      return this.http.put<ApiResponse<QrLinkResponseData>>(
        `${this.apiBase}/${code}`,
        {
          type: backendType,
          payload,
          mime
        },
        { headers }
      );
    } else {
      // Create new dynamic record (POST request)
      return this.http.post<ApiResponse<QrLinkResponseData>>(`${this.apiBase}`, {
        type: backendType,
        payload,
        mime
      });
    }
  }

  private mapContentTypeToBackend(type: ContentType): string {
    switch (type) {
      case 'url':
        return 'URL';
      case 'text':
        return 'TEXT';
      case 'vcard':
        return 'VCARD';
      default:
        return 'OTHER';
    }
  }
}
