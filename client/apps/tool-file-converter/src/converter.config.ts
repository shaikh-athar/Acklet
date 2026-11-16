// apps/tool-file-converter/src/converter.config.ts

export interface TargetFormatOption {
  format: string;
  label: string;
  description: string;
  icon?: string;
  applicableSourceCategories?: string[]; // 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION'
  isBeta?: boolean;
  limitDescription?: string;
  recommendationScore?: number;
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

export function formatDisplayLabel(fmt: string): string {
  const lower = fmt.toLowerCase();
  switch (lower) {
    case 'pdf': return 'PDF';
    case 'docx':
    case 'doc': return 'Word';
    case 'xlsx':
    case 'xls':
    case 'ods': return 'Excel';
    case 'pptx':
    case 'ppt':
    case 'odp': return 'PowerPoint';
    case 'csv': return 'CSV';
    case 'tsv': return 'TSV';
    case 'txt': return 'Text';
    case 'md': return 'Markdown';
    case 'json': return 'JSON';
    case 'yaml':
    case 'yml': return 'YAML';
    case 'xml': return 'XML';
    case 'srt': return 'SRT';
    case 'vtt': return 'VTT';
    case 'vcf': return 'VCF';
    case 'jpg':
    case 'jpeg': return 'JPG';
    case 'png': return 'PNG';
    case 'webp': return 'WebP';
    case 'svg': return 'SVG';
    case 'html': return 'HTML';
    default: return lower.toUpperCase();
  }
}

export function getTargetFormatMeta(
  ext: string,
  capabilities: Array<{ inputType: string; outputType: string; tier?: string; limitDescription?: string; recommendationScore?: number }> = []
): TargetFormatOption {
  const lower = ext.toLowerCase();
  const meta = TARGET_FORMAT_METADATA[lower];
  const cap = capabilities.find(c => c.outputType.toLowerCase() === lower);
  const isBeta = cap?.tier === 'beta';
  const limitDescription = cap?.limitDescription;
  const recommendationScore = cap?.recommendationScore;

  if (meta) {
    return {
      format: lower,
      label: meta.label,
      description: meta.description,
      icon: meta.icon,
      isBeta,
      limitDescription,
      recommendationScore
    };
  }
  return {
    format: lower,
    label: `${lower.toUpperCase()} (.${lower})`,
    description: `Convert to ${lower.toUpperCase()} format`,
    icon: 'file',
    isBeta,
    limitDescription,
    recommendationScore
  };
}

export interface PopularConversionItem {
  inputCategories?: string[];
  inputFormats: string[];
  target: string;
  label: string;
  usage?: number;
  isBeta?: boolean;
  limitDescription?: string;
}

export const POPULAR_CONVERSIONS_LIST: PopularConversionItem[] = [
  { inputFormats: ['pdf'], target: 'docx', label: 'PDF → Word', usage: 100, isBeta: true, limitDescription: 'Formatting and complex tables may require manual adjustment.' },
  { inputFormats: ['docx', 'doc', 'odt', 'rtf'], target: 'pdf', label: 'Word → PDF', usage: 99 },
  { inputFormats: ['pdf'], target: 'jpg', label: 'PDF → JPG', usage: 98 },
  { inputFormats: ['xlsx', 'xls', 'ods', 'csv'], target: 'csv', label: 'Excel → CSV', usage: 97 },
  { inputFormats: ['pptx', 'ppt', 'odp'], target: 'pdf', label: 'PowerPoint → PDF', usage: 96 },
  { inputFormats: ['md'], target: 'pdf', label: 'Markdown → PDF', usage: 95 },
  { inputFormats: ['json'], target: 'csv', label: 'JSON → CSV', usage: 94 },
  { inputFormats: ['srt'], target: 'vtt', label: 'SRT → VTT', usage: 93 },
  { inputFormats: ['xlsx', 'xls', 'ods', 'csv'], target: 'pdf', label: 'Excel → PDF', usage: 92 },
  { inputFormats: ['csv'], target: 'xlsx', label: 'CSV → Excel', usage: 91 },
  { inputFormats: ['vcf'], target: 'csv', label: 'VCF → CSV', usage: 90 },
  { inputFormats: ['jpg', 'jpeg'], target: 'png', label: 'JPG → PNG', usage: 89 },
  { inputFormats: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff'], target: 'pdf', label: 'Image → PDF', usage: 86 }
];

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif', 'heic']);
const DOC_EXTS = new Set(['docx', 'doc', 'odt', 'rtf', 'txt', 'html', 'md', 'epub']);
const SHEET_EXTS = new Set(['xlsx', 'xls', 'ods', 'csv', 'tsv']);
const PRESENTATION_EXTS = new Set(['pptx', 'ppt', 'odp']);

export function computeRecommendedTarget(
  inputFormats: string[],
  availableTargets: string[],
  capabilities: Array<{ inputType: string; outputType: string; status: string; recommendationScore?: number }> = []
): string | null {
  if (availableTargets.length === 0) return null;
  const exts = inputFormats.map(e => e.toLowerCase());

  // Pick highest recommendationScore from capabilities for current inputs
  if (capabilities && capabilities.length > 0) {
    let best = availableTargets[0];
    let maxScore = -1;
    for (const tgt of availableTargets) {
      const matches = capabilities.filter(c =>
        exts.includes(c.inputType.toLowerCase()) &&
        c.outputType.toLowerCase() === tgt &&
        c.status === 'tested'
      );
      if (matches.length > 0) {
        const score = matches.reduce((acc, m) => acc + (m.recommendationScore ?? 0), 0) / matches.length;
        if (score > maxScore) {
          maxScore = score;
          best = tgt;
        }
      }
    }
    if (maxScore > 0) return best;
  }

  // Category-based fallback
  const allImages = exts.length > 0 && exts.every(e => IMAGE_EXTS.has(e));
  if (allImages) {
    if (availableTargets.includes('webp')) return 'webp';
    if (availableTargets.includes('png')) return 'png';
    if (availableTargets.includes('jpg')) return 'jpg';
    return availableTargets[0];
  }

  const allPdfs = exts.length > 0 && exts.every(e => e === 'pdf');
  if (allPdfs) {
    if (availableTargets.includes('docx')) return 'docx';
    if (availableTargets.includes('txt')) return 'txt';
    if (availableTargets.includes('xlsx')) return 'xlsx';
    if (availableTargets.includes('jpg')) return 'jpg';
    return availableTargets[0];
  }

  const allDocs = exts.length > 0 && exts.every(e => DOC_EXTS.has(e));
  if (allDocs) {
    if (availableTargets.includes('pdf')) return 'pdf';
    if (availableTargets.includes('docx')) return 'docx';
    return availableTargets[0];
  }

  const allSheets = exts.length > 0 && exts.every(e => SHEET_EXTS.has(e));
  if (allSheets) {
    if (availableTargets.includes('pdf')) return 'pdf';
    if (availableTargets.includes('xlsx')) return 'xlsx';
    if (availableTargets.includes('csv')) return 'csv';
    return availableTargets[0];
  }

  const allPresentations = exts.length > 0 && exts.every(e => PRESENTATION_EXTS.has(e));
  if (allPresentations) {
    if (availableTargets.includes('pdf')) return 'pdf';
    return availableTargets[0];
  }

  if (availableTargets.includes('pdf')) return 'pdf';
  return availableTargets[0];
}

export function computeCommonTestedTargets(
  inputFormats: string[],
  capabilities: Array<{ inputType: string; outputType: string; status: string; tier?: string }> = []
): string[] {
  if (inputFormats.length === 0) return [];

  const perFileTargets = inputFormats.map(rawExt => {
    const src = rawExt.toLowerCase();
    if (capabilities && capabilities.length > 0) {
      const tested = capabilities
        .filter(c =>
          c.inputType.toLowerCase() === src &&
          (c.status === 'tested' || c.status === 'stable') &&
          c.tier !== 'not_offered' &&
          c.outputType.toLowerCase() !== src
        )
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

