export type EasyConvertErrorCode =
  | 'INVALID_FILE'
  | 'CORRUPTED_FILE'
  | 'UNSUPPORTED_FORMAT'
  | 'MIME_MISMATCH'
  | 'FILE_TOO_LARGE'
  | 'PASSWORD_PROTECTED'
  | 'DIGITAL_SIGNATURE_WARNING'
  | 'ACTIVE_CONTENT_WARNING'
  | 'CONVERSION_TIMEOUT'
  | 'ENGINE_FAILURE'
  | 'CANCELLED'
  | 'UNKNOWN_FAILURE';

export interface UserFacingError {
  code: EasyConvertErrorCode;
  title: string;
  reason: string;
  suggestedActions: string[];
  isRecoverable: boolean;
}

export class ErrorTaxonomy {
  private static sanitizeDetails(details?: string): string | undefined {
    if (!details) return undefined;
    // Strip stack traces, absolute paths, and internal exceptions for UI security (Section 19)
    let clean = details.split('\n')[0]; // First line only
    clean = clean.replace(/([a-zA-Z]:\\[^:\n]+|\/[^:\n]+)/g, '[local path]');
    clean = clean.replace(/at\s+[\w\$.]+\s+\([^)]+\)/g, '');
    return clean.trim().length > 0 ? clean : undefined;
  }

  static formatError(code: EasyConvertErrorCode, filename: string, rawDetails?: string): UserFacingError {
    const details = this.sanitizeDetails(rawDetails);

    switch (code) {
      case 'MIME_MISMATCH':
        return {
          code,
          title: 'File Type Mismatch',
          reason: details || `The file extension says ${filename.split('.').pop()?.toUpperCase() || 'format'}, but the file contents appear to be different. Please choose another file.`,
          suggestedActions: [
            'Verify the original file extension',
            'Choose another file format',
            'Inspect original document source'
          ],
          isRecoverable: false
        };

      case 'PASSWORD_PROTECTED':
        return {
          code,
          title: 'Password-Protected File',
          reason: `This document (${filename}) requires a password before it can be converted.`,
          suggestedActions: [
            'Provide document password',
            'Remove password protection before uploading'
          ],
          isRecoverable: true
        };

      case 'DIGITAL_SIGNATURE_WARNING':
        return {
          code,
          title: 'Digital Signature Warning',
          reason: `${filename} contains an official digital signature. Converting will invalidate this signature.`,
          suggestedActions: [
            'Confirm conversion without signature preservation',
            'Keep original file for legal validation'
          ],
          isRecoverable: true
        };

      case 'FILE_TOO_LARGE':
        return {
          code,
          title: 'File Exceeds Size Limit',
          reason: `${filename} exceeds the maximum supported client browser memory threshold (100 MB).`,
          suggestedActions: [
            'Compress original file before uploading',
            'Use chunked stream mode'
          ],
          isRecoverable: false
        };

      case 'UNSUPPORTED_FORMAT':
        return {
          code,
          title: 'Format Conversion Unavailable',
          reason: details || 'This conversion is not available yet.',
          suggestedActions: [
            'Try converting to Plain Text or PDF',
            'Choose a supported format'
          ],
          isRecoverable: false
        };

      case 'CANCELLED':
        return {
          code,
          title: 'Conversion Cancelled',
          reason: `Conversion for ${filename} was stopped by user request.`,
          suggestedActions: [
            'Click Retry to restart conversion'
          ],
          isRecoverable: true
        };

      case 'CONVERSION_TIMEOUT':
        return {
          code,
          title: 'Conversion Timeout',
          reason: `Processing for ${filename} timed out after 30 seconds.`,
          suggestedActions: [
            'Try splitting the document',
            'Click Retry to attempt again'
          ],
          isRecoverable: true
        };

      default:
        return {
          code: 'ENGINE_FAILURE',
          title: 'Conversion Failed',
          reason: details || 'The conversion engine could not determine the exact cause. Your original file has not been modified. Try again or choose another output format.',
          suggestedActions: [
            'Convert to TXT',
            'Try another file format',
            'Download the original file'
          ],
          isRecoverable: true
        };
    }
  }
}
