// packages/tool-registry/src/manifests/file-converter.manifest.ts
import type { ToolRegistryItem } from '../models';
import { INDIGO_ACCENT } from '../accent-presets';

export const IMAGE_CONVERTER_MANIFEST: ToolRegistryItem = {
  id: 'image-converter',
  name: 'Image Converter',
  slug: 'image-converter',
  category: 'Converters',
  categorySlug: 'converters',
  shortDescription: 'Convert PNG, JPG, WebP, AVIF, SVG, and GIF images instantly in your browser with zero data retention.',
  about: 'Image Converter is a private, in-browser transformation studio engineered for high-speed, loss-minimizing image conversions without server uploads or registration.\n\nAll images are processed locally using Canvas API, OffscreenCanvas, and modern Web APIs directly on your device, ensuring total privacy, zero latency, and beautiful results.',
  description: 'Convert between popular image formats (PNG, JPG, WebP, SVG, AVIF, GIF) with zero server transmission.\n\nFeatures deep binary signature verification, loss-minimizing compression, batch multi-image queuing up to 50 images (max 50 MB each), quality presets, and one-click ZIP archiving. No account or installation required.',
  icon: 'images',
  version: '1.0.0',
  status: 'live',
  requiresBackend: false,
  badge: 'new',
  featured: true,
  order: 6,
  subdomain: 'image-converter',
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
    { label: 'Batch Limit', value: '50 Images' },
    { label: 'Max File Size', value: '50 MB / Image' },
    { label: 'Processing', value: '100% In-Browser' },
    { label: 'Privacy', value: 'Zero Uploads' }
  ],
  highlights: [
    { label: 'Magic Byte Scanner', value: 'Verified', tooltip: 'Validates real binary file signatures to prevent corrupted conversions' },
    { label: 'In-Browser Engine', value: '100% Local', tooltip: 'Images never leave your device memory' },
    { label: 'Batch Processing', value: 'Up to 50', tooltip: 'Convert multiple images simultaneously with 1-click ZIP export' },
    { label: 'Lossless & Quality', value: 'Adjustable', tooltip: 'Custom quality sliders, resize presets, and transparency handling' }
  ],
  tabs: [
    { id: 'converter', label: 'Converter', icon: 'images' }
  ],
  features: [
    'Drag-and-drop batch upload up to 50 images simultaneously (max 50 MB each)',
    'Deep file signature (magic byte) detection to prevent extension spoofing',
    'PNG, JPG, WebP, AVIF, SVG, and GIF format conversions',
    'Interactive batch target selection and quality optimization presets',
    'Proportional resize options (Original, 1920px, 1280px, 800px)',
    'Real-time animated progress bars and asynchronous concurrent processing',
    'Individual image downloads and bundled batch ZIP export',
    'Celebratory completion summary with compression space-savings indicator',
    'Dual-theme high-contrast UI compliant with WCAG AA accessibility standards'
  ],
  howTo: [
    'Drag and drop your images or click "Browse Files" to choose up to 50 images (max 50 MB each).',
    'Choose your target format (WebP, JPG, PNG) and preferred quality preset.',
    'Click "Convert All" to process instantly and asynchronously in your browser.',
    'Download individual images or grab all converted files in a single ZIP archive.'
  ],
  faqs: [
    {
      id: 'privacy',
      question: 'Are my images uploaded to any server?',
      answer: 'No. All image conversions execute 100% locally in your browser memory via Web APIs. Your photos and graphics never touch a remote server.'
    },
    {
      id: 'limits',
      question: 'What are the file size and batch limits?',
      answer: 'You can convert up to 50 images in a single batch, with a maximum file size of 50 MB per image.'
    },
    {
      id: 'transparency',
      question: 'What happens to transparency when converting PNG to JPG?',
      answer: 'Because JPEG does not support transparency, transparent areas are automatically rendered on a clean white background. To keep transparency, choose WebP or PNG as your target.'
    },
    {
      id: 'compression',
      question: 'Why convert to WebP?',
      answer: 'WebP provides superior compression and quality compared to PNG and JPEG, often reducing file size by 30-70% while preserving crisp detail and transparency.'
    }
  ],
  related: ['clipboard', 'datalens', 'barcode', 'qr', 'temp-email', 'urlshortener'],
  seo: {
    title: 'Image Converter — Free Fast In-Browser Image Conversion | Acklet',
    description: 'Free, private, in-browser image converter. Convert PNG, JPG, WebP, AVIF, SVG, and GIF images with zero uploads, batch processing up to 50 files, and maximum quality.',
    keywords: [
      'image converter',
      'png to jpg',
      'jpg to webp',
      'png to webp',
      'svg to png',
      'webp to jpg',
      'batch image converter',
      'free online image converter'
    ]
  }
};

export const FILE_CONVERTER_MANIFEST = IMAGE_CONVERTER_MANIFEST;
