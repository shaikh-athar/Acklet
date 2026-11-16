// @vitest-environment jsdom
// apps/tool-file-converter/src/file-converter.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { FileConverterComponent } from './file-converter.component';
import { ConversionEngineService } from './services/conversion-engine.service';
import { FileSignatureService } from './services/file-signature.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { ImageCapabilityRegistry } from './services/image-capability.registry';
import { FileTransferService } from '@acklet/tool-shell';

describe('FileConverterComponent Unit Tests', () => {
  let engine: ConversionEngineService;
  let fileTransfer: FileTransferService;

  function createComponent(): FileConverterComponent {
    const signatureService = new FileSignatureService();
    const adapterRegistry = new AdapterRegistryService();
    const capabilityRegistry = new ImageCapabilityRegistry();
    engine = new ConversionEngineService(signatureService, adapterRegistry);
    fileTransfer = new FileTransferService();

    const providerMap = new Map<any, any>([
      [ConversionEngineService, engine],
      [FileTransferService, fileTransfer],
      [FileSignatureService, signatureService],
      [AdapterRegistryService, adapterRegistry],
      [ImageCapabilityRegistry, capabilityRegistry]
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
    expect(component.qualityPercent()).toBe(85);
    expect(component.isPresetActive(0.85)).toBe(true);
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

  it('should initialize minimal hero headline rotating words and popular groups', () => {
    const component = createComponent();
    expect(component.rotatingWords).toEqual(['JPG', 'WEBP', 'PNG', 'AVIF', 'HEIC']);
    expect(component.popularGroups.length).toBe(3);
    expect(component.popularGroups[0]).toEqual([
      { source: 'png', target: 'jpg' },
      { source: 'jpg', target: 'webp' },
      { source: 'png', target: 'webp' },
      { source: 'heic', target: 'jpg' },
      { source: 'avif', target: 'png' },
      { source: 'webp', target: 'png' }
    ]);
  });

  it('should set format and open picker when clicking a popular conversion pair', () => {
    const component = createComponent();
    const openPickerSpy = vi.spyOn(component, 'openFilePicker').mockImplementation(() => {});

    component.onSelectPopularPair({ source: 'heic', target: 'jpg' });
    expect(engine.batchTargetFormat()).toBe('jpg');
    expect(component.conversionPair()).toEqual({ source: 'heic', target: 'jpg' });
    expect(openPickerSpy).toHaveBeenCalled();
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

  it('should delegate rename to engine via onRenameJob', () => {
    const component = createComponent();
    const renameSpy = vi.spyOn(engine, 'renameJob');

    component.onRenameJob('job-123', 'banner-final');
    expect(renameSpy).toHaveBeenCalledWith('job-123', 'banner-final');
  });

  describe('Dynamic Heading Requirements (Part B)', () => {
    it('returns empty string when there are 0 files', () => {
      const component = createComponent();
      engine.jobs.set([]);
      expect(component.dynamicHeading()).toBe('');
    });

    it('returns "Images to Convert" when images exist but target is custom or unchosen', () => {
      const component = createComponent();
      engine.jobs.set([{ id: '1', fileName: 'sample.png', detectedFormat: { category: 'image', format: 'png' } } as any]);
      engine.setBatchTargetFormat('custom');
      expect(component.dynamicHeading()).toBe('Images to Convert');
    });

    it('returns "Images to WebP" when target format is webp', () => {
      const component = createComponent();
      engine.jobs.set([{
        id: '1',
        fileName: 'sample.png',
        detectedFormat: { category: 'image', format: 'png' },
        availableOutputs: [{ format: 'webp' }, { format: 'png' }, { format: 'jpg' }]
      } as any]);
      engine.setBatchTargetFormat('webp');
      expect(component.dynamicHeading()).toBe('Images to WebP');
    });

    it('returns "Images to PNG", "Images to JPG", "Images to PDF", "Images to BMP" respectively', () => {
      const component = createComponent();
      engine.jobs.set([
        {
          id: '1',
          fileName: 'test1.jpg',
          detectedFormat: { category: 'image', format: 'jpg' },
          availableOutputs: [{ format: 'png' }, { format: 'jpg' }, { format: 'pdf' }, { format: 'bmp' }]
        } as any
      ]);

      engine.setBatchTargetFormat('png');
      expect(component.dynamicHeading()).toBe('Images to PNG');

      engine.setBatchTargetFormat('jpg');
      expect(component.dynamicHeading()).toBe('Images to JPG');

      engine.setBatchTargetFormat('pdf');
      expect(component.dynamicHeading()).toBe('Images to PDF');

      engine.setBatchTargetFormat('bmp');
      expect(component.dynamicHeading()).toBe('Images to BMP');
    });

    it('always uses plural "Images to ...", never singular "Image to ..."', () => {
      const component = createComponent();
      engine.jobs.set([{
        id: '1',
        fileName: 'single.png',
        detectedFormat: { category: 'image', format: 'png' },
        availableOutputs: [{ format: 'png' }]
      } as any]);
      engine.setBatchTargetFormat('png');
      expect(component.dynamicHeading()).toBe('Images to PNG');
      expect(component.dynamicHeading()).not.toContain('Image to');
    });

    it('uses "Convert images to" without the word "your"', () => {
      const component = createComponent();
      expect(component.landingSubtitle()).not.toContain('your');
    });
  });
});
