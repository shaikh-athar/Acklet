// apps/tool-file-converter/src/converter.config.ts

export interface TargetFormatOption {
  format: string;
  label: string;
  description: string;
  icon?: string;
  applicableSourceCategories?: string[]; // 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION'
}

export const TARGET_FORMAT_METADATA: Record<string, { label: string; description: string; icon: string }> = {
  pdf: {
    label: 'PDF Document (.pdf)',
    description: 'Universal vector-accurate PDF with font preservation',
    icon: 'file-text'
  },
  docx: {
    label: 'Word (.docx)',
    description: 'Editable Microsoft Word document with flowed typography',
    icon: 'file-edit'
  },
  doc: {
    label: 'Word 97-2003 (.doc)',
    description: 'Legacy Microsoft Word binary document format',
    icon: 'file-edit'
  },
  md: {
    label: 'Markdown (.md)',
    description: 'Lightweight formatted text with headings and clean tables',
    icon: 'file-text'
  },
  xlsx: {
    label: 'Excel (.xlsx)',
    description: 'Structured spreadsheet workbook with formula cells',
    icon: 'table'
  },
  txt: {
    label: 'Plain Text (.txt)',
    description: 'Clean extracted text content without layout artifacts',
    icon: 'file-text'
  },
  png: {
    label: 'PNG Image (.png)',
    description: 'Lossless raster graphic with transparency support',
    icon: 'image'
  },
  jpg: {
    label: 'JPEG Image (.jpg)',
    description: 'Compressed image format optimized for photographs',
    icon: 'image'
  },
  jpeg: {
    label: 'JPEG Image (.jpeg)',
    description: 'Compressed image format optimized for photographs',
    icon: 'image'
  },
  webp: {
    label: 'WebP Image (.webp)',
    description: 'Modern lightweight image format with superior compression',
    icon: 'image'
  },
  odt: {
    label: 'OpenDocument (.odt)',
    description: 'Open standard editable text document format',
    icon: 'file-text'
  },
  rtf: {
    label: 'Rich Text (.rtf)',
    description: 'Cross-platform rich text formatting standard',
    icon: 'file-text'
  },
  ods: {
    label: 'OpenDocument Sheet (.ods)',
    description: 'Open standard spreadsheet workbook format',
    icon: 'table'
  },
  csv: {
    label: 'CSV Data (.csv)',
    description: 'Universal comma-delimited tabular text format',
    icon: 'table'
  },
  tsv: {
    label: 'TSV Data (.tsv)',
    description: 'Tab-delimited tabular data format',
    icon: 'table'
  },
  pptx: {
    label: 'PowerPoint (.pptx)',
    description: 'Editable Microsoft PowerPoint presentation slides',
    icon: 'presentation'
  },
  odp: {
    label: 'OpenDocument Slides (.odp)',
    description: 'Open standard presentation document format',
    icon: 'presentation'
  },
  html: {
    label: 'HTML Document (.html)',
    description: 'Web-standard markup with structured styling',
    icon: 'code'
  },
  json: {
    label: 'JSON (.json)',
    description: 'Standard JavaScript Object Notation data structure',
    icon: 'code'
  },
  yaml: {
    label: 'YAML (.yaml)',
    description: 'Human-readable structured data serialization',
    icon: 'code'
  },
  xml: {
    label: 'XML (.xml)',
    description: 'Extensible markup language structured hierarchy',
    icon: 'code'
  },
  vtt: {
    label: 'WebVTT Subtitles (.vtt)',
    description: 'Standard Web Video Text Tracks caption format',
    icon: 'file-text'
  },
  srt: {
    label: 'SubRip Subtitles (.srt)',
    description: 'SubRip subtitle text file format',
    icon: 'file-text'
  },
  vcf: {
    label: 'vCard Contact (.vcf)',
    description: 'Electronic business card contact format',
    icon: 'file-text'
  }
};

export const FALLBACK_TESTED_TARGETS: Record<string, string[]> = {
  pdf: ['docx', 'doc', 'md', 'html', 'xlsx', 'csv', 'pptx', 'txt', 'png', 'jpg'],
  docx: ['pdf', 'doc', 'md', 'html', 'txt', 'odt', 'rtf'],
  odt: ['pdf', 'docx', 'txt', 'rtf'],
  rtf: ['pdf', 'docx', 'txt'],
  txt: ['pdf'],
  html: ['pdf'],
  xlsx: ['pdf', 'csv', 'ods'],
  xls: ['pdf', 'xlsx'],
  ods: ['pdf', 'xlsx'],
  csv: ['pdf', 'xlsx'],
  tsv: ['pdf', 'xlsx'],
  pptx: ['pdf', 'txt', 'png', 'jpg', 'odp'],
  odp: ['pdf', 'pptx', 'png', 'jpg'],
  png: ['pdf', 'jpg', 'webp', 'bmp'],
  jpg: ['pdf', 'png', 'webp', 'bmp'],
  jpeg: ['pdf', 'png', 'webp', 'bmp'],
  webp: ['pdf', 'png', 'jpg'],
  bmp: ['pdf', 'png', 'jpg', 'webp'],
  gif: ['png', 'webp'],
  ico: ['png'],
  svg: ['png'],
  json: ['yaml', 'xml'],
  yaml: ['json', 'xml'],
  yml: ['json', 'xml'],
  xml: ['json', 'yaml'],
  srt: ['vtt', 'txt'],
  vtt: ['srt'],
  vcf: ['csv']
};

export function getTargetFormatMeta(ext: string): TargetFormatOption {
  const lower = ext.toLowerCase();
  const meta = TARGET_FORMAT_METADATA[lower];
  if (meta) {
    return {
      format: lower,
      label: meta.label,
      description: meta.description,
      icon: meta.icon
    };
  }
  return {
    format: lower,
    label: `${lower.toUpperCase()} (.${lower})`,
    description: `Convert to ${lower.toUpperCase()} format`,
    icon: 'file'
  };
}

export function computeCommonTestedTargets(
  inputFormats: string[],
  capabilities: Array<{ inputType: string; outputType: string; status: string }> = []
): string[] {
  if (inputFormats.length === 0) return [];

  const perFileTargets = inputFormats.map(rawExt => {
    const src = rawExt.toLowerCase();
    if (capabilities && capabilities.length > 0) {
      const tested = capabilities
        .filter(c => c.inputType.toLowerCase() === src && c.status === 'tested' && c.outputType.toLowerCase() !== src)
        .map(c => c.outputType.toLowerCase());
      return new Set(tested);
    }
    return new Set(FALLBACK_TESTED_TARGETS[src] ?? []);
  });

  let common = Array.from(perFileTargets[0]);
  for (let i = 1; i < perFileTargets.length; i++) {
    common = common.filter(t => perFileTargets[i].has(t));
  }
  return common;
}

export interface FidelityOption {
  id: 'editable' | 'balanced' | 'exact';
  label: string;
  helperText: string;
}

export interface DocumentConverterConfig {
  maxBatchFiles: number;
  maxFileSizeBytes: number;
  defaultTargetFormat: string;
  defaultFidelity: 'editable' | 'balanced' | 'exact';
  autoPurgeTtlHours: number;
  betaSimilarityThreshold: number;
  supportedInputExtensions: string[];
  acceptedInputMimeTypes: string;
  supportedTargetFormats: TargetFormatOption[];
  fidelityOptions: FidelityOption[];
}

export const DOCUMENT_CONVERTER_CONFIG: DocumentConverterConfig = {
  maxBatchFiles: 20,
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB per file
  defaultTargetFormat: 'pdf',
  defaultFidelity: 'balanced',
  autoPurgeTtlHours: 1,
  betaSimilarityThreshold: 0.85,
  supportedInputExtensions: [
    'docx', 'doc', 'odt', 'rtf', 'txt', 'html',
    'xlsx', 'xls', 'ods', 'csv', 'tsv',
    'pptx', 'ppt', 'odp', 'pdf',
    'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg',
    'json', 'yaml', 'yml', 'xml',
    'srt', 'vtt', 'vcf'
  ],
  acceptedInputMimeTypes: '.docx,.doc,.odt,.rtf,.txt,.html,.xlsx,.xls,.ods,.csv,.tsv,.pptx,.ppt,.odp,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tiff,.svg,.json,.yaml,.yml,.xml,.srt,.vtt,.vcf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/*',
  supportedTargetFormats: [
    {
      format: 'pdf',
      label: 'PDF Document',
      description: 'Universal vector-accurate PDF with font preservation',
      icon: 'file-text',
      applicableSourceCategories: ['DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'DRAWING']
    },
    {
      format: 'docx',
      label: 'Word (.docx)',
      description: 'Editable Microsoft Word document with flowed typography',
      icon: 'file-edit',
      applicableSourceCategories: ['DOCUMENT']
    },
    {
      format: 'xlsx',
      label: 'Excel (.xlsx)',
      description: 'Structured spreadsheet workbook with formula cells',
      icon: 'table',
      applicableSourceCategories: ['SPREADSHEET']
    }
  ],
  fidelityOptions: [
    {
      id: 'editable',
      label: 'Editable text',
      helperText: 'Reflows paragraphs and optimizes headings for seamless re-editing.'
    },
    {
      id: 'balanced',
      label: 'Balanced',
      helperText: 'Balanced: Preserves layout structure while keeping typography editable.'
    },
    {
      id: 'exact',
      label: 'Exact layout',
      helperText: 'Maximum visual accuracy preserving tables, margins, and embedded media.'
    }
  ]
};

