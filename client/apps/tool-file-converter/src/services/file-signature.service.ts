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
      // Check for APNG Animation Control chunk ('acTL')
      let isApng = false;
      for (let i = 8; i <= Math.min(bytes.length - 4, 2048); i++) {
        if (bytes[i] === 0x61 && bytes[i + 1] === 0x63 && bytes[i + 2] === 0x54 && bytes[i + 3] === 0x4C) {
          isApng = true;
          break;
        }
      }

      if (isApng || (fileExt || '').toLowerCase() === 'apng') {
        return {
          format: 'apng',
          mimeType: 'image/apng',
          extension: 'apng',
          label: 'Animated PNG (APNG)',
          category: 'image',
          signatureVerified: true,
          signatureName: 'Animated PNG (acTL Chunk)',
          confidence: 1.0
        };
      }

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

    // JPEG / JPG / JFIF: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      const isJfif = bytes.length >= 10 && bytes[6] === 0x4A && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46;
      const lowerExt = (fileExt || '').toLowerCase();
      const format = lowerExt === 'jfif' ? 'jfif' : (lowerExt === 'jpeg' ? 'jpeg' : 'jpg');
      return {
        format,
        mimeType: 'image/jpeg',
        extension: format,
        label: isJfif ? 'JPEG File Interchange Format (JFIF)' : 'JPEG',
        category: 'image',
        signatureVerified: true,
        signatureName: isJfif ? 'JPEG SOI (JFIF APP0 Marker)' : 'JPEG SOI Marker (FF D8 FF)',
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

    // BMP: 'BM' (42 4D)
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return {
        format: 'bmp',
        mimeType: 'image/bmp',
        extension: 'bmp',
        label: 'BMP Image',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Bitmap Magic Bytes ("BM")',
        confidence: 1.0
      };
    }

    // Photoshop PSD / PSB: '8BPS' (38 42 50 53)
    if (bytes[0] === 0x38 && bytes[1] === 0x42 && bytes[2] === 0x50 && bytes[3] === 0x53) {
      const isPsb = bytes.length >= 6 && bytes[4] === 0x00 && bytes[5] === 0x02;
      const fmt = isPsb ? 'psb' : 'psd';
      return {
        format: fmt,
        mimeType: 'image/vnd.adobe.photoshop',
        extension: fmt,
        label: isPsb ? 'Photoshop PSB' : 'Photoshop PSD',
        category: 'image',
        signatureVerified: true,
        signatureName: isPsb ? 'Adobe Photoshop Large Document (PSB)' : 'Adobe Photoshop (PSD)',
        confidence: 1.0
      };
    }

    // Windows ICO / CUR
    if (bytes[0] === 0x00 && bytes[1] === 0x00 && (bytes[2] === 0x01 || bytes[2] === 0x02) && bytes[3] === 0x00) {
      const isCur = bytes[2] === 0x02 || (fileExt || '').toLowerCase() === 'cur';
      return {
        format: isCur ? 'cur' : 'ico',
        mimeType: isCur ? 'image/x-win-bitmap' : 'image/x-icon',
        extension: isCur ? 'cur' : 'ico',
        label: isCur ? 'Windows Cursor (CUR)' : 'Windows Icon (ICO)',
        category: 'image',
        signatureVerified: true,
        signatureName: isCur ? 'Windows Cursor Header' : 'Windows Icon Header',
        confidence: 1.0
      };
    }

    // Apple ICNS
    if (bytes[0] === 0x69 && bytes[1] === 0x63 && bytes[2] === 0x6E && bytes[3] === 0x73) {
      return {
        format: 'icns',
        mimeType: 'image/x-icns',
        extension: 'icns',
        label: 'Apple Icon (ICNS)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Apple ICNS Header',
        confidence: 1.0
      };
    }

    // ZSoft PCX
    if (bytes[0] === 0x0A && bytes[2] === 1 && (bytes[3] === 1 || bytes[3] === 8)) {
      return {
        format: 'pcx',
        mimeType: 'image/x-pcx',
        extension: 'pcx',
        label: 'PCX Image',
        category: 'image',
        signatureVerified: true,
        signatureName: 'ZSoft PCX Header',
        confidence: 0.95
      };
    }

    // Netpbm (PPM, PGM, PBM, PNM): P1 through P6
    if (
      bytes[0] === 0x50 &&
      bytes[1] >= 0x31 && bytes[1] <= 0x36 &&
      (bytes[2] === 0x20 || bytes[2] === 0x0A || bytes[2] === 0x0D || bytes[2] === 0x09)
    ) {
      const typeNum = bytes[1] - 0x30;
      const fmt = (typeNum === 1 || typeNum === 4) ? 'pbm' : (typeNum === 2 || typeNum === 5) ? 'pgm' : 'ppm';
      return {
        format: fmt,
        mimeType: fmt === 'ppm' ? 'image/x-portable-pixmap' : fmt === 'pgm' ? 'image/x-portable-graymap' : 'image/x-portable-bitmap',
        extension: fmt,
        label: `Netpbm (P${typeNum} ${fmt.toUpperCase()})`,
        category: 'image',
        signatureVerified: true,
        signatureName: `Netpbm Magic Number (P${typeNum})`,
        confidence: 1.0
      };
    }

    // Radiance HDR: '#?' (23 3F)
    if (bytes[0] === 0x23 && bytes[1] === 0x3F) {
      return {
        format: 'hdr',
        mimeType: 'image/vnd.radiance',
        extension: 'hdr',
        label: 'Radiance HDR',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Radiance RGBE Signature ("#?")',
        confidence: 1.0
      };
    }

    // FITS: 'SIMPLE  =' (53 49 4D 50 4C 45 20 20 3D)
    if (
      bytes[0] === 0x53 && bytes[1] === 0x49 && bytes[2] === 0x4D && bytes[3] === 0x50 &&
      bytes[4] === 0x4C && bytes[5] === 0x45 && bytes[6] === 0x20 && bytes[7] === 0x20 && bytes[8] === 0x3D
    ) {
      return {
        format: 'fits',
        mimeType: 'image/fits',
        extension: 'fits',
        label: 'FITS Astronomical Image',
        category: 'image',
        signatureVerified: true,
        signatureName: 'FITS Standard Header ("SIMPLE  =")',
        confidence: 1.0
      };
    }

    // DirectDraw Surface (DDS): 'DDS ' (44 44 53 20)
    if (bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20) {
      return {
        format: 'dds',
        mimeType: 'image/vnd.ms-dds',
        extension: 'dds',
        label: 'DirectDraw Surface (DDS)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'DirectDraw Surface Marker',
        confidence: 1.0
      };
    }

    // Fujifilm RAW (RAF): 'FUJIFILMCCD-RAW '
    if (
      bytes[0] === 0x46 && bytes[1] === 0x55 && bytes[2] === 0x4A && bytes[3] === 0x49 &&
      bytes[4] === 0x46 && bytes[5] === 0x49 && bytes[6] === 0x4C && bytes[7] === 0x4D
    ) {
      return {
        format: 'raf',
        mimeType: 'image/x-fuji-raf',
        extension: 'raf',
        label: 'Fujifilm RAW (RAF)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Fujifilm RAF Header',
        confidence: 1.0
      };
    }

    // Canon CR2: 'II' + 42 + 'CR' at offset 8-9
    if (
      bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00 &&
      bytes.length >= 10 && bytes[8] === 0x43 && bytes[9] === 0x52
    ) {
      return {
        format: 'cr2',
        mimeType: 'image/x-canon-cr2',
        extension: 'cr2',
        label: 'Canon RAW (CR2)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Canon CR2 Header',
        confidence: 1.0
      };
    }

    // Olympus ORF: 'IIRO' (49 49 52 4F) or 'MMOR' (4D 4D 4F 52)
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x52 && bytes[3] === 0x4F) ||
      (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x4F && bytes[3] === 0x52)
    ) {
      return {
        format: 'orf',
        mimeType: 'image/x-olympus-orf',
        extension: 'orf',
        label: 'Olympus RAW (ORF)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Olympus ORF Header',
        confidence: 1.0
      };
    }

    // Panasonic RAW: 'II' + 0x55
    if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x55 && bytes[3] === 0x00) {
      return {
        format: 'rw2',
        mimeType: 'image/x-panasonic-rw2',
        extension: 'rw2',
        label: 'Panasonic RAW (RW2)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Panasonic RW2 Header',
        confidence: 1.0
      };
    }

    // Baseline TIFF & TIFF-based Camera RAW (DNG, NEF, ARW, PEF)
    const isTiffLe = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00;
    const isTiffBe = bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A;

    if (isTiffLe || isTiffBe) {
      const lowerExt = (fileExt || '').toLowerCase();
      const rawMap: Record<string, { format: string; label: string; mime: string }> = {
        dng: { format: 'dng', label: 'Adobe Digital Negative (DNG)', mime: 'image/x-adobe-dng' },
        nef: { format: 'nef', label: 'Nikon RAW (NEF)', mime: 'image/x-nikon-nef' },
        arw: { format: 'arw', label: 'Sony RAW (ARW)', mime: 'image/x-sony-arw' },
        pef: { format: 'pef', label: 'Pentax RAW (PEF)', mime: 'image/x-pentax-pef' },
        raw: { format: 'raw', label: 'Camera RAW', mime: 'image/x-raw' }
      };

      if (rawMap[lowerExt]) {
        const item = rawMap[lowerExt];
        return {
          format: item.format,
          mimeType: item.mime,
          extension: item.format,
          label: item.label,
          category: 'image',
          signatureVerified: true,
          signatureName: `TIFF-based ${item.label}`,
          confidence: 1.0
        };
      }

      return {
        format: 'tiff',
        mimeType: 'image/tiff',
        extension: 'tiff',
        label: 'TIFF Image',
        category: 'image',
        signatureVerified: true,
        signatureName: isTiffLe ? 'TIFF Little-Endian (II*)' : 'TIFF Big-Endian (MM*)',
        confidence: 1.0
      };
    }

    // JPEG 2000: JP2 container (00 00 00 0C 6A 50 20 20) or J2K codestream (FF 4F FF 51)
    if (
      (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
       bytes[4] === 0x6A && bytes[5] === 0x50 && bytes[6] === 0x20 && bytes[7] === 0x20) ||
      (bytes[0] === 0xFF && bytes[1] === 0x4F && bytes[2] === 0xFF && bytes[3] === 0x51)
    ) {
      const isCodestream = bytes[0] === 0xFF;
      return {
        format: isCodestream ? 'j2k' : 'jp2',
        mimeType: isCodestream ? 'image/j2k' : 'image/jp2',
        extension: isCodestream ? 'j2k' : 'jp2',
        label: isCodestream ? 'JPEG 2000 Codestream' : 'JPEG 2000 (JP2)',
        category: 'modern-image',
        signatureVerified: true,
        signatureName: 'JPEG 2000 Header',
        confidence: 1.0
      };
    }

    // JPEG XL: JXL codestream (FF 0A) or container
    if (
      (bytes[0] === 0xFF && bytes[1] === 0x0A) ||
      (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
       bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20)
    ) {
      return {
        format: 'jxl',
        mimeType: 'image/jxl',
        extension: 'jxl',
        label: 'JPEG XL',
        category: 'modern-image',
        signatureVerified: true,
        signatureName: 'JPEG XL Marker',
        confidence: 1.0
      };
    }

    // PostScript EPS / Adobe Illustrator (AI): binary EPS header (C5 D0 D3 C6) or PostScript ASCII (%!PS)
    if (
      (bytes[0] === 0xC5 && bytes[1] === 0xD0 && bytes[2] === 0xD3 && bytes[3] === 0xC6) ||
      (bytes[0] === 0x25 && bytes[1] === 0x21 && bytes[2] === 0x50 && bytes[3] === 0x53)
    ) {
      const isAi = (fileExt || '').toLowerCase() === 'ai';
      return {
        format: isAi ? 'ai' : 'eps',
        mimeType: isAi ? 'application/illustrator' : 'application/postscript',
        extension: isAi ? 'ai' : 'eps',
        label: isAi ? 'Adobe Illustrator (AI)' : 'Encapsulated PostScript (EPS)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: isAi ? 'Illustrator PostScript Stream' : 'EPS PostScript Header',
        confidence: 0.95
      };
    }

    // TGA: header inspection
    if (bytes.length >= 18 && (fileExt === 'tga' || bytes[1] <= 1 && (bytes[2] === 2 || bytes[2] === 3 || bytes[2] === 10 || bytes[2] === 11))) {
      const pixelDepth = bytes[16];
      if (pixelDepth === 8 || pixelDepth === 15 || pixelDepth === 16 || pixelDepth === 24 || pixelDepth === 32) {
        return {
          format: 'tga',
          mimeType: 'image/x-tga',
          extension: 'tga',
          label: 'Truevision TGA',
          category: 'image',
          signatureVerified: true,
          signatureName: 'Truevision Targa Header',
          confidence: 0.95
        };
      }
    }

    // Quite OK Image (QOI): 'qoif' (71 6F 69 66)
    if (bytes.length >= 4 && bytes[0] === 0x71 && bytes[1] === 0x6F && bytes[2] === 0x69 && bytes[3] === 0x66) {
      return {
        format: 'qoi',
        mimeType: 'image/x-qoi',
        extension: 'qoi',
        label: 'Quite OK Image (QOI)',
        category: 'modern-image',
        signatureVerified: true,
        signatureName: 'QOI Format Marker ("qoif")',
        confidence: 1.0
      };
    }

    // Khronos Texture (KTX 1.0 & KTX 2.0)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0xAB && bytes[1] === 0x4B && bytes[2] === 0x54 && bytes[3] === 0x58 &&
      bytes[4] === 0x20 && (bytes[5] === 0x31 || bytes[5] === 0x32) && (bytes[6] === 0x31 || bytes[6] === 0x30) &&
      bytes[7] === 0xBB && bytes[8] === 0x0D && bytes[9] === 0x0A && bytes[10] === 0x1A && bytes[11] === 0x0A
    ) {
      const isKtx2 = bytes[5] === 0x32;
      return {
        format: isKtx2 ? 'ktx2' : 'ktx',
        mimeType: isKtx2 ? 'image/ktx2' : 'image/ktx',
        extension: isKtx2 ? 'ktx2' : 'ktx',
        label: isKtx2 ? 'Khronos Texture 2.0 (KTX2)' : 'Khronos Texture (KTX)',
        category: 'image',
        signatureVerified: true,
        signatureName: isKtx2 ? 'KTX 2.0 Identifier' : 'KTX 1.1 Identifier',
        confidence: 1.0
      };
    }

    // PowerVR Texture (PVR)
    if (
      (bytes.length >= 52 && (
        (bytes[0] === 0x03 && bytes[1] === 0x50 && bytes[2] === 0x56 && bytes[3] === 0x52) ||
        (bytes[0] === 0x50 && bytes[1] === 0x56 && bytes[2] === 0x52 && bytes[3] === 0x03) ||
        (bytes[44] === 0x21 && bytes[45] === 0x52 && bytes[46] === 0x56 && bytes[47] === 0x50) ||
        (bytes[44] === 0x50 && bytes[45] === 0x56 && bytes[46] === 0x52 && bytes[47] === 0x21)
      )) || (fileExt || '').toLowerCase() === 'pvr'
    ) {
      return {
        format: 'pvr',
        mimeType: 'image/x-pvr',
        extension: 'pvr',
        label: 'PowerVR Texture (PVR)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'PowerVR Texture Header',
        confidence: 1.0
      };
    }

    // GIMP XCF: 'gimp xcf'
    if (
      bytes.length >= 14 &&
      bytes[0] === 0x67 && bytes[1] === 0x69 && bytes[2] === 0x6D && bytes[3] === 0x70 &&
      bytes[4] === 0x20 && bytes[5] === 0x78 && bytes[6] === 0x63 && bytes[7] === 0x66
    ) {
      return {
        format: 'xcf',
        mimeType: 'image/x-xcf',
        extension: 'xcf',
        label: 'GIMP Image Document (XCF)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'GIMP XCF Header',
        confidence: 1.0
      };
    }

    // Windows Metafile (WMF) & Enhanced Metafile (EMF)
    if (
      (bytes.length >= 18 && (
        (bytes[0] === 0xD7 && bytes[1] === 0xCD && bytes[2] === 0xC6 && bytes[3] === 0x9A) ||
        (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes[2] === 0x09 && bytes[3] === 0x00)
      )) || (fileExt || '').toLowerCase() === 'wmf'
    ) {
      return {
        format: 'wmf',
        mimeType: 'image/x-wmf',
        extension: 'wmf',
        label: 'Windows Metafile (WMF)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'Windows Metafile (WMF) Header',
        confidence: 0.95
      };
    }

    if (
      (bytes.length >= 44 && bytes[0] === 0x01 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x00 &&
       bytes[40] === 0x20 && bytes[41] === 0x45 && bytes[42] === 0x4D && bytes[43] === 0x46) ||
      (fileExt || '').toLowerCase() === 'emf'
    ) {
      return {
        format: 'emf',
        mimeType: 'image/x-emf',
        extension: 'emf',
        label: 'Enhanced Metafile (EMF)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'Enhanced Metafile (EMF) Header',
        confidence: 0.95
      };
    }

    // CorelDRAW RIFF & Corel Exchange (CMX)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x43
    ) {
      const typeStr = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      const isCmx = typeStr.startsWith('CMX');
      const isCdr = typeStr.startsWith('CDR');
      if (isCmx || isCdr || (fileExt || '').toLowerCase() === 'cdr' || (fileExt || '').toLowerCase() === 'cmx') {
        const fmt = isCmx ? 'cmx' : 'cdr';
        return {
          format: fmt,
          mimeType: isCmx ? 'image/x-cmx' : 'application/vnd.corel-draw',
          extension: fmt,
          label: isCmx ? 'Corel Presentation Exchange (CMX)' : 'CorelDRAW Vector Document (CDR)',
          category: 'graphics',
          signatureVerified: true,
          signatureName: `Corel RIFF Container (${typeStr})`,
          confidence: 1.0
        };
      }
    }

    // Corel Photo-Paint (CPT)
    if (
      (bytes.length >= 7 && bytes[0] === 0x43 && bytes[1] === 0x50 && bytes[2] === 0x54) ||
      (fileExt || '').toLowerCase() === 'cpt'
    ) {
      return {
        format: 'cpt',
        mimeType: 'image/x-corelphotopaint',
        extension: 'cpt',
        label: 'Corel Photo-Paint (CPT)',
        category: 'image',
        signatureVerified: true,
        signatureName: 'Corel Photo-Paint Header',
        confidence: 0.95
      };
    }

    // WordPerfect Graphics (WPG)
    if (
      (bytes.length >= 4 && bytes[0] === 0xFF && bytes[1] === 0x57 && bytes[2] === 0x50 && bytes[3] === 0x43) ||
      (fileExt || '').toLowerCase() === 'wpg'
    ) {
      return {
        format: 'wpg',
        mimeType: 'image/x-wpg',
        extension: 'wpg',
        label: 'WordPerfect Graphics (WPG)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'WordPerfect Graphics Marker',
        confidence: 0.95
      };
    }

    // Compressed SVG (SVGZ): 1F 8B 08
    if (bytes[0] === 0x1F && bytes[1] === 0x8B && bytes[2] === 0x08 && (fileExt || '').toLowerCase() === 'svgz') {
      return {
        format: 'svgz',
        mimeType: 'image/svg+xml-compressed',
        extension: 'svgz',
        label: 'Compressed SVG (SVGZ)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'Gzip-Compressed SVG Stream',
        confidence: 1.0
      };
    }

    // JPEG XL Container Box: 00 00 00 0C 4A 58 4C 20 0D 0A 87 0A
    if (bytes.length >= 12 && bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20) {
      return {
        format: 'jxl',
        mimeType: 'image/jxl',
        extension: 'jxl',
        label: 'JPEG XL',
        category: 'modern-image',
        signatureVerified: true,
        signatureName: 'ISO BMFF Box (JPEG XL)',
        confidence: 1.0
      };
    }

    // ISO Base Media File Format: check ftyp box at offset 4
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();

      // Canon CR3 RAW: ftypcrx
      if (brand.startsWith('crx') || brand.includes('crx')) {
        return {
          format: 'cr3',
          mimeType: 'image/x-canon-cr3',
          extension: 'cr3',
          label: 'Canon RAW (CR3)',
          category: 'image',
          signatureVerified: true,
          signatureName: 'Canon CR3 Container',
          confidence: 1.0
        };
      }
      
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

      // JPEG XL ISOBMFF container
      if (brand.includes('jxl')) {
        return {
          format: 'jxl',
          mimeType: 'image/jxl',
          extension: 'jxl',
          label: 'JPEG XL',
          category: 'modern-image',
          signatureVerified: true,
          signatureName: 'ISO BMFF Box (JPEG XL)',
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

      if (sliceString.includes('openraster') || sliceString.includes('mergedimage.png') || fileExt === 'ora') {
        return {
          format: 'ora',
          mimeType: 'image/openraster',
          extension: 'ora',
          label: 'OpenRaster Document (ORA)',
          category: 'image',
          signatureVerified: true,
          signatureName: 'OpenRaster Container (mergedimage.png)',
          confidence: 1.0
        };
      }

      if (sliceString.includes('application/x-krita') || (sliceString.includes('maindoc.xml') && sliceString.includes('mergedimage.png')) || fileExt === 'kra') {
        return {
          format: 'kra',
          mimeType: 'application/x-krita',
          extension: 'kra',
          label: 'Krita Image Document (KRA)',
          category: 'image',
          signatureVerified: true,
          signatureName: 'Krita Package Container',
          confidence: 1.0
        };
      }

      if (sliceString.includes('application/vnd.adobe.indesign-idml-package') || sliceString.includes('designmap.xml') || fileExt === 'idml') {
        return {
          format: 'idml',
          mimeType: 'application/vnd.adobe.indesign-idml-package',
          extension: 'idml',
          label: 'Adobe InDesign IDML Package',
          category: 'document',
          signatureVerified: true,
          signatureName: 'InDesign IDML Package Container',
          confidence: 1.0
        };
      }

      if (sliceString.includes('content/root.dat') || sliceString.includes('previews/thumbnail.png') || fileExt === 'cdr') {
        return {
          format: 'cdr',
          mimeType: 'application/vnd.corel-draw',
          extension: 'cdr',
          label: 'CorelDRAW Vector Document (CDR)',
          category: 'graphics',
          signatureVerified: true,
          signatureName: 'CorelDRAW Package Container',
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

    // AutoCAD DWG: AC10xx
    if (
      bytes.length >= 6 &&
      bytes[0] === 0x41 && bytes[1] === 0x43 && bytes[2] === 0x31 && bytes[3] === 0x30
    ) {
      return {
        format: 'dwg',
        mimeType: 'image/vnd.dwg',
        extension: 'dwg',
        label: 'AutoCAD DWG Drawing',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'AutoCAD DWG Binary Header (AC10xx)',
        confidence: 1.0
      };
    }

    // JPEG XL Naked Codestream: FF 0A
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0x0A) {
      return {
        format: 'jxl',
        mimeType: 'image/jxl',
        extension: 'jxl',
        label: 'JPEG XL',
        category: 'modern-image',
        signatureVerified: true,
        signatureName: 'JPEG XL Codestream Marker (FF 0A)',
        confidence: 1.0
      };
    }

    // Computer Graphics Metafile (CGM) Binary: 00 20 or fileExt === 'cgm'
    if (
      bytes.length >= 4 &&
      ((bytes[0] === 0x00 && (bytes[1] & 0xFE) === 0x20) || fileExt === 'cgm')
    ) {
      return {
        format: 'cgm',
        mimeType: 'image/cgm',
        extension: 'cgm',
        label: 'Computer Graphics Metafile (CGM)',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'CGM Metafile Header',
        confidence: 0.95
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

    // 5. DXF CAD Drawing: SECTION HEADER
    if (/^\s*0\s*[\r\n]+\s*SECTION\s*[\r\n]+\s*2\s*[\r\n]+\s*HEADER/i.test(text) || fileExt === 'dxf') {
      return {
        format: 'dxf',
        mimeType: 'application/dxf',
        extension: 'dxf',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'AutoCAD DXF Header Record',
        confidence: 0.95
      };
    }

    // 6. CGM Clear Text: BEGMF
    if (/BEGMF\b/i.test(text) || /BEGPIC\b/i.test(text) || fileExt === 'cgm') {
      return {
        format: 'cgm',
        mimeType: 'image/cgm',
        extension: 'cgm',
        category: 'graphics',
        signatureVerified: true,
        signatureName: 'CGM Clear Text Header (BEGMF)',
        confidence: 0.95
      };
    }

    // 7. CSV: Tabular comma/semicolon separated lines
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
      bmp: 'image',
      svg: 'graphics',
      avif: 'modern-image',
      heic: 'modern-image',
      heif: 'modern-image',
      jxl: 'modern-image',
      tiff: 'image',
      tif: 'image',
      psd: 'image',
      psb: 'image',
      tga: 'image',
      ico: 'image',
      icns: 'image',
      pcx: 'image',
      ppm: 'image',
      pgm: 'image',
      pbm: 'image',
      pnm: 'image',
      hdr: 'image',
      exr: 'image',
      fits: 'image',
      fit: 'image',
      raw: 'image',
      dng: 'image',
      cr2: 'image',
      cr3: 'image',
      nef: 'image',
      arw: 'image',
      raf: 'image',
      orf: 'image',
      rw2: 'image',
      pef: 'image',
      dds: 'image',
      jp2: 'modern-image',
      j2k: 'modern-image',
      eps: 'graphics',
      ai: 'graphics',
      cdr: 'graphics',
      kra: 'image',
      idml: 'document',
      dxf: 'graphics',
      dwg: 'graphics',
      cgm: 'graphics',
      wmf: 'graphics',
      emf: 'graphics',
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
    let normalizedFormat = ext;
    if (ext === 'jpeg') normalizedFormat = 'jpg';
    if (ext === 'tif') normalizedFormat = 'tiff';
    if (ext === 'fit') normalizedFormat = 'fits';

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
    if ((primaryExt === 'tiff' && actualExt === 'tif') || (primaryExt === 'tif' && actualExt === 'tiff')) return true;
    if ((primaryExt === 'fits' && actualExt === 'fit') || (primaryExt === 'fit' && actualExt === 'fits')) return true;
    if ((primaryExt === 'psd' && actualExt === 'psb') || (primaryExt === 'psb' && actualExt === 'psd')) return true;
    if ((primaryExt === 'vcf' && actualExt === 'vcard') || (primaryExt === 'vcard' && actualExt === 'vcf')) return true;
    const rawExts = ['raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'];
    if (rawExts.includes(primaryExt) && rawExts.includes(actualExt)) return true;
    return false;
  }
}
