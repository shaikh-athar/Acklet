// client/apps/tool-file-converter/src/services/image-codecs/netpbm.codec.ts

/**
 * Pure TypeScript Netpbm Decoder & Encoder.
 * Supports P1-P6: PBM (Bitmap), PGM (Graymap), PPM (Pixmap).
 * Zero external dependencies.
 */

export class NetpbmCodec {
  /**
   * Decodes a Netpbm ArrayBuffer into RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 3) {
      throw new Error('Netpbm file too small to contain a header.');
    }

    if (bytes[0] !== 0x50) { // 'P'
      throw new Error('Invalid Netpbm signature. Expected "P1" through "P6".');
    }

    const type = bytes[1] - 0x30; // 1 to 6
    if (type < 1 || type > 6) {
      throw new Error(`Unsupported Netpbm type: P${String.fromCharCode(bytes[1])}`);
    }

    let offset = 2;

    const skipWhitespaceAndComments = () => {
      while (offset < bytes.length) {
        const c = bytes[offset];
        if (c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D) {
          offset++;
        } else if (c === 0x23) { // '#' comment
          while (offset < bytes.length && bytes[offset] !== 0x0A && bytes[offset] !== 0x0D) {
            offset++;
          }
        } else {
          break;
        }
      }
    };

    const readAsciiNumber = (): number => {
      skipWhitespaceAndComments();
      let str = '';
      while (offset < bytes.length) {
        const c = bytes[offset];
        if (c >= 0x30 && c <= 0x39) {
          str += String.fromCharCode(c);
          offset++;
        } else {
          break;
        }
      }
      if (!str) {
        throw new Error('Unexpected end of file while reading Netpbm header token.');
      }
      return parseInt(str, 10);
    };

    const width = readAsciiNumber();
    const height = readAsciiNumber();

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid Netpbm dimensions: ${width}x${height}`);
    }

    let maxVal = 1;
    if (type !== 1 && type !== 4) {
      maxVal = readAsciiNumber();
    }

    // A single whitespace character follows maxVal before binary data
    if (type >= 4 && offset < bytes.length) {
      const c = bytes[offset];
      if (c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D) {
        offset++;
      }
    }

    const totalPixels = width * height;
    const rgba = new Uint8ClampedArray(totalPixels * 4);
    const scale = maxVal > 0 ? 255 / maxVal : 1;

    if (type === 6) {
      // P6: Binary PPM (RGB 8-bit or 16-bit)
      const is16Bit = maxVal > 255;
      const bytesPerPx = is16Bit ? 6 : 3;

      for (let i = 0; i < totalPixels; i++) {
        const src = offset + i * bytesPerPx;
        const dst = i * 4;
        if (src + (is16Bit ? 5 : 2) < bytes.length) {
          if (is16Bit) {
            const r16 = (bytes[src] << 8) | bytes[src + 1];
            const g16 = (bytes[src + 2] << 8) | bytes[src + 3];
            const b16 = (bytes[src + 4] << 8) | bytes[src + 5];
            rgba[dst] = Math.round(r16 * scale);
            rgba[dst + 1] = Math.round(g16 * scale);
            rgba[dst + 2] = Math.round(b16 * scale);
          } else {
            rgba[dst] = Math.round(bytes[src] * scale);
            rgba[dst + 1] = Math.round(bytes[src + 1] * scale);
            rgba[dst + 2] = Math.round(bytes[src + 2] * scale);
          }
          rgba[dst + 3] = 255;
        }
      }
    } else if (type === 5) {
      // P5: Binary PGM (Grayscale)
      const is16Bit = maxVal > 255;
      const bytesPerPx = is16Bit ? 2 : 1;

      for (let i = 0; i < totalPixels; i++) {
        const src = offset + i * bytesPerPx;
        const dst = i * 4;
        if (src < bytes.length) {
          const val = is16Bit ? ((bytes[src] << 8) | bytes[src + 1]) : bytes[src];
          const s = Math.round(val * scale);
          rgba[dst] = s;
          rgba[dst + 1] = s;
          rgba[dst + 2] = s;
          rgba[dst + 3] = 255;
        }
      }
    } else if (type === 4) {
      // P4: Binary PBM (1 bit per pixel, 1 = black, 0 = white)
      const rowBytes = Math.ceil(width / 8);
      for (let y = 0; y < height; y++) {
        const rowSrc = offset + y * rowBytes;
        const rowDst = y * width * 4;

        for (let x = 0; x < width; x++) {
          const byteIdx = rowSrc + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          const bit = (bytes[byteIdx] >> bitIdx) & 1;
          const val = bit === 1 ? 0 : 255; // 1 is black in PBM standard

          const dst = rowDst + x * 4;
          rgba[dst] = val;
          rgba[dst + 1] = val;
          rgba[dst + 2] = val;
          rgba[dst + 3] = 255;
        }
      }
    } else if (type === 3) {
      // P3: ASCII PPM
      for (let i = 0; i < totalPixels; i++) {
        const r = readAsciiNumber();
        const g = readAsciiNumber();
        const b = readAsciiNumber();
        const dst = i * 4;
        rgba[dst] = Math.round(r * scale);
        rgba[dst + 1] = Math.round(g * scale);
        rgba[dst + 2] = Math.round(b * scale);
        rgba[dst + 3] = 255;
      }
    } else if (type === 2) {
      // P2: ASCII PGM
      for (let i = 0; i < totalPixels; i++) {
        const gray = readAsciiNumber();
        const s = Math.round(gray * scale);
        const dst = i * 4;
        rgba[dst] = s;
        rgba[dst + 1] = s;
        rgba[dst + 2] = s;
        rgba[dst + 3] = 255;
      }
    } else if (type === 1) {
      // P1: ASCII PBM
      for (let i = 0; i < totalPixels; i++) {
        const bit = readAsciiNumber();
        const val = bit === 1 ? 0 : 255;
        const dst = i * 4;
        rgba[dst] = val;
        rgba[dst + 1] = val;
        rgba[dst + 2] = val;
        rgba[dst + 3] = 255;
      }
    }

    return { width, height, data: rgba };
  }

  /**
   * Encodes RGBA pixel data into a standard binary P6 PPM Blob.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray): Blob {
    const headerStr = `P6\n${width} ${height}\n255\n`;
    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(headerStr);

    const pixelBytes = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      const src = i * 4;
      const dst = i * 3;
      pixelBytes[dst] = rgba[src];     // R
      pixelBytes[dst + 1] = rgba[src + 1]; // G
      pixelBytes[dst + 2] = rgba[src + 2]; // B
    }

    return new Blob([headerBytes, pixelBytes], { type: 'image/x-portable-pixmap' });
  }
}

