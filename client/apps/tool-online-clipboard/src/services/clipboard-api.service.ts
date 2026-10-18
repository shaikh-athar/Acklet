import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface ClipboardConfigDto {
  codeLength: number;
  maxCodeLength: number;
  maxFileSizeBytes: number;
  maxTextSizeBytes: number;
  maxItemsPerType: number;
  maxTotalShareSizeBytes: number;
  retentionDays: number;
  chunkSize: number;
}

export interface ClipboardItem {
  id: string;
  shareCode: string;
  itemType: 'TEXT' | 'LINK' | 'IMAGE' | 'FILE';
  textContent?: string;
  originalName?: string;
  sizeBytes: number;
  detectedMime?: string;
  createdAt: string;
  previewUrl?: string;
  downloadUrl?: string;
  downloadCount: number;
  viewCount: number;
  isEncrypted?: boolean;
  contentHash?: string;
}

export interface ClipboardShare {
  code: string;
  wordCode?: string;
  ownerToken?: string;
  createdAt: string;
  expiresAt: string;
  burnAfterReading?: boolean;
  liveMode?: boolean;
  hasPin?: boolean;
  version?: number;
  items: ClipboardItem[];
  textCount: number;
  imageCount: number;
  fileCount: number;
  totalSizeBytes: number;
}

export interface ClipboardTextRevision {
  id: string;
  shareCode: string;
  version: number;
  textContent: string;
  isEncrypted?: boolean;
  createdAt: string;
  revisionNumber?: number;
  textPreview?: string;
  charCount?: number;
  lineCount?: number;
  isCurrent?: boolean;
}

export interface CreateShareOptions {
  expiryHours?: number; // 1, 24, 168
  pin?: string;
  burnAfterReading?: boolean;
  liveMode?: boolean;
  requestedCode?: string;
}

export interface UploadSessionResponse {
  uploadId: string;
  shareCode: string;
  fileName: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  isComplete?: boolean;
  expiresAt: string;
}

export interface UploadChunkResponse {
  chunkNumber: number;
  totalChunks: number;
  uploadedChunks: number[];
  isComplete: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clipboard`;

  // Local in-memory mock store for offline/development fallback
  private mockStore = new Map<string, ClipboardShare>();

  private generateMockCode(): string {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private getOrCreateMockShare(code?: string): ClipboardShare {
    const c = (code || this.generateMockCode()).toLowerCase();
    if (this.mockStore.has(c)) {
      return this.mockStore.get(c)!;
    }
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    const share: ClipboardShare = {
      code: c,
      wordCode: `${c}-clip`,
      ownerToken: `tok_${Math.random().toString(36).substring(2, 10)}`,
      createdAt: now,
      expiresAt: expires,
      items: [],
      textCount: 0,
      imageCount: 0,
      fileCount: 0,
      totalSizeBytes: 0
    };
    this.mockStore.set(c, share);
    return share;
  }

  getConfig(): Observable<ClipboardConfigDto> {
    return this.http.get<ApiResponse<ClipboardConfigDto>>(`${this.baseUrl}/config`).pipe(
      map(res => res.data),
      catchError(() => of({
        codeLength: 5,
        maxCodeLength: 8,
        maxFileSizeBytes: 200 * 1024 * 1024,
        maxTextSizeBytes: 1024 * 1024,
        maxItemsPerType: 100,
        maxTotalShareSizeBytes: 500 * 1024 * 1024,
        retentionDays: 7,
        chunkSize: 5 * 1024 * 1024
      }))
    );
  }

  createShare(options?: CreateShareOptions): Observable<ClipboardShare> {
    return this.http.post<ApiResponse<ClipboardShare>>(`${this.baseUrl}/shares`, options || {}).pipe(
      map(res => res.data),
      catchError(() => {
        // Fallback to local session if backend returns 403, 404, or 500
        const mock = this.getOrCreateMockShare(options?.requestedCode);
        return of(mock);
      })
    );
  }

  getShare(code: string, pin?: string): Observable<ClipboardShare> {
    const clean = code.trim().toLowerCase();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return this.http.get<ApiResponse<ClipboardShare>>(`${this.baseUrl}/shares/${clean}${pinParam}`).pipe(
      map(res => res.data),
      catchError(err => {
        if (err.status === 0) {
          const mock = this.getOrCreateMockShare(clean);
          return of(mock);
        }
        throw err;
      })
    );
  }

  renameShare(currentCode: string, newCode: string, ownerToken?: string): Observable<ClipboardShare> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const cleanCurrent = currentCode.trim().toLowerCase();
    const cleanNew = newCode.trim().toLowerCase();
    return this.http.post<ApiResponse<ClipboardShare>>(
      `${this.baseUrl}/shares/${cleanCurrent}/rename?newCode=${encodeURIComponent(cleanNew)}`,
      {},
      { headers }
    ).pipe(
      map(res => res.data)
    );
  }

  checkCodeAvailability(code: string): Observable<boolean> {
    const clean = code.trim().toLowerCase();
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/shares/${clean}/available`).pipe(
      map(res => res.data),
      catchError(() => of(false))
    );
  }

  addTextItem(code: string, text: string, ownerToken?: string, isEncrypted = false, expectedVersion?: number): Observable<ClipboardItem> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    const payload: { text: string; expectedVersion?: number } = { text };
    if (expectedVersion !== undefined && expectedVersion !== null) {
      payload.expectedVersion = expectedVersion;
    }
    return this.http.post<ApiResponse<ClipboardItem>>(
      `${this.baseUrl}/shares/${clean}/text?isEncrypted=${isEncrypted}`,
      payload,
      { headers }
    ).pipe(
      map(res => res.data),
      catchError(err => {
        // If 409 Conflict, rethrow so component can handle optimistic lock conflict
        if (err.status === 409) {
          throw err;
        }
        // Update mock store for offline/development fallback
        const share = this.getOrCreateMockShare(clean);
        const existingIdx = share.items.findIndex(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
        const item: ClipboardItem = {
          id: `item_${Date.now()}`,
          shareCode: clean,
          itemType: 'TEXT',
          textContent: text,
          sizeBytes: new Blob([text]).size,
          createdAt: new Date().toISOString(),
          downloadCount: 0,
          viewCount: 1,
          isEncrypted
        };
        if (existingIdx >= 0) {
          share.items[existingIdx] = item;
        } else {
          share.items.unshift(item);
          share.textCount++;
        }
        share.version = (share.version || 1) + 1;
        return of(item);
      })
    );
  }

  /**
   * Transmits text content immediately using fetch with keepalive: true to survive tab closure
   * and page reloads without showing native browser confirmation dialogs.
   */
  saveTextOnSuddenExit(code: string, text: string, ownerToken?: string, isEncrypted = false, expectedVersion?: number): void {
    const clean = code.trim().toLowerCase();
    const url = `${this.baseUrl}/shares/${clean}/text?isEncrypted=${isEncrypted}`;
    const payload: { text: string; expectedVersion?: number } = { text };
    if (expectedVersion !== undefined && expectedVersion !== null) {
      payload.expectedVersion = expectedVersion;
    }
    const body = JSON.stringify(payload);

    // Update local mock store for dev fallback
    const share = this.getOrCreateMockShare(clean);
    const existingIdx = share.items.findIndex(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
    const item: ClipboardItem = {
      id: `item_${Date.now()}`,
      shareCode: clean,
      itemType: 'TEXT',
      textContent: text,
      sizeBytes: new Blob([text]).size,
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      viewCount: 1,
      isEncrypted
    };
    if (existingIdx >= 0) {
      share.items[existingIdx] = item;
    } else {
      share.items.unshift(item);
      share.textCount++;
    }
    share.version = (share.version || 1) + 1;

    try {
      if (typeof fetch !== 'undefined') {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (ownerToken) {
          headers['X-Owner-Token'] = ownerToken;
        }
        fetch(url, {
          method: 'POST',
          headers,
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch (_) {}
  }

  getTextRevisions(code: string): Observable<ClipboardTextRevision[]> {
    const clean = code.trim().toLowerCase();
    return this.http.get<ApiResponse<ClipboardTextRevision[]>>(
      `${this.baseUrl}/shares/${clean}/revisions`
    ).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }

  restoreTextRevision(code: string, revisionId: string, ownerToken?: string): Observable<ClipboardItem> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<ClipboardItem>>(
      `${this.baseUrl}/shares/${clean}/revisions/${revisionId}/restore`,
      {},
      { headers }
    ).pipe(
      map(res => res.data)
    );
  }

  uploadFileDirect(code: string, file: File, isImage: boolean, ownerToken?: string, isEncrypted = false): Observable<ClipboardItem> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const formData = new FormData();
    formData.append('file', file, file.name);

    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<ClipboardItem>>(
      `${this.baseUrl}/shares/${clean}/files?isImage=${isImage}&isEncrypted=${isEncrypted}`,
      formData,
      { headers }
    ).pipe(
      map(res => res.data)
    );
  }

  uploadFileWithProgress(
    code: string,
    file: File,
    isImage: boolean,
    ownerToken?: string,
    isEncrypted = false,
    contentHash?: string
  ): Observable<HttpEvent<ApiResponse<ClipboardItem>>> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const formData = new FormData();
    formData.append('file', file, file.name);

    const clean = code.trim().toLowerCase();
    const hashParam = contentHash ? `&contentHash=${encodeURIComponent(contentHash)}` : '';
    const url = `${this.baseUrl}/shares/${clean}/files?isImage=${isImage}&isEncrypted=${isEncrypted}${hashParam}`;

    return this.http.post<ApiResponse<ClipboardItem>>(url, formData, {
      headers,
      reportProgress: true,
      observe: 'events'
    });
  }

  // Chunked Upload API
  initChunkedUpload(code: string, fileName: string, totalSize: number, chunkSize: number, totalChunks: number, isImage: boolean, isEncrypted = false, ownerToken?: string, fileHash?: string): Observable<UploadSessionResponse> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<UploadSessionResponse>>(
      `${this.baseUrl}/shares/${clean}/uploads/init`,
      { fileName, totalSize, chunkSize, totalChunks, isImage, isEncrypted, fileHash },
      { headers }
    ).pipe(
      map(res => res.data)
    );
  }

  uploadChunk(code: string, uploadId: string, chunkNumber: number, chunkBlob: Blob): Observable<UploadChunkResponse> {
    const formData = new FormData();
    formData.append('chunk', chunkBlob, `chunk_${chunkNumber}`);
    const clean = code.trim().toLowerCase();
    return this.http.put<ApiResponse<UploadChunkResponse>>(
      `${this.baseUrl}/shares/${clean}/uploads/${uploadId}/chunks/${chunkNumber}`,
      formData
    ).pipe(
      map(res => res.data)
    );
  }

  completeChunkedUpload(code: string, uploadId: string): Observable<ClipboardItem> {
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<ClipboardItem>>(
      `${this.baseUrl}/shares/${clean}/uploads/${uploadId}/complete`,
      {}
    ).pipe(
      map(res => res.data)
    );
  }

  deleteItem(code: string, itemId: string, ownerToken?: string): Observable<void> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/shares/${clean}/items/${itemId}`, { headers }).pipe(
      map(() => void 0)
    );
  }

  getDownloadUrl(code: string, itemId: string, pin?: string): string {
    const clean = code.trim().toLowerCase();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${this.baseUrl}/shares/${clean}/items/${itemId}/download${pinParam}`;
  }

  getPreviewUrl(code: string, itemId: string, pin?: string): string {
    const clean = code.trim().toLowerCase();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${this.baseUrl}/shares/${clean}/items/${itemId}/preview${pinParam}`;
  }

  getZipDownloadUrl(code: string, pin?: string): string {
    const clean = code.trim().toLowerCase();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${this.baseUrl}/shares/${clean}/zip${pinParam}`;
  }

  reportShare(code: string, reason: string): Observable<void> {
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/shares/${clean}/report`, { reason }).pipe(
      map(() => void 0)
    );
  }
}
