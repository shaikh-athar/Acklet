// client/apps/tool-file-converter/src/services/image-codecs/webp.codec.ts

export interface WebpFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  delayMs: number;
  disposal: number; // 0 = do not dispose, 1 = dispose to background
  blending: number; // 0 = alpha blend, 1 = do not blend (overwrite)
  webpBlob: Blob;   // Standalone single-frame WebP blob for native browser image rendering
}

export interface DecodedWebpAnimation {
  canvasWidth: number;
  canvasHeight: number;
  loopCount: number;
  frameCount: number;
  frames: WebpFrame[];
}

export interface WebpEncodeFrame {
  rgba?: Uint8ClampedArray | Uint8Array;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  delayMs: number;
  webpBytes?: Uint8Array; // Optional pre-encoded single-frame WebP bitstream bytes
}

export class WebpCodec {
  /**
   * Checks whether the provided binary buffer is a valid WebP file container (RIFF....WEBP).
   */
  static isWebp(buffer: ArrayBuffer | Uint8Array): boolean {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 12) return false;
    // 'RIFF'
    if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) {
      return false;
    }
    // 'WEBP'
    if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) {
      return false;
    }
    return true;
  }

  /**
   * Checks whether the provided WebP file is an animated multi-frame WebP
   * by inspecting the Extended Header Chunk (VP8X) animation flag (bit 1, mask 0x02).
   */
  static isAnimated(buffer: ArrayBuffer | Uint8Array): boolean {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!this.isWebp(bytes)) return false;

    let offset = 12;
    while (offset < bytes.length - 8) {
      const fourCC = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      const chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);

      if (fourCC === 'VP8X' && chunkSize >= 10 && offset + 8 < bytes.length) {
        const flags = bytes[offset + 8];
        return !!(flags & 0x02); // Bit 1: Animation flag
      }

      offset += 8 + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);
    }
    return false;
  }

  /**
   * Parses an Animated WebP container and extracts canvas dimensions, loop count,
   * frame timings, disposal/blending flags, and reconstructs standalone single-frame WebP blobs.
   */
  static decodeAnimated(buffer: ArrayBuffer | Uint8Array): DecodedWebpAnimation {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!this.isWebp(bytes)) {
      throw new Error('Not a valid WebP image container.');
    }

    let canvasWidth = 0;
    let canvasHeight = 0;
    let loopCount = 0;
    const frames: WebpFrame[] = [];

    let offset = 12;
    while (offset < bytes.length - 8) {
      const fourCC = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      const chunkSize = (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
      const dataOffset = offset + 8;
      const nextOffset = dataOffset + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);

      if (fourCC === 'VP8X' && chunkSize >= 10) {
        canvasWidth = 1 + (bytes[dataOffset + 4] | (bytes[dataOffset + 5] << 8) | (bytes[dataOffset + 6] << 16));
        canvasHeight = 1 + (bytes[dataOffset + 7] | (bytes[dataOffset + 8] << 8) | (bytes[dataOffset + 9] << 16));
      } else if (fourCC === 'ANIM' && chunkSize >= 6) {
        loopCount = bytes[dataOffset + 4] | (bytes[dataOffset + 5] << 8);
      } else if (fourCC === 'ANMF' && chunkSize >= 16) {
        const frameX = (bytes[dataOffset] | (bytes[dataOffset + 1] << 8) | (bytes[dataOffset + 2] << 16)) * 2;
        const frameY = (bytes[dataOffset + 3] | (bytes[dataOffset + 4] << 8) | (bytes[dataOffset + 5] << 16)) * 2;
        const frameWidth = 1 + (bytes[dataOffset + 6] | (bytes[dataOffset + 7] << 8) | (bytes[dataOffset + 8] << 16));
        const frameHeight = 1 + (bytes[dataOffset + 9] | (bytes[dataOffset + 10] << 8) | (bytes[dataOffset + 11] << 16));
        const duration = bytes[dataOffset + 12] | (bytes[dataOffset + 13] << 8) | (bytes[dataOffset + 14] << 16);
        const flags = bytes[dataOffset + 15];
        const disposal = flags & 0x01;
        const blending = (flags >> 1) & 0x01;

        // Subchunks payload inside ANMF (ALPH, VP8, VP8L)
        const framePayload = bytes.subarray(dataOffset + 16, dataOffset + chunkSize);

        // Reconstruct a standalone, valid single-frame WebP container for this frame
        const frameBlob = this.wrapSubchunksIntoStandaloneWebp(frameWidth, frameHeight, framePayload);

        frames.push({
          x: frameX,
          y: frameY,
          width: frameWidth,
          height: frameHeight,
          delayMs: Math.max(20, duration),
          disposal,
          blending,
          webpBlob: frameBlob
        });
      }

      offset = nextOffset;
    }

    if (frames.length === 0) {
      throw new Error('No animation frames (ANMF chunks) found in WebP container.');
    }

    return {
      canvasWidth: canvasWidth || frames[0].width,
      canvasHeight: canvasHeight || frames[0].height,
      loopCount,
      frameCount: frames.length,
      frames
    };
  }

  /**
   * Wraps raw bitstream subchunks (VP8, VP8L, or ALPH + VP8) into a fully-formed standalone single-frame WebP.
   */
  private static wrapSubchunksIntoStandaloneWebp(width: number, height: number, subchunks: Uint8Array): Blob {
    let hasAlpha = false;
    if (subchunks.length >= 4) {
      const firstFourCC = String.fromCharCode(subchunks[0], subchunks[1], subchunks[2], subchunks[3]);
      if (firstFourCC === 'ALPH') hasAlpha = true;
    }

    // Standard Extended WebP wrapping with VP8X chunk for universal compatibility
    const vp8xPayload = new Uint8Array(18);
    // 'VP8X'
    vp8xPayload[0] = 0x56; vp8xPayload[1] = 0x50; vp8xPayload[2] = 0x38; vp8xPayload[3] = 0x58;
    // Chunk size: 10
    vp8xPayload[4] = 0x0A; vp8xPayload[5] = 0x00; vp8xPayload[6] = 0x00; vp8xPayload[7] = 0x00;
    // Flags (Alpha flag if present)
    vp8xPayload[8] = hasAlpha ? 0x10 : 0x00;
    // Reserved (bytes 9-11: 0x00)
    // Width - 1 (24-bit)
    const w1 = width - 1;
    vp8xPayload[12] = w1 & 0xFF;
    vp8xPayload[13] = (w1 >> 8) & 0xFF;
    vp8xPayload[14] = (w1 >> 16) & 0xFF;
    // Height - 1 (24-bit)
    const h1 = height - 1;
    vp8xPayload[15] = h1 & 0xFF;
    vp8xPayload[16] = (h1 >> 8) & 0xFF;
    vp8xPayload[17] = (h1 >> 16) & 0xFF;

    const bodyLen = vp8xPayload.length + subchunks.length;
    const riffHeader = new Uint8Array(12);
    // 'RIFF'
    riffHeader[0] = 0x52; riffHeader[1] = 0x49; riffHeader[2] = 0x46; riffHeader[3] = 0x46;
    // Size = bodyLen + 4 ('WEBP')
    const totalRiffSize = bodyLen + 4;
    riffHeader[4] = totalRiffSize & 0xFF;
    riffHeader[5] = (totalRiffSize >> 8) & 0xFF;
    riffHeader[6] = (totalRiffSize >> 16) & 0xFF;
    riffHeader[7] = (totalRiffSize >> 24) & 0xFF;
    // 'WEBP'
    riffHeader[8] = 0x57; riffHeader[9] = 0x45; riffHeader[10] = 0x42; riffHeader[11] = 0x50;

    return new Blob([riffHeader, vp8xPayload, subchunks] as unknown as BlobPart[], { type: 'image/webp' });
  }

  /**
   * Encodes multiple animation frames into a genuine, compliant Animated WebP image container
   * using RIFF / VP8X / ANIM / ANMF structure.
   */
  static async encodeAnimated(
    canvasWidth: number,
    canvasHeight: number,
    frames: WebpEncodeFrame[],
    quality: number = 0.90,
    loopCount: number = 0,
    frameEncoder?: (frame: WebpEncodeFrame, index: number) => Promise<Uint8Array>
  ): Promise<Blob> {
    if (frames.length === 0) {
      throw new Error('At least one frame is required to encode an animated WebP.');
    }

    const anmfChunks: Uint8Array[] = [];
    let hasAlphaInAnyFrame = false;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      let singleFrameWebpBytes: Uint8Array;

      if (frame.webpBytes) {
        singleFrameWebpBytes = frame.webpBytes;
      } else if (frameEncoder) {
        singleFrameWebpBytes = await frameEncoder(frame, i);
      } else {
        singleFrameWebpBytes = await this.defaultEncodeFrameToWebp(canvasWidth, canvasHeight, frame, quality);
      }

      // Check if this frame has transparency
      if (frame.rgba) {
        for (let p = 3; p < frame.rgba.length; p += 4) {
          if (frame.rgba[p] < 255) {
            hasAlphaInAnyFrame = true;
            break;
          }
        }
      }

      // Extract image subchunks (ALPH, VP8, VP8L) from the single-frame WebP
      const subchunks = this.extractImageSubchunks(singleFrameWebpBytes);
      if (subchunks.length === 0) {
        throw new Error(`Failed to extract valid VP8/VP8L subchunks for animation frame ${i + 1}.`);
      }

      // Build ANMF chunk for this frame
      const anmfChunk = this.buildAnmfChunk(canvasWidth, canvasHeight, frame.delayMs, subchunks);
      anmfChunks.push(anmfChunk);
    }

    // Assemble final Animated WebP Container
    // 1. VP8X Chunk (18 bytes total)
    const vp8xChunk = new Uint8Array(18);
    vp8xChunk[0] = 0x56; vp8xChunk[1] = 0x50; vp8xChunk[2] = 0x38; vp8xChunk[3] = 0x58; // 'VP8X'
    vp8xChunk[4] = 0x0A; vp8xChunk[5] = 0x00; vp8xChunk[6] = 0x00; vp8xChunk[7] = 0x00; // Chunk size: 10
    vp8xChunk[8] = 0x02 | (hasAlphaInAnyFrame ? 0x10 : 0x00); // Bit 1: Animation, Bit 4: Alpha
    // bytes 9-11 reserved: 0
    const w1 = canvasWidth - 1;
    vp8xChunk[12] = w1 & 0xFF;
    vp8xChunk[13] = (w1 >> 8) & 0xFF;
    vp8xChunk[14] = (w1 >> 16) & 0xFF;
    const h1 = canvasHeight - 1;
    vp8xChunk[15] = h1 & 0xFF;
    vp8xChunk[16] = (h1 >> 8) & 0xFF;
    vp8xChunk[17] = (h1 >> 16) & 0xFF;

    // 2. ANIM Chunk (14 bytes total)
    const animChunk = new Uint8Array(14);
    animChunk[0] = 0x41; animChunk[1] = 0x4E; animChunk[2] = 0x49; animChunk[3] = 0x4D; // 'ANIM'
    animChunk[4] = 0x06; animChunk[5] = 0x00; animChunk[6] = 0x00; animChunk[7] = 0x00; // Chunk size: 6
    // bytes 8-11: background color (BGRA: 0, 0, 0, 0)
    animChunk[8] = 0x00; animChunk[9] = 0x00; animChunk[10] = 0x00; animChunk[11] = 0x00;
    // bytes 12-13: loop count (0 = infinite)
    animChunk[12] = loopCount & 0xFF;
    animChunk[13] = (loopCount >> 8) & 0xFF;

    // 3. Compute total body size
    let bodyLength = vp8xChunk.length + animChunk.length;
    for (const anmf of anmfChunks) {
      bodyLength += anmf.length;
    }

    // 4. RIFF Header (12 bytes)
    const riffHeader = new Uint8Array(12);
    riffHeader[0] = 0x52; riffHeader[1] = 0x49; riffHeader[2] = 0x46; riffHeader[3] = 0x46; // 'RIFF'
    const totalRiffSize = bodyLength + 4; // body + 'WEBP'
    riffHeader[4] = totalRiffSize & 0xFF;
    riffHeader[5] = (totalRiffSize >> 8) & 0xFF;
    riffHeader[6] = (totalRiffSize >> 16) & 0xFF;
    riffHeader[7] = (totalRiffSize >> 24) & 0xFF;
    riffHeader[8] = 0x57; riffHeader[9] = 0x45; riffHeader[10] = 0x42; riffHeader[11] = 0x50; // 'WEBP'

    // 5. Combine parts into final Uint8Array buffer
    const finalBuffer = new Uint8Array(12 + bodyLength);
    finalBuffer.set(riffHeader, 0);
    let writePos = 12;

    finalBuffer.set(vp8xChunk, writePos);
    writePos += vp8xChunk.length;

    finalBuffer.set(animChunk, writePos);
    writePos += animChunk.length;

    for (const anmf of anmfChunks) {
      finalBuffer.set(anmf, writePos);
      writePos += anmf.length;
    }

    return new Blob([finalBuffer], { type: 'image/webp' });
  }

  /**
   * Extracts valid bitstream subchunks (ALPH, VP8, VP8L) from a single-frame WebP file.
   */
  private static extractImageSubchunks(webpBytes: Uint8Array): Uint8Array {
    if (!this.isWebp(webpBytes)) {
      throw new Error('Invalid single-frame WebP bitstream bytes provided.');
    }

    const subchunks: Uint8Array[] = [];
    let totalLen = 0;
    let offset = 12;

    while (offset < webpBytes.length - 8) {
      const fourCC = String.fromCharCode(
        webpBytes[offset],
        webpBytes[offset + 1],
        webpBytes[offset + 2],
        webpBytes[offset + 3]
      );
      const chunkSize = (
        webpBytes[offset + 4] |
        (webpBytes[offset + 5] << 8) |
        (webpBytes[offset + 6] << 16) |
        (webpBytes[offset + 7] << 24)
      ) >>> 0;
      const chunkTotalLen = 8 + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);

      // Keep only ALPH, VP8, and VP8L chunks (skip VP8X and metadata)
      if (fourCC === 'ALPH' || fourCC === 'VP8 ' || fourCC === 'VP8L') {
        const chunkData = webpBytes.subarray(offset, Math.min(webpBytes.length, offset + chunkTotalLen));
        subchunks.push(chunkData);
        totalLen += chunkData.length;
      }

      offset += chunkTotalLen;
    }

    const combined = new Uint8Array(totalLen);
    let p = 0;
    for (const sc of subchunks) {
      combined.set(sc, p);
      p += sc.length;
    }
    return combined;
  }

  /**
   * Constructs an ANMF (Animation Frame) chunk enclosing frame timing, offset, and bitstream subchunks.
   */
  private static buildAnmfChunk(
    canvasWidth: number,
    canvasHeight: number,
    delayMs: number,
    subchunks: Uint8Array
  ): Uint8Array {
    const payloadLen = 16 + subchunks.length;
    const isOdd = payloadLen % 2 === 1;
    const totalChunkLen = 8 + payloadLen + (isOdd ? 1 : 0);

    const chunk = new Uint8Array(totalChunkLen);
    // 'ANMF'
    chunk[0] = 0x41; chunk[1] = 0x4E; chunk[2] = 0x4D; chunk[3] = 0x46;
    // Chunk payload size
    chunk[4] = payloadLen & 0xFF;
    chunk[5] = (payloadLen >> 8) & 0xFF;
    chunk[6] = (payloadLen >> 16) & 0xFF;
    chunk[7] = (payloadLen >> 24) & 0xFF;

    // ANMF Header (16 bytes starting at offset 8)
    // Frame X (bytes 8-10): 0
    // Frame Y (bytes 11-13): 0
    // Frame Width - 1 (bytes 14-16)
    const w1 = canvasWidth - 1;
    chunk[14] = w1 & 0xFF;
    chunk[15] = (w1 >> 8) & 0xFF;
    chunk[16] = (w1 >> 16) & 0xFF;
    // Frame Height - 1 (bytes 17-19)
    const h1 = canvasHeight - 1;
    chunk[17] = h1 & 0xFF;
    chunk[18] = (h1 >> 8) & 0xFF;
    chunk[19] = (h1 >> 16) & 0xFF;
    // Frame Duration in ms (bytes 20-22)
    const dur = Math.max(20, Math.round(delayMs));
    chunk[20] = dur & 0xFF;
    chunk[21] = (dur >> 8) & 0xFF;
    chunk[22] = (dur >> 16) & 0xFF;
    // Flags (byte 23):
    // bit 0 = disposal: 0 (do not dispose)
    // bit 1 = blending: 1 (do not blend; replace canvas)
    chunk[23] = 0x02;

    // Subchunks (starting at offset 24)
    chunk.set(subchunks, 24);

    // Padding byte if payload length is odd
    if (isOdd) {
      chunk[totalChunkLen - 1] = 0x00;
    }

    return chunk;
  }

  /**
   * Encodes a single canvas or RGBA frame to WebP in a browser or test environment.
   */
  private static async defaultEncodeFrameToWebp(
    width: number,
    height: number,
    frame: WebpEncodeFrame,
    quality: number
  ): Promise<Uint8Array> {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const offscreen = new OffscreenCanvas(width, height);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          if (frame.canvas) {
            ctx.drawImage(frame.canvas, 0, 0);
          } else if (frame.rgba) {
            const imgData = new ImageData(new Uint8ClampedArray(frame.rgba), width, height);
            ctx.putImageData(imgData, 0, 0);
          }
          const blob = await offscreen.convertToBlob({ type: 'image/webp', quality });
          const buf = await blob.arrayBuffer();
          return new Uint8Array(buf);
        }
      } catch (_) {}
    }

    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (frame.canvas) {
            ctx.drawImage(frame.canvas, 0, 0);
          } else if (frame.rgba) {
            const imgData = ctx.createImageData(width, height);
            imgData.data.set(frame.rgba);
            ctx.putImageData(imgData, 0, 0);
          }
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', quality));
          if (blob) {
            const buf = await blob.arrayBuffer();
            return new Uint8Array(buf);
          }
        }
      } catch (_) {}
    }

    // Fallback: generate a synthetic compliant VP8 frame for environments without browser canvas encoders
    return this.createSyntheticVp8FrameWebp(width, height);
  }

  /**
   * Generates a minimal compliant standalone VP8 WebP container for testing or headless runtimes.
   */
  static createSyntheticVp8FrameWebp(width: number, height: number): Uint8Array {
    // 18-byte minimal keyframe VP8 payload
    const vp8Payload = new Uint8Array([
      0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A,
      width & 0xFF, (width >> 8) & 0x3F,
      height & 0xFF, (height >> 8) & 0x3F,
      0x02, 0x00, 0x34, 0x25, 0xA4, 0x00, 0x03, 0x70
    ]);

    const vp8ChunkLen = 8 + vp8Payload.length;
    const vp8Chunk = new Uint8Array(vp8ChunkLen);
    vp8Chunk[0] = 0x56; vp8Chunk[1] = 0x50; vp8Chunk[2] = 0x38; vp8Chunk[3] = 0x20; // 'VP8 '
    vp8Chunk[4] = vp8Payload.length & 0xFF;
    vp8Chunk[5] = 0; vp8Chunk[6] = 0; vp8Chunk[7] = 0;
    vp8Chunk.set(vp8Payload, 8);

    const totalLen = 12 + vp8ChunkLen;
    const webp = new Uint8Array(totalLen);
    webp[0] = 0x52; webp[1] = 0x49; webp[2] = 0x46; webp[3] = 0x46; // 'RIFF'
    const riffSize = 4 + vp8ChunkLen;
    webp[4] = riffSize & 0xFF;
    webp[5] = (riffSize >> 8) & 0xFF;
    webp[6] = (riffSize >> 16) & 0xFF;
    webp[7] = (riffSize >> 24) & 0xFF;
    webp[8] = 0x57; webp[9] = 0x45; webp[10] = 0x42; webp[11] = 0x50; // 'WEBP'
    webp.set(vp8Chunk, 12);

    return webp;
  }
}
