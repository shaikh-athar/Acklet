// client/apps/tool-file-converter/src/services/image-codecs/qoi.codec.ts

/**
 * Genuine Quite OK Image (QOI) format encoder and decoder.
 * Implements the official QOI 1.0 specification (https://qoiformat.org/qoi-specification.pdf).
 * 100% browser-safe, pure TypeScript, zero dependencies.
 */
export class QoiCodec {
  private static readonly QOI_MAGIC = 0x716f6966; // 'qoif'
  private static readonly QOI_HEADER_SIZE = 14;
  private static readonly QOI_PADDING_SIZE = 8;
  private static readonly QOI_OP_INDEX = 0x00; // 00xxxxxx
  private static readonly QOI_OP_DIFF = 0x40;  // 01xxxxxx
  private static readonly QOI_OP_LUMA = 0x80;  // 10xxxxxx
  private static readonly QOI_OP_RUN = 0xc0;   // 11xxxxxx
  private static readonly QOI_OP_RGB = 0xfe;   // 11111110
  private static readonly QOI_OP_RGBA = 0xff;  // 11111111

  private static colorHash(r: number, g: number, b: number, a: number): number {
    return (r * 3 + g * 5 + b * 7 + a * 11) % 64;
  }

  /**
   * Decodes a raw binary QOI file into an RGBA pixel array.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    channels: number;
    colorspace: number;
    data: Uint8ClampedArray;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (bytes.length < this.QOI_HEADER_SIZE + this.QOI_PADDING_SIZE) {
      throw new Error('Invalid QOI stream: File is smaller than minimum header size.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint32(0, false);
    if (magic !== this.QOI_MAGIC) {
      throw new Error(`Invalid QOI magic header: Expected 'qoif' (0x716f6966), got 0x${magic.toString(16)}.`);
    }

    const width = view.getUint32(4, false);
    const height = view.getUint32(8, false);
    const channels = bytes[12];
    const colorspace = bytes[13];

    if (width === 0 || height === 0) {
      throw new Error(`Invalid QOI dimensions: ${width}x${height}`);
    }

    const pixelCount = width * height;
    const output = new Uint8ClampedArray(pixelCount * 4);

    // 64-entry running color cache (RGBA)
    const index = new Uint8Array(64 * 4);

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;

    let p = this.QOI_HEADER_SIZE;
    const end = bytes.length - this.QOI_PADDING_SIZE;
    let outIdx = 0;

    let run = 0;

    for (let px = 0; px < pixelCount; px++) {
      if (run > 0) {
        run--;
      } else if (p < end) {
        const b1 = bytes[p++];

        if (b1 === this.QOI_OP_RGB) {
          r = bytes[p++];
          g = bytes[p++];
          b = bytes[p++];
        } else if (b1 === this.QOI_OP_RGBA) {
          r = bytes[p++];
          g = bytes[p++];
          b = bytes[p++];
          a = bytes[p++];
        } else if ((b1 & 0xc0) === this.QOI_OP_INDEX) {
          const idx = (b1 & 0x3f) * 4;
          r = index[idx];
          g = index[idx + 1];
          b = index[idx + 2];
          a = index[idx + 3];
        } else if ((b1 & 0xc0) === this.QOI_OP_DIFF) {
          r = (r + ((b1 >> 4) & 0x03) - 2) & 0xff;
          g = (g + ((b1 >> 2) & 0x03) - 2) & 0xff;
          b = (b + (b1 & 0x03) - 2) & 0xff;
        } else if ((b1 & 0xc0) === this.QOI_OP_LUMA) {
          const b2 = bytes[p++];
          const vg = (b1 & 0x3f) - 32;
          r = (r + vg - 8 + ((b2 >> 4) & 0x0f)) & 0xff;
          g = (g + vg) & 0xff;
          b = (b + vg - 8 + (b2 & 0x0f)) & 0xff;
        } else if ((b1 & 0xc0) === this.QOI_OP_RUN) {
          run = b1 & 0x3f;
        }

        const h = this.colorHash(r, g, b, a) * 4;
        index[h] = r;
        index[h + 1] = g;
        index[h + 2] = b;
        index[h + 3] = a;
      }

      output[outIdx++] = r;
      output[outIdx++] = g;
      output[outIdx++] = b;
      output[outIdx++] = a;
    }

    return { width, height, channels, colorspace, data: output };
  }

  /**
   * Encodes an RGBA pixel array into a compliant QOI binary Blob.
   */
  static encode(
    width: number,
    height: number,
    rgbaData: Uint8ClampedArray | Uint8Array,
    hasAlpha = true
  ): Blob {
    const channels = hasAlpha ? 4 : 3;
    const colorspace = 0; // sRGB
    const pixelCount = width * height;

    // Maximum theoretical QOI file size: 14 header + pixels * 5 + 8 padding
    const maxOutputSize = this.QOI_HEADER_SIZE + pixelCount * 5 + this.QOI_PADDING_SIZE;
    const output = new Uint8Array(maxOutputSize);
    const view = new DataView(output.buffer);

    // 1. Write Header
    view.setUint32(0, this.QOI_MAGIC, false);
    view.setUint32(4, width, false);
    view.setUint32(8, height, false);
    output[12] = channels;
    output[13] = colorspace;

    // 2. Initialize state
    const index = new Uint8Array(64 * 4);
    let p = this.QOI_HEADER_SIZE;

    let prevR = 0;
    let prevG = 0;
    let prevB = 0;
    let prevA = 255;
    let run = 0;

    for (let i = 0; i < pixelCount; i++) {
      const inIdx = i * 4;
      const r = rgbaData[inIdx];
      const g = rgbaData[inIdx + 1];
      const b = rgbaData[inIdx + 2];
      const a = hasAlpha ? rgbaData[inIdx + 3] : 255;

      if (r === prevR && g === prevG && b === prevB && a === prevA) {
        run++;
        if (run === 62 || i === pixelCount - 1) {
          output[p++] = this.QOI_OP_RUN | (run - 1);
          run = 0;
        }
      } else {
        if (run > 0) {
          output[p++] = this.QOI_OP_RUN | (run - 1);
          run = 0;
        }

        const h = this.colorHash(r, g, b, a) * 4;
        if (
          index[h] === r &&
          index[h + 1] === g &&
          index[h + 2] === b &&
          index[h + 3] === a
        ) {
          output[p++] = this.QOI_OP_INDEX | (h / 4);
        } else {
          index[h] = r;
          index[h + 1] = g;
          index[h + 2] = b;
          index[h + 3] = a;

          if (a === prevA) {
            const vr = (r - prevR) | 0;
            const vg = (g - prevG) | 0;
            const vb = (b - prevB) | 0;

            const vg_r = (vr - vg) | 0;
            const vg_b = (vb - vg) | 0;

            if (vr > -3 && vr < 2 && vg > -3 && vg < 2 && vb > -3 && vb < 2) {
              output[p++] = this.QOI_OP_DIFF | ((vr + 2) << 4) | ((vg + 2) << 2) | (vb + 2);
            } else if (vg > -33 && vg < 32 && vg_r > -9 && vg_r < 8 && vg_b > -9 && vg_b < 8) {
              output[p++] = this.QOI_OP_LUMA | (vg + 32);
              output[p++] = ((vg_r + 8) << 4) | (vg_b + 8);
            } else {
              output[p++] = this.QOI_OP_RGB;
              output[p++] = r;
              output[p++] = g;
              output[p++] = b;
            }
          } else {
            output[p++] = this.QOI_OP_RGBA;
            output[p++] = r;
            output[p++] = g;
            output[p++] = b;
            output[p++] = a;
          }
        }
      }

      prevR = r;
      prevG = g;
      prevB = b;
      prevA = a;
    }

    // End-of-stream padding: 7 0x00 bytes followed by 0x01
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 0;
    output[p++] = 1;

    const trimmed = output.subarray(0, p);
    return new Blob([trimmed], { type: 'image/x-qoi' });
  }
}

