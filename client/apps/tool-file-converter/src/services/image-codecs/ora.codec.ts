// client/apps/tool-file-converter/src/services/image-codecs/ora.codec.ts

/**
 * OpenRaster (.ora) image format decoder.
 * Extracts the standardized full-resolution composite artwork ('mergedimage.png') from OpenRaster zip packages.
 */
export class OraCodec {
  static isOra(bytes: Uint8Array): boolean {
    if (bytes.length < 30) return false;
    // PKZip header
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return false;
    }
    const headerStr = new TextDecoder().decode(bytes.subarray(0, 256));
    return headerStr.includes('openraster') || headerStr.includes('mergedimage.png');
  }

  static decode(buffer: ArrayBuffer | Uint8Array): {
    pngBlob: Blob;
    format: 'ora';
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    let offset = 0;
    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B &&
        bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04
      ) {
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 30);
        const nameLen = view.getUint16(26, true);
        const extraLen = view.getUint16(28, true);
        const compMethod = view.getUint16(8, true);
        const compSize = view.getUint32(18, true);
        const uncompSize = view.getUint32(22, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
        const name = new TextDecoder().decode(nameBytes);

        if (name === 'mergedimage.png' || name.endsWith('/mergedimage.png')) {
          const dataStart = offset + 30 + nameLen + extraLen;
          const imgData = bytes.subarray(dataStart, dataStart + (compMethod === 0 ? uncompSize : compSize));
          return {
            pngBlob: new Blob([new Uint8Array(imgData) as any], { type: 'image/png' }),
            format: 'ora'
          };
        }

        offset += 30 + nameLen + extraLen + compSize;
      } else {
        offset++;
      }
    }

    // Fallback: search for embedded PNG magic number anywhere in container
    for (let i = 0; i < bytes.length - 8; i++) {
      if (
        bytes[i] === 0x89 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x4E && bytes[i + 3] === 0x47 &&
        bytes[i + 4] === 0x0D && bytes[i + 5] === 0x0A && bytes[i + 6] === 0x1A && bytes[i + 7] === 0x0A
      ) {
        return {
          pngBlob: new Blob([new Uint8Array(bytes.subarray(i)) as any], { type: 'image/png' }),
          format: 'ora'
        };
      }
    }

    throw new Error('OpenRaster container does not contain a valid mergedimage.png composite.');
  }
}
