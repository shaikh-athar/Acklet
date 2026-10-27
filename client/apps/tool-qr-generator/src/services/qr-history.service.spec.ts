// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/qr-history.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QRHistoryService } from './qr-history.service';

describe('QRHistoryService', () => {
  let service: QRHistoryService;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('initializes with empty items array if localStorage has no history', () => {
    service = new QRHistoryService();
    expect(service.items()).toEqual([]);
  });

  it('loads valid items from localStorage on startup', () => {
    const existing = [
      {
        id: '1',
        createdAt: 1000,
        type: 'text',
        content: 'Test 1',
        formattedPayload: 'Test 1',
        dataUrl: 'data:image/png;base64,123',
        options: {}
      }
    ];
    window.localStorage.setItem('acklet_qr_history_v1', JSON.stringify(existing));

    service = new QRHistoryService();
    expect(service.items().length).toBe(1);
    expect(service.items()[0].content).toBe('Test 1');
  });

  it('handles corrupted localStorage JSON without crashing', () => {
    window.localStorage.setItem('acklet_qr_history_v1', 'INVALID_JSON{{{');

    expect(() => {
      service = new QRHistoryService();
    }).not.toThrow();

    expect(service.items()).toEqual([]);
  });

  it('adds an item to history and persists to localStorage', () => {
    service = new QRHistoryService();

    service.addItem({
      type: 'url',
      content: 'https://acklet.com',
      formattedPayload: 'https://acklet.com',
      dataUrl: 'data:image/png;base64,abc',
      options: { size: 300 }
    });

    const items = service.items();
    expect(items.length).toBe(1);
    expect(items[0].content).toBe('https://acklet.com');
    expect(items[0].options.size).toBe(300);

    const stored = window.localStorage.getItem('acklet_qr_history_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].content).toBe('https://acklet.com');
  });

  it('deduplicates items with identical formattedPayload', () => {
    service = new QRHistoryService();

    service.addItem({
      type: 'text',
      content: 'Hello',
      formattedPayload: 'Hello',
      dataUrl: 'data:image/png;base64,1',
      options: {}
    });

    service.addItem({
      type: 'text',
      content: 'World',
      formattedPayload: 'World',
      dataUrl: 'data:image/png;base64,2',
      options: {}
    });

    service.addItem({
      type: 'text',
      content: 'Hello Updated',
      formattedPayload: 'Hello',
      dataUrl: 'data:image/png;base64,3',
      options: {}
    });

    const items = service.items();
    expect(items.length).toBe(2);
    expect(items[0].content).toBe('Hello Updated');
    expect(items[1].content).toBe('World');
  });

  it('caps history items to a maximum of 8 items', () => {
    service = new QRHistoryService();

    for (let i = 1; i <= 12; i++) {
      service.addItem({
        type: 'text',
        content: `Item ${i}`,
        formattedPayload: `Item ${i}`,
        dataUrl: `data:image/png;base64,${i}`,
        options: {}
      });
    }

    const items = service.items();
    expect(items.length).toBe(8);
    expect(items[0].content).toBe('Item 12');
    expect(items[7].content).toBe('Item 5');
  });

  it('removes a specific item by id', () => {
    service = new QRHistoryService();

    service.addItem({
      type: 'text',
      content: 'Item A',
      formattedPayload: 'Item A',
      dataUrl: 'data:1',
      options: {}
    });

    service.addItem({
      type: 'text',
      content: 'Item B',
      formattedPayload: 'Item B',
      dataUrl: 'data:2',
      options: {}
    });

    const idToRemove = service.items()[0].id;
    service.removeItem(idToRemove);

    expect(service.items().length).toBe(1);
    expect(service.items()[0].content).toBe('Item A');
  });

  it('clears all history items and removes localStorage entry', () => {
    service = new QRHistoryService();

    service.addItem({
      type: 'text',
      content: 'Item A',
      formattedPayload: 'Item A',
      dataUrl: 'data:1',
      options: {}
    });

    expect(service.items().length).toBe(1);
    service.clearHistory();

    expect(service.items()).toEqual([]);
    expect(window.localStorage.getItem('acklet_qr_history_v1')).toBeNull();
  });
});
