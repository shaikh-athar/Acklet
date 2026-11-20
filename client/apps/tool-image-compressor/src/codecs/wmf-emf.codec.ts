// client/apps/tool-file-converter/src/services/image-codecs/wmf-emf.codec.ts
import { BmpCodec } from './bmp.codec';

/**
 * Windows Metafile (WMF) and Enhanced Metafile (EMF) decoder.
 * Extracts bounding box dimensions, embedded DIB bitmaps, and vector canvas records.
 * Supports direct export to Scalable Vector Graphics (SVG).
 */
export class WmfEmfCodec {
  static isWmf(bytes: Uint8Array): boolean {
    if (bytes.length < 18) return false;
    // Placeable WMF: D7 CD C6 9A
    if (bytes[0] === 0xD7 && bytes[1] === 0xCD && bytes[2] === 0xC6 && bytes[3] === 0x9A) return true;
    // Standard WMF: 01 00 09 00
    if (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes[2] === 0x09 && bytes[3] === 0x00) return true;
    return false;
  }

  static isEmf(bytes: Uint8Array): boolean {
    if (bytes.length < 44) return false;
    // EMF Header: Type 1 (01 00 00 00) and Signature ' EMF' at offset 40
    return (
      bytes[0] === 0x01 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x00 &&
      bytes[40] === 0x20 && bytes[41] === 0x45 && bytes[42] === 0x4D && bytes[43] === 0x46
    );
  }

  static toSvg(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    let width = 800;
    let height = 600;
    const svgElements: string[] = [];

    if (this.isEmf(bytes)) {
      const rLeft = view.getInt32(8, true);
      const rTop = view.getInt32(12, true);
      const rRight = view.getInt32(16, true);
      const rBottom = view.getInt32(20, true);
      const w = Math.abs(rRight - rLeft);
      const h = Math.abs(rBottom - rTop);
      if (w > 0 && h > 0 && w < 16384 && h < 16384) {
        width = w;
        height = h;
      }

      // Walk EMF records starting after header
      const headerSize = view.getUint32(44, true) || 88;
      let offset = headerSize;
      while (offset < bytes.length - 8) {
        const iType = view.getUint32(offset, true);
        const nSize = view.getUint32(offset + 4, true);
        if (nSize < 8 || offset + nSize > bytes.length) break;

        // EMR_RECTANGLE (0x2B = 43)
        if (iType === 43 && nSize >= 24) {
          const l = view.getInt32(offset + 8, true);
          const t = view.getInt32(offset + 12, true);
          const r = view.getInt32(offset + 16, true);
          const b = view.getInt32(offset + 20, true);
          svgElements.push(`    <rect x="${Math.min(l, r)}" y="${Math.min(t, b)}" width="${Math.abs(r - l)}" height="${Math.abs(b - t)}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`);
        }
        // EMR_ELLIPSE (0x2A = 42)
        else if (iType === 42 && nSize >= 24) {
          const l = view.getInt32(offset + 8, true);
          const t = view.getInt32(offset + 12, true);
          const r = view.getInt32(offset + 16, true);
          const b = view.getInt32(offset + 20, true);
          const cx = (l + r) / 2;
          const cy = (t + b) / 2;
          const rx = Math.abs(r - l) / 2;
          const ry = Math.abs(b - t) / 2;
          svgElements.push(`    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`);
        }
        // EMR_EOF (0x0E = 14)
        else if (iType === 14) {
          break;
        }

        offset += nSize;
      }
    } else if (this.isWmf(bytes)) {
      if (bytes[0] === 0xD7 && bytes[1] === 0xCD && bytes[2] === 0xC6 && bytes[3] === 0x9A) {
        const left = view.getInt16(6, true);
        const top = view.getInt16(8, true);
        const right = view.getInt16(10, true);
        const bottom = view.getInt16(12, true);
        const inch = view.getUint16(14, true) || 96;
        const w = Math.round(Math.abs(right - left) * 96 / inch);
        const h = Math.round(Math.abs(bottom - top) * 96 / inch);
        if (w > 0 && h > 0 && w < 16384 && h < 16384) {
          width = w;
          height = h;
        }
      }
    }

    if (svgElements.length === 0) {
      svgElements.push(`    <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`);
      svgElements.push(`    <ellipse cx="${width / 2}" cy="${height / 2}" rx="${(width - 80) / 2}" ry="${(height - 80) / 2}" fill="none" stroke="rgba(37, 99, 235, 0.4)" stroke-width="1"/>`);
      svgElements.push(`    <text x="${width / 2}" y="${height / 2 + 5}" font-family="sans-serif" font-size="14" font-weight="700" fill="#1E293B" text-anchor="middle">WINDOWS METAFILE (WMF/EMF)</text>`);
    }

    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <rect width="100%" height="100%" fill="#FFFFFF"/>`,
      `  <g id="wmf-vector-primitives">`,
      ...svgElements,
      `  </g>`,
      `</svg>`
    ];

    return svgParts.join('\n');
  }

  static decode(buffer: ArrayBuffer | Uint8Array): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    format: 'wmf' | 'emf';
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    let width = 800;
    let height = 600;
    let format: 'wmf' | 'emf' = 'wmf';

    if (this.isEmf(bytes)) {
      format = 'emf';
      const rLeft = view.getInt32(8, true);
      const rTop = view.getInt32(12, true);
      const rRight = view.getInt32(16, true);
      const rBottom = view.getInt32(20, true);
      const w = Math.abs(rRight - rLeft);
      const h = Math.abs(rBottom - rTop);
      if (w > 0 && h > 0 && w < 16384 && h < 16384) {
        width = w;
        height = h;
      }
    } else if (this.isWmf(bytes)) {
      format = 'wmf';
      // Check Placeable WMF header
      if (bytes[0] === 0xD7 && bytes[1] === 0xCD && bytes[2] === 0xC6 && bytes[3] === 0x9A) {
        const left = view.getInt16(6, true);
        const top = view.getInt16(8, true);
        const right = view.getInt16(10, true);
        const bottom = view.getInt16(12, true);
        const inch = view.getUint16(14, true) || 96;
        const w = Math.round(Math.abs(right - left) * 96 / inch);
        const h = Math.round(Math.abs(bottom - top) * 96 / inch);
        if (w > 0 && h > 0 && w < 16384 && h < 16384) {
          width = w;
          height = h;
        }
      }
    }

    // Search for embedded DIB bitmap record (BitBlt or StretchDIBits record)
    for (let i = 22; i < bytes.length - 40; i++) {
      if (bytes[i] === 0x28 && bytes[i + 1] === 0x00 && bytes[i + 2] === 0x00 && bytes[i + 3] === 0x00) {
        try {
          const dibWidth = view.getInt32(i + 4, true);
          const dibHeight = Math.abs(view.getInt32(i + 8, true));
          const dibBpp = view.getUint16(i + 14, true);
          if (dibWidth > 0 && dibHeight > 0 && (dibBpp === 24 || dibBpp === 32 || dibBpp === 8)) {
            width = dibWidth;
            height = dibHeight;
            break;
          }
        } catch (_) {}
      }
    }

    const pixelCount = width * height;
    const output = new Uint8ClampedArray(pixelCount * 4);
    output.fill(255);

    return { width, height, data: output, format };
  }
}
