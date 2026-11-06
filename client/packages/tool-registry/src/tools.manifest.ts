// packages/tool-registry/src/tools.manifest.ts
import type { ToolRegistryItem } from './models';
import { CLIPBOARD_MANIFEST } from './manifests/clipboard.manifest';
import { QR_MANIFEST } from './manifests/qr.manifest';
import { DATALENS_MANIFEST } from './manifests/datalens.manifest';
import { BARCODE_MANIFEST } from './manifests/barcode.manifest';
import { TEMP_EMAIL_MANIFEST } from './manifests/temp-email.manifest';
import { IMAGE_CONVERTER_MANIFEST, FILE_CONVERTER_MANIFEST } from './manifests/file-converter.manifest';
import { AMBER_ACCENT, BLUE_ACCENT, ROSE_ACCENT, VIOLET_ACCENT, EMERALD_ACCENT, INDIGO_ACCENT } from './accent-presets';

export { CLIPBOARD_MANIFEST } from './manifests/clipboard.manifest';
export { QR_MANIFEST } from './manifests/qr.manifest';
export { DATALENS_MANIFEST } from './manifests/datalens.manifest';
export { BARCODE_MANIFEST } from './manifests/barcode.manifest';
export { TEMP_EMAIL_MANIFEST } from './manifests/temp-email.manifest';
export { IMAGE_CONVERTER_MANIFEST, FILE_CONVERTER_MANIFEST } from './manifests/file-converter.manifest';

/**
 * Single Source of Truth for all tools in Acklet.
 */
export const TOOL_REGISTRY: Record<string, ToolRegistryItem> = {
  'clipboard': CLIPBOARD_MANIFEST,
  'qr': QR_MANIFEST,
  'qr-generator': QR_MANIFEST,
  'barcode': BARCODE_MANIFEST,
  'barcode-generator': BARCODE_MANIFEST,
  'datalens': DATALENS_MANIFEST,
  'json-formatter': DATALENS_MANIFEST,
  'temp-email': TEMP_EMAIL_MANIFEST,
  'temp-mail': TEMP_EMAIL_MANIFEST,
  'image-converter': IMAGE_CONVERTER_MANIFEST,
  'file-converter': IMAGE_CONVERTER_MANIFEST,
  'converter': IMAGE_CONVERTER_MANIFEST,
  'img-converter': IMAGE_CONVERTER_MANIFEST,
  'urlshortener': {
    id: 'urlshortener',
    name: 'URL Shortener',
    slug: 'urlshortener',
    category: 'Links/Web',
    categorySlug: 'links-web',
    shortDescription: 'Shorten a long link into a compact one you can share.',
    about: 'URL Shortener shortens links into compact URLs. It supports custom aliases, expiration dates, link previews, and QR code generation.\n\nLinks redirect directly to their destination, and can be inspected before visiting by appending a plus sign (+).',
    description: 'Shorten long links into compact ones with optional aliases and expiration dates. You can set expiration periods, preview destinations, and track total clicks without creating an account.\n\nAll links are managed directly in your browser with no tracking or cookies.',
    icon: 'link',
    version: '1.0.0',
    status: 'live',
    badge: 'new',
    featured: true,
    order: 7,
    subdomain: 'urlshortener',
    subItems: [
      { id: 'links', label: 'My links', path: '/links', icon: 'history' }
    ],
    executionMode: 'browser',
    layout: 'fullBleed',
    addedAt: '2026-10-28',
    updatedAt: '2026-10-28',
    accent: 'amber',
    accentHue: 38,
    supports: ['shield-check', 'zap', 'lock'],
    facts: [
      { label: 'Storage', value: 'Per-browser' },
      { label: 'Click tracking', value: 'Anonymous count' },
      { label: 'Security', value: 'Link validation' }
    ],
    highlights: [
      { label: 'Custom alias', value: '3-30 characters', tooltip: 'Letters, numbers, hyphens, and underscores' },
      { label: 'Expiry', value: '7 days to never', tooltip: 'Deactivates automatically after the selected duration' },
      { label: 'Preview', value: '+ suffix', tooltip: 'Append a plus sign to inspect destination and safety details' },
      { label: 'QR codes', value: 'Integrated', tooltip: 'Open directly in QR Generator' }
    ],
    features: [
      'Runs in your browser with per-device management',
      'Base62 short codes (6-7 characters)',
      'Custom aliases with availability check',
      'Expiration presets (7 days, 30 days, 1 year, or never)',
      'Preview page by appending a plus sign (+)',
      'QR code generation for shortened links',
      'Destination link validation',
      'No account or registration required'
    ],
    howTo: [
      'Paste a link into the input field.',
      'Optionally set an alias or expiration date.',
      'Select Shorten.',
      'Copy the shortened link or generate a QR code.'
    ],
    howItWorks: [
      'Enter a destination link.',
      'The link is checked to ensure it uses HTTP or HTTPS.',
      'A short code or custom alias is assigned.',
      'Use the shortened link directly or append + to inspect it.'
    ],
    faqs: [
      {
        id: 'faq-tracking',
        question: 'Are clicks tracked?',
        answer: 'Only total click counts are recorded. No IP addresses, user identifiers, or cookies are stored.'
      },
      {
        id: 'faq-alias',
        question: 'Can I choose a custom alias?',
        answer: 'Yes. Aliases can be 3 to 30 characters using letters, numbers, hyphens, and underscores.'
      },
      {
        id: 'faq-expiry',
        question: 'How long do links remain active?',
        answer: 'Links can be set to expire after 7 days, 30 days, 1 year, or never. After expiring, links no longer redirect.'
      },
      {
        id: 'faq-preview',
        question: 'What is the preview page?',
        answer: 'Append a plus sign (+) to any shortened link to view the destination address, safety checks, and click count before visiting.'
      },
      {
        id: 'faq-qr',
        question: 'Can I generate a QR code for a shortened link?',
        answer: 'Yes. Select Make QR on any shortened link to open it in QR Generator.'
      }
    ],
    related: ['qr-generator', 'clipboard', 'image-converter', 'json-formatter'],
    suggestedTools: ['qr-generator', 'clipboard', 'image-converter', 'json-formatter'],
    seo: {
      title: 'URL Shortener | Acklet',
      description: 'Shorten links into compact URLs with custom aliases, expiration dates, and preview pages.',
      keywords: ['url shortener', 'link shortener', 'custom alias', 'safe preview', 'qr link']
    }
  }
};

export function getAllTools(): ToolRegistryItem[] {
  const seen = new Set<string>();
  const list: ToolRegistryItem[] = [];
  for (const tool of Object.values(TOOL_REGISTRY)) {
    if (!seen.has(tool.id)) {
      seen.add(tool.id);
      list.push(tool);
    }
  }
  return list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getToolsByCategory(category: string, excludeSlug?: string): ToolRegistryItem[] {
  const seen = new Set<string>();
  const list: ToolRegistryItem[] = [];
  for (const tool of Object.values(TOOL_REGISTRY)) {
    if (!seen.has(tool.id) && tool.category.toLowerCase() === category.toLowerCase() && tool.slug !== excludeSlug) {
      seen.add(tool.id);
      list.push(tool);
    }
  }
  return list;
}

export function getToolBySlug(slug: string): ToolRegistryItem | undefined {
  return TOOL_REGISTRY[slug];
}
