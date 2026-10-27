// @vitest-environment jsdom
import '@angular/compiler';
// client/apps/tool-qr-generator/src/services/qr-dynamic.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { QrDynamicService } from './qr-dynamic.service';
import { DynamicQrCode } from '../models/qr-generator.models';

describe('QrDynamicService', () => {
  let service: QrDynamicService;
  let mockHttp: Partial<Record<keyof HttpClient, ReturnType<typeof vi.fn>>>;

  const mockCreatedQr: DynamicQrCode = {
    code: 'k8s9x2',
    type: 'DYNAMIC_URL',
    title: 'Spring Promo',
    shortUrl: 'http://localhost:8080/q/k8s9x2',
    targetUrl: 'https://acklet.dev/promo',
    hasPassword: false,
    status: 'ACTIVE',
    scanCount: 0,
    uniqueScanCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manageKey: 'secretManageKey123'
  };

  beforeEach(() => {
    window.localStorage.clear();
    mockHttp = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn()
    };
    service = new QrDynamicService(mockHttp as unknown as HttpClient);
  });

  it('creates dynamic QR and adds to managedItems signal and localStorage', async () => {
    mockHttp.post?.mockReturnValue(of({ success: true, message: 'Created', data: mockCreatedQr }));

    const result = await service.createDynamicQr({
      type: 'DYNAMIC_URL',
      title: 'Spring Promo',
      targetUrl: 'https://acklet.dev/promo'
    });

    expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/qr/create', {
      type: 'DYNAMIC_URL',
      title: 'Spring Promo',
      targetUrl: 'https://acklet.dev/promo'
    });
    expect(result.code).toBe('k8s9x2');
    expect(result.manageKey).toBe('secretManageKey123');

    const items = service.managedItems();
    expect(items.length).toBe(1);
    expect(items[0].code).toBe('k8s9x2');
    expect(items[0].manageKey).toBe('secretManageKey123');
  });

  it('updates dynamic QR and modifies managed cache', async () => {
    service.managedItems.set([{
      code: 'k8s9x2',
      manageKey: 'secretManageKey123',
      title: 'Old Title',
      type: 'DYNAMIC_URL',
      shortUrl: 'http://localhost:8080/q/k8s9x2',
      targetUrl: 'https://acklet.dev/old',
      status: 'ACTIVE',
      scanCount: 5,
      createdAt: Date.now()
    }]);

    const updatedData: DynamicQrCode = {
      ...mockCreatedQr,
      title: 'New Title',
      targetUrl: 'https://acklet.dev/new'
    };

    mockHttp.put?.mockReturnValue(of({ success: true, message: 'Updated', data: updatedData }));

    const result = await service.updateDynamicQr('secretManageKey123', {
      title: 'New Title',
      targetUrl: 'https://acklet.dev/new'
    });

    expect(result.title).toBe('New Title');
    expect(service.managedItems()[0].title).toBe('New Title');
    expect(service.managedItems()[0].targetUrl).toBe('https://acklet.dev/new');
  });

  it('toggles pause and resume status', async () => {
    service.managedItems.set([{
      code: 'k8s9x2',
      manageKey: 'secretManageKey123',
      title: 'Promo',
      type: 'DYNAMIC_URL',
      shortUrl: 'http://localhost:8080/q/k8s9x2',
      status: 'ACTIVE',
      scanCount: 10,
      createdAt: Date.now()
    }]);

    mockHttp.post?.mockReturnValue(of({ success: true, message: 'Paused', data: { ...mockCreatedQr, status: 'PAUSED' } }));

    await service.toggleStatus('secretManageKey123', 'ACTIVE');
    expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/qr/manage/secretManageKey123/pause', {});
    expect(service.managedItems()[0].status).toBe('PAUSED');
  });

  it('removes item from managed list', () => {
    service.managedItems.set([{
      code: 'k8s9x2',
      manageKey: 'secretManageKey123',
      title: 'Promo',
      type: 'DYNAMIC_URL',
      shortUrl: 'http://localhost:8080/q/k8s9x2',
      status: 'ACTIVE',
      scanCount: 10,
      createdAt: Date.now()
    }]);

    service.removeManagedItem('secretManageKey123');
    expect(service.managedItems().length).toBe(0);
  });
});
