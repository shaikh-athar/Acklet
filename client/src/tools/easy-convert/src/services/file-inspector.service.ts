export interface FileInspectionResult {
  isValid: boolean;
  detectedMimeType: string;
  signatureName: string;
  magicHeaderHex: string;
  isEncrypted?: boolean;
  hasDigitalSignature?: boolean;
  hasExifMetadata?: boolean;
  hasActiveContent?: boolean;
  errorMessage?: string;
  sizeInBytes: number;
}

export class FileInspectorService {
  /**
   * Magic byte signatures dictionary
   */
  private static magicSignatures: Array<{ name: string; mime: string; bytes: number[]; mask?: number[] }> = [
    { name: 'PDF Document', mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    { name: 'PNG Image', mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { name: 'JPEG Image', mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
    { name: 'WebP Image', mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { name: 'ZIP Archive', mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04] }
  ];

  static async inspectFile(file: File): Promise<FileInspectionResult> {
    // SECTION 76 EDGE CASE: ZERO-BYTE FILE GUARD
    if (!file || file.size === 0) {
      return {
        isValid: false,
        detectedMimeType: 'unknown/empty',
        signatureName: 'Zero-byte Empty File',
        magicHeaderHex: '0x00',
        sizeInBytes: 0,
        errorMessage: 'File is completely empty (0 bytes). Cannot convert empty files.'
      };
    }

    try {
      const headerBuffer = await file.slice(0, 32).arrayBuffer();
      const bytes = new Uint8Array(headerBuffer);
      const hexHeader = Array.from(bytes.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      // Match magic signature
      let matchedSignature = this.magicSignatures.find(sig =>
        sig.bytes.every((b, idx) => bytes[idx] === b)
      );

      // Inspect text / markdown / csv files
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!matchedSignature && ['txt', 'md', 'csv', 'json', 'html', 'xml'].includes(ext)) {
        matchedSignature = { name: `${ext.toUpperCase()} Text Payload`, mime: 'text/plain', bytes: [] };
      }

      // Check extension mismatch vs header
      let isValid = true;
      let errorMessage: string | undefined;

      if (matchedSignature && matchedSignature.mime !== 'text/plain') {
        if (ext === 'jpg' || ext === 'jpeg') {
          if (!matchedSignature.mime.includes('jpeg')) isValid = false;
        } else if (ext === 'png') {
          if (!matchedSignature.mime.includes('png')) isValid = false;
        } else if (ext === 'pdf') {
          if (!matchedSignature.mime.includes('pdf')) isValid = false;
        } else if (ext === 'webp') {
          if (!matchedSignature.mime.includes('webp')) isValid = false;
        }
      }

      if (!isValid) {
        errorMessage = `File extension (.${ext}) does not match detected binary magic header signature (${matchedSignature?.name || hexHeader}).`;
      }

      // PDF Password Protection, Digital Signature & Active Content Inspection
      let isEncrypted = false;
      let hasDigitalSignature = false;
      let hasActiveContent = false;

      if (ext === 'pdf' || matchedSignature?.mime === 'application/pdf') {
        const textChunk = await file.slice(0, Math.min(file.size, 50000)).text().catch(() => '');
        if (textChunk.includes('/Encrypt')) {
          isEncrypted = true;
          isValid = false;
          errorMessage = 'PDF file is password protected or encrypted.';
        }
        if (textChunk.includes('/ByteRange') || textChunk.includes('/Sig')) {
          hasDigitalSignature = true;
        }
        if (textChunk.includes('/JavaScript') || textChunk.includes('/JS') || textChunk.includes('/AA') || textChunk.includes('/OpenAction')) {
          hasActiveContent = true;
        }
      }

      // Office Macro Active Content Detection (Section 23)
      if (['docm', 'xlsm', 'pptm', 'dotm'].includes(ext)) {
        hasActiveContent = true;
      }

      // Image EXIF Metadata Detection
      let hasExifMetadata = false;
      if (matchedSignature?.mime === 'image/jpeg') {
        hasExifMetadata = bytes[2] === 0xFF && (bytes[3] === 0xE1 || bytes[3] === 0xE0);
      }

      return {
        isValid,
        detectedMimeType: matchedSignature?.mime || file.type || 'unknown/binary',
        signatureName: matchedSignature?.name || 'Unknown Binary Stream',
        magicHeaderHex: hexHeader,
        isEncrypted,
        hasDigitalSignature,
        hasExifMetadata,
        hasActiveContent,
        errorMessage,
        sizeInBytes: file.size
      };

    } catch (e: any) {
      return {
        isValid: false,
        detectedMimeType: 'unknown/corrupted',
        signatureName: 'Corrupted File Payload',
        magicHeaderHex: '0x00',
        sizeInBytes: file.size,
        errorMessage: `Failed to inspect file binary header: ${e.message}`
      };
    }
  }
}
