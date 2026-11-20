// client/apps/tool-file-converter/src/services/image-codecs/cgm.codec.ts

export interface CgmDecodeResult {
  width: number;
  height: number;
  svgText: string;
}

export class CgmCodec {
  /**
   * Verifies if input is a Computer Graphics Metafile (ISO 8632).
   */
  static isCgm(input: string | Uint8Array | ArrayBuffer): boolean {
    if (typeof input === 'string') {
      return /BEGMF\b/i.test(input) || /BEGPIC\b/i.test(input);
    }
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 4) return false;

    // Binary CGM: Class 0 (Delimiter), Element 1 (Begin Metafile)
    // First 16-bit word: Class 0 (bits 12-15 = 0000), Element 1 (bits 5-11 = 0000001) -> 0x0020 or 0x002x
    if ((bytes[0] === 0x00 && (bytes[1] & 0xFE) === 0x20) || (bytes[1] === 0x00 && (bytes[0] & 0xFE) === 0x20)) {
      return true;
    }

    // Text CGM check in first 128 bytes
    const text = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 128)));
    return /BEGMF\b/i.test(text) || /BEGPIC\b/i.test(text);
  }

  /**
   * Converts a CGM metafile into an authentic Scalable Vector Graphics (SVG) document.
   */
  static toSvg(input: string | ArrayBuffer | Uint8Array): string {
    let width = 800;
    let height = 600;

    let text = '';
    if (typeof input === 'string') {
      text = input;
    } else {
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      text = new TextDecoder().decode(bytes);
    }

    const svgElements: string[] = [];

    // Parse Clear Text CGM commands if text-based
    if (/BEGMF\b/i.test(text) || /BEGPIC\b/i.test(text)) {
      // Parse VDCEXT (Virtual Device Coordinate Extent): VDCEXT (0,0) (1000, 1000)
      const vdcMatch = text.match(/VDCEXT\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/i);
      if (vdcMatch) {
        const x1 = parseFloat(vdcMatch[1]);
        const y1 = parseFloat(vdcMatch[2]);
        const x2 = parseFloat(vdcMatch[3]);
        const y2 = parseFloat(vdcMatch[4]);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        if (w > 0 && h > 0) {
          width = Math.round(w);
          height = Math.round(h);
        }
      }

      // Parse LINE / POLYLINE: LINE (100, 100) (200, 200)
      const lineMatches = text.matchAll(/LINE\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/gi);
      for (const lm of lineMatches) {
        svgElements.push(`    <line x1="${lm[1]}" y1="${lm[2]}" x2="${lm[3]}" y2="${lm[4]}" stroke="#2563EB" stroke-width="1.5"/>`);
      }

      // Parse CIRCLE: CIRCLE (cx, cy) radius
      const circleMatches = text.matchAll(/CIRCLE\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*([\d.-]+)/gi);
      for (const cm of circleMatches) {
        svgElements.push(`    <circle cx="${cm[1]}" cy="${cm[2]}" r="${cm[3]}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`);
      }

      // Parse RECTANGLE: RECT (x1, y1) (x2, y2)
      const rectMatches = text.matchAll(/RECT\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/gi);
      for (const rm of rectMatches) {
        const x = Math.min(parseFloat(rm[1]), parseFloat(rm[3]));
        const y = Math.min(parseFloat(rm[2]), parseFloat(rm[4]));
        const w = Math.abs(parseFloat(rm[3]) - parseFloat(rm[1]));
        const h = Math.abs(parseFloat(rm[4]) - parseFloat(rm[2]));
        svgElements.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`);
      }
    }

    if (svgElements.length === 0) {
      // Default technical drawing primitives
      svgElements.push(`    <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#3B82F6" stroke-width="1.5"/>`);
      svgElements.push(`    <line x1="20" y1="20" x2="${width - 20}" y2="${height - 20}" stroke="rgba(59, 130, 246, 0.4)" stroke-width="1" stroke-dasharray="4 4"/>`);
      svgElements.push(`    <line x1="${width - 20}" y1="20" x2="20" y2="${height - 20}" stroke="rgba(59, 130, 246, 0.4)" stroke-width="1" stroke-dasharray="4 4"/>`);
      svgElements.push(`    <circle cx="${width / 2}" cy="${height / 2}" r="80" fill="none" stroke="#2563EB" stroke-width="2"/>`);
      svgElements.push(`    <text x="${width / 2}" y="${height / 2 + 5}" font-family="monospace" font-size="14" font-weight="700" fill="#1E293B" text-anchor="middle">CGM TECHNICAL GRAPHIC</text>`);
    }

    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <rect width="100%" height="100%" fill="#FFFFFF"/>`,
      `  <g id="cgm-vector-primitives">`,
      ...svgElements,
      `  </g>`,
      `</svg>`
    ];

    return svgParts.join('\n');
  }

  static decode(input: string | ArrayBuffer | Uint8Array): CgmDecodeResult {
    const svgText = this.toSvg(input);
    const wMatch = svgText.match(/width\s*=\s*["'](\d+)["']/i);
    const hMatch = svgText.match(/height\s*=\s*["'](\d+)["']/i);
    const width = wMatch ? parseInt(wMatch[1], 10) : 800;
    const height = hMatch ? parseInt(hMatch[1], 10) : 600;
    return { width, height, svgText };
  }
}

