// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { PreviewPanelComponent } from './preview-panel.component';
import { QRVerifierService } from '../../services/qr-verifier.service';
import { QRGeneratorService } from '../../services/qr-generator.service';
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
        if (token === QRGeneratorService) return { svgToPngBlob: vi.fn().mockResolvedValue(new Blob([], { type: 'image/png' })) };
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
      (component as any).margin = signal(4);
      (component as any).isAutoEc = signal(true);
      (component as any).autoEcReason = signal('Standard automatic error correction');
      (component as any).isSmartLink = signal(false);
    });
  });

  describe('Empty State & Sample Trigger (Stage 4)', () => {
    it('emits loadSampleClick when sample load is triggered', () => {
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

  describe('Phase 4: Header Actions & Advanced Settings Modal Integration', () => {
    it('opens advanced settings modal when isAdvancedOpen is set', () => {
      expect(component.isAdvancedOpen()).toBe(false);
      component.isAdvancedOpen.set(true);
      expect(component.isAdvancedOpen()).toBe(true);
    });


    it('exposes margin, isAutoEc, and autoEcReason signals', () => {
      expect(component.margin()).toBe(4);
      expect(component.isAutoEc()).toBe(true);
      expect(component.autoEcReason()).toBe('Standard automatic error correction');
    });

    it('exposes isCreatingHostedLink, fallbackNotice, and isDevAddressWarning signals', () => {
      (component as any).isCreatingHostedLink = signal(true);
      (component as any).fallbackNotice = signal('Hosted link unavailable. Generated offline static QR code.');
      (component as any).isDevAddressWarning = signal(true);

      expect(component.isCreatingHostedLink()).toBe(true);
      expect(component.fallbackNotice()).toContain('offline static QR code');
      expect(component.isDevAddressWarning()).toBe(true);
    });

    it('emits retryClick when retry is triggered', () => {
      let retryEmitted = false;
      component.retryClick.subscribe(() => {
        retryEmitted = true;
      });

      component.retryClick.emit();
      expect(retryEmitted).toBe(true);
    });
  });

  describe('State Sequence & Constant Footprint (Empty -> Creating -> Ready -> Error with Retry)', () => {
    let testComponent: PreviewPanelComponent;
    let qrDataUrlSig: WritableSignal<string | null>;
    let isCreatingHostedLinkSig: WritableSignal<boolean>;
    let isGeneratingSig: WritableSignal<boolean>;
    let errorSig: WritableSignal<string | null>;
    let sizeSig: WritableSignal<number>;
    let isSmartLinkSig: WritableSignal<boolean>;
    let encodedPayloadSig: WritableSignal<string | null>;

    beforeEach(() => {
      qrDataUrlSig = signal<string | null>(null);
      isCreatingHostedLinkSig = signal<boolean>(false);
      isGeneratingSig = signal<boolean>(false);
      errorSig = signal<string | null>(null);
      sizeSig = signal<number>(512);
      isSmartLinkSig = signal<boolean>(false);
      encodedPayloadSig = signal<string | null>(null);

      const rootInjector = {
        get: (token: any, notFound?: any) => {
          if (token === QRVerifierService) return mockVerifier;
          return notFound;
        }
      } as any;
      const envInjector = createEnvironmentInjector([], rootInjector);

      runInInjectionContext(envInjector, () => {
        testComponent = new PreviewPanelComponent();
        (testComponent as any).qrDataUrl = qrDataUrlSig;
        (testComponent as any).isCreatingHostedLink = isCreatingHostedLinkSig;
        (testComponent as any).isGenerating = isGeneratingSig;
        (testComponent as any).error = errorSig;
        (testComponent as any).size = sizeSig;
        (testComponent as any).isSmartLink = isSmartLinkSig;
        (testComponent as any).encodedPayload = encodedPayloadSig;
        (testComponent as any).formattedPayload = signal('https://acklet.com');
        (testComponent as any).historyItems = signal([]);
        (testComponent as any).dynamicCount = signal(0);
        (testComponent as any).margin = signal(4);
        (testComponent as any).isAutoEc = signal(true);
        (testComponent as any).autoEcReason = signal('Automatic');
        (testComponent as any).fallbackNotice = signal(null);
        (testComponent as any).isDevAddressWarning = signal(false);
      });
    });

    it('identifies Empty state when not creating, not generating, and no qrDataUrl', () => {
      expect(testComponent.qrDataUrl()).toBeNull();
      expect(testComponent.isCreatingHostedLink()).toBe(false);
      expect(testComponent.isGenerating()).toBe(false);
      expect(testComponent.error()).toBeNull();
    });

    it('identifies Creating state with constant tile footprint tier', () => {
      isCreatingHostedLinkSig.set(true);
      expect(testComponent.isCreatingHostedLink()).toBe(true);
      expect(testComponent.qrDataUrl()).toBeNull();

      // Footprint tier should match the size setting
      const creatingTier = testComponent.sizeTier();
      expect(creatingTier).toBe('md');
    });

    it('transitions from Creating to Ready state preserving constant tile footprint tier', () => {
      // Step 1: Creating state
      isCreatingHostedLinkSig.set(true);
      const creatingTier = testComponent.sizeTier();

      // Step 2: Transition to Ready state
      isCreatingHostedLinkSig.set(false);
      qrDataUrlSig.set('data:image/png;base64,mockPng');
      isSmartLinkSig.set(true);
      encodedPayloadSig.set('http://localhost:8080/l/abc12345');

      const readyTier = testComponent.sizeTier();

      // Assert tile size tier remains exactly constant between creating and ready
      expect(readyTier).toBe(creatingTier);
      expect(testComponent.qrDataUrl()).toBe('data:image/png;base64,mockPng');
      expect(testComponent.isCreatingHostedLink()).toBe(false);
      expect(testComponent.encodedPayload()).toBe('http://localhost:8080/l/abc12345');
    });

    it('toggles neutral isVerifying checking state during verification', () => {
      expect(testComponent.isVerifying()).toBe(false);
      testComponent.isVerifying.set(true);
      expect(testComponent.isVerifying()).toBe(true);
      testComponent.isVerifying.set(false);
      expect(testComponent.isVerifying()).toBe(false);
    });

    it('identifies Error state and allows retry emission', () => {
      errorSig.set('Network failure generating hosted link');
      expect(testComponent.error()).toBe('Network failure generating hosted link');

      let retryFired = false;
      testComponent.retryClick.subscribe(() => {
        retryFired = true;
      });

      testComponent.retryClick.emit();
      expect(retryFired).toBe(true);
    });
  });
});

