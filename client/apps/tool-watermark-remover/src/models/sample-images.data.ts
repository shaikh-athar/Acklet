// apps/tool-watermark-remover/src/models/sample-images.data.ts
import { SampleWatermarkImage } from './watermark.models';

export const SAMPLE_WATERMARK_IMAGES: SampleWatermarkImage[] = [
  {
    id: 'nature-coastline',
    name: 'Coastal Sunset',
    description: 'Corner text watermark over soft sky and ocean gradient',
    watermarkType: 'Corner Text',
    width: 800,
    height: 520,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%231E1B4B"/>
          <stop offset="35%" stop-color="%237C2D12"/>
          <stop offset="65%" stop-color="%23D97706"/>
          <stop offset="100%" stop-color="%23FDE68A"/>
        </linearGradient>
        <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%23F59E0B"/>
          <stop offset="25%" stop-color="%230F766E"/>
          <stop offset="100%" stop-color="%23042F2E"/>
        </linearGradient>
      </defs>
      <!-- Background Sky -->
      <rect width="800" height="340" fill="url(%23skyGrad)"/>
      <!-- Sun -->
      <circle cx="400" cy="340" r="90" fill="%23FFFBEB" opacity="0.9"/>
      <!-- Ocean -->
      <rect y="340" width="800" height="180" fill="url(%23oceanGrad)"/>
      <!-- Mountains -->
      <polygon points="0,340 160,240 320,340" fill="%231E1B4B" opacity="0.7"/>
      <polygon points="480,340 640,260 800,340" fill="%231E1B4B" opacity="0.8"/>
      <!-- Water Waves -->
      <path d="M 0 380 Q 200 370 400 380 T 800 380" stroke="%23FDE68A" stroke-width="2" fill="none" opacity="0.4"/>
      <path d="M 0 420 Q 200 410 400 420 T 800 420" stroke="%23FEF3C7" stroke-width="2" fill="none" opacity="0.3"/>
      <!-- Prominent Corner Watermark -->
      <rect x="520" y="440" width="250" height="50" rx="8" fill="black" opacity="0.35"/>
      <text x="645" y="472" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="1">© ACKLET PHOTO</text>
    </svg>`
  },
  {
    id: 'studio-portrait',
    name: 'Abstract Studio',
    description: 'Central overlay stamp watermark across colorful shapes',
    watermarkType: 'Center Stamp',
    width: 800,
    height: 520,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <rect width="800" height="520" fill="%230B0F19"/>
      <!-- Studio Graphic Elements -->
      <circle cx="200" cy="260" r="160" fill="%233B82F6" opacity="0.6"/>
      <circle cx="560" cy="220" r="180" fill="%23EC4899" opacity="0.6"/>
      <polygon points="400,80 640,440 160,440" fill="%238B5CF6" opacity="0.5"/>
      <rect x="280" y="160" width="240" height="240" rx="40" fill="%23F43F5E" opacity="0.7"/>
      <!-- Central Watermark Overlay Stamp -->
      <g transform="rotate(-15 400 260)">
        <rect x="180" y="220" width="440" height="70" rx="12" fill="%23000000" opacity="0.5" stroke="%23FFFFFF" stroke-dasharray="8 6" stroke-width="3"/>
        <text x="400" y="265" font-family="sans-serif" font-size="32" font-weight="900" fill="%23FFFFFF" text-anchor="middle" letter-spacing="3" opacity="0.95">PREVIEW COPY</text>
      </g>
    </svg>`
  },
  {
    id: 'product-card',
    name: 'Minimalist Architecture',
    description: 'Diagonal repeating grid watermark over architectural lines',
    watermarkType: 'Diagonal Grid',
    width: 800,
    height: 520,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <rect width="800" height="520" fill="%23F8FAFC"/>
      <!-- Architectural Structures -->
      <polygon points="120,520 280,140 440,520" fill="%231E293B"/>
      <polygon points="340,520 480,200 620,520" fill="%23334155"/>
      <polygon points="480,520 600,280 720,520" fill="%2364748B"/>
      <circle cx="680" cy="120" r="60" fill="%23F59E0B"/>
      <!-- Multiple Diagonal Watermark Stripes -->
      <g opacity="0.35" fill="%23000000" font-family="sans-serif" font-weight="bold" font-size="22">
        <text x="200" y="100" transform="rotate(-25 200 100)">WATERMARK</text>
        <text x="500" y="100" transform="rotate(-25 500 100)">WATERMARK</text>
        <text x="150" y="320" transform="rotate(-25 150 320)">WATERMARK</text>
        <text x="450" y="320" transform="rotate(-25 450 320)">WATERMARK</text>
      </g>
    </svg>`
  }
];

