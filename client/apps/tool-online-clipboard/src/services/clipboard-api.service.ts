// apps/tool-online-clipboard/src/services/clipboard-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  items: ClipboardItem[];
  textCount: number;
  imageCount: number;
  fileCount: number;
  totalSizeBytes: number;
}

export interface CreateShareOptions {
  expiryHours?: number; // 1, 24, 168
  pin?: string;
  burnAfterReading?: boolean;
  liveMode?: boolean;
}

export interface UploadSessionResponse {
  uploadId: string;
  shareCode: string;
  fileName: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  expiresAt: string;
}

export interface UploadChunkResponse {
  chunkNumber: number;
  totalChunks: number;
  uploadedChunks: number;
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

  getConfig(): Observable<ClipboardConfigDto> {
    return this.http.get<ApiResponse<ClipboardConfigDto>>(`${this.baseUrl}/config`).pipe(
      map(res => res.data)
    );
  }

  createShare(options?: CreateShareOptions): Observable<ClipboardShare> {
    return this.http.post<ApiResponse<ClipboardShare>>(`${this.baseUrl}/shares`, options || {}).pipe(
      map(res => res.data)
    );
  }

  getShare(code: string, pin?: string): Observable<ClipboardShare> {
    const clean = code.trim().toLowerCase();
    const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return this.http.get<ApiResponse<ClipboardShare>>(`${this.baseUrl}/shares/${clean}${pinParam}`).pipe(
      map(res => res.data)
    );
  }

  addTextItem(code: string, text: string, ownerToken?: string, isEncrypted = false): Observable<ClipboardItem> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<ClipboardItem>>(
      `${this.baseUrl}/shares/${clean}/text?isEncrypted=${isEncrypted}`,
      { text },
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

  // Chunked Upload API
  initChunkedUpload(code: string, fileName: string, totalSize: number, chunkSize: number, totalChunks: number, isImage: boolean, isEncrypted = false, ownerToken?: string): Observable<UploadSessionResponse> {
    let headers = new HttpHeaders();
    if (ownerToken) {
      headers = headers.set('X-Owner-Token', ownerToken);
    }
    const clean = code.trim().toLowerCase();
    return this.http.post<ApiResponse<UploadSessionResponse>>(
      `${this.baseUrl}/shares/${clean}/uploads/init`,
      { fileName, totalSize, chunkSize, totalChunks, isImage, isEncrypted },
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
