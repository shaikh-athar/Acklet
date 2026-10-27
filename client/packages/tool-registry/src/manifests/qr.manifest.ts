// packages/tool-registry/src/manifests/qr.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const QR_MANIFEST: ToolRegistryItem = {
  id: 'qr',
  name: 'QR Code Generator',
  slug: 'qr',
  category: 'Utilities',
  categorySlug: 'utilities',
  shortDescription: 'Create, customize, and download high-resolution QR codes locally in your browser.',
  about: 'QR Generator is a lightweight, privacy-first utility to generate and customize QR codes for text, URLs, email addresses, and phone numbers. Everything is computed 100% client-side with zero telemetry.',
  description: 'Create QR codes for websites, plain text, email messages, and phone numbers. Customize error correction and size, test color contrast, preview in real time, and download crisp PNG files without sending any data to a remote server.',
  icon: 'qr-code',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 2,
  subdomain: 'qr',
  layout: 'fullBleed',
  addedAt: '2026-10-20',
  updatedAt: '2026-10-20',
  accent: 'blue',
  accentHue: 217,
  supports: ['shield-check', 'zap', 'download'],
  theme: {
    accent: BLUE_ACCENT,
    font: {
      family: 'Figtree',
      fontFamily: "'Figtree Variable', 'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      weights: [400, 500, 600, 700],
      fallback: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      source: 'self-hosted'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Privacy', value: '100% Client-Side' },
    { label: 'Export', value: 'Lossless PNG' },
    { label: 'Tracking', value: 'Zero Telemetry' }
  ],
  highlights: [
    { label: 'Privacy', value: '100% Local', tooltip: 'No server upload; generated entirely in-browser' },
    { label: 'Payloads', value: '4 Formats', tooltip: 'Text, URL, Email, and Phone types supported' },
    { label: 'Export', value: 'Crisp PNG', tooltip: 'Standard raster export ready for screens and print' }
  ],
  tabs: [
    { id: 'create', label: 'Generator', icon: 'qr-code' }
  ],
  features: [
    'Processed locally in your browser — zero tracking',
    'Supports Text, URLs, mailto: emails, and tel: phone numbers',
    'Instant real-time preview on every keystroke',
    'One-click high-resolution PNG download',
    'Clean dual-theme support (Dark & Light)'
  ],
  howTo: [
    'Select your content type: Text, URL, Email, or Phone.',
    'Enter your text or link into the input canvas.',
    'Check the live QR code preview on the right.',
    'Click Download PNG to save your code instantly.'
  ],
  howItWorks: [
    'Select content type to configure payload formatting automatically.',
    'Type or paste your information in the input area.',
    'The client engine renders the QR code matrix with 250ms debouncing.',
    'Export the generated canvas as a PNG file directly to your downloads.'
  ],
  faqs: [
    {
      id: 'faq-privacy',
      question: 'Does this QR Generator send my data to a server?',
      answer: 'No. The entire QR generation process happens 100% client-side in your browser. No text, link, email, or phone number ever leaves your device.'
    },
    {
      id: 'faq-formats',
      question: 'What content types are supported?',
      answer: 'You can generate QR codes for plain text, website URLs, RFC 5322 email addresses (mailto:), and international phone numbers (tel:).'
    },
    {
      id: 'faq-commercial',
      question: 'Can I use generated QR codes for commercial projects and print?',
      answer: 'Yes! Generated QR codes are completely free and unencumbered for personal or commercial use.'
    }
  ],
  related: ['clipboard', 'json-formatter', 'uuid-generator', 'base64-encoder'],
  suggestedTools: ['clipboard', 'json-formatter', 'uuid-generator', 'base64-encoder'],
  seo: {
    title: 'QR Code Generator — Free, Private & Instant | Acklet',
    description: 'Generate customizable QR codes for text, URLs, email, and phone numbers directly in your browser. 100% private with no tracking.',
    keywords: ['qr generator', 'qr code maker', 'client-side qr', 'free qr code', 'private qr code']
  }
};
