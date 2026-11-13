// packages/tool-registry/src/manifests/watermark-remover.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const WATERMARK_REMOVER_MANIFEST: ToolRegistryItem = {
  id: 'watermark-remover',
  name: 'Watermark Remover',
  sidebarLabel: 'Watermark Remover',
  breadcrumbLabel: 'Watermark Remover',
  slug: 'watermark-remover',
  category: 'Images',
  categorySlug: 'images',
  shortDescription: 'Remove watermarks, logos, stamps, and unwanted overlays from images using AI inpainting.',
  about: 'Watermark Remover is an AI-powered utility that detects and removes watermarks, copyright stamps, text, and unwanted overlays from photos with zero quality loss.\n\nUsing advanced exemplar inpainting and multi-resolution background reconstruction, it fills the selected areas naturally using surrounding textures and colors without altering unaffected regions.',
  description: 'Clean watermarked images with AI-powered automatic detection or precise manual brush and rectangle selection. Watermark Remover analyzes surrounding image patterns and reconstructs the underlying background naturally.\n\nInspect your results with an interactive before-and-after comparison slider, and download the cleaned image in original dimensions in PNG, JPG, or WebP format. Everything runs securely with zero persistent image retention.',
  icon: 'wand-2',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 8,
  subdomain: 'watermark-remover',
  executionMode: 'browser',
  layout: 'fullBleed',
  addedAt: '2026-11-13',
  updatedAt: '2026-11-13',
  accent: 'blue',
  accentHue: 221,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: BLUE_ACCENT,
    font: {
      family: 'Scoutie Sans',
      fontFamily: "'Scoutie Sans', sans-serif",
      fallback: 'sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Privacy', value: '100% Client-Side' },
    { label: 'Engine', value: 'AI Inpainting' },
    { label: 'Formats', value: 'PNG, JPG, WebP' }
  ],
  highlights: [
    { label: 'AI Auto-Detect', value: '1-Click', tooltip: 'Automatically identify visible watermark regions and overlays' },
    { label: 'Precision Brush', value: '4-100px', tooltip: 'Manual brush and rectangle selection tools for full control' },
    { label: 'Before/After', value: 'Interactive Slider', tooltip: 'Compare original and cleaned images with pixel precision' },
    { label: 'Zero Storage', value: 'In-Memory', tooltip: 'Images are never uploaded or permanently stored on remote servers' }
  ],
  tabs: [
    { id: 'editor', label: 'Remover Workspace', icon: 'wand-2' }
  ],
  navLinks: [
    { id: 'editor', label: 'Editor' }
  ],
  features: [
    'AI-powered background reconstruction using exemplar inpainting and texture synthesis',
    'Automatic watermark detection for text, stamps, logos, and repetitive grid patterns',
    'Interactive manual brush selection with adjustable radius and smooth stroke interpolation',
    'Rectangle selection tool for quickly marking large rectangular watermark regions',
    'Before and after interactive comparison slider to inspect inpainting quality',
    'Preserves 100% original image dimensions and unmasked pixel clarity',
    'Multi-format export supporting PNG (lossless), JPG (high quality), and WebP',
    'Full drag-and-drop file upload, file browsing, and clipboard image pasting (⌘V / Ctrl+V)',
    '100% ephemeral in-browser execution with zero remote image retention'
  ],
  howTo: [
    'Upload your watermarked image by drag-and-drop, browsing files, or pasting from clipboard.',
    'Use AI Auto-Detect or paint over the watermark using the Brush or Rectangle tool.',
    'Click Remove Watermark to run the AI inpainting background reconstruction.',
    'Inspect the result with the Before/After comparison slider.',
    'Download the cleaned image in PNG, JPG, or WebP format.'
  ],
  howItWorks: [
    'Upload an image to create an in-memory bitmap workspace.',
    'Select watermark areas to generate a binary mask identifying the reconstruction target.',
    'The AI inpainting engine identifies boundary isophotes and searches surrounding textures for optimal donor patches.',
    'Donor textures are blended seamlessly into the target area, reconstructing background patterns without altering unaffected pixels.',
    'The cleaned image is rendered at full original resolution ready for export.'
  ],
  faqs: [
    {
      id: 'privacy',
      question: 'Are my uploaded images stored or logged on a server?',
      answer: 'No. All image processing and inpainting execute ephemerally in your browser session. Your images are never saved to a database, retained on disks, or shared with third parties.'
    },
    {
      id: 'formats',
      question: 'What image formats can I upload and export?',
      answer: 'You can upload JPG, JPEG, PNG, and WebP images. You can export the final cleaned image as PNG, JPG, or WebP while preserving the exact original image dimensions.'
    },
    {
      id: 'quality',
      question: 'Does watermark removal blur or degrade the rest of the image?',
      answer: 'No. The inpainting algorithm only modifies the pixels inside your selected watermark mask. All unaffected regions outside the mask are preserved with 100% bit-exact original quality.'
    },
    {
      id: 'selection',
      question: 'Can I combine automatic detection and manual brush selection?',
      answer: 'Yes! You can run AI Auto-Detect to highlight detected watermarks, and then use the Brush or Rectangle tools to add or erase parts of the mask before running the removal.'
    }
  ],
  related: ['image-converter', 'colorstudio', 'file-converter', 'datalens'],
  suggestedTools: ['image-converter', 'colorstudio', 'file-converter'],
  seo: {
    title: 'AI Watermark Remover — Clean Images Online Free | Acklet',
    description: 'Remove watermarks, logos, stamps, and text from photos with AI inpainting. 100% private, free, in-browser image watermark remover with before-and-after comparison.',
    keywords: ['watermark remover', 'ai watermark remover', 'remove watermark from photo', 'image inpainting', 'remove logo from image', 'clean image online']
  }
};

