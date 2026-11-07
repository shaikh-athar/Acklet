// packages/tool-registry/src/manifests/temp-email.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const TEMP_EMAIL_MANIFEST: ToolRegistryItem = {
  id: 'temp-email',
  name: 'Temporary Email',
  slug: 'temp-email',
  category: 'Utilities',
  categorySlug: 'utilities',
  shortDescription: 'Generate disposable temporary email inboxes, receive messages in real time, and auto-extract OTPs and verification links.',
  about: 'Temporary Email is a private, disposable inbox service powered by the Mail.tm API. It provides instant, anonymous mailboxes to receive activation emails, verification codes, and one-time passwords without exposing your personal email address or receiving spam.\n\nAll messages and inboxes are ephemeral and automatically expire, safeguarding your privacy during sign-ups, service testing, and app verification.',
  description: 'Generate instant temporary email addresses, receive incoming messages in real-time with smart auto-refresh, and automatically extract OTP verification codes and confirmation links with one-click copying.\n\nManage multiple disposable inboxes simultaneously, share them across devices with QR codes, and read HTML emails safely with tracking protection. No registration or personal data required.',
  icon: 'mail',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 5,
  subdomain: 'temp-email',
  layout: 'fullBleed',
  addedAt: '2026-11-04',
  updatedAt: '2026-11-04',
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
    { label: 'Cost', value: '100% Free' },
    { label: 'Infrastructure', value: 'Mail.tm API' },
    { label: 'Auto-Refresh', value: '10s Interval' },
    { label: 'Privacy', value: 'Zero Tracking' }
  ],
  highlights: [
    { label: 'Instant Generation', value: 'On load', tooltip: 'Disposable inbox ready immediately when you open the page' },
    { label: 'Smart OTP Extractor', value: 'One-click', tooltip: 'Automatically identifies verification codes from incoming messages' },
    { label: 'Multiple Inboxes', value: 'Up to 5', tooltip: 'Switch seamlessly between multiple disposable addresses' },
    { label: 'Tracking Protection', value: 'Active', tooltip: 'Blocks remote image beacons and third-party tracking pixels' }
  ],
  tabs: [
    { id: 'inbox', label: 'Inbox', icon: 'mail' }
  ],
  features: [
    'Instant temporary email creation on page load',
    'Powered by Mail.tm public infrastructure and API',
    'Live inbox with configurable auto-refresh (5s, 10s, 15s, 30s, or manual)',
    'Smart OTP extractor detects 4-8 digit verification codes with 1-click copy',
    'Automatic verification link detector with 1-click confirmation access',
    'Safe sandboxed HTML email rendering with CSS leakage prevention',
    'Privacy-focused tracking protection blocking remote spy pixels',
    'Multiple concurrent temporary inboxes with easy switching',
    'QR code sharing to view the same inbox on mobile devices',
    'Instant search and filtering by sender, subject, OTP, and attachments',
    'High-contrast dual-theme support (Dark & Light) meeting WCAG AA standards',
    'Responsive mobile layout with dedicated slide-in message viewer'
  ],
  howTo: [
    'Copy your generated temporary email address with one click.',
    'Use the address when registering on any website or testing email workflows.',
    'Wait a few seconds for the incoming message to appear in your live inbox.',
    'Click the email to view its content, or copy the highlighted OTP code immediately.',
    'When finished, switch inboxes, change your address, or delete the mailbox completely.'
  ],
  faqs: [
    {
      id: 'faq-what-is-temp-email',
      question: 'What is a temporary email address?',
      answer: 'A temporary (disposable) email address is a throwaway mailbox created to receive emails without exposing your real personal email address. It protects your primary inbox from spam, advertising lists, and data breaches.'
    },
    {
      id: 'faq-how-long-active',
      question: 'How long do temporary email addresses last?',
      answer: 'Temporary inboxes and messages are ephemeral. While active in your browser session, they remain accessible and auto-refresh. Mail.tm retains messages temporarily before automatic expiration and cleanup. They are not intended for permanent storage.'
    },
    {
      id: 'faq-can-i-send-email',
      question: 'Can I send emails from this temporary address?',
      answer: 'No. To prevent spam and abuse, Mail.tm and Acklet only support receiving incoming emails. You cannot send outgoing messages.'
    },
    {
      id: 'faq-otp-detection',
      question: 'How does the Smart OTP Extractor work?',
      answer: 'When an incoming email arrives, our intelligent client-side parser scans the subject, plain text, and HTML body for verification codes, security PINs, and one-time passwords. If found, it highlights the code in a VIP banner with a one-click copy button.'
    },
    {
      id: 'faq-privacy-security',
      question: 'Is this temporary email service private and secure?',
      answer: 'Yes. We do not require accounts, passwords, or personal identity details. Tracking pixels and external image beacons are blocked by default. However, because temporary domains are public and ephemeral, never use disposable email for sensitive financial, banking, or official government accounts.'
    },
    {
      id: 'faq-multiple-inboxes',
      question: 'Can I manage more than one temporary email at once?',
      answer: 'Yes! You can generate up to 5 concurrent temporary inboxes and switch between them using the inbox switcher at the top of the tool.'
    }
  ],
  related: ['clipboard', 'qr', 'barcode', 'urlshortener'],
  suggestedTools: ['clipboard', 'qr', 'urlshortener'],
  seo: {
    title: 'Temporary Email Generator & Disposable Inbox | Acklet',
    description: 'Generate free disposable temporary email addresses. Receive emails in real-time, auto-extract OTP verification codes, and block spam.',
    keywords: [
      'temporary email',
      'temp mail',
      'disposable email',
      'fake email generator',
      '10 minute mail',
      'otp extractor',
      'throwaway email',
      'anonymous email inbox'
    ]
  }
};

