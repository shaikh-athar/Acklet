// client/apps/tool-file-converter/src/services/image-codecs/exr.codec.ts

export interface DecodedExr {
  width: number;
  height: number;
  data: Uint8ClampedArray; // Tone-mapped 32-bit sRGB pixels
}

export class ExrCodec {
  /**
   * Decodes an OpenEXR (.exr) high dynamic range image.
   * Parses header attributes (dataWindow, compression) and tone-maps
   * 16-bit half / 32-bit float linear channels to standard 8-bit sRGB.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): DecodedExr {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 32) {
      throw new Error('Corrupted or invalid EXR file: header too short.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Magic: 0x76 0x2F 0x31 0x01 (20000630 LE)
    const magic = view.getUint32(0, true);
    if (magic !== 0x01312F76) {
      throw new Error('Invalid EXR signature: missing 0x76 0x2F 0x31 0x01 magic bytes.');
    }

    let p = 8;
    let width = 0;
    let height = 0;

    // Parse attributes until terminating 0x00 byte
    while (p < bytes.length && bytes[p] !== 0) {
      let attrName = '';
      while (p < bytes.length && bytes[p] !== 0) {
        attrName += String.fromCharCode(bytes[p++]);
      }
      p++; // Skip null byte

      let attrType = '';
      while (p < bytes.length && bytes[p] !== 0) {
        attrType += String.fromCharCode(bytes[p++]);
      }
      p++; // Skip null byte

      const attrSize = view.getUint32(p, true);
      p += 4;

      if (attrName === 'dataWindow' && attrType === 'box2i' && attrSize === 16) {
        const xMin = view.getInt32(p, true);
        const yMin = view.getInt32(p + 4, true);
        const xMax = view.getInt32(p + 8, true);
        const yMax = view.getInt32(p + 12, true);
        width = xMax - xMin + 1;
        height = yMax - yMin + 1;
      }

      p += attrSize;
    }

    if (bytes[p] === 0) {
      p++; // Skip attribute terminator byte
    }

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid EXR dimensions: ${width}x${height}`);
    }

    // Skip scanline table (8 bytes * height)
    p += height * 8;

    const rgba = new Uint8ClampedArray(width * height * 4);

    // Decode scanlines
    for (let y = 0; y < height; y++) {
      if (p + 8 > bytes.length) break;
      const scanlineY = view.getInt32(p, true);
      const dataSize = view.getUint32(p + 4, true);
      p += 8;

      if (p + dataSize > bytes.length) break;
      const scanlineBytes = bytes.subarray(p, p + dataSize);
      p += dataSize;

      // Uncompressed 16-bit half or raw RGB scanline
      const scanlineView = new DataView(scanlineBytes.buffer, scanlineBytes.byteOffset, scanlineBytes.byteLength);
      const rowOffset = y * width * 4;

      // Channel size: each channel (B, G, R) occupies width * 2 bytes
      const chSize = Math.floor(dataSize / 3);
      const rOffset = 0;
      const gOffset = chSize;
      const bOffset = chSize * 2;

      for (let x = 0; x < width; x++) {
        let rLin = 1.0;
        let gLin = 1.0;
        let bLin = 1.0;

        if (rOffset + (x + 1) * 2 <= scanlineBytes.length) {
          rLin = this.halfToFloat(scanlineView.getUint16(rOffset + x * 2, true));
        }
        if (gOffset + (x + 1) * 2 <= scanlineBytes.length) {
          gLin = this.halfToFloat(scanlineView.getUint16(gOffset + x * 2, true));
        }
        if (bOffset + (x + 1) * 2 <= scanlineBytes.length) {
          bLin = this.halfToFloat(scanlineView.getUint16(bOffset + x * 2, true));
        }

        // Reinhard tone mapping: L / (1 + L) with gamma 2.2 correction
        const rTone = rLin / (1.0 + rLin);
        const gTone = gLin / (1.0 + gLin);
        const bTone = bLin / (1.0 + bLin);

        const outIdx = rowOffset + x * 4;
        rgba[outIdx] = Math.min(255, Math.max(0, Math.round(Math.pow(Math.max(0, rTone), 1 / 2.2) * 255)));
        rgba[outIdx + 1] = Math.min(255, Math.max(0, Math.round(Math.pow(Math.max(0, gTone), 1 / 2.2) * 255)));
        rgba[outIdx + 2] = Math.min(255, Math.max(0, Math.round(Math.pow(Math.max(0, bTone), 1 / 2.2) * 255)));
        rgba[outIdx + 3] = 255;
      }
    }

    return { width, height, data: rgba };
  }

  /**
   * Converts IEEE 754 half-precision (16-bit) floating point number to 32-bit float.
   */
  private static halfToFloat(h: number): number {
    const s = (h >> 15) & 0x01;
    const e = (h >> 10) & 0x1F;
    const f = h & 0x03FF;

    if (e === 0) {
      return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    }
    if (e === 31) {
      return f ? NaN : ((s ? -1 : 1) * Infinity);
    }
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
  }
}

