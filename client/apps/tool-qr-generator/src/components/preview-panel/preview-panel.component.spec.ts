// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { PreviewPanelComponent } from './preview-panel.component';
import { QRVerifierService } from '../../services/qr-verifier.service';
import { ExportFormat } from '../../models/qr-generator.models';

describe('PreviewPanelComponent', () => {
  let component: PreviewPanelComponent;
  let qrDataUrlSignal: WritableSignal<string | null>;
  let isGeneratingSignal: WritableSignal<boolean>;
  let errorSignal: WritableSignal<string | null>;
  let mockVerifier: Partial<QRVerifierService>;

  beforeEach(() => {
    qrDataUrlSignal = signal<string | null>(null);
    isGeneratingSignal = signal<boolean>(false);
    errorSignal = signal<string | null>(null);

    mockVerifier = {
      verifyScannability: vi.fn().mockResolvedValue({
        isScannable: true,
        expectedPayload: 'https://acklet.com',
        actualPayload: 'https://acklet.com',
        match: true,
        message: 'Matches perfectly'
      })
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === QRVerifierService) return mockVerifier;
        return notFound;
      }
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    const sizeSignal = signal(512);

    runInInjectionContext(envInjector, () => {
      component = new PreviewPanelComponent();
      (component as any).qrDataUrl = qrDataUrlSignal;
      (component as any).isGenerating = isGeneratingSignal;
      (component as any).error = errorSignal;
      (component as any).historyItems = signal([]);
      (component as any).dynamicCount = signal(0);
      (component as any).formattedPayload = signal('https://acklet.com');
      (component as any).content = signal('https://acklet.com');
      (component as any).size = sizeSignal;
      (component as any).sizeTier = () => {
        const s = sizeSignal();
        if (s <= 256) return 'sm';
        if (s <= 512) return 'md';
        if (s <= 1024) return 'lg';
        return 'xl';
      };
    });
  });

  describe('Empty State & Sample Trigger (Stage 4)', () => {
    it('emits loadSampleClick when Try an Example is triggered', () => {
      let emitted = false;
      component.loadSampleClick.subscribe(() => {
        emitted = true;
      });

      component.loadSampleClick.emit();
      expect(emitted).toBe(true);
    });

    it('identifies when QR code preview is absent', () => {
      expect(component.qrDataUrl()).toBeNull();
      expect(component.isGenerating()).toBe(false);
      expect(component.error()).toBeNull();
    });
  });

  describe('Download Actions with Generation Guard', () => {
    it('emits downloadClick with format when QR is present and not generating', () => {
      qrDataUrlSignal.set('data:image/png;base64,mockPngData');
      isGeneratingSignal.set(false);

      let chosenFormat: ExportFormat | null = null;
      component.downloadClick.subscribe((format) => {
        chosenFormat = format;
      });

      component.onDownload('png');
      expect(chosenFormat).toBe('png');

      component.onDownload('svg');
      expect(chosenFormat).toBe('svg');
    });

    it('does not emit downloadClick when generating', () => {
      qrDataUrlSignal.set('data:image/png;base64,mockPngData');
      isGeneratingSignal.set(true);

      let emitted = false;
      component.downloadClick.subscribe(() => {
        emitted = true;
      });

      component.onDownload('png');
      expect(emitted).toBe(false);
    });

    it('does not emit downloadClick when qrDataUrl is null', () => {
      qrDataUrlSignal.set(null);
      isGeneratingSignal.set(false);

      let emitted = false;
      component.downloadClick.subscribe(() => {
        emitted = true;
      });

      component.onDownload('png');
      expect(emitted).toBe(false);
    });
  });

  describe('Resolution & Size Tiers (Stage 5)', () => {
    it('computes correct size tiers for proportional preview styling', () => {
      expect(component.sizeTier()).toBe('md');

      (component as any).size.set(256);
      expect(component.sizeTier()).toBe('sm');

      (component as any).size.set(1024);
      expect(component.sizeTier()).toBe('lg');

      (component as any).size.set(2048);
      expect(component.sizeTier()).toBe('xl');
    });
  });
});

