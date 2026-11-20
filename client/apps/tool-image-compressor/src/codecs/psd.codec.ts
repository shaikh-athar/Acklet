// client/apps/tool-file-converter/src/services/image-codecs/psd.codec.ts

/**
 * Pure TypeScript Adobe Photoshop PSD / PSB Composite Stream Decoder.
 * Supports PSD (Version 1) & PSB (Version 2 Large Document Format),
 * RGB (8-bit and 16-bit), Grayscale, uncompressed and PackBits RLE planar channels.
 * Zero external dependencies.
 */

export class PsdCodec {
  /**
   * Decodes the full-resolution composite artwork from a PSD or PSB file into RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 26) {
      throw new Error('PSD file too small to contain a header.');
    }

    // 1. Signature '8BPS'
    if (bytes[0] !== 0x38 || bytes[1] !== 0x42 || bytes[2] !== 0x50 || bytes[3] !== 0x53) {
      throw new Error('Invalid Photoshop file signature. Expected "8BPS".');
    }

    const version = view.getUint16(4, false); // Big-Endian
    if (version !== 1 && version !== 2) {
      throw new Error(`Unsupported Photoshop version: ${version} (expected 1 for PSD or 2 for PSB).`);
    }

    const channels = view.getUint16(12, false);
    const height = view.getUint32(14, false);
    const width = view.getUint32(18, false);
    const depth = view.getUint16(22, false);
    const colorMode = view.getUint16(24, false); // 3 = RGB, 1 = Grayscale

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid Photoshop dimensions: ${width}x${height}`);
    }

    if (colorMode !== 3 && colorMode !== 1) {
      throw new Error(`Unsupported Photoshop color mode: ${colorMode} (only RGB and Grayscale are supported).`);
    }

    if (depth !== 8 && depth !== 16) {
      throw new Error(`Unsupported Photoshop bit depth: ${depth}-bit.`);
    }

    let offset = 26;

    // Section 2: Color Mode Data
    const colorModeLen = view.getUint32(offset, false);
    offset += 4 + colorModeLen;

    // Section 3: Image Resources
    const imgResLen = view.getUint32(offset, false);
    offset += 4 + imgResLen;

    // Section 4: Layer & Mask Information (4 bytes in PSD, 8 bytes in PSB)
    if (version === 1) {
      const layerMaskLen = view.getUint32(offset, false);
      offset += 4 + layerMaskLen;
    } else {
      // 64-bit uint in PSB
      const high = view.getUint32(offset, false);
      const low = view.getUint32(offset + 4, false);
      const layerMaskLen = high * 4294967296 + low;
      offset += 8 + layerMaskLen;
    }

    // Section 5: Image Data (Composite Image)
    if (offset + 2 > bytes.length) {
      throw new Error('Photoshop file missing composite image data section.');
    }

    const compression = view.getUint16(offset, false); // 0 = Raw, 1 = PackBits RLE
    offset += 2;

    const totalPixels = width * height;
    const rgba = new Uint8ClampedArray(totalPixels * 4);

    const channelData: Uint8Array[] = [];
    const activeChannels = Math.min(channels, colorMode === 3 ? 4 : 2);

    if (compression === 0) {
      // Raw uncompressed planar channel data
      const bytesPerChannel = totalPixels * (depth === 16 ? 2 : 1);
      for (let c = 0; c < activeChannels; c++) {
        const slice = bytes.subarray(offset, offset + bytesPerChannel);
        offset += bytesPerChannel;
        channelData.push(slice);
      }
    } else if (compression === 1) {
      // PackBits RLE compressed planar channels
      // In PSD, byte counts are 2 bytes each (height * channels); in PSB, 4 bytes each
      const countSize = version === 1 ? 2 : 4;
      const totalScanlines = height * channels;
      const scanlineOffsetsTable = offset;
      const scanlineDataStart = scanlineOffsetsTable + totalScanlines * countSize;

      let currentDataOffset = scanlineDataStart;

      for (let c = 0; c < activeChannels; c++) {
        const chBuffer = new Uint8Array(totalPixels * (depth === 16 ? 2 : 1));
        const scanlineLen = width * (depth === 16 ? 2 : 1);

        for (let y = 0; y < height; y++) {
          const tableIdx = (c * height + y) * countSize;
          const byteCount = version === 1
            ? view.getUint16(scanlineOffsetsTable + tableIdx, false)
            : view.getUint32(scanlineOffsetsTable + tableIdx, false);

          const rleSlice = bytes.subarray(currentDataOffset, currentDataOffset + byteCount);
          currentDataOffset += byteCount;

          const unpackedScanline = this.unpackPackBits(rleSlice, scanlineLen);
          chBuffer.set(unpackedScanline, y * scanlineLen);
        }

        channelData.push(chBuffer);
      }
    } else {
      throw new Error(`Unsupported Photoshop image compression: ${compression}`);
    }

    // Interleave planar channels into standard RGBA
    for (let i = 0; i < totalPixels; i++) {
      const dst = i * 4;
      const srcPxIdx = depth === 16 ? i * 2 : i;

      if (colorMode === 3) {
        // RGB
        const r = channelData[0] ? channelData[0][srcPxIdx] : 0;
        const g = channelData[1] ? channelData[1][srcPxIdx] : 0;
        const b = channelData[2] ? channelData[2][srcPxIdx] : 0;
        const a = (activeChannels >= 4 && channelData[3]) ? channelData[3][srcPxIdx] : 255;

        rgba[dst] = r;
        rgba[dst + 1] = g;
        rgba[dst + 2] = b;
        rgba[dst + 3] = a;
      } else {
        // Grayscale
        const gray = channelData[0] ? channelData[0][srcPxIdx] : 0;
        const a = (activeChannels >= 2 && channelData[1]) ? channelData[1][srcPxIdx] : 255;

        rgba[dst] = gray;
        rgba[dst + 1] = gray;
        rgba[dst + 2] = gray;
        rgba[dst + 3] = a;
      }
    }

    return { width, height, data: rgba };
  }

  private static unpackPackBits(input: Uint8Array, expectedLength: number): Uint8Array {
    const output = new Uint8Array(expectedLength);
    let inIdx = 0;
    let outIdx = 0;

    while (inIdx < input.length && outIdx < expectedLength) {
      const b = input[inIdx++];
      const n = b > 127 ? b - 256 : b;

      if (n >= 0 && n <= 127) {
        const count = n + 1;
        for (let i = 0; i < count && outIdx < expectedLength; i++) {
          output[outIdx++] = input[inIdx++];
        }
      } else if (n >= -127 && n <= -1) {
        const count = -n + 1;
        const val = input[inIdx++];
        for (let i = 0; i < count && outIdx < expectedLength; i++) {
          output[outIdx++] = val;
        }
      }
    }

    return output;
  }
}

