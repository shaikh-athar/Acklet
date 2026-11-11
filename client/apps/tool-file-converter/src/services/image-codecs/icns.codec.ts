// client/apps/tool-file-converter/src/services/image-codecs/icns.codec.ts

export interface DecodedIcns {
  width: number;
  height: number;
  pngBlob?: Blob;
  rgbaData?: Uint8ClampedArray;
  selectedTag: string;
}

export class IcnsCodec {
  /**
   * Decodes an Apple ICNS file, extracting the highest-fidelity embedded icon.
   * Modern ICNS icons embed standard PNG streams (ic07 to ic10, icp4 to icp6).
   */
  static decode(buffer: ArrayBuffer | Uint8Array): DecodedIcns {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 16) {
      throw new Error('Corrupted or invalid ICNS file: header too short.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Magic: 0x69636E73 ('icns')
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'icns') {
      throw new Error(`Invalid ICNS magic: expected "icns", got "${magic}".`);
    }

    const totalFileSize = view.getUint32(4, false); // Big Endian
    let p = 8;

    const resolutionOrder: Record<string, number> = {
      ic10: 1024,
      ic09: 512,
      ic08: 256,
      ic07: 128,
      icp6: 64,
      icp5: 32,
      icp4: 16,
      it32: 128,
      ih32: 48,
      il32: 32,
      is32: 16
    };

    let bestTag = '';
    let bestDimension = -1;
    let bestData: Uint8Array | null = null;
    let isPng = false;

    while (p + 8 <= bytes.length && p < totalFileSize) {
      const tag = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
      const entrySize = view.getUint32(p + 4, false);
      const dataSize = Math.max(0, entrySize - 8);
      const dataOffset = p + 8;

      if (dataOffset + dataSize > bytes.length) break;

      const dim = resolutionOrder[tag] || 0;
      if (dim > bestDimension) {
        bestDimension = dim;
        bestTag = tag;
        bestData = bytes.subarray(dataOffset, dataOffset + dataSize);

        // Check if data is a PNG stream (89 50 4E 47)
        if (
          bestData.length > 8 &&
          bestData[0] === 0x89 && bestData[1] === 0x50 &&
          bestData[2] === 0x4E && bestData[3] === 0x47
        ) {
          isPng = true;
        } else {
          isPng = false;
        }
      }

      p += entrySize;
    }

    if (!bestData || bestDimension <= 0) {
      throw new Error('No valid icon streams found inside ICNS container.');
    }

    if (isPng) {
      const pngCopy = new Uint8Array(bestData);
      return {
        width: bestDimension,
        height: bestDimension,
        pngBlob: new Blob([pngCopy], { type: 'image/png' }),
        selectedTag: bestTag
      };
    }

    // For legacy 24-bit RGB / 32-bit ARGB uncompressed icons
    const rgba = new Uint8ClampedArray(bestDimension * bestDimension * 4);
    const totalPixels = bestDimension * bestDimension;

    // Default fill white with opaque alpha if raw bytes are uncompressed
    let readPos = 0;
    for (let i = 0; i < totalPixels; i++) {
      const outIdx = i * 4;
      if (readPos + 3 <= bestData.length) {
        rgba[outIdx] = bestData[readPos++];
        rgba[outIdx + 1] = bestData[readPos++];
        rgba[outIdx + 2] = bestData[readPos++];
        rgba[outIdx + 3] = 255;
      } else {
        rgba[outIdx] = 255;
        rgba[outIdx + 1] = 255;
        rgba[outIdx + 2] = 255;
        rgba[outIdx + 3] = 255;
      }
    }

    return {
      width: bestDimension,
      height: bestDimension,
      rgbaData: rgba,
      selectedTag: bestTag
    };
  }

  /**
   * Encapsulates a PNG icon stream into a modern Apple ICNS container.
   */
  static encodeFromPng(pngBytes: Uint8Array, width: number, height: number): Blob {
    let tag = 'ic08'; // 256x256 default
    const dim = Math.max(width, height);
    if (dim >= 512) tag = 'ic09';
    else if (dim >= 256) tag = 'ic08';
    else if (dim >= 128) tag = 'ic07';
    else if (dim >= 64) tag = 'icp6';
    else if (dim >= 32) tag = 'icp5';
    else tag = 'icp4';

    const elementLength = 8 + pngBytes.length;
    const totalFileSize = 8 + elementLength;
    const buffer = new Uint8Array(totalFileSize);
    const view = new DataView(buffer.buffer);

    // Magic: 'icns'
    buffer[0] = 0x69;
    buffer[1] = 0x63;
    buffer[2] = 0x6E;
    buffer[3] = 0x73;
    view.setUint32(4, totalFileSize, false); // Big Endian

    // Element Tag
    buffer[8] = tag.charCodeAt(0);
    buffer[9] = tag.charCodeAt(1);
    buffer[10] = tag.charCodeAt(2);
    buffer[11] = tag.charCodeAt(3);
    view.setUint32(12, elementLength, false); // Big Endian

    // PNG stream
    buffer.set(pngBytes, 16);

    return new Blob([buffer], { type: 'image/x-icns' });
  }
}

