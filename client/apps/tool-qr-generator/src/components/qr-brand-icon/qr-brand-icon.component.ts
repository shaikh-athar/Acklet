// client/apps/tool-qr-generator/src/components/qr-brand-icon/qr-brand-icon.component.ts
import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

const PLATFORM_IMAGE_MAP: Record<string, string> = {
  github: '/assets/icons/platforms/icons8-github-96.png',
  threads: '/assets/icons/platforms/threads.png',
  discord: '/assets/icons/platforms/icons8-discord-96.png',
  whatsapp: '/assets/icons/platforms/icons8-whatsapp-96.png',
  pinterest: '/assets/icons/platforms/icons8-pinterest-96.png',
  reddit: '/assets/icons/platforms/icons8-reddit-96.png',
  snapchat: '/assets/icons/platforms/icons8-snapchat-96.png',
  spotify: '/assets/icons/platforms/icons8-spotify-96.png',
  medium: '/assets/icons/platforms/icons8-medium-96.png',
  behance: '/assets/icons/platforms/icons8-behance-96.png'
};

const BRAND_ICON_NAMES = new Set([
  'instagram',
  'x',
  'brand-x',
  'twitter',
  'linkedin',
  'youtube',
  'facebook',
  'tiktok',
  'whatsapp',
  'telegram',
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
  'solana',
  'sol',
  'litecoin',
  'ltc',
  'bitcoincash',
  'bch',
  'apple',
  'android',
  'github',
  'threads',
  'discord',
  'pinterest',
  'pintrest',
  'reddit',
  'snapchat',
  'spotify',
  'medium',
  'patreon',
  'pateron',
  'substack',
  'behance',
  'twitch'
]);

@Component({
  selector: 'app-qr-brand-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageSrc(); as src) {
      <img
        [src]="src"
        [alt]="name()"
        class="brand-icon-img"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    } @else {
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        class="brand-icon-svg"
        aria-hidden="true"
        focusable="false"
      >
        @switch (normalizedName()) {
          @case ('instagram') {
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
          }
          @case ('x') {
            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          }
          @case ('linkedin') {
            <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          }
          @case ('youtube') {
            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
            <polygon fill="currentColor" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
          }
          @case ('facebook') {
            <path fill="currentColor" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          }
          @case ('tiktok') {
            <path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.35 22a6.33 6.33 0 0 0 6.33-6.32V9.08a8.16 8.16 0 0 0 4.91 1.63V7.27a4.85 4.85 0 0 1-1-.58z" />
          }
          @case ('whatsapp') {
            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            <path fill="currentColor" d="M16 14.5c-.3.8-.9 1.4-1.7 1.6-.7.2-1.7.1-3.5-.7-2.3-1.1-3.8-3.5-3.9-3.7-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.8.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .5-.1.2-.2.3-.3.4l-.5.6c-.1.1-.2.2-.1.4.2.4.9 1.5 2 2.1 1.4.8 2.1.9 2.4.8.3-.1.7-.8.9-1.1.2-.3.4-.3.6-.2.2.1 1.4.7 1.6.8.2.1.4.2.4.3 0 .2 0 .9-.3 1.3z" />
          }
          @case ('telegram') {
            <path fill="currentColor" d="M21.6 3.6a1.2 1.2 0 0 0-1.3-.2L2.7 10.3c-.8.3-.8 1.4 0 1.7l4.7 1.8 1.8 5.6c.2.7 1 .9 1.5.4l2.7-2.6 5.3 3.9c.7.5 1.7.1 1.9-.7l3-15.6c.1-.4 0-.9-.3-1.2zm-9.8 10.2L9.6 19l-1.3-4.2 9.4-6.9-5.9 5.9z" />
          }
          @case ('bitcoin') {
            <path fill="currentColor" d="M15.75 10.15c.67-.62 1.05-1.5 1.05-2.5 0-2.02-1.53-3.65-3.6-3.65V2h-2v2H9V2H7v2H4v2h2v12H4v2h3v2h2v-2h2.2v2h2v-2c2.6 0 4.6-1.8 4.6-4.15 0-1.5-.75-2.8-1.85-3.7zM9 6h4.2c1.1 0 1.95.8 1.95 1.8 0 1-.85 1.8-1.95 1.8H9V6zm4.8 12H9v-4h4.8c1.2 0 2.1.85 2.1 2s-.9 2-2.1 2z" />
          }
          @case ('ethereum') {
            <path fill="currentColor" d="M11.944 17.97L4.5 13.658 11.944 24l7.444-10.342-7.444 4.312zM12.056 0L4.61 12.332l7.446 4.31 7.444-4.31L12.056 0zm-.056 15.344L6.02 11.83 12 2.766l5.98 9.064-5.98 3.514z" />
          }
          @case ('solana') {
            <path fill="currentColor" d="M4.6 18.2a1.3 1.3 0 0 1 .9-.4h14.8a.7.7 0 0 1 .5 1.2l-3.3 3.3a1.3 1.3 0 0 1-.9.4H1.8a.7.7 0 0 1-.5-1.2l3.3-3.3zm0-12.8a1.3 1.3 0 0 1 .9-.4h14.8a.7.7 0 0 1 .5 1.2l-3.3 3.3a1.3 1.3 0 0 1-.9.4H1.8a.7.7 0 0 1-.5-1.2l3.3-3.3zm14.8 5.1a1.3 1.3 0 0 1-.9.4H3.7a.7.7 0 0 1-.5-1.2l3.3-3.3a1.3 1.3 0 0 1 .9-.4h14.8a.7.7 0 0 1 .5 1.2l-3.3 3.3z" />
          }
          @case ('litecoin') {
            <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1.6 14.8h-4.8l.6-2.5 1.7-.5.4-1.6-1.7.5.8-3.2h2.2l-.4 1.7 1.8-.5-.4 1.6-1.8.5-.7 2.7h2.8z" fill-rule="evenodd" />
          }
          @case ('bitcoincash') {
            <g transform="rotate(-15 12 12)">
              <path fill="currentColor" d="M15.75 10.15c.67-.62 1.05-1.5 1.05-2.5 0-2.02-1.53-3.65-3.6-3.65V2h-2v2H9V2H7v2H4v2h2v12H4v2h3v2h2v-2h2.2v2h2v-2c2.6 0 4.6-1.8 4.6-4.15 0-1.5-.75-2.8-1.85-3.7zM9 6h4.2c1.1 0 1.95.8 1.95 1.8 0 1-.85 1.8-1.95 1.8H9V6zm4.8 12H9v-4h4.8c1.2 0 2.1.85 2.1 2s-.9 2-2.1 2z" />
            </g>
          }
          @case ('apple') {
            <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.76 1.05-1.82.93-2.87-.91.04-2 .61-2.65 1.37-.57.65-1.07 1.73-.93 2.76 1.01.08 2.02-.5 2.65-1.26z" />
          }
          @case ('android') {
            <path fill="currentColor" d="M17.52 14.33c-.45 0-.82-.37-.82-.82s.37-.82.82-.82.82.37.82.82-.37.82-.82.82zm-11.04 0c-.45 0-.82-.37-.82-.82s.37-.82.82-.82.82.37.82.82-.37.82-.82.82zM18.8 9.07l1.79-3.1a.48.48 0 1 0-.83-.48l-1.83 3.16A11.37 11.37 0 0 0 12 7.7a11.37 11.37 0 0 0-5.93.95L4.24 5.49a.48.48 0 1 0-.83.48l1.79 3.1A11.07 11.07 0 0 0 1 18.5h22a11.07 11.07 0 0 0-4.2-9.43z" />
          }
          @case ('patreon') {
            <circle cx="14.5" cy="9.5" r="5" fill="currentColor" />
            <rect x="4.5" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
          }
          @case ('substack') {
            <path fill="currentColor" d="M4 4h16v2.5H4zm0 5h16v2.5H4zm0 5.2 8 4.6 8-4.6V20l-8-4.5L4 20z" />
          }
          @default {
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
            <path fill="none" stroke="currentColor" stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          }
        }
      </svg>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: currentColor;
    }

    .brand-icon-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .brand-icon-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  `]
})
export class QrBrandIconComponent {
  readonly name = input.required<string>();

  readonly imageSrc = computed(() => {
    const norm = this.normalizedName();
    return PLATFORM_IMAGE_MAP[norm] ?? null;
  });

  static isBrandIcon(name: string | undefined): boolean {
    if (!name) return false;
    const lower = name.toLowerCase().trim();
    return BRAND_ICON_NAMES.has(lower);
  }

  normalizedName(): string {
    const raw = (this.name() || '').toLowerCase().trim();
    if (raw === 'brand-x' || raw === 'twitter') return 'x';
    if (raw === 'btc') return 'bitcoin';
    if (raw === 'eth') return 'ethereum';
    if (raw === 'sol') return 'solana';
    if (raw === 'ltc') return 'litecoin';
    if (raw === 'bch') return 'bitcoincash';
    if (raw === 'pintrest') return 'pinterest';
    if (raw === 'pateron') return 'patreon';
    return raw;
  }
}

