// client/apps/tool-qr-generator/src/components/design-customizer/design-customizer.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType,
  DesignPreset,
  DESIGN_PRESETS,
  QrFrameStyle,
  QrFrameOptions,
  DEFAULT_FRAME_OPTIONS,
  QrArtShapeOptions,
  DEFAULT_ART_SHAPE_OPTIONS,
  QrOverallShape,
  QrShapeMode,
  QrStyleStrength
} from '../../models/qr-generator.models';
import { QR_FRAME_TEMPLATES, QrFrameDefinition } from '../../models/qr-frames.data';
import { QR_ART_SHAPES, getQrShapeById, QrShapeDefinition } from '../../utils/qr-shapes.data';
import { TsIconComponent, HlmBadge } from '@acklet/tool-shell';

export interface LogoPreset {
  id: string;
  name: string;
  icon: string;
  dataUrl: string | null;
  innerSvg?: string;
  safeThumbnail?: SafeHtml;
}

const PRESET_LOGOS: LogoPreset[] = [
  {
    id: 'none',
    name: 'None',
    icon: 'x',
    dataUrl: null,
    innerSvg: ''
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    icon: 'wifi',
    innerSvg: '<path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="20" r="1.5" fill="#3b82f6"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
  },
  {
    id: 'link',
    name: 'Link',
    icon: 'link',
    innerSvg: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  },
  {
    id: 'check',
    name: 'Verified',
    icon: 'check',
    innerSvg: '<path d="M20 6 9 17l-5-5" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  },
  {
    id: 'star',
    name: 'Star',
    icon: 'star',
    innerSvg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b" stroke="%23f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  },
  {
    id: 'heart',
    name: 'Heart',
    icon: 'heart',
    innerSvg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="#ef4444" stroke="#ef4444" stroke-width="1.5"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
  },
  {
    id: 'mail',
    name: 'Email',
    icon: 'mail',
    innerSvg: '<rect width="20" height="16" x="2" y="4" rx="2" stroke="#8b5cf6" stroke-width="2" fill="none"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="#8b5cf6" stroke-width="2" fill="none"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
  },
  {
    id: 'phone',
    name: 'Phone',
    icon: 'phone',
    innerSvg: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'message-circle',
    innerSvg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#25D366"/><path d="M16 14.5c-.3.8-.9 1.4-1.7 1.6-.7.2-1.7.1-3.5-.7-2.3-1.1-3.8-3.5-3.9-3.7-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.8.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .5-.1.2-.2.3-.3.4l-.5.6c-.1.1-.2.2-.1.4.2.4.9 1.5 2 2.1 1.4.8 2.1.9 2.4.8.3-.1.7-.8.9-1.1.2-.3.4-.3.6-.2.2.1 1.4.7 1.6.8.2.1.4.2.4.3 0 .2 0 .9-.3 1.3z" fill="#ffffff"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="%2325D366"/><path d="M16 14.5c-.3.8-.9 1.4-1.7 1.6-.7.2-1.7.1-3.5-.7-2.3-1.1-3.8-3.5-3.9-3.7-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.8.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .5-.1.2-.2.3-.3.4l-.5.6c-.1.1-.2.2-.1.4.2.4.9 1.5 2 2.1 1.4.8 2.1.9 2.4.8.3-.1.7-.8.9-1.1.2-.3.4-.3.6-.2.2.1 1.4.7 1.6.8.2.1.4.2.4.3 0 .2 0 .9-.3 1.3z" fill="%23ffffff"/></svg>'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'camera',
    innerSvg: '<rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="%23E1306C" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="%23E1306C" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="%23E1306C"/></svg>'
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: 'twitter',
    innerSvg: '<path fill="#0F1419" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%230F1419" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    innerSvg: '<path fill="#0A66C2" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%230A66C2" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'video',
    innerSvg: '<path fill="#FF0000" d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon fill="#ffffff" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23FF0000" d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon fill="%23ffffff" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    innerSvg: '<path fill="#24292F" fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%2324292F" fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>'
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: 'smartphone',
    innerSvg: '<path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.01-.49 2.63-1.24z"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.01-.49 2.63-1.24z"/></svg>'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    icon: 'dollar-sign',
    innerSvg: '<path fill="#F7931A" d="M15.75 10.15c.67-.62 1.05-1.5 1.05-2.5 0-2.02-1.53-3.65-3.6-3.65V2h-2v2H9V2H7v2H4v2h2v12H4v2h3v2h2v-2h2.2v2h2v-2c2.6 0 4.6-1.8 4.6-4.15 0-1.5-.75-2.8-1.85-3.7zM9 6h4.2c1.1 0 1.95.8 1.95 1.8 0 1-.85 1.8-1.95 1.8H9V6zm4.8 12H9v-4h4.8c1.2 0 2.1.85 2.1 2s-.9 2-2.1 2z"/>',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23F7931A" d="M15.75 10.15c.67-.62 1.05-1.5 1.05-2.5 0-2.02-1.53-3.65-3.6-3.65V2h-2v2H9V2H7v2H4v2h2v12H4v2h3v2h2v-2h2.2v2h2v-2c2.6 0 4.6-1.8 4.6-4.15 0-1.5-.75-2.8-1.85-3.7zM9 6h4.2c1.1 0 1.95.8 1.95 1.8 0 1-.85 1.8-1.95 1.8H9V6zm4.8 12H9v-4h4.8c1.2 0 2.1.85 2.1 2s-.9 2-2.1 2z"/></svg>'
  }
];

@Component({
  selector: 'app-qr-design-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, HlmBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-design-container">
      <!-- ========================================== -->
      <!-- 1. FRAMES SECTION                          -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'frame') {
        <div class="design-section">
          <label class="design-section-label">
            <span>Decorative Frames ({{ frameList.length }})</span>
            <span class="selection-indicator">{{ selectedFrameName() }}</span>
          </label>

          <!-- Visual Gallery of All 18 Vector Frames (Responsive Grid: 5-6 per row, no horizontal scrolling) -->
          <div class="frames-grid" role="region" aria-label="Decorative frame options">
            @for (opt of frameList; track opt.id) {
              <button
                type="button"
                class="frame-thumb-card"
                [class.active]="frame().style === opt.id"
                (click)="onFrameStyleSelect(opt.id)"
                [title]="opt.name + (opt.hasText ? ' (with caption)' : '')"
                [attr.aria-label]="opt.name + ' frame'"
              >
                <div class="frame-thumb-svg-wrap" [innerHTML]="opt.safeThumbnail"></div>
                @if (frame().style === opt.id) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>

          <!-- Controls for Active Frame (Text, Colors) -->
          @if (frame().style !== 'none') {
            <div class="frame-controls-card slide-fade-up">
              <!-- Frame CTA Text -->
              <div class="frame-input-group">
                <label class="sub-picker-label" for="frameCtaInput">CTA Text / Caption</label>
                <input
                  id="frameCtaInput"
                  type="text"
                  maxlength="28"
                  class="frame-text-input"
                  [value]="frame().text"
                  (input)="onFrameTextChange($any($event.target).value)"
                  placeholder="e.g. SCAN ME"
                />
              </div>

              <!-- Quick CTA Suggestions -->
              <div class="presets-row">
                <span class="preset-label">Quick CTAs:</span>
                @for (suggestion of ctaSuggestions; track suggestion) {
                  <button
                    type="button"
                    class="preset-chip"
                    [class.active]="frame().text === suggestion"
                    (click)="onFrameTextChange(suggestion)"
                    [title]="'Apply CTA text: ' + suggestion"
                    [attr.aria-label]="'Apply CTA text: ' + suggestion"
                  >
                    <span>{{ suggestion }}</span>
                  </button>
                }
              </div>

              <!-- Frame Color Customization -->
              <div class="corner-pickers-row">
                <div class="corner-picker-group">
                  <span class="sub-picker-label">Frame Color</span>
                  <div class="picker-input-wrapper">
                    <input
                      type="color"
                      class="native-color-input"
                      [value]="frame().color"
                      (input)="onFrameColorChange($any($event.target).value)"
                      aria-label="Frame color picker"
                    />
                    <input
                      type="text"
                      maxlength="7"
                      class="hex-text-input"
                      [value]="frame().color"
                      (input)="onFrameColorChange($any($event.target).value)"
                      aria-label="Frame color hex code"
                    />
                  </div>
                </div>

                <div class="corner-picker-group">
                  <span class="sub-picker-label">CTA Text Color</span>
                  <div class="picker-input-wrapper">
                    <input
                      type="color"
                      class="native-color-input"
                      [value]="frame().textColor"
                      (input)="onFrameTextColorChange($any($event.target).value)"
                      aria-label="Frame CTA text color picker"
                    />
                    <input
                      type="text"
                      maxlength="7"
                      class="hex-text-input"
                      [value]="frame().textColor"
                      (input)="onFrameTextColorChange($any($event.target).value)"
                      aria-label="Frame CTA text color hex code"
                    />
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- 2. SHAPES SECTION                          -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'shapes') {
        <!-- Quick Design Presets -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Style Presets</span>
            <span class="selection-indicator">Quick Themes</span>
          </label>
          <div class="template-presets-grid">
            @for (preset of designPresets; track preset.id) {
              <button
                type="button"
                class="template-preset-btn"
                [title]="preset.description"
                [attr.aria-label]="preset.name + ' style preset: ' + preset.description"
                (click)="onSelectPreset(preset)"
              >
                <div class="template-color-preview">
                  <span class="preview-swatch-fg" [style.background-color]="preset.foregroundColor"></span>
                  <span class="preview-swatch-bg" [style.background-color]="preset.backgroundColor"></span>
                </div>
                <div class="template-text">
                  <span class="template-name">{{ preset.name }}</span>
                  <span class="template-sub">{{ preset.dotType }} · {{ preset.cornerSquareType }}</span>
                </div>
              </button>
            }
          </div>
        </div>

        <hr class="design-divider" />

        <!-- Row 1: Matrix Body Dots (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Body Dots</span>
            <span class="selection-indicator">{{ dotType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Body dot shapes">
            @for (opt of dotOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="dotType() === opt.type"
                (click)="dotTypeChange.emit(opt.type)"
                [title]="'Dot shape: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' dot shape'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="3" y="3" width="18" height="18" rx="0" fill="currentColor" />
                    }
                    @case ('dots') {
                      <circle cx="12" cy="12" r="9" fill="currentColor" />
                    }
                    @case ('rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
                    }
                    @case ('extra-rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="9" fill="currentColor" />
                    }
                    @case ('classy') {
                      <path d="M 3 12 A 9 9 0 0 1 12 3 L 21 3 L 21 12 A 9 9 0 0 1 12 21 L 3 21 Z" fill="currentColor" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 5 3 L 19 3 A 2 2 0 0 1 21 5 L 21 12 A 9 9 0 0 1 12 21 L 5 21 A 2 2 0 0 1 3 19 L 3 12 A 9 9 0 0 1 12 3 Z" fill="currentColor" />
                    }
                    @case ('diamond') {
                      <polygon points="12,2 22,12 12,22 2,12" fill="currentColor" />
                    }
                    @case ('star') {
                      <polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" fill="currentColor" />
                    }
                    @case ('heart') {
                      <path d="M 12 21 C 4 15 2 9 7 4 C 10 2 12 5 12 5 C 12 5 14 2 17 4 C 22 9 20 15 12 21 Z" fill="currentColor" />
                    }
                    @case ('cross') {
                      <polygon points="9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" fill="currentColor" />
                    }
                    @case ('scanline') {
                      <rect x="2" y="6" width="20" height="12" rx="3" fill="currentColor" />
                    }
                  }
                </svg>
                @if (dotType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <!-- Row 2: Corner Outer Frame (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Corner Outer Frame</span>
            <span class="selection-indicator">{{ cornerSquareType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Corner frame shapes">
            @for (opt of cornerSquareOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="cornerSquareType() === opt.type"
                (click)="cornerSquareTypeChange.emit(opt.type)"
                [title]="'Corner outer frame: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' corner locator frame'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('extra-rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="6" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('dot') {
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('classy') {
                      <path d="M 3 12 A 9 9 0 0 1 12 3 L 21 3 L 21 12 A 9 9 0 0 1 12 21 L 3 21 Z" fill="none" stroke="currentColor" stroke-width="3" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 5 3 L 19 3 A 2 2 0 0 1 21 5 L 21 12 A 9 9 0 0 1 12 21 L 5 21 A 2 2 0 0 1 3 19 L 3 12 A 9 9 0 0 1 12 3 Z" fill="none" stroke="currentColor" stroke-width="3" />
                    }
                    @case ('rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('pinch') {
                      <path d="M 3 3 Q 12 7 21 3 Q 17 12 21 21 Q 12 17 3 21 Q 7 12 3 3 Z" fill="none" stroke="currentColor" stroke-width="2.5" />
                    }
                    @case ('shield') {
                      <path d="M 3 3 L 21 3 L 21 14 Q 12 22 12 22 Q 12 22 3 14 Z" fill="none" stroke="currentColor" stroke-width="2.5" />
                    }
                  }
                </svg>
                @if (cornerSquareType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <!-- Row 3: Corner Inner Dot (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Corner Inner Dot</span>
            <span class="selection-indicator">{{ cornerDotType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Corner dot shapes">
            @for (opt of cornerDotOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="cornerDotType() === opt.type"
                (click)="cornerDotTypeChange.emit(opt.type)"
                [title]="'Corner inner dot: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' corner inner dot'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor" />
                    }
                    @case ('dot') {
                      <circle cx="12" cy="12" r="8" fill="currentColor" />
                    }
                    @case ('rounded') {
                      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" />
                    }
                    @case ('extra-rounded') {
                      <rect x="4" y="4" width="16" height="16" rx="8" fill="currentColor" />
                    }
                    @case ('classy') {
                      <path d="M 4 12 A 8 8 0 0 1 12 4 L 20 4 L 20 12 A 8 8 0 0 1 12 20 L 4 20 Z" fill="currentColor" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 6 4 L 18 4 A 2 2 0 0 1 20 6 L 20 12 A 8 8 0 0 1 12 20 L 6 20 A 2 2 0 0 1 4 18 L 4 12 A 8 8 0 0 1 12 4 Z" fill="currentColor" />
                    }
                    @case ('diamond') {
                      <polygon points="12,3 21,12 12,21 3,12" fill="currentColor" />
                    }
                    @case ('star') {
                      <polygon points="12,3 14,9.5 21,12 14,14.5 12,21 10,14.5 3,12 10,9.5" fill="currentColor" />
                    }
                    @case ('heart') {
                      <path d="M 12 20 C 5 15 3 9 7 5 C 10 3 12 6 12 6 C 12 6 14 3 17 5 C 21 9 19 15 12 20 Z" fill="currentColor" />
                    }
                    @case ('cross') {
                      <polygon points="9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9" fill="currentColor" />
                    }
                  }
                </svg>
                @if (cornerDotType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <hr class="design-divider" />

        <!-- Corner Color Customization -->
        <div class="design-section">
          <div class="corner-color-header">
            <label class="design-section-label">
              <span>Corner Accent Colors</span>
            </label>
            <label class="link-colors-toggle">
              <input
                type="checkbox"
                class="qr-checkbox"
                [checked]="linkCornerColors()"
                (change)="toggleLinkCornerColors($event)"
              />
              <span>Match foreground color</span>
            </label>
          </div>

          @if (!linkCornerColors()) {
            <div class="corner-pickers-row slide-fade-up">
              <div class="corner-picker-group">
                <span class="sub-picker-label">Corner Frame</span>
                <div class="picker-input-wrapper">
                  <input
                    type="color"
                    class="native-color-input"
                    [value]="cornerSquareColor() || foregroundColor()"
                    (input)="onCornerSquareColorInput($event)"
                    aria-label="Corner frame color picker"
                  />
                  <input
                    type="text"
                    maxlength="7"
                    class="hex-text-input"
                    [value]="cornerSquareColor() || foregroundColor()"
                    (input)="onCornerSquareHexInput($event)"
                    aria-label="Corner frame hex code"
                  />
                </div>
              </div>

              <div class="corner-picker-group">
                <span class="sub-picker-label">Corner Dot</span>
                <div class="picker-input-wrapper">
                  <input
                    type="color"
                    class="native-color-input"
                    [value]="cornerDotColor() || foregroundColor()"
                    (input)="onCornerDotColorInput($event)"
                    aria-label="Corner dot color picker"
                  />
                  <input
                    type="text"
                    maxlength="7"
                    class="hex-text-input"
                    [value]="cornerDotColor() || foregroundColor()"
                    (input)="onCornerDotHexInput($event)"
                    aria-label="Corner dot hex code"
                  />
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- 3. LOGO SECTION                            -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'logo') {
        <div class="design-section logo-section">
          <div class="logo-header">
            <label class="design-section-label">
              <span>Center Logo & Branding</span>
            </label>
            @if (logo()) {
              <span hlmBadge variant="outline" class="logo-active-badge">Active</span>
            }
          </div>

          <!-- Visual Logo Presets Grid (Each logo superimposed on dummy QR) -->
          <div class="logo-presets-section">
            <span class="sub-picker-label">Brand & Utility Icons ({{ logoPresets.length }})</span>
            <div class="logo-grid" role="region" aria-label="Logo and branding presets">
              @for (preset of logoPresets; track preset.id) {
                <button
                  type="button"
                  class="logo-thumb-card"
                  [class.active]="isLogoPresetActive(preset)"
                  (click)="applyLogoPreset(preset.dataUrl)"
                  [title]="'Logo preset: ' + preset.name"
                  [attr.aria-label]="'Select ' + preset.name + ' logo preset'"
                >
                  <div class="logo-preview-wrap" [innerHTML]="preset.safeThumbnail"></div>
                  <span class="logo-thumb-name">{{ preset.name }}</span>
                  @if (isLogoPresetActive(preset)) {
                    <div class="logo-active-pip"></div>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Active Logo Controls (Prominently visible immediately when logo is selected) -->
          @if (logo()) {
            <div class="active-logo-card slide-fade-up">
              <div class="logo-preview-row">
                <div class="thumbnail-wrapper">
                  <img [src]="logo()" alt="Logo preview thumbnail" class="logo-thumbnail" />
                </div>
                <div class="logo-info">
                  <span class="logo-status-title">Custom Logo Embedded</span>
                  <span class="logo-status-sub">Centered with transparent background</span>
                </div>
                <button
                  type="button"
                  class="remove-logo-btn"
                  (click)="removeLogo()"
                  title="Remove embedded logo"
                  aria-label="Remove embedded logo"
                >
                  <ts-icon name="trash-2" class="remove-icon" />
                  <span>Remove</span>
                </button>
              </div>

              <!-- Size Slider -->
              <div class="logo-slider-group">
                <div class="slider-header">
                  <span class="slider-label">Logo Size</span>
                  <span class="slider-val">{{ (logoSize() * 100).toFixed(0) }}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.40"
                  step="0.01"
                  class="range-slider"
                  [value]="logoSize()"
                  (input)="onLogoSizeChange($event)"
                  aria-label="Logo size scale slider"
                />
              </div>

              <!-- Margin Slider -->
              <div class="logo-slider-group">
                <div class="slider-header">
                  <span class="slider-label">Safety Margin Buffer</span>
                  <span class="slider-val">{{ logoMargin() }}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  class="range-slider"
                  [value]="logoMargin()"
                  (input)="onLogoMarginChange($event)"
                  aria-label="Logo margin buffer slider"
                />
              </div>
            </div>
          }

          <!-- Upload Dropzone (if no logo or to change) -->
          <div
            class="logo-dropzone"
            [class.drag-over]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragging.set(false)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()"
            role="button"
            tabindex="0"
            (keydown.enter)="fileInput.click()"
            aria-label="Upload custom logo file"
          >
            <input
              #fileInput
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              class="hidden-file-input"
              (change)="onFileSelected($event)"
            />
            <ts-icon name="upload-cloud" class="dropzone-icon" />
            <div class="dropzone-text">
              <span class="dropzone-primary">Click to upload or drag logo here</span>
              <span class="dropzone-hint">PNG, SVG, or JPEG (Max 2MB)</span>
            </div>
          </div>

          @if (uploadError()) {
            <p class="upload-error-msg" role="alert">
              <ts-icon name="alert-circle" class="error-icon" />
              <span>{{ uploadError() }}</span>
            </p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      flex: 1 0 auto;
      min-height: min-content;
      box-sizing: border-box;
    }

    .qr-design-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      flex: 1 0 auto;
      min-height: min-content;
      padding-bottom: 8px;
    }

    .design-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      flex: 0 0 auto;
    }

    .design-section.logo-section {
      flex: 1 1 auto;
      min-height: 200px;
    }

    .design-section-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      letter-spacing: -0.01em;
    }

    .selection-indicator {
      font-size: 12px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, #60a5fa);
      text-transform: capitalize;
    }

    .design-divider {
      border: none;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    /* Template Presets Grid */
    .template-presets-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      width: 100%;
    }

    .template-preset-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      min-height: 44px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      overflow: hidden;
      box-sizing: border-box;
      transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
    }

    .template-preset-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .template-preset-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .template-color-preview {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .preview-swatch-fg,
    .preview-swatch-bg {
      width: 50%;
      height: 100%;
    }

    .template-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .template-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-sub {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      text-transform: capitalize;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }


    /* Decorative Frames Grid (5-6 per row, no horizontal scrolling) */
    .frames-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .frames-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
      }
    }

    @media (max-width: 540px) {
      .frames-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
    }

    @media (max-width: 380px) {
      .frames-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
    }

    /* Frame Visual Thumbnails (5-6 in one row, slightly bigger, tooltip on hover) */
    .frame-thumb-card {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 86px;
      padding: 6px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      position: relative;
      transition: all 150ms ease;
      box-sizing: border-box;
    }

    .frame-thumb-card:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .frame-thumb-card.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.25);
    }

    .frame-thumb-card:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .frame-thumb-card .active-indicator-pip {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
    }

    .frame-thumb-svg-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .frame-thumb-svg-wrap svg {
      width: 100%;
      height: 100%;
      max-height: 70px;
      object-fit: contain;
    }


    /* Real Shape Glyph Grid (5-6 per row, slightly bigger items, no horizontal scroll) */
    .glyph-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .glyph-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
    }

    @media (max-width: 480px) {
      .glyph-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
    }

    @media (max-width: 360px) {
      .glyph-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
    }

    .glyph-chip-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-width: 0;
      height: 60px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      position: relative;
      transition: all 150ms ease;
      box-sizing: border-box;
    }

    .glyph-chip-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #ffffff);
      transform: translateY(-1px);
    }

    .glyph-chip-btn.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
    }

    .glyph-chip-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .chip-shape-svg {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      color: currentColor;
    }

    .active-indicator-pip {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      pointer-events: none;
    }

    /* Frame Controls Card */
    .frame-controls-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
    }

    .frame-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Dual-Theme Input Formatting: #FFFFFF in Light Mode, var(--surface-2) in Dark Mode */
    .frame-text-input {
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.15));
      background: #ffffff;
      color: var(--text, #111827);
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    :host-context([data-theme='dark']) .frame-text-input,
    :host-context(.dark) .frame-text-input {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
    }

    .frame-text-input:focus {
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 0 2px var(--tool-accent-soft, rgba(59, 130, 246, 0.2));
    }

    /* Corner Pickers Row */
    .corner-pickers-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 4px;
    }

    @media (max-width: 480px) {
      .corner-pickers-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }

    .corner-picker-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sub-picker-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.6)));
    }

    .picker-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.15));
      border-radius: 8px;
      padding: 4px 8px;
      transition: border-color 150ms ease;
    }

    :host-context([data-theme='dark']) .picker-input-wrapper,
    :host-context(.dark) .picker-input-wrapper {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
    }

    .native-color-input {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .hex-text-input {
      width: 100%;
      border: none;
      background: transparent;
      color: var(--text, #111827);
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      outline: none;
    }

    :host-context([data-theme='dark']) .hex-text-input,
    :host-context(.dark) .hex-text-input {
      color: var(--text, #fcfcfc);
    }

    /* Presets Row */
    .presets-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .preset-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      text-transform: uppercase;
    }

    .preset-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 9999px;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease;
    }

    .preset-chip:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #ffffff);
    }

    .preset-chip.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      font-weight: 650;
    }

    .preset-chip:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .preset-icon {
      width: 12px;
      height: 12px;
    }

    /* Corner Color Toggle */
    .corner-color-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .link-colors-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      cursor: pointer;
    }

    .qr-checkbox {
      accent-color: var(--tool-accent, #3b82f6);
      width: 14px;
      height: 14px;
      cursor: pointer;
    }

    /* Logo Section Styles */
    .logo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-active-badge {
      font-size: 11px;
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--tool-accent, #60a5fa);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
    }

    .logo-ec-callout {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.2));
    }

    .ec-callout-icon {
      width: 16px;
      height: 16px;
      color: var(--tool-accent, #60a5fa);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .ec-callout-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ec-callout-title {
      font-size: 12px;
      font-weight: 650;
      color: var(--tool-accent, #60a5fa);
    }

    .ec-callout-desc {
      font-size: 11px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      line-height: 1.35;
    }

    /* Logo Presets Grid */
    .logo-presets-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .logo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 8px;
    }

    .logo-thumb-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 7px 5px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      text-align: center;
      min-width: 0;
    }

    .logo-thumb-card:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.07));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.35));
      transform: translateY(-1px);
    }

    .logo-thumb-card.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.6));
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
    }

    :host-context([data-theme="light"]) .logo-thumb-card,
    [data-theme="light"] .logo-thumb-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .logo-thumb-card:hover,
    [data-theme="light"] .logo-thumb-card:hover {
      background: #F1F5F9;
      border-color: #93C5FD;
    }

    :host-context([data-theme="light"]) .logo-thumb-card.active,
    [data-theme="light"] .logo-thumb-card.active {
      background: #EFF6FF;
      border-color: #3B82F6;
      box-shadow: 0 0 8px rgba(37, 99, 235, 0.15);
    }

    .logo-preview-wrap {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .logo-preview-wrap,
    [data-theme="light"] .logo-preview-wrap {
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .logo-thumb-name {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    :host-context([data-theme="light"]) .logo-thumb-name,
    [data-theme="light"] .logo-thumb-name {
      color: #334155;
    }

    .logo-thumb-card.active .logo-thumb-name {
      color: var(--accent-strong, #60a5fa);
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .logo-thumb-card.active .logo-thumb-name {
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .frame-thumb-card,
    [data-theme="light"] .frame-thumb-card,
    :host-context([data-theme="light"]) .shape-thumb-card,
    [data-theme="light"] .shape-thumb-card,
    :host-context([data-theme="light"]) .glyph-chip-btn,
    [data-theme="light"] .glyph-chip-btn {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #334155;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="light"]) .frame-thumb-card:hover,
    [data-theme="light"] .frame-thumb-card:hover,
    :host-context([data-theme="light"]) .shape-thumb-card:hover,
    [data-theme="light"] .shape-thumb-card:hover,
    :host-context([data-theme="light"]) .glyph-chip-btn:hover,
    [data-theme="light"] .glyph-chip-btn:hover {
      background: #F8FAFC;
      border-color: #93C5FD;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .frame-thumb-card.active,
    [data-theme="light"] .frame-thumb-card.active,
    :host-context([data-theme="light"]) .shape-thumb-card.active,
    [data-theme="light"] .shape-thumb-card.active,
    :host-context([data-theme="light"]) .glyph-chip-btn.active,
    [data-theme="light"] .glyph-chip-btn.active {
      background: #EFF6FF;
      border-color: #3B82F6;
      color: #1D4ED8;
      box-shadow: 0 0 0 1px #3B82F6, 0 2px 6px rgba(59, 130, 246, 0.15);
    }

    :host-context([data-theme="light"]) .shape-thumb-name,
    [data-theme="light"] .shape-thumb-name {
      color: #475569;
    }

    :host-context([data-theme="light"]) .shape-thumb-card.active .shape-thumb-name,
    [data-theme="light"] .shape-thumb-card.active .shape-thumb-name {
      color: #1D4ED8;
    }

    .logo-active-pip {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 6px var(--tool-accent, #3b82f6);
    }

    /* Logo Dropzone */
    .logo-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 20px 16px;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      border: 1.5px dashed var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 12px;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
      flex: 1 1 auto;
      min-height: 110px;
      text-align: center;
    }

    .logo-dropzone:hover,
    .logo-dropzone.drag-over {
      border-color: var(--tool-accent, #3b82f6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
    }

    .logo-dropzone:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .dropzone-icon {
      width: 40px;
      height: 40px;
      color: var(--tool-accent, var(--accent, #3b82f6));
      flex-shrink: 0;
      opacity: 0.85;
      transition: transform 150ms ease;
    }

    .logo-dropzone:hover .dropzone-icon {
      transform: scale(1.08);
      opacity: 1;
    }

    .dropzone-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .dropzone-primary {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .dropzone-hint {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }

    .hidden-file-input {
      display: none;
    }

    .upload-error-msg {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #ef4444;
    }

    .error-icon {
      width: 14px;
      height: 14px;
    }

    /* Active Logo Card */
    .active-logo-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--surface-2, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 12px;
    }

    .logo-preview-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .thumbnail-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: #ffffff;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-thumbnail {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .logo-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1 1 0%;
      min-width: 0;
    }

    .logo-status-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .logo-status-sub {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }

    .remove-logo-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .remove-logo-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .remove-icon {
      width: 12px;
      height: 12px;
    }

    .logo-slider-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slider-label {
      font-size: 11.5px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.6)));
    }

    .slider-val {
      font-size: 11px;
      font-weight: 600;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, #60a5fa);
    }

    .range-slider {
      width: 100%;
      accent-color: var(--tool-accent, #3b82f6);
      cursor: pointer;
      height: 4px;
    }

    /* Custom Scrollbar for visual gallery tracks */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: var(--border, rgba(255, 255, 255, 0.12)) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
      height: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 4px;
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-fade-up {
      animation: slideFadeUp 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up,
      .frame-thumb-card,
      .glyph-chip-btn,
      .template-preset-btn,
      * {
        animation: none !important;
        transition-duration: 0.01ms !important;
        transform: none !important;
      }
    }
  `]
})
export class DesignCustomizerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  // Mini vector QR placeholder used inside illustrated frame thumbnails
  private readonly MINI_QR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="3" width="2" height="2"/><rect x="13" y="3" width="2" height="2"/><rect x="10" y="7" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/><rect x="14" y="11" width="2" height="2"/><rect x="10" y="15" width="2" height="2"/><rect x="14" y="15" width="2" height="2"/><rect x="18" y="15" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="18" y="19" width="2" height="2"/></svg>`;

  private readonly SAFE_PREVIEW_QR_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="3" width="2" height="2"/><rect x="13" y="3" width="2" height="2"/><rect x="10" y="7" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/><rect x="14" y="11" width="2" height="2"/><rect x="10" y="15" width="2" height="2"/><rect x="14" y="15" width="2" height="2"/><rect x="18" y="15" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="18" y="19" width="2" height="2"/></svg>');

  readonly activeSection = input<'all' | 'shapes' | 'logo' | 'frame'>('all');
  readonly artShape = input<QrArtShapeOptions>(DEFAULT_ART_SHAPE_OPTIONS);
  readonly dotType = input<QrDotType>('square');
  readonly cornerSquareType = input<QrCornerSquareType>('square');
  readonly cornerDotType = input<QrCornerDotType>('square');
  readonly foregroundColor = input<string>('#000000');
  readonly cornerSquareColor = input<string | null>(null);
  readonly cornerDotColor = input<string | null>(null);
  readonly logo = input<string | null>(null);
  readonly logoSize = input<number>(0.35);
  readonly logoMargin = input<number>(4);
  readonly frame = input<QrFrameOptions>(DEFAULT_FRAME_OPTIONS);

  readonly artShapeChange = output<QrArtShapeOptions>();
  readonly dotTypeChange = output<QrDotType>();
  readonly cornerSquareTypeChange = output<QrCornerSquareType>();
  readonly cornerDotTypeChange = output<QrCornerDotType>();
  readonly cornerSquareColorChange = output<string | null>();
  readonly cornerDotColorChange = output<string | null>();
  readonly logoChange = output<string | null>();
  readonly logoSizeChange = output<number>();
  readonly logoMarginChange = output<number>();
  readonly frameChange = output<QrFrameOptions>();
  readonly presetApply = output<DesignPreset>();

  readonly shapeList: Array<QrShapeDefinition & { safeThumbnail: SafeHtml }> = QR_ART_SHAPES.map(s => ({
    ...s,
    safeThumbnail: this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 32 32" width="28" height="28" class="shape-thumb-svg" aria-hidden="true">${s.previewSvg}</svg>`
    )
  }));

  readonly currentShapeDef = computed<QrShapeDefinition>(() =>
    getQrShapeById(this.artShape().shape)
  );

  readonly designPresets = DESIGN_PRESETS;
  readonly linkCornerColors = signal<boolean>(true);
  readonly isDragging = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);
  private generateLogoThumbnail(preset: LogoPreset): SafeHtml {
    const baseModules = `<rect width="28" height="28" rx="4" fill="#FFFFFF"/><g fill="#1E293B"><path fill-rule="evenodd" d="M2,2 h7 v7 h-7 z M3.2,3.2 v4.6 h4.6 v-4.6 z M4.4,4.4 h2.2 v2.2 h-2.2 z"/><path fill-rule="evenodd" d="M19,2 h7 v7 h-7 z M20.2,3.2 v4.6 h4.6 v-4.6 z M21.4,4.4 h2.2 v2.2 h-2.2 z"/><path fill-rule="evenodd" d="M2,19 h7 v7 h-7 z M3.2,20.2 v4.6 h4.6 v-4.6 z M4.4,21.4 h2.2 v2.2 h-2.2 z"/><rect x="11" y="3" width="1.3" height="1.3" rx="0.3"/><rect x="14" y="3" width="1.3" height="1.3" rx="0.3"/><rect x="11" y="6" width="1.3" height="1.3" rx="0.3"/><rect x="14" y="6" width="1.3" height="1.3" rx="0.3"/><rect x="3" y="11" width="1.3" height="1.3" rx="0.3"/><rect x="6" y="11" width="1.3" height="1.3" rx="0.3"/><rect x="3" y="14" width="1.3" height="1.3" rx="0.3"/><rect x="6" y="14" width="1.3" height="1.3" rx="0.3"/><rect x="21" y="11" width="1.3" height="1.3" rx="0.3"/><rect x="24" y="11" width="1.3" height="1.3" rx="0.3"/><rect x="21" y="14" width="1.3" height="1.3" rx="0.3"/><rect x="24" y="14" width="1.3" height="1.3" rx="0.3"/><rect x="11" y="21" width="1.3" height="1.3" rx="0.3"/><rect x="14" y="21" width="1.3" height="1.3" rx="0.3"/><rect x="11" y="24" width="1.3" height="1.3" rx="0.3"/><rect x="14" y="24" width="1.3" height="1.3" rx="0.3"/></g>`;

    if (preset.id === 'none') {
      const centerModules = `<g fill="#1E293B"><rect x="11" y="11" width="2.4" height="2.4" rx="0.4"/><rect x="14.6" y="11" width="2.4" height="2.4" rx="0.4"/><rect x="11" y="14.6" width="2.4" height="2.4" rx="0.4"/><rect x="14.6" y="14.6" width="2.4" height="2.4" rx="0.4"/></g>`;
      return this.sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="100%" height="100%">${baseModules}${centerModules}</svg>`
      );
    }

    const badge = `<rect x="8" y="8" width="12" height="12" rx="3" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="0.75"/>`;
    const iconEmbed = `<g transform="translate(9.5, 9.5) scale(0.375)">${preset.innerSvg || ''}</g>`;

    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="100%" height="100%">${baseModules}${badge}${iconEmbed}</svg>`
    );
  }

  readonly logoPresets: Array<LogoPreset & { safeThumbnail: SafeHtml }> = PRESET_LOGOS.map(p => ({
    ...p,
    safeThumbnail: this.generateLogoThumbnail(p)
  }));

  readonly frameList: Array<QrFrameDefinition & { safeThumbnail: SafeHtml }> = QR_FRAME_TEMPLATES.map(tpl => {
    const rawSvg = tpl.id === 'none'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%"><rect x="24" y="24" width="252" height="252" rx="16" fill="none" stroke="currentColor" stroke-dasharray="8,8" stroke-width="6"/><g transform="translate(50, 50) scale(8.3)">${this.MINI_QR}</g></svg>`
      : tpl.renderSvg({
          primaryColor: 'currentColor',
          textColor: 'currentColor',
          text: 'SCAN',
          qrDataUrl: this.SAFE_PREVIEW_QR_DATA_URL
        });

    return {
      ...tpl,
      safeThumbnail: this.sanitizer.bypassSecurityTrustHtml(rawSvg)
    };
  });

  readonly selectedFrameName = computed<string>(() => {
    const currentStyle = this.frame().style;
    const found = QR_FRAME_TEMPLATES.find(f => f.id === currentStyle);
    return found ? found.name : 'No Frame';
  });

  readonly dotOptions: { type: QrDotType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'dots', label: 'Dots' },
    { type: 'rounded', label: 'Rounded' },
    { type: 'diamond', label: 'Diamond' },
    { type: 'star', label: 'Star' },
    { type: 'heart', label: 'Heart' },
    { type: 'cross', label: 'Cross' },
    { type: 'scanline', label: 'Scanline' }
  ];

  readonly cornerSquareOptions: { type: QrCornerSquareType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'extra-rounded', label: 'Rounded' },
    { type: 'dot', label: 'Circle' },
    { type: 'rounded', label: 'Smooth' }
  ];

  readonly cornerDotOptions: { type: QrCornerDotType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'dot', label: 'Circle' },
    { type: 'rounded', label: 'Smooth' },
    { type: 'diamond', label: 'Diamond' },
    { type: 'star', label: 'Star' },
    { type: 'heart', label: 'Heart' },
    { type: 'cross', label: 'Cross' }
  ];

  readonly ctaSuggestions: string[] = [
    'SCAN ME',
    'VISIT WEBSITE',
    'VIEW MENU',
    'CONNECT WI-FI',
    'SAVE CONTACT',
    'GET OFFER'
  ];

  scrollGallery(track: HTMLElement, delta: number): void {
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }

  onFrameStyleSelect(style: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      style: style as QrFrameStyle
    });
  }

  onFrameTextChange(text: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      text
    });
  }

  onFrameColorChange(color: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      color
    });
  }

  onFrameTextColorChange(textColor: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      textColor
    });
  }

  onSelectPreset(preset: DesignPreset): void {
    this.presetApply.emit(preset);
  }

  toggleLinkCornerColors(event: Event): void {
    const isLinked = (event.target as HTMLInputElement).checked;
    this.linkCornerColors.set(isLinked);
    if (isLinked) {
      this.cornerSquareColorChange.emit(null);
      this.cornerDotColorChange.emit(null);
    }
  }

  onCornerSquareColorInput(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.cornerSquareColorChange.emit(color);
  }

  onCornerSquareHexInput(event: Event): void {
    const hex = (event.target as HTMLInputElement).value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.cornerSquareColorChange.emit(hex);
    }
  }

  onCornerDotColorInput(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.cornerDotColorChange.emit(color);
  }

  onCornerDotHexInput(event: Event): void {
    const hex = (event.target as HTMLInputElement).value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.cornerDotColorChange.emit(hex);
    }
  }

  isLogoPresetActive(preset: LogoPreset): boolean {
    if (preset.id === 'none') {
      return !this.logo();
    }
    return this.logo() === preset.dataUrl;
  }

  applyLogoPreset(dataUrl: string | null): void {
    this.uploadError.set(null);
    this.logoChange.emit(dataUrl);
  }

  removeLogo(): void {
    this.uploadError.set(null);
    this.logoChange.emit(null);
  }

  onLogoSizeChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.logoSizeChange.emit(val);
  }

  onLogoMarginChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.logoMarginChange.emit(val);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    this.uploadError.set(null);

    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      this.uploadError.set('Please upload a valid PNG, JPEG, or SVG image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.uploadError.set('Image size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.logoChange.emit(reader.result);
      }
    };
    reader.onerror = () => {
      this.uploadError.set('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }
}
