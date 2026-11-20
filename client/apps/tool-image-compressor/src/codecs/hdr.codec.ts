// client/apps/tool-file-converter/src/services/image-codecs/hdr.codec.ts

/**
 * Pure TypeScript Radiance HDR (.hdr / RGBE) Decoder.
 * Supports adaptive RLE and flat scanlines with Reinhard tone mapping to SDR sRGB.
 * Zero external dependencies.
 */

export class HdrCodec {
  /**
   * Decodes a Radiance RGBE HDR ArrayBuffer into tone-mapped RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const bytes = new Uint8Array(buffer);

    // Verify magic header '#?'
    if (bytes.length < 10 || bytes[0] !== 0x23 || bytes[1] !== 0x3F) {
      throw new Error('Invalid Radiance HDR header. Expected "#?".');
    }

    // Read header up to double newline
    let headerEnd = -1;
    for (let i = 0; i < Math.min(bytes.length - 1, 4096); i++) {
      if (bytes[i] === 0x0A && bytes[i + 1] === 0x0A) {
        headerEnd = i + 2;
        break;
      }
    }

    if (headerEnd === -1) {
      throw new Error('Malformed Radiance HDR header: missing end of header marker.');
    }

    const textDecoder = new TextDecoder('ascii');
    const headerText = textDecoder.decode(bytes.subarray(0, headerEnd));

    // Find resolution line (e.g. "-Y 600 +X 800")
    let resLineEnd = -1;
    for (let i = headerEnd; i < Math.min(bytes.length, headerEnd + 256); i++) {
      if (bytes[i] === 0x0A) {
        resLineEnd = i + 1;
        break;
      }
    }

    if (resLineEnd === -1) {
      throw new Error('Missing resolution line in Radiance HDR file.');
    }

    const resLine = textDecoder.decode(bytes.subarray(headerEnd, resLineEnd)).trim();
    const match = resLine.match(/([+-][XY])\s+(\d+)\s+([+-][XY])\s+(\d+)/);

    if (!match) {
      throw new Error(`Invalid Radiance HDR resolution line: "${resLine}"`);
    }

    let width = 0;
    let height = 0;

    if (match[1].endsWith('Y')) {
      height = parseInt(match[2], 10);
      width = parseInt(match[4], 10);
    } else {
      width = parseInt(match[2], 10);
      height = parseInt(match[4], 10);
    }

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid Radiance HDR dimensions: ${width}x${height}`);
    }

    let offset = resLineEnd;
    const totalPixels = width * height;
    const floatRgb = new Float32Array(totalPixels * 3);

    // Decode scanlines
    for (let y = 0; y < height; y++) {
      const scanlineRgbe = new Uint8Array(width * 4);

      if (
        width >= 8 &&
        width <= 0x7FFF &&
        offset + 4 <= bytes.length &&
        bytes[offset] === 0x02 &&
        bytes[offset + 1] === 0x02
      ) {
        // Adaptive RLE scanline
        const scanWidth = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (scanWidth !== width) {
          throw new Error(`RLE scanline width mismatch: expected ${width}, got ${scanWidth}`);
        }
        offset += 4;

        // 4 channel planes: R, G, B, E
        for (let ch = 0; ch < 4; ch++) {
          let chCount = 0;
          while (chCount < width && offset < bytes.length) {
            const code = bytes[offset++];
            if (code > 128) {
              const runLen = code - 128;
              const val = bytes[offset++];
              for (let i = 0; i < runLen && chCount < width; i++) {
                scanlineRgbe[chCount * 4 + ch] = val;
                chCount++;
              }
            } else {
              const runLen = code;
              for (let i = 0; i < runLen && chCount < width && offset < bytes.length; i++) {
                scanlineRgbe[chCount * 4 + ch] = bytes[offset++];
                chCount++;
              }
            }
          }
        }
      } else {
        // Flat scanline: 4 bytes per pixel
        const needed = width * 4;
        scanlineRgbe.set(bytes.subarray(offset, offset + needed));
        offset += needed;
      }

      // Convert scanline RGBE to Linear Floats
      const rowFloatOffset = y * width * 3;
      for (let x = 0; x < width; x++) {
        const pxIdx = x * 4;
        const r = scanlineRgbe[pxIdx];
        const g = scanlineRgbe[pxIdx + 1];
        const b = scanlineRgbe[pxIdx + 2];
        const e = scanlineRgbe[pxIdx + 3];

        const dst = rowFloatOffset + x * 3;

        if (e > 0) {
          const exponent = e - 128 - 8;
          const scale = Math.pow(2, exponent);
          floatRgb[dst] = r * scale;
          floatRgb[dst + 1] = g * scale;
          floatRgb[dst + 2] = b * scale;
        } else {
          floatRgb[dst] = 0;
          floatRgb[dst + 1] = 0;
          floatRgb[dst + 2] = 0;
        }
      }
    }

    // Tone Mapping to 8-bit sRGB (Reinhard tone mapping + Gamma 2.2)
    const rgba = new Uint8ClampedArray(totalPixels * 4);
    const gamma = 1.0 / 2.2;

    for (let i = 0; i < totalPixels; i++) {
      const src = i * 3;
      const dst = i * 4;

      const rLin = floatRgb[src];
      const gLin = floatRgb[src + 1];
      const bLin = floatRgb[src + 2];

      // Reinhard operator: L / (1 + L)
      const rMapped = rLin / (1.0 + rLin);
      const gMapped = gLin / (1.0 + gLin);
      const bMapped = bLin / (1.0 + bLin);

      rgba[dst] = Math.round(255 * Math.pow(Math.max(0, Math.min(1, rMapped)), gamma));
      rgba[dst + 1] = Math.round(255 * Math.pow(Math.max(0, Math.min(1, gMapped)), gamma));
      rgba[dst + 2] = Math.round(255 * Math.pow(Math.max(0, Math.min(1, bMapped)), gamma));
      rgba[dst + 3] = 255;
    }

    return { width, height, data: rgba };
  }
}

