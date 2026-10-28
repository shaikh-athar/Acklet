// packages/tool-registry/src/manifests/datalens.manifest.ts
import type { ToolRegistryItem } from '../models';
import { EMERALD_ACCENT } from '../accent-presets';

export const DATALENS_MANIFEST: ToolRegistryItem = {
  id: 'datalens',
  name: 'DataLens',
  slug: 'datalens',
  category: 'Formatters',
  categorySlug: 'formatters',
  shortDescription: 'Multi-format structured data workbench to format, inspect, validate, compare, and visualize JSON, YAML, XML, and more.',
  about: 'DataLens is a fast, keyboard-friendly structured data workbench to format, validate, inspect, compare, and transform JSON, YAML, XML, CSV, TOML, and cURL payloads with zero server transmission.\n\nAll parsing, AST validation, schema flattening, graph rendering, and diffing execute strictly within your local browser runtime memory, providing complete privacy for your sensitive data structures.',
  description: 'Clean up messy payloads, validate syntax with line-level error indicators, compare documents with split or unified diffs, flatten hierarchical data into tables, explore interactive AST trees, and generate type contract models in 9 programming languages.\n\nDataLens works with JSON, YAML, XML, CSV, TOML, and cURL commands, with live format conversions and auto-repair for common formatting mistakes.',
  icon: 'braces',
  version: '1.0.0',
  status: 'live',
  badge: 'updated',
  featured: true,
  order: 3,
  subdomain: 'datalens',
  executionMode: 'browser',
  layout: 'fullBleed',
  addedAt: '2026-02-01',
  updatedAt: '2026-10-28',
  accent: 'emerald',
  accentHue: 160,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: EMERALD_ACCENT,
    font: {
      family: 'Nunito',
      fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
      fallback: 'system-ui, -apple-system, sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Privacy', value: '100% Client-Side' },
    { label: 'Formats', value: '6 Formats' },
    { label: 'CodeGen', value: '9 Languages' }
  ],
  highlights: [
    { label: 'Privacy', value: '100% In-Browser', tooltip: 'Zero server uploads. Your data never leaves browser memory.' },
    { label: 'Multi-Format', value: '6 Formats', tooltip: 'JSON, YAML, XML, CSV, TOML, and cURL commands supported.' },
    { label: 'Inspector', value: '6 Visualizers', tooltip: 'Code, AST Tree, Table, Interactive Graph, Statistics, and CodeGen.' }
  ],
  tabs: [
    { id: 'format', label: 'Format', icon: 'file-code' },
    { id: 'diff', label: 'Compare', icon: 'git-diff' }
  ],
  navLinks: [
    { id: 'format', label: 'Format' },
    { id: 'diff', label: 'Compare' }
  ],
  features: [
    '100% client-side offline execution — zero server transmission',
    'Multi-format support for JSON, YAML, XML, CSV, TOML, and cURL',
    'Instant format beautify, minify, sort keys, escape/unescape, and repair',
    'Interactive AST tree visualizer with node search and copy tools',
    'Flattened tabular view with sortable columns and CSV/HTML export',
    'Advanced split & unified diffing engine with word-level tokenization',
    '9-language type contract code generator (TypeScript, Python, Go, Rust, Java, etc.)'
  ],
  howTo: [
    'Paste raw JSON, YAML, XML, CSV, TOML, or cURL into the editor.',
    'Click Format to beautify or use secondary transformation tools.',
    'Inspect data across Tree, Table, Graph, Stats, or CodeGen views.',
    'Switch to Compare & Diff to review changes between two payloads.'
  ],
  faqs: [
    {
      id: 'privacy',
      question: 'Is my data transmitted or stored remotely?',
      answer: 'No. All parsing, validation, transformation, and diffing execute strictly in your local browser runtime memory.'
    },
    {
      id: 'formats',
      question: 'Which data formats are supported?',
      answer: 'DataLens natively parses and converts between JSON, YAML, XML, CSV, TOML, and cURL commands.'
    }
  ],
  related: ['clipboard', 'qr', 'jwt-inspector', 'base64-encoder'],
  seo: {
    title: 'DataLens — Multi-Format JSON Formatter & Structured Data Workbench | Acklet',
    description: 'Format, validate, query, compare, and convert JSON, YAML, XML, CSV, TOML, and cURL payloads in your browser with zero latency.',
    keywords: ['json formatter', 'json validator', 'beautify json', 'yaml to json', 'xml to json', 'json diff']
  }
};
