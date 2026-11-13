// packages/tool-registry/src/manifests/image-compressor.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const IMAGE_COMPRESSOR_MANIFEST: ToolRegistryItem = {
  id: 'image-compressor',
  name: 'Image Compressor',
  sidebarLabel: 'Image Compressor',
  breadcrumbLabel: 'Image Compressor',
  slug: 'image-compressor',
  category: 'Media',
  categorySlug: 'media',
  shortDescription: 'Compress and optimize images directly in your browser with zero server uploads.',
  about: 'Image Compressor reduces image file sizes while preserving visual clarity. Runs 100% locally in your browser for absolute privacy, zero latency, and verified results without registration.',
  description: 'Compress PNG, JPG, WebP, AVIF, and GIF images directly in your browser. Configure global or individual quality, target output format, proportional resizing, and metadata retention with zero data uploaded to external servers.',
  icon: 'minimize-2',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 9,
  subdomain: 'imagecompressor',
  layout: 'fullBleed',
  addedAt: '2026-11-11',
  updatedAt: '2026-11-11',
  accent: 'blue',
  accentHue: 221,
  supports: ['shield-check', 'zap', 'lock'],
  theme: {
    accent: BLUE_ACCENT,
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
    { label: 'Max File Size', value: '50 MB / File' },
    { label: 'Processing', value: '100% In-Browser' },
    { label: 'Privacy', value: 'Zero Uploads' }
  ],
  highlights: [
    { label: 'Browser Engine', value: '100% Local', tooltip: 'Images never leave your device memory' },
    { label: 'Dual Settings', value: 'Global & Per-Image', tooltip: 'Set global defaults or override quality and size per image' },
    { label: 'Batch Upload', value: 'Up to 50', tooltip: 'Drop or select up to 50 images in a single session' },
    { label: 'Format Support', value: 'Multi-Format', tooltip: 'Supports JPG, PNG, WebP, AVIF, GIF, SVG, BMP, and HEIC' }
  ],
  tabs: [
    { id: 'compressor', label: 'Compressor', icon: 'minimize-2' }
  ],
  features: [
    'Drag-and-drop batch upload up to 50 images simultaneously (max 50 MB each)',
    'Magic byte binary signature inspection to prevent corrupted files or disguised binaries',
    'Interactive workspace with thumbnail previews, dimension inspection, and file sizes',
    'Full-featured image preview modal with keyboard navigation (Esc, Left, Right arrows)',
    'Global compression settings panel: Smart & Custom modes, quality slider (1-100), output format, and resizing',
    'Per-image individual settings overrides with predictable inheritance',
    'Proportional dimension resizing and percentage-based scaling with aspect ratio lock',
    'Metadata retention control (preserve vs strip)',
    '100% private client-side processing with zero server uploads',
    'Dual-theme high-contrast UI compliant with WCAG AA accessibility standards'
  ],
  howTo: [
    'Drag and drop your images or click "Choose images" to select files.',
    'Choose a compression preset or adjust quality, format, and dimension settings.',
    'Review uploaded images in the gallery and customize individual images if needed.',
    'Click "Compress all" to make your images smaller with zero server uploads.',
    'Download your optimized images individually or download all as a single ZIP archive.'
  ],
  faqs: [
    {
      id: 'privacy',
      question: 'Are my images uploaded to any server?',
      answer: 'No. All image validation, inspection, and compression happens 100% locally in your browser memory. Your images never touch an external server.'
    },
    {
      id: 'quality',
      question: 'How does Image Compressor make images smaller without losing quality?',
      answer: 'It removes redundant metadata, applies advanced perceptual compression, and optimizes image encoding to dramatically reduce file size while keeping visual clarity sharp.'
    },
    {
      id: 'limits',
      question: 'What are the batch and file size limits?',
      answer: 'You can compress up to 50 images in a single session, with a maximum file size of 50 MB per file.'
    },
    {
      id: 'formats',
      question: 'Which formats are supported?',
      answer: 'Image Compressor supports PNG, JPG, JPEG, WebP, AVIF, HEIC, GIF, and BMP directly in your browser.'
    },
    {
      id: 'overrides',
      question: 'Can I set different compression settings for individual images?',
      answer: 'Yes. Each image card lets you override global quality, target format, and dimensions independently.'
    }
  ],
  related: ['image-converter', 'file-converter', 'qr', 'datalens'],
  suggestedTools: ['image-converter', 'file-converter', 'qr', 'datalens'],
  seo: {
    title: 'Image Compressor: Make images smaller online, free and private | Acklet',
    description: 'Make your images smaller without losing quality. Compress PNG, JPG, WebP, AVIF, and HEIC images online directly in your browser. 100% private and free with zero server uploads.',
    keywords: ['image compressor', 'make images smaller', 'compress images online', 'reduce image file size', 'free image compressor', 'private image compressor', 'batch image compression']
  }
};

