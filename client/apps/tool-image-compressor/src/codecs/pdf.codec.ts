// client/apps/tool-file-converter/src/services/image-codecs/pdf.codec.ts

/**
 * Pure TypeScript PDF 1.4 Image Document Generator.
 * Encapsulates high-resolution raster images into standard single-page PDF documents.
 * Zero external dependencies.
 */

export class PdfCodec {
  /**
   * Generates a valid PDF 1.4 document Blob containing the given JPEG image bytes.
   */
  static fromJpeg(jpegBytes: Uint8Array, width: number, height: number): Blob {
    const ptWidth = Math.round((width * 72) / 96);
    const ptHeight = Math.round((height * 72) / 96);
    const encoder = new TextEncoder();
    const parts: (Uint8Array)[] = [];
    const offsets: number[] = [];
    let currentOffset = 0;

    const addChunk = (chunk: Uint8Array | string) => {
      const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
      parts.push(bytes);
      currentOffset += bytes.length;
    };

    addChunk('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // 1 0 obj: Catalog
    offsets[1] = currentOffset;
    addChunk('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // 2 0 obj: Pages
    offsets[2] = currentOffset;
    addChunk('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // 3 0 obj: Page
    offsets[3] = currentOffset;
    addChunk(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] ` +
      `/Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`
    );

    // 4 0 obj: Content stream
    const contentStream = `q\n${ptWidth} 0 0 ${ptHeight} 0 0 cm\n/Im1 Do\nQ\n`;
    offsets[4] = currentOffset;
    addChunk(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

    // 5 0 obj: Image XObject
    offsets[5] = currentOffset;
    const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
    addChunk(imgHeader);
    addChunk(jpegBytes);
    addChunk('\nendstream\nendobj\n');

    // xref table
    const startXref = currentOffset;
    addChunk('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) {
      const offsetStr = String(offsets[i]).padStart(10, '0');
      addChunk(`${offsetStr} 00000 n \n`);
    }

    addChunk(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

    return new Blob(parts as BlobPart[], { type: 'application/pdf' });
  }
}

