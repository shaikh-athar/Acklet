// client/apps/tool-file-converter/src/services/image-codecs/apng.codec.ts
import { GifCodec } from './gif.codec';

export interface ApngFrame {
  sequenceNumber: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  delayNum: number;
  delayDen: number;
  delayMs: number;
  disposeOp: number; // 0 = none, 1 = background, 2 = previous
  blendOp: number;   // 0 = source, 1 = over
  pngBlob: Blob;
}

export interface ApngParseResult {
  width: number;
  height: number;
  numFrames: number;
  numPlays: number;
  frames: ApngFrame[];
  defaultImageBlob: Blob;
}

export class ApngCodec {
  /**
   * Checks if binary bytes represent a valid APNG (PNG signature + acTL chunk).
   */
  static isApng(bytes: Uint8Array): boolean {
    if (bytes.length < 32) return false;
    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47 ||
      bytes[4] !== 0x0D || bytes[5] !== 0x0A || bytes[6] !== 0x1A || bytes[7] !== 0x0A
    ) {
      return false;
    }

    // Scan for 'acTL' chunk
    for (let i = 8; i <= Math.min(bytes.length - 8, 4096); i++) {
      if (bytes[i] === 0x61 && bytes[i + 1] === 0x63 && bytes[i + 2] === 0x54 && bytes[i + 3] === 0x4C) {
        return true;
      }
    }
    return false;
  }

  /**
   * Parses all APNG frames and reconstructs each frame into a standalone PNG Blob.
   */
  static parseFrames(buffer: ArrayBuffer): ApngParseResult {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    if (!this.isApng(bytes)) {
      throw new Error('Not a valid Animated Portable Network Graphics (APNG) file.');
    }

    let width = 0;
    let height = 0;
    let bitDepth = 8;
    let colorType = 6; // RGBA
    let compression = 0;
    let filter = 0;
    let interlace = 0;

    let numFrames = 1;
    let numPlays = 0;

    // Palette & transparency chunks from original file
    let plteChunk: Uint8Array | null = null;
    let trnsChunk: Uint8Array | null = null;

    interface RawFrame {
      fcTl?: {
        sequenceNumber: number;
        width: number;
        height: number;
        xOffset: number;
        yOffset: number;
        delayNum: number;
        delayDen: number;
        disposeOp: number;
        blendOp: number;
      };
      dataChunks: Uint8Array[];
    }

    const rawFrames: RawFrame[] = [];
    let currentFrame: RawFrame | null = null;
    let defaultImageDataChunks: Uint8Array[] = [];
    let hasSeenFcTlBeforeIdat = false;

    let offset = 8; // Skip 8-byte PNG signature
    while (offset < bytes.length - 8) {
      const chunkLen = view.getUint32(offset, false);
      const chunkTypeStr = String.fromCharCode(
        bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
      );
      const dataOffset = offset + 8;
      const dataEnd = dataOffset + chunkLen;

      if (chunkTypeStr === 'IHDR') {
        width = view.getUint32(dataOffset, false);
        height = view.getUint32(dataOffset + 4, false);
        bitDepth = bytes[dataOffset + 8];
        colorType = bytes[dataOffset + 9];
        compression = bytes[dataOffset + 10];
        filter = bytes[dataOffset + 11];
        interlace = bytes[dataOffset + 12];
      } else if (chunkTypeStr === 'acTL') {
        numFrames = view.getUint32(dataOffset, false);
        numPlays = view.getUint32(dataOffset + 4, false);
      } else if (chunkTypeStr === 'PLTE') {
        plteChunk = bytes.slice(offset, dataEnd + 4);
      } else if (chunkTypeStr === 'tRNS') {
        trnsChunk = bytes.slice(offset, dataEnd + 4);
      } else if (chunkTypeStr === 'fcTL') {
        if (defaultImageDataChunks.length === 0) {
          hasSeenFcTlBeforeIdat = true;
        }
        currentFrame = {
          fcTl: {
            sequenceNumber: view.getUint32(dataOffset, false),
            width: view.getUint32(dataOffset + 4, false),
            height: view.getUint32(dataOffset + 8, false),
            xOffset: view.getUint32(dataOffset + 12, false),
            yOffset: view.getUint32(dataOffset + 16, false),
            delayNum: view.getUint16(dataOffset + 20, false),
            delayDen: view.getUint16(dataOffset + 22, false),
            disposeOp: bytes[dataOffset + 24],
            blendOp: bytes[dataOffset + 25]
          },
          dataChunks: []
        };
        rawFrames.push(currentFrame);
      } else if (chunkTypeStr === 'IDAT') {
        defaultImageDataChunks.push(bytes.slice(dataOffset, dataEnd));
        if (hasSeenFcTlBeforeIdat && currentFrame) {
          currentFrame.dataChunks.push(bytes.slice(dataOffset, dataEnd));
        }
      } else if (chunkTypeStr === 'fdAT') {
        if (currentFrame) {
          // fdAT contains 4-byte sequence number followed by deflate data
          currentFrame.dataChunks.push(bytes.slice(dataOffset + 4, dataEnd));
        }
      }

      offset = dataEnd + 4; // Move past 4-byte CRC
    }

    // Helper to construct a standalone PNG Blob from IHDR and compressed data chunks
    const buildPng = (fWidth: number, fHeight: number, idatList: Uint8Array[]): Blob => {
      const parts: Uint8Array[] = [];
      // PNG Signature
      parts.push(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

      // IHDR
      const ihdrData = new Uint8Array(13);
      const ihdrView = new DataView(ihdrData.buffer);
      ihdrView.setUint32(0, fWidth, false);
      ihdrView.setUint32(4, fHeight, false);
      ihdrData[8] = bitDepth;
      ihdrData[9] = colorType;
      ihdrData[10] = compression;
      ihdrData[11] = filter;
      ihdrData[12] = interlace;
      parts.push(this.makeChunk('IHDR', ihdrData));

      if (plteChunk) parts.push(plteChunk);
      if (trnsChunk) parts.push(trnsChunk);

      for (const idat of idatList) {
        parts.push(this.makeChunk('IDAT', idat));
      }

      // IEND
      parts.push(this.makeChunk('IEND', new Uint8Array(0)));

      return new Blob(parts as unknown as BlobPart[], { type: 'image/png' });
    };

    const defaultImageBlob = buildPng(width, height, defaultImageDataChunks);

    const frames: ApngFrame[] = rawFrames.map(rf => {
      const fc = rf.fcTl || {
        sequenceNumber: 0,
        width,
        height,
        xOffset: 0,
        yOffset: 0,
        delayNum: 1,
        delayDen: 10,
        disposeOp: 0,
        blendOp: 0
      };
      const den = fc.delayDen === 0 ? 100 : fc.delayDen;
      const num = fc.delayNum === 0 ? 1 : fc.delayNum;
      const delayMs = Math.round((num / den) * 1000);

      const framePng = buildPng(fc.width, fc.height, rf.dataChunks);

      return {
        sequenceNumber: fc.sequenceNumber,
        width: fc.width,
        height: fc.height,
        xOffset: fc.xOffset,
        yOffset: fc.yOffset,
        delayNum: fc.delayNum,
        delayDen: fc.delayDen,
        delayMs: Math.max(20, delayMs),
        disposeOp: fc.disposeOp,
        blendOp: fc.blendOp,
        pngBlob: framePng
      };
    });

    return {
      width,
      height,
      numFrames: frames.length > 0 ? frames.length : 1,
      numPlays,
      frames: frames.length > 0 ? frames : [{
        sequenceNumber: 0,
        width,
        height,
        xOffset: 0,
        yOffset: 0,
        delayNum: 1,
        delayDen: 10,
        delayMs: 100,
        disposeOp: 0,
        blendOp: 0,
        pngBlob: defaultImageBlob
      }],
      defaultImageBlob
    };
  }

  /**
   * Helper to wrap chunk type and data into PNG format with 32-bit CRC.
   */
  private static makeChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(8 + data.length + 4);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length, false);
    chunk[4] = type.charCodeAt(0);
    chunk[5] = type.charCodeAt(1);
    chunk[6] = type.charCodeAt(2);
    chunk[7] = type.charCodeAt(3);
    chunk.set(data, 8);

    const crc = this.crc32(chunk.subarray(4, 8 + data.length));
    view.setUint32(8 + data.length, crc, false);
    return chunk;
  }

  /**
   * ISO 3309 32-bit CRC algorithm for PNG chunks.
   */
  private static crc32(buf: Uint8Array): number {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ this.crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  }

  private static crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();
}
