// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/batch-generator/batch-generator.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { QrBatchGeneratorComponent } from './batch-generator.component';
import { QRGeneratorService } from '../../services/qr-generator.service';

describe('QrBatchGeneratorComponent', () => {
  let component: QrBatchGeneratorComponent;

  beforeEach(() => {
    const mockQrService = new QRGeneratorService();
    component = new QrBatchGeneratorComponent(mockQrService);
  });

  it('initializes with empty state and zero items', () => {
    expect(component.items().length).toBe(0);
    expect(component.isGenerating()).toBe(false);
    expect(component.isZipping()).toBe(false);
    expect(component.rawText()).toBe('');
  });

  it('loads sample CSV and parses multiple items correctly', () => {
    component.loadSampleCsv();
    expect(component.items().length).toBe(6);
    expect(component.items()[0].title).toBe('Product Alpha');
    expect(component.items()[0].content).toBe('https://acklet.com/products/alpha');
    expect(component.items()[0].status).toBe('pending');
  });

  it('parses plain URL lists without headers', () => {
    const list = 'https://acklet.com/page1\nhttps://acklet.com/page2\nhttps://acklet.com/page3';
    (component as any).parseContent(list);
    expect(component.items().length).toBe(3);
    expect(component.items()[0].title).toBe('Item 1');
    expect(component.items()[0].content).toBe('https://acklet.com/page1');
  });

  it('computes progress percentage accurately', () => {
    component.progress.set({ current: 5, total: 10 });
    expect(component.progressPercent()).toBe(50);
  });

  it('clears all items and input when clearAll() is invoked', () => {
    component.loadSampleCsv();
    expect(component.items().length).toBe(6);
    component.clearAll();
    expect(component.items().length).toBe(0);
    expect(component.rawText()).toBe('');
  });
});
