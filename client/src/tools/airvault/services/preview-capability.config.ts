/**
 * AirVault Preview Capability Configuration
 * 
 * Single source of truth for:
 * Preview Toolbar capabilities (wordWrap, zoom, copy, download) per category / format.
 * 
 * Unrenderable files (docx, xlsx, pptx, zip, tar, rar, 7z, video, epub, etc.) have wordWrap: false, zoom: false.
 */

export interface PreviewCapabilities {
  wordWrap: boolean;
  zoom: boolean;
  canCopy: boolean;
  canDownload: boolean;
}

export const PREVIEW_CAPABILITIES: Record<string, PreviewCapabilities> = {
  // Renderable rich text / code formats
  text: { wordWrap: true, zoom: true, canCopy: true, canDownload: true },
  markdown: { wordWrap: true, zoom: true, canCopy: true, canDownload: true },
  code: { wordWrap: true, zoom: true, canCopy: true, canDownload: true },
  json: { wordWrap: true, zoom: true, canCopy: true, canDownload: true },

  // Visual renderable formats
  image: { wordWrap: false, zoom: true, canCopy: true, canDownload: true },
  pdf: { wordWrap: false, zoom: true, canCopy: false, canDownload: true },
  font: { wordWrap: false, zoom: true, canCopy: false, canDownload: true },

  // Structured table (CSV / TSV) - zoom applies to font size, wrap does not
  csv: { wordWrap: false, zoom: true, canCopy: true, canDownload: true },

  // Interactive media (Audio)
  audio: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },

  // Unrenderable metadata-only / binary formats (No zoom, no wrap)
  video: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  excel: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  word: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  powerpoint: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  archive: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  ebook: { wordWrap: false, zoom: false, canCopy: false, canDownload: true },
  url: { wordWrap: false, zoom: false, canCopy: true, canDownload: false },
  unsupported: { wordWrap: false, zoom: false, canCopy: false, canDownload: true }
};

/**
 * Resolves the preview capabilities for an item.
 */
export function getPreviewCapabilities(item?: { content?: { filename?: string; category?: string; raw?: string } } | null): PreviewCapabilities {
  if (!item?.content) return PREVIEW_CAPABILITIES['unsupported'];
  const filename = (item.content.filename || '').toLowerCase();
  const cat = (item.content.category || '').toLowerCase();

  // Extension-specific overrides
  if (/\.(docx?|docm|dotx?)$/i.test(filename)) return PREVIEW_CAPABILITIES['word'];
  if (/\.(xlsx?|xlsm|xlsb)$/i.test(filename)) return PREVIEW_CAPABILITIES['excel'];
  if (/\.(pptx?|ppsx?)$/i.test(filename)) return PREVIEW_CAPABILITIES['powerpoint'];
  if (/\.(zip|rar|7z|tar|gz|bz2|iso|dmg)$/i.test(filename)) return PREVIEW_CAPABILITIES['archive'];
  if (/\.(epub|mobi|azw3?)$/i.test(filename)) return PREVIEW_CAPABILITIES['ebook'];
  if (/\.(csv|tsv)$/i.test(filename)) return PREVIEW_CAPABILITIES['csv'];
  if (/\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/i.test(filename) || cat === 'image') return PREVIEW_CAPABILITIES['image'];
  if (/\.pdf$/i.test(filename) || cat === 'pdf') return PREVIEW_CAPABILITIES['pdf'];
  if (/\.(ttf|otf|woff|woff2)$/i.test(filename) || cat === 'font') return PREVIEW_CAPABILITIES['font'];
  if (/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename) || cat === 'video') return PREVIEW_CAPABILITIES['video'];
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(filename) || cat === 'audio') return PREVIEW_CAPABILITIES['audio'];
  if (/\.(md|markdown)$/i.test(filename) || cat === 'markdown') return PREVIEW_CAPABILITIES['markdown'];
  if (/\.(json|jsonld)$/i.test(filename) || cat === 'json') return PREVIEW_CAPABILITIES['json'];
  if (/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|xml|sql|sh|yaml|yml|rs|go|php)$/i.test(filename) || cat === 'code') return PREVIEW_CAPABILITIES['code'];
  if (/\.(txt|log|cfg|ini|env)$/i.test(filename) || cat === 'text') return PREVIEW_CAPABILITIES['text'];
  if (cat === 'url') return PREVIEW_CAPABILITIES['url'];

  // Category fallback
  if (PREVIEW_CAPABILITIES[cat]) {
    return PREVIEW_CAPABILITIES[cat];
  }

  return PREVIEW_CAPABILITIES['unsupported'];
}
