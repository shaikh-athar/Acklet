// @vitest-environment jsdom
// apps/tool-file-converter/src/file-converter.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { FileConverterComponent } from './file-converter.component';
import { ConversionEngineService } from './services/conversion-engine.service';
import { FileSignatureService } from './services/file-signature.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { FileTransferService } from '@acklet/tool-shell';

describe('FileConverterComponent Unit Tests', () => {
  let engine: ConversionEngineService;
  let fileTransfer: FileTransferService;

  function createComponent(): FileConverterComponent {
    const signatureService = new FileSignatureService();
    const adapterRegistry = new AdapterRegistryService();
    engine = new ConversionEngineService(signatureService, adapterRegistry);
    fileTransfer = new FileTransferService();

    const providerMap = new Map<any, any>([
      [ConversionEngineService, engine],
      [FileTransferService, fileTransfer],
      [FileSignatureService, signatureService],
      [AdapterRegistryService, adapterRegistry]
    ]);

    const rootInjector = {
      get: (token: any, notFound?: any) => providerMap.get(token) ?? notFound
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => new FileConverterComponent());
  }

  it('should create the component with initial defaults', () => {
    const component = createComponent();
    expect(component).toBeTruthy();
    expect(component.qualityPercent()).toBe(88);
    expect(component.isPresetActive(0.85)).toBe(false);
  });

  it('should detect lossless output formats accurately', () => {
    const component = createComponent();

    engine.setBatchTargetFormat('webp');
    expect(component.isLosslessTarget()).toBe(false);

    engine.setBatchTargetFormat('jpg');
    expect(component.isLosslessTarget()).toBe(false);

    engine.setBatchTargetFormat('png');
    expect(component.isLosslessTarget()).toBe(true);

    engine.setBatchTargetFormat('svg');
    expect(component.isLosslessTarget()).toBe(true);

    engine.setBatchTargetFormat('srt');
    expect(component.isLosslessTarget()).toBe(true);

    engine.setBatchTargetFormat('vtt');
    expect(component.isLosslessTarget()).toBe(true);

    engine.setBatchTargetFormat('csv');
    expect(component.isLosslessTarget()).toBe(true);

    engine.setBatchTargetFormat('vcf');
    expect(component.isLosslessTarget()).toBe(true);
  });

  it('should synchronize quality slider and presets', () => {
    const component = createComponent();

    // 1. Simulate slider drag to 95%
    const mockEvent = {
      target: { value: '95' }
    } as unknown as Event;
    component.onQualitySliderInput(mockEvent);

    expect(engine.batchQuality()).toBe(0.95);
    expect(component.qualityPercent()).toBe(95);
    expect(component.isPresetActive(0.95)).toBe(true);
    expect(component.isPresetActive(0.85)).toBe(false);

    // 2. Select preset 65%
    component.onBatchQualityChange(0.65);
    expect(engine.batchQuality()).toBe(0.65);
    expect(component.qualityPercent()).toBe(65);
    expect(component.isPresetActive(0.65)).toBe(true);
  });

  it('should consume files transferred globally via FileTransferService', () => {
    const component = createComponent();
    const addFilesSpy = vi.spyOn(engine, 'addFiles');
    const dummyFile = new File(['test'], 'sample.png', { type: 'image/png' });

    fileTransfer.setPendingFiles([dummyFile]);
    component.consumePendingFiles();
    expect(addFilesSpy).toHaveBeenCalledWith([dummyFile]);
    expect(fileTransfer.pendingFiles().length).toBe(0);
  });
});
