// apps/tool-online-clipboard/src/clipboard.config.ts

export const CLIPBOARD_CONFIG = {
  maxTextSizeBytes: 1024 * 1024, // 1 MB
  maxFileSizeBytes: 200 * 1024 * 1024, // 200 MB
  textWarningThreshold: 0.8, // 80%
  chunkSize: 5 * 1024 * 1024, // 5 MB
  toastDurationMs: 6000,
  syncHighlightDurationMs: 1500,
  defaultExpiryHours: 168 // 7 days (mentioned in description/FAQ)
} as const;

export type FileCategory =
  | 'images'
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'pdfs'
  | 'videos'
  | 'audio'
  | 'archives'
  | 'code'
  | 'other';

export interface FileTypeMetadata {
  category: FileCategory;
  label: string;
  icon: string;
  color: string;
  bgTint: string;
}

export const FILE_TYPE_MAP: Record<string, FileTypeMetadata> = {
  // Images
  jpg: { category: 'images', label: 'JPEG Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  jpeg: { category: 'images', label: 'JPEG Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  png: { category: 'images', label: 'PNG Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  gif: { category: 'images', label: 'GIF Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  webp: { category: 'images', label: 'WebP Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  svg: { category: 'images', label: 'SVG Vector', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  bmp: { category: 'images', label: 'BMP Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },
  avif: { category: 'images', label: 'AVIF Image', icon: 'image', color: '#10B981', bgTint: 'rgba(16, 185, 129, 0.08)' },

  // PDFs
  pdf: { category: 'pdfs', label: 'PDF Document', icon: 'file-text', color: '#EF4444', bgTint: 'rgba(239, 68, 68, 0.08)' },

  // Documents (Word / Rich Text)
  doc: { category: 'documents', label: 'Word Document', icon: 'file-text', color: '#2563EB', bgTint: 'rgba(37, 99, 235, 0.08)' },
  docx: { category: 'documents', label: 'Word Document', icon: 'file-text', color: '#2563EB', bgTint: 'rgba(37, 99, 235, 0.08)' },
  odt: { category: 'documents', label: 'OpenDocument Text', icon: 'file-text', color: '#2563EB', bgTint: 'rgba(37, 99, 235, 0.08)' },
  rtf: { category: 'documents', label: 'Rich Text', icon: 'file-text', color: '#2563EB', bgTint: 'rgba(37, 99, 235, 0.08)' },

  // Spreadsheets
  xls: { category: 'spreadsheets', label: 'Excel Spreadsheet', icon: 'table', color: '#059669', bgTint: 'rgba(5, 150, 105, 0.08)' },
  xlsx: { category: 'spreadsheets', label: 'Excel Spreadsheet', icon: 'table', color: '#059669', bgTint: 'rgba(5, 150, 105, 0.08)' },
  csv: { category: 'spreadsheets', label: 'CSV Spreadsheet', icon: 'table', color: '#059669', bgTint: 'rgba(5, 150, 105, 0.08)' },
  ods: { category: 'spreadsheets', label: 'OpenDocument Spreadsheet', icon: 'table', color: '#059669', bgTint: 'rgba(5, 150, 105, 0.08)' },

  // Presentations
  ppt: { category: 'presentations', label: 'PowerPoint Presentation', icon: 'presentation', color: '#EA580C', bgTint: 'rgba(234, 88, 12, 0.08)' },
  pptx: { category: 'presentations', label: 'PowerPoint Presentation', icon: 'presentation', color: '#EA580C', bgTint: 'rgba(234, 88, 12, 0.08)' },
  key: { category: 'presentations', label: 'Keynote Presentation', icon: 'presentation', color: '#EA580C', bgTint: 'rgba(234, 88, 12, 0.08)' },
  odp: { category: 'presentations', label: 'OpenDocument Presentation', icon: 'presentation', color: '#EA580C', bgTint: 'rgba(234, 88, 12, 0.08)' },

  // Videos
  mp4: { category: 'videos', label: 'MP4 Video', icon: 'video', color: '#9333EA', bgTint: 'rgba(147, 51, 234, 0.08)' },
  mov: { category: 'videos', label: 'QuickTime Video', icon: 'video', color: '#9333EA', bgTint: 'rgba(147, 51, 234, 0.08)' },
  mkv: { category: 'videos', label: 'MKV Video', icon: 'video', color: '#9333EA', bgTint: 'rgba(147, 51, 234, 0.08)' },
  webm: { category: 'videos', label: 'WebM Video', icon: 'video', color: '#9333EA', bgTint: 'rgba(147, 51, 234, 0.08)' },
  avi: { category: 'videos', label: 'AVI Video', icon: 'video', color: '#9333EA', bgTint: 'rgba(147, 51, 234, 0.08)' },

  // Audio
  mp3: { category: 'audio', label: 'MP3 Audio', icon: 'music', color: '#DB2777', bgTint: 'rgba(219, 39, 119, 0.08)' },
  wav: { category: 'audio', label: 'WAV Audio', icon: 'music', color: '#DB2777', bgTint: 'rgba(219, 39, 119, 0.08)' },
  m4a: { category: 'audio', label: 'M4A Audio', icon: 'music', color: '#DB2777', bgTint: 'rgba(219, 39, 119, 0.08)' },
  flac: { category: 'audio', label: 'FLAC Audio', icon: 'music', color: '#DB2777', bgTint: 'rgba(219, 39, 119, 0.08)' },
  aac: { category: 'audio', label: 'AAC Audio', icon: 'music', color: '#DB2777', bgTint: 'rgba(219, 39, 119, 0.08)' },

  // Archives
  zip: { category: 'archives', label: 'ZIP Archive', icon: 'archive', color: '#D97706', bgTint: 'rgba(217, 119, 6, 0.08)' },
  rar: { category: 'archives', label: 'RAR Archive', icon: 'archive', color: '#D97706', bgTint: 'rgba(217, 119, 6, 0.08)' },
  '7z': { category: 'archives', label: '7-Zip Archive', icon: 'archive', color: '#D97706', bgTint: 'rgba(217, 119, 6, 0.08)' },
  tar: { category: 'archives', label: 'TAR Archive', icon: 'archive', color: '#D97706', bgTint: 'rgba(217, 119, 6, 0.08)' },
  gz: { category: 'archives', label: 'GZip Archive', icon: 'archive', color: '#D97706', bgTint: 'rgba(217, 119, 6, 0.08)' },

  // Code & text
  txt: { category: 'code', label: 'Plain Text', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  md: { category: 'code', label: 'Markdown', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  json: { category: 'code', label: 'JSON Document', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  xml: { category: 'code', label: 'XML File', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  js: { category: 'code', label: 'JavaScript', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  ts: { category: 'code', label: 'TypeScript', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  py: { category: 'code', label: 'Python Script', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  java: { category: 'code', label: 'Java File', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  html: { category: 'code', label: 'HTML File', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  css: { category: 'code', label: 'CSS Stylesheet', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' },
  sql: { category: 'code', label: 'SQL Script', icon: 'file-code', color: '#64748B', bgTint: 'rgba(100, 116, 139, 0.08)' }
};

export const FALLBACK_FILE_METADATA: FileTypeMetadata = {
  category: 'other',
  label: 'File',
  icon: 'file',
  color: '#6B7280',
  bgTint: 'rgba(107, 114, 128, 0.08)'
};

export function resolveFileMetadata(filename: string, mime?: string): FileTypeMetadata {
  if (mime && mime.startsWith('image/')) {
    const ext = filename?.split('.').pop()?.toLowerCase() || 'png';
    return FILE_TYPE_MAP[ext] || { ...FILE_TYPE_MAP['png'], label: 'Image' };
  }

  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext && FILE_TYPE_MAP[ext]) {
    return FILE_TYPE_MAP[ext];
  }

  if (ext) {
    return {
      category: 'other',
      label: ext.toUpperCase() + ' File',
      icon: 'file',
      color: '#6B7280',
      bgTint: 'rgba(107, 114, 128, 0.08)'
    };
  }

  return FALLBACK_FILE_METADATA;
}
