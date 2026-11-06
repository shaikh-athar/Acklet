// apps/tool-file-converter/src/services/conversion-engine.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversionEngineService, MAX_FILES_PER_BATCH, MAX_FILE_SIZE_BYTES } from './conversion-engine.service';
import { FileSignatureService } from './file-signature.service';
import { AdapterRegistryService } from './adapter-registry.service';

function createSvgFile(name: string): File {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>`;
  return new File([svg], name, { type: 'image/svg+xml' });
}

function createPngFile(name: string): File {
  // Valid 8-byte PNG header: 89 50 4E 47 0D 0A 1A 0A
  const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  return new File([bytes], name, { type: 'image/png' });
}

describe('ConversionEngineService', () => {
  let service: ConversionEngineService;

  beforeEach(() => {
    const signatureService = new FileSignatureService();
    const adapterRegistry = new AdapterRegistryService();
    service = new ConversionEngineService(signatureService, adapterRegistry);
  });

  it('should initialize with an empty queue and default batch options', () => {
    expect(service.jobs()).toEqual([]);
    expect(service.hasJobs()).toBe(false);
    expect(service.batchTargetFormat()).toBe('webp');
    expect(service.batchQuality()).toBe(0.88);
  });

  it('should enqueue image files, verify format, and mark as ready', async () => {
    const file = createSvgFile('logo.svg');
    await service.addFiles([file]);

    const jobs = service.jobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].file.name).toBe('logo.svg');
    expect(jobs[0].status).toBe('ready');
    expect(jobs[0].detectedFormat.format).toBe('svg');
    expect(jobs[0].availableOutputs.length).toBeGreaterThan(0);
    expect(jobs[0].targetFormat.format).toBe('webp');
  });

  it('should reject files exceeding 50 MB with a friendly error', async () => {
    // Mock a file larger than 50 MB
    const largeFile = new File([''], 'huge-photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 55 * 1024 * 1024 });

    await service.addFiles([largeFile]);

    const jobs = service.jobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('error');
    expect(jobs[0].errorMessage).toContain('File exceeds 50 MB limit');
  });

  it('should reject unsupported or planned files with an informative message', async () => {
    const textFile = new File(['plain text data'], 'notes.txt', { type: 'text/plain' });
    await service.addFiles([textFile]);

    const jobs = service.jobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('error');
    expect(jobs[0].errorMessage).toContain('document conversion is planned for Phase 3');
  });

  it('should accept and configure subtitle files (SRT -> VTT)', async () => {
    const srtContent = '1\n00:00:01,000 --> 00:00:04,000\nHello World\n';
    const srtFile = new File([srtContent], 'sub.srt', { type: 'text/plain' });
    await service.addFiles([srtFile]);

    const jobs = service.jobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('ready');
    expect(jobs[0].detectedFormat.format).toBe('srt');
    expect(jobs[0].targetFormat.format).toBe('vtt');
  });

  it('should accept and configure contact files (VCF -> CSV)', async () => {
    const vcfContent = 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD\n';
    const vcfFile = new File([vcfContent], 'contacts.vcf', { type: 'text/vcard' });
    await service.addFiles([vcfFile]);

    const jobs = service.jobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('ready');
    expect(jobs[0].detectedFormat.format).toBe('vcf');
    expect(jobs[0].targetFormat.format).toBe('csv');
  });

  it('should update batch options for all ready jobs', async () => {
    const file = createPngFile('icon.png');
    await service.addFiles([file]);

    service.setBatchTargetFormat('jpg');
    expect(service.batchTargetFormat()).toBe('jpg');
    expect(service.jobs()[0].targetFormat.format).toBe('jpg');

    service.setBatchQuality(0.65);
    expect(service.batchQuality()).toBe(0.65);
    expect(service.jobs()[0].options.quality).toBe(0.65);

    service.setBatchResize(1280);
    expect(service.batchMaxWidth()).toBe(1280);
    expect(service.jobs()[0].options.maxWidth).toBe(1280);
  });

  it('should remove an item from the queue', async () => {
    const file = createSvgFile('test.svg');
    await service.addFiles([file]);

    expect(service.jobs().length).toBe(1);
    const jobId = service.jobs()[0].id;

    service.removeJob(jobId);
    expect(service.jobs().length).toBe(0);
  });

  it('should clear all items from the queue', async () => {
    const file1 = createSvgFile('a.svg');
    const file2 = createSvgFile('b.svg');
    await service.addFiles([file1, file2]);

    expect(service.jobs().length).toBe(2);

    service.clearAll();
    expect(service.jobs().length).toBe(0);
  });
});
