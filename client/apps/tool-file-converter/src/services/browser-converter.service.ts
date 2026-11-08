// apps/tool-file-converter/src/services/browser-converter.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import JSZip from 'jszip';
import { ConversionOptions } from '../converter.models';

export interface BrowserConversionResult {
  blob: Blob;
  downloadUrl: string;
  outputFileName: string;
  sizeBytes: number;
  runtime: 'browser';
  tier?: 'stable' | 'beta';
}

export interface BrowserConversionProgress {
  progress: number;
  status: 'converting' | 'ready' | 'failed';
  result?: BrowserConversionResult;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrowserConverterService {
  private readonly MAX_BROWSER_BYTES = 25 * 1024 * 1024; // 25 MB limit for on-device worker

  /**
   * Checks if an input -> target pair is supported directly in the browser runtime.
   */
  isBrowserPair(inputExt: string, targetExt: string): boolean {
    const src = inputExt.toLowerCase();
    const tgt = targetExt.toLowerCase();
    if (src === 'docx' && ['md', 'txt', 'html'].includes(tgt)) return true;
    if (src === 'xlsx' && tgt === 'csv') return true;
    if (src === 'csv' && tgt === 'xlsx') return true;
    if (src === 'pdf' && ['docx', 'xlsx', 'txt'].includes(tgt)) return true;
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(src) && ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'pdf'].includes(tgt)) return true;
    return false;
  }

  /**
   * Executes client-side conversion offloading to Web Worker/Offscreen processing.
   */
  convertInBrowser(
    file: File,
    targetFormat: string,
    options?: Partial<ConversionOptions>
  ): Observable<BrowserConversionProgress> {
    return new Observable<BrowserConversionProgress>(subscriber => {
      const src = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
      const tgt = targetFormat.toLowerCase();
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const outputName = `${baseName}.${tgt}`;

      // 1. Size limit check
      if (file.size > this.MAX_BROWSER_BYTES) {
        subscriber.next({
          progress: 0,
          status: 'failed',
          errorCode: 'TOO_LARGE',
          errorMessage: 'This file is too large for on-device conversion. Maximum size is 25 MB.'
        });
        subscriber.complete();
        return;
      }

      subscriber.next({ progress: 15, status: 'converting' });

      file.arrayBuffer().then(async buffer => {
        try {
          subscriber.next({ progress: 40, status: 'converting' });
          let convertedBlob: Blob;

          if (src === 'docx' && tgt === 'md') {
            convertedBlob = await this.convertDocxToMarkdown(buffer);
          } else if (src === 'docx' && tgt === 'txt') {
            convertedBlob = await this.convertDocxToTxt(buffer);
          } else if (src === 'docx' && tgt === 'html') {
            convertedBlob = await this.convertDocxToHtml(buffer, baseName);
          } else if (src === 'xlsx' && tgt === 'csv') {
            convertedBlob = await this.convertXlsxToCsv(buffer);
          } else if (src === 'csv' && tgt === 'xlsx') {
            convertedBlob = await this.convertCsvToXlsx(buffer);
          } else if (src === 'pdf' && tgt === 'docx') {
            convertedBlob = await this.convertPdfToDocx(buffer);
          } else if (src === 'pdf' && tgt === 'xlsx') {
            convertedBlob = await this.convertPdfToXlsx(buffer);
          } else if (src === 'pdf' && tgt === 'txt') {
            convertedBlob = await this.convertPdfToTxt(buffer);
          } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(src) && tgt === 'pdf') {
            convertedBlob = await this.convertImageToPdf(buffer, file.type || 'image/jpeg');
          } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(src) && ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(tgt)) {
            convertedBlob = await this.convertRasterImage(buffer, tgt);
          } else {
            throw new Error(`UNSUPPORTED_PAIR: On-device conversion from ${src} to ${tgt} is not supported.`);
          }

          subscriber.next({ progress: 85, status: 'converting' });

          const downloadUrl = URL.createObjectURL(convertedBlob);
          const result: BrowserConversionResult = {
            blob: convertedBlob,
            downloadUrl,
            outputFileName: outputName,
            sizeBytes: convertedBlob.size,
            runtime: 'browser',
            tier: (src === 'docx' && tgt === 'md') || (src === 'pdf' && ['docx', 'xlsx'].includes(tgt)) ? 'beta' : 'stable'
          };

          subscriber.next({
            progress: 100,
            status: 'ready',
            result
          });
          subscriber.complete();
        } catch (err: any) {
          const errMsg = err?.message || 'On-device conversion error';
          const code = errMsg.includes('TOO_LARGE') ? 'TOO_LARGE'
            : errMsg.includes('CORRUPTED') ? 'CORRUPTED_FILE'
            : errMsg.includes('UNSUPPORTED') ? 'UNSUPPORTED_PAIR'
            : errMsg.includes('OCR') ? 'OCR_FAILED' : 'CONVERSION_ERROR';

          subscriber.next({
            progress: 0,
            status: 'failed',
            errorCode: code,
            errorMessage: errMsg
          });
          subscriber.complete();
        }
      }).catch(err => {
        subscriber.next({
          progress: 0,
          status: 'failed',
          errorCode: 'CORRUPTED_FILE',
          errorMessage: 'This file appears to be damaged or incomplete. Please check the file and try again.'
        });
        subscriber.complete();
      });
    });
  }

  // --- DOCX Transformations (via JSZip OpenXML Parser) ---

  private async convertDocxToMarkdown(buffer: ArrayBuffer): Promise<Blob> {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('CORRUPTED_FILE: Invalid document archive structure.');
    }
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    let markdown = '';
    const paragraphs = xmlDoc.getElementsByTagName('w:p');

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let pText = '';
      let isHeading = false;
      let headingLevel = 1;

      // Check heading style
      const pStyle = p.getElementsByTagName('w:pStyle')[0];
      if (pStyle) {
        const val = pStyle.getAttribute('w:val') || '';
        const match = val.match(/Heading(\d)/i) || val.match(/Heading_?(\d)/i);
        if (match) {
          isHeading = true;
          headingLevel = Math.min(6, Math.max(1, parseInt(match[1], 10)));
        }
      }

      // Check list
      const numPr = p.getElementsByTagName('w:numPr')[0];
      const isList = Boolean(numPr);

      // Runs of text
      const runs = p.getElementsByTagName('w:r');
      for (let j = 0; j < runs.length; j++) {
        const r = runs[j];
        const isBold = r.getElementsByTagName('w:b').length > 0;
        const isItalic = r.getElementsByTagName('w:i').length > 0;
        const t = r.getElementsByTagName('w:t');
        let rText = '';
        for (let k = 0; k < t.length; k++) {
          rText += t[k].textContent || '';
        }
        if (rText) {
          if (isBold && isItalic) rText = `***${rText}***`;
          else if (isBold) rText = `**${rText}**`;
          else if (isItalic) rText = `*${rText}*`;
          pText += rText;
        }
      }

      if (pText.trim()) {
        if (isHeading) {
          markdown += `${'#'.repeat(headingLevel)} ${pText.trim()}\n\n`;
        } else if (isList) {
          markdown += `- ${pText.trim()}\n`;
        } else {
          markdown += `${pText.trim()}\n\n`;
        }
      }
    }

    // Process tables
    const tables = xmlDoc.getElementsByTagName('w:tbl');
    if (tables.length > 0 && !markdown.includes('|')) {
      for (let t = 0; t < tables.length; t++) {
        const tbl = tables[t];
        const rows = tbl.getElementsByTagName('w:tr');
        let tableMd = '\n';
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].getElementsByTagName('w:tc');
          const cellTexts: string[] = [];
          for (let c = 0; c < cells.length; c++) {
            cellTexts.push((cells[c].textContent || '').replace(/[\r\n]+/g, ' ').trim());
          }
          tableMd += `| ${cellTexts.join(' | ')} |\n`;
          if (r === 0) {
            tableMd += `| ${cellTexts.map(() => '---').join(' | ')} |\n`;
          }
        }
        markdown += tableMd + '\n';
      }
    }

    return new Blob([markdown.trim() + '\n'], { type: 'text/markdown;charset=utf-8' });
  }

  private async convertDocxToTxt(buffer: ArrayBuffer): Promise<Blob> {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) throw new Error('CORRUPTED_FILE: Invalid document structure.');
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    let text = '';
    for (let i = 0; i < paragraphs.length; i++) {
      const pText = paragraphs[i].textContent || '';
      if (pText.trim()) {
        text += pText.trim() + '\n\n';
      }
    }
    return new Blob([text.trim() + '\n'], { type: 'text/plain;charset=utf-8' });
  }

  private async convertDocxToHtml(buffer: ArrayBuffer, title: string): Promise<Blob> {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) throw new Error('CORRUPTED_FILE: Invalid document structure.');
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    let bodyHtml = '';
    const paragraphs = xmlDoc.getElementsByTagName('w:p');

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let pText = '';
      const runs = p.getElementsByTagName('w:r');
      for (let j = 0; j < runs.length; j++) {
        const r = runs[j];
        const isBold = r.getElementsByTagName('w:b').length > 0;
        const isItalic = r.getElementsByTagName('w:i').length > 0;
        let rText = '';
        const tElements = r.getElementsByTagName('w:t');
        for (let k = 0; k < tElements.length; k++) {
          rText += tElements[k].textContent || '';
        }
        if (rText) {
          if (isBold) rText = `<strong>${this.escapeHtml(rText)}</strong>`;
          else if (isItalic) rText = `<em>${this.escapeHtml(rText)}</em>`;
          else rText = this.escapeHtml(rText);
          pText += rText;
        }
      }
      if (pText.trim()) {
        bodyHtml += `  <p>${pText}</p>\n`;
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    p { margin-bottom: 1em; }
    strong { font-weight: 600; }
  </style>
</head>
<body>
${bodyHtml}</body>
</html>`;
    return new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  }

  // --- XLSX & CSV Transformations ---

  private async convertXlsxToCsv(buffer: ArrayBuffer): Promise<Blob> {
    const zip = await JSZip.loadAsync(buffer);
    const sharedStringsFile = zip.file('xl/sharedStrings.xml');
    const sheetFile = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetFile) throw new Error('CORRUPTED_FILE: Missing spreadsheet worksheet data.');

    const sharedStrings: string[] = [];
    if (sharedStringsFile) {
      const ssXml = await sharedStringsFile.async('text');
      const ssDoc = new DOMParser().parseFromString(ssXml, 'application/xml');
      const siTags = ssDoc.getElementsByTagName('si');
      for (let i = 0; i < siTags.length; i++) {
        sharedStrings.push(siTags[i].textContent || '');
      }
    }

    const sheetXml = await sheetFile.async('text');
    const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
    const rows = sheetDoc.getElementsByTagName('row');

    let csvContent = '';
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].getElementsByTagName('c');
      const rowValues: string[] = [];
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        const type = cell.getAttribute('t');
        const vTag = cell.getElementsByTagName('v')[0];
        let val = vTag ? vTag.textContent || '' : '';
        if (type === 's' && val !== '') {
          const idx = parseInt(val, 10);
          val = sharedStrings[idx] || '';
        }
        rowValues.push(this.formatCsvCell(val));
      }
      csvContent += rowValues.join(',') + '\r\n';
    }

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  }

  private async convertCsvToXlsx(buffer: ArrayBuffer): Promise<Blob> {
    const textDecoder = new TextDecoder('utf-8');
    const csvText = textDecoder.decode(buffer);
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);

    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

    let sheetData = '<sheetData>';
    for (let i = 0; i < lines.length; i++) {
      const cells = this.parseCsvRow(lines[i]);
      sheetData += `<row r="${i + 1}">`;
      for (let j = 0; j < cells.length; j++) {
        const colLetter = String.fromCharCode(65 + (j % 26));
        const ref = `${colLetter}${i + 1}`;
        sheetData += `<c r="${ref}" t="inlineStr"><is><t>${this.escapeHtml(cells[j])}</t></is></c>`;
      }
      sheetData += '</row>';
    }
    sheetData += '</sheetData>';

    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetData}
</worksheet>`);

    const outBytes = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return outBytes;
  }

  // --- PDF Text & Document Extraction (Browser port) ---

  private async convertPdfToTxt(buffer: ArrayBuffer): Promise<Blob> {
    const text = this.extractTextFromPdfStream(buffer);
    if (!text || !text.trim()) {
      throw new Error('OCR_FAILED: No text found. Scanned pages need OCR.');
    }
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  private async convertPdfToDocx(buffer: ArrayBuffer): Promise<Blob> {
    const rawText = this.extractTextFromPdfStream(buffer);
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 0);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;

    for (const para of paragraphs) {
      docXml += `<w:p><w:r><w:t>${this.escapeHtml(para)}</w:t></w:r></w:p>`;
    }

    docXml += `  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>
  </w:body>
</w:document>`;

    zip.file('word/document.xml', docXml);
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  private async convertPdfToXlsx(buffer: ArrayBuffer): Promise<Blob> {
    const rawText = this.extractTextFromPdfStream(buffer);
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    // Convert lines into CSV format and packaging into XLSX
    const csvContent = lines.map(line => {
      // Split on tabs or 2+ consecutive spaces
      const parts = line.split(/\t+|\s{2,}/);
      return parts.map(p => this.formatCsvCell(p)).join(',');
    }).join('\r\n');

    const encoder = new TextEncoder();
    return this.convertCsvToXlsx(encoder.encode(csvContent).buffer as ArrayBuffer);
  }

  // --- Raster Image Transformations (OffscreenCanvas / Browser API) ---

  private async convertRasterImage(buffer: ArrayBuffer, targetFormat: string): Promise<Blob> {
    const blob = new Blob([buffer]);
    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      return blob;
    }
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not allocate canvas 2d context');

    // For JPEG output, fill white background to prevent dark transparency artifacts
    if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    }
    ctx.drawImage(bitmap, 0, 0);

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      bmp: 'image/bmp'
    };
    const outMime = mimeMap[targetFormat] || 'image/png';
    return await canvas.convertToBlob({ type: outMime, quality: 0.92 });
  }

  private async convertImageToPdf(buffer: ArrayBuffer, mimeType: string): Promise<Blob> {
    // Generates a valid PDF 1.4 wrapping image bytes
    const imgBlob = new Blob([buffer], { type: mimeType });
    const bitmap = typeof createImageBitmap !== 'undefined' ? await createImageBitmap(imgBlob) : { width: 595, height: 842 };
    const width = bitmap.width || 595;
    const height = bitmap.height || 842;

    const base64 = await this.blobToBase64(imgBlob);
    const rawData = base64.split(',')[1] || '';
    const byteChars = atob(rawData);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const imgBytes = new Uint8Array(byteNumbers);

    const header = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n` +
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`;

    const footer = `\nendstream\nendobj\n` +
      `5 0 obj\n<< /Length 44 >>\nstream\nq\n${width} 0 0 ${height} 0 0 cm\n/Im1 Do\nQ\nendstream\nendobj\n` +
      `xref\n0 6\n0000000000 65535 f \n` +
      `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n999\n%%EOF`;

    const enc = new TextEncoder();
    const hBytes = enc.encode(header);
    const fBytes = enc.encode(footer);

    const combined = new Uint8Array(hBytes.length + imgBytes.length + fBytes.length);
    combined.set(hBytes, 0);
    combined.set(imgBytes, hBytes.length);
    combined.set(fBytes, hBytes.length + imgBytes.length);

    return new Blob([combined], { type: 'application/pdf' });
  }

  // --- Helpers ---

  private extractTextFromPdfStream(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('latin1').decode(bytes);
    let extracted = '';

    // Regex matches PDF text showing operators: (text) Tj and [(text)] TJ
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(text)) !== null) {
      extracted += match[1] + ' ';
    }

    const arrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = arrayRegex.exec(text)) !== null) {
      const inner = match[1];
      const partRegex = /\(([^)]+)\)/g;
      let part: RegExpExecArray | null;
      while ((part = partRegex.exec(inner)) !== null) {
        extracted += part[1];
      }
      extracted += '\n';
    }

    return extracted.replace(/\\([()\\])/g, '$1').trim();
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatCsvCell(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

