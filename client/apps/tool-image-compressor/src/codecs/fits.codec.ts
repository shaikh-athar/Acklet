// client/apps/tool-file-converter/src/services/image-codecs/fits.codec.ts

/**
 * Pure TypeScript FITS (Flexible Image Transport System) Astronomical & Scientific Image Decoder.
 * Supports BITPIX 8, 16, 32, -32 (Float32), -64 (Float64), with BSCALE, BZERO,
 * and adaptive min-max contrast auto-stretch to standard sRGB.
 * Zero external dependencies.
 */

export class FitsCodec {
  /**
   * Decodes a FITS ArrayBuffer into RGBA ImageData.
   */
  static decode(buffer: ArrayBuffer): { width: number; height: number; data: Uint8ClampedArray } {
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 2880) {
      throw new Error('FITS file too small to contain a header block.');
    }

    const textDecoder = new TextDecoder('ascii');
    let offset = 0;
    const headerCards: string[] = [];
    let foundEnd = false;

    // 1. Read 2880-byte header blocks until 'END'
    while (offset + 2880 <= bytes.length && !foundEnd) {
      const blockStr = textDecoder.decode(bytes.subarray(offset, offset + 2880));
      for (let i = 0; i < 36; i++) {
        const card = blockStr.substring(i * 80, (i + 1) * 80);
        const keyword = card.substring(0, 8).trim();
        if (keyword === 'END') {
          foundEnd = true;
          break;
        }
        headerCards.push(card);
      }
      offset += 2880;
    }

    if (!foundEnd) {
      throw new Error('FITS header missing "END" keyword card.');
    }

    // 2. Parse key header values
    let bitpix = 16;
    let naxis = 2;
    let naxis1 = 0;
    let naxis2 = 0;
    let naxis3 = 1;
    let bscale = 1.0;
    let bzero = 0.0;

    for (const card of headerCards) {
      const keyword = card.substring(0, 8).trim();
      const eqIdx = card.indexOf('=');
      if (eqIdx !== -1) {
        let valStr = card.substring(eqIdx + 1);
        const slashIdx = valStr.indexOf('/');
        if (slashIdx !== -1) valStr = valStr.substring(0, slashIdx);
        valStr = valStr.trim().replace(/^'|'$/g, '');

        if (keyword === 'BITPIX') bitpix = parseInt(valStr, 10);
        else if (keyword === 'NAXIS') naxis = parseInt(valStr, 10);
        else if (keyword === 'NAXIS1') naxis1 = parseInt(valStr, 10);
        else if (keyword === 'NAXIS2') naxis2 = parseInt(valStr, 10);
        else if (keyword === 'NAXIS3') naxis3 = parseInt(valStr, 10);
        else if (keyword === 'BSCALE') bscale = parseFloat(valStr);
        else if (keyword === 'BZERO') bzero = parseFloat(valStr);
      }
    }

    if (naxis1 <= 0 || naxis2 <= 0) {
      throw new Error(`Invalid FITS dimensions: NAXIS1=${naxis1}, NAXIS2=${naxis2}`);
    }

    const width = naxis1;
    const height = naxis2;
    const totalPixels = width * height;
    const view = new DataView(buffer, offset);

    // 3. Extract raw values into Float64Array
    const rawValues = new Float64Array(totalPixels);
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < totalPixels; i++) {
      let raw = 0;
      if (bitpix === 8) {
        raw = view.getUint8(i);
      } else if (bitpix === 16) {
        raw = view.getInt16(i * 2, false); // Big-Endian
      } else if (bitpix === 32) {
        raw = view.getInt32(i * 4, false);
      } else if (bitpix === -32) {
        raw = view.getFloat32(i * 4, false);
      } else if (bitpix === -64) {
        raw = view.getFloat64(i * 8, false);
      }

      const physical = bzero + bscale * raw;
      if (!isNaN(physical) && isFinite(physical)) {
        rawValues[i] = physical;
        if (physical < minVal) minVal = physical;
        if (physical > maxVal) maxVal = physical;
      } else {
        rawValues[i] = 0;
      }
    }

    if (minVal >= maxVal) {
      minVal = 0;
      maxVal = 1;
    }

    const range = maxVal - minVal;
    const rgba = new Uint8ClampedArray(totalPixels * 4);

    // 4. Map to 8-bit sRGB (FITS row 0 is at bottom, so flip vertically)
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      const srcRowOffset = srcY * width;
      const dstRowOffset = y * width * 4;

      for (let x = 0; x < width; x++) {
        const val = rawValues[srcRowOffset + x];
        const normalized = Math.max(0, Math.min(1, (val - minVal) / range));
        const s = Math.round(normalized * 255);

        const dst = dstRowOffset + x * 4;
        rgba[dst] = s;
        rgba[dst + 1] = s;
        rgba[dst + 2] = s;
        rgba[dst + 3] = 255;
      }
    }

    return { width, height, data: rgba };
  }
}

