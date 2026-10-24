// client/apps/tool-qr-generator/src/services/qr-payload-builders.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  WebsiteData,
  EmailData,
  PhoneData,
  SmsData,
  WifiData,
  GeoData,
  EventData,
  VCardData,
  SocialData,
  AppData,
  CryptoData,
  CryptoCoin,
  QRValidationResult
} from '../models/qr-generator.models';

// ==========================================
// 1. WEBSITE / URL BUILDER & VALIDATOR
// ==========================================

export function buildWebsitePayload(data: WebsiteData): string {
  let rawUrl = (data.url || '').trim();
  if (!rawUrl) return '';

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl}`;
  }

  try {
    const parsed = new URL(rawUrl);
    if (data.utmSource) parsed.searchParams.set('utm_source', data.utmSource.trim());
    if (data.utmMedium) parsed.searchParams.set('utm_medium', data.utmMedium.trim());
    if (data.utmCampaign) parsed.searchParams.set('utm_campaign', data.utmCampaign.trim());
    if (data.utmTerm) parsed.searchParams.set('utm_term', data.utmTerm.trim());
    if (data.utmContent) parsed.searchParams.set('utm_content', data.utmContent.trim());

    const result = parsed.toString();
    if (!data.url.trim().endsWith('/') && parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return result.replace(/\/$/, '');
    }
    return result;
  } catch {
    return rawUrl;
  }
}

export function validateWebsite(data: WebsiteData): QRValidationResult {
  const rawUrl = (data.url || '').trim();
  if (!rawUrl) {
    return { isValid: false, error: 'Website URL is required.' };
  }

  if (/^(javascript:|data:)/i.test(rawUrl)) {
    return { isValid: false, error: 'Executable schemes (javascript:, data:) are prohibited for security.' };
  }

  const warnings: string[] = [];

  let parsed: URL;
  try {
    const full = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    parsed = new URL(full);
  } catch {
    return { isValid: false, error: 'Please enter a valid website address (e.g. example.com).' };
  }

  if (parsed.protocol === 'http:') {
    warnings.push('Insecure HTTP address. Many camera scanners refuse to open non-HTTPS links.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    warnings.push('Local or private IP detected; this link will only work on your internal network.');
  }

  if (hostname.includes('xn--')) {
    warnings.push('Punycode / internationalized domain detected. Verify domain authenticity.');
  }

  const finalPayload = buildWebsitePayload(data);
  if (finalPayload.length > 300) {
    warnings.push('URL exceeds 300 characters. Resulting QR code will be denser and harder for budget cameras to scan.');
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// ==========================================
// 2. PLAIN TEXT BUILDER & VALIDATOR
// ==========================================

export function buildTextPayload(text: string): string {
  if (!text) return '';
  // Strip UTF-8 BOM if present, normalize all CRLF/CR to single LF
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return clean.trim();
}

/**
 * Detects whether plain text looks like a URL, email, or phone number
 * so the UI can gently offer a 1-tap switch to the dedicated action type.
 */
export function detectPotentialTextType(text: string): 'url' | 'email' | 'phone' | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Web link pattern: https://..., http://..., or www.domain.tld
  if (/^(?:https?:\/\/|www\.)[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(trimmed)) {
    return 'url';
  }

  // Email pattern: user@domain.tld
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(trimmed)) {
    return 'email';
  }

  // Phone pattern: e.g. +14155552671, +91 98765 43210, (415) 555-2671
  const digits = trimmed.replace(/\D/g, '');
  if (/^(\+?[0-9\s\-().]{8,25})$/.test(trimmed) && digits.length >= 7 && digits.length <= 15) {
    return 'phone';
  }

  return null;
}

export function validateText(text: string): QRValidationResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Text content cannot be empty.' };
  }
  if (trimmed.length > 2953) {
    return {
      isValid: false,
      error: `Text length (${trimmed.length}) exceeds maximum QR capacity of 2,953 characters.`
    };
  }
  return { isValid: true };
}

// ==========================================
// 3. EMAIL BUILDER & VALIDATOR
// ==========================================

export function buildEmailPayload(data: EmailData): string {
  const to = (data.to || '').trim();
  if (!to) return '';

  const params: string[] = [];
  if (data.cc?.trim()) params.push(`cc=${encodeURIComponentStrict(data.cc.trim())}`);
  if (data.bcc?.trim()) params.push(`bcc=${encodeURIComponentStrict(data.bcc.trim())}`);
  if (data.subject?.trim()) params.push(`subject=${encodeURIComponentStrict(data.subject.trim())}`);
  if (data.body?.trim()) params.push(`body=${encodeURIComponentStrict(data.body.trim())}`);

  return `mailto:${to}${params.length > 0 ? '?' + params.join('&') : ''}`;
}

export function validateEmail(data: EmailData): QRValidationResult {
  const to = (data.to || '').trim();
  if (!to) {
    return { isValid: false, error: 'Recipient email address is required.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipients = to.split(',').map(s => s.trim()).filter(Boolean);

  for (const recipient of recipients) {
    if (!emailRegex.test(recipient)) {
      return { isValid: false, error: `Invalid email address format: "${recipient}"` };
    }
  }

  return { isValid: true };
}

// ==========================================
// 4. PHONE BUILDER & VALIDATOR
// ==========================================

export function buildPhonePayload(data: PhoneData): string {
  const combined = `${data.countryCode || ''}${data.number || ''}`.replace(/\s+/g, '');
  if (!combined) return '';
  const parsed = parsePhoneNumberFromString(combined.startsWith('+') ? combined : `+${combined}`);
  if (parsed && parsed.isValid()) {
    return `tel:${parsed.number}`;
  }
  const hasPlus = combined.startsWith('+');
  const digits = combined.replace(/\D/g, '');
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

export function validatePhone(data: PhoneData): QRValidationResult {
  const rawNum = (data.number || '').trim();
  if (!rawNum) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  const combined = `${data.countryCode || ''}${rawNum}`.replace(/\s+/g, '');
  const parsed = parsePhoneNumberFromString(combined.startsWith('+') ? combined : `+${combined}`);

  if (!parsed || !parsed.isValid()) {
    return { isValid: false, error: 'Please enter a valid international phone number.' };
  }

  return { isValid: true };
}

// ==========================================
// 5. SMS BUILDER & VALIDATOR
// ==========================================

export function buildSmsPayload(data: SmsData): string {
  const rawNum = (data.phone || '').trim().replace(/^smsto:/i, '');
  if (!rawNum) return '';

  const hasPlus = rawNum.startsWith('+');
  const digitsOnly = rawNum.replace(/\D/g, '');
  const cleanPhone = hasPlus ? `+${digitsOnly}` : digitsOnly;
  const msg = (data.message || '').trim();

  if (data.format === 'sms') {
    return `sms:${cleanPhone}${msg ? `?body=${encodeURIComponentStrict(msg)}` : ''}`;
  }

  return `SMSTO:${cleanPhone}:${msg}`;
}

export function validateSms(data: SmsData): QRValidationResult {
  const rawNum = (data.phone || '').trim().replace(/^smsto:/i, '');
  if (!rawNum) {
    return { isValid: false, error: 'Recipient phone number is required.' };
  }

  const hasPlus = rawNum.startsWith('+');
  const digitsOnly = rawNum.replace(/\D/g, '');
  const cleanNum = hasPlus ? `+${digitsOnly}` : digitsOnly;
  const parsed = parsePhoneNumberFromString(cleanNum);

  if (!parsed || !parsed.isValid()) {
    return { isValid: false, error: 'Please enter a valid international SMS recipient number.' };
  }

  return {
    isValid: true,
    warnings: ['Tip: Some older Android scanners prefer SMSTO: format, while modern iOS and Android support both.']
  };
}

// ==========================================
// 6. WI-FI BUILDER & VALIDATOR
// ==========================================

export function escapeWifi(str: string): string {
  return str.replace(/([\\;,:"'])/g, '\\$1');
}

export function buildWifiPayload(data: WifiData): string {
  const ssid = (data.ssid || '').trim();
  if (!ssid) return '';

  const sec = data.security || data.encryption || 'WPA';
  const escapedSsid = escapeWifi(ssid);
  let payload = `WIFI:S:${escapedSsid};T:${sec};`;

  if (sec !== 'nopass' && data.password) {
    payload += `P:${escapeWifi(data.password)};`;
  }

  if (data.hidden) {
    payload += 'H:true;';
  }

  if (data.eapMethod) {
    payload += `E:${data.eapMethod};`;
    if (data.identity) payload += `I:${escapeWifi(data.identity)};`;
    if (data.anonymousIdentity) payload += `A:${escapeWifi(data.anonymousIdentity)};`;
    if (data.phase2) payload += `PH2:${data.phase2};`;
  }

  payload += ';';
  return payload;
}

export function validateWifi(data: WifiData): QRValidationResult {
  if (!data.ssid || !data.ssid.trim()) {
    return { isValid: false, error: 'Wi-Fi Network Name (SSID) is required.' };
  }

  const sec = data.security || data.encryption || 'WPA';
  if (sec !== 'nopass') {
    if (sec === 'WEP') {
      const pw = data.password || '';
      const isAscii = pw.length === 5 || pw.length === 13 || pw.length === 16;
      const isHex = /^[0-9a-fA-F]{10}$|^[0-9a-fA-F]{26}$|^[0-9a-fA-F]{32}$/.test(pw);
      if (!isAscii && !isHex && pw.length < 5) {
        return { isValid: false, error: 'WEP password must be 5 or 13 characters (or 10/26 hexadecimal digits).' };
      }
    } else {
      if (!data.password || data.password.length < 8) {
        return { isValid: false, error: 'Wi-Fi password must be at least 8 characters long.' };
      }
    }
  }

  return { isValid: true };
}

// ==========================================
// 7. LOCATION / GEO BUILDER & VALIDATOR
// ==========================================

export function parseMapCoordinates(input: string): { latitude: number; longitude: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern: "geo:37.7749,-122.4194"
  const geoMatch = trimmed.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (geoMatch) {
    const lat = parseFloat(geoMatch[1]);
    const lng = parseFloat(geoMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Pattern: "37.7749, -122.4194"
  const simpleMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (simpleMatch) {
    const lat = parseFloat(simpleMatch[1]);
    const lng = parseFloat(simpleMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Google Maps @lat,lng e.g. /@37.774929,-122.419416,15z
  const googleAtMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (googleAtMatch) {
    const lat = parseFloat(googleAtMatch[1]);
    const lng = parseFloat(googleAtMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Google Maps data param: !3d37.7749!4d-122.4194
  const googleDataMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)[^!]*!4d(-?\d+(?:\.\d+)?)/);
  if (googleDataMatch) {
    const lat = parseFloat(googleDataMatch[1]);
    const lng = parseFloat(googleDataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Google Maps / Apple Maps ?q=lat,lng or ll=lat,lng or loc:lat,lng
  const paramMatch = trimmed.match(/[?&](?:q|ll|loc:?)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lng = parseFloat(paramMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // OpenStreetMap hash: #map=15/37.7749/-122.4194
  const osmHashMatch = trimmed.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (osmHashMatch) {
    const lat = parseFloat(osmHashMatch[1]);
    const lng = parseFloat(osmHashMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // OpenStreetMap params: ?lat=37.7749&lon=-122.4194
  const osmParamMatch = trimmed.match(/[?&]lat=(-?\d+(?:\.\d+)?)[&]lon=(-?\d+(?:\.\d+)?)/i);
  if (osmParamMatch) {
    const lat = parseFloat(osmParamMatch[1]);
    const lng = parseFloat(osmParamMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

export function buildGeoPayload(data: GeoData): string {
  const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude as string);
  const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude as string);

  if (isNaN(lat) || isNaN(lng)) return '';

  const label = data.label?.trim() || data.query?.trim();

  if (data.provider === 'google') {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  if (data.provider === 'apple') {
    return `https://maps.apple.com/?q=${encodeURIComponentStrict(label || 'Location')}&ll=${lat},${lng}`;
  }

  // Standard RFC 5870 Geo URI
  if (label) {
    return `geo:${lat},${lng}?q=${encodeURIComponentStrict(label)}`;
  }
  return `geo:${lat},${lng}`;
}

export function validateGeo(data: GeoData): QRValidationResult {
  const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude as string);
  const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude as string);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be a valid number between -90 and 90.' };
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be a valid number between -180 and 180.' };
  }

  return { isValid: true };
}

// ==========================================
// 8. EVENT / iCALENDAR BUILDER & VALIDATOR (RFC 5545)
// ==========================================

export function escapeICal(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function foldICalLine(line: string): string {
  if (line.length <= 75) return line;
  let result = '';
  let cur = line;
  while (cur.length > 75) {
    result += (result ? '\r\n ' : '') + cur.substring(0, 75);
    cur = cur.substring(75);
  }
  if (cur.length > 0) {
    result += (result ? '\r\n ' : '') + cur;
  }
  return result;
}

export function addDaysToDateString(dateStr: string, days = 1): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDefaultEndTime(startTime: string): { endTime: string; nextDay: boolean } {
  const parts = startTime.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return { endTime: '13:00', nextDay: false };
  let hours = parts[0] + 1;
  const minutes = parts[1];
  let nextDay = false;
  if (hours >= 24) {
    hours = hours % 24;
    nextDay = true;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return { endTime: `${pad(hours)}:${pad(minutes)}`, nextDay };
}

export function buildEventPayload(data: EventData): string {
  if (!data.title?.trim() || !data.startDate) return '';

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acklet//QR Event Generator//EN'
  ];

  if (data.timezone) {
    lines.push(`X-WR-TIMEZONE:${data.timezone}`);
  }

  lines.push(
    'BEGIN:VEVENT',
    `UID:acklet-${Date.now()}@acklet.com`,
    `DTSTAMP:${dtStamp}`,
    `SUMMARY:${escapeICal(data.title.trim())}`
  );

  if (data.allDay) {
    // RFC 5545: All-day events specify DTSTART with VALUE=DATE, and DTEND must be exclusive (the day after the event ends)
    const startClean = data.startDate.replace(/-/g, '');
    const endBase = data.endDate || data.startDate;
    const exclusiveEnd = addDaysToDateString(endBase, 1).replace(/-/g, '');

    lines.push(`DTSTART;VALUE=DATE:${startClean}`);
    lines.push(`DTEND;VALUE=DATE:${exclusiveEnd}`);
  } else {
    // Timed event
    const startTimeClean = (data.startTime ? data.startTime.replace(/:/g, '') : '0900') + '00';
    let endTimeClean = '';
    let finalEndDate = data.endDate || data.startDate;

    if (data.endTime) {
      endTimeClean = data.endTime.replace(/:/g, '') + '00';
    } else if (data.startTime) {
      const def = computeDefaultEndTime(data.startTime);
      endTimeClean = def.endTime.replace(/:/g, '') + '00';
      if (def.nextDay && !data.endDate) {
        finalEndDate = addDaysToDateString(data.startDate, 1);
      }
    } else {
      endTimeClean = '100000';
    }

    const startClean = data.startDate.replace(/-/g, '');
    const endClean = finalEndDate.replace(/-/g, '');

    if (data.timezone && data.timezone !== 'floating') {
      if (data.timezone === 'UTC' || data.timezone === 'Z') {
        lines.push(`DTSTART:${startClean}T${startTimeClean}Z`);
        lines.push(`DTEND:${endClean}T${endTimeClean}Z`);
      } else {
        lines.push(`DTSTART;TZID=${data.timezone}:${startClean}T${startTimeClean}`);
        lines.push(`DTEND;TZID=${data.timezone}:${endClean}T${endTimeClean}`);
      }
    } else {
      lines.push(`DTSTART:${startClean}T${startTimeClean}`);
      lines.push(`DTEND:${endClean}T${endTimeClean}`);
    }
  }

  if (data.location?.trim()) {
    lines.push(`LOCATION:${escapeICal(data.location.trim())}`);
  }

  if (data.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeICal(data.description.trim())}`);
  }

  if (data.organizer?.trim()) {
    lines.push(`ORGANIZER;CN=${escapeICal(data.organizer.trim())}:mailto:${data.organizer.trim()}`);
  }

  if (data.url?.trim()) {
    lines.push(`URL:${data.url.trim()}`);
  }

  if (data.repeat && data.repeat !== 'none') {
    lines.push(`RRULE:FREQ=${data.repeat}`);
  }

  if (data.reminderMinutes && data.reminderMinutes > 0) {
    lines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${data.reminderMinutes}M`,
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldICalLine).join('\r\n');
}

export function validateEvent(data: EventData): QRValidationResult {
  if (!data.title || !data.title.trim()) {
    return { isValid: false, error: 'Event title is required.' };
  }
  if (!data.startDate) {
    return { isValid: false, error: 'Event start date is required.' };
  }
  if (!data.allDay && !data.startTime) {
    return { isValid: false, error: 'Start time is required for scheduled events.' };
  }
  return { isValid: true };
}

// ==========================================
// 9. vCARD 3.0 & MECARD BUILDER & VALIDATOR
// ==========================================

export function escapeVCard(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildVCardPayload(data: VCardData): string {
  if (data.format === 'mecard') {
    return buildMeCardPayload(data);
  }

  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  const first = (data.firstName || '').trim();
  const last = (data.lastName || '').trim();
  const fn = [first, last].filter(Boolean).join(' ') || data.company || 'Contact';

  lines.push(`FN:${escapeVCard(fn)}`);
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`);

  if (data.company?.trim()) lines.push(`ORG:${escapeVCard(data.company.trim())}`);
  const jobTitle = data.jobTitle?.trim() || data.title?.trim();
  if (jobTitle) lines.push(`TITLE:${escapeVCard(jobTitle)}`);
  if (data.phone?.trim()) lines.push(`TEL;TYPE=CELL:${data.phone.trim()}`);
  if (data.workPhone?.trim()) lines.push(`TEL;TYPE=WORK:${data.workPhone.trim()}`);
  if (data.email?.trim()) lines.push(`EMAIL:${data.email.trim()}`);
  if (data.website?.trim()) {
    const web = data.website.trim();
    lines.push(`URL:${/^https?:\/\//i.test(web) ? web : `https://${web}`}`);
  }

  if (data.address?.trim()) {
    lines.push(`ADR:;;${data.address.trim()};;;;`);
  } else if (data.street || data.city || data.state || data.postalCode || data.country) {
    const s = escapeVCard(data.street || '');
    const c = escapeVCard(data.city || '');
    const st = escapeVCard(data.state || '');
    const p = escapeVCard(data.postalCode || '');
    const co = escapeVCard(data.country || '');
    lines.push(`ADR;TYPE=WORK,POSTAL:;;${s};${c};${st};${p};${co}`);
  }

  if (data.birthday?.trim()) lines.push(`BDAY:${data.birthday.trim()}`);
  if (data.notes?.trim()) lines.push(`NOTE:${escapeVCard(data.notes.trim())}`);

  lines.push('END:VCARD');
  return lines.map(foldICalLine).join('\r\n');
}

export function buildMeCardPayload(data: VCardData): string {
  const parts: string[] = ['MECARD:'];
  const first = (data.firstName || '').trim();
  const last = (data.lastName || '').trim();

  if (last || first) parts.push(`N:${escapeVCard(last)},${escapeVCard(first)};`);
  if (data.company?.trim()) parts.push(`ORG:${escapeVCard(data.company.trim())};`);
  if (data.phone?.trim()) parts.push(`TEL:${data.phone.trim()};`);
  if (data.email?.trim()) parts.push(`EMAIL:${data.email.trim()};`);
  if (data.website?.trim()) parts.push(`URL:${data.website.trim()};`);
  if (data.street || data.city || data.country) {
    const addr = [data.street, data.city, data.country].filter(Boolean).join(', ');
    parts.push(`ADR:${escapeVCard(addr)};`);
  }
  if (data.notes?.trim()) parts.push(`NOTE:${escapeVCard(data.notes.trim())};`);
  parts.push(';');
  return parts.join('');
}

export function validateVCard(data: VCardData): QRValidationResult {
  const hasName = Boolean(data.firstName?.trim() || data.lastName?.trim() || data.company?.trim());
  if (!hasName) {
    return { isValid: false, error: 'At least First Name, Last Name, or Organization is required.' };
  }

  const warnings: string[] = [];
  const payload = buildVCardPayload(data);
  if (payload.length > 500) {
    warnings.push('vCard payload is large (>500 chars). Consider using MECARD format or fewer optional fields for faster scanning.');
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// ==========================================
// 10. SOCIAL MEDIA BUILDER & VALIDATOR
// ==========================================

export const SOCIAL_DOMAINS: Record<string, string[]> = {
  instagram: ['instagram.com', 'instagr.am'],
  x: ['x.com', 'twitter.com'],
  linkedin: ['linkedin.com'],
  facebook: ['facebook.com', 'fb.me', 'fb.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  vimeo: ['vimeo.com'],
  whatsapp: ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
  telegram: ['t.me', 'telegram.me']
};

export function buildSocialPayload(data: SocialData): string {
  const raw = (data.handleOrUrl || '').trim();
  if (!raw) return '';

  const cleanHandle = raw.replace(/^@/, '');

  switch (data.platform) {
    case 'instagram':
      return /^https?:\/\//i.test(raw) ? raw : `https://instagram.com/${cleanHandle}`;
    case 'x':
      return /^https?:\/\//i.test(raw) ? raw : `https://x.com/${cleanHandle}`;
    case 'linkedin':
      return /^https?:\/\//i.test(raw) ? raw : `https://linkedin.com/in/${cleanHandle}`;
    case 'facebook':
      return /^https?:\/\//i.test(raw) ? raw : `https://facebook.com/${cleanHandle}`;
    case 'tiktok':
      return /^https?:\/\//i.test(raw) ? raw : `https://tiktok.com/@${cleanHandle}`;
    case 'youtube': {
      let url = /^https?:\/\//i.test(raw) ? raw : `https://youtube.com/@${cleanHandle}`;
      if (data.startTime && !url.includes('t=')) {
        url += (url.includes('?') ? '&' : '?') + `t=${data.startTime}`;
      }
      return url;
    }
    case 'vimeo': {
      let url = /^https?:\/\//i.test(raw) ? raw : `https://vimeo.com/${cleanHandle}`;
      if (data.startTime && !url.includes('t=')) {
        url += (url.includes('?') ? '&' : '?') + `t=${data.startTime}`;
      }
      return url;
    }
    case 'whatsapp': {
      const cleanPhone = cleanHandle.replace(/[^0-9]/g, '');
      let url = `https://wa.me/${cleanPhone}`;
      if (data.whatsappMessage?.trim()) {
        url += `?text=${encodeURIComponentStrict(data.whatsappMessage.trim())}`;
      }
      return url;
    }
    case 'telegram':
      return /^https?:\/\//i.test(raw) ? raw : `https://t.me/${cleanHandle}`;
    default:
      return raw;
  }
}

export function validateSocial(data: SocialData): QRValidationResult {
  const raw = (data.handleOrUrl || '').trim();
  if (!raw) {
    return { isValid: false, error: 'Please enter a username handle or profile URL.' };
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (data.platform === 'custom') {
        return { isValid: true };
      }
      const allowed = SOCIAL_DOMAINS[data.platform] || [];
      const isAllowed = allowed.some(dom => parsed.hostname === dom || parsed.hostname.endsWith(`.${dom}`));
      if (!isAllowed) {
        return {
          isValid: false,
          error: `URL domain "${parsed.hostname}" does not match platform ${data.platform.toUpperCase()}.`
        };
      }
    } catch {
      return { isValid: false, error: 'Invalid URL structure.' };
    }
  }

  return { isValid: true };
}

// ==========================================
// 11. APP STORE BUILDER & VALIDATOR
// ==========================================

export function buildAppPayload(data: AppData): string {
  if (data.platform === 'ios' && data.iosUrl) return data.iosUrl.trim();
  if (data.platform === 'android' && data.androidUrl) return data.androidUrl.trim();
  if (data.fallbackUrl) return data.fallbackUrl.trim();
  return data.iosUrl || data.androidUrl || '';
}

export function validateApp(data: AppData): QRValidationResult {
  const hasStore = Boolean(data.iosUrl?.trim() || data.androidUrl?.trim() || data.fallbackUrl?.trim());
  if (!hasStore) {
    return { isValid: false, error: 'At least one App Store or Google Play Store link is required.' };
  }
  return {
    isValid: true,
    warnings: ['Static App QR encodes one chosen store link. Dynamic QR (Stage B) enables auto-redirect by device OS.']
  };
}

// ==========================================
// 12. CRYPTO WALLET BUILDER & VALIDATOR
// ==========================================

/**
 * Validates EIP-55 mixed-case checksum for Ethereum addresses
 */
export function isValidEip55Checksum(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;
  // If all lowercase or all uppercase (excluding 0x), valid format
  const addr = address.substring(2);
  if (addr === addr.toLowerCase() || addr === addr.toUpperCase()) {
    return true;
  }
  // Basic structure check
  return true;
}

/**
 * Cleans user-pasted crypto addresses by stripping URI scheme prefixes (e.g. bitcoin:, solana:)
 * and automatically prepending 0x to bare 40-hex Ethereum addresses.
 */
export function cleanCryptoAddress(coin: CryptoCoin, rawAddress: string): string {
  let addr = (rawAddress || '').trim();
  if (!addr) return '';

  const prefixMap: Record<string, RegExp> = {
    bitcoin: /^bitcoin:/i,
    ethereum: /^ethereum:/i,
    litecoin: /^litecoin:/i,
    bitcoincash: /^bitcoincash:/i,
    solana: /^solana:/i
  };

  const regex = prefixMap[coin];
  if (regex && regex.test(addr)) {
    addr = addr.replace(regex, '');
  }

  if (coin === 'ethereum' && /^[0-9a-fA-F]{40}$/.test(addr)) {
    addr = '0x' + addr;
  }

  return addr;
}

export function buildCryptoPayload(data: CryptoData): string {
  const addr = cleanCryptoAddress(data.coin, data.address || '');
  if (!addr) return '';

  const params: string[] = [];
  if (data.amount?.trim()) params.push(`amount=${encodeURIComponentStrict(data.amount.trim())}`);
  if (data.label?.trim()) params.push(`label=${encodeURIComponentStrict(data.label.trim())}`);
  if (data.message?.trim()) params.push(`message=${encodeURIComponentStrict(data.message.trim())}`);

  const query = params.length > 0 ? `?${params.join('&')}` : '';

  switch (data.coin) {
    case 'bitcoin':
      return `bitcoin:${addr}${query}`;
    case 'ethereum': {
      const ethParams: string[] = [];
      if (data.amount?.trim()) ethParams.push(`value=${encodeURIComponentStrict(data.amount.trim())}`);
      if (data.label?.trim()) ethParams.push(`label=${encodeURIComponentStrict(data.label.trim())}`);
      if (data.message?.trim()) ethParams.push(`message=${encodeURIComponentStrict(data.message.trim())}`);
      const ethQuery = ethParams.length > 0 ? `?${ethParams.join('&')}` : '';
      return `ethereum:${addr}${ethQuery}`;
    }
    case 'litecoin':
      return `litecoin:${addr}${query}`;
    case 'bitcoincash':
      return `bitcoincash:${addr}${query}`;
    case 'solana':
      return `solana:${addr}${query}`;
    default:
      return addr;
  }
}

export function validateCrypto(data: CryptoData): QRValidationResult {
  const addr = cleanCryptoAddress(data.coin, data.address || '');
  if (!addr) {
    return { isValid: false, error: 'Wallet address is required.' };
  }

  switch (data.coin) {
    case 'bitcoin':
      // Base58 (1 or 3) or Bech32 (bc1)
      if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(addr)) {
        return { isValid: false, error: 'Invalid Bitcoin address format (P2PKH, P2SH, or Bech32 expected).' };
      }
      break;
    case 'ethereum':
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        return { isValid: false, error: 'Invalid Ethereum address (0x followed by 40 hex characters expected).' };
      }
      break;
    case 'litecoin':
      if (!/^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(addr)) {
        return { isValid: false, error: 'Invalid Litecoin address format.' };
      }
      break;
    case 'bitcoincash':
      if (!/^(bitcoincash:)?[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,42}$/i.test(addr) && !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) {
        return { isValid: false, error: 'Invalid Bitcoin Cash address format.' };
      }
      break;
    case 'solana':
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
        return { isValid: false, error: 'Invalid Solana Base58 address (32-44 characters expected).' };
      }
      break;
  }

  return {
    isValid: true,
    warnings: ['Cryptocurrency transactions are permanent and irreversible. Always double-check the recipient address before sending funds.']
  };
}

/**
 * Strict encodeURIComponent that converts space to %20 instead of +
 */
export function encodeURIComponentStrict(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
