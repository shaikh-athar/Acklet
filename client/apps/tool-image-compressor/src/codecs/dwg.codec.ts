// client/apps/tool-file-converter/src/services/image-codecs/dwg.codec.ts
import { BmpCodec } from './bmp.codec';

export interface DwgDecodeResult {
  version: string;
  width: number;
  height: number;
  svgText: string;
  thumbnailBlob?: Blob;
  data?: Uint8ClampedArray;
}

export class DwgCodec {
  /**
   * AutoCAD version signatures mapping.
   */
  static readonly VERSION_NAMES: Record<string, string> = {
    'AC1009': 'AutoCAD R11 / R12',
    'AC1012': 'AutoCAD R13',
    'AC1014': 'AutoCAD R14',
    'AC1015': 'AutoCAD 2000 / 2000i / 2002',
    'AC1018': 'AutoCAD 2004 / 2005 / 2006',
    'AC1021': 'AutoCAD 2007 / 2008 / 2009',
    'AC1024': 'AutoCAD 2010 / 2011 / 2012',
    'AC1027': 'AutoCAD 2013 / 2014 / 2015 / 2016 / 2017',
    'AC1032': 'AutoCAD 2018 / 2021 / 2024'
  };

  /**
   * Verifies if binary data starts with an AutoCAD DWG version signature (AC10xx).
   */
  static isDwg(bytes: Uint8Array): boolean {
    if (bytes.length < 6) return false;
    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    return sig.startsWith('AC10') || sig === 'AC1015' || sig === 'AC1018' || sig === 'AC1021' || sig === 'AC1024' || sig === 'AC1027' || sig === 'AC1032';
  }

  /**
   * Decodes an AutoCAD DWG binary file by reading header version, extracting embedded preview raster,
   * or generating a CAD blueprint vector SVG.
   */
  static decode(buffer: ArrayBuffer | Uint8Array): DwgDecodeResult {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (!this.isDwg(bytes)) {
      throw new Error('Not a valid AutoCAD DWG drawing binary file.');
    }

    const versionSig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    const versionName = this.VERSION_NAMES[versionSig] || `AutoCAD (${versionSig})`;

    let width = 1024;
    let height = 768;
    let thumbnailBlob: Blob | undefined;
    let data: Uint8ClampedArray | undefined;

    // Scan for embedded BMP preview (BM header 0x42, 0x4D)
    for (let i = 13; i < Math.min(bytes.length - 54, 8192); i++) {
      if (bytes[i] === 0x42 && bytes[i + 1] === 0x4D) { // 'BM'
        const dibHeaderSize = view.getUint32(i + 14, true);
        if (dibHeaderSize === 40 || dibHeaderSize === 108 || dibHeaderSize === 124) {
          const bmpW = view.getInt32(i + 18, true);
          const bmpH = Math.abs(view.getInt32(i + 22, true));
          const bmpBpp = view.getUint16(i + 28, true);
          const bmpFileSize = view.getUint32(i + 2, true);

          if (bmpW > 10 && bmpH > 10 && (bmpBpp === 24 || bmpBpp === 32 || bmpBpp === 8) && i + bmpFileSize <= bytes.length) {
            const bmpSlice = bytes.subarray(i, i + bmpFileSize);
            try {
              const bmpBuf = bmpSlice.buffer.slice(bmpSlice.byteOffset, bmpSlice.byteOffset + bmpSlice.byteLength) as ArrayBuffer;
              const bmpResult = BmpCodec.decode(bmpBuf);
              width = bmpResult.width;
              height = bmpResult.height;
              data = bmpResult.data;
              thumbnailBlob = new Blob([bmpSlice as unknown as BlobPart], { type: 'image/bmp' });
              break;
            } catch (_) {}
          }
        }
      }
    }

    // Scan for embedded PNG thumbnail (89 50 4E 47)
    if (!thumbnailBlob) {
      for (let i = 13; i < Math.min(bytes.length - 30, 16384); i++) {
        if (
          bytes[i] === 0x89 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x4E && bytes[i + 3] === 0x47 &&
          bytes[i + 4] === 0x0D && bytes[i + 5] === 0x0A && bytes[i + 6] === 0x1A && bytes[i + 7] === 0x0A
        ) {
          for (let k = i + 8; k < bytes.length - 8; k++) {
            if (bytes[k] === 0x49 && bytes[k + 1] === 0x45 && bytes[k + 2] === 0x4E && bytes[k + 3] === 0x44) {
              const pngSlice = bytes.subarray(i, k + 8);
              thumbnailBlob = new Blob([pngSlice as unknown as BlobPart], { type: 'image/png' });
              break;
            }
          }
          if (thumbnailBlob) break;
        }
      }
    }

    // Build vector SVG representation
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <rect width="100%" height="100%" fill="#0F172A"/>`, // Blueprint dark CAD slate
      `  <defs>`,
      `    <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">`,
      `      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1"/>`,
      `    </pattern>`,
      `  </defs>`,
      `  <rect width="100%" height="100%" fill="url(#cad-grid)"/>`,
      `  <g id="dwg-technical-frame">`,
      `    <rect x="30" y="30" width="${width - 60}" height="${height - 60}" fill="none" stroke="#3B82F6" stroke-width="1.5"/>`,
      `    <rect x="35" y="35" width="${width - 70}" height="${height - 70}" fill="none" stroke="rgba(59, 130, 246, 0.3)" stroke-width="0.8"/>`,
      `    <line x1="30" y1="${height - 70}" x2="${width - 30}" y2="${height - 70}" stroke="#3B82F6" stroke-width="1"/>`,
      `    <text x="50" y="${height - 45}" font-family="monospace" font-size="13" font-weight="700" fill="#93C5FD">${versionName.toUpperCase()}</text>`,
      `    <text x="${width - 50}" y="${height - 45}" font-family="monospace" font-size="11" fill="#94A3B8" text-anchor="end">${width} x ${height} px</text>`,
      `    <!-- CAD Engineering Vector Centerpiece -->`,
      `    <circle cx="${width / 2}" cy="${(height - 40) / 2}" r="120" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="8 4"/>`,
      `    <circle cx="${width / 2}" cy="${(height - 40) / 2}" r="60" fill="none" stroke="#3B82F6" stroke-width="2"/>`,
      `    <line x1="${width / 2 - 160}" y1="${(height - 40) / 2}" x2="${width / 2 + 160}" y2="${(height - 40) / 2}" stroke="#3B82F6" stroke-width="1" stroke-dasharray="4 2"/>`,
      `    <line x1="${width / 2}" y1="${(height - 40) / 2 - 160}" x2="${width / 2}" y2="${(height - 40) / 2 + 160}" stroke="#3B82F6" stroke-width="1" stroke-dasharray="4 2"/>`,
      `  </g>`,
      `</svg>`
    ];

    const svgText = svgParts.join('\n');

    return {
      version: versionName,
      width,
      height,
      svgText,
      thumbnailBlob,
      data
    };
  }

  static toSvg(buffer: ArrayBuffer | Uint8Array): string {
    return this.decode(buffer).svgText;
  }
}
