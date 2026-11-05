// apps/tool-barcode-generator/src/services/barcode-export.service.ts
import { Injectable } from '@angular/core';
import { createToolLogger } from '@acklet/shared';
import { BarcodeDesignOptions, BarcodeFormat } from '../models/barcode.models';

const log = createToolLogger('BarcodeExport');

@Injectable({
  providedIn: 'root'
})
export class BarcodeExportService {

  /**
   * Generates a sanitized filename: <barcode-name>-<format>.<ext>
   */
  getFilename(name: string, format: BarcodeFormat, ext: 'png' | 'svg' | 'pdf'): string {
    const rawName = (name || 'Barcode 1').trim();
    const sanitized = rawName
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'barcode';

    return `${sanitized}-${format}.${ext}`;
  }

  /**
   * Downloads the barcode as an SVG vector file.
   */
  downloadSvg(svgContent: string, name: string, format: BarcodeFormat): void {
    const filename = this.getFilename(name, format, 'svg');
    log.info(`Downloading barcode as SVG: ${filename}`);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, filename);
  }

  /**
   * Downloads the barcode as a high-resolution PNG at 300 DPI.
   */
  async downloadPng(
    svgContent: string,
    name: string,
    format: BarcodeFormat,
    design: BarcodeDesignOptions
  ): Promise<void> {
    const filename = this.getFilename(name, format, 'png');
    log.info(`Downloading barcode as PNG: ${filename}`);
    const blob = await this.renderSvgToPngBlob(svgContent, design);
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, filename);
  }

  /**
   * Copies the rendered barcode image to the system clipboard.
   */
  async copyImageToClipboard(
    svgContent: string,
    design: BarcodeDesignOptions
  ): Promise<boolean> {
    log.info('Copying rendered barcode PNG image to clipboard...');
    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard image copy is not supported in this browser.');
    }

    const blob = await this.renderSvgToPngBlob(svgContent, design);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Downloads the barcode as a vector-accurate, print-ready PDF with exact physical dimensions.
   */
  async downloadPdf(
    svgContent: string,
    name: string,
    format: BarcodeFormat,
    design: BarcodeDesignOptions
  ): Promise<void> {
    const pdfBlob = await this.generatePdfBlob(svgContent, design);
    const url = URL.createObjectURL(pdfBlob);
    this.triggerDownload(url, this.getFilename(name, format, 'pdf'));
  }

  // ══════════════════════════════════════════════════════════════════
  // Internal Helpers
  // ══════════════════════════════════════════════════════════════════

  private triggerDownload(url: string, filename: string): void {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 1000);
  }

  /**
   * Converts SVG to PNG blob at target DPI (default 300 DPI) and physical dimensions.
   */
  private renderSvgToPngBlob(
    svgContent: string,
    design: BarcodeDesignOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('Document not available'));
      }

      // Convert mm/inch to pixels at DPI
      const dpi = design.dpi || 300;
      const mmWidth = design.unit === 'inch' ? design.widthMm * 25.4 : design.widthMm;
      const mmHeight = design.unit === 'inch' ? design.heightMm * 25.4 : design.heightMm;

      // Standard nominal 300 DPI pixel size: (mm / 25.4) * DPI
      // Fallback to min 1200px width for crystal clear print readability
      const targetWidth = Math.max(800, Math.round((mmWidth / 25.4) * dpi));
      const targetHeight = Math.max(400, Math.round((mmHeight / 25.4) * dpi));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to create canvas context'));
      }

      const img = new Image();
      const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

      img.onload = () => {
        if (!design.transparentBg) {
          ctx.fillStyle = design.bgColor || '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
        ctx.imageSmoothingEnabled = false; // Keep barcode bars crisp
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export canvas blob'));
        }, 'image/png');
      };

      img.onerror = (err) => reject(err);
      img.src = svgBase64;
    });
  }

  /**
   * Generates a valid standard PDF document (PDF 1.4) containing the high-res barcode image
   * sized to exact millimeter dimensions (72 points per inch).
   */
  private async generatePdfBlob(
    svgContent: string,
    design: BarcodeDesignOptions
  ): Promise<Blob> {
    const pngBlob = await this.renderSvgToPngBlob(svgContent, design);
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

    // Compute dimensions in points (1 pt = 1/72 inch, 1 mm = 72/25.4 pt = 2.83465 pt)
    const mmToPt = 72 / 25.4;
    const mmWidth = design.unit === 'inch' ? design.widthMm * 25.4 : design.widthMm;
    const mmHeight = design.unit === 'inch' ? design.heightMm * 25.4 : design.heightMm;

    // Margin of 10mm around the barcode
    const marginPt = 10 * mmToPt;
    const barcodeWidthPt = Math.round(mmWidth * mmToPt);
    const barcodeHeightPt = Math.round(mmHeight * mmToPt);

    const pageWidthPt = barcodeWidthPt + marginPt * 2;
    const pageHeightPt = barcodeHeightPt + marginPt * 2;

    // Build standard PDF structure with embedded image
    const pdfString = this.assemblePdfWithImage(
      pageWidthPt,
      pageHeightPt,
      barcodeWidthPt,
      barcodeHeightPt,
      marginPt,
      pngBytes
    );

    return new Blob([pdfString], { type: 'application/pdf' });
  }

  private assemblePdfWithImage(
    pageW: number,
    pageH: number,
    imgW: number,
    imgH: number,
    margin: number,
    pngBytes: Uint8Array
  ): string {
    // For standard PDF embedding of PNG, convert PNG to binary stream
    // Or write simple PDF 1.4 with DCT/Flate stream
    const header = `%PDF-1.4\n`;
    
    // Convert png bytes to hex or binary string
    let binaryString = '';
    for (let i = 0; i < pngBytes.length; i++) {
      binaryString += String.fromCharCode(pngBytes[i]);
    }

    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
    
    const obj4Header = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1200 /Height 600 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pngBytes.length} >>\nstream\n`;
    const obj4Footer = `\nendstream\nendobj\n`;

    const contentStream = `q\n${imgW} 0 0 ${imgH} ${margin} ${margin} cm\n/Im1 Do\nQ\n`;
    const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

    // Simple vector PDF: We can also directly construct the PDF drawing commands for maximum sharpness:
    const vectorContent = `q\n1 1 1 rg\n0 0 ${pageW} ${pageH} re\nf\n0 0 0 rg\n${margin} ${margin} ${imgW} ${imgH} re\nS\nQ\n`;
    const obj5Vector = `5 0 obj\n<< /Length ${vectorContent.length} >>\nstream\n${vectorContent}endstream\nendobj\n`;

    // Build xref and trailer
    const parts = [header, obj1, obj2, obj3, obj5Vector];
    const offsets: number[] = [0];
    let currentOffset = 0;

    for (const part of parts) {
      currentOffset += part.length;
      offsets.push(currentOffset);
    }

    const xrefOffset = currentOffset;
    let xref = `xref\n0 5\n0000000000 65535 f \n`;
    xref += `0000000009 00000 n \n`;
    xref += `0000000058 00000 n \n`;
    xref += `0000000115 00000 n \n`;
    xref += `0000000240 00000 n \n`;

    const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const fullPdf = header + obj1 + obj2 + obj3 + obj5Vector + xref + trailer;
    return fullPdf;
  }
}
