// packages/tool-registry/src/manifests/barcode.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const BARCODE_MANIFEST: ToolRegistryItem = {
  id: 'barcode',
  name: 'Barcode Generator',
  slug: 'barcode',
  category: 'Utilities',
  categorySlug: 'utilities',
  shortDescription: 'Generate standards-compliant 1D and 2D barcodes locally in your browser with vector export.',
  about: 'A barcode is an optical, machine-readable representation of data in parallel lines or two-dimensional matrices. This generator supports standard retail, industrial, and logistics symbologies including Code 128, EAN-13, UPC-A, UPC-E, EAN-8, ISBN-13, Code 39, Code 93, ITF-14, Interleaved 2 of 5, and Codabar, plus temporary expiring barcodes.\n\nStandard barcodes and bulk files are processed 100% in your browser memory: no data leaves your device and no server is contacted. Temporary expiring barcodes store verification details encrypted on Acklet servers until their expiry time, after which they are permanently deleted.',
  description: 'Create standards-compliant retail, logistics, and industrial barcodes. Calculate check digits automatically, customize dimensions, colors, and human-readable text, and export crisp PNG, SVG, or PDF files completely in the browser.',
  icon: 'barcode',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 3,
  subdomain: 'barcode',
  layout: 'fullBleed',
  addedAt: '2026-10-30',
  updatedAt: '2026-10-30',
  accent: 'blue',
  accentHue: 217,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: BLUE_ACCENT,
    font: {
      family: 'Manrope',
      fontFamily: "'Manrope', sans-serif",
      weights: [400, 500, 600, 700],
      fallback: 'sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Privacy', value: '100% Client-Side' },
    { label: 'Export', value: 'PNG, SVG, PDF' },
    { label: 'Tracking', value: 'Zero Telemetry' }
  ],
  highlights: [
    { label: 'Privacy', value: '100% Local', tooltip: 'No server transmission; computed entirely in-browser' },
    { label: 'Symbologies', value: '11 Formats', tooltip: 'Code 128, EAN, UPC, ISBN, Code 39, Code 93, ITF, Codabar' },
    { label: 'Vector Output', value: 'SVG & PDF', tooltip: 'Lossless resolution with print millimeter specifications' }
  ],
  tabs: [
    { id: 'create', label: 'Generator', icon: 'barcode' }
  ],
  navLinks: [
    { id: 'create', label: 'Generator' }
  ],
  features: [
    'Supports 11 standard retail, logistics, and industrial symbologies',
    'Automatic GS1 modulo-10 and check-digit calculation with validation',
    'Standards-based sizing with millimeter, inch, and magnification controls',
    'Customizable bar and background colors with built-in contrast validation',
    'Human-readable text formatting, font controls, and standard digit grouping',
    'Lossless SVG, 300 DPI PNG, vector PDF export, and clipboard image copy',
    'Local history with fast recall and shareable parameter links',
    'Zero server roundtrips, zero telemetry, and 100% offline-ready privacy'
  ],
  howTo: [
    'Choose your target symbology from the grouped format selector.',
    'Enter your data value or numeric code in the value field.',
    'Adjust size, colors, quiet zone, or text options in the customize tab.',
    'Download your barcode as PNG, vector SVG, or print-ready PDF.'
  ],
  howItWorks: [
    'Select the symbology that matches your industry or operational requirement.',
    'Enter alphanumeric characters or numeric digits according to the format rules.',
    'The client-side engine calculates required check digits and validates character sets.',
    'An inline vector SVG is rendered with optional silent verification against scanner decoders.'
  ],
  faqs: [
    {
      id: 'faq-format-choice',
      question: 'Which format should I use?',
      answer: 'For consumer retail products sold in North America, use UPC-A. For retail goods sold in Europe and internationally, use EAN-13. For books, use ISBN-13. For shipping cartons and logistics packaging, use ITF-14 or Code 128. For general inventory, internal tracking, and alphanumeric data, use Code 128.'
    },
    {
      id: 'faq-ean-vs-upc',
      question: 'What is the difference between EAN-13 and UPC-A?',
      answer: 'UPC-A consists of 12 numeric digits and is primarily used in the United States and Canada. EAN-13 consists of 13 numeric digits and is the global retail standard. A UPC-A barcode is functionally equivalent to an EAN-13 barcode with a leading zero prefix.'
    },
    {
      id: 'faq-gs1-prefix',
      question: 'Do I need to register numbers for products sold in stores?',
      answer: 'Yes. If you plan to sell physical merchandise through commercial retailers or supermarkets, you must obtain an official GS1 company prefix from GS1 (gs1.org). For internal tracking, closed warehouse inventory, or membership cards, you can use any valid numbering sequence without registration.'
    },
    {
      id: 'faq-check-digit',
      question: 'What is a check digit?',
      answer: 'A check digit is the final digit in a barcode number calculated from an arithmetic formula (such as GS1 modulo 10) applied to the preceding digits. It prevents scanners from misreading damaged or incomplete barcodes by validating mathematical integrity.'
    },
    {
      id: 'faq-scanning-issues',
      question: 'Why does my barcode not scan?',
      answer: 'Common causes include insufficient quiet zone margins around the bars, poor color contrast (such as light bars on dark backgrounds), printing below the minimum recommended physical size, or entering invalid characters for the selected symbology.'
    },
    {
      id: 'faq-print-size',
      question: 'What size should I print?',
      answer: 'For retail EAN-13 and UPC-A barcodes, the nominal 100% standard width is approximately 37.29 mm (1.47 in) with a height of 25.93 mm (1.02 in). GS1 specifications permit magnification between 80% and 200%. For shipping labels, larger dimensions ensure reliable scanning at greater distances.'
    },
    {
      id: 'faq-colors',
      question: 'Can I use colors?',
      answer: 'Most optical barcode scanners use red light lasers or red illumination sensors. Dark bars (black, dark blue, dark green) on light backgrounds (white, pale yellow) scan reliably. Never use red or orange bars, and avoid light bars on dark backgrounds.'
    },
    {
      id: 'faq-bulk',
      question: 'Can I generate many at once?',
      answer: 'Phase 1 focuses on generating and customizing single high-fidelity barcodes. Bulk batch generation, sequence numbering, and CSV upload are scheduled for Phase 2.'
    },
    {
      id: 'faq-privacy',
      question: 'Is my data stored?',
      answer: 'Standard barcodes are generated entirely client-side in your browser memory; no numbers, names, or values are sent to any server. When you create a Temporary barcode, its verification record is stored encrypted on Acklet until the expiration date you chose, after which it is automatically deleted.'
    },
    {
      id: 'faq-barcode-vs-qr',
      question: 'What is the difference between a barcode and a QR code?',
      answer: 'Traditional 1D linear barcodes hold between 1 and 80 alphanumeric characters in vertical bars and are ideal for quick product lookups and inventory IDs. 2D QR codes store thousands of characters in a square grid, supporting website URLs, contact cards, and mobile camera scanning from any angle.'
    }
  ],
  related: ['qr', 'clipboard', 'datalens'],
  suggestedTools: ['qr', 'clipboard', 'datalens'],
  seo: {
    title: 'Barcode Generator — Free, Private & Standards-Compliant | Acklet',
    description: 'Generate Code 128, EAN-13, UPC-A, ISBN, Code 39, ITF-14, and more directly in your browser. Download crisp vector SVG, PDF, and high-resolution PNG.',
    keywords: ['barcode generator', 'code 128 generator', 'ean-13 generator', 'upc-a generator', 'isbn barcode', 'free barcode maker', 'svg barcode']
  }
};
