// apps/tool-barcode-generator/src/services/temp-code.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempCodeService } from './temp-code.service';
import { HttpClient, HttpHeaders, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CreateTempCodePayload } from '../models/temp-code.models';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

(globalThis as any).localStorage = localStorageMock;

describe('TempCodeService', () => {
  let service: TempCodeService;
  let httpClientMock: any;

  beforeEach(() => {
    storageMap.clear();
    httpClientMock = {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };
    service = new TempCodeService(httpClientMock);
  });

  afterEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it('persists owner token from response headers on create', async () => {
    const payload: CreateTempCodePayload = {
      name: 'Temp 1',
      payloadMode: 'LINK',
      contentType: 'MESSAGE',
      content: 'Secret Message',
      barcodeFormat: 'qrcode'
    };

    const headers = new HttpHeaders().set('X-Owner-Token', 'tok_owner_123');
    const mockResponse = new HttpResponse({
      body: {
        success: true,
        message: 'Created',
        data: {
          id: '1',
          name: 'Temp 1',
          token: 'abc1234567890123',
          verifyUrl: 'http://barcode.localhost:4200/v/abc1234567890123',
          status: 'ACTIVE'
        }
      },
      headers,
      status: 201
    });

    httpClientMock.post.mockReturnValue(of(mockResponse));

    const result = await new Promise(resolve => {
      service.createCode(payload).subscribe(resolve);
    });

    expect(result).toBeDefined();
    expect(localStorage.getItem('acklet_barcode_owner_token')).toBe('tok_owner_123');
    expect(service.currentOwnerToken()).toBe('tok_owner_123');
    expect(service.isServiceUnreachable()).toBe(false);
  });

  it('sends X-Owner-Token header on subsequent list requests', async () => {
    localStorage.setItem('acklet_barcode_owner_token', 'tok_existing_999');
    service.currentOwnerToken.set('tok_existing_999');

    httpClientMock.get.mockReturnValue(of({
      success: true,
      data: { items: [], total: 0 }
    }));

    await new Promise(resolve => {
      service.listCodes().subscribe(resolve);
    });

    expect(httpClientMock.get).toHaveBeenCalled();
    const callArgs = httpClientMock.get.mock.calls[0];
    const passedHeaders = callArgs[1].headers as HttpHeaders;
    expect(passedHeaders.get('X-Owner-Token')).toBe('tok_existing_999');
  });

  it('detects service unreachable on status 0 / 502 / 503 / 504 and sets isServiceUnreachable signal', async () => {
    const networkError = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    httpClientMock.post.mockReturnValue(throwError(() => networkError));

    await new Promise<void>(resolve => {
      service.createCode({} as any).subscribe({
        error: (err) => {
          expect(err.message).toBe('Temporary codes need a connection. Try again later.');
          resolve();
        }
      });
    });

    expect(service.isServiceUnreachable()).toBe(true);
  });

  it('sends strict Cache-Control headers on verify request and maps 404 to NOT_FOUND', async () => {
    const notFoundError = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    httpClientMock.get.mockReturnValue(throwError(() => notFoundError));

    const res = await new Promise(resolve => {
      service.verifyCode('non_existent_token').subscribe(resolve);
    });

    expect(res).toEqual({ status: 'NOT_FOUND' });
    const callArgs = httpClientMock.get.mock.calls[0];
    const headers = callArgs[1].headers as HttpHeaders;
    expect(headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, max-age=0');
    expect(headers.get('Pragma')).toBe('no-cache');
  });

  it('maps 429 to RATE_LIMITED on verify request', async () => {
    const rateLimitError = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
    httpClientMock.get.mockReturnValue(throwError(() => rateLimitError));

    const res = await new Promise(resolve => {
      service.verifyCode('busy_token').subscribe(resolve);
    });

    expect(res).toEqual({ status: 'RATE_LIMITED' });
  });
});
