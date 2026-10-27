// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/advanced-modal/advanced-modal.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { AdvancedModalComponent, AdvancedSettingsState } from './advanced-modal.component';
import { ErrorCorrectionLevel, QRMetadata } from '../../models/qr-generator.models';

describe('AdvancedModalComponent (Phase 4: Restructure Advanced Settings Modal)', () => {
  let component: AdvancedModalComponent;
  let isOpenSignal: WritableSignal<boolean>;
  let errorCorrectionSignal: WritableSignal<ErrorCorrectionLevel>;
  let isAutoEcSignal: WritableSignal<boolean>;
  let autoEcReasonSignal: WritableSignal<string | undefined>;
  let sizeSignal: WritableSignal<number>;
  let marginSignal: WritableSignal<number>;
  let isSmartLinkSignal: WritableSignal<boolean>;
  let metadataSignal: WritableSignal<QRMetadata | null>;
  let formattedPayloadSignal: WritableSignal<string | undefined>;

  const STORAGE_KEY = 'acklet_qr_advanced_settings';

  beforeEach(() => {
    localStorage.clear();

    isOpenSignal = signal<boolean>(false);
    errorCorrectionSignal = signal<ErrorCorrectionLevel>('M');
    isAutoEcSignal = signal<boolean>(true);
    autoEcReasonSignal = signal<string | undefined>('Balanced scannability');
    sizeSignal = signal<number>(2048);
    marginSignal = signal<number>(4);
    isSmartLinkSignal = signal<boolean>(false);
    metadataSignal = signal<QRMetadata | null>({
      version: 4,
      capacity: 114,
      used: 65,
      usagePercent: 57
    });
    formattedPayloadSignal = signal<string | undefined>('https://acklet.link/q/demo123');

    const rootInjector = {
      get: (token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      component = new AdvancedModalComponent();
      (component as any).isOpen = isOpenSignal;
      (component as any).errorCorrection = errorCorrectionSignal;
      (component as any).isAutoEc = isAutoEcSignal;
      (component as any).autoEcReason = autoEcReasonSignal;
      (component as any).size = sizeSignal;
      (component as any).margin = marginSignal;
      (component as any).isSmartLink = isSmartLinkSignal;
      (component as any).metadata = metadataSignal;
      (component as any).formattedPayload = formattedPayloadSignal;
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Modal Open, Close & Dismissal Interactions', () => {
    it('emits close output on escape key when modal is open', () => {
      isOpenSignal.set(true);
      let closed = false;
      component.close.subscribe(() => {
        closed = true;
      });

      component.onEscape();
      expect(closed).toBe(true);
    });

    it('does not emit close output on escape key when modal is closed', () => {
      isOpenSignal.set(false);
      let closed = false;
      component.close.subscribe(() => {
        closed = true;
      });

      component.onEscape();
      expect(closed).toBe(false);
    });

    it('emits close output on backdrop click', () => {
      let closed = false;
      component.close.subscribe(() => {
        closed = true;
      });

      component.onBackdropClick({} as MouseEvent);
      expect(closed).toBe(true);
    });
  });

  describe('Section 1: Error Correction Mode & Levels', () => {
    it('computes activeLevel from errorCorrection input signal', () => {
      errorCorrectionSignal.set('H');
      expect(component.activeLevel()).toBe('H');
      expect(component.activeEcConfig().recovery).toBe('~30%');
    });

    it('toggles Auto EC mode and updates localStorage', () => {
      let autoEcResult: boolean | null = null;
      component.isAutoEcChange.subscribe((val) => {
        autoEcResult = val;
      });

      component.setAutoEc(true);
      expect(autoEcResult).toBe(true);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.isAutoEc).toBe(true);
    });

    it('sets manual EC level, disabling auto mode and persisting state', () => {
      let autoEcResult: boolean | null = null;
      let ecResult: ErrorCorrectionLevel | null = null;

      component.isAutoEcChange.subscribe((val) => {
        autoEcResult = val;
      });
      component.errorCorrectionChange.subscribe((val) => {
        ecResult = val;
      });

      component.setManualLevel('Q');
      expect(autoEcResult).toBe(false);
      expect(ecResult).toBe('Q');

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.isAutoEc).toBe(false);
      expect(saved.manualEc).toBe('Q');
    });
  });

  describe('Section 2: Resolution Controls & Presets', () => {
    it('emits updated size and persists to localStorage', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      component.onSizeChange(1024);
      expect(emittedSize).toBe(1024);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.size).toBe(1024);
    });

    it('clamps size within acceptable bounds (128px to 4096px)', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      component.onSizeChange(50);
      expect(emittedSize).toBe(128);

      component.onSizeChange(9999);
      expect(emittedSize).toBe(4096);
    });
  });

  describe('Section 3: Quiet Zone Margin & Warning', () => {
    it('emits updated margin and persists to localStorage', () => {
      let emittedMargin = -1;
      component.marginChange.subscribe((m) => {
        emittedMargin = m;
      });

      component.onMarginChange(6);
      expect(emittedMargin).toBe(6);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.margin).toBe(6);
    });

    it('clamps quiet zone margin within 0 to 10 modules', () => {
      let emittedMargin = -1;
      component.marginChange.subscribe((m) => {
        emittedMargin = m;
      });

      component.onMarginChange(-3);
      expect(emittedMargin).toBe(0);

      component.onMarginChange(15);
      expect(emittedMargin).toBe(10);
    });
  });

  describe('Section 5: Smart Link & Navigation', () => {
    it('closes modal and emits openDynamicLinks when CTA is clicked', () => {
      let closed = false;
      let openedDynamic = false;

      component.close.subscribe(() => {
        closed = true;
      });
      component.openDynamicLinks.subscribe(() => {
        openedDynamic = true;
      });

      component.onOpenDynamicLinksTab();
      expect(closed).toBe(true);
      expect(openedDynamic).toBe(true);
    });
  });

  describe('Reset to Defaults & LocalStorage Lifecycle', () => {
    it('resets all settings to default and removes localStorage item', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ isAutoEc: false, manualEc: 'H', size: 512, margin: 1 })
      );

      let resetEmitted = false;
      let newAutoEc: boolean | null = null;
      let newEc: ErrorCorrectionLevel | null = null;
      let newSize = 0;
      let newMargin = -1;

      component.resetDefaults.subscribe(() => {
        resetEmitted = true;
      });
      component.isAutoEcChange.subscribe((val) => {
        newAutoEc = val;
      });
      component.errorCorrectionChange.subscribe((val) => {
        newEc = val;
      });
      component.sizeChange.subscribe((val) => {
        newSize = val;
      });
      component.marginChange.subscribe((val) => {
        newMargin = val;
      });

      component.onResetDefaults();

      expect(resetEmitted).toBe(true);
      expect(newAutoEc).toBe(true);
      expect(newEc).toBe('M');
      expect(newSize).toBe(2048);
      expect(newMargin).toBe(4);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('loads saved settings from localStorage on ngOnInit', () => {
      const savedState: AdvancedSettingsState = {
        isAutoEc: false,
        manualEc: 'Q',
        size: 1024,
        margin: 2
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      let loadedAutoEc: boolean | null = null;
      let loadedEc: ErrorCorrectionLevel | null = null;
      let loadedSize = 0;
      let loadedMargin = -1;

      component.isAutoEcChange.subscribe((val) => {
        loadedAutoEc = val;
      });
      component.errorCorrectionChange.subscribe((val) => {
        loadedEc = val;
      });
      component.sizeChange.subscribe((val) => {
        loadedSize = val;
      });
      component.marginChange.subscribe((val) => {
        loadedMargin = val;
      });

      component.ngOnInit();

      expect(loadedAutoEc).toBe(false);
      expect(loadedEc).toBe('Q');
      expect(loadedSize).toBe(1024);
      expect(loadedMargin).toBe(2);
    });
  });

  describe('Payload Clipboard Copy', () => {
    it('copies formatted payload to clipboard and sets copied flag', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      component.copyPayload();
      expect(writeTextMock).toHaveBeenCalledWith('https://acklet.link/q/demo123');
      await Promise.resolve();
      expect(component.copied()).toBe(true);
    });
  });

  describe('Responsive Bottom Sheet & Mobile UI Specs', () => {
    it('provides exactly 5 even resolution presets', () => {
      expect(component.sizePresets).toEqual([256, 512, 1024, 2048, 4096]);
    });

    it('contains mobile sheet handle, recommended badge, and responsive footer buttons in template', () => {
      const cmp = (AdvancedModalComponent as any)['\u0275cmp'];
      expect(cmp).toBeDefined();
      const constsStr = JSON.stringify(cmp.consts);
      expect(constsStr).toContain('modal-sheet-handle');
      expect(constsStr).toContain('rec-badge');
      expect(constsStr).toContain('auto-btn-label');
      expect(constsStr).toContain('reset-label-full');
      expect(constsStr).toContain('reset-label-short');
      expect(constsStr).toContain('done-btn');
    });

    it('defines responsive styles with bottom-sheet rules and 5-column preset grid', () => {
      const cmp = (AdvancedModalComponent as any)['\u0275cmp'];
      expect(cmp).toBeDefined();
      const styles = cmp.styles?.join(' ') || '';
      expect(styles).toContain('grid-template-columns: repeat(5');
      expect(styles).toContain('max-height: min(90dvh, 90vh)');
      expect(styles).toContain('border-radius: 20px 20px 0 0');
      expect(styles).toContain('modal-sheet-handle');
      expect(styles).toContain('white-space: nowrap');
    });
  });
});

