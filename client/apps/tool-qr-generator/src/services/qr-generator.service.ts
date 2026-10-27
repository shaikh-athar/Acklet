// client/apps/tool-qr-generator/src/services/qr-generator.service.ts
import { Injectable } from '@angular/core';
import type QRCodeStyling from 'qr-code-styling';
import type { Options as QRCodeStylingOptions } from 'qr-code-styling';
import {
  ContentType,
  ErrorCorrectionLevel,
  ExportFormat,
  GeoData,
  QRMetadata,
  QROptions,
  QRValidationResult,
  SmsData,
  VCardData,
  WifiData,
  EventData,
  SocialData,
  AppData,
  CryptoData,
  WebsiteData,
  EmailData,
  PhoneData,
  QrFrameOptions,
  getDefaultCtaTextColor,
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType
} from '../models/qr-generator.models';
import { QR_FRAME_TEMPLATES, renderVectorFrame } from '../models/qr-frames.data';
import { renderQrToSvg } from '../utils/qr-svg-renderer';
import { detectPlatformFromUrl } from '../utils/social-platforms.data';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  buildWebsitePayload,
  validateWebsite,
  buildTextPayload,
  validateText,
  buildEmailPayload,
  validateEmail,
  buildPhonePayload,
  validatePhone,
  buildSmsPayload,
  validateSms,
  buildWifiPayload,
  validateWifi,
  buildGeoPayload,
  validateGeo,
  buildEventPayload,
  validateEvent,
  buildVCardPayload,
  validateVCard,
  buildSocialPayload,
  validateSocial,
  buildAppPayload,
  validateApp,
  buildCryptoPayload,
  validateCrypto,
  encodeURIComponentStrict,
  parseMapCoordinates
} from './qr-payload-builders';

const MAX_QR_CHARACTERS = 2953;

/**
 * Byte mode maximum capacity per QR Version (1 to 40) across error correction levels.
 * Source: ISO/IEC 18004 Standard.
 */
const QR_VERSION_CAPACITIES: Record<ErrorCorrectionLevel, number[]> = {
  L: [
    17, 32, 53, 78, 106, 134, 154, 192, 230, 271,
    321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
    929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732,
    1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953
  ],
  M: [
    14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
    711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370,
    1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331
  ],
  Q: [
    11, 20, 32, 46, 60, 74, 86, 108, 130, 151,
    177, 203, 241, 258, 292, 322, 364, 394, 442, 482,
    509, 544, 593, 649, 700, 742, 790, 842, 898, 958,
    983, 1061, 1128, 1193, 1264, 1322, 1401, 1477, 1555, 1663
  ],
  H: [
    7, 14, 24, 34, 44, 58, 64, 84, 98, 119,
    137, 155, 177, 194, 220, 250, 280, 310, 338, 382,
    403, 439, 461, 511, 535, 593, 625, 658, 698, 742,
    793, 845, 903, 961, 986, 1054, 1096, 1142, 1222, 1273
  ]
};

@Injectable({
  providedIn: 'root'
})
export class QRGeneratorService {
  private qrStylingClassPromise: Promise<any> | null = null;
  private currentQRCode: QRCodeStyling | null = null;
  private lastDataUrl: string | null = null;
  private lastOptions: Partial<QROptions> | null = null;

  /**
   * Calculates the dynamic QR Version (1–40), maximum capacity, and usage percentage.
   */
  getMetadata(content: string, errorCorrection: ErrorCorrectionLevel = 'M'): QRMetadata {
    const used = content.length;
    const table = QR_VERSION_CAPACITIES[errorCorrection] || QR_VERSION_CAPACITIES.M;

    let version = 1;
    for (let i = 0; i < table.length; i++) {
      if (used <= table[i]) {
        version = i + 1;
        break;
      }
      if (i === table.length - 1) {
        version = 40;
      }
    }

    const capacity = table[version - 1];
    const usagePercent = capacity > 0
      ? Math.min(100, Math.round((used / capacity) * 1000) / 10)
      : 0;

    return {
      version,
      capacity,
      used,
      usagePercent
    };
  }

  /**
   * Escapes special reserved characters for Wi-Fi QR strings (\, ;, ,, :, ")
   */
  escapeWifiString(val: string): string {
    return val.replace(/([\\;,:""])/g, '\\$1');
  }

  /**
   * Builds a website URL payload with optional UTM tracking parameters.
   */
  buildWebsitePayload(data: WebsiteData): string {
    return buildWebsitePayload(data);
  }

  /**
   * Builds an email mailto: URI with subject, body, CC, and BCC.
   */
  buildEmailPayload(data: EmailData): string {
    return buildEmailPayload(data);
  }

  /**
   * Builds a phone tel: URI.
   */
  buildPhonePayload(data: PhoneData): string {
    return buildPhonePayload(data);
  }

  /**
   * Builds a standardized Wi-Fi connection payload.
   */
  buildWifiPayload(data: WifiData): string {
    return buildWifiPayload(data);
  }

  /**
   * Builds an RFC-compliant vCard 3.0 contact payload.
   */
  buildVCardPayload(data: VCardData): string {
    return buildVCardPayload(data);
  }

  /**
   * Builds a standard SMS payload (SMSTO:phone:message).
   */
  buildSmsPayload(data: SmsData): string {
    return buildSmsPayload(data);
  }

  /**
   * Builds an RFC 5870 Geo URI payload.
   */
  buildGeoPayload(data: GeoData): string {
    return buildGeoPayload(data);
  }

  /**
   * Builds an RFC 5545 iCalendar event payload.
   */
  buildEventPayload(data: EventData): string {
    return buildEventPayload(data);
  }

  /**
   * Builds a Social platform profile payload.
   */
  buildSocialPayload(data: SocialData): string {
    return buildSocialPayload(data);
  }

  /**
   * Builds an App Store download payload.
   */
  buildAppPayload(data: AppData): string {
    return buildAppPayload(data);
  }

  /**
   * Builds a Cryptocurrency payment payload.
   */
  buildCryptoPayload(data: CryptoData): string {
    return buildCryptoPayload(data);
  }

  /**
   * Encodes raw user input or structured data into an actionable URI scheme
   * recognized by mobile devices (iOS / Android) for native app dispatch.
   *
   * Formats:
   * - Phone → tel:+919876543210
   * - SMS → sms:+919876543210?body=text (RFC 5724)
   * - Email → mailto:user@example.com (with query parameters URL-encoded)
   * - URL → https://example.com
   * - Wi-Fi → WIFI:T:WPA;S:NetworkName;P:Password;;
   * - vCard → BEGIN:VCARD...END:VCARD (full RFC format)
   * - Location → geo:12.9716,77.5946
   * - Calendar → BEGIN:VCALENDAR...END:VCALENDAR (full iCal format)
   * - Social → https://instagram.com/username
   * - App Store → https://play.google.com/store/apps/details?id=...
   * - Crypto → bitcoin:address or ethereum:address
   * - Text → normalized NFC text
   */
  encodeContent(content: string, type: ContentType): string {
    const trimmed = (content || '').trim();
    if (!trimmed) return '';

    switch (type) {
      case 'phone': {
        const raw = trimmed.replace(/^tel:/i, '').trim();
        const hasPlus = raw.startsWith('+');
        const digits = raw.replace(/\D/g, '');
        if (!digits) return '';

        const fullNumber = hasPlus ? `+${digits}` : `+${digits}`;
        const parsed = parsePhoneNumberFromString(fullNumber);
        if (parsed && parsed.isValid()) {
          return `tel:${parsed.number}`;
        }
        return `tel:${hasPlus ? '+' : ''}${digits}`;
      }

      case 'sms': {
        let raw = trimmed;
        let phonePart = '';
        let messagePart = '';

        if (/^smsto:/i.test(raw)) {
          const withoutPrefix = raw.replace(/^smsto:/i, '').trim();
          const firstColon = withoutPrefix.indexOf(':');
          if (firstColon !== -1) {
            phonePart = withoutPrefix.substring(0, firstColon).trim();
            messagePart = withoutPrefix.substring(firstColon + 1).trim();
          } else {
            phonePart = withoutPrefix;
          }
        } else if (/^sms:/i.test(raw)) {
          const withoutPrefix = raw.replace(/^sms:/i, '').trim();
          const qIndex = withoutPrefix.indexOf('?');
          if (qIndex !== -1) {
            phonePart = withoutPrefix.substring(0, qIndex).trim();
            const queryString = withoutPrefix.substring(qIndex + 1);
            const params = new URLSearchParams(queryString);
            messagePart = params.get('body') || params.get('message') || '';
          } else {
            phonePart = withoutPrefix;
          }
        } else if (raw.includes(':') && !raw.includes('://')) {
          const firstColon = raw.indexOf(':');
          phonePart = raw.substring(0, firstColon).trim();
          messagePart = raw.substring(firstColon + 1).trim();
        } else if (raw.includes('?')) {
          const [phone, query] = raw.split('?');
          phonePart = phone.trim();
          const params = new URLSearchParams(query);
          messagePart = params.get('body') || params.get('message') || '';
        } else {
          phonePart = raw;
        }

        const hasPlus = phonePart.startsWith('+');
        const digits = phonePart.replace(/\D/g, '');
        if (!digits) return '';

        const cleanPhone = hasPlus ? `+${digits}` : digits;
        if (messagePart) {
          return `sms:${cleanPhone}?body=${encodeURIComponentStrict(messagePart)}`;
        }
        return `sms:${cleanPhone}`;
      }

      case 'email': {
        let raw = trimmed.replace(/^mailto:/i, '').trim();
        if (!raw) return '';

        let toPart = raw;
        let queryPart = '';
        const qIndex = raw.indexOf('?');
        if (qIndex !== -1) {
          toPart = raw.substring(0, qIndex).trim();
          queryPart = raw.substring(qIndex + 1);
        }

        if (!queryPart) {
          return `mailto:${toPart}`;
        }

        const searchParams = new URLSearchParams(queryPart);
        const encodedParams: string[] = [];

        for (const [key, val] of searchParams.entries()) {
          if (val.trim()) {
            encodedParams.push(`${key}=${encodeURIComponentStrict(val.trim())}`);
          }
        }

        return `mailto:${toPart}${encodedParams.length > 0 ? '?' + encodedParams.join('&') : ''}`;
      }

      case 'url': {
        return buildWebsitePayload({ url: trimmed });
      }

      case 'wifi': {
        if (/^wifi:/i.test(trimmed)) {
          return trimmed.endsWith(';;') ? trimmed : (trimmed.endsWith(';') ? `${trimmed};` : `${trimmed};;`);
        }
        return buildWifiPayload({ ssid: trimmed, security: 'nopass' });
      }

      case 'geo': {
        // If user provides a location link (Google Maps, Apple Maps, etc.),
        // encode the link directly so scanners redirect to that location link.
        // Lat and long are NOT required.
        if (/^https?:\/\//i.test(trimmed)) {
          return trimmed;
        }

        let raw = trimmed.replace(/^geo:/i, '').trim();
        let label = '';
        if (raw.includes('?')) {
          const [coords, query] = raw.split('?');
          raw = coords.trim();
          const params = new URLSearchParams(query);
          label = params.get('q') || '';
        }

        const parts = raw.split(',');
        const lat = parseFloat(parts[0]?.trim() || '0');
        const lng = parseFloat(parts[1]?.trim() || '0');

        if (label) {
          return `geo:${lat},${lng}?q=${encodeURIComponentStrict(label)}`;
        }
        return `geo:${lat},${lng}`;
      }

      case 'vcard': {
        if (/^BEGIN:VCARD/i.test(trimmed) || /^MECARD:/i.test(trimmed)) {
          return trimmed;
        }
        return buildVCardPayload({ firstName: trimmed });
      }

      case 'event': {
        if (/^BEGIN:VCALENDAR/i.test(trimmed)) {
          return trimmed;
        }
        return buildEventPayload({
          title: trimmed,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          allDay: true
        });
      }

      case 'social': {
        if (/^https?:\/\//i.test(trimmed)) {
          return trimmed;
        }
        return buildSocialPayload({ platform: 'instagram', handleOrUrl: trimmed });
      }

      case 'app': {
        if (/^https?:\/\//i.test(trimmed)) {
          return trimmed;
        }
        return `https://${trimmed}`;
      }

      case 'crypto': {
        if (/^(bitcoin|ethereum|solana|litecoin|bitcoincash):/i.test(trimmed)) {
          return trimmed;
        }
        if (/^(?:0x)?[0-9a-fA-F]{40}$/.test(trimmed)) {
          return buildCryptoPayload({ coin: 'ethereum', address: trimmed });
        }
        return buildCryptoPayload({ coin: 'bitcoin', address: trimmed });
      }

      case 'text':
      default: {
        if (/^tel:/i.test(trimmed)) {
          return this.encodeContent(trimmed, 'phone');
        }
        if (/^sms:/i.test(trimmed) || /^smsto:/i.test(trimmed)) {
          return this.encodeContent(trimmed, 'sms');
        }
        if (/^mailto:/i.test(trimmed)) {
          return this.encodeContent(trimmed, 'email');
        }
        if (/^geo:/i.test(trimmed)) {
          return this.encodeContent(trimmed, 'geo');
        }
        if (/^wifi:/i.test(trimmed)) {
          return this.encodeContent(trimmed, 'wifi');
        }
        return buildTextPayload(trimmed);
      }
    }
  }

  /**
   * Formats raw user input or structured data into an actionable QR payload scheme.
   * Delegates directly to encodeContent for unified RFC-compliant URI formatting.
   */
  formatPayload(content: string, type: ContentType): string {
    return this.encodeContent(content, type);
  }

  /**
   * Validates content format and character limits before QR generation.
   */
  validateContent(content: string, type: ContentType, platform?: string): QRValidationResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return { isValid: false, error: 'Content cannot be empty.' };
    }

    if (type === 'text') {
      return validateText(content);
    }

    if (trimmed.length > MAX_QR_CHARACTERS) {
      return {
        isValid: false,
        error: `Content exceeds maximum QR capacity of ${MAX_QR_CHARACTERS} characters (currently ${trimmed.length}).`
      };
    }

    switch (type) {
      case 'url':
        return validateWebsite({ url: trimmed });
      case 'email':
        return validateEmail({ to: trimmed.replace(/^mailto:/i, '').split('?')[0] });
      case 'phone':
        return validatePhone({ countryCode: '', number: trimmed.replace(/^tel:/i, '') });
      case 'sms':
        return validateSms({ phone: trimmed.replace(/^smsto:/i, '').replace(/^sms:/i, '').split('?')[0].split(':')[0] });
      case 'wifi':
        if (/^wifi:/i.test(trimmed)) {
          const ssidMatch = trimmed.match(/S:([^;]+)/i);
          if (!ssidMatch || !ssidMatch[1].trim()) {
            return { isValid: false, error: 'Wi-Fi Network Name (SSID) cannot be empty.' };
          }
          return { isValid: true };
        }
        return validateWifi({ ssid: trimmed, security: 'nopass' });
      case 'vcard':
        if (/^BEGIN:VCARD/i.test(trimmed) || /^MECARD:/i.test(trimmed)) {
          const hasName = /(?:^|\r?\n)(?:FN|N)(?:;[^:]*)?:[^\r\n]+[a-zA-Z0-9]/i.test(trimmed) ||
                          /MECARD:[^;]*N:[^;]+[a-zA-Z0-9]/i.test(trimmed);
          if (!hasName) {
            return { isValid: false, error: 'vCard must contain at least a contact name.' };
          }
          return { isValid: true };
        }
        return validateVCard({ firstName: trimmed });
      case 'geo': {
        if (/^https?:\/\//i.test(trimmed)) {
          return validateWebsite({ url: trimmed });
        }
        if (/^geo:/i.test(trimmed)) {
          const cleanGeo = trimmed.replace(/^geo:/i, '').split('?')[0].trim();
          const [latStr, lngStr] = cleanGeo.split(',');
          return validateGeo({ latitude: parseFloat(latStr), longitude: parseFloat(lngStr) });
        }
        const [latStr, lngStr] = trimmed.split(',');
        return validateGeo({ latitude: parseFloat(latStr), longitude: parseFloat(lngStr) });
      }
      case 'event':
        if (/^BEGIN:VCALENDAR/i.test(trimmed)) {
          return { isValid: true };
        }
        return validateEvent({
          title: trimmed,
          startDate: '2026-10-20',
          allDay: true
        });
      case 'social': {
        const detected = detectPlatformFromUrl(trimmed);
        const effectivePlatform = platform || detected?.id || 'instagram';
        if (effectivePlatform === 'custom') {
          return /^https?:\/\//i.test(trimmed) ? validateWebsite({ url: trimmed }) : { isValid: true };
        }
        return validateSocial({ platform: effectivePlatform as any, handleOrUrl: trimmed });
      }
      case 'app':
        return validateApp({ platform: 'ios', iosUrl: trimmed });
      case 'crypto':
        return validateCrypto({ coin: 'bitcoin', address: trimmed.replace(/^(bitcoin|ethereum|solana|litecoin|bitcoincash):/i, '').split('?')[0] });
      default:
        return { isValid: true };
    }
  }

  /**
   * Generates a lossless SVG Data URL using the in-house QR vector renderer.
   */
  async generate(content: string, options?: Partial<QROptions>): Promise<string> {
    const type = options?.type ?? 'text';
    const payload = this.formatPayload(content, type);

    if (!payload) {
      throw new Error('Cannot generate QR code: Payload is empty.');
    }

    const size = options?.size ?? 300;
    const bgColor = options?.backgroundColor ?? '#FFFFFF';

    // Render using in-house vector engine
    const renderResult = renderQrToSvg(payload, options);
    let svgString = renderResult.svgString;

    if (options?.frame && options.frame.style !== 'none') {
      svgString = this.wrapSvgWithFrame(svgString, options.frame, size, bgColor);
    }

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    this.lastDataUrl = dataUrl;
    this.lastOptions = options || null;
    return dataUrl;
  }

  /**
   * Triggers an in-browser download of the generated QR code in PNG, SVG, or JPEG format.
   */
  async download(format: ExportFormat = 'png', customFilename?: string): Promise<void> {
    const filename = customFilename ?? `qr-code-${Date.now()}`;
    const nameWithoutExt = filename.replace(/\.(png|jpe?g|svg)$/i, '');

    // Check if currentQRCode download method is mocked/active (for unit tests / external hooks)
    if (this.currentQRCode && typeof (this.currentQRCode as any).download === 'function') {
      try {
        await (this.currentQRCode as any).download({
          name: nameWithoutExt,
          extension: format
        });
        return;
      } catch (err) {
        console.warn('[QRGeneratorService] Mocked download failed, attempting data URL fallback:', err);
      }
    }

    if (this.lastDataUrl) {
      if (format === 'svg') {
        this.downloadDataUrl(this.lastDataUrl, `${nameWithoutExt}.svg`);
        return;
      }
      await this.exportFramedRaster(this.lastDataUrl, format, nameWithoutExt);
      return;
    }

    throw new Error('Download failed: No QR image available.');
  }

  /**
   * Wraps an inner QR code SVG with a decorative frame and CTA text.
   */
  wrapSvgWithFrame(
    innerSvgString: string,
    frame: QrFrameOptions,
    qrSize: number,
    bgColor: string
  ): string {
    const text = (frame.text || 'SCAN ME').toUpperCase();
    const frameColor = frame.color || '#3b82f6';
    const textColor = frame.textColor || getDefaultCtaTextColor();
    const padding = 24;

    const escapeXml = (unsafe: string) =>
      unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const cleanInner = innerSvgString.replace(/<\?xml[^>]*\?>/i, '').trim();
    const viewBoxMatch = cleanInner.match(/viewBox=["']([^"']+)["']/i);
    const innerViewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${qrSize} ${qrSize}`;
    const innerContent = cleanInner.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '');

    // Check modern vector templates first
    const template = QR_FRAME_TEMPLATES.find(t => t.id === frame.style);
    if (template && template.id !== 'none') {
      return renderVectorFrame(template, innerContent, qrSize, frameColor, textColor, text, innerViewBox, bgColor);
    }

    switch (frame.style) {
      case 'bottom-banner': {
        const bannerH = 48;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + (padding * 2) + bannerH + 10;
        const qrX = padding;
        const qrY = padding;
        const bannerY = qrY + qrSize + 10;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${innerContent}
  </svg>
  <rect x="${padding}" y="${bannerY}" width="${qrSize}" height="${bannerH}" rx="8" ry="8" fill="${frameColor}"/>
  <text x="${totalW / 2}" y="${bannerY + (bannerH / 2) + 6}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" letter-spacing="1" text-anchor="middle">${escapeXml(text)}</text>
</svg>`;
      }
      case 'top-header': {
        const headerH = 48;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + (padding * 2) + headerH + 10;
        const qrX = padding;
        const qrY = padding + headerH + 10;
        const headerY = padding;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <rect x="${padding}" y="${headerY}" width="${qrSize}" height="${headerH}" rx="8" ry="8" fill="${frameColor}"/>
  <text x="${totalW / 2}" y="${headerY + (headerH / 2) + 6}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" letter-spacing="1" text-anchor="middle">${escapeXml(text)}</text>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${innerContent}
  </svg>
</svg>`;
      }
      case 'polaroid': {
        const bottomMargin = 64;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + padding + bottomMargin;
        const qrX = padding;
        const qrY = padding;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="8" ry="8" fill="#ffffff" stroke="#e4e4e7" stroke-width="2"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${innerContent}
  </svg>
  <text x="${totalW / 2}" y="${qrY + qrSize + 44}" fill="${frameColor}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${escapeXml(text)}</text>
</svg>`;
      }
      case 'badge-pill': {
        const badgeH = 38;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + (padding * 2) + (badgeH / 2) + 12;
        const qrX = padding;
        const qrY = padding;
        const badgeW = Math.min(qrSize, Math.max(130, text.length * 12 + 32));
        const badgeX = (totalW - badgeW) / 2;
        const badgeY = qrY + qrSize - (badgeH / 2) + 6;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="2" y="2" width="${totalW - 4}" height="${totalH - 4}" rx="24" ry="24" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <svg x="${qrX}" y="${qrY - 4}" width="${qrSize}" height="${qrSize}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${innerContent}
  </svg>
  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" ry="${badgeH / 2}" fill="${frameColor}"/>
  <text x="${totalW / 2}" y="${badgeY + (badgeH / 2) + 5}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5" text-anchor="middle">${escapeXml(text)}</text>
</svg>`;
      }
      case 'chat-bubble': {
        const bannerH = 46;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + (padding * 2) + bannerH + 16;
        const qrX = padding;
        const qrY = padding;
        const bannerY = qrY + qrSize + 8;

        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH - 12}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <polygon points="${totalW / 2 - 12},${totalH - 12} ${totalW / 2 + 12},${totalH - 12} ${totalW / 2},${totalH}" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <polygon points="${totalW / 2 - 9},${totalH - 14} ${totalW / 2 + 9},${totalH - 14} ${totalW / 2},${totalH - 3}" fill="${bgColor}"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${innerViewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${innerContent}
  </svg>
  <rect x="${padding}" y="${bannerY}" width="${qrSize}" height="${bannerH}" rx="8" ry="8" fill="${frameColor}"/>
  <text x="${totalW / 2}" y="${bannerY + (bannerH / 2) + 5}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1" text-anchor="middle">${escapeXml(text)}</text>
</svg>`;
      }
      default:
        return innerSvgString;
    }
  }

  /**
   * Rasterizes framed SVG into high-resolution PNG or JPEG using HTML canvas.
   */
  private async exportFramedRaster(
    svgDataUrl: string,
    format: 'png' | 'jpeg',
    filenameWithoutExt: string
  ): Promise<void> {
    if (typeof document === 'undefined') return;

    return new Promise((resolve, reject) => {
      // 1. Parse intrinsic dimensions from SVG to avoid browser 300x150 fallback for percentage width/height
      let svgW = 600;
      let svgH = 600;
      let processedDataUrl = svgDataUrl;

      try {
        const decodedSvg = decodeURIComponent(svgDataUrl.replace(/^data:image\/svg\+xml[^,]*,/, ''));
        const vbMatch = decodedSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
        if (vbMatch) {
          svgW = parseFloat(vbMatch[3]) || 600;
          svgH = parseFloat(vbMatch[4]) || 600;
        } else {
          const wMatch = decodedSvg.match(/\bwidth=["']([\d.]+)(?:px)?["']/i);
          const hMatch = decodedSvg.match(/\bheight=["']([\d.]+)(?:px)?["']/i);
          if (wMatch && hMatch) {
            svgW = parseFloat(wMatch[1]) || 600;
            svgH = parseFloat(hMatch[1]) || 600;
          }
        }

        // If SVG has width="100%" or height="100%", inject explicit pixel dimensions
        if (/width=["']100%["']/i.test(decodedSvg) || /height=["']100%["']/i.test(decodedSvg)) {
          const fixedSvg = decodedSvg
            .replace(/(<svg[^>]*\b)width=["'][^"']*["']/i, `$1width="${svgW}"`)
            .replace(/(<svg[^>]*\b)height=["'][^"']*["']/i, `$1height="${svgH}"`);
          processedDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixedSvg)}`;
        }
      } catch {
        // Fallback to natural dimensions
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const rawW = svgW || img.naturalWidth || img.width || 600;
          const rawH = svgH || img.naturalHeight || img.height || 600;
          const scale = Math.max(1, Math.min(4, Math.round(2048 / Math.max(rawW, rawH))));
          const outW = Math.round(rawW * scale);
          const outH = Math.round(rawH * scale);

          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          // Solid background fill (for both PNG and JPEG) ensures mobile cameras never scan against a dark/transparent background
          const bgColor = this.lastOptions?.backgroundColor;
          ctx.fillStyle = (bgColor && bgColor !== 'transparent') ? bgColor : '#ffffff';
          ctx.fillRect(0, 0, outW, outH);

          // Direct crisp drawing to full canvas bounds
          ctx.drawImage(img, 0, 0, outW, outH);

          const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const rasterDataUrl = canvas.toDataURL(mime, 0.95);
          this.downloadDataUrl(rasterDataUrl, `${filenameWithoutExt}.${format}`);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Failed to rasterize framed QR SVG'));
      img.src = processedDataUrl;
    });
  }

  /**
   * Converts SVG data URL into PNG data URL for ZIP export.
   */
  async svgToPngDataUrl(svgDataUrl: string): Promise<string> {
    if (typeof document === 'undefined') {
      return svgDataUrl;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(svgDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Failed to rasterize SVG to PNG'));
      img.src = svgDataUrl;
    });
  }

  /**
   * Converts SVG data URL into a high-resolution PNG Blob for clipboard and file sharing.
   */
  async svgToPngBlob(svgDataUrl: string, scaleMultiplier: number = 2): Promise<Blob> {
    if (!svgDataUrl) {
      throw new Error('No data URL provided');
    }

    if (svgDataUrl.startsWith('data:image/png') || svgDataUrl.startsWith('data:image/jpeg')) {
      try {
        const res = await fetch(svgDataUrl);
        return await res.blob();
      } catch {
        return new Blob([svgDataUrl], { type: 'image/png' });
      }
    }

    if (typeof document === 'undefined') {
      try {
        const res = await fetch(svgDataUrl);
        return await res.blob();
      } catch {
        return new Blob([svgDataUrl], { type: 'image/png' });
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let settled = false;

      const fallback = async () => {
        if (settled) return;
        settled = true;
        try {
          const res = await fetch(svgDataUrl);
          resolve(await res.blob());
        } catch {
          resolve(new Blob([svgDataUrl], { type: 'image/png' }));
        }
      };

      const timer = setTimeout(fallback, 1200);

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const rawW = img.naturalWidth || img.width || 600;
          const rawH = img.naturalHeight || img.height || 600;
          const scale = Math.max(1, Math.min(4, scaleMultiplier));
          const outW = Math.round(rawW * scale);
          const outH = Math.round(rawH * scale);
          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            fallback();
            return;
          }

          const bgColor = this.lastOptions?.backgroundColor;
          ctx.fillStyle = (bgColor && bgColor !== 'transparent') ? bgColor : '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.drawImage(img, 0, 0, outW, outH);

          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              fallback();
            }
          }, 'image/png');
        } catch {
          fallback();
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        fallback();
      };
      img.src = svgDataUrl;
    });
  }


  /**
   * Backward-compatible PNG download.
   */
  downloadPng(dataUrl?: string, customFilename?: string): void {
    if (dataUrl === '') {
      throw new Error('Download failed: No QR image available.');
    }
    if (dataUrl) {
      const filename = customFilename ?? `qr-code-${Date.now()}.png`;
      this.downloadDataUrl(dataUrl, filename);
      return;
    }
    this.download('png', customFilename).catch(err => {
      console.warn('[QRGeneratorService] Download error:', err);
    });
  }

  /**
   * Downloads the generated QR code as scalable vector SVG.
   */
  async downloadSvg(customFilename?: string): Promise<void> {
    return this.download('svg', customFilename);
  }

  /**
   * Downloads the generated QR code as JPEG.
   */
  async downloadJpeg(customFilename?: string): Promise<void> {
    return this.download('jpeg', customFilename);
  }

  private downloadDataUrl(dataUrl: string, filename: string): void {
    if (!dataUrl) {
      throw new Error('Download failed: No QR image available.');
    }
    if (typeof document === 'undefined') return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private mapUnderlyingDotType(type?: QrDotType): any {
    switch (type) {
      case 'dots':
      case 'diamond':
      case 'star':
      case 'heart':
      case 'cross':
        return 'dots';
      case 'rounded':
      case 'scanline':
        return 'rounded';
      case 'extra-rounded':
        return 'extra-rounded';
      case 'classy':
        return 'classy';
      case 'classy-rounded':
        return 'classy-rounded';
      case 'square':
      default:
        return 'square';
    }
  }

  private mapUnderlyingCornerSquareType(type?: QrCornerSquareType): any {
    switch (type) {
      case 'dot':
        return 'dot';
      case 'extra-rounded':
        return 'extra-rounded';
      case 'classy':
      case 'shield':
        return 'classy';
      case 'classy-rounded':
      case 'pinch':
        return 'classy-rounded';
      case 'rounded':
        return 'rounded';
      case 'square':
      default:
        return 'square';
    }
  }

  private mapUnderlyingCornerDotType(type?: QrCornerDotType): any {
    switch (type) {
      case 'dot':
      case 'diamond':
      case 'star':
      case 'heart':
      case 'cross':
        return 'dot';
      case 'rounded':
        return 'rounded';
      case 'extra-rounded':
        return 'extra-rounded';
      case 'classy':
        return 'classy';
      case 'classy-rounded':
        return 'classy-rounded';
      case 'square':
      default:
        return 'square';
    }
  }

  private postProcessCustomShapes(svgString: string, options?: Partial<QROptions>): string {
    if (!options) return svgString;

    const dotType = options.dotType;
    if (dotType === 'diamond' || dotType === 'star' || dotType === 'heart' || dotType === 'cross' || dotType === 'scanline') {
      svgString = svgString.replace(
        /(<clipPath id="clip-path-dot-color-[^>]+>)([\s\S]*?)(<\/clipPath>)/g,
        (match, startTag, innerContent, endTag) => {
          const transformedInner = innerContent.replace(
            /<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"[^>]*>/g,
            (_: string, cxStr: string, cyStr: string, rStr: string) => {
              const cx = parseFloat(cxStr);
              const cy = parseFloat(cyStr);
              const r = parseFloat(rStr);
              if (isNaN(cx) || isNaN(cy) || isNaN(r)) return _;

              if (dotType === 'diamond') {
                const d = r * 1.15;
                return `<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}"/>`;
              }
              if (dotType === 'star') {
                const o = r * 1.18;
                const i = r * 0.62;
                return `<polygon points="${cx},${cy - o} ${cx + i * 0.58},${cy - i * 0.8} ${cx + o * 0.95},${cy - o * 0.3} ${cx + i * 0.95},${cy + i * 0.3} ${cx + o * 0.58},${cy + o * 0.8} ${cx},${cy + i} ${cx - o * 0.58},${cy + o * 0.8} ${cx - i * 0.95},${cy + i * 0.3} ${cx - o * 0.95},${cy - o * 0.3} ${cx - i * 0.58},${cy - i * 0.8}"/>`;
              }
              if (dotType === 'heart') {
                const s = r * 1.12;
                return `<path d="M ${cx} ${cy + s * 0.85} C ${cx - s * 1.3} ${cy + s * 0.1} ${cx - s * 1.3} ${cy - s * 0.9} ${cx} ${cy - s * 0.25} C ${cx + s * 1.3} ${cy - s * 0.9} ${cx + s * 1.3} ${cy + s * 0.1} ${cx} ${cy + s * 0.85} Z"/>`;
              }
              if (dotType === 'cross') {
                const arm = r * 1.15;
                const thick = r * 0.68;
                return `<polygon points="${cx - thick},${cy - arm} ${cx + thick},${cy - arm} ${cx + thick},${cy - thick} ${cx + arm},${cy - thick} ${cx + arm},${cy + thick} ${cx + thick},${cy + thick} ${cx + thick},${cy + arm} ${cx - thick},${cy + arm} ${cx - thick},${cy + thick} ${cx - arm},${cy + thick} ${cx - arm},${cy - thick} ${cx - thick},${cy - thick}"/>`;
              }
              if (dotType === 'scanline') {
                const w = r * 2.2;
                const h = r * 1.25;
                return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${r * 0.35}"/>`;
              }
              return _;
            }
          );
          return `${startTag}${transformedInner}${endTag}`;
        }
      );
    }

    const cornerDotType = options.cornerDotType;
    if (cornerDotType === 'diamond' || cornerDotType === 'star' || cornerDotType === 'heart' || cornerDotType === 'cross') {
      svgString = svgString.replace(
        /(<clipPath id="clip-path-corners-dot-color-[^>]+>)([\s\S]*?)(<\/clipPath>)/g,
        (match, startTag, innerContent, endTag) => {
          const transformedInner = innerContent.replace(
            /<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"[^>]*>/g,
            (_: string, cxStr: string, cyStr: string, rStr: string) => {
              const cx = parseFloat(cxStr);
              const cy = parseFloat(cyStr);
              const r = parseFloat(rStr);
              if (isNaN(cx) || isNaN(cy) || isNaN(r)) return _;

              if (cornerDotType === 'diamond') {
                const d = r * 1.1;
                return `<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}"/>`;
              }
              if (cornerDotType === 'star') {
                const o = r * 1.12;
                const i = r * 0.72;
                return `<polygon points="${cx},${cy - o} ${cx + i * 0.58},${cy - i * 0.8} ${cx + o * 0.95},${cy - o * 0.3} ${cx + i * 0.95},${cy + i * 0.3} ${cx + o * 0.58},${cy + o * 0.8} ${cx},${cy + i} ${cx - o * 0.58},${cy + o * 0.8} ${cx - i * 0.95},${cy + i * 0.3} ${cx - o * 0.95},${cy - o * 0.3} ${cx - i * 0.58},${cy - i * 0.8}"/>`;
              }
              if (cornerDotType === 'heart') {
                const s = r * 1.08;
                return `<path d="M ${cx} ${cy + s * 0.85} C ${cx - s * 1.3} ${cy + s * 0.1} ${cx - s * 1.3} ${cy - s * 0.9} ${cx} ${cy - s * 0.25} C ${cx + s * 1.3} ${cy - s * 0.9} ${cx + s * 1.3} ${cy + s * 0.1} ${cx} ${cy + s * 0.85} Z"/>`;
              }
              if (cornerDotType === 'cross') {
                const arm = r * 1.1;
                const thick = r * 0.72;
                return `<polygon points="${cx - thick},${cy - arm} ${cx + thick},${cy - arm} ${cx + thick},${cy - thick} ${cx + arm},${cy - thick} ${cx + arm},${cy + thick} ${cx + thick},${cy + thick} ${cx + thick},${cy + arm} ${cx - thick},${cy + arm} ${cx - thick},${cy + thick} ${cx - arm},${cy + thick} ${cx - arm},${cy - thick} ${cx - thick},${cy - thick}"/>`;
              }
              return _;
            }
          );
          return `${startTag}${transformedInner}${endTag}`;
        }
      );
    }

    return svgString;
  }
}

export { QRGeneratorService as QrGeneratorService };
