// client/apps/tool-file-converter/src/services/image-output-validator.service.ts
import { Injectable } from '@angular/core';
import { GifCodec } from './image-codecs/gif.codec';
import { WebpCodec } from './image-codecs/webp.codec';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageOutputValidatorService {
  /**
   * Validates that an output image Blob has non-zero size and conforms to expected format magic bytes.
   */
  async validateOutputBlob(blob: Blob, expectedFormat: string): Promise<ValidationResult> {
    if (!blob || blob.size === 0) {
      return { valid: false, error: 'Conversion output is empty (0 bytes).' };
    }

    const fmt = expectedFormat.toLowerCase();
    const slice = await blob.slice(0, Math.min(blob.size, 128)).arrayBuffer();
    const bytes = new Uint8Array(slice);

    switch (fmt) {
      case 'jpg':
      case 'jpeg':
        if (bytes.length < 3 || bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
          return { valid: false, error: 'Output file failed JPEG signature validation (missing FF D8 FF SOI marker).' };
        }
        break;

      case 'png':
        if (
          bytes.length < 8 ||
          bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47 ||
          bytes[4] !== 0x0D || bytes[5] !== 0x0A || bytes[6] !== 0x1A || bytes[7] !== 0x0A
        ) {
          return { valid: false, error: 'Output file failed PNG signature validation.' };
        }
        break;

      case 'webp':
        if (
          bytes.length < 12 ||
          bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
          bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
        ) {
          return { valid: false, error: 'Output file failed WebP RIFF container validation.' };
        }
        break;

      case 'bmp':
        if (bytes.length < 2 || bytes[0] !== 0x42 || bytes[1] !== 0x4D) {
          return { valid: false, error: 'Output file failed BMP magic header validation (missing "BM").' };
        }
        break;

      case 'gif':
        const gifSig = String.fromCharCode(...bytes.subarray(0, 6));
        if (gifSig !== 'GIF87a' && gifSig !== 'GIF89a') {
          return { valid: false, error: 'Output file failed GIF signature validation (missing GIF87a/GIF89a marker).' };
        }
        break;

      case 'tiff':
      case 'tif':
        const isLe = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00;
        const isBe = bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A;
        if (!isLe && !isBe) {
          return { valid: false, error: 'Output file failed TIFF signature validation.' };
        }
        break;

      case 'ico':
        if (bytes.length < 4 || bytes[0] !== 0x00 || bytes[1] !== 0x00 || bytes[2] !== 0x01 || bytes[3] !== 0x00) {
          return { valid: false, error: 'Output file failed ICO header validation.' };
        }
        break;

      case 'pdf':
        const pdfHeader = String.fromCharCode(...bytes.subarray(0, 5));
        if (pdfHeader !== '%PDF-') {
          return { valid: false, error: 'Output file failed PDF header validation.' };
        }
        break;

      case 'svg':
        const svgHeader = new TextDecoder().decode(bytes);
        if (!svgHeader.includes('<svg') && !svgHeader.includes('<?xml')) {
          return { valid: false, error: 'Output file failed SVG validation (missing <svg tag).' };
        }
        break;

      case 'tga':
        if (bytes.length < 18) {
          return { valid: false, error: 'Output file too small for TGA header.' };
        }
        break;

      case 'icns':
        if (bytes.length < 8 || bytes[0] !== 0x69 || bytes[1] !== 0x63 || bytes[2] !== 0x6E || bytes[3] !== 0x73) {
          return { valid: false, error: 'Output file failed ICNS header validation (missing "icns" magic marker).' };
        }
        break;

      case 'pcx':
        if (bytes.length < 128 || bytes[0] !== 0x0A) {
          return { valid: false, error: 'Output file failed PCX header validation (missing 0x0A magic byte).' };
        }
        break;

      case 'dds':
        if (bytes.length < 128 || bytes[0] !== 0x44 || bytes[1] !== 0x44 || bytes[2] !== 0x53 || bytes[3] !== 0x20) {
          return { valid: false, error: 'Output file failed DDS header validation (missing "DDS " magic marker).' };
        }
        break;

      case 'ppm':
      case 'pnm':
        if (bytes.length < 3 || bytes[0] !== 0x50 || (bytes[1] !== 0x36 && bytes[1] !== 0x33)) {
          return { valid: false, error: 'Output file failed Netpbm header validation (missing "P6" magic marker).' };
        }
        break;

      case 'qoi':
        if (
          bytes.length < 14 ||
          bytes[0] !== 0x71 || bytes[1] !== 0x6F || bytes[2] !== 0x69 || bytes[3] !== 0x66
        ) {
          return { valid: false, error: 'Output file failed QOI header validation (missing "qoif" magic marker).' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validates animated image outputs (GIF and WebP) to ensure that animation is genuinely preserved
   * with correct frame counts, valid dimensions, non-zero frame delays, and compliant container structures.
   */
  async validateAnimationOutput(
    blob: Blob,
    expectedFormat: string,
    minExpectedFrames: number,
    expectedDimensions?: { width: number; height: number }
  ): Promise<ValidationResult> {
    if (!blob || blob.size === 0) {
      return { valid: false, error: 'Conversion output is empty (0 bytes).' };
    }

    const fmt = expectedFormat.toLowerCase();
    const buffer = await blob.arrayBuffer();

    if (fmt === 'gif') {
      try {
        const decoded = GifCodec.decode(buffer);
        if (minExpectedFrames > 1) {
          if (!decoded.isAnimated || decoded.frameCount < minExpectedFrames) {
            return {
              valid: false,
              error: `Animation preservation failed: expected at least ${minExpectedFrames} frames, but output GIF contains ${decoded.frameCount} frame(s).`
            };
          }
          if (expectedDimensions) {
            if (decoded.width !== expectedDimensions.width || decoded.height !== expectedDimensions.height) {
              return {
                valid: false,
                error: `Output GIF dimensions (${decoded.width}×${decoded.height}) do not match expected (${expectedDimensions.width}×${expectedDimensions.height}).`
              };
            }
          }
          if (decoded.frames && decoded.frames.some(f => f.delayMs <= 0)) {
            return { valid: false, error: 'Output GIF animation contains invalid zero frame delays.' };
          }
          if (decoded.frames && decoded.frames.length >= 2) {
            let hasVisualDifference = false;
            const f0 = decoded.frames[0].rgba;
            for (let i = 1; i < decoded.frames.length; i++) {
              const fi = decoded.frames[i].rgba;
              for (let p = 0; p < Math.min(f0.length, fi.length); p += 16) {
                if (f0[p] !== fi[p] || f0[p + 1] !== fi[p + 1] || f0[p + 2] !== fi[p + 2] || f0[p + 3] !== fi[p + 3]) {
                  hasVisualDifference = true;
                  break;
                }
              }
              if (hasVisualDifference) break;
            }
          }
        } else if (minExpectedFrames === 1) {
          if (decoded.frameCount > 1) {
            return { valid: false, error: 'Static first frame requested, but output contains multiple frames.' };
          }
        }
      } catch (err: any) {
        return { valid: false, error: `Output GIF decoding failed during animation validation: ${err.message}` };
      }
    } else if (fmt === 'webp') {
      try {
        if (!WebpCodec.isWebp(buffer)) {
          return { valid: false, error: 'Output file failed WebP container verification.' };
        }
        if (minExpectedFrames > 1) {
          if (!WebpCodec.isAnimated(buffer)) {
            return {
              valid: false,
              error: 'Animation preservation failed: output WebP container is missing VP8X animation flag.'
            };
          }
          const decoded = WebpCodec.decodeAnimated(buffer);
          if (decoded.frameCount < minExpectedFrames) {
            return {
              valid: false,
              error: `Animation preservation failed: expected at least ${minExpectedFrames} frames, but WebP container contains ${decoded.frameCount} frame(s).`
            };
          }
          if (expectedDimensions) {
            if (decoded.canvasWidth !== expectedDimensions.width || decoded.canvasHeight !== expectedDimensions.height) {
              return {
                valid: false,
                error: `Output WebP dimensions (${decoded.canvasWidth}×${decoded.canvasHeight}) do not match expected (${expectedDimensions.width}×${expectedDimensions.height}).`
              };
            }
          }
          if (decoded.frames.some(f => f.delayMs <= 0)) {
            return { valid: false, error: 'Output WebP animation contains invalid zero frame duration.' };
          }
        } else if (minExpectedFrames === 1) {
          if (WebpCodec.isAnimated(buffer)) {
            return { valid: false, error: 'Static first frame requested, but output WebP container has animation flag.' };
          }
        }
      } catch (err: any) {
        return { valid: false, error: `Output WebP decoding failed during animation validation: ${err.message}` };
      }
    }

    return { valid: true };
  }
}

