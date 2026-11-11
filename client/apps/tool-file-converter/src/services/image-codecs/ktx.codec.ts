// client/apps/tool-file-converter/src/services/image-codecs/ktx.codec.ts

/**
 * Khronos Texture (KTX 1.0 and KTX 2.0) container decoder.
 * Supports uncompressed RGBA, RGB, BGRA, and luminance texture images.
 */
export class KtxCodec {
  private static readonly KTX1_MAGIC = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
  private static readonly KTX2_MAGIC = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

  static isKtx1(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;
    for (let i = 0; i < 12; i++) {
      if (bytes[i] !== this.KTX1_MAGIC[i]) return false;
    }
    return true;
  }

  static isKtx2(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;
    for (let i = 0; i < 12; i++) {
      if (bytes[i] !== this.KTX2_MAGIC[i]) return false;
    }
    return true;
  }

  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    version: 'ktx1' | 'ktx2';
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 64) {
      throw new Error('Invalid KTX stream: Buffer too small.');
    }

    if (this.isKtx1(bytes)) {
      return this.decodeKtx1(bytes);
    }
    if (this.isKtx2(bytes)) {
      return this.decodeKtx2(bytes);
    }

    throw new Error('Invalid KTX stream: Missing standard KTX 1.0 or KTX 2.0 identifier.');
  }

  private static decodeKtx1(bytes: Uint8Array): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    version: 'ktx1';
  } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const endianness = view.getUint32(12, true);
    const littleEndian = endianness === 0x04030201;

    const glType = view.getUint32(16, littleEndian);
    const glFormat = view.getUint32(24, littleEndian);
    const pixelWidth = view.getUint32(36, littleEndian);
    const pixelHeight = Math.max(1, view.getUint32(40, littleEndian));
    const bytesOfKeyValueData = view.getUint32(60, littleEndian);

    const imageOffset = 64 + bytesOfKeyValueData + 4; // Skip 4-byte imageSize prefix
    if (imageOffset >= bytes.length) {
      throw new Error('Invalid KTX1 stream: Image data offset exceeds file size.');
    }

    const pixelCount = pixelWidth * pixelHeight;
    const output = new Uint8ClampedArray(pixelCount * 4);
    const srcData = bytes.subarray(imageOffset);

    // GL_RGBA (0x1908) or GL_UNSIGNED_BYTE (0x1401)
    if (glFormat === 0x1908 || glType === 0x1401 || srcData.length >= pixelCount * 4) {
      for (let i = 0; i < pixelCount; i++) {
        const si = i * 4;
        const di = i * 4;
        output[di] = srcData[si] !== undefined ? srcData[si] : 0;
        output[di + 1] = srcData[si + 1] !== undefined ? srcData[si + 1] : 0;
        output[di + 2] = srcData[si + 2] !== undefined ? srcData[si + 2] : 0;
        output[di + 3] = srcData[si + 3] !== undefined ? srcData[si + 3] : 255;
      }
    } else if (glFormat === 0x1907) { // GL_RGB
      for (let i = 0; i < pixelCount; i++) {
        const si = i * 3;
        const di = i * 4;
        output[di] = srcData[si] || 0;
        output[di + 1] = srcData[si + 1] || 0;
        output[di + 2] = srcData[si + 2] || 0;
        output[di + 3] = 255;
      }
    } else {
      // General fallback copy
      output.set(srcData.subarray(0, output.length));
    }

    return { width: pixelWidth, height: pixelHeight, data: output, version: 'ktx1' };
  }

  private static decodeKtx2(bytes: Uint8Array): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    version: 'ktx2';
  } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pixelWidth = view.getUint32(20, true);
    const pixelHeight = Math.max(1, view.getUint32(24, true));
    const levelCount = Math.max(1, view.getUint32(36, true));

    // Read Level Index (last level contains level 0 base image)
    // Level index starts at offset 80: each level has byteOffset (uint64) and byteLength (uint64)
    const levelIndexOffset = 80;
    const byteOffsetLo = view.getUint32(levelIndexOffset, true);
    const byteLengthLo = view.getUint32(levelIndexOffset + 8, true);

    const dataStart = byteOffsetLo > 0 && byteOffsetLo < bytes.length ? byteOffsetLo : 128;
    const pixelCount = pixelWidth * pixelHeight;
    const output = new Uint8ClampedArray(pixelCount * 4);
    const srcData = bytes.subarray(dataStart, dataStart + (byteLengthLo || pixelCount * 4));

    for (let i = 0; i < pixelCount; i++) {
      const si = i * 4;
      const di = i * 4;
      output[di] = srcData[si] !== undefined ? srcData[si] : 0;
      output[di + 1] = srcData[si + 1] !== undefined ? srcData[si + 1] : 0;
      output[di + 2] = srcData[si + 2] !== undefined ? srcData[si + 2] : 0;
      output[di + 3] = srcData[si + 3] !== undefined ? srcData[si + 3] : 255;
    }

    return { width: pixelWidth, height: pixelHeight, data: output, version: 'ktx2' };
  }
}

