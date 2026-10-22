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
  QrFrameOptions
} from '../models/qr-generator.models';
import { QR_FRAME_TEMPLATES, renderVectorFrame } from '../models/qr-frames.data';
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
  validateCrypto
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
   * Formats raw user input or structured data into an actionable QR payload scheme.
   */
  formatPayload(content: string, type: ContentType): string {
    const trimmed = content.trim();
    if (!trimmed) return '';

    // If content is already a valid formatted payload, return directly
    if (/^smsto:/i.test(trimmed)) {
      return trimmed.replace(/^smsto:/i, 'SMSTO:');
    }
    if (
      /^https?:\/\//i.test(trimmed) ||
      /^mailto:/i.test(trimmed) ||
      /^tel:/i.test(trimmed) ||
      /^sms:/i.test(trimmed) ||
      /^wifi:/i.test(trimmed) ||
      /^geo:/i.test(trimmed) ||
      /^begin:vcard/i.test(trimmed) ||
      /^begin:vcalendar/i.test(trimmed) ||
      /^mecard:/i.test(trimmed) ||
      /^bitcoin:/i.test(trimmed) ||
      /^ethereum:/i.test(trimmed) ||
      /^solana:/i.test(trimmed) ||
      /^litecoin:/i.test(trimmed) ||
      /^bitcoincash:/i.test(trimmed)
    ) {
      return trimmed;
    }

    switch (type) {
      case 'url':
        return buildWebsitePayload({ url: trimmed });
      case 'email':
        return buildEmailPayload({ to: trimmed });
      case 'phone':
        return buildPhonePayload({ countryCode: '', number: trimmed });
      case 'sms':
        return buildSmsPayload({ phone: trimmed });
      case 'wifi':
        return buildWifiPayload({ ssid: trimmed, security: 'nopass' });
      case 'geo': {
        const parts = trimmed.split(',');
        const lat = parseFloat(parts[0] || '0');
        const lng = parseFloat(parts[1] || '0');
        return buildGeoPayload({ latitude: lat, longitude: lng });
      }
      case 'event':
        return buildEventPayload({
          title: trimmed,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          allDay: true
        });
      case 'vcard':
        return buildVCardPayload({ firstName: trimmed });
      case 'social':
        return buildSocialPayload({ platform: 'instagram', handleOrUrl: trimmed });
      case 'app':
        return buildAppPayload({ platform: 'ios', iosUrl: trimmed });
      case 'crypto':
        return buildCryptoPayload({ coin: 'bitcoin', address: trimmed });
      case 'text':
      default:
        return buildTextPayload(trimmed);
    }
  }

  /**
   * Validates content format and character limits before QR generation.
   */
  validateContent(content: string, type: ContentType): QRValidationResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return { isValid: false, error: 'Content cannot be empty.' };
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
        return validateEmail({ to: trimmed.replace(/^mailto:/i, '') });
      case 'phone':
        return validatePhone({ countryCode: '', number: trimmed.replace(/^tel:/i, '') });
      case 'sms':
        return validateSms({ phone: trimmed.replace(/^smsto:/i, '').split(':')[0] });
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
      case 'social':
        return validateSocial({ platform: 'instagram', handleOrUrl: trimmed });
      case 'app':
        return validateApp({ platform: 'ios', iosUrl: trimmed });
      case 'crypto':
        return validateCrypto({ coin: 'bitcoin', address: trimmed.replace(/^bitcoin:/i, '').split('?')[0] });
      case 'text':
      default:
        return validateText(trimmed);
    }
  }

  /**
   * Generates a Data URL using qr-code-styling.
   */
  async generate(content: string, options?: Partial<QROptions>): Promise<string> {
    const type = options?.type ?? 'text';
    const payload = this.formatPayload(content, type);

    if (!payload) {
      throw new Error('Cannot generate QR code: Payload is empty.');
    }

    if (!this.qrStylingClassPromise) {
      this.qrStylingClassPromise = import('qr-code-styling').then(m => m.default || m);
    }
    const QRCodeStylingClass = await this.qrStylingClassPromise;

    const size = options?.size ?? 300;
    const fgColor = options?.foregroundColor ?? '#000000';
    const bgColor = options?.backgroundColor ?? '#FFFFFF';

    const stylingOptions: QRCodeStylingOptions = {
      type: 'svg',
      width: size,
      height: size,
      margin: options?.margin ?? 2,
      data: payload,
      qrOptions: {
        errorCorrectionLevel: options?.errorCorrection ?? 'M'
      },
      dotsOptions: {
        type: options?.dotType ?? 'square',
        color: fgColor
      },
      cornersSquareOptions: {
        type: options?.cornerSquareType ?? 'square',
        color: options?.cornerSquareColor ?? fgColor
      },
      cornersDotOptions: {
        type: options?.cornerDotType ?? 'square',
        color: options?.cornerDotColor ?? fgColor
      },
      backgroundOptions: {
        color: bgColor
      },
      image: options?.logo || undefined,
      imageOptions: {
        saveAsBlob: false,
        hideBackgroundDots: true,
        imageSize: options?.logoSize ?? 0.35,
        margin: options?.logoMargin ?? 4,
        crossOrigin: 'anonymous'
      }
    };

    const qrCode = new QRCodeStylingClass(stylingOptions);
    this.currentQRCode = qrCode;
    this.lastOptions = options || null;

    // Render SVG element directly for crisp, lossless vector preview across all screen DPIs
    const elem = await qrCode._getElement('svg');
    if (!elem) {
      throw new Error('Failed to generate QR code: Preview rendering failed.');
    }

    let svgString = typeof XMLSerializer !== 'undefined'
      ? new XMLSerializer().serializeToString(elem)
      : (elem as SVGElement).outerHTML;

    if (options?.frame && options.frame.style !== 'none') {
      svgString = this.wrapSvgWithFrame(svgString, options.frame, size, bgColor);
    }

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    this.lastDataUrl = dataUrl;
    return dataUrl;
  }

  /**
   * Triggers an in-browser download of the generated QR code in PNG, SVG, or JPEG format.
   */
  async download(format: ExportFormat = 'png', customFilename?: string): Promise<void> {
    const filename = customFilename ?? `qr-code-${Date.now()}`;
    const nameWithoutExt = filename.replace(/\.(png|jpe?g|svg)$/i, '');

    // If frame is active, export framed asset
    if (this.lastOptions?.frame && this.lastOptions.frame.style !== 'none' && this.lastDataUrl) {
      if (format === 'svg') {
        this.downloadDataUrl(this.lastDataUrl, `${nameWithoutExt}.svg`);
        return;
      }
      await this.exportFramedRaster(this.lastDataUrl, format, nameWithoutExt);
      return;
    }

    if (this.currentQRCode && typeof window !== 'undefined') {
      try {
        await this.currentQRCode.download({
          name: nameWithoutExt,
          extension: format
        });
        return;
      } catch (err) {
        console.warn('[QRGeneratorService] Native qr-code-styling download failed, attempting data URL fallback:', err);
      }
    }

    if (this.lastDataUrl) {
      this.downloadDataUrl(this.lastDataUrl, `${nameWithoutExt}.${format}`);
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
    const textColor = frame.textColor || '#ffffff';
    const padding = 24;

    const escapeXml = (unsafe: string) =>
      unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const cleanInner = innerSvgString.replace(/<\?xml[^>]*\?>/i, '').trim();
    const innerContent = cleanInner.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '');

    // Check modern vector templates first
    const template = QR_FRAME_TEMPLATES.find(t => t.id === frame.style);
    if (template && template.id !== 'none') {
      return renderVectorFrame(template, innerContent, qrSize, frameColor, textColor, text);
    }

    switch (frame.style) {
      case 'bottom-banner': {
        const bannerH = 48;
        const totalW = qrSize + (padding * 2);
        const totalH = qrSize + (padding * 2) + bannerH + 10;
        const qrX = padding;
        const qrY = padding;
        const bannerY = qrY + qrSize + 10;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
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

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <rect x="${padding}" y="${headerY}" width="${qrSize}" height="${headerH}" rx="8" ry="8" fill="${frameColor}"/>
  <text x="${totalW / 2}" y="${headerY + (headerH / 2) + 6}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" letter-spacing="1" text-anchor="middle">${escapeXml(text)}</text>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
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

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" rx="8" ry="8" fill="#ffffff" stroke="#e4e4e7" stroke-width="2"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
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

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="2" y="2" width="${totalW - 4}" height="${totalH - 4}" rx="24" ry="24" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <svg x="${qrX}" y="${qrY - 4}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
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

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH - 12}" rx="16" ry="16" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <polygon points="${totalW / 2 - 12},${totalH - 12} ${totalW / 2 + 12},${totalH - 12} ${totalW / 2},${totalH}" fill="${bgColor}" stroke="${frameColor}" stroke-width="4"/>
  <polygon points="${totalW / 2 - 9},${totalH - 14} ${totalW / 2 + 9},${totalH - 14} ${totalW / 2},${totalH - 3}" fill="${bgColor}"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">
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
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const rawW = img.naturalWidth || img.width || 600;
          const rawH = img.naturalHeight || img.height || 600;
          const scale = Math.max(1, Math.min(4, Math.round(2048 / rawW)));
          canvas.width = rawW * scale;
          canvas.height = rawH * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          if (scale > 1) {
            ctx.scale(scale, scale);
          }

          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);

          const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const rasterDataUrl = canvas.toDataURL(mime, 0.95);
          this.downloadDataUrl(rasterDataUrl, `${filenameWithoutExt}.${format}`);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Failed to rasterize framed QR SVG'));
      img.src = svgDataUrl;
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
   * Generates a batch of QR codes and packages them into a single ZIP archive.
   */
  async generateBatchZip(
    items: Array<{ id: string; title: string; content: string; type?: ContentType }>,
    baseOptions: Partial<QROptions>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Blob> {
    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule as any).default || JSZipModule;
    const zip = new JSZip();
    const folder = zip.folder('acklet-qr-codes') || zip;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemType = item.type || baseOptions.type || 'text';
      const itemOptions: Partial<QROptions> = {
        ...baseOptions,
        type: itemType,
        content: item.content
      };

      const dataUrl = await this.generate(item.content, itemOptions);

      let base64Data: string;
      if (dataUrl.startsWith('data:image/svg+xml')) {
        const pngDataUrl = await this.svgToPngDataUrl(dataUrl);
        if (pngDataUrl.startsWith('data:image/svg+xml')) {
          const rawSvg = decodeURIComponent(pngDataUrl.replace(/^data:image\/svg\+xml(?:;charset=[^,]+)?,/, ''));
          base64Data = typeof btoa !== 'undefined'
            ? btoa(unescape(encodeURIComponent(rawSvg)))
            : Buffer.from(rawSvg).toString('base64');
        } else {
          base64Data = pngDataUrl.replace(/^data:image\/\w+;base64,/, '');
        }
      } else {
        base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      }

      const cleanTitle = (item.title || `qr-${i + 1}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);

      folder.file(`${String(i + 1).padStart(3, '0')}_${cleanTitle}.png`, base64Data, { base64: true });

      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    }

    return zip.generateAsync({ type: 'blob' });
  }

  /**
   * Triggers download of an arbitrary binary Blob file.
   */
  downloadBlob(blob: Blob, filename: string): void {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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
}
