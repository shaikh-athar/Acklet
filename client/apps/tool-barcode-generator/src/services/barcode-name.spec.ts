// apps/tool-barcode-generator/src/services/barcode-name.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BarcodeHistoryService } from './barcode-history.service';
import { BarcodeExportService } from './barcode-export.service';
import { DEFAULT_DESIGN_OPTIONS } from '../models/barcode.models';

describe('Barcode Naming & Uniqueness Test Suite (Round 3)', () => {
  let historyService: BarcodeHistoryService;
  let exportService: BarcodeExportService;

  beforeEach(() => {
    historyService = new BarcodeHistoryService();
    historyService.clearAll();
    exportService = new BarcodeExportService();
  });

  it('generates sequential default names: Barcode 1, Barcode 2, Barcode 3', () => {
    expect(historyService.getNextFreeBarcodeName()).toBe('Barcode 1');

    historyService.addItem({
      name: 'Barcode 1',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'TEST-1',
      displayValue: 'TEST-1',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    expect(historyService.getNextFreeBarcodeName()).toBe('Barcode 2');

    historyService.addItem({
      name: 'Barcode 2',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'TEST-2',
      displayValue: 'TEST-2',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    expect(historyService.getNextFreeBarcodeName()).toBe('Barcode 3');
  });

  it('handles duplicate custom names by appending next free number (e.g. Invoice labels -> Invoice labels 2)', () => {
    historyService.addItem({
      name: 'Invoice labels',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'INV-001',
      displayValue: 'INV-001',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    const uniqueName1 = historyService.getUniqueName('Invoice labels');
    expect(uniqueName1).toBe('Invoice labels 2');

    historyService.addItem({
      name: 'Invoice labels',
      format: 'ean13',
      formatLabel: 'EAN-13',
      value: '4006381333931',
      displayValue: '4006381333931',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    // The second item was saved with "Invoice labels 2"
    expect(historyService.items()[0].name).toBe('Invoice labels 2');

    const uniqueName2 = historyService.getUniqueName('Invoice labels');
    expect(uniqueName2).toBe('Invoice labels 3');
  });

  it('checks uniqueness case-insensitively and caps at 60 characters', () => {
    historyService.addItem({
      name: 'Warehouse tag',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'WH-1',
      displayValue: 'WH-1',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    expect(historyService.getUniqueName('WAREHOUSE TAG')).toBe('WAREHOUSE TAG 2');

    const longName = 'A'.repeat(70);
    const capped = historyService.getUniqueName(longName);
    expect(capped.length).toBeLessThanOrEqual(60);
  });

  it('renames an entry following the uniqueness rule', () => {
    historyService.addItem({
      name: 'First Item',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'VAL-1',
      displayValue: 'VAL-1',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });

    const id = historyService.items()[0].id;
    historyService.renameItem(id, 'Renamed Item');
    expect(historyService.items()[0].name).toBe('Renamed Item');
  });

  it('export service: formats sanitized filenames preserving case (e.g. Barcode-3-code128.png)', () => {
    const filenamePng = exportService.getFilename('Barcode 3', 'code128', 'png');
    expect(filenamePng).toBe('Barcode-3-code128.png');

    const filenameSvg = exportService.getFilename('Invoice labels 2', 'ean13', 'svg');
    expect(filenameSvg).toBe('Invoice-labels-2-ean13.svg');
  });

  it('tracks lifetime totalGeneratedCount across generations', () => {
    expect(historyService.totalGeneratedCount()).toBe(0);

    historyService.addItem({
      name: 'Barcode 1',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'TEST-1',
      displayValue: 'TEST-1',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });
    expect(historyService.totalGeneratedCount()).toBe(1);

    historyService.addItem({
      name: 'Barcode 2',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'TEST-2',
      displayValue: 'TEST-2',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg></svg>'
    });
    expect(historyService.totalGeneratedCount()).toBe(2);
  });

  it('updates an existing history item without duplicating entries', () => {
    const item = historyService.addItem({
      name: 'Barcode 1',
      format: 'code128',
      formatLabel: 'Code 128',
      value: 'VAL-OLD',
      displayValue: 'VAL-OLD',
      options: DEFAULT_DESIGN_OPTIONS,
      formatOptions: {},
      svg: '<svg>old</svg>'
    })!;

    expect(historyService.items().length).toBe(1);

    const success = historyService.updateItem(item.id, {
      value: 'VAL-NEW',
      displayValue: 'VAL-NEW',
      svg: '<svg>new</svg>'
    });

    expect(success).toBe(true);
    expect(historyService.items().length).toBe(1);
    expect(historyService.items()[0].value).toBe('VAL-NEW');
    expect(historyService.items()[0].svg).toBe('<svg>new</svg>');
  });

  it('prunes items older than 30 days retention window', () => {
    const now = Date.now();
    const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);

    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear()
    };
    (globalThis as any).window = { localStorage: mockStorage };

    try {
      const initialItems = [
        {
          id: 'recent-1',
          timestamp: now,
          name: 'Barcode 1',
          format: 'code128',
          formatLabel: 'Code 128',
          value: 'RECENT',
          displayValue: 'RECENT',
          options: DEFAULT_DESIGN_OPTIONS,
          formatOptions: {},
          svg: '<svg></svg>'
        },
        {
          id: 'expired-1',
          timestamp: thirtyOneDaysAgo,
          name: 'Barcode Old',
          format: 'code128',
          formatLabel: 'Code 128',
          value: 'EXPIRED',
          displayValue: 'EXPIRED',
          options: DEFAULT_DESIGN_OPTIONS,
          formatOptions: {},
          svg: '<svg></svg>'
        }
      ];

      store.set('acklet_barcode_history_v1', JSON.stringify(initialItems));

      const freshService = new BarcodeHistoryService();
      const items = freshService.items();

      // Expired item must be purged; only recent item remains
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('recent-1');
    } finally {
      delete (globalThis as any).window;
    }
  });
});

