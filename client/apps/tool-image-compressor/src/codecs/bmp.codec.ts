// client/apps/tool-file-converter/src/services/image-codecs/bmp.codec.ts

/**
 * Pure TypeScript BMP 24/32-bit Decoder and Encoder.
 * Zero external dependencies. Browser & Web Worker compliant.
 */

export class BmpCodec {
  /**
   * Decodes a BMP binary ArrayBuffer into an ImageData-like structure.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 18) {
      throw new Error('BMP file is too small to contain a valid header.');
    }

    // Check magic bytes 'BM' (0x42, 0x4D)
    if (bytes[0] !== 0x42 || bytes[1] !== 0x4D) {
      throw new Error('Invalid BMP magic bytes. Expected "BM".');
    }

    const pixelOffset = view.getUint32(10, true);
    const dibHeaderSize = view.getUint32(14, true);

    if (dibHeaderSize < 12) {
      throw new Error(`Unsupported DIB header size: ${dibHeaderSize}`);
    }

    let width: number;
    let height: number;
    let bpp: number;
    let compression = 0;

    if (dibHeaderSize === 12) {
      // OS/2 1.x BITMAPCOREHEADER
      width = view.getUint16(18, true);
      height = view.getUint16(20, true);
      bpp = view.getUint16(24, true);
    } else {
      // BITMAPINFOHEADER and newer
      width = view.getInt32(18, true);
      height = view.getInt32(22, true);
      bpp = view.getUint16(28, true);
      if (dibHeaderSize >= 40) {
        compression = view.getUint32(30, true);
      }
    }

    if (width <= 0) {
      throw new Error(`Invalid BMP width: ${width}`);
    }

    const isTopDown = height < 0;
    const absHeight = Math.abs(height);

    if (absHeight <= 0) {
      throw new Error(`Invalid BMP height: ${height}`);
    }

    // Supported compressions: 0 = BI_RGB (uncompressed), 3 = BI_BITFIELDS
    if (compression !== 0 && compression !== 3) {
      throw new Error(`Unsupported BMP compression method: ${compression}`);
    }

    const rgba = new Uint8ClampedArray(width * absHeight * 4);

    if (bpp === 32) {
      // 32-bit BGRA
      const rowStride = width * 4;
      for (let y = 0; y < absHeight; y++) {
        const srcRow = isTopDown ? y : absHeight - 1 - y;
        const rowOffset = pixelOffset + srcRow * rowStride;
        const dstRowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const pxOffset = rowOffset + x * 4;
          const dstOffset = dstRowOffset + x * 4;

          if (pxOffset + 3 < bytes.length) {
            const b = bytes[pxOffset];
            const g = bytes[pxOffset + 1];
            const r = bytes[pxOffset + 2];
            const a = bytes[pxOffset + 3];

            rgba[dstOffset] = r;
            rgba[dstOffset + 1] = g;
            rgba[dstOffset + 2] = g; // will overwrite
            rgba[dstOffset + 1] = g;
            rgba[dstOffset + 2] = b;
            rgba[dstOffset + 3] = a === 0 ? 255 : a; // Default to opaque if zeroed alpha
          }
        }
      }
    } else if (bpp === 24) {
      // 24-bit BGR with row padding to multiple of 4 bytes
      const rowStride = Math.floor((width * 3 + 3) / 4) * 4;
      for (let y = 0; y < absHeight; y++) {
        const srcRow = isTopDown ? y : absHeight - 1 - y;
        const rowOffset = pixelOffset + srcRow * rowStride;
        const dstRowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const pxOffset = rowOffset + x * 3;
          const dstOffset = dstRowOffset + x * 4;

          if (pxOffset + 2 < bytes.length) {
            rgba[dstOffset] = bytes[pxOffset + 2];     // R
            rgba[dstOffset + 1] = bytes[pxOffset + 1]; // G
            rgba[dstOffset + 2] = bytes[pxOffset];     // B
            rgba[dstOffset + 3] = 255;                 // A
          }
        }
      }
    } else if (bpp === 8) {
      // 8-bit paletted
      const paletteOffset = 14 + dibHeaderSize;
      const palette: [number, number, number][] = [];
      const numColors = 256;

      for (let i = 0; i < numColors; i++) {
        const palIdx = paletteOffset + i * 4;
        if (palIdx + 2 < bytes.length) {
          palette.push([bytes[palIdx + 2], bytes[palIdx + 1], bytes[palIdx]]);
        } else {
          palette.push([i, i, i]);
        }
      }

      const rowStride = Math.floor((width + 3) / 4) * 4;
      for (let y = 0; y < absHeight; y++) {
        const srcRow = isTopDown ? y : absHeight - 1 - y;
        const rowOffset = pixelOffset + srcRow * rowStride;
        const dstRowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const pxOffset = rowOffset + x;
          const dstOffset = dstRowOffset + x * 4;

          if (pxOffset < bytes.length) {
            const colorIdx = bytes[pxOffset];
            const color = palette[colorIdx] || [0, 0, 0];
            rgba[dstOffset] = color[0];
            rgba[dstOffset + 1] = color[1];
            rgba[dstOffset + 2] = color[2];
            rgba[dstOffset + 3] = 255;
          }
        }
      }
    } else {
      throw new Error(`Unsupported BMP bit depth: ${bpp}-bit`);
    }

    return { width, height: absHeight, data: rgba };
  }

  /**
   * Encodes RGBA pixel data into a standard uncompressed 24-bit or 32-bit BMP Blob.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray, preserveAlpha = false): Blob {
    const bpp = preserveAlpha ? 32 : 24;
    const headerSize = 54; // 14 file header + 40 DIB header
    const rowStride = bpp === 32 ? width * 4 : Math.floor((width * 3 + 3) / 4) * 4;
    const imageSize = rowStride * height;
    const fileSize = headerSize + imageSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. BITMAPFILEHEADER (14 bytes)
    bytes[0] = 0x42; // 'B'
    bytes[1] = 0x4D; // 'M'
    view.setUint32(2, fileSize, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, headerSize, true); // offset to pixels

    // 2. BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);          // biSize
    view.setInt32(18, width, true);        // biWidth
    view.setInt32(22, height, true);       // biHeight (positive = bottom-up)
    view.setUint16(26, 1, true);           // biPlanes
    view.setUint16(28, bpp, true);         // biBitCount
    view.setUint32(30, 0, true);           // biCompression (BI_RGB)
    view.setUint32(34, imageSize, true);   // biSizeImage
    view.setInt32(38, 2835, true);         // biXPelsPerMeter (72 DPI)
    view.setInt32(42, 2835, true);         // biYPelsPerMeter
    view.setUint32(46, 0, true);           // biClrUsed
    view.setUint32(50, 0, true);           // biClrImportant

    // 3. Pixel Data (bottom-up scanlines)
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      const srcRowOffset = srcY * width * 4;
      const dstRowOffset = headerSize + y * rowStride;

      if (bpp === 32) {
        for (let x = 0; x < width; x++) {
          const srcIdx = srcRowOffset + x * 4;
          const dstIdx = dstRowOffset + x * 4;
          bytes[dstIdx] = rgba[srcIdx + 2];     // B
          bytes[dstIdx + 1] = rgba[srcIdx + 1]; // G
          bytes[dstIdx + 2] = rgba[srcIdx];     // R
          bytes[dstIdx + 3] = rgba[srcIdx + 3]; // A
        }
      } else {
        for (let x = 0; x < width; x++) {
          const srcIdx = srcRowOffset + x * 4;
          const dstIdx = dstRowOffset + x * 3;
          bytes[dstIdx] = rgba[srcIdx + 2];     // B
          bytes[dstIdx + 1] = rgba[srcIdx + 1]; // G
          bytes[dstIdx + 2] = rgba[srcIdx];     // R
        }
      }
    }

    return new Blob([buffer], { type: 'image/bmp' });
  }
}

