// client/apps/tool-qr-generator/src/services/temp-qr.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempQrService } from './temp-qr.service';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { CreateTempQrPayload } from '../models/temp-qr.models';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

(globalThis as any).localStorage = localStorageMock;

describe('TempQrService', () => {
  let service: TempQrService;
  let httpClientMock: any;

  beforeEach(() => {
    storageMap.clear();
    httpClientMock = {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };
    service = new TempQrService(httpClientMock);
  });

  afterEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  it('creates temporary QR code and stores owner token', async () => {
    const payload: CreateTempQrPayload = {
      name: 'Temp QR 1',
      payloadMode: 'LINK',
      contentType: 'MESSAGE',
      content: 'Hello World',
      barcodeFormat: 'qrcode'
    };

    const headers = new HttpHeaders().set('X-Owner-Token', 'tok_owner_qr_123');
    const mockResponse = new HttpResponse({
      body: {
        success: true,
        message: 'Created',
        data: {
          id: '1',
          name: 'Temp QR 1',
          token: 'qr12345678901234',
          verifyUrl: 'http://qr.localhost:4200/v/qr12345678901234',
          status: 'ACTIVE',
          barcodeFormat: 'qrcode'
        }
      },
      headers,
      status: 201
    });

    httpClientMock.post.mockReturnValue(of(mockResponse));

    const result = await new Promise<any>(resolve => {
      service.createCode(payload).subscribe(resolve);
    });

    expect(result).toBeDefined();
    expect(result.token).toBe('qr12345678901234');
    expect(localStorage.getItem('acklet_qr_owner_token')).toBe('tok_owner_qr_123');
    expect(service.currentOwnerToken()).toBe('tok_owner_qr_123');
    expect(service.isServiceUnreachable()).toBe(false);
  });

  it('filters out non-qrcode items when listing codes', async () => {
    const mockList = [
      { id: '1', token: 'qr1', barcodeFormat: 'qrcode', status: 'ACTIVE' },
      { id: '2', token: 'code128_1', barcodeFormat: 'code128', status: 'ACTIVE' },
      { id: '3', token: 'qr2', barcodeFormat: 'qrcode', status: 'EXPIRED' }
    ];

    httpClientMock.get.mockReturnValue(of({ success: true, data: mockList }));

    const result = await new Promise<any[]>(resolve => {
      service.listMyCodes().subscribe(resolve);
    });

    expect(result.length).toBe(2);
    expect(result.map(x => x.token)).toEqual(['qr1', 'qr2']);
  });

  it('calls extend and expireNow endpoints with correct payloads', async () => {
    httpClientMock.patch.mockReturnValue(of({ success: true, data: { status: 'ACTIVE' } }));

    await new Promise(resolve => service.extendCode('token123', 3600).subscribe(resolve));
    expect(httpClientMock.patch).toHaveBeenCalledWith(
      expect.stringContaining('/token123'),
      { action: 'extend', extensionSeconds: 3600 },
      expect.any(Object)
    );

    await new Promise(resolve => service.expireNow('token123').subscribe(resolve));
    expect(httpClientMock.patch).toHaveBeenCalledWith(
      expect.stringContaining('/token123'),
      { action: 'expireNow' },
      expect.any(Object)
    );
  });
});

