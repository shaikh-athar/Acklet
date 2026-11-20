// client/apps/tool-file-converter/src/services/image-codecs/pvr.codec.ts

/**
 * PowerVR (.pvr) texture decoder.
 * Supports PVR Version 2 ('PVR!') and PVR Version 3 ('PVR3') uncompressed RGBA/RGB textures.
 */
export class PvrCodec {
  static isPvr(bytes: Uint8Array): boolean {
    if (bytes.length < 52) return false;
    // Check PVR v3 magic at 0..3
    if (bytes[0] === 0x50 && bytes[1] === 0x56 && bytes[2] === 0x52 && bytes[3] === 0x03) return true;
    if (bytes[0] === 0x03 && bytes[1] === 0x50 && bytes[2] === 0x56 && bytes[3] === 0x52) return true;
    // Check PVR v2 magic at 44..47 ('PVR!')
    if (bytes[44] === 0x50 && bytes[45] === 0x56 && bytes[46] === 0x52 && bytes[47] === 0x21) return true;
    if (bytes[44] === 0x21 && bytes[45] === 0x52 && bytes[46] === 0x56 && bytes[47] === 0x50) return true;
    return false;
  }

  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 52) {
      throw new Error('Invalid PVR stream: Buffer too small.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    let width = 0;
    let height = 0;
    let dataOffset = 52;

    // Check PVR v3 (version 0x03505652)
    const isV3 = view.getUint32(0, true) === 0x03505652 || view.getUint32(0, false) === 0x03505652;
    if (isV3) {
      height = view.getUint32(24, true);
      width = view.getUint32(28, true);
      const metaSize = view.getUint32(48, true);
      dataOffset = 52 + metaSize;
    } else {
      // PVR v2
      height = view.getUint32(4, true);
      width = view.getUint32(8, true);
      const headerLength = view.getUint32(0, true);
      dataOffset = headerLength > 0 ? headerLength : 52;
    }

    if (width === 0 || height === 0) {
      throw new Error(`Invalid PVR dimensions: ${width}x${height}`);
    }

    const pixelCount = width * height;
    const output = new Uint8ClampedArray(pixelCount * 4);
    const src = bytes.subarray(dataOffset);

    // Unpack 32-bit RGBA or 24-bit RGB
    if (src.length >= pixelCount * 4) {
      for (let i = 0; i < pixelCount; i++) {
        const si = i * 4;
        const di = i * 4;
        output[di] = src[si];
        output[di + 1] = src[si + 1];
        output[di + 2] = src[si + 2];
        output[di + 3] = src[si + 3];
      }
    } else if (src.length >= pixelCount * 3) {
      for (let i = 0; i < pixelCount; i++) {
        const si = i * 3;
        const di = i * 4;
        output[di] = src[si];
        output[di + 1] = src[si + 1];
        output[di + 2] = src[si + 2];
        output[di + 3] = 255;
      }
    } else {
      // Copy available bytes
      output.set(src.subarray(0, output.length));
    }

    return { width, height, data: output };
  }
}
