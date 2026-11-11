// client/apps/tool-file-converter/src/services/image-codecs/tga.codec.ts

/**
 * Pure TypeScript Truevision TGA Decoder & Encoder.
 * Supports uncompressed (types 2, 3) and RLE compressed (types 10, 11) in 24-bit & 32-bit.
 * Zero external dependencies.
 */

export class TgaCodec {
  /**
   * Decodes a TGA ArrayBuffer into RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 18) {
      throw new Error('TGA file is too small to contain a valid header.');
    }

    const idLength = bytes[0];
    const colorMapType = bytes[1];
    const imageType = bytes[2];
    const width = view.getUint16(12, true);
    const height = view.getUint16(14, true);
    const pixelDepth = bytes[16];
    const descriptor = bytes[17];

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid TGA dimensions: ${width}x${height}`);
    }

    // Supported image types: 2 (uncompressed true-color), 3 (uncompressed B&W), 10 (RLE true-color), 11 (RLE B&W)
    const isRle = imageType === 10 || imageType === 11;
    const isTrueColor = imageType === 2 || imageType === 10;
    const isGrayscale = imageType === 3 || imageType === 11;

    if (!isTrueColor && !isGrayscale) {
      throw new Error(`Unsupported TGA image type: ${imageType}`);
    }

    if (pixelDepth !== 24 && pixelDepth !== 32 && pixelDepth !== 8 && pixelDepth !== 16) {
      throw new Error(`Unsupported TGA pixel depth: ${pixelDepth}-bit`);
    }

    const bytesPerPixel = Math.floor(pixelDepth / 8);
    const isTopDown = (descriptor & 0x20) !== 0; // bit 5: 1 = top-down, 0 = bottom-up
    const isRightToLeft = (descriptor & 0x10) !== 0;

    let offset = 18 + idLength;

    // Skip color map if present
    if (colorMapType === 1) {
      const colorMapLength = view.getUint16(5, true);
      const colorMapDepth = bytes[7];
      offset += colorMapLength * Math.ceil(colorMapDepth / 8);
    }

    const totalPixels = width * height;
    const pixelBuffer = new Uint8Array(totalPixels * bytesPerPixel);

    if (isRle) {
      // Decode RLE packet stream
      let pixelCount = 0;
      while (pixelCount < totalPixels && offset < bytes.length) {
        const header = bytes[offset++];
        const count = (header & 0x7F) + 1;

        if ((header & 0x80) !== 0) {
          // RLE run-length packet
          const px = bytes.subarray(offset, offset + bytesPerPixel);
          offset += bytesPerPixel;
          for (let i = 0; i < count && pixelCount < totalPixels; i++) {
            pixelBuffer.set(px, pixelCount * bytesPerPixel);
            pixelCount++;
          }
        } else {
          // Raw packet
          const rawBytesCount = count * bytesPerPixel;
          const rawSlice = bytes.subarray(offset, Math.min(bytes.length, offset + rawBytesCount));
          offset += rawBytesCount;
          pixelBuffer.set(rawSlice, pixelCount * bytesPerPixel);
          pixelCount += count;
        }
      }
    } else {
      // Uncompressed raw pixel stream
      const neededBytes = totalPixels * bytesPerPixel;
      const slice = bytes.subarray(offset, offset + neededBytes);
      pixelBuffer.set(slice);
    }

    // Convert pixelBuffer to standard RGBA (width * height * 4)
    const rgba = new Uint8ClampedArray(totalPixels * 4);

    for (let y = 0; y < height; y++) {
      const targetY = isTopDown ? y : height - 1 - y;
      const rowOffset = targetY * width * 4;

      for (let x = 0; x < width; x++) {
        const targetX = isRightToLeft ? width - 1 - x : x;
        const srcPxIdx = (y * width + x) * bytesPerPixel;
        const dstIdx = rowOffset + targetX * 4;

        if (pixelDepth === 32) {
          rgba[dstIdx] = pixelBuffer[srcPxIdx + 2];     // R
          rgba[dstIdx + 1] = pixelBuffer[srcPxIdx + 1]; // G
          rgba[dstIdx + 2] = pixelBuffer[srcPxIdx];     // B
          rgba[dstIdx + 3] = pixelBuffer[srcPxIdx + 3]; // A
        } else if (pixelDepth === 24) {
          rgba[dstIdx] = pixelBuffer[srcPxIdx + 2];     // R
          rgba[dstIdx + 1] = pixelBuffer[srcPxIdx + 1]; // G
          rgba[dstIdx + 2] = pixelBuffer[srcPxIdx];     // B
          rgba[dstIdx + 3] = 255;                       // A
        } else if (pixelDepth === 8) {
          const gray = pixelBuffer[srcPxIdx];
          rgba[dstIdx] = gray;
          rgba[dstIdx + 1] = gray;
          rgba[dstIdx + 2] = gray;
          rgba[dstIdx + 3] = 255;
        } else if (pixelDepth === 16) {
          // 16-bit 5-5-5-1 or 5-6-5
          const w = pixelBuffer[srcPxIdx] | (pixelBuffer[srcPxIdx + 1] << 8);
          rgba[dstIdx] = Math.round(((w >> 10) & 0x1F) * 255 / 31);
          rgba[dstIdx + 1] = Math.round(((w >> 5) & 0x1F) * 255 / 31);
          rgba[dstIdx + 2] = Math.round((w & 0x1F) * 255 / 31);
          rgba[dstIdx + 3] = (w & 0x8000) ? 255 : 0;
        }
      }
    }

    return { width, height, data: rgba };
  }

  /**
   * Encodes RGBA pixel data into an uncompressed TGA Blob.
   */
  static encode(width: number, height: number, rgba: Uint8ClampedArray, preserveAlpha = true): Blob {
    const bytesPerPixel = preserveAlpha ? 4 : 3;
    const pixelDepth = preserveAlpha ? 32 : 24;
    const pixelBytesCount = width * height * bytesPerPixel;
    const headerSize = 18;
    const footerSize = 26; // TGA 2.0 footer
    const totalSize = headerSize + pixelBytesCount + footerSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. Header (18 bytes)
    bytes[0] = 0; // idLength
    bytes[1] = 0; // colorMapType: none
    bytes[2] = 2; // imageType: uncompressed true-color
    view.setUint16(12, width, true);
    view.setUint16(14, height, true);
    bytes[16] = pixelDepth;
    bytes[17] = (preserveAlpha ? 8 : 0) | 0x20; // top-down orientation (bit 5) + alpha bits

    // 2. Pixel Data (top-down)
    let dst = headerSize;
    for (let i = 0; i < width * height; i++) {
      const src = i * 4;
      bytes[dst++] = rgba[src + 2]; // B
      bytes[dst++] = rgba[src + 1]; // G
      bytes[dst++] = rgba[src];     // R
      if (preserveAlpha) {
        bytes[dst++] = rgba[src + 3]; // A
      }
    }

    // 3. TGA 2.0 Footer (26 bytes: 8 bytes zero + "TRUEVISION-XFILE.\0")
    const footerText = 'TRUEVISION-XFILE.\0';
    const footerOffset = totalSize - 18;
    for (let i = 0; i < footerText.length; i++) {
      bytes[footerOffset + i] = footerText.charCodeAt(i);
    }

    return new Blob([buffer], { type: 'image/x-tga' });
  }
}

