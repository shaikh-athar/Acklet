export class FilenameSanitizerService {
  private static readonly RESERVED_WINDOWS_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  /**
   * Sanitizes arbitrary filenames against path traversal, control chars, reserved names, and length attacks.
   */
  static sanitizeFilename(rawName: string): string {
    if (!rawName) return 'unnamed_file';

    // 1. Remove path directory components (e.g. /etc/passwd -> passwd)
    let cleaned = rawName.replace(/^.*[\\\/]/, '');

    // 2. Strip path traversal signatures (../, ..\) and null bytes
    cleaned = cleaned.replace(/\.\.[\/\\]/g, '').replace(/\0/g, '');

    // 3. Strip non-printable ASCII & control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    // 4. Split extension
    const lastDotIndex = cleaned.lastIndexOf('.');
    let base = lastDotIndex > 0 ? cleaned.substring(0, lastDotIndex) : cleaned;
    const ext = lastDotIndex > 0 ? cleaned.substring(lastDotIndex) : '';

    // 5. Guard against reserved Windows names
    if (this.RESERVED_WINDOWS_NAMES.includes(base.toUpperCase())) {
      base = `safe_${base}`;
    }

    // 6. Truncate long filenames to 200 characters max
    if (base.length > 200) {
      base = base.substring(0, 200);
    }

    return `${base}${ext}`;
  }

  /**
   * Generates a unique SHA-256 fingerprint hex string from a file buffer for duplicate detection.
   */
  static async calculateFileHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback hash based on size + modified timestamp
      return `fallback_${file.size}_${file.lastModified}_${file.name}`;
    }
  }
}
