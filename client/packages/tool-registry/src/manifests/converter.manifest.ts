// packages/tool-registry/src/manifests/converter.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const CONVERTER_MANIFEST: ToolRegistryItem = {
  id: 'file-converter',
  name: 'File Converter',
  slug: 'file-converter',
  category: 'Converters',
  categorySlug: 'converters',
  shortDescription: 'Convert documents, spreadsheets, presentations, and images across formats with fidelity and speed.',
  about: 'File Converter provides multi-format document conversion powered by headless document processing.\n\nConvert Word documents to PDF, spreadsheets to CSV, presentations to slides, and graphics with high formatting fidelity and privacy.',
  description: 'Upload your documents, choose an output format, and download your converted files instantly with support for batch and asynchronous processing.',
  icon: 'refresh-cw',
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
  accent: 'blue',
  accentHue: 217,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: BLUE_ACCENT,
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
    { label: 'Fidelity', value: 'Lossless Layout' },
    { label: 'Privacy', value: 'Auto-Purge' },
    { label: 'Speed', value: 'Async Queue' }
  ],
  highlights: [
    { label: 'Multi-Format', value: '18+ Formats', tooltip: 'DOCX, XLSX, PPTX, PDF, ODT, ODS, ODP, HTML, CSV, and images.' },
    { label: 'Privacy First', value: 'Auto-Purged', tooltip: 'Uploaded and converted files are automatically purged on a scheduled TTL.' },
    { label: 'High Fidelity', value: 'Vector-Accurate', tooltip: 'Maintains font metrics, layouts, tables, formulas, and slide formatting.' }
  ],
  features: [
    'Office documents to PDF conversion with typography fidelity',
    'Spreadsheets to PDF, CSV, and ODS formats',
    'Presentations to PDF and slide decks',
    'Real-time conversion progress indicator with background job polling',
    'Automatic scheduled cleanup of temporary files',
    'Clean dual-theme UI with high contrast in light and dark modes'
  ],
  howTo: [
    'Drop your document into the conversion upload zone.',
    'Select your desired output format from the dynamically filtered options.',
    'Click Convert to transform the document and download the converted file immediately.'
  ],
  faqs: [
    {
      id: 'formats',
      question: 'Which formats are supported?',
      answer: 'Microsoft Word (.docx, .doc), Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), OpenDocument (.odt, .ods, .odp), Plain Text (.txt), and PDF output.'
    },
    {
      id: 'retention',
      question: 'How long are uploaded files kept?',
      answer: 'Temporary files and converted outputs are automatically deleted from server memory after 60 minutes.'
    }
  ],
  related: ['clipboard', 'datalens', 'qr'],
  seo: {
    title: 'File Converter — Multi-Format Document Converter | Acklet',
    description: 'Convert DOCX, XLSX, PPTX, and other documents to PDF and other formats cleanly with Acklet File Converter.',
    keywords: ['file converter', 'docx to pdf', 'xlsx to pdf', 'document conversion', 'office converter']
  }
};
