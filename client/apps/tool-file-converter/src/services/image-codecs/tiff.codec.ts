// client/apps/tool-file-converter/src/services/image-codecs/tiff.codec.ts

/**
 * Pure TypeScript TIFF 6.0 Decoder & Encoder.
 * Supports Little-Endian and Big-Endian, Baseline RGB/RGBA, Grayscale,
 * uncompressed strips, PackBits (Macintosh RLE), and embedded JPEG preview streams.
 * Zero external dependencies.
 */

export class TiffCodec {
  /**
   * Decodes a TIFF ArrayBuffer or Uint8Array into standard RGBA ImageData or returns embedded JPEG Blob if present.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    data?: Uint8ClampedArray;
    embeddedJpegBlob?: Blob;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 8) {
      throw new Error('TIFF file is too small to contain a valid header.');
    }

    const isLe = bytes[0] === 0x49 && bytes[1] === 0x49; // 'II'
    const isBe = bytes[0] === 0x4D && bytes[1] === 0x4D; // 'MM'

    if (!isLe && !isBe) {
      throw new Error('Invalid TIFF byte order marker. Expected "II" or "MM".');
    }

    const rawBuffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
    const view = new DataView(rawBuffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint16(2, isLe);
    if (magic !== 42 && magic !== 0x55) { // 42 standard TIFF, 0x55 Panasonic RAW
      throw new Error(`Invalid TIFF magic number: ${magic}`);
    }

    const ifdOffset = view.getUint32(4, isLe);
    if (ifdOffset >= bytes.length || ifdOffset < 8) {
      throw new Error(`Invalid first IFD offset: ${ifdOffset}`);
    }

    // Read IFD Tags
    const tags = this.readIfd(view, bytes, ifdOffset, isLe);

    // 1. Check for JPEG interchange format (embedded full-resolution JPEG stream)
    const jpegOffset = tags.get(513) || tags.get(0x0201);
    const jpegLength = tags.get(514) || tags.get(0x0202);

    if (jpegOffset && jpegLength && jpegOffset + jpegLength <= bytes.length) {
      const jpegSlice = bytes.slice(jpegOffset, jpegOffset + jpegLength);
      // Validate JPEG SOI
      if (jpegSlice[0] === 0xFF && jpegSlice[1] === 0xD8) {
        return {
          width: tags.get(256) || 800,
          height: tags.get(257) || 600,
          embeddedJpegBlob: new Blob([jpegSlice], { type: 'image/jpeg' })
        };
      }
    }

    const width = tags.get(256);
    const height = tags.get(257);

    if (!width || !height) {
      throw new Error('TIFF missing ImageWidth or ImageLength tags.');
    }

    const compression = tags.get(259) || 1; // 1 = none, 5 = LZW, 32773 = PackBits
    const photometric = tags.get(262) || 2; // 0/1 = White/BlackIsZero, 2 = RGB
    const samplesPerPixel = tags.get(277) || 3;
    const bitsPerSample = tags.get(258) || 8;
    const rowsPerStrip = tags.get(278) || height;
    const predictor = tags.get(317) || 1; // 1 = none, 2 = horizontal differencing

    const stripOffsets = this.readTagValues(view, bytes, ifdOffset, 273, isLe);
    const stripByteCounts = this.readTagValues(view, bytes, ifdOffset, 279, isLe);

    if (stripOffsets.length === 0) {
      throw new Error('TIFF missing StripOffsets tag.');
    }

    const totalPixels = width * height;
    const rgba = new Uint8ClampedArray(totalPixels * 4);

    let currentY = 0;

    for (let s = 0; s < stripOffsets.length; s++) {
      const offset = stripOffsets[s];
      const byteCount = stripByteCounts[s] || (bytes.length - offset);
      const stripRows = Math.min(rowsPerStrip, height - currentY);
      if (stripRows <= 0) break;

      let stripBytes: Uint8Array<ArrayBufferLike> = bytes.slice(offset, Math.min(bytes.length, offset + byteCount));

      // Decompress strip according to compression scheme
      if (compression === 32773) {
        stripBytes = this.decodePackBits(stripBytes, stripRows * width * samplesPerPixel);
      } else if (compression === 5) {
        // LZW Compression
        stripBytes = this.decodeLzw(stripBytes, stripRows * width * samplesPerPixel);
      } else if (compression !== 1) {
        // If compressed with other method (e.g. old JPEG or fax), check if there is an embedded JPEG SOI
        const fallbackJpeg = this.findEmbeddedJpeg(bytes);
        if (fallbackJpeg) {
          return { width, height, embeddedJpegBlob: fallbackJpeg };
        }
        throw new Error(`Unsupported TIFF compression scheme: ${compression}`);
      }

      // Restore horizontal differencing predictor if enabled (tag 317 = 2)
      if (predictor === 2) {
        const bytesPerPx = samplesPerPixel * (bitsPerSample === 16 ? 2 : 1);
        const rowBytes = width * bytesPerPx;
        for (let row = 0; row < stripRows; row++) {
          const rowStart = row * rowBytes;
          for (let i = bytesPerPx; i < rowBytes; i++) {
            stripBytes[rowStart + i] = (stripBytes[rowStart + i] + stripBytes[rowStart + i - bytesPerPx]) & 0xFF;
          }
        }
      }

      // Unpack strip bytes into RGBA scanlines
      const bytesPerPx = samplesPerPixel * (bitsPerSample === 16 ? 2 : 1);

      for (let row = 0; row < stripRows; row++) {
        const y = currentY + row;
        const rowDstOffset = y * width * 4;
        const rowSrcOffset = row * width * bytesPerPx;

        for (let x = 0; x < width; x++) {
          const srcIdx = rowSrcOffset + x * bytesPerPx;
          const dstIdx = rowDstOffset + x * 4;

          if (srcIdx < stripBytes.length) {
            if (photometric === 2) {
              // RGB / RGBA
              const r = bitsPerSample === 16 ? stripBytes[srcIdx + 1] : stripBytes[srcIdx];
              const g = bitsPerSample === 16 ? stripBytes[srcIdx + 3] : stripBytes[srcIdx + 1];
              const b = bitsPerSample === 16 ? stripBytes[srcIdx + 5] : stripBytes[srcIdx + 2];
              const a = samplesPerPixel >= 4
                ? (bitsPerSample === 16 ? stripBytes[srcIdx + 7] : stripBytes[srcIdx + 3])
                : 255;

              rgba[dstIdx] = r;
              rgba[dstIdx + 1] = g;
              rgba[dstIdx + 2] = b;
              rgba[dstIdx + 3] = a;
            } else if (photometric === 0 || photometric === 1) {
              // Grayscale (0 = WhiteIsZero, 1 = BlackIsZero)
              let gray = bitsPerSample === 16 ? stripBytes[srcIdx + 1] : stripBytes[srcIdx];
              if (photometric === 0) gray = 255 - gray;

              rgba[dstIdx] = gray;
              rgba[dstIdx + 1] = gray;
              rgba[dstIdx + 2] = gray;
              rgba[dstIdx + 3] = 255;
            }
          }
        }
      }

      currentY += stripRows;
    }

    return { width, height, data: rgba };
  }

  /**
   * Encodes RGBA pixel data into an uncompressed Baseline TIFF 6.0 file.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray, preserveAlpha = true, dpi = 96): Blob {
    const samplesPerPixel = preserveAlpha ? 4 : 3;
    const pixelBytesCount = width * height * samplesPerPixel;
    const numTags = 12;
    const ifdOffset = 8;
    const ifdSize = 2 + numTags * 12 + 4;
    const extraDataOffset = ifdOffset + ifdSize;

    // Extra data: BitsPerSample array (2 bytes * samples) + 2 Rationals for DPI (16 bytes)
    const bitsPerSampleSize = samplesPerPixel * 2;
    const xResOffset = extraDataOffset + bitsPerSampleSize;
    const yResOffset = xResOffset + 8;
    const pixelDataOffset = Math.ceil((yResOffset + 8) / 4) * 4;
    const totalSize = pixelDataOffset + pixelBytesCount;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. TIFF Header (8 bytes, Little-Endian 'II')
    bytes[0] = 0x49;
    bytes[1] = 0x49;
    view.setUint16(2, 42, true);
    view.setUint32(4, ifdOffset, true);

    // 2. IFD Tag Count
    view.setUint16(ifdOffset, numTags, true);

    let tagIdx = 0;
    const writeTag = (tag: number, type: number, count: number, valueOrOffset: number) => {
      const entryOffset = ifdOffset + 2 + tagIdx * 12;
      view.setUint16(entryOffset, tag, true);
      view.setUint16(entryOffset + 2, type, true);
      view.setUint32(entryOffset + 4, count, true);
      view.setUint32(entryOffset + 8, valueOrOffset, true);
      tagIdx++;
    };

    // BitsPerSample values written at extraDataOffset
    for (let i = 0; i < samplesPerPixel; i++) {
      view.setUint16(extraDataOffset + i * 2, 8, true);
    }

    // Resolution Rationals (dpi / 1)
    const safeDpi = Math.max(1, Math.min(2400, Math.round(dpi)));
    view.setUint32(xResOffset, safeDpi, true);
    view.setUint32(xResOffset + 4, 1, true);
    view.setUint32(yResOffset, safeDpi, true);
    view.setUint32(yResOffset + 4, 1, true);

    // Standard Baseline TIFF Tags
    writeTag(256, 4, 1, width);                                      // ImageWidth
    writeTag(257, 4, 1, height);                                     // ImageLength
    writeTag(258, 3, samplesPerPixel, extraDataOffset);               // BitsPerSample (offset)
    writeTag(259, 3, 1, 1);                                          // Compression: 1 (None)
    writeTag(262, 3, 1, 2);                                          // PhotometricInterpretation: 2 (RGB)
    writeTag(273, 4, 1, pixelDataOffset);                            // StripOffsets
    writeTag(277, 3, 1, samplesPerPixel);                            // SamplesPerPixel
    writeTag(278, 4, 1, height);                                     // RowsPerStrip
    writeTag(279, 4, 1, pixelBytesCount);                            // StripByteCounts
    writeTag(282, 5, 1, xResOffset);                                 // XResolution
    writeTag(283, 5, 1, yResOffset);                                 // YResolution
    writeTag(296, 3, 1, 2);                                          // ResolutionUnit: 2 (inches)

    // Next IFD Offset (0 = none)
    view.setUint32(ifdOffset + 2 + numTags * 12, 0, true);

    // 3. Pixel Data (RGB / RGBA)
    let dst = pixelDataOffset;
    for (let i = 0; i < width * height; i++) {
      const src = i * 4;
      bytes[dst++] = rgba[src];     // R
      bytes[dst++] = rgba[src + 1]; // G
      bytes[dst++] = rgba[src + 2]; // B
      if (preserveAlpha) {
        bytes[dst++] = rgba[src + 3]; // A
      }
    }

    return new Blob([buffer], { type: 'image/tiff' });
  }

  private static readIfd(view: DataView, bytes: Uint8Array, offset: number, isLe: boolean): Map<number, number> {
    const map = new Map<number, number>();
    const count = view.getUint16(offset, isLe);

    for (let i = 0; i < count; i++) {
      const entry = offset + 2 + i * 12;
      if (entry + 12 > bytes.length) break;

      const tag = view.getUint16(entry, isLe);
      const type = view.getUint16(entry + 2, isLe);
      const valCount = view.getUint32(entry + 4, isLe);

      if (valCount === 1) {
        if (type === 3) { // SHORT
          map.set(tag, view.getUint16(entry + 8, isLe));
        } else if (type === 4) { // LONG
          map.set(tag, view.getUint32(entry + 8, isLe));
        }
      } else {
        const valOffset = view.getUint32(entry + 8, isLe);
        map.set(tag, valOffset);
      }
    }

    return map;
  }

  private static readTagValues(view: DataView, bytes: Uint8Array, ifdOffset: number, targetTag: number, isLe: boolean): number[] {
    const count = view.getUint16(ifdOffset, isLe);

    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      if (entry + 12 > bytes.length) break;

      const tag = view.getUint16(entry, isLe);
      if (tag === targetTag) {
        const type = view.getUint16(entry + 2, isLe);
        const valCount = view.getUint32(entry + 4, isLe);

        if (valCount === 1) {
          return [type === 3 ? view.getUint16(entry + 8, isLe) : view.getUint32(entry + 8, isLe)];
        }

        const dataOffset = view.getUint32(entry + 8, isLe);
        const results: number[] = [];

        for (let j = 0; j < valCount; j++) {
          const itemOffset = dataOffset + j * (type === 3 ? 2 : 4);
          if (itemOffset + (type === 3 ? 2 : 4) <= bytes.length) {
            results.push(type === 3 ? view.getUint16(itemOffset, isLe) : view.getUint32(itemOffset, isLe));
          }
        }
        return results;
      }
    }

    return [];
  }

  private static decodePackBits(input: ArrayLike<number>, expectedLength: number): Uint8Array {
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

  private static decodeLzw(input: Uint8Array, expectedLength: number): Uint8Array {
    const output = new Uint8Array(expectedLength);
    let outIdx = 0;

    let bitBuf = 0;
    let bitLen = 0;
    let inIdx = 0;

    function getCode(bits: number): number {
      while (bitLen < bits) {
        if (inIdx >= input.length) return 257; // EOI
        bitBuf = (bitBuf << 8) | input[inIdx++];
        bitLen += 8;
      }
      bitLen -= bits;
      return (bitBuf >> bitLen) & ((1 << bits) - 1);
    }

    const CLEAR = 256;
    const EOI = 257;
    let codeSize = 9;
    let nextCode = 258;

    // Dictionary initialized with 0..255 byte sequences
    let dict: Uint8Array[] = new Array(4096);
    function initDictionary() {
      for (let i = 0; i < 256; i++) {
        dict[i] = new Uint8Array([i]);
      }
      codeSize = 9;
      nextCode = 258;
    }
    initDictionary();

    let oldCode = -1;

    while (outIdx < expectedLength) {
      const code = getCode(codeSize);
      if (code === EOI) {
        break;
      }
      if (code === CLEAR) {
        initDictionary();
        oldCode = -1;
        continue;
      }

      let seq: Uint8Array;
      if (code < nextCode) {
        seq = dict[code];
      } else if (code === nextCode && oldCode !== -1) {
        const prevSeq = dict[oldCode];
        seq = new Uint8Array(prevSeq.length + 1);
        seq.set(prevSeq);
        seq[prevSeq.length] = prevSeq[0];
      } else {
        break; // Corrupted code stream
      }

      for (let i = 0; i < seq.length && outIdx < expectedLength; i++) {
        output[outIdx++] = seq[i];
      }

      if (oldCode !== -1 && nextCode < 4096) {
        const prevSeq = dict[oldCode];
        const newSeq = new Uint8Array(prevSeq.length + 1);
        newSeq.set(prevSeq);
        newSeq[prevSeq.length] = seq[0];
        dict[nextCode++] = newSeq;

        // TIFF 6.0 early change
        if (nextCode === (1 << codeSize) - 1 && codeSize < 12) {
          codeSize++;
        }
      }

      oldCode = code;
    }

    return output;
  }

  private static findEmbeddedJpeg(bytes: Uint8Array): Blob | null {
    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        // Found JPEG SOI, search for EOI (FF D9)
        for (let j = i + 2; j < bytes.length - 1; j++) {
          if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
            const jpegBytes = bytes.slice(i, j + 2);
            return new Blob([jpegBytes], { type: 'image/jpeg' });
          }
        }
      }
    }
    return null;
  }
}
