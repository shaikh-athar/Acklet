// client/apps/tool-file-converter/src/services/image-codecs/pcx.codec.ts

/**
 * Pure TypeScript ZSoft PCX Decoder.
 * Supports 24-bit RGB (3 planes) and 8-bit paletted (VGA 256-color palette).
 * Zero external dependencies.
 */

export class PcxCodec {
  /**
   * Decodes a PCX ArrayBuffer into RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 128) {
      throw new Error('PCX file too small to contain a header.');
    }

    // Byte 0: Manufacturer 0x0A
    if (bytes[0] !== 0x0A) {
      throw new Error('Invalid PCX magic byte. Expected 0x0A.');
    }

    const encoding = bytes[2];
    if (encoding !== 1) {
      throw new Error(`Unsupported PCX encoding: ${encoding} (expected 1 for RLE).`);
    }

    const bpp = bytes[3];
    const xMin = view.getUint16(4, true);
    const yMin = view.getUint16(6, true);
    const xMax = view.getUint16(8, true);
    const yMax = view.getUint16(10, true);

    const width = xMax - xMin + 1;
    const height = yMax - yMin + 1;

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid PCX dimensions: ${width}x${height}`);
    }

    const nPlanes = bytes[65];
    const bytesPerLine = view.getUint16(66, true);

    const totalScanlineBytes = nPlanes * bytesPerLine;
    const scanlineDecoded = new Uint8Array(totalScanlineBytes);
    const rgba = new Uint8ClampedArray(width * height * 4);

    let offset = 128;

    // 1. Check for 256-color VGA palette at end of file (preceded by byte 0x0C)
    let palette256: [number, number, number][] | null = null;
    if (bpp === 8 && nPlanes === 1 && bytes.length >= 769) {
      const markerOffset = bytes.length - 769;
      if (bytes[markerOffset] === 0x0C) {
        palette256 = [];
        const palData = bytes.subarray(markerOffset + 1, markerOffset + 769);
        for (let i = 0; i < 256; i++) {
          palette256.push([palData[i * 3], palData[i * 3 + 1], palData[i * 3 + 2]]);
        }
      }
    }

    // 2. Decode scanlines
    for (let y = 0; y < height; y++) {
      let scanlineFilled = 0;

      while (scanlineFilled < totalScanlineBytes && offset < bytes.length) {
        const b = bytes[offset++];
        if ((b & 0xC0) === 0xC0) {
          const count = b & 0x3F;
          const val = bytes[offset++];
          const toFill = Math.min(count, totalScanlineBytes - scanlineFilled);
          scanlineDecoded.fill(val, scanlineFilled, scanlineFilled + toFill);
          scanlineFilled += toFill;
        } else {
          scanlineDecoded[scanlineFilled++] = b;
        }
      }

      const dstRowOffset = y * width * 4;

      if (bpp === 8 && nPlanes === 3) {
        // 24-bit TrueColor: Red plane, Green plane, Blue plane
        const rPlane = 0;
        const gPlane = bytesPerLine;
        const bPlane = bytesPerLine * 2;

        for (let x = 0; x < width; x++) {
          const dstIdx = dstRowOffset + x * 4;
          rgba[dstIdx] = scanlineDecoded[rPlane + x];
          rgba[dstIdx + 1] = scanlineDecoded[gPlane + x];
          rgba[dstIdx + 2] = scanlineDecoded[bPlane + x];
          rgba[dstIdx + 3] = 255;
        }
      } else if (bpp === 8 && nPlanes === 1) {
        // 8-bit paletted or grayscale
        for (let x = 0; x < width; x++) {
          const dstIdx = dstRowOffset + x * 4;
          const colorIdx = scanlineDecoded[x];

          if (palette256) {
            const color = palette256[colorIdx] || [colorIdx, colorIdx, colorIdx];
            rgba[dstIdx] = color[0];
            rgba[dstIdx + 1] = color[1];
            rgba[dstIdx + 2] = color[2];
          } else {
            rgba[dstIdx] = colorIdx;
            rgba[dstIdx + 1] = colorIdx;
            rgba[dstIdx + 2] = colorIdx;
          }
          rgba[dstIdx + 3] = 255;
        }
      } else {
        // General fallback for 1-bit or 4-bit
        for (let x = 0; x < width; x++) {
          const dstIdx = dstRowOffset + x * 4;
          const val = scanlineDecoded[x] || 0;
          rgba[dstIdx] = val;
          rgba[dstIdx + 1] = val;
          rgba[dstIdx + 2] = val;
          rgba[dstIdx + 3] = 255;
        }
      }
    }

    return { width, height, data: rgba };
  }

  /**
   * Encodes RGBA pixel buffer into a standard 24-bit TrueColor RLE-compressed PCX binary image Blob.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray): Blob {
    const bytesPerLine = width % 2 === 0 ? width : width + 1;
    const header = new Uint8Array(128);
    const view = new DataView(header.buffer);

    header[0] = 0x0A; // Manufacturer: ZSoft
    header[1] = 0x05; // Version: 3.0 with 24-bit support
    header[2] = 0x01; // Encoding: RLE
    header[3] = 0x08; // BitsPerPixel: 8

    view.setUint16(4, 0, true);              // xMin
    view.setUint16(6, 0, true);              // yMin
    view.setUint16(8, width - 1, true);      // xMax
    view.setUint16(10, height - 1, true);    // yMax
    view.setUint16(12, 300, true);           // hDpi
    view.setUint16(14, 300, true);           // vDpi
    header[65] = 0x03;                       // nPlanes: 3 (Red, Green, Blue)
    view.setUint16(66, bytesPerLine, true);  // bytesPerLine
    view.setUint16(68, 1, true);             // paletteInfo: 1 (Color)

    const encodedChunks: number[] = [];
    const rPlane = new Uint8Array(bytesPerLine);
    const gPlane = new Uint8Array(bytesPerLine);
    const bPlane = new Uint8Array(bytesPerLine);

    const encodePlane = (plane: Uint8Array) => {
      let i = 0;
      while (i < plane.length) {
        const val = plane[i];
        let run = 1;
        while (i + run < plane.length && plane[i + run] === val && run < 63) {
          run++;
        }
        if (run > 1 || val >= 0xC0) {
          encodedChunks.push(0xC0 | run);
          encodedChunks.push(val);
        } else {
          encodedChunks.push(val);
        }
        i += run;
      }
    };

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const srcIdx = rowOffset + x * 4;
        rPlane[x] = rgba[srcIdx];
        gPlane[x] = rgba[srcIdx + 1];
        bPlane[x] = rgba[srcIdx + 2];
      }
      if (width < bytesPerLine) {
        rPlane[width] = 0;
        gPlane[width] = 0;
        bPlane[width] = 0;
      }

      encodePlane(rPlane);
      encodePlane(gPlane);
      encodePlane(bPlane);
    }

    const payload = new Uint8Array(header.length + encodedChunks.length);
    payload.set(header, 0);
    payload.set(encodedChunks, header.length);

    return new Blob([payload], { type: 'image/x-pcx' });
  }
}

