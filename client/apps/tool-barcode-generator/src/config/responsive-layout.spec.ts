// apps/tool-barcode-generator/src/config/responsive-layout.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  BREAKPOINTS,
  MEDIA_QUERIES,
  RESPONSIVE_LAYOUT_TOKENS,
  getBreakpoint,
  getDeviceTier,
  isBreakpointXs,
  isBreakpointSm,
  isBreakpointMd,
  isBreakpointLg,
  isBreakpointXl,
  BreakpointKey,
  DeviceTierKey
} from './responsive-tokens';
import { ResponsiveService } from '../../../../packages/tool-shell/src/services/responsive.service';
import { BulkStateService } from '../services/bulk-state.service';
import { SheetLayoutService } from '../services/sheet-layout.service';
import { ValidatorService } from '../services/validator.service';
import { EncoderAdapter } from '../services/encoder-adapter.service';
import { RenderService } from '../services/render.service';
import { VerifyService } from '../services/verify.service';
import { FormatRegistryService } from '../services/format-registry.service';

describe('Responsive Layout & Breakpoint Tokens Acceptance Tests', () => {
  describe('Canonical 4-Breakpoint Definitions', () => {
    it('defines exact breakpoint thresholds without overlap or gaps', () => {
      expect(BREAKPOINTS.smMax).toBe(639);
      expect(BREAKPOINTS.mdMin).toBe(640);
      expect(BREAKPOINTS.mdMax).toBe(1023);
      expect(BREAKPOINTS.lgMin).toBe(1024);
      expect(BREAKPOINTS.lgMax).toBe(1439);
      expect(BREAKPOINTS.xlMin).toBe(1440);

      // Verify strict continuity
      expect(BREAKPOINTS.mdMin).toBe(BREAKPOINTS.smMax + 1);
      expect(BREAKPOINTS.lgMin).toBe(BREAKPOINTS.mdMax + 1);
      expect(BREAKPOINTS.xlMin).toBe(BREAKPOINTS.lgMax + 1);
    });

    it('classifies small screen widths (sm: 0 to 639px)', () => {
      const smSamples = [0, 320, 375, 414, 480, 600, 639];
      for (const w of smSamples) {
        expect(getBreakpoint(w)).toBe('sm');
        expect(isBreakpointSm(w)).toBe(true);
        expect(isBreakpointMd(w)).toBe(false);
        expect(isBreakpointLg(w)).toBe(false);
        expect(isBreakpointXl(w)).toBe(false);
      }
    });

    it('classifies medium screen widths (md: 640px to 1023px)', () => {
      const mdSamples = [640, 720, 768, 800, 900, 1023];
      for (const w of mdSamples) {
        expect(getBreakpoint(w)).toBe('md');
        expect(isBreakpointSm(w)).toBe(false);
        expect(isBreakpointMd(w)).toBe(true);
        expect(isBreakpointLg(w)).toBe(false);
        expect(isBreakpointXl(w)).toBe(false);
      }
    });

    it('classifies large screen widths (lg: 1024px to 1439px)', () => {
      const lgSamples = [1024, 1152, 1280, 1366, 1400, 1439];
      for (const w of lgSamples) {
        expect(getBreakpoint(w)).toBe('lg');
        expect(isBreakpointSm(w)).toBe(false);
        expect(isBreakpointMd(w)).toBe(false);
        expect(isBreakpointLg(w)).toBe(true);
        expect(isBreakpointXl(w)).toBe(false);
      }
    });

    it('classifies extra large screen widths (xl: 1440px and above)', () => {
      const xlSamples = [1440, 1536, 1600, 1920, 2560, 3840];
      for (const w of xlSamples) {
        expect(getBreakpoint(w)).toBe('xl');
        expect(isBreakpointSm(w)).toBe(false);
        expect(isBreakpointMd(w)).toBe(false);
        expect(isBreakpointLg(w)).toBe(false);
        expect(isBreakpointXl(w)).toBe(true);
      }
    });
    it('classifies extra small screen widths (xs: under 400px)', () => {
      const xsSamples = [0, 320, 360, 375, 399];
      for (const w of xsSamples) {
        expect(getDeviceTier(w)).toBe('xs');
        expect(isBreakpointXs(w)).toBe(true);
      }
      expect(isBreakpointXs(400)).toBe(false);
      expect(getDeviceTier(400)).toBe('sm');
    });
  });

  describe('Responsive Layout Tokens Compliance', () => {
    it('enforces required touch target, spacing, and desktop column limits', () => {
      expect(RESPONSIVE_LAYOUT_TOKENS.minTouchTarget).toBe('44px');
      expect(RESPONSIVE_LAYOUT_TOKENS.shellMaxWidth).toBe('1600px');
      expect(RESPONSIVE_LAYOUT_TOKENS.leftColMin).toBe('380px');
      expect(RESPONSIVE_LAYOUT_TOKENS.leftColMax).toBe('520px');
      expect(RESPONSIVE_LAYOUT_TOKENS.stepGapSm).toBe('16px');
      expect(RESPONSIVE_LAYOUT_TOKENS.stepGapLg).toBe('24px');
      expect(RESPONSIVE_LAYOUT_TOKENS.topbarHeightXs).toBe('52px');
      expect(RESPONSIVE_LAYOUT_TOKENS.stepBadgeSizeXs).toBe('24px');
      expect(RESPONSIVE_LAYOUT_TOKENS.paddingXs).toBe('8px');
      expect(RESPONSIVE_LAYOUT_TOKENS.cardPaddingXs).toBe('12px');
      expect(RESPONSIVE_LAYOUT_TOKENS.textareaMinHeightSm).toBe('120px');
      expect(RESPONSIVE_LAYOUT_TOKENS.textareaMinHeightLg).toBe('160px');
      expect(RESPONSIVE_LAYOUT_TOKENS.separatorMaxWidthMd).toBe('280px');
      expect(RESPONSIVE_LAYOUT_TOKENS.topbarHeightSmMd).toBe('56px');
      expect(RESPONSIVE_LAYOUT_TOKENS.topbarHeightLgXl).toBe('64px');
      expect(RESPONSIVE_LAYOUT_TOKENS.focusRingColor).toBe('#2563EB');
    });

    it('provides standard media query strings matching token boundaries', () => {
      expect(MEDIA_QUERIES.xs).toBe('(max-width: 399px)');
      expect(MEDIA_QUERIES.sm).toBe('(max-width: 639px)');
      expect(MEDIA_QUERIES.md).toBe('(min-width: 640px) and (max-width: 1023px)');
      expect(MEDIA_QUERIES.lg).toBe('(min-width: 1024px) and (max-width: 1439px)');
      expect(MEDIA_QUERIES.xl).toBe('(min-width: 1440px)');
    });
  });

  describe('ResponsiveService Breakpoint Signal Integration', () => {
    it('correctly maps width dimensions to breakpoint signals', () => {
      const service = new ResponsiveService();

      // Test xs device tier (e.g. 360px Samsung Galaxy A55)
      service.setViewportDimensions(360, 800);
      expect(service.breakpoint()).toBe('sm');
      expect(service.isSm()).toBe(true);
      expect(service.isXs()).toBe(true);
      expect(service.isMd()).toBe(false);
      expect(service.isLg()).toBe(false);
      expect(service.isXl()).toBe(false);

      // Test sm breakpoint (e.g. 420px phone)
      service.setViewportDimensions(420, 800);
      expect(service.breakpoint()).toBe('sm');
      expect(service.isSm()).toBe(true);
      expect(service.isXs()).toBe(false);
      expect(service.isMd()).toBe(false);
      expect(service.isMd()).toBe(false);
      expect(service.isLg()).toBe(false);
      expect(service.isXl()).toBe(false);

      // Test md breakpoint (e.g. 768px tablet portrait)
      service.setViewportDimensions(768, 1024);
      expect(service.breakpoint()).toBe('md');
      expect(service.isSm()).toBe(false);
      expect(service.isMd()).toBe(true);
      expect(service.isLg()).toBe(false);
      expect(service.isXl()).toBe(false);

      // Test lg breakpoint (e.g. 1280px laptop)
      service.setViewportDimensions(1280, 800);
      expect(service.breakpoint()).toBe('lg');
      expect(service.isSm()).toBe(false);
      expect(service.isMd()).toBe(false);
      expect(service.isLg()).toBe(true);
      expect(service.isXl()).toBe(false);

      // Test xl breakpoint (e.g. 1920px desktop monitor)
      service.setViewportDimensions(1920, 1080);
      expect(service.breakpoint()).toBe('xl');
      expect(service.isSm()).toBe(false);
      expect(service.isMd()).toBe(false);
      expect(service.isLg()).toBe(false);
      expect(service.isXl()).toBe(true);
    });
  });

  describe('State Preservation across Responsive Transitions', () => {
    let bulkState: BulkStateService;

    beforeEach(() => {
      const registry = new FormatRegistryService();
      const sheetLayout = new SheetLayoutService();
      const encoder = new EncoderAdapter();
      const render = new RenderService(encoder);
      const verifyService = new VerifyService();
      const validator = new ValidatorService();

      const rootInjector = {
        get: (token: any, notFound?: any) => {
          if (token === FormatRegistryService) return registry;
          if (token === SheetLayoutService) return sheetLayout;
          if (token === EncoderAdapter) return encoder;
          if (token === RenderService) return render;
          if (token === VerifyService) return verifyService;
          if (token === ValidatorService) return validator;
          return notFound;
        }
      } as any;

      const envInjector = createEnvironmentInjector([], rootInjector);

      runInInjectionContext(envInjector, () => {
        bulkState = new BulkStateService();
      });
    });

    it('preserves entered records and settings through simulated mobile rotation/resizing', () => {
      // 1. Enter records in bulk state
      const records = [
        { rowNumber: 1, value: 'ITEM-001', encodedValue: 'ITEM-001', status: 'valid' as const },
        { rowNumber: 2, value: 'ITEM-002', encodedValue: 'ITEM-002', status: 'valid' as const },
        { rowNumber: 3, value: 'ITEM-003', encodedValue: 'ITEM-003', status: 'valid' as const }
      ];
      bulkState.sourceMode.set('list');
      bulkState.reviewedRecords.set(records);

      expect(bulkState.activeValidRecords().length).toBe(3);
      expect(bulkState.activeValidRecords()[0].value).toBe('ITEM-001');

      // 2. Change caption and format settings
      bulkState.captionColor.set('#DC2626');
      bulkState.captionFontSizePt.set(8);
      bulkState.formatId.set('code128');

      // 3. Simulate breakpoint change (mobile sm -> desktop lg)
      // Bulk state is retained without resetting
      expect(bulkState.activeValidRecords().length).toBe(3);
      expect(bulkState.captionColor()).toBe('#DC2626');
      expect(bulkState.captionFontSizePt()).toBe(8);
      expect(bulkState.formatId()).toBe('code128');
    });

    it('retains CSV uploaded records without clearing data during responsive adaptations', () => {
      const csvData = 'barcode,product_name\n8901063012345,Amul Butter 100g\n8901030123456,Parle-G Biscuits\n8901058845123,Maggi Noodles';
      bulkState.loadCsvFile('inventory.csv', csvData);

      expect(bulkState.csvFileName()).toBe('inventory.csv');
      expect(bulkState.csvRawText()).toBe(csvData);

      const records = [
        { rowNumber: 1, value: '8901063012345', labelText: 'Amul Butter 100g', status: 'valid' as const },
        { rowNumber: 2, value: '8901030123456', labelText: 'Parle-G Biscuits', status: 'valid' as const },
        { rowNumber: 3, value: '8901058845123', labelText: 'Maggi Noodles', status: 'valid' as const }
      ];
      bulkState.reviewedRecords.set(records);

      expect(bulkState.reviewedRecords().length).toBe(3);
      expect(bulkState.activeValidRecords().length).toBe(3);

      // Verify that zoom changes (from dropdown on sm/md or segmented on lg/xl) do not alter record data
      bulkState.zoomMode.set('fit');
      expect(bulkState.zoomMode()).toBe('fit');
      expect(bulkState.activeValidRecords().length).toBe(3);

      bulkState.zoomMode.set('150');
      expect(bulkState.zoomMode()).toBe('150');
      expect(bulkState.activeValidRecords().length).toBe(3);
    });
  });
});

