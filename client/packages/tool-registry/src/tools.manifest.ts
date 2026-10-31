// packages/tool-registry/src/tools.manifest.ts
import type { ToolRegistryItem } from './models';
import { CLIPBOARD_MANIFEST } from './manifests/clipboard.manifest';
import { QR_MANIFEST } from './manifests/qr.manifest';
import { DATALENS_MANIFEST } from './manifests/datalens.manifest';
import { AMBER_ACCENT, BLUE_ACCENT, ROSE_ACCENT, VIOLET_ACCENT, EMERALD_ACCENT } from './accent-presets';

export { CLIPBOARD_MANIFEST } from './manifests/clipboard.manifest';
export { QR_MANIFEST } from './manifests/qr.manifest';
export { DATALENS_MANIFEST } from './manifests/datalens.manifest';

/**
 * Single Source of Truth for all tools in Acklet.
 */
export const TOOL_REGISTRY: Record<string, ToolRegistryItem> = {
  'clipboard': CLIPBOARD_MANIFEST,
  'qr': QR_MANIFEST,
  'datalens': DATALENS_MANIFEST,
  'json-formatter': DATALENS_MANIFEST,
  'jwt-inspector': {
    id: 'jwt-inspector',
    name: 'JWT Inspector',
    slug: 'jwt-inspector',
    category: 'Developer',
    categorySlug: 'developer',
    shortDescription: 'Decode, verify, and inspect JSON Web Tokens in real-time.',
    about: 'Decode JWT tokens, inspect claims, and check expiration time without sending secrets to any server.',
    description: 'JWT Inspector lets you inspect token headers, payloads, and signatures with client-side verification.',
    icon: 'key-round',
    version: '1.0.0',
    status: 'live',
    badge: 'updated',
    featured: true,
    order: 3,
    subdomain: 'jwt',
    executionMode: 'browser',
    accentHue: 245,
    features: ['Client-side decoding', 'Expiration warning', 'Header & payload breakdown'],
    howTo: [
      'Paste your encoded JSON Web Token.',
      'Review decoded header and payload claims instantly.',
      'Check expiration timestamp and signature validity.'
    ],
    faqs: [
      {
        id: 'jwt-security',
        question: 'Is it safe to paste sensitive tokens?',
        answer: 'Yes. Token decoding happens 100% on your device inside browser memory without network transmission.'
      }
    ],
    related: ['clipboard', 'json-formatter', 'base64-encoder'],
    seo: {
      title: 'JWT Inspector & Token Decoder | Acklet',
      description: 'Decode and inspect JSON Web Tokens safely in your browser.',
      keywords: ['jwt decoder', 'jwt inspector', 'decode token']
    }
  },
  'uuid-generator': {
    id: 'uuid-generator',
    name: 'UUID Generator',
    slug: 'uuid-generator',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Generate cryptographically secure UUID v4 and v7 identifiers in bulk.',
    about: 'Generate cryptographically random UUIDs v4 and sortable UUIDs v7 instantly for databases and APIs.',
    description: 'Bulk UUID generator with custom formatting options (uppercase, hyphens) and one-click copy.',
    icon: 'fingerprint',
    version: '1.0.0',
    status: 'live',
    order: 4,
    subdomain: 'uuid',
    executionMode: 'browser',
    accentHue: 330,
    features: ['UUID v4 & v7', 'Bulk generation', 'Cryptographically secure'],
    howTo: [
      'Choose UUID version and quantity.',
      'Select formatting options.',
      'Copy generated UUIDs to clipboard.'
    ],
    faqs: [
      {
        id: 'uuid-randomness',
        question: 'Are the UUIDs cryptographically random?',
        answer: 'Yes, generated using the native browser crypto.getRandomValues API.'
      }
    ],
    related: ['clipboard', 'base64-encoder', 'json-formatter'],
    seo: {
      title: 'UUID Generator (v4 & v7) | Acklet',
      description: 'Generate bulk UUID v4 and v7 identifiers instantly.',
      keywords: ['uuid generator', 'guid generator', 'uuid v4', 'uuid v7']
    }
  },
  'base64-encoder': {
    id: 'base64-encoder',
    name: 'Base64 Encoder / Decoder',
    slug: 'base64-encoder',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Convert text, strings, and files to and from Base64 encoding.',
    about: 'Encode and decode Base64 strings, UTF-8 text, and binary files with URL-safe option.',
    description: 'Fast, secure Base64 converter running locally in your browser with zero server roundtrips.',
    icon: 'binary',
    version: '1.0.0',
    status: 'live',
    order: 5,
    subdomain: 'base64',
    executionMode: 'browser',
    accentHue: 215,
    features: ['Standard & URL-safe', 'Instant conversion', 'Zero server uploads'],
    howTo: [
      'Enter text or upload a file.',
      'Choose Encode or Decode.',
      'Copy the output string.'
    ],
    faqs: [
      {
        id: 'b64-urlsafe',
        question: 'Does this support URL-safe Base64?',
        answer: 'Yes, both RFC standard (+/) and URL-safe (-_) variants are supported.'
      }
    ],
    related: ['clipboard', 'jwt-inspector', 'json-formatter'],
    seo: {
      title: 'Base64 Encoder & Decoder | Acklet',
      description: 'Encode and decode text and files in Base64 format.',
      keywords: ['base64 encoder', 'base64 decoder', 'url safe base64']
    }
  },
  'qr-generator': {
    id: 'qr-generator',
    name: 'QR Generator',
    slug: 'qr-generator',
    category: 'Links/Web',
    categorySlug: 'links-web',
    shortDescription: 'Create, customize, and download high-resolution QR codes instantly.',
    about: 'QR Generator is a client-side studio for generating, customizing, and downloading QR codes with zero server tracking.',
    description: 'Create custom QR codes for URLs, text, Wi-Fi credentials, and contacts with real-time error-correction controls and high-contrast color validation.',
    icon: 'qr-code',
    version: '1.0.0',
    status: 'live',
    order: 6,
    subdomain: 'qr',
    executionMode: 'browser',
    layout: 'fullBleed',
    accent: 'emerald',
    accentHue: 160,
    features: ['Client-side generation', 'High-resolution PNG download', 'Real-time contrast guard', 'Custom error correction'],
    howTo: [
      'Enter your URL or text payload.',
      'Adjust styling and error correction.',
      'Download your PNG QR code or copy it directly.'
    ],
    faqs: [
      {
        id: 'qr-privacy',
        question: 'Are generated QR codes saved on a server?',
        answer: 'No. All QR matrix computation runs entirely inside your browser memory.'
      }
    ],
    related: ['urlshortener', 'clipboard', 'base64-encoder'],
    suggestedTools: ['urlshortener', 'clipboard', 'base64-encoder'],
    seo: {
      title: 'QR Generator: Free & Private QR Code Creator | Acklet',
      description: 'Generate high-resolution custom QR codes in your browser with zero tracking.',
      keywords: ['qr code generator', 'free qr generator', 'custom qr']
    }
  },
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
    related: ['qr-generator', 'clipboard', 'base64-encoder', 'json-formatter'],
    suggestedTools: ['qr-generator', 'clipboard', 'base64-encoder', 'json-formatter'],
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
