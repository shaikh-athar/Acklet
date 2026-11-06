// packages/tool-registry/src/manifests/file-converter.manifest.ts
import type { ToolRegistryItem } from '../models';
import { INDIGO_ACCENT } from '../accent-presets';

export const FILE_CONVERTER_MANIFEST: ToolRegistryItem = {
  id: 'file-converter',
  name: 'File Converter',
  sidebarLabel: 'File Converter',
  breadcrumbLabel: 'File Converter',
  slug: 'file-converter',
  category: 'Converters',
  categorySlug: 'converters',
  shortDescription: 'Convert files between popular formats quickly and securely.',
  about: 'File Converter is a fast, private, in-browser conversion tool engineered for seamless file transformations without server uploads or registration.\n\nAll client-side files are processed locally using modern Web APIs directly on your device, ensuring total privacy, zero latency, and verified results.',
  description: 'Convert files between popular image, subtitle, and contact formats with zero server transmission.\n\nFeatures deep binary signature verification, loss-minimizing compression, batch multi-file queuing up to 50 files, quality presets, and one-click ZIP archiving. No account or installation required.',
  icon: 'arrow-left-right',
  version: '1.2.0',
  status: 'live',
  requiresBackend: false,
  badge: 'updated',
  featured: true,
  order: 6,
  subdomain: 'file-converter',
  layout: 'fullBleed',
  addedAt: '2026-11-06',
  updatedAt: '2026-11-06',
  accent: 'indigo',
  accentHue: 242,
  supports: ['shield-check', 'zap', 'lock'],
  theme: {
    accent: INDIGO_ACCENT,
    font: {
      family: 'Scoutie Sans',
      fontFamily: "'Scoutie Sans', sans-serif",
      weights: [300, 400, 500, 600, 700],
      fallback: 'sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Batch Limit', value: '50 Files' },
    { label: 'Max File Size', value: '50 MB / File' },
    { label: 'Processing', value: '100% In-Browser' },
    { label: 'Privacy', value: 'Zero Uploads' }
  ],
  highlights: [
    { label: 'Magic Byte Scanner', value: 'Verified', tooltip: 'Validates real binary file signatures to prevent corrupted conversions' },
    { label: 'In-Browser Engine', value: '100% Local', tooltip: 'Files never leave your device memory' },
    { label: 'Multi-Category', value: 'Active', tooltip: 'Converts Images, Subtitles, Contacts, and Graphics' },
    { label: 'Batch Processing', value: 'Up to 50', tooltip: 'Convert multiple files simultaneously with 1-click ZIP export' }
  ],
  tabs: [
    { id: 'converter', label: 'Converter', icon: 'arrow-left-right' }
  ],
  features: [
    'Global drag-and-drop support: drop files anywhere in Acklet to initiate conversion',
    'Drag-and-drop batch upload up to 50 files simultaneously (max 50 MB each)',
    'Deep file signature (magic byte) detection to prevent extension spoofing',
    'Image conversions: PNG, JPG, WebP, AVIF, SVG, GIF, BMP',
    'Subtitle conversions: SRT ↔ VTT with full timestamp and cue preservation',
    'Contact conversions: VCF ↔ CSV with multi-contact card parsing',
    'Interactive batch target selection and synchronized quality controls (65%, 85%, 95%)',
    'Automatic lossless format detection (quality controls applied only to lossy formats)',
    'Proportional resize options (Original, 1920px, 1280px, 800px)',
    'Real-time animated progress indicators and asynchronous concurrent processing',
    'Individual file downloads and bundled batch ZIP export',
    'Celebratory completion summary with compression space-savings indicator',
    'Dual-theme high-contrast UI compliant with WCAG AA accessibility standards'
  ],
  howTo: [
    'Drag and drop your files or click "Select Files" to choose files for conversion.',
    'Review detected formats and choose your target format from the compatible outputs list.',
    'For lossy formats (JPEG, WebP), optionally adjust the synchronized quality slider or presets.',
    'Click "Convert All" to process instantly and asynchronously in your browser.',
    'Download individual files or grab all converted files in a single ZIP archive.'
  ],
  faqs: [
    {
      id: 'privacy',
      question: 'Are my files uploaded to any server?',
      answer: 'No. All conversions execute 100% locally in your browser memory via Web APIs. Your images, contacts, and subtitles never touch a remote server or external cloud.'
    },
    {
      id: 'limits',
      question: 'What are the file size and batch limits?',
      answer: 'You can convert up to 50 files in a single batch, with a maximum file size of 50 MB per file.'
    },
    {
      id: 'formats',
      question: 'Which file categories are supported?',
      answer: 'File Converter currently supports Images (PNG, JPG, WebP, AVIF, SVG, GIF, BMP), Subtitles (SRT, VTT), and Contacts (VCF, CSV). Documents (EPUB, ODT) and Media (M4A, WAV, MOV) are part of our planned roadmap.'
    },
    {
      id: 'transparency',
      question: 'What happens to transparency when converting PNG to JPG?',
      answer: 'Because JPEG does not support transparency, transparent areas are automatically rendered on a clean white background. To keep transparency, choose WebP or PNG as your target.'
    },
    {
      id: 'subtitles',
      question: 'Does subtitle conversion keep timestamps and styling?',
      answer: 'Yes. Our subtitle adapter parses SRT sequential cue numbers and millisecond timestamps into standards-compliant WebVTT (and vice versa) without time drift.'
    }
  ],
  related: ['clipboard', 'datalens', 'barcode', 'qr', 'temp-email', 'urlshortener'],
  seo: {
    title: 'File Converter | Acklet',
    description: 'File Converter — Free, private file conversion in your browser. Convert images, subtitles, and contacts with zero server uploads and high fidelity.',
    keywords: [
      'file converter',
      'universal file converter',
      'image converter',
      'subtitle converter',
      'vcard converter',
      'png to webp',
      'heic to jpg',
      'avif to png',
      'srt to vtt',
      'vcf to csv',
      'free online file converter'
    ]
  }
};

/** Separate, independent manifest for Image Converter */
export const IMAGE_CONVERTER_MANIFEST: ToolRegistryItem = {
  id: 'image-converter',
  name: 'Image Converter',
  sidebarLabel: 'Image Converter',
  breadcrumbLabel: 'Image Converter',
  slug: 'image-converter',
  category: 'Media',
  categorySlug: 'media',
  shortDescription: 'Convert, compress, and resize images in your browser with zero uploads.',
  about: 'Image Converter allows you to convert, optimize, and resize images directly in your browser without uploading files to any external server.',
  description: 'Convert between WebP, JPG, PNG, AVIF, and SVG images with custom quality compression and resizing directly in your browser.',
  icon: 'image',
  version: '1.0.0',
  status: 'live',
  requiresBackend: false,
  badge: 'new',
  featured: false,
  order: 8,
  subdomain: 'image-converter',
  layout: 'fullBleed',
  addedAt: '2026-11-06',
  updatedAt: '2026-11-06',
  accent: 'indigo',
  accentHue: 242,
  supports: ['shield-check', 'zap', 'lock'],
  features: [
    'Convert between JPG, PNG, WebP, AVIF, and SVG',
    'Custom quality slider for lossy compression',
    'Batch image processing',
    '100% private in-browser processing'
  ],
  howTo: [
    'Select or drop your images.',
    'Choose target image format and quality.',
    'Download converted images individually or as a ZIP archive.'
  ],
  faqs: [
    {
      id: 'img-privacy',
      question: 'Are my images uploaded to any server?',
      answer: 'No. Image processing runs 100% locally in your browser.'
    }
  ],
  seo: {
    title: 'Image Converter | Acklet',
    description: 'Convert, compress, and resize images directly in your browser.',
    keywords: ['image converter', 'jpg to webp', 'png to webp', 'convert images']
  }
};

export const UNIVERSAL_FILE_CONVERTER_MANIFEST = FILE_CONVERTER_MANIFEST;
