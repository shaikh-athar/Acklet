// client/apps/tool-file-converter/src/services/image-codecs/kra.codec.ts

export interface KraDecodeResult {
  width: number;
  height: number;
  pngBlob: Blob;
  layerCount?: number;
}

export class KraCodec {
  /**
   * Verifies if binary bytes represent a Krita document package.
   */
  static isKra(bytes: Uint8Array): boolean {
    if (bytes.length < 30) return false;
    // Check ZIP header: PK\x03\x04
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return false;
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 2048)));
    return text.includes('krita') || text.includes('maindoc') || text.includes('mergedimage.png');
  }

  /**
   * Decodes a Krita .kra package by reading the composite mergedimage.png or preview.png.
   */
  static async decode(buffer: ArrayBuffer | Uint8Array): Promise<KraDecodeResult> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (!this.isKra(bytes)) {
      throw new Error('Not a valid Krita (.kra) document archive.');
    }

    let mergedPngBytes: Uint8Array | null = null;
    let previewPngBytes: Uint8Array | null = null;
    let docWidth = 800;
    let docHeight = 600;

    // Walk ZIP local file headers (PK\x03\x04)
    let offset = 0;
    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4B &&
        bytes[offset + 2] === 0x03 &&
        bytes[offset + 3] === 0x04
      ) {
        const compression = view.getUint16(offset + 8, true);
        const compSize = view.getUint32(offset + 18, true);
        const uncompSize = view.getUint32(offset + 22, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
        const fileName = new TextDecoder().decode(nameBytes);
        const dataOffset = offset + 30 + nameLen + extraLen;

        if (fileName === 'mergedimage.png' || fileName.endsWith('/mergedimage.png')) {
          const rawSlice = bytes.subarray(dataOffset, dataOffset + compSize);
          if (compression === 0) {
            mergedPngBytes = rawSlice;
          } else if (compression === 8) {
            mergedPngBytes = await this.decompressDeflate(rawSlice);
          }
        } else if (fileName === 'preview.png' || fileName.endsWith('/preview.png')) {
          const rawSlice = bytes.subarray(dataOffset, dataOffset + compSize);
          if (compression === 0) {
            previewPngBytes = rawSlice;
          } else if (compression === 8) {
            previewPngBytes = await this.decompressDeflate(rawSlice);
          }
        } else if (fileName === 'maindoc.xml') {
          const rawSlice = bytes.subarray(dataOffset, dataOffset + compSize);
          let xmlText = '';
          if (compression === 0) {
            xmlText = new TextDecoder().decode(rawSlice);
          } else if (compression === 8) {
            const decomp = await this.decompressDeflate(rawSlice);
            xmlText = new TextDecoder().decode(decomp);
          }
          const wMatch = xmlText.match(/width\s*=\s*["'](\d+)["']/i);
          const hMatch = xmlText.match(/height\s*=\s*["'](\d+)["']/i);
          if (wMatch) docWidth = parseInt(wMatch[1], 10);
          if (hMatch) docHeight = parseInt(hMatch[1], 10);
        }

        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }

    const finalBytes = mergedPngBytes || previewPngBytes;
    if (!finalBytes || finalBytes.length < 8) {
      // Fallback: search for embedded PNG magic signature: 89 50 4E 47
      for (let i = 0; i < bytes.length - 8; i++) {
        if (
          bytes[i] === 0x89 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x4E && bytes[i + 3] === 0x47 &&
          bytes[i + 4] === 0x0D && bytes[i + 5] === 0x0A && bytes[i + 6] === 0x1A && bytes[i + 7] === 0x0A
        ) {
          for (let k = i + 8; k < bytes.length - 8; k++) {
            if (
              bytes[k] === 0x49 && bytes[k + 1] === 0x45 && bytes[k + 2] === 0x4E && bytes[k + 3] === 0x44
            ) {
              const pngSlice = bytes.subarray(i, k + 8);
              return {
                width: docWidth,
                height: docHeight,
                pngBlob: new Blob([pngSlice as unknown as BlobPart], { type: 'image/png' })
              };
            }
          }
        }
      }
      throw new Error('Could not locate composite image artwork inside Krita (.kra) package.');
    }

    // Parse dimensions from PNG IHDR if available
    if (finalBytes.length >= 24 && finalBytes[12] === 0x49 && finalBytes[13] === 0x48 && finalBytes[14] === 0x44 && finalBytes[15] === 0x52) {
      const pView = new DataView(finalBytes.buffer, finalBytes.byteOffset, finalBytes.byteLength);
      const pngW = pView.getUint32(16, false);
      const pngH = pView.getUint32(20, false);
      if (pngW > 0 && pngH > 0) {
        docWidth = pngW;
        docHeight = pngH;
      }
    }

    return {
      width: docWidth,
      height: docHeight,
      pngBlob: new Blob([finalBytes as unknown as BlobPart], { type: 'image/png' })
    };
  }

  private static async decompressDeflate(compressed: Uint8Array): Promise<Uint8Array> {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(compressed);
            controller.close();
          }
        }).pipeThrough(new DecompressionStream('deflate-raw'));

        const response = new Response(stream);
        const arrayBuf = await response.arrayBuffer();
        return new Uint8Array(arrayBuf);
      } catch (_) {
        // Fallback for standard zlib header
        try {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(compressed);
              controller.close();
            }
          }).pipeThrough(new DecompressionStream('deflate'));
          const response = new Response(stream);
          const arrayBuf = await response.arrayBuffer();
          return new Uint8Array(arrayBuf);
        } catch (e) {
          throw new Error('Failed to decompress Krita composite artwork stream.');
        }
      }
    }
    throw new Error('DecompressionStream is not supported in this runtime.');
  }
}
