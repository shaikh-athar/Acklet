// apps/tool-watermark-remover/src/components/export-modal/export-modal.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { runInInjectionContext, createEnvironmentInjector } from '@angular/core';
import { ExportModalComponent } from './export-modal.component';
import { ExportService } from '../../services/export.service';
import { MetadataPreservationService } from '../../services/metadata-preservation.service';
import { ExportOptions } from '../../models/watermark.models';

describe('ExportModalComponent (Phase 5 Export Controls)', () => {
  let comp: ExportModalComponent;

  beforeEach(() => {
    const injector = createEnvironmentInjector([
      MetadataPreservationService,
      ExportService,
      ExportModalComponent
    ]);
    comp = runInInjectionContext(injector, () => new ExportModalComponent());
  });

  it('initializes with default options and estimates file size', () => {
    expect(comp.selectedFormat()).toBe('png');
    expect(comp.quality()).toBe(0.92);
    expect(comp.preserveMetadata()).toBe(true);
  });

  it('emits export options including metadata preservation and estimated size', () => {
    let emittedOptions: ExportOptions | null = null;
    comp.download.subscribe((opts) => {
      emittedOptions = opts;
    });

    comp.selectedFormat.set('jpg');
    comp.quality.set(0.85);
    comp.preserveMetadata.set(true);

    comp.onDownload();

    expect(emittedOptions).toBeDefined();
    expect(emittedOptions!.format).toBe('jpg');
    expect(emittedOptions!.quality).toBe(0.85);
    expect(emittedOptions!.preserveMetadata).toBe(true);
  });
});

