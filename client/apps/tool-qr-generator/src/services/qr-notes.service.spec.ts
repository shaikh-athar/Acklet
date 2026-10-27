// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/qr-notes.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { QrNotesService } from './qr-notes.service';

describe('QrNotesService', () => {
  let service: QrNotesService;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn()
    };
    service = new QrNotesService(mockHttp);
  });

  it('checks availability returning true when config endpoint succeeds', async () => {
    mockHttp.get.mockReturnValue(of({ success: true, data: { retentionDays: 7 } }));
    const available = await service.checkAvailability();
    expect(available).toBe(true);
    expect(mockHttp.get).toHaveBeenCalledWith('/api/v1/clipboard/config');
  });

  it('checks availability returning false when config endpoint fails', async () => {
    mockHttp.get.mockReturnValue(throwError(() => new Error('Service down')));
    const available = await service.checkAvailability();
    expect(available).toBe(false);
  });

  it('creates a new note share via online clipboard API', async () => {
    mockHttp.post
      .mockReturnValueOnce(of({
        success: true,
        data: { code: 'test1', ownerToken: 'tok_1', expiresAt: '2026-11-01T00:00:00Z' }
      }))
      .mockReturnValueOnce(of({
        success: true,
        data: { id: 'item_1', textContent: 'Hello Note' }
      }));

    const result = await service.createOrUpdateNote('Hello Note', '7d');
    expect(result.code).toBe('test1');
    expect(result.ownerToken).toBe('tok_1');
    expect(result.shareUrl).toContain('/notes/test1');
    expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/clipboard/shares', { expiryHours: 168 });
  });

  it('updates an existing note share when code and token provided', async () => {
    mockHttp.post.mockReturnValueOnce(of({
      success: true,
      data: { id: 'item_1', textContent: 'Updated Note' }
    }));

    const result = await service.createOrUpdateNote('Updated Note', '30d', {
      code: 'test1',
      ownerToken: 'tok_1'
    });

    expect(result.code).toBe('test1');
    expect(result.shareUrl).toContain('/notes/test1');
    expect(mockHttp.post).toHaveBeenCalledWith(
      '/api/v1/clipboard/shares/test1/text',
      { text: 'Updated Note' },
      { headers: { 'X-Owner-Token': 'tok_1' } }
    );
  });

  it('fetches note text by code', async () => {
    mockHttp.get.mockReturnValue(of({
      success: true,
      data: {
        code: 'test1',
        items: [{ itemType: 'TEXT', textContent: 'Fetched Note Content' }]
      }
    }));

    const text = await service.fetchNote('test1');
    expect(text).toBe('Fetched Note Content');
    expect(mockHttp.get).toHaveBeenCalledWith('/api/v1/clipboard/shares/test1');
  });

  it('falls back gracefully to offline mock cache on fetch if API fails but local note exists', async () => {
    mockHttp.post.mockReturnValue(throwError(() => new Error('Network error')));
    const created = await service.createOrUpdateNote('Offline Note', '7d');

    mockHttp.get.mockReturnValue(throwError(() => new Error('Offline')));
    const fetched = await service.fetchNote(created.code);
    expect(fetched).toBe('Offline Note');
  });
});
