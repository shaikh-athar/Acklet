// apps/tool-image-compressor/src/services/wasm-codecs.spec.ts
import { describe, it, expect } from 'vitest';
import { wasmCodecs } from './wasm-codecs.adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('WasmCodecsAdapter — Specialized WebAssembly Codecs (Phase 1)', () => {
  it('reports accurate capabilities for all supported image formats', () => {
    const jpegCap = wasmCodecs.getCapabilities('image/jpeg');
    expect(jpegCap.name).toContain('MozJPEG');
    expect(jpegCap.supportsQuality).toBe(true);
    expect(jpegCap.supportsProgressive).toBe(true);
    expect(jpegCap.supportsLossless).toBe(false);

    const webpCap = wasmCodecs.getCapabilities('image/webp');
    expect(webpCap.name).toContain('libwebp');
    expect(webpCap.supportsQuality).toBe(true);
    expect(webpCap.supportsLossless).toBe(true);

    const pngCap = wasmCodecs.getCapabilities('image/png');
    expect(pngCap.name).toContain('Oxipng');
    expect(pngCap.supportsLossless).toBe(true);

    const avifCap = wasmCodecs.getCapabilities('image/avif');
    expect(avifCap.name).toContain('Canvas AVIF');
    expect(avifCap.isWasmAvailable).toBe(false);
  });

  it('encodes RGBA ImageData using MozJPEG WASM with progressive scans', async () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 220;     // R
      data[i + 1] = 120; // G
      data[i + 2] = 40;  // B
      data[i + 3] = 255; // A
    }
    const imgData = { data, width, height } as ImageData;

    const jpegBuffer = await wasmCodecs.encodeMozJpeg(imgData, {
      quality: 80,
      progressive: true,
      optimize_coding: true
    });

    expect(jpegBuffer).not.toBeNull();
    const bytes = new Uint8Array(jpegBuffer!);
    expect(bytes.length).toBeGreaterThan(0);

    // Verify JPEG SOI marker (0xFF 0xD8)
    expect(bytes[0]).toBe(0xFF);
    expect(bytes[1]).toBe(0xD8);

    // Verify JPEG EOI marker (0xFF 0xD9)
    expect(bytes[bytes.length - 2]).toBe(0xFF);
    expect(bytes[bytes.length - 1]).toBe(0xD9);

    // Verify progressive JPEG marker SOF2 (0xFF 0xC2) exists in stream
    let hasSof2 = false;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xC2) {
        hasSof2 = true;
        break;
      }
    }
    expect(hasSof2).toBe(true);
  });

  it('encodes RGBA ImageData using libwebp WASM in lossy mode', async () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 60;
      data[i + 1] = 150;
      data[i + 2] = 240;
      data[i + 3] = 255;
    }
    const imgData = { data, width, height } as ImageData;

    const webpBuffer = await wasmCodecs.encodeWebp(imgData, { quality: 75, method: 4 });
    expect(webpBuffer).not.toBeNull();
    const bytes = new Uint8Array(webpBuffer!);

    // Verify RIFF header
    const header = String.fromCharCode(...bytes.subarray(0, 4));
    expect(header).toBe('RIFF');

    // Verify WEBP signature at offset 8
    const format = String.fromCharCode(...bytes.subarray(8, 12));
    expect(format).toBe('WEBP');
  });

  it('encodes RGBA ImageData using libwebp WASM in lossless mode', async () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100;
      data[i + 1] = 200;
      data[i + 2] = 50;
      data[i + 3] = 180; // semi-transparent
    }
    const imgData = { data, width, height } as ImageData;

    const webpBuffer = await wasmCodecs.encodeWebp(imgData, { quality: 100, lossless: 1 });
    expect(webpBuffer).not.toBeNull();
    const bytes = new Uint8Array(webpBuffer!);

    // Verify RIFF & WEBP
    const header = String.fromCharCode(...bytes.subarray(0, 4));
    expect(header).toBe('RIFF');
    const format = String.fromCharCode(...bytes.subarray(8, 12));
    expect(format).toBe('WEBP');

    // Lossless WebP chunk is VP8L
    const chunkType = String.fromCharCode(...bytes.subarray(12, 16));
    expect(chunkType).toBe('VP8L');
  });

  it('optimizes real PNG assets losslessly using Oxipng WASM', async () => {
    const assetPath = path.resolve(
      process.cwd(),
      'apps/tool-image-compressor/src/test-assets/bench/bench-01-logo-480b.png'
    );
    if (!fs.existsSync(assetPath)) return;

    const inputBytes = fs.readFileSync(assetPath);
    const optimized = await wasmCodecs.optimiseOxipng(inputBytes, { level: 2 });

    expect(optimized).not.toBeNull();
    const outBytes = new Uint8Array(optimized!);

    // Must be smaller than original 852 bytes
    expect(outBytes.byteLength).toBeLessThan(inputBytes.byteLength);

    // Verify standard PNG magic header (137 80 78 71 13 10 26 10)
    expect(outBytes[0]).toBe(0x89);
    expect(outBytes[1]).toBe(0x50); // P
    expect(outBytes[2]).toBe(0x4E); // N
    expect(outBytes[3]).toBe(0x47); // G
  });

  it('cancels encoding gracefully when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    const imgData = {
      data: new Uint8ClampedArray(16),
      width: 2,
      height: 2
    } as ImageData;

    await expect(
      wasmCodecs.encodeMozJpeg(imgData, { quality: 80 }, controller.signal)
    ).rejects.toThrow('cancelled by user');

    await expect(
      wasmCodecs.encodeWebp(imgData, { quality: 80 }, controller.signal)
    ).rejects.toThrow('cancelled by user');

    await expect(
      wasmCodecs.optimiseOxipng(new Uint8Array(16), {}, controller.signal)
    ).rejects.toThrow('cancelled by user');
  });

  it('tracks diagnostics telemetry accurately', () => {
    const diag = wasmCodecs.getDiagnostics();
    expect(diag.encodeCounts.mozjpeg).toBeGreaterThan(0);
    expect(diag.encodeCounts.webp).toBeGreaterThan(0);
    expect(diag.initialized.mozjpeg).toBe(true);
    expect(diag.initialized.webp).toBe(true);
  });
});
