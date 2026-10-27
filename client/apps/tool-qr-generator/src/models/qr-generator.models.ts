// client/apps/tool-qr-generator/src/models/qr-generator.models.ts

export type ContentType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'geo'
  | 'event'
  | 'vcard'
  | 'social'
  | 'app'
  | 'crypto';

export interface WebsiteData {
  url: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  shortenLink?: boolean;
}

export interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}

export interface PhoneData {
  countryCode: string;
  number: string;
}

export interface SmsData {
  phone: string;
  message?: string;
  format?: 'SMSTO' | 'sms';
}

export interface WifiData {
  ssid: string;
  security?: 'WPA' | 'WEP' | 'nopass' | 'WPA3' | string;
  encryption?: 'WPA' | 'WEP' | 'nopass' | 'WPA3' | string;
  password?: string;
  hidden?: boolean;
  eapMethod?: 'PEAP' | 'TTLS' | 'PWD' | 'TLS' | '' | string;
  identity?: string;
  anonymousIdentity?: string;
  phase2?: string;
}

export interface GeoData {
  latitude: number | string;
  longitude: number | string;
  label?: string;
  query?: string;
  zoom?: number | string;
  provider?: 'geo' | 'google' | 'apple';
}

export interface EventData {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  allDay?: boolean;
  timezone?: string;
  location?: string;
  description?: string;
  organizer?: string;
  url?: string;
  reminderMinutes?: number;
  repeat?: 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

export interface VCardData {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  title?: string;
  phone?: string;
  workPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  birthday?: string;
  notes?: string;
  format?: 'vcard' | 'vcard3' | 'mecard';
}

export type SocialPlatform =
  | 'instagram'
  | 'x'
  | 'linkedin'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'vimeo'
  | 'whatsapp'
  | 'telegram'
  | 'github'
  | 'threads'
  | 'discord'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'
  | 'spotify'
  | 'medium'
  | 'patreon'
  | 'substack'
  | 'behance'
  | 'custom';

export interface SocialData {
  platform: SocialPlatform;
  handleOrUrl: string;
  startTime?: string | number;
  whatsappMessage?: string;
}

export interface AppData {
  platform: 'ios' | 'android' | 'both';
  iosUrl?: string;
  androidUrl?: string;
  fallbackUrl?: string;
}

export type CryptoCoin = 'bitcoin' | 'ethereum' | 'litecoin' | 'bitcoincash' | 'solana';

export interface CryptoData {
  coin: CryptoCoin;
  address: string;
  amount?: string;
  label?: string;
  message?: string;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type QrErrorCorrectionLevel = ErrorCorrectionLevel;

export type ExportFormat = 'png' | 'jpeg' | 'svg';

export type QrDotType =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'cross'
  | 'scanline';

export type QrCornerSquareType =
  | 'square'
  | 'dot'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'rounded'
  | 'pinch'
  | 'shield';

export type QrCornerDotType =
  | 'square'
  | 'dot'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'cross';

export type QrFrameStyle =
  | 'none'
  | 'simple-border'
  | 'rounded-card'
  | 'tag'
  | 'ticket'
  | 'coffee-cup'
  | 'shopping-bag'
  | 'phone'
  | 'speech-bubble'
  | 'polaroid'
  | 'banner-ribbon'
  | 'badge'
  | 'minimal-bracket'
  | 'gift-box'
  | 'storefront'
  | 'sticker-peel'
  | 'delivery-box'
  | 'envelope'
  | 'bottom-banner'
  | 'top-header'
  | 'badge-pill'
  | 'chat-bubble';

export interface QrFrameOptions {
  style: QrFrameStyle;
  text: string;
  color: string;
  textColor: string;
}

export function getDefaultCtaTextColor(theme?: string): string {
  if (theme) return theme === 'dark' ? '#ffffff' : '#000000';
  if (typeof document !== 'undefined') {
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme === 'dark') return '#ffffff';
    if (docTheme === 'light') return '#000000';
  }
  return '#000000';
}

export const DEFAULT_FRAME_OPTIONS: QrFrameOptions = {
  style: 'none',
  text: 'SCAN ME',
  color: '#3b82f6',
  textColor: '#000000'
};

export interface QrGradientOptions {
  enabled: boolean;
  type: 'linear' | 'radial';
  rotation: number; // in degrees: 0 to 360
  color1: string;
  color2: string;
}

export const DEFAULT_GRADIENT_OPTIONS: QrGradientOptions = {
  enabled: false,
  type: 'linear',
  rotation: 45,
  color1: '#0284C7',
  color2: '#2563EB'
};

export type QrOverallShape =
  | 'square'
  | 'circle'
  | 'rounded-square'
  | 'heart'
  | 'star'
  | 'hexagon'
  | 'diamond'
  | 'shield'
  | 'drop'
  | 'speech-bubble'
  | 'badge'
  | 'ticket';

export type QrShapeMode = 'around' | 'badge' | 'trim';

export type QrStyleStrength = 'safe' | 'balanced' | 'bold';

export interface QrArtShapeOptions {
  shape: QrOverallShape;
  mode: QrShapeMode;
  strength: QrStyleStrength;
  fadeEdges?: boolean;
  brandTint?: string;
}

export const DEFAULT_ART_SHAPE_OPTIONS: QrArtShapeOptions = {
  shape: 'square',
  mode: 'around',
  strength: 'balanced',
  fadeEdges: false
};

export interface QROptions {
  content: string;
  type: ContentType;
  /** Size in pixels (default: 300, range: 100-2000) */
  size?: number;
  /** Hex code for foreground/dark modules (default: #000000) */
  foregroundColor?: string;
  /** Hex code for background/light modules (default: #FFFFFF) */
  backgroundColor?: string;
  /** Optional rich gradient for foreground modules */
  foregroundGradient?: QrGradientOptions;
  /** Optional rich gradient for background canvas */
  backgroundGradient?: QrGradientOptions;
  /** Error correction capability: L (7%), M (15%), Q (25%), H (30%) */
  errorCorrection?: ErrorCorrectionLevel;
  /** Quiet zone margin in modules (default: 2) */
  margin?: number;
  /** Shape of the internal matrix dots/modules */
  dotType?: QrDotType;
  /** Shape of the 3 corner locator outer squares */
  cornerSquareType?: QrCornerSquareType;
  /** Shape of the 3 corner locator inner dots */
  cornerDotType?: QrCornerDotType;
  /** Custom color for corner square outlines */
  cornerSquareColor?: string;
  /** Custom color for corner dots */
  cornerDotColor?: string;
  /** Embedded logo image data URL or URL */
  logo?: string;
  /** Embedded logo scaling factor (0.1 to 0.5, default: 0.35) */
  logoSize?: number;
  /** Safe margin buffer around logo */
  logoMargin?: number;
  /** Whether logo background plate is transparent (default: true) */
  logoBgTransparent?: boolean;
  /** Decorative frame and CTA banner */
  frame?: QrFrameOptions;
  /** QR Art overall silhouette & shape styling */
  artShape?: QrArtShapeOptions;
}


export interface QRHistoryItem {
  id: string;
  name?: string;
  type: ContentType;
  content: string;
  formattedPayload: string;
  dataUrl: string;
  createdAt: number;
  options: Partial<QROptions>;
}

export interface QRState {
  dataUrl: string | null;
  formattedPayload: string;
  isGenerating: boolean;
  error: string | null;
}

export interface QRValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export type QrScanConfidence = 'high' | 'medium' | 'low';

export interface QRVerificationResult {
  isScannable: boolean;
  decodedPayload?: string;
  expectedPayload: string;
  match: boolean;
  message: string;
  confidence?: QrScanConfidence;
  fixAvailable?: boolean;
  reason?: string;
  tip?: string;
}

export interface QRMetadata {
  /** Estimated QR matrix version (1 to 40) */
  version: number;
  /** Maximum character capacity for calculated version and EC level */
  capacity: number;
  /** Current payload character length */
  used: number;
  /** Usage percentage (used / capacity * 100) rounded to 1 decimal place */
  usagePercent: number;
}

export interface ContrastCheckResult {
  ratio: number;
  hasLowContrast: boolean;
  level: 'AAA' | 'AA' | 'FAIL';
  warningMessage?: string;
}

export interface SizePreset {
  id: 'small' | 'medium' | 'large' | 'xl' | 'print';
  label: string;
  size: number;
  description: string;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'small', label: 'Small', size: 256, description: 'Thumbnails & digital signatures' },
  { id: 'medium', label: 'Medium', size: 512, description: 'Standard mobile scanning (Default)' },
  { id: 'large', label: 'Large', size: 1024, description: 'Flyers & documents' },
  { id: 'print', label: 'Print', size: 2048, description: 'High-res posters & signage' }
];

export interface ECLevelConfig {
  level: ErrorCorrectionLevel;
  label: string;
  recovery: string;
  description: string;
  recommended?: boolean;
}

export const EC_LEVEL_CONFIGS: Record<ErrorCorrectionLevel, ECLevelConfig> = {
  L: {
    level: 'L',
    label: 'Low (L)',
    recovery: '~7%',
    description: 'Recovers up to 7% damaged data. Minimal visual module density.'
  },
  M: {
    level: 'M',
    label: 'Medium (M)',
    recovery: '~15%',
    description: 'Recovers up to 15% damaged data. Recommended balance of density & reliability.',
    recommended: true
  },
  Q: {
    level: 'Q',
    label: 'Quartile (Q)',
    recovery: '~25%',
    description: 'Recovers up to 25% damaged data. High reliability for print materials.'
  },
  H: {
    level: 'H',
    label: 'High (H)',
    recovery: '~30%',
    description: 'Recovers up to 30% damaged data. Maximum robustness with denser module grid.'
  }
};

export interface ContentTypeConfig {
  type: ContentType;
  label: string;
  icon: string;
  placeholder: string;
  helperText: string;
  example: string;
  category?: 'static' | 'dynamic';
}

export const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  url: {
    type: 'url',
    label: 'Website URL',
    icon: 'globe',
    placeholder: 'https://example.com/page',
    helperText: '',
    example: 'https://acklet.com'
  },
  text: {
    type: 'text',
    label: 'Plain Text',
    icon: 'type',
    placeholder: 'Enter any text message, note, or code snippet...',
    helperText: '',
    example: 'Hello World from Acklet'
  },
  email: {
    type: 'email',
    label: 'Email',
    icon: 'mail',
    placeholder: 'user@example.com',
    helperText: 'Pre-addressed email draft with subject, body, and CC/BCC.',
    example: 'hello@acklet.com'
  },
  phone: {
    type: 'phone',
    label: 'Phone',
    icon: 'phone',
    placeholder: '+1 234 567 8900',
    helperText: 'Direct dial prompt on mobile devices (tel:).',
    example: '+14155552671'
  },
  sms: {
    type: 'sms',
    label: 'SMS',
    icon: 'message-square',
    placeholder: '+1 234 567 8900',
    helperText: 'Pre-filled text message to mobile recipient.',
    example: 'SMSTO:+14155552671:Hello from Acklet'
  },
  wifi: {
    type: 'wifi',
    label: 'Wi-Fi',
    icon: 'wifi',
    placeholder: 'Network SSID',
    helperText: 'Connects devices automatically without manual password entry.',
    example: 'WIFI:S:Office-Wifi;T:WPA;P:Secret2026;;'
  },
  geo: {
    type: 'geo',
    label: 'Location',
    icon: 'map-pin',
    placeholder: '37.7749, -122.4194',
    helperText: 'Coordinates opened in Google Maps or Apple Maps.',
    example: 'geo:37.7749,-122.4194?q=37.7749,-122.4194(Acklet)'
  },
  event: {
    type: 'event',
    label: 'Event (iCal)',
    icon: 'calendar',
    placeholder: 'Team Sync / Product Launch',
    helperText: 'Imports event directly into Apple Calendar, Google, or Outlook.',
    example: 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Acklet Launch\nEND:VEVENT\nEND:VCALENDAR'
  },
  vcard: {
    type: 'vcard',
    label: 'vCard 3.0',
    icon: 'user',
    placeholder: 'Full Name or Company',
    helperText: 'Rich digital business card imported into mobile contacts.',
    example: 'BEGIN:VCARD\nVERSION:3.0\nFN:Alex Mercer\nORG:Acklet\nEND:VCARD'
  },
  social: {
    type: 'social',
    label: 'Social Profile',
    icon: 'share-2',
    placeholder: '@username or profile URL',
    helperText: 'Links directly to social media profiles and channels.',
    example: 'https://instagram.com/acklet'
  },
  app: {
    type: 'app',
    label: 'App Store',
    icon: 'smartphone',
    placeholder: 'https://apps.apple.com/...',
    helperText: 'Direct store download link for mobile applications.',
    example: 'https://apps.apple.com/app/id123456789'
  },
  crypto: {
    type: 'crypto',
    label: 'Crypto Wallet',
    icon: 'wallet',
    placeholder: 'Wallet address',
    helperText: 'Direct transfer request for Bitcoin, Ethereum, Solana, and more.',
    example: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.005'
  }
};

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  dotType: QrDotType;
  cornerSquareType: QrCornerSquareType;
  cornerDotType: QrCornerDotType;
  foregroundColor: string;
  backgroundColor: string;
  cornerSquareColor?: string | null;
  cornerDotColor?: string | null;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'classic',
    name: 'Classic Black',
    description: 'Standard square matrix with universal compatibility',
    dotType: 'square',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    cornerSquareColor: null,
    cornerDotColor: null
  },
  {
    id: 'modern-dots',
    name: 'Modern Dots',
    description: 'Smooth circular modules and rounded locators in blue',
    dotType: 'dots',
    cornerSquareType: 'dot',
    cornerDotType: 'dot',
    foregroundColor: '#2563eb',
    backgroundColor: '#eff6ff',
    cornerSquareColor: null,
    cornerDotColor: null
  },
  {
    id: 'classy-navy',
    name: 'Classy Navy',
    description: 'Sophisticated dual-corner accents with curved leaves',
    dotType: 'rounded',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    foregroundColor: '#1e3a8a',
    backgroundColor: '#ffffff',
    cornerSquareColor: '#1e3a8a',
    cornerDotColor: '#3b82f6'
  },
  {
    id: 'minimal-soft',
    name: 'Minimal Soft',
    description: 'Soft rounded modules with dark neutral tones',
    dotType: 'rounded',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'square',
    foregroundColor: '#18181b',
    backgroundColor: '#fafafa',
    cornerSquareColor: null,
    cornerDotColor: null
  },
  {
    id: 'diamond-luxe',
    name: 'Diamond Luxe',
    description: 'Jeweled diamond modules with leaf locator frames',
    dotType: 'diamond',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'diamond',
    foregroundColor: '#0284c7',
    backgroundColor: '#f0f9ff',
    cornerSquareColor: '#0284c7',
    cornerDotColor: '#0369a1'
  },
  {
    id: 'starlight',
    name: 'Starlight',
    description: 'Stellar four-point sparkles with rounded corners',
    dotType: 'star',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'star',
    foregroundColor: '#7c3aed',
    backgroundColor: '#faf5ff',
    cornerSquareColor: '#7c3aed',
    cornerDotColor: '#6d28d9'
  }
];

// ============================================================================
// DYNAMIC QR TYPES & INTERFACES (Phase 3 Hosted Backend)
// ============================================================================

export type DynamicQrType =
  | 'DYNAMIC_URL'
  | 'DYNAMIC_PDF'
  | 'DYNAMIC_VCARD'
  | 'DYNAMIC_MENU'
  | 'DYNAMIC_COUPON'
  | 'DYNAMIC_APP'
  | 'DYNAMIC_SOCIAL'
  | 'DYNAMIC_MULTI_URL';

export type DynamicQrStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BLOCKED';

export interface DynamicQrAsset {
  id: string;
  fileName: string;
  detectedMime: string;
  sizeBytes: number;
  downloadUrl: string;
  createdAt: string;
}

export interface DynamicQrCode {
  code: string;
  type: DynamicQrType | string;
  title: string;
  shortUrl: string;
  targetUrl?: string;
  contentJson?: string;
  hasPassword: boolean;
  status: DynamicQrStatus | string;
  scanCount: number;
  uniqueScanCount: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  manageKey?: string;
  assets?: DynamicQrAsset[];
}

export interface CreateDynamicQrPayload {
  type: DynamicQrType | string;
  title?: string;
  targetUrl?: string;
  contentJson?: string;
  password?: string;
  customSlug?: string;
  expiresAt?: string;
}

export interface UpdateDynamicQrPayload {
  title?: string;
  targetUrl?: string;
  contentJson?: string;
  status?: DynamicQrStatus | string;
  expiresAt?: string;
  newPassword?: string;
  removePassword?: boolean;
}

export interface QrMetricEntry {
  key: string;
  count: number;
}

export interface QrScanAnalytics {
  code: string;
  totalScans: number;
  uniqueVisitors: number;
  dailyScans: QrMetricEntry[];
  byCountry: QrMetricEntry[];
  byDevice: QrMetricEntry[];
  byOs: QrMetricEntry[];
  byBrowser: QrMetricEntry[];
}

export interface ManagedDynamicQrItem {
  code: string;
  manageKey: string;
  title: string;
  type: string;
  shortUrl: string;
  targetUrl?: string;
  status: DynamicQrStatus | string;
  scanCount: number;
  createdAt: number;
}

export interface QrPublicInfoDto {
  code: string;
  type: string;
  title: string;
  hasPassword: boolean;
  status: string;
  targetUrl?: string;
  contentJson?: string;
  assets?: DynamicQrAsset[];
}

export interface DynamicPdfContent {
  documentTitle: string;
  description?: string;
  assetId?: string;
  fileName?: string;
  fileSizeBytes?: number;
}

export interface DynamicMenuItem {
  name: string;
  description?: string;
  price: string;
  dietary?: ('vegan' | 'vegetarian' | 'gluten-free' | 'spicy')[];
}

export interface DynamicMenuSection {
  category: string;
  items: DynamicMenuItem[];
}

export interface DynamicMenuContent {
  restaurantName: string;
  tagline?: string;
  currency?: string;
  sections: DynamicMenuSection[];
}

export interface DynamicCouponContent {
  title: string;
  discountText: string;
  couponCode: string;
  validUntil?: string;
  terms?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export interface DynamicVCardContent {
  fullName: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
}

export interface DynamicMultiUrlItem {
  title: string;
  url: string;
  icon?: string;
}

export interface DynamicMultiUrlContent {
  headerTitle: string;
  bio?: string;
  links: DynamicMultiUrlItem[];
}


