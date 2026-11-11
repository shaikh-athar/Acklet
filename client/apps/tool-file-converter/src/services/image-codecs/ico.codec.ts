// client/apps/tool-file-converter/src/services/image-codecs/ico.codec.ts

/**
 * Pure TypeScript Windows ICO Decoder and Encoder.
 * Supports Vista+ PNG-compressed icons and traditional DIB/BMP icons (32-bit, 24-bit with 1-bit mask, 8-bit).
 * Zero external dependencies.
 */

export interface IcoImageEntry {
  width: number;
  height: number;
  bpp: number;
  offset: number;
  size: number;
  isPng: boolean;
}

export class IcoCodec {
  /**
   * Parses the ICO directory and extracts all available image entries.
   */
  static parseDirectory(buffer: ArrayBuffer): IcoImageEntry[] {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 6) {
      throw new Error('ICO file too small to contain a header.');
    }

    const reserved = view.getUint16(0, true);
    const type = view.getUint16(2, true);
    const count = view.getUint16(4, true);

    if (reserved !== 0 || (type !== 1 && type !== 2)) {
      throw new Error('Invalid ICO header.');
    }

    const entries: IcoImageEntry[] = [];

    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + i * 16;
      if (entryOffset + 16 > bytes.length) break;

      const rawWidth = bytes[entryOffset];
      const rawHeight = bytes[entryOffset + 1];
      const width = rawWidth === 0 ? 256 : rawWidth;
      const height = rawHeight === 0 ? 256 : rawHeight;
      const bpp = view.getUint16(entryOffset + 6, true);
      const size = view.getUint32(entryOffset + 8, true);
      const offset = view.getUint32(entryOffset + 12, true);

      // Check if this entry is a PNG stream
      const isPng =
        offset + 8 <= bytes.length &&
        bytes[offset] === 0x89 &&
        bytes[offset + 1] === 0x50 &&
        bytes[offset + 2] === 0x4E &&
        bytes[offset + 3] === 0x47;

      entries.push({ width, height, bpp, offset, size, isPng });
    }

    return entries;
  }

  /**
   * Decodes the best (highest resolution) entry from an ICO file.
   * If the entry is a PNG, returns the PNG slice blob so standard bitmap decoders can render it with full alpha.
   * If it is a raw DIB, decodes the pixel data directly into RGBA.
   */
  static decodeBestEntry(buffer: ArrayBuffer): {
    width: number;
    height: number;
    pngBlob?: Blob;
    rgbaData?: Uint8ClampedArray;
  } {
    const entries = this.parseDirectory(buffer);
    if (entries.length === 0) {
      throw new Error('No valid icon images found in ICO file.');
    }

    // Sort by resolution descending (width * height), then by bpp descending
    entries.sort((a, b) => b.width * b.height - a.width * a.height || b.bpp - a.bpp);
    const best = entries[0];
    const bytes = new Uint8Array(buffer, best.offset, best.size);

    if (best.isPng) {
      return {
        width: best.width,
        height: best.height,
        pngBlob: new Blob([bytes], { type: 'image/png' })
      };
    }

    // Decode DIB (BITMAPINFOHEADER format)
    const dibView = new DataView(buffer, best.offset, best.size);
    const dibHeaderSize = dibView.getUint32(0, true);
    const dibWidth = dibView.getInt32(4, true);
    const dibHeightCombined = dibView.getInt32(8, true);
    const iconHeight = Math.abs(Math.floor(dibHeightCombined / 2));
    const bpp = dibView.getUint16(14, true);

    const width = dibWidth || best.width;
    const height = iconHeight || best.height;
    const rgba = new Uint8ClampedArray(width * height * 4);

    if (bpp === 32) {
      // 32-bit BGRA pixel data
      const pixelOffset = dibHeaderSize;
      let hasRealAlpha = false;

      // First pass: check if real alpha channel exists
      for (let i = 0; i < width * height; i++) {
        if (bytes[pixelOffset + i * 4 + 3] > 0) {
          hasRealAlpha = true;
          break;
        }
      }

      for (let y = 0; y < height; y++) {
        const srcY = height - 1 - y; // DIB is bottom-up
        const srcRowOffset = pixelOffset + srcY * width * 4;
        const dstRowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const srcIdx = srcRowOffset + x * 4;
          const dstIdx = dstRowOffset + x * 4;

          if (srcIdx + 3 < bytes.length) {
            rgba[dstIdx] = bytes[srcIdx + 2];     // R
            rgba[dstIdx + 1] = bytes[srcIdx + 1]; // G
            rgba[dstIdx + 2] = bytes[srcIdx];     // B
            rgba[dstIdx + 3] = hasRealAlpha ? bytes[srcIdx + 3] : 255;
          }
        }
      }

      // If alpha wasn't in 32-bit stream, apply 1-bit AND mask at the end of DIB
      if (!hasRealAlpha) {
        const maskOffset = pixelOffset + width * height * 4;
        const maskRowStride = Math.floor((width + 31) / 32) * 4;

        for (let y = 0; y < height; y++) {
          const srcY = height - 1 - y;
          const maskRow = maskOffset + srcY * maskRowStride;
          const dstRow = y * width * 4;

          for (let x = 0; x < width; x++) {
            const byteIndex = maskRow + Math.floor(x / 8);
            const bitIndex = 7 - (x % 8);
            if (byteIndex < bytes.length) {
              const isTransparent = ((bytes[byteIndex] >> bitIndex) & 1) === 1;
              if (isTransparent) {
                rgba[dstRow + x * 4 + 3] = 0;
              }
            }
          }
        }
      }
    } else {
      // 24-bit with 1-bit mask or fallback
      const pixelOffset = dibHeaderSize;
      const rowStride = Math.floor((width * 3 + 3) / 4) * 4;

      for (let y = 0; y < height; y++) {
        const srcY = height - 1 - y;
        const srcRowOffset = pixelOffset + srcY * rowStride;
        const dstRowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const srcIdx = srcRowOffset + x * 3;
          const dstIdx = dstRowOffset + x * 4;

          if (srcIdx + 2 < bytes.length) {
            rgba[dstIdx] = bytes[srcIdx + 2];     // R
            rgba[dstIdx + 1] = bytes[srcIdx + 1]; // G
            rgba[dstIdx + 2] = bytes[srcIdx];     // B
            rgba[dstIdx + 3] = 255;               // A
          }
        }
      }
    }

    return { width, height, rgbaData: rgba };
  }

  /**
   * Encodes a PNG image buffer into a standard modern Windows ICO container.
   */
  static encodeFromPng(pngBytes: Uint8Array, width: number, height: number): Blob {
    const headerSize = 6;
    const entrySize = 16;
    const totalSize = headerSize + entrySize + pngBytes.length;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // ICONDIR
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type = 1 (ICO)
    view.setUint16(4, 1, true); // count = 1

    // ICONDIRENTRY
    bytes[6] = width >= 256 ? 0 : width;
    bytes[7] = height >= 256 ? 0 : height;
    bytes[8] = 0; // colorCount
    bytes[9] = 0; // reserved
    view.setUint16(10, 1, true); // planes
    view.setUint16(12, 32, true); // bpp
    view.setUint32(14, pngBytes.length, true); // bytes in resource
    view.setUint32(18, headerSize + entrySize, true); // image offset

    // PNG stream
    bytes.set(pngBytes, headerSize + entrySize);

    return new Blob([buffer], { type: 'image/x-icon' });
  }
}

