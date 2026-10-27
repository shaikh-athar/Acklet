// client/apps/tool-qr-generator/src/models/qr-frames.data.ts

export interface QrFrameDefinition {
  id: string;
  name: string;
  category: 'minimal' | 'retail' | 'social' | 'creative';
  width: number;
  height: number;
  qrBox: {
    x: number;
    y: number;
    size: number;
  };
  hasText: boolean;
  textBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    defaultText: string;
  };
  /**
   * Generates complete standalone SVG markup for preview & export rendering.
   */
  renderSvg: (options: {
    primaryColor: string;
    textColor: string;
    text: string;
    qrDataUrl?: string | null;
  }) => string;
}

export const QR_FRAME_TEMPLATES: QrFrameDefinition[] = [
  // 1. None
  {
    id: 'none',
    name: 'No Frame',
    category: 'minimal',
    width: 300,
    height: 300,
    qrBox: { x: 10, y: 10, size: 280 },
    hasText: false,
    renderSvg: ({ qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="10" y="10" width="280" height="280" />` : ''}
      </svg>
    `
  },

  // 2. Simple Border
  {
    id: 'simple-border',
    name: 'Thin Border',
    category: 'minimal',
    width: 320,
    height: 360,
    qrBox: { x: 35, y: 30, size: 250 },
    hasText: true,
    textBox: { x: 160, y: 325, width: 260, height: 26, fontSize: 14, defaultText: 'SCAN ME' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" width="100%" height="100%">
        <rect x="8" y="8" width="304" height="344" rx="16" fill="none" stroke="${primaryColor}" stroke-width="5" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="35" y="30" width="250" height="250" />` : ''}
        <text x="160" y="325" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="14" text-anchor="middle" letter-spacing="1.5">${text || 'SCAN ME'}</text>
      </svg>
    `
  },

  // 3. Rounded Card Banner
  {
    id: 'rounded-card',
    name: 'Modern Card',
    category: 'minimal',
    width: 320,
    height: 390,
    qrBox: { x: 35, y: 35, size: 250 },
    hasText: true,
    textBox: { x: 160, y: 345, width: 240, height: 38, fontSize: 13, defaultText: 'SCAN WITH CAMERA' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 390" width="100%" height="100%">
        <rect x="6" y="6" width="308" height="378" rx="20" fill="none" stroke="${primaryColor}" stroke-width="4" stroke-opacity="0.3" />
        <rect x="25" y="318" width="270" height="46" rx="23" fill="${primaryColor}" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="35" y="35" width="250" height="250" />` : ''}
        <text x="160" y="347" fill="${textColor || '#FFFFFF'}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1">${text || 'SCAN WITH CAMERA'}</text>
      </svg>
    `
  },

  // 4. Retail Tag
  {
    id: 'tag',
    name: 'Price Tag',
    category: 'retail',
    width: 320,
    height: 410,
    qrBox: { x: 45, y: 85, size: 230 },
    hasText: true,
    textBox: { x: 160, y: 365, width: 240, height: 26, fontSize: 13, defaultText: 'SCAN FOR DETAILS' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 410" width="100%" height="100%">
        <!-- Tag Body -->
        <path d="M 60 10 L 260 10 L 310 60 L 310 390 A 15 15 0 0 1 295 405 L 25 405 A 15 15 0 0 1 10 390 L 10 60 Z" fill="none" stroke="${primaryColor}" stroke-width="5" />
        <!-- Eyelet Hole -->
        <circle cx="160" cy="40" r="12" fill="none" stroke="${primaryColor}" stroke-width="4" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="45" y="85" width="230" height="230" />` : ''}
        <text x="160" y="365" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'SCAN FOR DETAILS'}</text>
      </svg>
    `
  },

  // 5. Cinema / Event Ticket
  {
    id: 'ticket',
    name: 'Event Ticket',
    category: 'retail',
    width: 320,
    height: 400,
    qrBox: { x: 50, y: 45, size: 220 },
    hasText: true,
    textBox: { x: 160, y: 355, width: 240, height: 28, fontSize: 13, defaultText: 'ADMIT ONE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
        <path d="M 15 15 L 305 15 A 10 10 0 0 1 315 25 L 315 190 A 20 20 0 0 0 315 230 L 315 385 A 10 10 0 0 1 305 395 L 15 395 A 10 10 0 0 1 5 385 L 5 230 A 20 20 0 0 0 5 190 L 5 25 A 10 10 0 0 1 15 15 Z" fill="none" stroke="${primaryColor}" stroke-width="5" />
        <line x1="25" y1="305" x2="295" y2="305" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,6" opacity="0.6" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="50" y="45" width="220" height="220" />` : ''}
        <text x="160" y="355" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="800" font-size="14" text-anchor="middle" letter-spacing="2">${text || 'ADMIT ONE'}</text>
      </svg>
    `
  },

  // 6. Coffee Cup
  {
    id: 'coffee-cup',
    name: 'Coffee Cup',
    category: 'creative',
    width: 320,
    height: 410,
    qrBox: { x: 77, y: 95, size: 166 },
    hasText: true,
    textBox: { x: 160, y: 345, width: 200, height: 26, fontSize: 13, defaultText: 'VIEW MENU' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 410" width="100%" height="100%">
        <!-- Steam swirls -->
        <path d="M 120 45 Q 125 30 120 18 Q 115 10 122 5" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <path d="M 160 45 Q 165 28 160 16 Q 155 8 162 4" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <path d="M 200 45 Q 205 30 200 18 Q 195 10 202 5" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <!-- Cup Lid & Body -->
        <rect x="35" y="52" width="250" height="14" rx="7" fill="${primaryColor}" />
        <path d="M 42 66 L 65 380 A 15 15 0 0 0 80 395 L 240 395 A 15 15 0 0 0 255 380 L 278 66 Z" fill="none" stroke="${primaryColor}" stroke-width="5" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="77" y="95" width="166" height="166" />` : ''}
        <text x="160" y="345" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.5">${text || 'VIEW MENU'}</text>
      </svg>
    `
  },

  // 7. Shopping Bag
  {
    id: 'shopping-bag',
    name: 'Shopping Bag',
    category: 'retail',
    width: 320,
    height: 410,
    qrBox: { x: 55, y: 110, size: 210 },
    hasText: true,
    textBox: { x: 160, y: 365, width: 220, height: 26, fontSize: 13, defaultText: 'SHOP ONLINE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 410" width="100%" height="100%">
        <!-- Handle -->
        <path d="M 110 85 C 110 30, 210 30, 210 85" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" />
        <!-- Bag Body -->
        <path d="M 30 85 L 290 85 L 280 395 A 10 10 0 0 1 270 405 L 50 405 A 10 10 0 0 1 40 395 Z" fill="none" stroke="${primaryColor}" stroke-width="5" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="55" y="110" width="210" height="210" />` : ''}
        <text x="160" y="365" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.5">${text || 'SHOP ONLINE'}</text>
      </svg>
    `
  },

  // 8. Smartphone Device
  {
    id: 'phone',
    name: 'Mobile Screen',
    category: 'social',
    width: 320,
    height: 420,
    qrBox: { x: 45, y: 70, size: 230 },
    hasText: true,
    textBox: { x: 160, y: 355, width: 240, height: 26, fontSize: 13, defaultText: 'OPEN IN APP' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" width="100%" height="100%">
        <!-- Phone Outer Frame -->
        <rect x="15" y="10" width="290" height="400" rx="36" fill="none" stroke="${primaryColor}" stroke-width="5" />
        <!-- Top Speaker Notch -->
        <rect x="120" y="24" width="80" height="6" rx="3" fill="${primaryColor}" opacity="0.6" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="45" y="70" width="230" height="230" />` : ''}
        <!-- Bottom Pill / Home Indicator -->
        <rect x="130" y="392" width="60" height="4" rx="2" fill="${primaryColor}" opacity="0.4" />
        <text x="160" y="355" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'OPEN IN APP'}</text>
      </svg>
    `
  },

  // 9. Speech Bubble
  {
    id: 'speech-bubble',
    name: 'Chat Bubble',
    category: 'social',
    width: 320,
    height: 390,
    qrBox: { x: 45, y: 40, size: 230 },
    hasText: true,
    textBox: { x: 160, y: 315, width: 240, height: 26, fontSize: 13, defaultText: 'CHAT WITH US' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 390" width="100%" height="100%">
        <!-- Bubble with Tail -->
        <path d="M 30 15 L 290 15 A 25 25 0 0 1 315 40 L 315 315 A 25 25 0 0 1 290 340 L 100 340 L 40 380 L 50 340 L 30 340 A 25 25 0 0 1 5 315 L 5 40 A 25 25 0 0 1 30 15 Z" fill="none" stroke="${primaryColor}" stroke-width="5" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="45" y="40" width="230" height="230" />` : ''}
        <text x="160" y="315" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'CHAT WITH US'}</text>
      </svg>
    `
  },

  // 10. Polaroid Frame
  {
    id: 'polaroid',
    name: 'Polaroid',
    category: 'creative',
    width: 320,
    height: 400,
    qrBox: { x: 35, y: 35, size: 250 },
    hasText: true,
    textBox: { x: 160, y: 350, width: 260, height: 35, fontSize: 15, defaultText: 'Follow Us' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
        <rect x="10" y="10" width="300" height="380" rx="8" fill="none" stroke="${primaryColor}" stroke-width="4" />
        <rect x="25" y="25" width="270" height="270" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-opacity="0.3" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="35" y="35" width="250" height="250" />` : ''}
        <text x="160" y="355" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="600" font-size="16" text-anchor="middle" font-style="italic">${text || 'Follow Us'}</text>
      </svg>
    `
  },

  // 11. Celebration Banner Ribbon
  {
    id: 'banner-ribbon',
    name: 'Ribbon Banner',
    category: 'creative',
    width: 320,
    height: 400,
    qrBox: { x: 45, y: 45, size: 230 },
    hasText: true,
    textBox: { x: 160, y: 345, width: 260, height: 35, fontSize: 13, defaultText: 'SPECIAL OFFER' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
        <!-- Card border -->
        <rect x="15" y="12" width="290" height="340" rx="16" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-opacity="0.4" />
        <!-- Ribbon Banner -->
        <path d="M 20 350 L 50 330 L 270 330 L 300 350 L 270 370 L 50 370 Z" fill="${primaryColor}" />
        <polygon points="20,350 35,338 35,362" fill="#000000" opacity="0.2" />
        <polygon points="300,350 285,338 285,362" fill="#000000" opacity="0.2" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="45" y="45" width="230" height="230" />` : ''}
        <text x="160" y="355" fill="${textColor || '#FFFFFF'}" font-family="sans-serif" font-weight="800" font-size="13" text-anchor="middle" letter-spacing="1.5">${text || 'SPECIAL OFFER'}</text>
      </svg>
    `
  },

  // 12. Rosette Award Badge
  {
    id: 'badge',
    name: 'Award Badge',
    category: 'creative',
    width: 320,
    height: 420,
    qrBox: { x: 78, y: 103, size: 164 },
    hasText: true,
    textBox: { x: 160, y: 40, width: 240, height: 26, fontSize: 13, defaultText: 'VERIFIED OFFICIAL' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" width="100%" height="100%">
        <!-- Rosette backing circle -->
        <circle cx="160" cy="185" r="130" fill="none" />
        <!-- Top Caption Banner -->
        <rect x="30" y="16" width="260" height="34" rx="17" fill="${primaryColor}" />
        <circle cx="160" cy="185" r="140" fill="none" stroke="${primaryColor}" stroke-width="5" />
        <circle cx="160" cy="185" r="130" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.5" />
        <!-- Ribbon Tails -->
        <polygon points="120,320 90,410 135,385 150,330" fill="${primaryColor}" opacity="0.85" />
        <polygon points="200,320 230,410 185,385 170,330" fill="${primaryColor}" opacity="0.85" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="78" y="103" width="164" height="164" />` : ''}
        <text x="160" y="38" fill="${textColor || '#FFFFFF'}" font-family="sans-serif" font-weight="800" font-size="12" text-anchor="middle" letter-spacing="1.2">${text || 'VERIFIED OFFICIAL'}</text>
      </svg>
    `
  },

  // 13. Minimal Viewfinder Brackets
  {
    id: 'minimal-bracket',
    name: 'Viewfinder',
    category: 'minimal',
    width: 320,
    height: 370,
    qrBox: { x: 40, y: 40, size: 240 },
    hasText: true,
    textBox: { x: 160, y: 335, width: 220, height: 26, fontSize: 13, defaultText: 'AIM CAMERA HERE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 370" width="100%" height="100%">
        <!-- 4 Corner Brackets -->
        <path d="M 20 55 L 20 20 L 55 20" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" />
        <path d="M 265 20 L 300 20 L 300 55" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" />
        <path d="M 20 265 L 20 300 L 55 300" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" />
        <path d="M 265 300 L 300 300 L 300 265" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="40" y="40" width="240" height="240" />` : ''}
        <text x="160" y="340" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.5">${text || 'AIM CAMERA HERE'}</text>
      </svg>
    `
  },

  // 14. Gift Box
  {
    id: 'gift-box',
    name: 'Gift Present',
    category: 'creative',
    width: 320,
    height: 410,
    qrBox: { x: 65, y: 110, size: 190 },
    hasText: true,
    textBox: { x: 160, y: 360, width: 220, height: 26, fontSize: 13, defaultText: 'CLAIM GIFT' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 410" width="100%" height="100%">
        <!-- Ribbon Bow -->
        <path d="M 160 50 C 130 10, 80 40, 160 50 Z" fill="${primaryColor}" />
        <path d="M 160 50 C 190 10, 240 40, 160 50 Z" fill="${primaryColor}" />
        <circle cx="160" cy="50" r="10" fill="${primaryColor}" />
        <!-- Lid -->
        <rect x="25" y="55" width="270" height="22" rx="6" fill="${primaryColor}" />
        <!-- Box Outline -->
        <path d="M 35 77 L 285 77 L 280 395 A 10 10 0 0 1 270 405 L 50 405 A 10 10 0 0 1 40 395 Z" fill="none" stroke="${primaryColor}" stroke-width="4" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="65" y="110" width="190" height="190" />` : ''}
        <text x="160" y="360" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="800" font-size="13" text-anchor="middle" letter-spacing="1.5">${text || 'CLAIM GIFT'}</text>
      </svg>
    `
  },

  // 15. Storefront Awning
  {
    id: 'storefront',
    name: 'Store Canopy',
    category: 'retail',
    width: 320,
    height: 410,
    qrBox: { x: 55, y: 100, size: 210 },
    hasText: true,
    textBox: { x: 160, y: 365, width: 220, height: 26, fontSize: 13, defaultText: 'VISIT OUR STORE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 410" width="100%" height="100%">
        <!-- Awning Roof -->
        <path d="M 20 50 L 300 50 L 280 15 L 40 15 Z" fill="${primaryColor}" />
        <path d="M 20 50 Q 37 70 55 50 Q 72 70 90 50 Q 107 70 125 50 Q 142 70 160 50 Q 177 70 195 50 Q 212 70 230 50 Q 247 70 265 50 Q 282 70 300 50" fill="${primaryColor}" />
        <!-- Pillars and Base -->
        <rect x="25" y="70" width="270" height="325" rx="8" fill="none" stroke="${primaryColor}" stroke-width="4" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="55" y="100" width="210" height="210" />` : ''}
        <text x="160" y="365" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'VISIT OUR STORE'}</text>
      </svg>
    `
  },

  // 16. Sticker Peel
  {
    id: 'sticker-peel',
    name: 'Die-cut Sticker',
    category: 'creative',
    width: 320,
    height: 380,
    qrBox: { x: 45, y: 35, size: 210 },
    hasText: true,
    textBox: { x: 140, y: 310, width: 220, height: 26, fontSize: 13, defaultText: 'STICK & SCAN' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 380" width="100%" height="100%">
        <!-- Sticker with bottom-right peel -->
        <path d="M 30 15 L 290 15 A 20 20 0 0 1 310 35 L 310 280 L 250 345 L 30 345 A 20 20 0 0 1 10 325 L 10 35 A 20 20 0 0 1 30 15 Z" fill="none" stroke="${primaryColor}" stroke-width="4" />
        <!-- Folded triangle peel corner -->
        <polygon points="310,280 250,345 250,280" fill="${primaryColor}" opacity="0.3" stroke="${primaryColor}" stroke-width="2" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="45" y="35" width="210" height="210" />` : ''}
        <text x="140" y="310" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1">${text || 'STICK & SCAN'}</text>
      </svg>
    `
  },

  // 17. Delivery Package Box
  {
    id: 'delivery-box',
    name: 'Delivery Box',
    category: 'retail',
    width: 320,
    height: 400,
    qrBox: { x: 55, y: 85, size: 210 },
    hasText: true,
    textBox: { x: 160, y: 355, width: 220, height: 26, fontSize: 13, defaultText: 'TRACK PACKAGE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
        <!-- Carton box -->
        <rect x="20" y="40" width="280" height="345" rx="10" fill="none" stroke="${primaryColor}" stroke-width="4" />
        <!-- Top Tape -->
        <rect x="135" y="25" width="50" height="30" fill="${primaryColor}" opacity="0.4" />
        <line x1="20" y1="55" x2="300" y2="55" stroke="${primaryColor}" stroke-width="2" opacity="0.4" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="55" y="85" width="210" height="210" />` : ''}
        <text x="160" y="355" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'TRACK PACKAGE'}</text>
      </svg>
    `
  },

  // 18. Postal Envelope
  {
    id: 'envelope',
    name: 'Postal Envelope',
    category: 'creative',
    width: 320,
    height: 400,
    qrBox: { x: 55, y: 85, size: 210 },
    hasText: true,
    textBox: { x: 160, y: 355, width: 220, height: 26, fontSize: 13, defaultText: 'OPEN MESSAGE' },
    renderSvg: ({ primaryColor, textColor, text, qrDataUrl }) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
        <rect x="15" y="25" width="290" height="355" rx="12" fill="none" stroke="${primaryColor}" stroke-width="4" />
        <!-- Envelope flap fold lines -->
        <polyline points="15,25 160,140 305,25" fill="none" stroke="${primaryColor}" stroke-width="2.5" opacity="0.5" />
        ${qrDataUrl ? `<image href="${qrDataUrl}" x="55" y="85" width="210" height="210" />` : ''}
        <text x="160" y="355" fill="${textColor || primaryColor}" font-family="sans-serif" font-weight="700" font-size="13" text-anchor="middle" letter-spacing="1.2">${text || 'OPEN MESSAGE'}</text>
      </svg>
    `
  }
];

export function getFrameById(id: string): QrFrameDefinition {
  return QR_FRAME_TEMPLATES.find(f => f.id === id) || QR_FRAME_TEMPLATES[0];
}

export function renderVectorFrame(
  template: QrFrameDefinition,
  innerSvgContent: string,
  qrSize: number,
  primaryColor: string,
  textColor: string,
  text: string,
  innerViewBox: string = `0 0 ${qrSize} ${qrSize}`,
  bgColor: string = '#FFFFFF'
): string {
  const svgWithoutQr = template.renderSvg({
    primaryColor,
    textColor: textColor || primaryColor,
    text: text || template.textBox?.defaultText || 'SCAN ME',
    qrDataUrl: null
  });

  const bgRect = bgColor && bgColor !== 'transparent'
    ? `<rect width="100%" height="100%" fill="${bgColor}" rx="16"/>\n`
    : '';

  const qrVectorBlock = `<svg x="${template.qrBox.x}" y="${template.qrBox.y}" width="${template.qrBox.size}" height="${template.qrBox.size}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${innerSvgContent}</svg>`;

  let result = svgWithoutQr
    .replace(/(<svg[^>]*\b)width=["'][^"']*["']/i, `$1width="${template.width}"`)
    .replace(/(<svg[^>]*\b)height=["'][^"']*["']/i, `$1height="${template.height}"`);

  if (!result.includes('xmlns:xlink=')) {
    result = result.replace(/<svg\b/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  if (bgRect) {
    result = result.replace(/(<svg[^>]*>)/i, `$1\n${bgRect}`);
  }
  return result.replace('</svg>', `${qrVectorBlock}\n</svg>`);
}
