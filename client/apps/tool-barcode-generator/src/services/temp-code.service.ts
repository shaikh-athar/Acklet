// apps/tool-barcode-generator/src/services/temp-code.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import {
  TempCodeRecord,
  CreateTempCodePayload,
  UpdateTempCodePayload,
  TempCodeVerifyResult,
  BatchCreateTempCodePayload,
  BatchTempCodeResult
} from '../models/temp-code.models';
import { TEMP_CODE_CONFIG } from '../config/temp-code.config';

const OWNER_TOKEN_STORAGE_KEY = 'acklet_barcode_owner_token';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class TempCodeService {
  private http: HttpClient;
  private apiBaseUrl = `${environment.apiBaseUrl}/temp-codes`;

  readonly isServiceUnreachable = signal<boolean>(false);
  readonly currentOwnerToken = signal<string | null>(this.loadOwnerToken());

  constructor(http?: HttpClient) {
    if (http) {
      this.http = http;
    } else {
      try {
        this.http = inject(HttpClient);
      } catch {
        this.http = null as any;
      }
    }
  }

  private getStorage(): Storage | null {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
  }

  private loadOwnerToken(): string | null {
    const storage = this.getStorage();
    return storage ? storage.getItem(OWNER_TOKEN_STORAGE_KEY) : null;
  }

  private saveOwnerToken(token: string | null): void {
    const storage = this.getStorage();
    if (!storage) return;
    if (token) {
      storage.setItem(OWNER_TOKEN_STORAGE_KEY, token);
      this.currentOwnerToken.set(token);
    }
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.currentOwnerToken();
    if (token) {
      headers = headers.set('X-Owner-Token', token);
    }
    return headers;
  }

  createCode(payload: CreateTempCodePayload): Observable<TempCodeRecord> {
    return this.http.post<ApiResponse<TempCodeRecord>>(
      this.apiBaseUrl,
      payload,
      { headers: this.getAuthHeaders(), observe: 'response' }
    ).pipe(
      tap(res => {
        this.isServiceUnreachable.set(false);
        const ownerTokenHeader = res.headers.get('X-Owner-Token');
        if (ownerTokenHeader) {
          this.saveOwnerToken(ownerTokenHeader);
        } else if (res.body?.data?.ownerToken) {
          this.saveOwnerToken(res.body.data.ownerToken);
        }
      }),
      map(res => res.body!.data),
      catchError(err => this.handleError(err))
    );
  }

  createBatch(payload: BatchCreateTempCodePayload): Observable<BatchTempCodeResult> {
    return this.http.post<ApiResponse<BatchTempCodeResult>>(
      `${this.apiBaseUrl}/batch`,
      payload,
      { headers: this.getAuthHeaders(), observe: 'response' }
    ).pipe(
      tap(res => {
        this.isServiceUnreachable.set(false);
        const ownerTokenHeader = res.headers.get('X-Owner-Token');
        if (ownerTokenHeader) {
          this.saveOwnerToken(ownerTokenHeader);
        } else if (res.body?.data?.ownerToken) {
          this.saveOwnerToken(res.body.data.ownerToken);
        }
      }),
      map(res => res.body!.data),
      catchError(err => this.handleError(err))
    );
  }

  updateBatch(batchId: string, payload: UpdateTempCodePayload): Observable<TempCodeRecord[]> {
    return this.http.patch<ApiResponse<TempCodeRecord[]>>(
      `${this.apiBaseUrl}/batch/${batchId}`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  deleteBatch(batchId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiBaseUrl}/batch/${batchId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(() => undefined),
      catchError(err => this.handleError(err))
    );
  }

  listCodes(search?: string, status?: string, sort?: string, page = 0, size = 50): Observable<{ items: TempCodeRecord[]; total: number }> {
    let params: any = { page, size };
    if (search) params.search = search;
    if (status && status !== 'ALL') params.status = status;
    if (sort) params.sort = sort;

    return this.http.get<ApiResponse<{ items: TempCodeRecord[]; total: number }>>(
      this.apiBaseUrl,
      { headers: this.getAuthHeaders(), params }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  getCode(id: string): Observable<TempCodeRecord> {
    return this.http.get<ApiResponse<TempCodeRecord>>(
      `${this.apiBaseUrl}/${id}`,
      { headers: this.getAuthHeaders()}
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  updateCode(id: string, payload: UpdateTempCodePayload): Observable<TempCodeRecord> {
    return this.http.patch<ApiResponse<TempCodeRecord>>(
      `${this.apiBaseUrl}/${id}`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  deleteCode(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiBaseUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(() => undefined),
      catchError(err => this.handleError(err))
    );
  }

  verifyCode(token: string): Observable<TempCodeVerifyResult> {
    return this.http.get<ApiResponse<TempCodeVerifyResult>>(
      `${this.apiBaseUrl}/verify/${encodeURIComponent(token)}`
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(res => res.data),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of<TempCodeVerifyResult>({ status: 'NOT_FOUND' });
        }
        if (err.status === 429) {
          return of<TempCodeVerifyResult>({ status: 'RATE_LIMITED' });
        }
        if (err.status === 0) {
          this.isServiceUnreachable.set(true);
        }
        return of<TempCodeVerifyResult>({ status: 'ERROR' });
      })
    );
  }

  reportCode(token: string, reason: string, comment?: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiBaseUrl}/report/${encodeURIComponent(token)}`,
      { reason, comment }
    ).pipe(
      tap(() => this.isServiceUnreachable.set(false)),
      map(() => undefined),
      catchError(err => this.handleError(err))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 0 || error.status === 403 || error.status === 502 || error.status === 503 || error.status === 504) {
      this.isServiceUnreachable.set(true);
      return throwError(() => new Error(TEMP_CODE_CONFIG.messages.connectionRequired));
    }
    const message = error.error?.message || TEMP_CODE_CONFIG.messages.genericError;
    return throwError(() => new Error(message));
  }
}
