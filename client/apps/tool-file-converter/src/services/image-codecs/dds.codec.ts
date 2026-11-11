// client/apps/tool-file-converter/src/services/image-codecs/dds.codec.ts

export interface DecodedDds {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA pixels
  format: string; // 'DXT1' | 'DXT3' | 'DXT5' | 'RGBA'
}

export class DdsCodec {
  /**
   * Decodes a DirectDraw Surface (.dds) binary file into 32-bit RGBA pixel buffer.
   * Supports DXT1 (BC1), DXT3 (BC2), DXT5 (BC3) and uncompressed 32/24-bit RGB/RGBA.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): DecodedDds {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 128) {
      throw new Error('Corrupted or invalid DDS file: header size too small.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Magic: 0x20534444 ("DDS ")
    const magic = view.getUint32(0, true);
    if (magic !== 0x20534444) {
      throw new Error('Invalid DDS signature: missing "DDS " magic marker.');
    }

    const height = view.getUint32(12, true);
    const width = view.getUint32(16, true);
    if (width === 0 || height === 0) {
      throw new Error(`Invalid DDS dimensions: ${width}x${height}`);
    }

    const flags = view.getUint32(80, true);
    let fourCC = '';
    for (let i = 0; i < 4; i++) {
      fourCC += String.fromCharCode(bytes[84 + i]);
    }

    const bitCount = view.getUint32(88, true);
    const rMask = view.getUint32(92, true);
    const gMask = view.getUint32(96, true);
    const bMask = view.getUint32(100, true);
    const aMask = view.getUint32(104, true);

    const rgba = new Uint8ClampedArray(width * height * 4);
    let offset = 128; // Start of data after DDS header

    if (flags & 0x4) {
      // FourCC compressed texture
      if (fourCC === 'DXT1') {
        this.decodeDXT1(bytes, offset, width, height, rgba);
      } else if (fourCC === 'DXT3') {
        this.decodeDXT3(bytes, offset, width, height, rgba);
      } else if (fourCC === 'DXT5') {
        this.decodeDXT5(bytes, offset, width, height, rgba);
      } else {
        throw new Error(`Unsupported DDS FourCC compression "${fourCC}".`);
      }
    } else {
      // Uncompressed RGB / RGBA
      this.decodeUncompressed(bytes, offset, width, height, bitCount, rMask, gMask, bMask, aMask, rgba);
    }

    return {
      width,
      height,
      data: rgba,
      format: (flags & 0x4) ? fourCC : `${bitCount}-bit RGB`
    };
  }

  private static decodeDXT1(
    bytes: Uint8Array,
    offset: number,
    width: number,
    height: number,
    out: Uint8ClampedArray
  ): void {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const xBlocks = Math.max(1, Math.floor((width + 3) / 4));
    const yBlocks = Math.max(1, Math.floor((height + 3) / 4));

    for (let y = 0; y < yBlocks; y++) {
      for (let x = 0; x < xBlocks; x++) {
        if (offset + 8 > bytes.length) break;

        const c0 = view.getUint16(offset, true);
        const c1 = view.getUint16(offset + 2, true);
        const colorTable = this.getDxtColors(c0, c1, true);

        const bits = view.getUint32(offset + 4, true);
        offset += 8;

        for (let py = 0; py < 4; py++) {
          const pixelY = y * 4 + py;
          if (pixelY >= height) continue;

          for (let px = 0; px < 4; px++) {
            const pixelX = x * 4 + px;
            if (pixelX >= width) continue;

            const codeIndex = (py * 4 + px) * 2;
            const code = (bits >> codeIndex) & 0x03;
            const color = colorTable[code];

            const outIdx = (pixelY * width + pixelX) * 4;
            out[outIdx] = color[0];
            out[outIdx + 1] = color[1];
            out[outIdx + 2] = color[2];
            out[outIdx + 3] = color[3];
          }
        }
      }
    }
  }

  private static decodeDXT3(
    bytes: Uint8Array,
    offset: number,
    width: number,
    height: number,
    out: Uint8ClampedArray
  ): void {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const xBlocks = Math.max(1, Math.floor((width + 3) / 4));
    const yBlocks = Math.max(1, Math.floor((height + 3) / 4));

    for (let y = 0; y < yBlocks; y++) {
      for (let x = 0; x < xBlocks; x++) {
        if (offset + 16 > bytes.length) break;

        const alphaOffset = offset;
        const colorOffset = offset + 8;
        offset += 16;

        const c0 = view.getUint16(colorOffset, true);
        const c1 = view.getUint16(colorOffset + 2, true);
        const colorTable = this.getDxtColors(c0, c1, false);
        const bits = view.getUint32(colorOffset + 4, true);

        for (let py = 0; py < 4; py++) {
          const pixelY = y * 4 + py;
          if (pixelY >= height) continue;

          const aRow = view.getUint16(alphaOffset + py * 2, true);

          for (let px = 0; px < 4; px++) {
            const pixelX = x * 4 + px;
            if (pixelX >= width) continue;

            const a4 = (aRow >> (px * 4)) & 0x0F;
            const alpha = Math.round((a4 * 255) / 15);

            const codeIndex = (py * 4 + px) * 2;
            const code = (bits >> codeIndex) & 0x03;
            const color = colorTable[code];

            const outIdx = (pixelY * width + pixelX) * 4;
            out[outIdx] = color[0];
            out[outIdx + 1] = color[1];
            out[outIdx + 2] = color[2];
            out[outIdx + 3] = alpha;
          }
        }
      }
    }
  }

  private static decodeDXT5(
    bytes: Uint8Array,
    offset: number,
    width: number,
    height: number,
    out: Uint8ClampedArray
  ): void {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const xBlocks = Math.max(1, Math.floor((width + 3) / 4));
    const yBlocks = Math.max(1, Math.floor((height + 3) / 4));

    for (let y = 0; y < yBlocks; y++) {
      for (let x = 0; x < xBlocks; x++) {
        if (offset + 16 > bytes.length) break;

        const a0 = bytes[offset];
        const a1 = bytes[offset + 1];
        const aTable = this.getDxt5Alpha(a0, a1);

        const aBitsLo = view.getUint32(offset + 2, true);
        const aBitsHi = view.getUint16(offset + 6, true);
        const aBits = BigInt(aBitsLo) | (BigInt(aBitsHi) << 32n);

        const colorOffset = offset + 8;
        offset += 16;

        const c0 = view.getUint16(colorOffset, true);
        const c1 = view.getUint16(colorOffset + 2, true);
        const colorTable = this.getDxtColors(c0, c1, false);
        const bits = view.getUint32(colorOffset + 4, true);

        for (let py = 0; py < 4; py++) {
          const pixelY = y * 4 + py;
          if (pixelY >= height) continue;

          for (let px = 0; px < 4; px++) {
            const pixelX = x * 4 + px;
            if (pixelX >= width) continue;

            const linearIndex = py * 4 + px;
            const aCode = Number((aBits >> BigInt(linearIndex * 3)) & 0x07n);
            const alpha = aTable[aCode];

            const codeIndex = linearIndex * 2;
            const code = (bits >> codeIndex) & 0x03;
            const color = colorTable[code];

            const outIdx = (pixelY * width + pixelX) * 4;
            out[outIdx] = color[0];
            out[outIdx + 1] = color[1];
            out[outIdx + 2] = color[2];
            out[outIdx + 3] = alpha;
          }
        }
      }
    }
  }

  private static getDxtColors(c0: number, c1: number, isDxt1: boolean): [number, number, number, number][] {
    const r0 = ((c0 >> 11) & 0x1F) * 255 / 31 | 0;
    const g0 = ((c0 >> 5) & 0x3F) * 255 / 63 | 0;
    const b0 = (c0 & 0x1F) * 255 / 31 | 0;

    const r1 = ((c1 >> 11) & 0x1F) * 255 / 31 | 0;
    const g1 = ((c1 >> 5) & 0x3F) * 255 / 63 | 0;
    const b1 = (c1 & 0x1F) * 255 / 31 | 0;

    if (!isDxt1 || c0 > c1) {
      return [
        [r0, g0, b0, 255],
        [r1, g1, b1, 255],
        [((2 * r0 + r1) / 3) | 0, ((2 * g0 + g1) / 3) | 0, ((2 * b0 + b1) / 3) | 0, 255],
        [((r0 + 2 * r1) / 3) | 0, ((g0 + 2 * g1) / 3) | 0, ((b0 + 2 * b1) / 3) | 0, 255]
      ];
    } else {
      return [
        [r0, g0, b0, 255],
        [r1, g1, b1, 255],
        [((r0 + r1) / 2) | 0, ((g0 + g1) / 2) | 0, ((b0 + b1) / 2) | 0, 255],
        [0, 0, 0, 0] // 1-bit transparent
      ];
    }
  }

  private static getDxt5Alpha(a0: number, a1: number): number[] {
    const t = [a0, a1, 0, 0, 0, 0, 0, 0];
    if (a0 > a1) {
      for (let i = 1; i <= 6; i++) {
        t[i + 1] = (((7 - i) * a0 + i * a1) / 7) | 0;
      }
    } else {
      for (let i = 1; i <= 4; i++) {
        t[i + 1] = (((5 - i) * a0 + i * a1) / 5) | 0;
      }
      t[6] = 0;
      t[7] = 255;
    }
    return t;
  }

  private static decodeUncompressed(
    bytes: Uint8Array,
    offset: number,
    width: number,
    height: number,
    bitCount: number,
    rMask: number,
    gMask: number,
    bMask: number,
    aMask: number,
    out: Uint8ClampedArray
  ): void {
    const bytesPerPixel = bitCount >> 3;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (offset >= bytes.length) break;

        let pixelVal = 0;
        if (bytesPerPixel === 4) {
          pixelVal = view.getUint32(offset, true);
        } else if (bytesPerPixel === 3) {
          pixelVal = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
        }
        offset += bytesPerPixel;

        const outIdx = (y * width + x) * 4;
        if (rMask === 0x00FF0000 && bMask === 0x000000FF) {
          // Standard BGRA
          out[outIdx] = (pixelVal >> 16) & 0xFF;
          out[outIdx + 1] = (pixelVal >> 8) & 0xFF;
          out[outIdx + 2] = pixelVal & 0xFF;
          out[outIdx + 3] = aMask ? (pixelVal >> 24) & 0xFF : 255;
        } else {
          // Standard RGBA
          out[outIdx] = pixelVal & 0xFF;
          out[outIdx + 1] = (pixelVal >> 8) & 0xFF;
          out[outIdx + 2] = (pixelVal >> 16) & 0xFF;
          out[outIdx + 3] = aMask ? (pixelVal >> 24) & 0xFF : 255;
        }
      }
    }
  }

  /**
   * Encodes RGBA pixel data into a standard uncompressed 32-bit BGRA DDS binary image Blob.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray): Blob {
    const header = new Uint8Array(128);
    const view = new DataView(header.buffer);

    // Magic: 0x20534444 ("DDS ")
    header[0] = 0x44;
    header[1] = 0x44;
    header[2] = 0x53;
    header[3] = 0x20;

    view.setUint32(4, 124, true); // Header size (always 124)
    view.setUint32(8, 0x1007, true); // DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT
    view.setUint32(12, height, true);
    view.setUint32(16, width, true);
    view.setUint32(20, width * 4, true); // Pitch
    view.setUint32(24, 0, true); // Depth
    view.setUint32(28, 1, true); // MipMapCount

    // Pixel format (offset 76)
    view.setUint32(76, 32, true); // dwSize
    view.setUint32(80, 0x41, true); // DDPF_RGB | DDPF_ALPHAPIXELS
    view.setUint32(84, 0, true); // dwFourCC (0 for uncompressed)
    view.setUint32(88, 32, true); // dwRGBBitCount
    view.setUint32(92, 0x00FF0000, true); // Red mask
    view.setUint32(96, 0x0000FF00, true); // Green mask
    view.setUint32(100, 0x000000FF, true); // Blue mask
    view.setUint32(104, 0xFF000000, true); // Alpha mask

    // Caps (offset 108)
    view.setUint32(108, 0x1000, true); // DDSCAPS_TEXTURE

    // Data payload in BGRA order
    const pixelBytes = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const src = i * 4;
      pixelBytes[src] = rgba[src + 2];     // B
      pixelBytes[src + 1] = rgba[src + 1]; // G
      pixelBytes[src + 2] = rgba[src];     // R
      pixelBytes[src + 3] = rgba[src + 3]; // A
    }

    return new Blob([header, pixelBytes], { type: 'image/x-dds' });
  }
}

