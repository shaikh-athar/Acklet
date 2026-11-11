// client/apps/tool-file-converter/src/services/image-codecs/cur.codec.ts
import { IcoCodec } from './ico.codec';

/**
 * Windows Cursor (.cur) format decoder.
 * Supports standard Windows monochrome, colormapped, 24-bit, 32-bit DIB, and embedded PNG cursors.
 */
export class CurCodec {
  /**
   * Decodes a Windows CUR binary stream into an RGBA pixel array or PNG blob.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    hotspotX: number;
    hotspotY: number;
    pngBlob?: Blob;
    rgbaData?: Uint8ClampedArray;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 6) {
      throw new Error('Invalid CUR stream: File smaller than header size.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const reserved = view.getUint16(0, true);
    const type = view.getUint16(2, true);
    const count = view.getUint16(4, true);

    if (reserved !== 0 || (type !== 2 && type !== 1) || count === 0) {
      throw new Error(`Invalid CUR header: Type=${type}, Count=${count}`);
    }

    // Read first entry
    let bestWidth = bytes[6] === 0 ? 256 : bytes[6];
    let bestHeight = bytes[7] === 0 ? 256 : bytes[7];
    const hotspotX = view.getUint16(10, true);
    const hotspotY = view.getUint16(12, true);

    // Reuse IcoCodec's robust DIB/PNG container decoder
    const icoResult = IcoCodec.decodeBestEntry(bytes.slice().buffer as ArrayBuffer);

    return {
      width: icoResult.width || bestWidth,
      height: icoResult.height || bestHeight,
      hotspotX,
      hotspotY,
      pngBlob: icoResult.pngBlob,
      rgbaData: icoResult.rgbaData
    };
  }
}
