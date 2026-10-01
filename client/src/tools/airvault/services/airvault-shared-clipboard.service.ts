import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getAirVaultApiUrl } from './airvault-api.util';
import { AirVaultDeviceStore } from './airvault-device.store';
import { AirVaultItem } from './airvault-storage.service';
import { AirVaultWsTransportService } from './airvault-ws-transport.service';
import { of, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SharedClipboardData {
  id: string;
  ownerUsername: string;
  ownerDeviceId: string;
  title: string;
  accessMode: 'read-only' | 'read-write';
  items: AirVaultItem[];
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  isOwner: boolean;
  isCollaborator?: boolean;
  collaboratorAccessLevel?: string;
  canEdit: boolean;
  guestToken?: string;
  currentSeq?: number;
  isPersonal?: boolean;
}

export interface ClipboardSummary {
  id: string;
  title: string;
  ownerUsername: string;
  accessMode: 'read-only' | 'read-write';
  isPersonal: boolean;
  isOwner: boolean;
  itemCount: number;
  totalBytes: number;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateClipboardPayload {
  id?: string;
  title?: string;
  accessMode?: 'read-only' | 'read-write';
  retentionDays?: number;
}

const STORAGE_CLIPBOARD_ID_KEY = 'acklet_airvault_clipboard_id';
const STORAGE_ACCESS_MODE_KEY = 'acklet_airvault_clipboard_access_mode';
const STORAGE_GUEST_TOKEN_KEY = 'acklet_airvault_guest_token';
const ID_LETTERS = 'bcdfghjkmnpqrstvwxyz';
const ID_DIGITS = '0123456789';

@Injectable({
  providedIn: 'root'
})
export class AirVaultSharedClipboardService {
  private http = inject(HttpClient);
  private deviceStore = inject(AirVaultDeviceStore);
  private wsTransport = inject(AirVaultWsTransportService);

  /** This device's own primary clipboard ID */
  readonly currentClipboardId = signal<string>(this._getOrCreateClipboardId());

  /** Access mode for this device's own clipboard */
  readonly myAccessMode = signal<'read-only' | 'read-write'>(this._getSavedAccessMode());

  /** Whether the user is currently viewing someone else's shared clipboard link */
  readonly isViewingSharedLink = signal<boolean>(false);

  /** The currently loaded shared clipboard (when viewing via link) */
  readonly sharedClipboard = signal<SharedClipboardData | null>(null);

  /** Loading state for shared link resolution */
  readonly isLoadingShared = signal<boolean>(false);

  /** Error state (e.g. 'not_found' | 'expired' | 'network_error') */
  readonly sharedError = signal<string | null>(null);

  /** Active clipboard ID being rendered (either own or shared) */
  readonly activeClipboardId = computed(() => {
    if (this.isViewingSharedLink() && this.sharedClipboard()) {
      return this.sharedClipboard()!.id;
    }
    return this.currentClipboardId();
  });

  /** Effective access mode for the active workspace */
  readonly activeAccessMode = computed<'read-only' | 'read-write'>(() => {
    if (this.isViewingSharedLink() && this.sharedClipboard()) {
      return this.sharedClipboard()!.accessMode;
    }
    return this.myAccessMode();
  });

  /** Whether the visitor can post items to the currently active view */
  readonly canContribute = computed<boolean>(() => {
    if (!this.isViewingSharedLink()) {
      return true; // Owner on their own board
    }
    const shared = this.sharedClipboard();
    if (!shared || shared.isExpired) return false;
    return shared.isOwner || shared.accessMode === 'read-write';
  });

  /** Generates a human-friendly memorable 8-character ID (e.g. 'dez01788') */
  static generateId(): string {
    let str = '';
    const letterArr = new Uint8Array(3);
    const digitArr = new Uint8Array(5);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(letterArr);
      crypto.getRandomValues(digitArr);
    } else {
      for (let i = 0; i < 3; i++) letterArr[i] = Math.floor(Math.random() * 256);
      for (let i = 0; i < 5; i++) digitArr[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 3; i++) {
      str += ID_LETTERS[letterArr[i] % ID_LETTERS.length];
    }
    for (let i = 0; i < 5; i++) {
      str += ID_DIGITS[digitArr[i] % ID_DIGITS.length];
    }
    return str;
  }

  private _getOrCreateClipboardId(): string {
    try {
      let id = localStorage.getItem(STORAGE_CLIPBOARD_ID_KEY);
      if (!id || id.startsWith('cb_')) {
        id = AirVaultSharedClipboardService.generateId();
        localStorage.setItem(STORAGE_CLIPBOARD_ID_KEY, id);
      }
      return id;
    } catch {
      return AirVaultSharedClipboardService.generateId();
    }
  }

  private _getSavedAccessMode(): 'read-only' | 'read-write' {
    try {
      const mode = localStorage.getItem(STORAGE_ACCESS_MODE_KEY);
      if (mode === 'read-write') return 'read-write';
      return 'read-only';
    } catch {
      return 'read-only';
    }
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    try {
      const guestToken = localStorage.getItem(STORAGE_GUEST_TOKEN_KEY);
      if (guestToken) {
        headers = headers.set('Authorization', `Bearer ${guestToken}`);
      }
    } catch {}
    return headers;
  }

  /** Gets full canonical shareable URL for a given or current clipboard ID */
  getShareableUrl(clipboardId?: string): string {
    const id = clipboardId || this.currentClipboardId();
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/c/${id}`;
    }
    return `https://airvault.com/c/${id}`;
  }

  /**
   * Fetches a shared clipboard by unguessable ID from the backend API.
   * Handles expiry detection and owner/collaborator/guest verification.
   */
  async fetchSharedClipboard(clipboardId: string): Promise<SharedClipboardData | null> {
    this.isLoadingShared.set(true);
    this.sharedError.set(null);

    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/${encodeURIComponent(clipboardId)}`);

    try {
      const response: any = await firstValueFrom(
        this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(err => {
            if (err.status === 404) {
              this.sharedError.set('not_found');
            } else if (err.status === 410) {
              this.sharedError.set('expired');
            } else if (err.status === 403) {
              this.sharedError.set('forbidden');
            } else {
              this.sharedError.set('error');
            }
            return of(null);
          })
        )
      );

      if (response && response.success && response.data) {
        const data: SharedClipboardData = response.data;
        if (data.guestToken) {
          try {
            localStorage.setItem(STORAGE_GUEST_TOKEN_KEY, data.guestToken);
          } catch {}
        }

        this.sharedClipboard.set(data);
        this.isViewingSharedLink.set(true);

        if (data.isExpired) {
          this.sharedError.set('expired');
        }

        // Auto-subscribe to clipboard room for real-time item and revocation updates
        this.wsTransport.subscribeClipboard(clipboardId);

        return data;
      } else {
        if (!this.sharedError()) {
          this.sharedError.set('not_found');
        }
        return null;
      }
    } catch (e) {
      this.sharedError.set('error');
      return null;
    } finally {
      this.isLoadingShared.set(false);
    }
  }

  /**
   * Syncs the local clipboard items and settings to the backend
   * so anyone visiting the link sees current content.
   */
  async syncMyClipboard(items: AirVaultItem[]): Promise<void> {
    const id = this.currentClipboardId();
    const dev = this.deviceStore.currentDevice();
    const url = getAirVaultApiUrl('/api/v1/airvault/clipboard/sync');

    const payload = {
      id,
      title: `${dev.username || 'My'}'s Clipboard`,
      accessMode: this.myAccessMode(),
      items: items || [],
      retentionDays: 7
    };

    try {
      await firstValueFrom(
        this.http.post<any>(url, payload, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      this.wsTransport.subscribeClipboard(id);
    } catch {
      // Non-blocking background sync failure fallback
    }
  }

  /**
   * Adds an item to a shared clipboard as a relational row with atomic sequence and opId idempotency.
   */
  async addItemToShared(clipboardId: string, item: AirVaultItem): Promise<boolean> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/${encodeURIComponent(clipboardId)}/items`);
    const opId = item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

    const payload = {
      opId,
      item: {
        ...item,
        id: opId
      }
    };

    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(url, payload, { headers: this.getAuthHeaders() }).pipe(
          catchError(err => of(null))
        )
      );

      if (res && res.success && res.data) {
        this.sharedClipboard.set(res.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Incremental sync query: gets clipboard item rows since a given sequence number.
   */
  async fetchItemsSince(clipboardId: string, sinceSeq: number = 0): Promise<any[]> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/${encodeURIComponent(clipboardId)}/items?since=${sinceSeq}`);
    try {
      const res: any = await firstValueFrom(
        this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      return res?.success && Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  /**
   * Soft deletes a shared clipboard item row.
   */
  async deleteSharedItem(clipboardId: string, itemId: string): Promise<boolean> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/${encodeURIComponent(clipboardId)}/items/${encodeURIComponent(itemId)}`);
    try {
      const res: any = await firstValueFrom(
        this.http.delete<any>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      return !!(res && res.success);
    } catch {
      return false;
    }
  }

  /**
   * Updates access mode (Read-Only vs Read-Write) for a clipboard
   */
  async setAccessMode(accessMode: 'read-only' | 'read-write'): Promise<void> {
    this.myAccessMode.set(accessMode);
    try {
      localStorage.setItem(STORAGE_ACCESS_MODE_KEY, accessMode);
    } catch {}

    const id = this.currentClipboardId();
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/${encodeURIComponent(id)}/access-mode`);

    try {
      await firstValueFrom(
        this.http.put<any>(url, { accessMode }, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
    } catch {}
  }

  /** Exits shared link visitor view and returns to user's personal clipboard */
  exitSharedView(): void {
    const prevId = this.sharedClipboard()?.id;
    if (prevId) {
      this.wsTransport.unsubscribeClipboard(prevId);
    }
    this.isViewingSharedLink.set(false);
    this.sharedClipboard.set(null);
    this.sharedError.set(null);
  }

  /**
   * Checks whether a custom memorable slug is available
   */
  async checkSlugAvailability(slug: string): Promise<{ available: boolean; message: string }> {
    if (!slug || !slug.trim()) {
      return { available: false, message: 'Clipboard ID cannot be empty' };
    }
    const clean = slug.trim().toLowerCase();
    if (clean.length < 3 || clean.length > 32) {
      return { available: false, message: 'Must be 3–32 characters' };
    }
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      return { available: false, message: 'Only letters, numbers, hyphens and underscores allowed' };
    }

    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboard/check-slug?slug=${encodeURIComponent(clean)}`);

    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: { slug: string; available: boolean; message: string } }>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      if (res && res.success && res.data) {
        return { available: res.data.available, message: res.data.message };
      }
      return { available: true, message: 'Available!' };
    } catch {
      return { available: false, message: 'Network error verifying slug' };
    }
  }

  /**
   * Renames the current clipboard to a memorable unique slug
   */
  async renameClipboard(newId: string): Promise<{ success: boolean; error?: string }> {
    const oldId = this.currentClipboardId();
    const cleanId = newId.trim().toLowerCase();
    const url = getAirVaultApiUrl('/api/v1/airvault/clipboard/rename');

    const payload = {
      oldId,
      newId: cleanId
    };

    try {
      const res: any = await firstValueFrom(
        this.http.put<any>(url, payload, { headers: this.getAuthHeaders() }).pipe(
          catchError(err => of({ success: false, error: err?.error?.message || err?.message || 'Failed to rename clipboard' }))
        )
      );

      if (res && res.success) {
        this.currentClipboardId.set(cleanId);
        try {
          localStorage.setItem(STORAGE_CLIPBOARD_ID_KEY, cleanId);
        } catch {}
        if (typeof window !== 'undefined' && window.history) {
          const path = window.location.pathname;
          if (path.includes('/c/') || path.includes('/airvault/')) {
            window.history.replaceState({}, '', `/c/${cleanId}`);
          }
        }
        return { success: true };
      }
      return { success: false, error: res?.error || 'Failed to rename clipboard' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error updating clipboard ID' };
    }
  }

  /** User's created clipboards (excluding personal default or including summary list) */
  readonly myCreatedClipboards = signal<ClipboardSummary[]>([]);
  readonly isLoadingClipboards = signal<boolean>(false);

  /**
   * Fetches all clipboards created/owned by the authenticated user.
   */
  async fetchMyClipboards(): Promise<ClipboardSummary[]> {
    this.isLoadingClipboards.set(true);
    const url = getAirVaultApiUrl('/api/v1/airvault/clipboards/my');

    try {
      const res: any = await firstValueFrom(
        this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(() => of(null))
        )
      );

      if (res && res.success && res.data && Array.isArray(res.data.clipboards)) {
        const list: ClipboardSummary[] = res.data.clipboards;
        this.myCreatedClipboards.set(list);
        return list;
      }
      return [];
    } catch {
      return [];
    } finally {
      this.isLoadingClipboards.set(false);
    }
  }

  /**
   * Creates a new standalone clipboard.
   * Enforces max 5 clipboards limit per user and validates storage caps.
   */
  async createClipboard(payload: CreateClipboardPayload): Promise<{ success: boolean; data?: SharedClipboardData; error?: string }> {
    const url = getAirVaultApiUrl('/api/v1/airvault/clipboards/create');

    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(url, payload, { headers: this.getAuthHeaders() }).pipe(
          catchError(err => of({
            success: false,
            error: err?.error?.message || err?.message || 'Failed to create clipboard. Maximum limit may be reached.'
          }))
        )
      );

      if (res && res.success && res.data) {
        const createdData: SharedClipboardData = res.data;
        // Refresh created clipboards list
        await this.fetchMyClipboards();
        return { success: true, data: createdData };
      }

      return { success: false, error: res?.error || 'Failed to create clipboard' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error creating clipboard' };
    }
  }

  /**
   * Deletes a user-created clipboard.
   */
  async deleteCreatedClipboard(clipboardId: string): Promise<{ success: boolean; error?: string }> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboards/${encodeURIComponent(clipboardId)}`);

    try {
      const res: any = await firstValueFrom(
        this.http.delete<any>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError(err => of({
            success: false,
            error: err?.error?.message || err?.message || 'Failed to delete clipboard'
          }))
        )
      );

      if (res && res.success) {
        this.myCreatedClipboards.update(list => list.filter(b => b.id !== clipboardId));
        return { success: true };
      }
      return { success: false, error: res?.error || 'Failed to delete clipboard' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error deleting clipboard' };
    }
  }
}
