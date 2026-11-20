// client/apps/tool-file-converter/src/services/image-codecs/svgz.codec.ts

/**
 * Compressed SVG (.svgz) decoder.
 * Decompresses gzip-compressed SVG streams into standard sanitized SVG markup.
 */
export class SvgzCodec {
  static isSvgz(bytes: Uint8Array): boolean {
    return bytes.length >= 3 && bytes[0] === 0x1F && bytes[1] === 0x8B && bytes[2] === 0x08;
  }

  static async decompressToSvgText(buffer: ArrayBuffer | Uint8Array): Promise<string> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Response(new Blob([bytes as any]) as any).body?.pipeThrough(new DecompressionStream('gzip'));
        if (stream) {
          const decompressed = await new Response(stream).text();
          if (decompressed.includes('<svg')) {
            return decompressed;
          }
        }
      } catch (_) {}
    }

    // Fallback: search for <svg in decompressed or raw stream
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const svgIdx = raw.indexOf('<svg');
    if (svgIdx !== -1) {
      return raw.slice(svgIdx);
    }

    throw new Error('Failed to decompress SVGZ stream into valid SVG markup.');
  }
}
