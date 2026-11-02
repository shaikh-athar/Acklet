// @vitest-environment jsdom
// apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BarcodeBulkPreviewComponent } from './bulk-preview.component';
import { BulkStateService } from '../../services/bulk-state.service';
import { SheetLayoutService } from '../../services/sheet-layout.service';
import { PdfBuilderService } from '../../services/pdf-builder.service';
import { BulkGeneratorService } from '../../services/bulk-generator.service';
import { LABEL_SHEET_PRESETS } from '../../config/label-templates.config';

describe('BarcodeBulkPreviewComponent', () => {
  let component: BarcodeBulkPreviewComponent;
  let mockBulkState: any;
  let mockPdfBuilder: any;
  let mockBulkGenerator: any;

  beforeEach(() => {
    const triggerGenerateRun = signal<number>(0);
    const previewPage = signal<number>(1);
    const totalPreviewPages = signal<number>(3);
    const activeValidRecords = signal<any[]>([]);
    const reviewedRecords = signal<any[]>([]);
    const outputType = signal<string>('print-sheet');
    const zoomMode = signal<string>('fit');
    const nudgeXmm = signal<number>(0);
    const nudgeYmm = signal<number>(0);
    const formatId = signal<string>('code128');

    mockBulkState = {
      triggerGenerateRun,
      formatId,
      triggerGenerate: vi.fn(() => triggerGenerateRun.update(n => n + 1)),
      previewPage,
      totalPreviewPages,
      prevPage: vi.fn(() => {
        if (previewPage() > 1) previewPage.update(p => p - 1);
      }),
      nextPage: vi.fn(() => {
        if (previewPage() < totalPreviewPages()) previewPage.update(p => p + 1);
      }),
      activeValidRecords,
      reviewedRecords,
      outputType,
      zoomMode,
      nudgeXmm,
      nudgeYmm,
      currentPreset: signal(LABEL_SHEET_PRESETS[0]),
      currentRollPreset: signal({ name: '50x25' }),
      currentPageModel: signal(undefined),
      labelsPerPage: signal(30),
      previewItems: signal([]),
      isRunning: signal(false),
      sheetPages: signal([]),
      rollLabels: signal([]),
      hasCaptions: signal(false),
      captionStyle: signal({
        fontSizePt: 'auto',
        color: '#334155',
        bold: false,
        fontFamily: 'sans',
        transform: 'none',
        align: 'center'
      }),
      isGenerated: signal(true),
      generatedItems: signal([]),
      verificationSummary: signal(null),
      captionFontSizePt: signal('auto'),
      captionColor: signal('#334155'),
      captionBold: signal(false),
      captionFontFamily: signal('sans'),
      captionTransform: signal('none'),
      captionAlign: signal('center'),
      resetCaptionStyle: vi.fn()
    };

    const mockSanitizer = {
      bypassSecurityTrustHtml: vi.fn().mockImplementation((html: string) => html)
    };

    mockPdfBuilder = {
      generateLabelSheetPdfFromModel: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      generateAlignmentTestPagePdf: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6]))
    };

    mockBulkGenerator = {
      triggerDownload: vi.fn(),
      generateManifestCsv: vi.fn().mockReturnValue('manifest,data'),
      generateErrorReportCsv: vi.fn().mockReturnValue('row,value,error\n1,bad,invalid')
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === BulkStateService) return mockBulkState;
        if (token === SheetLayoutService) return new SheetLayoutService();
        if (token === DomSanitizer) return mockSanitizer;
        if (token === PdfBuilderService) return mockPdfBuilder;
        if (token === BulkGeneratorService) return mockBulkGenerator;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new BarcodeBulkPreviewComponent();
    });
  });

  describe('F8: Bottom Action Bar & Navigation', () => {
    it('triggers bulk generation run when Download is clicked', () => {
      expect(mockBulkState.triggerGenerateRun()).toBe(0);
      component.onDownload();
      expect(mockBulkState.triggerGenerate).toHaveBeenCalled();
      expect(mockBulkState.triggerGenerateRun()).toBe(1);
    });

    it('navigates pages on ArrowRight and ArrowLeft keydown events', () => {
      expect(mockBulkState.previewPage()).toBe(1);

      // ArrowRight -> page 2
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onKeydown(rightEvent);
      expect(mockBulkState.nextPage).toHaveBeenCalled();
      expect(mockBulkState.previewPage()).toBe(2);

      // ArrowLeft -> page 1
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      component.onKeydown(leftEvent);
      expect(mockBulkState.prevPage).toHaveBeenCalled();
      expect(mockBulkState.previewPage()).toBe(1);
    });

    it('generates alignment test page on onPrintAlignment()', () => {
      component.onPrintAlignment();
      expect(mockPdfBuilder.generateAlignmentTestPagePdf).toHaveBeenCalled();
      expect(mockBulkGenerator.triggerDownload).toHaveBeenCalled();
    });

    it('exports manifest CSV on onExportManifest()', () => {
      mockBulkState.activeValidRecords.set([
        { value: '1001', cleanValue: '1001' }
      ]);
      component.onExportManifest();
      expect(mockBulkGenerator.generateManifestCsv).toHaveBeenCalled();
      expect(mockBulkGenerator.triggerDownload).toHaveBeenCalled();
    });
  });

  describe('F9: Empty state representation', () => {
    it('reports 0 labels ready when active valid records is 0', () => {
      mockBulkState.activeValidRecords.set([]);
      expect(component.actionSummaryText()).toBe('0 labels ready');
    });

    it('reports label count and page count when active valid records exist', () => {
      mockBulkState.activeValidRecords.set([
        { value: '1001' },
        { value: '1002' }
      ]);
      expect(component.actionSummaryText()).toBe('2 labels, 3 pages (Page 1 of 3)');
    });
  });

  describe('Round 3: Zoom Segmented Control (Finding F4)', () => {
    it('updates zoom mode to fit, 100%, and 150%', () => {
      expect(mockBulkState.zoomMode()).toBe('fit');
      expect(component.sheetZoomWidthStyle()).toBe('100%');

      component.setZoom('100');
      expect(mockBulkState.zoomMode()).toBe('100');

      component.setZoom('150');
      expect(mockBulkState.zoomMode()).toBe('150');
    });

    it('computes zoom width in pixels for sheet and roll modes based on millimeters at 96 CSS DPI', () => {
      mockBulkState.currentPageModel.set({
        pageWidthMm: 210,
        pageHeightMm: 297,
        pageNumber: 1,
        totalPages: 1,
        labels: []
      });

      component.setZoom('100');
      // 210 mm * (96 / 25.4) = 793.7 px -> 794px
      expect(component.sheetZoomWidthStyle()).toBe('794px');

      component.setZoom('150');
      // 793.7 * 1.5 = 1190.5 px -> 1191px
      expect(component.sheetZoomWidthStyle()).toBe('1191px');
    });
  });

  describe('Round 3: Label Roll Series Preview (Finding F5)', () => {
    it('recognizes roll mode and formats action summary for rolls', () => {
      mockBulkState.outputType.set('label-roll');
      mockBulkState.currentRollPreset.set({
        id: '50x25',
        name: '50 × 25 mm',
        widthMm: 50,
        heightMm: 25
      });
      mockBulkState.activeValidRecords.set([
        { value: 'ITEM-1', status: 'valid' },
        { value: 'ITEM-2', status: 'valid' }
      ]);

      expect(component.isRollMode()).toBe(true);
      expect(component.isSheetMode()).toBe(false);
      expect(component.actionSummaryText()).toBe('2 labels on roll (50 × 25 mm)');
    });

    it('maps rollLabels models to safeSvg rendered outputs in rollLabelsWithSvg', () => {
      mockBulkState.outputType.set('label-roll');
      mockBulkState.rollLabels.set([
        {
          index: 1,
          widthMm: 50,
          heightMm: 25,
          innerX: 1.5,
          innerY: 1.5,
          innerWidth: 47,
          innerHeight: 22,
          barcodeAreaX: 2,
          barcodeAreaY: 2,
          barcodeAreaW: 46,
          barcodeAreaH: 18,
          captionX: 25,
          captionY: 23,
          hasItem: true,
          value: 'ROLL-1',
          svg: '<svg viewBox="0 0 200 100"><path d="M0 0h10v100H0z"/></svg>',
          textSizePt: 8,
          fits: true
        }
      ]);

      const items = component.rollLabelsWithSvg();
      expect(items.length).toBe(1);
      expect(items[0].model.index).toBe(1);
      expect(items[0].safeSvg).toBeDefined();
    });
  });

  describe('Round 3: Hidden Iframe Print (Finding F3)', () => {
    it('creates a hidden iframe with @page rules and does NOT call window.print()', () => {
      const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      mockBulkState.outputType.set('print-sheet');
      mockBulkState.activeValidRecords.set([{ value: 'PRINT-1', status: 'valid' }]);
      mockBulkState.sheetPages.set([
        {
          pageNumber: 1,
          totalPages: 1,
          pageWidthMm: 210,
          pageHeightMm: 297,
          labels: []
        }
      ]);

      component.onPrint();

      // Main window print must NOT be called directly
      expect(windowPrintSpy).not.toHaveBeenCalled();

      windowPrintSpy.mockRestore();
    });
  });

  describe('Runtime Caption Toast Popup & Formatting Controls', () => {
    it('initializes with default toast open and preset options', () => {
      expect(component.isCaptionToastOpen()).toBe(true);
      expect(component.fontSizes.length).toBe(6);
      expect(component.colorPresets.length).toBe(5);
    });

    it('toggles font family between sans and mono', () => {
      expect(mockBulkState.captionFontFamily()).toBe('sans');
      component.toggleFontFamily();
      expect(mockBulkState.captionFontFamily()).toBe('mono');
      component.toggleFontFamily();
      expect(mockBulkState.captionFontFamily()).toBe('sans');
    });

    it('toggles uppercase transform', () => {
      expect(mockBulkState.captionTransform()).toBe('none');
      component.toggleTransform();
      expect(mockBulkState.captionTransform()).toBe('uppercase');
      component.toggleTransform();
      expect(mockBulkState.captionTransform()).toBe('none');
    });

    it('updates caption color via custom color change event', () => {
      const mockEvent = {
        target: { value: '#7C3AED' }
      } as unknown as Event;
      component.onCustomColorChange(mockEvent);
      expect(mockBulkState.captionColor()).toBe('#7C3AED');
    });
  });
});
