// client/apps/tool-file-converter/src/services/image-codecs/gif.codec.ts

export interface DecodedGifFrame {
  rgba: Uint8ClampedArray;
  delayMs: number;
  disposal: number;
}

export interface DecodedGif {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA composited pixels
  frameCount: number;
  isAnimated: boolean;
  primaryFrameIndex: number;
  frames: DecodedGifFrame[];
  loopCount: number;
  hasNetscapeLoop: boolean;
}

export class GifCodec {
  /**
   * Decodes a GIF87a or GIF89a file buffer, composites animated frames,
   * and extracts the primary representative high-fidelity frame.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): DecodedGif {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 13) {
      throw new Error('Corrupted or invalid GIF: file size too small.');
    }

    const header = String.fromCharCode(...bytes.subarray(0, 6));
    if (header !== 'GIF87a' && header !== 'GIF89a') {
      throw new Error(`Unsupported GIF signature "${header}". Expected GIF87a or GIF89a.`);
    }

    const canvasWidth = bytes[6] | (bytes[7] << 8);
    const canvasHeight = bytes[8] | (bytes[9] << 8);
    if (canvasWidth === 0 || canvasHeight === 0) {
      throw new Error(`Invalid GIF dimensions (${canvasWidth}x${canvasHeight}).`);
    }

    const packed = bytes[10];
    const hasGct = !!(packed & 0x80);
    const gctSize = hasGct ? 1 << ((packed & 0x07) + 1) : 0;
    let p = 13;

    const gct: [number, number, number][] = [];
    if (hasGct) {
      for (let i = 0; i < gctSize; i++) {
        gct.push([bytes[p], bytes[p + 1], bytes[p + 2]]);
        p += 3;
      }
    }

    let disposal = 0;
    let transIndex = -1;
    let delay = 0;
    let loopCount = 0;
    let hasNetscapeLoop = false;
    const frames: DecodedGifFrame[] = [];

    const compositedCanvas = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
    let bestFrameData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
    let maxContentScore = -1;
    let bestFrameIndex = 0;
    let totalFrames = 0;
    let previousCanvasSnapshot: Uint8ClampedArray | null = null;

    while (p < bytes.length) {
      const blockType = bytes[p++];
      if (blockType === 0x3B) {
        // GIF Trailer (terminator)
        break;
      }

      if (blockType === 0x21) {
        // Extension block
        const extType = bytes[p++];
        if (extType === 0xF9) {
          // Graphic Control Extension (8 bytes total)
          p++; // Block size (usually 4)
          const gcePacked = bytes[p++];
          disposal = (gcePacked >> 2) & 0x07;
          const hasTrans = !!(gcePacked & 0x01);
          delay = (bytes[p] | (bytes[p + 1] << 8)) * 10;
          p += 2;
          transIndex = hasTrans ? bytes[p++] : -1;
          p++; // Block terminator (0x00)
        } else if (extType === 0xFF) {
          // Application Extension (e.g. NETSCAPE2.0 loop count)
          const appLen = bytes[p++];
          if (appLen === 11 && p + 11 <= bytes.length) {
            const appName = String.fromCharCode(...bytes.subarray(p, p + 11));
            p += 11;
            if (appName === 'NETSCAPE2.0' || appName === 'ANIMEXTS1.0') {
              const subBlockLen = bytes[p++];
              if (subBlockLen === 3 && bytes[p] === 1) {
                hasNetscapeLoop = true;
                loopCount = bytes[p + 1] | (bytes[p + 2] << 8);
                p += 3;
              } else {
                p += subBlockLen;
              }
            }
          } else {
            p += appLen;
          }
          while (p < bytes.length && bytes[p] !== 0) {
            p += 1 + bytes[p];
          }
          p++; // Skip terminator
        } else {
          // Skip other extensions (Comment, Plain text)
          while (p < bytes.length && bytes[p] !== 0) {
            p += 1 + bytes[p];
          }
          p++; // Skip terminator
        }
      } else if (blockType === 0x2C) {
        // Image Descriptor
        const frameIndex = totalFrames++;
        const left = bytes[p] | (bytes[p + 1] << 8); p += 2;
        const top = bytes[p] | (bytes[p + 1] << 8); p += 2;
        const width = bytes[p] | (bytes[p + 1] << 8); p += 2;
        const height = bytes[p] | (bytes[p + 1] << 8); p += 2;
        const imgPacked = bytes[p++];
        const interlaced = !!(imgPacked & 0x40);
        const hasLct = !!(imgPacked & 0x80);

        let colorTable = gct;
        if (hasLct) {
          const lctSize = 1 << ((imgPacked & 0x07) + 1);
          colorTable = [];
          for (let i = 0; i < lctSize; i++) {
            colorTable.push([bytes[p], bytes[p + 1], bytes[p + 2]]);
            p += 3;
          }
        }

        const minCodeSize = bytes[p++];
        const subBlocks: Uint8Array[] = [];
        let totalDataLen = 0;

        while (p < bytes.length && bytes[p] !== 0) {
          const len = bytes[p++];
          subBlocks.push(bytes.subarray(p, p + len));
          totalDataLen += len;
          p += len;
        }
        p++; // Sub-block terminator

        const compressedData = new Uint8Array(totalDataLen);
        let offset = 0;
        for (const sb of subBlocks) {
          compressedData.set(sb, offset);
          offset += sb.length;
        }

        // Decompress indices
        const indices = this.lzwDecompress(minCodeSize, compressedData, width * height);

        // Save pre-draw canvas snapshot if disposal === 3 (restore to previous)
        if (disposal === 3) {
          previousCanvasSnapshot = new Uint8ClampedArray(compositedCanvas);
        }

        // Paint frame to compositedCanvas
        let pixelIndex = 0;
        if (interlaced) {
          const passStarts = [0, 4, 2, 1];
          const passSteps = [8, 8, 4, 2];
          for (let pass = 0; pass < 4; pass++) {
            for (let y = passStarts[pass]; y < height; y += passSteps[pass]) {
              for (let x = 0; x < width; x++) {
                const colorIdx = indices[pixelIndex++];
                if (colorIdx !== transIndex && colorIdx < colorTable.length) {
                  const rgb = colorTable[colorIdx];
                  const destIdx = ((top + y) * canvasWidth + (left + x)) * 4;
                  compositedCanvas[destIdx] = rgb[0];
                  compositedCanvas[destIdx + 1] = rgb[1];
                  compositedCanvas[destIdx + 2] = rgb[2];
                  compositedCanvas[destIdx + 3] = 255;
                }
              }
            }
          }
        } else {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const colorIdx = indices[pixelIndex++];
              if (colorIdx !== transIndex && colorIdx < colorTable.length) {
                const rgb = colorTable[colorIdx];
                const destIdx = ((top + y) * canvasWidth + (left + x)) * 4;
                compositedCanvas[destIdx] = rgb[0];
                compositedCanvas[destIdx + 1] = rgb[1];
                compositedCanvas[destIdx + 2] = rgb[2];
                compositedCanvas[destIdx + 3] = 255;
              }
            }
          }
        }

        // Calculate visual content score based on contrast, saturation, and opacity
        // This ensures fully-composited, high-contrast artwork frames are chosen over faint fade-in introductory frames
        let totalContentScore = 0;
        for (let i = 0; i < compositedCanvas.length; i += 4) {
          const a = compositedCanvas[i + 3];
          if (a > 0) {
            const r = compositedCanvas[i];
            const g = compositedCanvas[i + 1];
            const b = compositedCanvas[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max === 0 ? 0 : (max - min) / max;
            // Higher weight to deep contrast and vibrant colors
            totalContentScore += (255 - lum) * (1 + sat) * (a / 255);
          }
        }

        // Select the primary frame with the highest content score (e.g. not an empty introductory frame)
        if (totalContentScore > maxContentScore || frameIndex === 0) {
          maxContentScore = totalContentScore;
          bestFrameIndex = frameIndex;
          bestFrameData = new Uint8ClampedArray(compositedCanvas);
        }

        // Capture composited frame for animation playback
        const frameDelay = delay > 0 ? delay : 100;
        frames.push({
          rgba: new Uint8ClampedArray(compositedCanvas),
          delayMs: Math.max(20, frameDelay),
          disposal
        });

        // Handle disposal for subsequent frames
        if (disposal === 2) {
          // Restore to background: clear frame rect
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const destIdx = ((top + y) * canvasWidth + (left + x)) * 4;
              compositedCanvas[destIdx] = 0;
              compositedCanvas[destIdx + 1] = 0;
              compositedCanvas[destIdx + 2] = 0;
              compositedCanvas[destIdx + 3] = 0;
            }
          }
        } else if (disposal === 3 && previousCanvasSnapshot) {
          compositedCanvas.set(previousCanvasSnapshot);
        }

        disposal = 0;
        transIndex = -1;
      }
    }

    if (totalFrames === 0) {
      throw new Error('Invalid GIF: no image frames found in file.');
    }

    // In standard GIF89a, if no Netscape loop application block was present,
    // the animation only plays once from start to finish (single play / initial animation only).
    if (!hasNetscapeLoop && loopCount === 0) {
      loopCount = 1;
    }

    return {
      width: canvasWidth,
      height: canvasHeight,
      data: bestFrameData,
      frameCount: totalFrames,
      isAnimated: totalFrames > 1,
      primaryFrameIndex: bestFrameIndex,
      frames,
      loopCount,
      hasNetscapeLoop
    };
  }

  /**
   * Decompresses GIF LZW compressed byte streams into an array of color table indices.
   */
  private static lzwDecompress(minCodeSize: number, data: Uint8Array, expectedLength: number): Uint8Array {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let codeMask = (1 << codeSize) - 1;

    let dict: number[][] = [];
    const resetDict = () => {
      dict = [];
      for (let i = 0; i < clearCode; i++) {
        dict[i] = [i];
      }
      dict[clearCode] = [];
      dict[eoiCode] = [];
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
    };
    resetDict();

    let bitPos = 0;
    const readCode = (): number => {
      const bytePos = bitPos >> 3;
      if (bytePos >= data.length) return eoiCode;
      const bitOffset = bitPos & 0x07;
      const b0 = data[bytePos];
      const b1 = bytePos + 1 < data.length ? data[bytePos + 1] : 0;
      const b2 = bytePos + 2 < data.length ? data[bytePos + 2] : 0;
      const raw = b0 | (b1 << 8) | (b2 << 16);
      bitPos += codeSize;
      return (raw >> bitOffset) & codeMask;
    };

    const output = new Uint8Array(expectedLength);
    let outPos = 0;
    let prevCode: number | null = null;

    while (outPos < expectedLength) {
      const code = readCode();
      if (code === eoiCode) break;
      if (code === clearCode) {
        resetDict();
        prevCode = null;
        continue;
      }

      let entry: number[];
      if (code < dict.length) {
        entry = dict[code];
      } else if (code === dict.length && prevCode !== null) {
        entry = [...dict[prevCode], dict[prevCode][0]];
      } else {
        break;
      }

      for (let i = 0; i < entry.length && outPos < expectedLength; i++) {
        output[outPos++] = entry[i];
      }

      if (prevCode !== null && dict.length < 4096) {
        dict.push([...dict[prevCode], entry[0]]);
        if (dict.length > codeMask && codeSize < 12) {
          codeSize++;
          codeMask = (1 << codeSize) - 1;
        }
      }
      prevCode = code;
    }

    return output;
  }

  /**
   * Encodes raw 32-bit RGBA pixel data into a standard GIF89a binary image container.
   * Uses an authentic adaptive 256-color palette via 15-bit color histogram median-cut
   * and preserves opacity / transparency without color crushing or false transparency.
   */
  static encode(
    width: number,
    height: number,
    rgba: Uint8ClampedArray | Uint8Array,
    options?: { transparent?: boolean }
  ): Blob {
    const parts: Uint8Array[] = [];

    // 1. Header 'GIF89a'
    parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    // 2. Logical Screen Descriptor
    parts.push(new Uint8Array([
      width & 0xFF, (width >> 8) & 0xFF,
      height & 0xFF, (height >> 8) & 0xFF,
      0xF7, // Global Color Table present (256 colors)
      0x00, // Background color index 0
      0x00  // Pixel aspect ratio
    ]));

    // 3. Detect transparency in input pixels
    let hasTransparent = false;
    if (options?.transparent !== false) {
      for (let i = 3; i < rgba.length; i += 4) {
        if (rgba[i] < 128) {
          hasTransparent = true;
          break;
        }
      }
    }

    // 4. Build Adaptive Color Palette via 15-bit Histogram Median Cut
    const { palette, binLookup } = this.buildAdaptivePalette(rgba, hasTransparent);

    // Global Color Table (256 * 3 bytes)
    const gct = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const c = palette[i] || [0, 0, 0];
      gct[i * 3] = c[0];
      gct[i * 3 + 1] = c[1];
      gct[i * 3 + 2] = c[2];
    }
    parts.push(gct);

    // 5. Graphic Control Extension (disposal 1, optional transparency flag)
    parts.push(new Uint8Array([
      0x21, 0xF9, 0x04,
      hasTransparent ? 0x01 : 0x00, // Packed field: transparency flag
      0x00, 0x00,                   // Delay time (0 for static export)
      0x00,                         // Transparent color index (0)
      0x00                          // Block terminator
    ]));

    // 6. Image Descriptor (Left: 0, Top: 0, Width, Height)
    parts.push(new Uint8Array([
      0x2C,
      0x00, 0x00, 0x00, 0x00,
      width & 0xFF, (width >> 8) & 0xFF,
      height & 0xFF, (height >> 8) & 0xFF,
      0x00 // No Local Color Table
    ]));

    // 7. Map RGBA pixels to 8-bit palette indices using fast precomputed 32k LUT
    const totalPixels = width * height;
    const pixelIndices = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4;
      const a = rgba[offset + 3];
      if (hasTransparent && a < 128) {
        pixelIndices[i] = 0; // Transparent index
      } else {
        const r = rgba[offset];
        const g = rgba[offset + 1];
        const b = rgba[offset + 2];
        const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        pixelIndices[i] = binLookup[bin];
      }
    }

    // 8. LZW Compression Engine
    const lzwBlocks = this.compressLzw(pixelIndices);
    parts.push(...lzwBlocks);

    // 9. GIF Trailer
    parts.push(new Uint8Array([0x3B]));

    // Compute total length and build Blob
    let totalLen = 0;
    for (const p of parts) totalLen += p.length;
    const outputBuffer = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      outputBuffer.set(p, offset);
      offset += p.length;
    }

    return new Blob([outputBuffer], { type: 'image/gif' });
  }

  /**
   * Encodes multiple RGBA frames into a genuine multi-frame looping Animated GIF.
   */
  static encodeAnimated(
    width: number,
    height: number,
    frames: { rgba: Uint8ClampedArray | Uint8Array; delayMs: number }[],
    loopCount: number = 0
  ): Blob {
    if (frames.length === 0) {
      throw new Error('At least one frame is required to encode an animated GIF.');
    }

    if (frames.length === 1) {
      return this.encode(width, height, frames[0].rgba);
    }

    const parts: Uint8Array[] = [];

    // 1. Header 'GIF89a'
    parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    // 2. Logical Screen Descriptor (No Global Color Table, each frame has Local Color Table)
    parts.push(new Uint8Array([
      width & 0xFF, (width >> 8) & 0xFF,
      height & 0xFF, (height >> 8) & 0xFF,
      0x70, // No Global Color Table, 8 bits/pixel resolution
      0x00, // Background color index
      0x00  // Pixel aspect ratio
    ]));

    // 3. Netscape 2.0 Application Extension for looping
    // In GIF specification:
    // - loopCount === 0: infinite loop (Netscape block with 0)
    // - loopCount > 1: loop N times (Netscape block with N)
    // - loopCount === 1: play once (omit Netscape block, or standard single play)
    if (loopCount === 0 || loopCount > 1) {
      parts.push(new Uint8Array([
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // 'NETSCAPE2.0'
        0x03, 0x01, loopCount & 0xFF, (loopCount >> 8) & 0xFF, // loop count (0 = infinite)
        0x00 // terminator
      ]));
    }

    // 4. Encode each frame
    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
      const frame = frames[fIdx];
      const rgba = frame.rgba;

      let hasTransparent = false;
      for (let i = 3; i < rgba.length; i += 4) {
        if (rgba[i] < 128) {
          hasTransparent = true;
          break;
        }
      }

      // Build Adaptive Color Palette for this frame
      const { palette, binLookup } = this.buildAdaptivePalette(rgba, hasTransparent);

      // Local Color Table (256 * 3 bytes)
      const lct = new Uint8Array(768);
      for (let i = 0; i < 256; i++) {
        const c = palette[i] || [0, 0, 0];
        lct[i * 3] = c[0];
        lct[i * 3 + 1] = c[1];
        lct[i * 3 + 2] = c[2];
      }

      // Delay in 1/100ths of second (min 2 = 20ms to prevent browser freeze)
      const delay100th = Math.max(2, Math.round(frame.delayMs / 10));

      // Graphic Control Extension (disposal 2 = restore to bg or 1 = leave)
      parts.push(new Uint8Array([
        0x21, 0xF9, 0x04,
        (hasTransparent ? 0x01 : 0x00) | (0x01 << 2), // Disposal 1 (do not dispose)
        delay100th & 0xFF, (delay100th >> 8) & 0xFF,
        0x00, // Transparent color index
        0x00  // Terminator
      ]));

      // Image Descriptor with Local Color Table flag (0x87 = present, 256 colors)
      parts.push(new Uint8Array([
        0x2C,
        0x00, 0x00, 0x00, 0x00, // Left: 0, Top: 0
        width & 0xFF, (width >> 8) & 0xFF,
        height & 0xFF, (height >> 8) & 0xFF,
        0x87 // Local Color Table flag + 256 colors (2^(7+1))
      ]));

      // Append Local Color Table
      parts.push(lct);

      // Map RGBA pixels to 8-bit palette indices
      const totalPixels = width * height;
      const pixelIndices = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;
        const a = rgba[offset + 3];
        if (hasTransparent && a < 128) {
          pixelIndices[i] = 0;
        } else {
          const r = rgba[offset];
          const g = rgba[offset + 1];
          const b = rgba[offset + 2];
          const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          pixelIndices[i] = binLookup[bin];
        }
      }

      // LZW raster stream
      const lzwBlocks = this.compressLzw(pixelIndices);
      parts.push(...lzwBlocks);
    }

    // 5. GIF Trailer
    parts.push(new Uint8Array([0x3B]));

    // Compute total length and build Blob
    let totalLen = 0;
    for (const p of parts) totalLen += p.length;
    const outputBuffer = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      outputBuffer.set(p, offset);
      offset += p.length;
    }

    return new Blob([outputBuffer], { type: 'image/gif' });
  }

  /**
   * Encodes 8-bit palette indices into GIF LZW sub-blocks.
   */
  private static compressLzw(pixelIndices: Uint8Array): Uint8Array[] {
    const minCodeSize = 8;
    const clearCode = 1 << minCodeSize; // 256
    const eoiCode = clearCode + 1;       // 257

    const subBlocks: Uint8Array[] = [];
    let curBlock: number[] = [];
    let accum = 0;
    let accumBits = 0;

    const writeBits = (val: number, numBits: number) => {
      accum |= (val << accumBits);
      accumBits += numBits;
      while (accumBits >= 8) {
        curBlock.push(accum & 0xFF);
        accum >>= 8;
        accumBits -= 8;
        if (curBlock.length === 254) {
          subBlocks.push(new Uint8Array([curBlock.length, ...curBlock]));
          curBlock = [];
        }
      }
    };

    const flushBits = () => {
      if (accumBits > 0) {
        curBlock.push(accum & 0xFF);
        accum = 0;
        accumBits = 0;
      }
      if (curBlock.length > 0) {
        subBlocks.push(new Uint8Array([curBlock.length, ...curBlock]));
        curBlock = [];
      }
    };

    let codeSize = minCodeSize + 1; // 9 bits
    let nextCode = eoiCode + 1;
    const table = new Map<number, number>();

    const resetTable = () => {
      table.clear();
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    };

    writeBits(clearCode, codeSize);
    resetTable();

    if (pixelIndices.length > 0) {
      let prefix = pixelIndices[0];
      for (let i = 1; i < pixelIndices.length; i++) {
        const k = pixelIndices[i];
        const key = (prefix << 8) | k;
        if (table.has(key)) {
          prefix = table.get(key)!;
        } else {
          writeBits(prefix, codeSize);
          if (nextCode < 4096) {
            table.set(key, nextCode++);
            if (nextCode > (1 << codeSize) && codeSize < 12) {
              codeSize++;
            }
          } else {
            writeBits(clearCode, codeSize);
            resetTable();
          }
          prefix = k;
        }
      }
      writeBits(prefix, codeSize);
    }

    writeBits(eoiCode, codeSize);
    flushBits();

    return [
      new Uint8Array([minCodeSize]),
      ...subBlocks,
      new Uint8Array([0x00]) // Block terminator
    ];
  }

  /**
   * Generates an optimal adaptive 256-color palette from input pixels using a 15-bit color histogram
   * and median-cut box splitting, accompanied by a 32,768-bin Euclidean distance lookup table.
   */
  private static buildAdaptivePalette(
    rgba: Uint8ClampedArray | Uint8Array,
    hasTransparent: boolean
  ): { palette: [number, number, number][]; binLookup: Uint8Array } {
    const hist = new Uint32Array(32768);
    const sumR = new Float64Array(32768);
    const sumG = new Float64Array(32768);
    const sumB = new Float64Array(32768);

    for (let i = 0; i < rgba.length; i += 4) {
      if (hasTransparent && rgba[i + 3] < 128) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      hist[bin]++;
      sumR[bin] += r;
      sumG[bin] += g;
      sumB[bin] += b;
    }

    const occupied: { bin: number; count: number; r: number; g: number; b: number }[] = [];
    for (let i = 0; i < 32768; i++) {
      if (hist[i] > 0) {
        occupied.push({
          bin: i,
          count: hist[i],
          r: Math.round(sumR[i] / hist[i]),
          g: Math.round(sumG[i] / hist[i]),
          b: Math.round(sumB[i] / hist[i])
        });
      }
    }

    const maxColors = 256;
    const targetCount = hasTransparent ? maxColors - 1 : maxColors;
    const palette: [number, number, number][] = [];
    if (hasTransparent) {
      palette.push([0, 0, 0]); // Index 0 reserved strictly for transparent
    }

    if (occupied.length <= targetCount) {
      for (const b of occupied) {
        palette.push([b.r, b.g, b.b]);
      }
    } else {
      const boxes = [occupied];
      while (boxes.length < targetCount) {
        let bestIdx = -1;
        let maxRange = -1;
        let bestAxis: 'r' | 'g' | 'b' = 'r';

        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i];
          if (box.length <= 1) continue;
          let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
          for (let j = 0; j < box.length; j++) {
            const b = box[j];
            if (b.r < minR) minR = b.r;
            if (b.r > maxR) maxR = b.r;
            if (b.g < minG) minG = b.g;
            if (b.g > maxG) maxG = b.g;
            if (b.b < minB) minB = b.b;
            if (b.b > maxB) maxB = b.b;
          }
          const rangeR = maxR - minR;
          const rangeG = maxG - minG;
          const rangeB = maxB - minB;
          const range = Math.max(rangeR, rangeG, rangeB);
          if (range > maxRange) {
            maxRange = range;
            bestIdx = i;
            bestAxis = rangeR === range ? 'r' : (rangeG === range ? 'g' : 'b');
          }
        }

        if (bestIdx === -1 || maxRange === 0) break;

        const toSplit = boxes.splice(bestIdx, 1)[0];
        toSplit.sort((a, b) => a[bestAxis] - b[bestAxis]);
        const mid = toSplit.length >> 1;
        boxes.push(toSplit.slice(0, mid));
        boxes.push(toSplit.slice(mid));
      }

      for (const box of boxes) {
        let totalW = 0, rSum = 0, gSum = 0, bSum = 0;
        for (const b of box) {
          totalW += b.count;
          rSum += b.r * b.count;
          gSum += b.g * b.count;
          bSum += b.b * b.count;
        }
        palette.push([
          Math.round(rSum / totalW),
          Math.round(gSum / totalW),
          Math.round(bSum / totalW)
        ]);
      }
    }

    while (palette.length < maxColors) {
      palette.push([0, 0, 0]);
    }

    // Build 32,768-bin nearest-neighbor Euclidean distance lookup table
    const binLookup = new Uint8Array(32768);
    const startIndex = hasTransparent ? 1 : 0;
    const numColors = palette.length;

    for (let bin = 0; bin < 32768; bin++) {
      const r = ((bin >> 10) & 31) << 3;
      const g = ((bin >> 5) & 31) << 3;
      const b = (bin & 31) << 3;
      let bestIdx = startIndex;
      let bestDist = Infinity;
      for (let i = startIndex; i < numColors; i++) {
        const c = palette[i];
        const dr = r - c[0];
        const dg = g - c[1];
        const db = b - c[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
          if (dist === 0) break;
        }
      }
      binLookup[bin] = bestIdx;
    }

    return { palette, binLookup };
  }
}

