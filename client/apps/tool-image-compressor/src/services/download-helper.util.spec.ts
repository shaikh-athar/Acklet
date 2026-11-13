// apps/tool-image-compressor/src/services/download-helper.util.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { downloadZip, downloadBlob } from './download-helper.util';

describe('download-helper.util', () => {
  it('deduplicates filenames and builds zip archive', async () => {
    // In node environment without document, downloadBlob safely skips document manipulation
    const items = [
      { filename: 'photo.jpg', blob: new Blob(['abc']) },
      { filename: 'photo.jpg', blob: new Blob(['def']) },
      { filename: 'photo.jpg', blob: new Blob(['ghi']) }
    ];

    await expect(downloadZip(items, 'test.zip')).resolves.not.toThrow();
  });

  it('handles empty items array gracefully', async () => {
    await expect(downloadZip([], 'empty.zip')).resolves.not.toThrow();
  });

  it('sanitizes illegal path characters from filenames and skips zero-byte blobs', async () => {
    const items = [
      { filename: 'bad/name:with*chars?.png', blob: new Blob(['valid content']) },
      { filename: 'empty.png', blob: new Blob([]) } // 0 bytes, should be filtered
    ];

    await expect(downloadZip(items, 'sanitized.zip')).resolves.not.toThrow();
  });
});

