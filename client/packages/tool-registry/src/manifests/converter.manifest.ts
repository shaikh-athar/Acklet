// packages/tool-registry/src/manifests/converter.manifest.ts
import type { ToolRegistryItem } from '../models';
import { OLIVE_ACCENT } from '../accent-presets';

export const CONVERTER_MANIFEST: ToolRegistryItem = {
  id: 'file-converter',
  name: 'File Converter',
  slug: 'file-converter',
  category: 'Converters',
  categorySlug: 'converters',
  shortDescription: 'Convert documents, spreadsheets, presentations, and files with fidelity, structure checks, and privacy.',
  about: 'File Converter provides batch multi-format document transformation across DOCX, XLSX, PDF, and popular formats.\n\nFeatures deep structure inspection, layout fidelity presets, optical character recognition support, and scheduled automatic cleanup.',
  description: 'Upload up to 20 documents, inspect structural elements, configure layout fidelity and page ranges, and download individual files or a unified ZIP archive with zero watermarks.',
  icon: 'file-text',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 7,
  subdomain: 'file-converter',
  executionMode: 'cloud',
  layout: 'fullBleed',
  addedAt: '2026-11-06',
  updatedAt: '2026-11-06',
  accent: 'olive',
  accentHue: 80,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: OLIVE_ACCENT,
    font: {
      family: 'Scoutie Sans',
      fontFamily: "'Scoutie Sans', system-ui, -apple-system, sans-serif",
      fallback: 'system-ui, -apple-system, sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Batch Limit', value: '20 Documents' },
    { label: 'Max File Size', value: '50 MB / File' },
    { label: 'Auto-Purge', value: '1 Hour TTL' },
    { label: 'Output', value: 'No Watermark' }
  ],
  highlights: [
    { label: 'Structure Check', value: 'Live Analysis', tooltip: 'Detects headings, tables, columns, and graphics with confidence scoring.' },
    { label: 'Layout Fidelity', value: '3 Modes', tooltip: 'Choose between Editable Text, Balanced flow, or Exact Layout preservation.' },
    { label: 'Auto-Purge Privacy', value: '1 Hour', tooltip: 'All uploaded and converted files are automatically destroyed after 1 hour.' }
  ],
  features: [
    'Convert up to 20 documents simultaneously with batch queuing',
    'Structure check detects headings, tables, columns, and embedded graphics',
    'Layout fidelity presets: Editable Text, Balanced flow, and Exact Layout',
    'Selective page range conversion (e.g., 1-3, 5)',
    'Single ZIP archive generation or individual document downloads',
    'Deleted automatically after 1 hour with zero tracking or watermarks'
  ],
  howTo: [
    'Choose or drop up to 20 documents into the upload zone.',
    'Select target format, layout fidelity, and optional page ranges.',
    'Click Convert to process your files asynchronously and download when ready.'
  ],
  faqs: [
    {
      id: 'formats',
      question: 'Which formats are supported?',
      answer: 'Microsoft Word (.docx, .doc), Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), OpenDocument (.odt, .ods, .odp), Plain Text (.txt), and PDF output.'
    },
    {
      id: 'structure-check',
      question: 'What is the Structure Check feature?',
      answer: 'Structure Check automatically inspects your document to detect headings, tables, columns, and graphics, displaying them as informative visual chips before conversion.'
    },
    {
      id: 'retention',
      question: 'How long are uploaded files kept?',
      answer: 'All uploaded files and converted outputs are automatically deleted from server storage after 1 hour.'
    }
  ],
  related: ['clipboard', 'datalens', 'qr'],
  seo: {
    title: 'File Converter — Multi-Format Document Converter | Acklet',
    description: 'Convert DOCX, XLSX, PPTX, and other documents to PDF and other formats cleanly with Acklet File Converter.',
    keywords: ['file converter', 'docx to pdf', 'xlsx to pdf', 'document conversion', 'office converter']
  }
};
