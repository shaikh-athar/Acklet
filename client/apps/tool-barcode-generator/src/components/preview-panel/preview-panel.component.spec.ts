// @vitest-environment jsdom
// apps/tool-barcode-generator/src/components/preview-panel/preview-panel.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BarcodePreviewPanelComponent } from './preview-panel.component';
import { ShareService } from '../../services/share.service';
import { BarcodeFormat } from '../../models/barcode.models';

describe('BarcodePreviewPanelComponent', () => {
  let component: BarcodePreviewPanelComponent;
  let formatSignal: WritableSignal<BarcodeFormat>;
  let isValidSignal: WritableSignal<boolean>;
  let svgContentSignal: WritableSignal<string>;
  let renderErrorSignal: WritableSignal<string | null>;
  let isGeneratingSignal: WritableSignal<boolean>;
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];

  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 567 220" width="567" height="220"><rect x="0" y="0" width="567" height="220" fill="#FFFFFF"/><path d="M10 10h4v150h-4z" fill="#000000"/></svg>`;

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];

    let urlCounter = 1;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const u = `blob:http://localhost/mock-barcode-${urlCounter++}`;
      createdUrls.push(u);
      return u;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u: string) => {
      revokedUrls.push(u);
    });

    formatSignal = signal<BarcodeFormat>('code128');
    isValidSignal = signal<boolean>(false);
    svgContentSignal = signal<string>('');
    renderErrorSignal = signal<string | null>(null);
    isGeneratingSignal = signal<boolean>(false);

    const mockShareService = {
      isShareable: vi.fn().mockReturnValue(true),
      copyShareLink: vi.fn().mockResolvedValue(true)
    };

    const mockSanitizer = {
      bypassSecurityTrustUrl: vi.fn().mockImplementation((url: string) => url),
      bypassSecurityTrustHtml: vi.fn().mockImplementation((html: string) => html)
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ShareService) return mockShareService;
        if (token === DomSanitizer) return mockSanitizer;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new BarcodePreviewPanelComponent();
      (component as any).format = formatSignal;
      (component as any).isValid = isValidSignal;
      (component as any).svgContent = svgContentSignal;
      (component as any).renderError = renderErrorSignal;
      (component as any).isGenerating = isGeneratingSignal;
      (component as any).barcodeName = signal('My Barcode');
      (component as any).shouldAnimate = signal(false);
      (component as any).verification = signal(null);
      (component as any).historyCount = signal(0);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty & Initial State', () => {
    it('does not have valid render when value is empty or invalid', () => {
      isValidSignal.set(false);
      svgContentSignal.set('');
      renderErrorSignal.set(null);

      expect(component.hasValidRender()).toBe(false);
      expect(component.barcodeImageUrl()).toBeNull();
    });
  });

  describe('Active Barcode Preview', () => {
    it('creates an image blob URL and marks render as valid when valid SVG is provided', () => {
      isValidSignal.set(true);
      svgContentSignal.set(sampleSvg);
      renderErrorSignal.set(null);

      // Trigger updateBlobUrl
      (component as any).updateBlobUrl(sampleSvg, true);

      expect(component.barcodeImageUrl()).not.toBeNull();
      expect(component.barcodeImageUrl()).toContain('blob:');
      expect(component.hasValidRender()).toBe(true);
    });

    it('creates and revokes blob URLs cleanly when content updates and on destroy', () => {
      isValidSignal.set(true);
      svgContentSignal.set(sampleSvg);

      (component as any).updateBlobUrl(sampleSvg, true);
      expect(createdUrls.length).toBe(1);
      const firstUrl = createdUrls[0];

      // Second render
      const updatedSvg = sampleSvg.replace('#FFFFFF', '#F8FAFC');
      (component as any).updateBlobUrl(updatedSvg, true);

      expect(createdUrls.length).toBe(2);
      expect(revokedUrls).toContain(firstUrl);

      // Component destruction
      const secondUrl = createdUrls[1];
      component.ngOnDestroy();
      expect(revokedUrls).toContain(secondUrl);
    });
  });

  describe('Render Error Handling', () => {
    it('sets hasValidRender to false when renderError is present', () => {
      isValidSignal.set(true);
      svgContentSignal.set(sampleSvg);
      (component as any).updateBlobUrl(sampleSvg, true);
      renderErrorSignal.set('The barcode could not be drawn. Try again or change the format.');

      expect(component.hasValidRender()).toBe(false);
      expect(component.renderError()).toBe('The barcode could not be drawn. Try again or change the format.');
    });
  });

  describe('Preview Template & Styling Contracts', () => {
    it('defines barcodeImageUrl signal and conditional render states', () => {
      expect(component.barcodeImageUrl).toBeDefined();
      expect(component.hasValidRender).toBeDefined();
      expect(component.renderError).toBeDefined();

      const cmpDef = (BarcodePreviewPanelComponent as any).ɵcmp;
      expect(cmpDef).toBeDefined();
      expect(typeof cmpDef.template).toBe('function');
    });

    it('defines paper-card background and reduced-motion rules in styles', () => {
      const cmpDef = (BarcodePreviewPanelComponent as any).ɵcmp;
      const styles = cmpDef.styles?.join(' ') || '';

      expect(styles).toContain('.paper-card');
      expect(styles).toContain('.barcode-preview-img');
      expect(styles).toContain('prefers-reduced-motion');
      expect(styles).toContain('.svg-render-container');
      expect(styles).toContain('.save-separate-btn');
      expect(styles).toContain('.barcode-top-action-wrap');
    });
  });
});
