// client/apps/tool-qr-generator/src/services/qr-payload-builders.spec.ts
import { describe, it, expect } from 'vitest';
import {
  buildWebsitePayload,
  validateWebsite,
  buildTextPayload,
  validateText,
  detectPotentialTextType,
  addDaysToDateString,
  computeDefaultEndTime,
  buildEmailPayload,
  validateEmail,
  buildPhonePayload,
  validatePhone,
  buildSmsPayload,
  validateSms,
  buildWifiPayload,
  validateWifi,
  escapeWifi,
  buildGeoPayload,
  validateGeo,
  parseMapCoordinates,
  buildEventPayload,
  validateEvent,
  foldICalLine,
  escapeICal,
  buildVCardPayload,
  buildMeCardPayload,
  validateVCard,
  buildSocialPayload,
  validateSocial,
  buildAppPayload,
  validateApp,
  buildCryptoPayload,
  validateCrypto,
  cleanCryptoAddress
} from './qr-payload-builders';

describe('QR Payload Builders & Validators', () => {
  describe('Website / URL', () => {
    it('auto-prepends https:// when no protocol is supplied', () => {
      const payload = buildWebsitePayload({ url: 'acklet.com' });
      expect(payload).toBe('https://acklet.com');
    });

    it('appends UTM parameters safely without corrupting existing query params', () => {
      const payload = buildWebsitePayload({
        url: 'https://acklet.com/product?ref=qr',
        utmSource: 'newsletter',
        utmMedium: 'cpc',
        utmCampaign: 'launch2026',
        utmTerm: 'tools',
        utmContent: 'hero_btn'
      });
      const url = new URL(payload);
      expect(url.searchParams.get('ref')).toBe('qr');
      expect(url.searchParams.get('utm_source')).toBe('newsletter');
      expect(url.searchParams.get('utm_medium')).toBe('cpc');
      expect(url.searchParams.get('utm_campaign')).toBe('launch2026');
      expect(url.searchParams.get('utm_term')).toBe('tools');
      expect(url.searchParams.get('utm_content')).toBe('hero_btn');
    });

    it('rejects executable schemes like javascript: and data:', () => {
      expect(validateWebsite({ url: 'javascript:alert(1)' }).isValid).toBe(false);
      expect(validateWebsite({ url: 'data:text/html,<script>' }).isValid).toBe(false);
    });

    it('warns on insecure http://, localhost, private IPs, punycode, and long URLs', () => {
      const httpRes = validateWebsite({ url: 'http://example.com' });
      expect(httpRes.isValid).toBe(true);
      expect(httpRes.warnings?.[0]).toContain('Insecure HTTP');

      const localRes = validateWebsite({ url: 'http://localhost:3000' });
      expect(localRes.warnings?.some(w => w.includes('Local or private IP'))).toBe(true);

      const punyRes = validateWebsite({ url: 'https://xn--e1afmkfd.xn--p1ai' });
      expect(punyRes.warnings?.some(w => w.includes('Punycode'))).toBe(true);

      const longUrl = 'https://example.com/' + 'a'.repeat(310);
      const longRes = validateWebsite({ url: longUrl });
      expect(longRes.warnings?.some(w => w.includes('exceeds 300 characters'))).toBe(true);
    });
  });

  describe('Plain Text', () => {
    it('trims text and enforces 5,000 character limit', () => {
      expect(buildTextPayload('  Acklet Notes  ')).toBe('Acklet Notes');
      expect(validateText('').isValid).toBe(false);
      expect(validateText('Valid text').isValid).toBe(true);
      expect(validateText('x'.repeat(5000)).isValid).toBe(true);

      const overCharLimit = validateText('x'.repeat(5001));
      expect(overCharLimit.isValid).toBe(false);
      expect(overCharLimit.error).toBe('Maximum is 5,000 characters.');
    });

    it('enforces 10,000 UTF-8 byte cap for multi-byte characters (Hindi / emoji)', () => {
      // Devanagari / Hindi character 'न' is 3 bytes in UTF-8
      const hindiUnderCap = 'नमस्ते दुनिया '.repeat(200); // ~3,000 chars, ~7,400 bytes
      expect(validateText(hindiUnderCap).isValid).toBe(true);

      // 3,500 Hindi characters = ~10,500 bytes (> 10,000 byte cap) while well under 5,000 chars
      const hindiOverCap = 'न'.repeat(3500);
      expect(hindiOverCap.length).toBe(3500);
      const res = validateText(hindiOverCap);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Non-English text uses more space');

      // Mixed emoji + Hindi: 2,000 emojis (4,000 chars, 8,000 bytes) + 800 Hindi chars (800 chars, 2,400 bytes)
      // Total: 4,800 chars (< 5,000 limit), 10,400 bytes (> 10,000 byte cap)
      const mixedOverCap = '🚀'.repeat(2000) + 'न'.repeat(800);
      expect(mixedOverCap.length).toBe(4800);
      expect(new TextEncoder().encode(mixedOverCap).length).toBe(10400);
      const mixedRes = validateText(mixedOverCap);
      expect(mixedRes.isValid).toBe(false);
      expect(mixedRes.error).toBe('Non-English text uses more space');
    });

    it('normalizes CRLF and CR to clean single LF and strips UTF-8 BOM', () => {
      const inputWithCrLf = '\uFEFFLine 1\r\nLine 2\rLine 3\r\n';
      const normalized = buildTextPayload(inputWithCrLf);
      expect(normalized).toBe('Line 1\nLine 2\nLine 3');
      expect(normalized.startsWith('\uFEFF')).toBe(false);
      expect(normalized).not.toContain('\r');
    });

    it('detects potential text types for links, emails, and phone numbers', () => {
      expect(detectPotentialTextType('https://acklet.com/studio')).toBe('url');
      expect(detectPotentialTextType('www.example.org')).toBe('url');
      expect(detectPotentialTextType('support@acklet.com')).toBe('email');
      expect(detectPotentialTextType('+1 415 555 2671')).toBe('phone');
      expect(detectPotentialTextType('Just some casual meeting notes here')).toBeNull();
    });
  });

  describe('Email', () => {
    it('constructs mailto with encoded subject and body using %20 instead of +', () => {
      const payload = buildEmailPayload({
        to: 'support@acklet.com',
        cc: 'lead@acklet.com',
        subject: 'Bug Report: Login',
        body: 'Hello team,\nPlease check this issue.'
      });
      expect(payload).toContain('mailto:support@acklet.com?');
      expect(payload).toContain('subject=Bug%20Report%3A%20Login');
      expect(payload).not.toContain('Bug+Report');
      expect(payload).toContain('cc=lead%40acklet.com');
    });

    it('validates single and multiple comma-separated emails', () => {
      expect(validateEmail({ to: 'user@example.com' }).isValid).toBe(true);
      expect(validateEmail({ to: 'a@b.com, c@d.org' }).isValid).toBe(true);
      expect(validateEmail({ to: 'invalid-email' }).isValid).toBe(false);
      expect(validateEmail({ to: '' }).isValid).toBe(false);
    });
  });

  describe('Phone', () => {
    it('validates and emits E.164 tel: scheme', () => {
      const payload = buildPhonePayload({ countryCode: '+1', number: '4155552671' });
      expect(payload).toBe('tel:+14155552671');

      expect(validatePhone({ countryCode: '+1', number: '4155552671' }).isValid).toBe(true);
      expect(validatePhone({ countryCode: '', number: '123' }).isValid).toBe(false);
    });
  });

  describe('SMS', () => {
    it('formats default SMSTO: URI and optional sms: URI variant', () => {
      const smsto = buildSmsPayload({ phone: '+14155552671', message: 'Hello Acklet' });
      expect(smsto).toBe('SMSTO:+14155552671:Hello Acklet');

      const sms = buildSmsPayload({ phone: '+14155552671', message: 'Hello Acklet', format: 'sms' });
      expect(sms).toBe('sms:+14155552671?body=Hello%20Acklet');
    });

    it('validates SMS recipient phone number', () => {
      expect(validateSms({ phone: '+14155552671' }).isValid).toBe(true);
      expect(validateSms({ phone: '' }).isValid).toBe(false);
    });
  });

  describe('Wi-Fi', () => {
    it('escapes reserved characters correctly (\\, ;, ,, :, ")', () => {
      expect(escapeWifi('Office;Net:5G"Special\\Pass,')).toBe('Office\\;Net\\:5G\\"Special\\\\Pass\\,');
    });

    it('formats WPA, WEP, and nopass correctly', () => {
      const wpa = buildWifiPayload({ ssid: 'Home-Wifi', security: 'WPA', password: 'SecretPassword123' });
      expect(wpa).toBe('WIFI:S:Home-Wifi;T:WPA;P:SecretPassword123;;');

      const open = buildWifiPayload({ ssid: 'Guest-Open', security: 'nopass' });
      expect(open).toBe('WIFI:S:Guest-Open;T:nopass;;');
      expect(open).not.toContain('P:');

      const hidden = buildWifiPayload({ ssid: 'Stealth', security: 'WPA3', password: 'PassWord123', hidden: true });
      expect(hidden).toBe('WIFI:S:Stealth;T:WPA3;P:PassWord123;H:true;;');
    });

    it('supports Enterprise EAP configuration', () => {
      const enterprise = buildWifiPayload({
        ssid: 'Corp-Net',
        security: 'WPA',
        password: 'Pass',
        eapMethod: 'PEAP',
        identity: 'corp\\user',
        anonymousIdentity: 'anon'
      });
      expect(enterprise).toContain('E:PEAP;');
      expect(enterprise).toContain('I:corp\\\\user;');
      expect(enterprise).toContain('A:anon;');
    });

    it('enforces required SSID and minimum 8-character password for WPA/WEP', () => {
      expect(validateWifi({ ssid: '', security: 'WPA' }).isValid).toBe(false);
      expect(validateWifi({ ssid: 'Net', security: 'WPA', password: 'short' }).isValid).toBe(false);
      expect(validateWifi({ ssid: 'Net', security: 'WPA', password: 'validPassword123' }).isValid).toBe(true);
      expect(validateWifi({ ssid: 'Net', security: 'nopass' }).isValid).toBe(true);
    });

    it('validates WEP 5-char ASCII or 10-hex keys without requiring 8 chars', () => {
      expect(validateWifi({ ssid: 'LegacyNet', security: 'WEP', password: 'abcde' }).isValid).toBe(true);
      expect(validateWifi({ ssid: 'LegacyNet', security: 'WEP', password: '0123456789' }).isValid).toBe(true);
      expect(validateWifi({ ssid: 'LegacyNet', security: 'WEP', password: '123' }).isValid).toBe(false);
    });

    it('escapes quotes and special characters in SSID and password', () => {
      const payload = buildWifiPayload({ ssid: 'Café "Central"', security: 'WPA', password: 'key:with;semi,and\\slash' });
      expect(payload).toContain('Café \\"Central\\"');
      expect(payload).toContain('key\\:with\\;semi\\,and\\\\slash');
    });
  });

  describe('Location / Geo', () => {
    it('formats RFC 5870 Geo URI, Google Maps, and Apple Maps outputs', () => {
      const geo = buildGeoPayload({ latitude: 37.7749, longitude: -122.4194, label: 'Acklet HQ' });
      expect(geo).toBe('geo:37.7749,-122.4194?q=Acklet%20HQ');

      const google = buildGeoPayload({ latitude: 37.7749, longitude: -122.4194, provider: 'google' });
      expect(google).toBe('https://www.google.com/maps?q=37.7749,-122.4194');

      const apple = buildGeoPayload({ latitude: 37.7749, longitude: -122.4194, label: 'Acklet', provider: 'apple' });
      expect(apple).toBe('https://maps.apple.com/?q=Acklet&ll=37.7749,-122.4194');
    });

    it('extracts coordinates from pasted Google Maps and Apple Maps links', () => {
      const fromUrl = parseMapCoordinates('https://www.google.com/maps/@37.774929,-122.419416,15z');
      expect(fromUrl?.latitude).toBeCloseTo(37.774929);
      expect(fromUrl?.longitude).toBeCloseTo(-122.419416);

      const fromApple = parseMapCoordinates('https://maps.apple.com/?ll=37.7749,-122.4194');
      expect(fromApple?.latitude).toBe(37.7749);
      expect(fromApple?.longitude).toBe(-122.4194);

      const fromSimple = parseMapCoordinates('37.7749, -122.4194');
      expect(fromSimple?.latitude).toBe(37.7749);
      expect(fromSimple?.longitude).toBe(-122.4194);
    });

    it('validates coordinate range limits (-90..90 and -180..180)', () => {
      expect(validateGeo({ latitude: 45, longitude: 90 }).isValid).toBe(true);
      expect(validateGeo({ latitude: 95, longitude: 0 }).isValid).toBe(false);
      expect(validateGeo({ latitude: 0, longitude: 190 }).isValid).toBe(false);
    });
  });

  describe('Event (iCalendar RFC 5545)', () => {
    it('builds RFC 5545 VCALENDAR/VEVENT with CRLF and 75-octet folding', () => {
      const payload = buildEventPayload({
        title: 'Acklet Product Launch with Very Long Title Designed Specifically to Test 75 Octet Line Folding Implementation',
        startDate: '2026-11-01',
        startTime: '10:00',
        endDate: '2026-11-01',
        endTime: '11:30',
        location: 'San Francisco, CA',
        description: 'Join us for the live keynote.',
        reminderMinutes: 15,
        repeat: 'WEEKLY'
      });

      expect(payload).toContain('BEGIN:VCALENDAR\r\n');
      expect(payload).toContain('VERSION:2.0\r\n');
      expect(payload).toContain('BEGIN:VEVENT\r\n');
      expect(payload).toContain('RRULE:FREQ=WEEKLY\r\n');
      expect(payload).toContain('BEGIN:VALARM\r\n');
      expect(payload).toContain('TRIGGER:-PT15M\r\n');
      expect(payload).toContain('END:VEVENT\r\n');
      expect(payload).toContain('END:VCALENDAR');

      // Verify CRLF and line folding length constraint
      const lines = payload.split('\r\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(75);
      }
    });

    it('escapes commas, semicolons, and newlines in event properties', () => {
      expect(escapeICal('Meeting, Review; Planning\nNotes')).toBe('Meeting\\, Review\\; Planning\\nNotes');
    });

    it('generates exclusive next-day DTEND for all-day events per RFC 5545', () => {
      // Single-day all-day event
      const singleDay = buildEventPayload({
        title: 'Company Holiday',
        startDate: '2026-10-20',
        allDay: true
      });
      expect(singleDay).toContain('DTSTART;VALUE=DATE:20261020\r\n');
      expect(singleDay).toContain('DTEND;VALUE=DATE:20261021\r\n');

      // Multi-day all-day event (ends on 2026-10-25 inclusive -> exclusive DTEND is 2026-10-26)
      const multiDay = buildEventPayload({
        title: 'Design Offsite',
        startDate: '2026-10-20',
        endDate: '2026-10-25',
        allDay: true
      });
      expect(multiDay).toContain('DTSTART;VALUE=DATE:20261020\r\n');
      expect(multiDay).toContain('DTEND;VALUE=DATE:20261026\r\n');
    });

    it('defaults timed event duration to +1 hour when endTime is omitted', () => {
      const payload = buildEventPayload({
        title: 'Sprint Planning',
        startDate: '2026-10-20',
        startTime: '14:30',
        allDay: false
      });
      expect(payload).toContain('DTSTART:20261020T143000\r\n');
      expect(payload).toContain('DTEND:20261020T153000\r\n');
    });

    it('advances end date when default +1 hour duration crosses midnight', () => {
      const payload = buildEventPayload({
        title: 'Midnight Launch Countdown',
        startDate: '2026-10-20',
        startTime: '23:30',
        allDay: false
      });
      expect(payload).toContain('DTSTART:20261020T233000\r\n');
      expect(payload).toContain('DTEND:20261021T003000\r\n');
    });

    it('validates required title and start date, accepting optional endTime', () => {
      expect(validateEvent({ title: '', startDate: '2026-10-20' }).isValid).toBe(false);
      expect(validateEvent({ title: 'Launch', startDate: '' }).isValid).toBe(false);
      expect(validateEvent({ title: 'Launch', startDate: '2026-10-20', allDay: true }).isValid).toBe(true);
      // Valid without endTime
      expect(validateEvent({ title: 'Launch', startDate: '2026-10-20', startTime: '10:00', allDay: false }).isValid).toBe(true);
      // Invalid if scheduled timed event has no startTime
      expect(validateEvent({ title: 'Launch', startDate: '2026-10-20', allDay: false }).isValid).toBe(false);
    });
  });

  describe('vCard 3.0 & MECARD', () => {
    it('builds RFC 2426 vCard 3.0 with UTF-8 and 75-octet folding', () => {
      const payload = buildVCardPayload({
        firstName: 'Alex',
        lastName: 'Mercer',
        company: 'Acklet Inc.',
        jobTitle: 'Principal Software Engineer',
        phone: '+14155552671',
        email: 'alex@acklet.com',
        website: 'https://acklet.com',
        street: '100 Market St',
        city: 'San Francisco',
        country: 'USA'
      });

      expect(payload).toContain('BEGIN:VCARD\r\n');
      expect(payload).toContain('VERSION:3.0\r\n');
      expect(payload).toContain('FN:Alex Mercer\r\n');
      expect(payload).toContain('N:Mercer;Alex;;;\r\n');
      expect(payload).toContain('ORG:Acklet Inc.\r\n');
      expect(payload).toContain('TEL;TYPE=CELL:+14155552671\r\n');
      expect(payload).toContain('END:VCARD');

      const lines = payload.split('\r\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(75);
      }
    });

    it('builds compact MECARD format alternative', () => {
      const mecard = buildMeCardPayload({
        firstName: 'Alex',
        lastName: 'Mercer',
        company: 'Acklet',
        phone: '+14155552671',
        email: 'alex@acklet.com'
      });
      expect(mecard).toBe('MECARD:N:Mercer,Alex;ORG:Acklet;TEL:+14155552671;EMAIL:alex@acklet.com;;');
    });

    it('warns when payload is large (>500 chars)', () => {
      const largeVCard = buildVCardPayload({
        firstName: 'VeryLongFirstName' + 'x'.repeat(100),
        lastName: 'VeryLongLastName' + 'x'.repeat(100),
        notes: 'Detailed biographical summary and work experience overview: ' + 'n'.repeat(300)
      });
      const res = validateVCard({
        firstName: 'VeryLongFirstName' + 'x'.repeat(100),
        lastName: 'VeryLongLastName' + 'x'.repeat(100),
        notes: 'Detailed biographical summary and work experience overview: ' + 'n'.repeat(300)
      });
      expect(res.warnings?.some(w => w.includes('vCard payload is large'))).toBe(true);
    });
  });

  describe('Social Media', () => {
    it('normalizes handles to canonical URLs per platform', () => {
      expect(buildSocialPayload({ platform: 'instagram', handleOrUrl: '@acklet' })).toBe('https://instagram.com/acklet');
      expect(buildSocialPayload({ platform: 'x', handleOrUrl: '@acklet' })).toBe('https://x.com/acklet');
      expect(buildSocialPayload({ platform: 'linkedin', handleOrUrl: 'acklet' })).toBe('https://linkedin.com/in/acklet');
      expect(buildSocialPayload({ platform: 'tiktok', handleOrUrl: '@acklet' })).toBe('https://tiktok.com/@acklet');
      expect(buildSocialPayload({ platform: 'telegram', handleOrUrl: '@acklet' })).toBe('https://t.me/acklet');
    });

    it('supports YouTube and Vimeo start time offset and WhatsApp prefilled messages', () => {
      const yt = buildSocialPayload({ platform: 'youtube', handleOrUrl: 'https://youtube.com/watch?v=12345', startTime: 120 });
      expect(yt).toBe('https://youtube.com/watch?v=12345&t=120');

      const wa = buildSocialPayload({ platform: 'whatsapp', handleOrUrl: '+14155552671', whatsappMessage: 'Hello Acklet!' });
      expect(wa).toBe('https://wa.me/14155552671?text=Hello%20Acklet%21');
    });

    it('validates platform domain allowlist', () => {
      expect(validateSocial({ platform: 'x', handleOrUrl: 'https://x.com/acklet' }).isValid).toBe(true);
      expect(validateSocial({ platform: 'x', handleOrUrl: 'https://phishing-site.com/acklet' }).isValid).toBe(false);
    });
  });

  describe('App Store', () => {
    it('builds selected app store link', () => {
      const payload = buildAppPayload({
        platform: 'ios',
        iosUrl: 'https://apps.apple.com/app/id123456789',
        androidUrl: 'https://play.google.com/store/apps/details?id=com.acklet'
      });
      expect(payload).toBe('https://apps.apple.com/app/id123456789');
      expect(validateApp({ platform: 'ios', iosUrl: 'https://apps.apple.com/app/id123' }).isValid).toBe(true);
    });
  });

  describe('Crypto Wallet', () => {
    it('validates Bitcoin (Base58 & Bech32) and builds BIP21 URI', () => {
      const btc = buildCryptoPayload({
        coin: 'bitcoin',
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        amount: '0.05',
        label: 'Acklet Subscription'
      });
      expect(btc).toBe('bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.05&label=Acklet%20Subscription');

      expect(validateCrypto({ coin: 'bitcoin', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }).isValid).toBe(true);
      expect(validateCrypto({ coin: 'bitcoin', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' }).isValid).toBe(true);
      expect(validateCrypto({ coin: 'bitcoin', address: 'invalid_btc' }).isValid).toBe(false);
    });

    it('validates Ethereum addresses and builds EIP-681 URI', () => {
      const eth = buildCryptoPayload({
        coin: 'ethereum',
        address: '0xde0B29E307579945136015a66a297973c9887716',
        amount: '1.5'
      });
      expect(eth).toBe('ethereum:0xde0B29E307579945136015a66a297973c9887716?value=1.5');

      expect(validateCrypto({ coin: 'ethereum', address: '0xde0B29E307579945136015a66a297973c9887716' }).isValid).toBe(true);
      expect(validateCrypto({ coin: 'ethereum', address: '0x123' }).isValid).toBe(false);
    });

    it('validates Solana Base58 addresses and issues irreversible transaction warning', () => {
      const sol = validateCrypto({ coin: 'solana', address: '7eynhQoR9YM3N7UoaKRoA44Uy8JeaTue3qyspnqv8Dpz' });
      expect(sol.isValid).toBe(true);
      expect(sol.warnings?.some(w => w.includes('irreversible'))).toBe(true);
    });

    it('strips crypto URI scheme prefixes when user pastes full wallet URLs', () => {
      expect(cleanCryptoAddress('bitcoin', 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(cleanCryptoAddress('ethereum', 'ethereum:0xde0B29E307579945136015a66a297973c9887716')).toBe('0xde0B29E307579945136015a66a297973c9887716');
      expect(cleanCryptoAddress('solana', 'solana:7eynhQoR9YM3N7UoaKRoA44Uy8JeaTue3qyspnqv8Dpz')).toBe('7eynhQoR9YM3N7UoaKRoA44Uy8JeaTue3qyspnqv8Dpz');
    });

    it('auto-prepends 0x to bare 40-hex Ethereum addresses', () => {
      const bareHex = 'de0B29E307579945136015a66a297973c9887716';
      expect(cleanCryptoAddress('ethereum', bareHex)).toBe('0xde0B29E307579945136015a66a297973c9887716');
      expect(validateCrypto({ coin: 'ethereum', address: bareHex }).isValid).toBe(true);
    });

    it('builds Ethereum payload with value, label, and message parameters', () => {
      const payload = buildCryptoPayload({
        coin: 'ethereum',
        address: 'ethereum:0xde0B29E307579945136015a66a297973c9887716',
        amount: '2.5',
        label: 'Acklet Dev',
        message: 'Sprint payment'
      });
      expect(payload).toBe('ethereum:0xde0B29E307579945136015a66a297973c9887716?value=2.5&label=Acklet%20Dev&message=Sprint%20payment');
    });

    it('allows any valid URL when social platform is custom', () => {
      expect(validateSocial({ platform: 'custom' as any, handleOrUrl: 'https://mysite.blog/author' }).isValid).toBe(true);
      expect(buildSocialPayload({ platform: 'custom' as any, handleOrUrl: 'https://mysite.blog/author' })).toBe('https://mysite.blog/author');
    });
  });
});
