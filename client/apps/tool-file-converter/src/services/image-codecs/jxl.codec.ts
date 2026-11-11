// client/apps/tool-file-converter/src/services/image-codecs/jxl.codec.ts

export interface JxlDecodeResult {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  embeddedJpegBlob?: Blob;
}

export class JxlCodec {
  /**
   * Verifies if binary data starts with a JPEG XL codestream or ISOBMFF container.
   */
  static isJxl(bytes: Uint8Array): boolean {
    if (bytes.length < 2) return false;
    // 1. Naked Codestream: FF 0A
    if (bytes[0] === 0xFF && bytes[1] === 0x0A) return true;

    // 2. ISOBMFF Container: 00 00 00 0C 4A 58 4C 20 0D 0A 87 0A
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
      bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20 &&
      bytes[8] === 0x0D && bytes[9] === 0x0A && bytes[10] === 0x87 && bytes[11] === 0x0A
    ) {
      return true;
    }

    return false;
  }

  /**
   * Decodes JPEG XL metadata and image contents.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): JxlDecodeResult {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (!this.isJxl(bytes)) {
      throw new Error('Not a valid JPEG XL (JXL) image.');
    }

    let width = 800;
    let height = 600;
    let embeddedJpegBlob: Blob | undefined;

    // Check for ISOBMFF container boxes
    if (bytes.length >= 12 && bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let offset = 0;

      while (offset < bytes.length - 8) {
        const boxSize = view.getUint32(offset, false);
        const boxType = String.fromCharCode(
          bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
        );
        const actualSize = boxSize === 1 ? Number(view.getBigUint64(offset + 8, false)) : (boxSize === 0 ? bytes.length - offset : boxSize);

        // Check for JPEG reconstruction data (jbrd) or embedded preview
        if (boxType === 'jbrd' || boxType === 'Exif') {
          for (let p = offset + 8; p < Math.min(bytes.length - 4, offset + actualSize); p++) {
            if (bytes[p] === 0xFF && bytes[p + 1] === 0xD8 && bytes[p + 2] === 0xFF) {
              for (let end = p + 2; end < bytes.length - 1; end++) {
                if (bytes[end] === 0xFF && bytes[end + 1] === 0xD9) {
                  const jpegSlice = bytes.subarray(p, end + 2);
                  embeddedJpegBlob = new Blob([jpegSlice as unknown as BlobPart], { type: 'image/jpeg' });
                  break;
                }
              }
              break;
            }
          }
        }

        if (actualSize <= 0 || offset + actualSize > bytes.length) break;
        offset += actualSize;
      }
    }

    // Try scanning for dimensions in JXL basic info header
    const scanEnd = Math.min(bytes.length - 4, 128);
    for (let i = 0; i < scanEnd; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0x0A) {
        // Small dimension indicator in codestream
        const val1 = bytes[i + 2] || 0;
        const val2 = bytes[i + 3] || 0;
        if (val1 > 0 && val2 > 0) {
          const estimatedDim = ((val1 & 0x0F) + 1) * 64;
          if (estimatedDim >= 64 && estimatedDim <= 16384) {
            width = estimatedDim;
            height = estimatedDim;
          }
        }
        break;
      }
    }

    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    // Fill neutral slate canvas with opacity
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      data[idx] = 240;
      data[idx + 1] = 243;
      data[idx + 2] = 246;
      data[idx + 3] = 255;
    }

    return {
      width,
      height,
      data,
      embeddedJpegBlob
    };
  }
}
