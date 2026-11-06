// apps/tool-file-converter/src/services/file-signature.service.ts
import { Injectable } from '@angular/core';
import { DetectedFormat, FileCategory } from '../models/converter.models';

@Injectable({
  providedIn: 'root'
})
export class FileSignatureService {

  /**
   * Reads header magic bytes and text heuristics to determine and verify the true file format.
   */
  async detectFormat(file: File): Promise<DetectedFormat> {
    const extension = this.extractExtension(file.name);
    const slice = await this.readFileSlice(file, 8192);
    const bytes = new Uint8Array(slice);

    // 1. Check for dangerous executables masquerading as media
    if (this.isExecutable(bytes)) {
      return {
        format: 'exe',
        mimeType: 'application/x-msdownload',
        extension: 'exe',
        category: 'archive',
        signatureVerified: false,
        confidence: 1.0,
        spoofWarning: 'Dangerous binary/executable file detected. File conversion rejected for security.'
      };
    }

    // 2. Binary Signature Matching
    const binaryMatch = this.matchBinarySignature(bytes, extension);
    if (binaryMatch) {
      // Validate extension consistency
      const isExtensionMismatch = extension && binaryMatch.extension !== extension &&
        !this.isAcceptableExtensionAlias(binaryMatch.extension, extension);

      return {
        ...binaryMatch,
        signatureVerified: true,
        spoofWarning: isExtensionMismatch
          ? `File has .${extension} extension, but actual binary signature is ${binaryMatch.label} (.${binaryMatch.extension}). Output formats adjusted accordingly.`
          : undefined
      };
    }

    // 3. Text-Based Signature & Heuristic Matching (SVG, SRT, VTT, VCF, CSV)
    const textMatch = this.matchTextSignature(bytes, extension);
    if (textMatch) {
      return textMatch;
    }

    // 4. Fallback based on file extension & declared MIME type
    return this.fallbackByExtension(file, extension);
  }

  private async readFileSlice(file: File, bytesToRead: number): Promise<ArrayBuffer> {
    const blob = file.slice(0, Math.min(file.size, bytesToRead));
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new Error('FileReader is not supported in this environment.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file slice for signature verification.'));
      reader.readAsArrayBuffer(blob);
    });
  }

  private isExecutable(bytes: Uint8Array): boolean {
    if (bytes.length < 4) return false;
    // DOS / Windows PE executable ('MZ')
    if (bytes[0] === 0x4D && bytes[1] === 0x5A) return true;
    // Linux ELF binary
    if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) return true;
    // Mach-O binary
    if (
      (bytes[0] === 0xFE && bytes[1] === 0xED && bytes[2] === 0xFA && (bytes[3] === 0xCE || bytes[3] === 0xCF)) ||
      (bytes[0] === 0xCF && bytes[1] === 0xFA && bytes[2] === 0xED && bytes[3] === 0xFE)
    ) return true;
    return false;
  }

  private matchBinarySignature(bytes: Uint8Array, fileExt: string): (DetectedFormat & { label: string }) | null {
    if (bytes.length < 3) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      return {
        format: 'png',
        mimeType: 'image/png',
        extension: 'png',
        label: 'PNG',
        category: 'image',
        signatureVerified: true,
        signatureName: 'PNG Magic Number (89 50 4E 47)',
        confidence: 1.0
      };
    }

    // JPEG / JPG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return {
        format: 'jpg',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        label: 'JPEG',
        category: 'image',
        signatureVerified: true,
        signatureName: 'JPEG SOI Marker (FF D8 FF)',
        confidence: 1.0
      };
    }

    // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return {
        format: 'webp',
        mimeType: 'image/webp',
        extension: 'webp',
        label: 'WebP',
        category: 'image',
        signatureVerified: true,
        signatureName: 'RIFF WEBP Container',
        confidence: 1.0
      };
    }

    // GIF: GIF87a or GIF89a
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return {
        format: 'gif',
        mimeType: 'image/gif',
        extension: 'gif',
        label: 'GIF',
        category: 'image',
        signatureVerified: true,
        signatureName: 'GIF87a/89a Header',
        confidence: 1.0
      };
    }

    // ISO Base Media File Format: check ftyp box at offset 4
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      
      // AVIF: brand starts with avif or avis
      if (brand.startsWith('avif') || brand.startsWith('avis')) {
        return {
          format: 'avif',
          mimeType: 'image/avif',
          extension: 'avif',
          label: 'AVIF',
          category: 'modern-image',
          signatureVerified: true,
          signatureName: 'ISO BMFF ftyp (AVIF)',
          confidence: 1.0
        };
      }

      // HEIC / HEIF: heic, heix, heim, heis, mif1
      if (brand.includes('heic') || brand.includes('heix') || brand.includes('mif1') || brand.includes('msf1')) {
        return {
          format: 'heic',
          mimeType: 'image/heic',
          extension: 'heic',
          label: 'HEIC',
          category: 'modern-image',
          signatureVerified: true,
          signatureName: 'ISO BMFF ftyp (HEIC/HEIF)',
          confidence: 1.0
        };
      }

      // M4A Audio
      if (brand.includes('m4a') || brand.includes('m4b')) {
        return {
          format: 'm4a',
          mimeType: 'audio/mp4',
          extension: 'm4a',
          label: 'M4A Audio',
          category: 'audio',
          signatureVerified: true,
          signatureName: 'ISO BMFF ftyp (M4A)',
          confidence: 1.0
        };
      }

      // QuickTime MOV
      if (brand.includes('qt')) {
        return {
          format: 'mov',
          mimeType: 'video/quicktime',
          extension: 'mov',
          label: 'QuickTime MOV',
          category: 'video',
          signatureVerified: true,
          signatureName: 'ISO BMFF ftyp (QuickTime)',
          confidence: 1.0
        };
      }

      // MP4 Video: isom, mp41, mp42
      if (brand.includes('isom') || brand.includes('mp4')) {
        return {
          format: 'mp4',
          mimeType: 'video/mp4',
          extension: 'mp4',
          label: 'MP4 Video',
          category: 'video',
          signatureVerified: true,
          signatureName: 'ISO BMFF ftyp (MP4)',
          confidence: 1.0
        };
      }
    }

    // WAV Audio: RIFF at 0..3 ... WAVE at 8..11
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
    ) {
      return {
        format: 'wav',
        mimeType: 'audio/wav',
        extension: 'wav',
        label: 'WAV Audio',
        category: 'audio',
        signatureVerified: true,
        signatureName: 'RIFF WAVE Container',
        confidence: 1.0
      };
    }

    // FLAC Audio: fLaC
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return {
        format: 'flac',
        mimeType: 'audio/flac',
        extension: 'flac',
        label: 'FLAC Audio',
        category: 'audio',
        signatureVerified: true,
        signatureName: 'FLAC Marker',
        confidence: 1.0
      };
    }

    // MP3 Audio: ID3 or sync frame
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)
    ) {
      return {
        format: 'mp3',
        mimeType: 'audio/mpeg',
        extension: 'mp3',
        label: 'MP3 Audio',
        category: 'audio',
        signatureVerified: true,
        signatureName: 'MPEG Sync / ID3v2 Tag',
        confidence: 0.95
      };
    }

    // PDF: %PDF- (25 50 44 46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return {
        format: 'pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        label: 'PDF Document',
        category: 'document',
        signatureVerified: true,
        signatureName: 'PDF Header (%PDF-)',
        confidence: 1.0
      };
    }

    // ZIP container (DOCX, ODT, EPUB, standard ZIP): 50 4B 03 04
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      const sliceString = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

      if (sliceString.includes('mimetypeapplication/epub+zip')) {
        return {
          format: 'epub',
          mimeType: 'application/epub+zip',
          extension: 'epub',
          label: 'EPUB E-Book',
          category: 'document',
          signatureVerified: true,
          signatureName: 'EPUB Container',
          confidence: 1.0
        };
      }

      if (sliceString.includes('mimetypeapplication/vnd.oasis.opendocument.text')) {
        return {
          format: 'odt',
          mimeType: 'application/vnd.oasis.opendocument.text',
          extension: 'odt',
          label: 'ODT Document',
          category: 'document',
          signatureVerified: true,
          signatureName: 'OpenDocument Text Container',
          confidence: 1.0
        };
      }

      if (sliceString.includes('word/document.xml') || fileExt === 'docx') {
        return {
          format: 'docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          extension: 'docx',
          label: 'DOCX Document',
          category: 'document',
          signatureVerified: true,
          signatureName: 'Office Open XML Document',
          confidence: 1.0
        };
      }

      return {
        format: 'zip',
        mimeType: 'application/zip',
        extension: 'zip',
        label: 'ZIP Archive',
        category: 'archive',
        signatureVerified: true,
        signatureName: 'PKZip Header',
        confidence: 1.0
      };
    }

    return null;
  }

  private matchTextSignature(bytes: Uint8Array, fileExt: string): DetectedFormat | null {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(bytes).trim();

    // 1. WebVTT subtitle
    if (text.startsWith('WEBVTT')) {
      return {
        format: 'vtt',
        mimeType: 'text/vtt',
        extension: 'vtt',
        category: 'subtitle',
        signatureVerified: true,
        signatureName: 'WebVTT Signature Header',
        confidence: 1.0
      };
    }

    // 2. SRT Subtitle: 1\n00:00:00,000 --> 00:00:00,000
    if (/^(?:\uFEFF)?\d+\s*[\r\n]+\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(text)) {
      return {
        format: 'srt',
        mimeType: 'text/plain',
        extension: 'srt',
        category: 'subtitle',
        signatureVerified: true,
        signatureName: 'SubRip (SRT) Cue Pattern',
        confidence: 1.0
      };
    }

    // 3. vCard Contact: BEGIN:VCARD
    if (/BEGIN:VCARD/i.test(text)) {
      return {
        format: 'vcf',
        mimeType: 'text/vcard',
        extension: 'vcf',
        category: 'contact',
        signatureVerified: true,
        signatureName: 'vCard BEGIN:VCARD Header',
        confidence: 1.0
      };
    }

    // 4. SVG Vector Graphic: contains <svg
    if (/<svg[\s>]/i.test(text) && (/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(text) || fileExt === 'svg')) {
      return {
        format: 'svg',
        mimeType: 'image/svg+xml',
        extension: 'svg',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'SVG XML Root Element',
        confidence: 1.0
      };
    }

    // 5. CSV: Tabular comma/semicolon separated lines
    if (fileExt === 'csv' || (this.isLikelyCsv(text) && fileExt !== 'txt')) {
      return {
        format: 'csv',
        mimeType: 'text/csv',
        extension: 'csv',
        category: 'contact',
        signatureVerified: fileExt === 'csv',
        signatureName: 'Delimited Tabular Data',
        confidence: 0.85
      };
    }

    return null;
  }

  private isLikelyCsv(text: string): boolean {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0).slice(0, 5);
    if (lines.length < 2) return false;

    const commaCounts = lines.map(line => (line.match(/,/g) || []).length);
    const semicolonCounts = lines.map(line => (line.match(/;/g) || []).length);

    const hasConsistentCommas = commaCounts[0] >= 1 && commaCounts.every(c => c === commaCounts[0]);
    const hasConsistentSemicolons = semicolonCounts[0] >= 1 && semicolonCounts.every(c => c === semicolonCounts[0]);

    return hasConsistentCommas || hasConsistentSemicolons;
  }

  private fallbackByExtension(file: File, extension: string): DetectedFormat {
    const ext = extension.toLowerCase();
    const declaredType = file.type;

    const categoryMap: Record<string, FileCategory> = {
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      webp: 'image',
      gif: 'image',
      svg: 'graphics',
      avif: 'modern-image',
      heic: 'modern-image',
      srt: 'subtitle',
      vtt: 'subtitle',
      vcf: 'contact',
      csv: 'contact',
      epub: 'document',
      pdf: 'document',
      odt: 'document',
      docx: 'document',
      m4a: 'audio',
      mp3: 'audio',
      wav: 'audio',
      flac: 'audio',
      mov: 'video',
      mp4: 'video'
    };

    const category: FileCategory = categoryMap[ext] || 'document';
    const normalizedFormat = ext === 'jpeg' ? 'jpg' : ext;

    return {
      format: normalizedFormat,
      mimeType: declaredType || 'application/octet-stream',
      extension: normalizedFormat,
      category,
      signatureVerified: false,
      confidence: 0.6
    };
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) return '';
    return filename.slice(lastDot + 1).toLowerCase();
  }

  private isAcceptableExtensionAlias(primaryExt: string, actualExt: string): boolean {
    if (primaryExt === actualExt) return true;
    if ((primaryExt === 'jpg' && actualExt === 'jpeg') || (primaryExt === 'jpeg' && actualExt === 'jpg')) return true;
    if ((primaryExt === 'vcf' && actualExt === 'vcard') || (primaryExt === 'vcard' && actualExt === 'vcf')) return true;
    return false;
  }
}
