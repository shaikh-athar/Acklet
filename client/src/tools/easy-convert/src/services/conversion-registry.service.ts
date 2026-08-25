export type EngineType = 'client' | 'server';

export interface ConversionCapability {
  inputFormat: string;
  outputFormat: string;
  engine: EngineType;
  label: string;
  isRecommended?: boolean;
  privacyBadgeText: string;
  privacyIcon: string;
  supportsAdvancedOptions: boolean;
}

export interface AdvancedConversionOptions {
  quality?: number;           // 0.1 to 1.0 (for JPG/WebP)
  orientation?: 'portrait' | 'landscape';
  pageRange?: string;         // e.g. "1-5", "3,5,8"
  stripMetadata?: boolean;
}

export class ConversionRegistryService {
  /**
   * CAPABILITY MATRIX — Only pairs with a real implementation are listed here.
   * Adding a pair without a working engine causes corrupt output. Don't do it.
   *
   * Client engine: Canvas API (images), string transform (text/markup)
   * Server engine: Apache PDFBox + Apache POI (PDF↔DOCX)
   */
  private static matrix: ConversionCapability[] = [
    // ── Image conversions (100% In-Browser Canvas) ──────────────────────────────
    { inputFormat: 'png',  outputFormat: 'jpg',  engine: 'client', label: 'JPG Image',  isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'png',  outputFormat: 'webp', engine: 'client', label: 'WebP Image', privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'jpg',  outputFormat: 'png',  engine: 'client', label: 'PNG Image',  isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'jpg',  outputFormat: 'webp', engine: 'client', label: 'WebP Image', privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'jpeg', outputFormat: 'png',  engine: 'client', label: 'PNG Image',  isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'jpeg', outputFormat: 'webp', engine: 'client', label: 'WebP Image', privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'webp', outputFormat: 'png',  engine: 'client', label: 'PNG Image',  isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },
    { inputFormat: 'webp', outputFormat: 'jpg',  engine: 'client', label: 'JPG Image',  privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: true },

    // ── Text & Markup documents (100% In-Browser string transform) ───────────────
    { inputFormat: 'txt',  outputFormat: 'md',   engine: 'client', label: 'Markdown',       isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },
    { inputFormat: 'txt',  outputFormat: 'html', engine: 'client', label: 'HTML Webpage',   privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },
    { inputFormat: 'md',   outputFormat: 'txt',  engine: 'client', label: 'Plain Text',     isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },
    { inputFormat: 'md',   outputFormat: 'html', engine: 'client', label: 'HTML Webpage',   privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },

    // ── CSV conversions (100% In-Browser) ────────────────────────────────────────
    { inputFormat: 'csv',  outputFormat: 'json', engine: 'client', label: 'JSON Data',      isRecommended: true, privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },
    { inputFormat: 'csv',  outputFormat: 'txt',  engine: 'client', label: 'Plain Text',     privacyBadgeText: 'Processed in your browser', privacyIcon: 'shield-check', supportsAdvancedOptions: false },

    // ── PDF & Office — Server Execution (Apache PDFBox + Apache POI) ─────────────
    { inputFormat: 'pdf',  outputFormat: 'txt',  engine: 'server', label: 'Plain Text (TXT)',         isRecommended: true,  privacyBadgeText: 'Secure server processing · Auto-deleted in 1h', privacyIcon: 'lock', supportsAdvancedOptions: false },
    { inputFormat: 'pdf',  outputFormat: 'docx', engine: 'server', label: 'Word Document (DOCX)',     isRecommended: true,  privacyBadgeText: 'Secure server processing · Auto-deleted in 1h', privacyIcon: 'lock', supportsAdvancedOptions: false },
    { inputFormat: 'docx', outputFormat: 'pdf',  engine: 'server', label: 'PDF Document',            isRecommended: true,  privacyBadgeText: 'Secure server processing · Auto-deleted in 1h', privacyIcon: 'lock', supportsAdvancedOptions: false },
    { inputFormat: 'docx', outputFormat: 'txt',  engine: 'server', label: 'Plain Text (TXT)',         privacyBadgeText: 'Secure server processing · Auto-deleted in 1h', privacyIcon: 'lock', supportsAdvancedOptions: false },
  ];

  static getCapabilitiesForExtension(ext: string): ConversionCapability[] {
    return this.matrix.filter(cap => cap.inputFormat === ext.toLowerCase());
  }

  static getCapability(inputExt: string, outputExt: string): ConversionCapability | undefined {
    return this.matrix.find(
      cap => cap.inputFormat === inputExt.toLowerCase() && cap.outputFormat === outputExt.toLowerCase()
    );
  }

  static getPrivacyBadge(inputExt: string, outputExt?: string): { text: string; icon: string; isLocal: boolean } {
    if (!outputExt) return { text: 'Processed in your browser', icon: 'shield-check', isLocal: true };
    const cap = this.getCapability(inputExt, outputExt);
    if (cap?.engine === 'server') {
      return { text: 'Secure server processing · Temporary file', icon: 'lock', isLocal: false };
    }
    return { text: 'Processed in your browser', icon: 'shield-check', isLocal: true };
  }
}
