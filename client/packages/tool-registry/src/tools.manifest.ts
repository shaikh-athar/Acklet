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
