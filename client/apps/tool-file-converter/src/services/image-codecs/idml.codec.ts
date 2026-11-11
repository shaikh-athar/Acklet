// client/apps/tool-file-converter/src/services/image-codecs/idml.codec.ts

export interface IdmlSpreadBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  text?: string;
}

export interface IdmlDecodeResult {
  width: number;
  height: number;
  svgText: string;
  boxes: IdmlSpreadBox[];
}

export class IdmlCodec {
  /**
   * Verifies if binary data is an Adobe InDesign IDML ZIP package.
   */
  static isIdml(bytes: Uint8Array): boolean {
    if (bytes.length < 30) return false;
    // Check ZIP header: PK\x03\x04
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return false;
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 2048)));
    return text.includes('idml') || text.includes('designmap') || text.includes('Spread_');
  }

  /**
   * Decodes an InDesign IDML package by extracting page geometry, text frames, and vector shapes.
   */
  static async decode(buffer: ArrayBuffer | Uint8Array): Promise<IdmlDecodeResult> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (!this.isIdml(bytes)) {
      throw new Error('Not a valid Adobe InDesign Markup Language (.idml) package.');
    }

    let pageWidth = 612; // Standard Letter 8.5" x 72dpi
    let pageHeight = 792; // 11" x 72dpi
    const boxes: IdmlSpreadBox[] = [];

    // Walk ZIP local file headers to find Spreads/Spread_*.xml and designmap.xml
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
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
        const fileName = new TextDecoder().decode(nameBytes);
        const dataOffset = offset + 30 + nameLen + extraLen;

        if (fileName.includes('Spread_') && fileName.endsWith('.xml')) {
          const rawSlice = bytes.subarray(dataOffset, dataOffset + compSize);
          let xml = '';
          if (compression === 0) {
            xml = new TextDecoder().decode(rawSlice);
          } else if (compression === 8) {
            try {
              const decomp = await this.decompressDeflate(rawSlice);
              xml = new TextDecoder().decode(decomp);
            } catch (_) {}
          }

          if (xml) {
            // Parse Page GeometricBounds="top left bottom right"
            const pageMatch = xml.match(/<Page[^>]*\bGeometricBounds\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
            if (pageMatch) {
              const top = parseFloat(pageMatch[1]);
              const left = parseFloat(pageMatch[2]);
              const bottom = parseFloat(pageMatch[3]);
              const right = parseFloat(pageMatch[4]);
              const w = Math.abs(right - left);
              const h = Math.abs(bottom - top);
              if (w > 0 && h > 0) {
                pageWidth = Math.round(w);
                pageHeight = Math.round(h);
              }
            }

            // Parse Rectangles & TextFrames
            const rectMatches = xml.matchAll(/<(?:Rectangle|TextFrame)[^>]*\bGeometricBounds\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["'][^>]*>/gi);
            for (const rm of rectMatches) {
              const top = parseFloat(rm[1]);
              const left = parseFloat(rm[2]);
              const bottom = parseFloat(rm[3]);
              const right = parseFloat(rm[4]);
              const w = Math.abs(right - left);
              const h = Math.abs(bottom - top);
              if (w > 0 && h > 0) {
                boxes.push({
                  x: Math.round(Math.min(left, right)),
                  y: Math.round(Math.min(top, bottom)),
                  width: Math.round(w),
                  height: Math.round(h),
                  strokeColor: '#3B82F6',
                  strokeWidth: 1
                });
              }
            }
          }
        }

        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }

    // Build authentic SVG markup
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}" height="${pageHeight}">`,
      `  <rect width="100%" height="100%" fill="#FFFFFF"/>`,
      `  <g id="idml-spread-elements">`
    ];

    if (boxes.length === 0) {
      // Default placeholder document frame
      svgParts.push(`    <rect x="36" y="36" width="${pageWidth - 72}" height="${pageHeight - 72}" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4 2"/>`);
      svgParts.push(`    <text x="${pageWidth / 2}" y="${pageHeight / 2}" font-family="sans-serif" font-size="14" font-weight="600" fill="#64748B" text-anchor="middle">Adobe InDesign Document Spread</text>`);
    } else {
      for (const box of boxes) {
        svgParts.push(`    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${box.fillColor || 'rgba(59, 130, 246, 0.04)'}" stroke="${box.strokeColor || '#94A3B8'}" stroke-width="${box.strokeWidth || 1}"/>`);
      }
    }

    svgParts.push(`  </g>`);
    svgParts.push(`</svg>`);

    const svgText = svgParts.join('\n');

    return {
      width: pageWidth,
      height: pageHeight,
      svgText,
      boxes
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
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(compressed);
            controller.close();
          }
        }).pipeThrough(new DecompressionStream('deflate'));
        const response = new Response(stream);
        const arrayBuf = await response.arrayBuffer();
        return new Uint8Array(arrayBuf);
      }
    }
    throw new Error('DecompressionStream is not supported in this runtime.');
  }
}
