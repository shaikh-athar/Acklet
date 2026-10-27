// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/multilingual-matrix.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import {
  buildTextPayload,
  validateText,
  buildWebsitePayload,
  buildWifiPayload,
  buildVCardPayload
} from './qr-payload-builders';
import {
  DYNAMIC_THRESHOLD_BYTES,
  NON_ASCII_THRESHOLD_BYTES,
  ALWAYS_DIRECT_TYPES,
  SMART_LINK_ELIGIBLE_TYPES
} from './smart-link.config';
import { SmartLinkService } from './smart-link.service';
import { calculateAutoErrorCorrection } from '../utils/qr-auto-ec.util';

describe('Phase 7: Multilingual Support & End-to-End QA Matrix', () => {
  let service: SmartLinkService;
  let mockHttp: any;

  beforeEach(() => {
    window.localStorage.clear();
    mockHttp = {
      get: vi.fn().mockReturnValue(of({ success: true, data: [] })),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    service = new SmartLinkService(mockHttp as any);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // 1. Short URL (Direct Mode)
  it('1. Short URL (< 180 bytes) remains in direct mode with default auto-EC', () => {
    const shortUrl = 'https://acklet.com';
    const bytes = new TextEncoder().encode(shortUrl).length;
    expect(bytes).toBeLessThan(DYNAMIC_THRESHOLD_BYTES);

    const mode = service.decideMode('url', shortUrl);
    expect(mode).toBe('direct');

    const autoEc = calculateAutoErrorCorrection({
      content: shortUrl,
      type: 'url',
      hasLogo: false,
      isDynamic: false
    });
    expect(autoEc.level).toBe('Q');
  });

  // 2. 400-char URL with UTMs (Smart Link Mode)
  it('2. 400-char URL with UTM parameters promotes automatically to dynamic Smart Link', () => {
    const longUrl = buildWebsitePayload({
      url: 'https://example.com/products/summer-sale/special-edition-item-2026',
      utmSource: 'newsletter_weekly_digest_edition_42',
      utmMedium: 'email_promotional_campaign_retargeting',
      utmCampaign: 'black_friday_early_access_vip_subscribers_exclusive',
      utmContent: 'header_hero_banner_animated_cta_button_variation_b'
    });
    const bytes = new TextEncoder().encode(longUrl).length;
    expect(bytes).toBeGreaterThan(DYNAMIC_THRESHOLD_BYTES);

    const mode = service.decideMode('url', longUrl);
    expect(mode).toBe('dynamic');

    // Dynamic smart links auto-select Level Q (~25% error correction)
    const autoEc = calculateAutoErrorCorrection({
      content: 'https://acklet.com/q/xyz123',
      type: 'url',
      hasLogo: false,
      isDynamic: true
    });
    expect(autoEc.level).toBe('Q');
    expect(autoEc.reason).toContain('25% recovery');
  });

  // 3. 100-char Text (Direct Mode)
  it('3. 100-character Plain Text stays in direct mode', () => {
    const text100 = 'This is a concise note for a conference attendee with contact details and table number 42.'.padEnd(100, '.');
    const bytes = new TextEncoder().encode(text100).length;
    expect(bytes).toBe(100);
    expect(bytes).toBeLessThan(DYNAMIC_THRESHOLD_BYTES);

    const mode = service.decideMode('text', text100);
    expect(mode).toBe('direct');
  });

  // 4. 2,000-char Text (Smart Link Mode)
  it('4. 2,000-character Plain Text promotes to dynamic Smart Link', () => {
    const text2000 = 'Important documentation paragraph with detailed instructions. '.repeat(35).slice(0, 2000);
    expect(text2000.length).toBe(2000);

    const validation = validateText(text2000);
    expect(validation.isValid).toBe(true);

    const mode = service.decideMode('text', text2000);
    expect(mode).toBe('dynamic');
  });

  // 5. 5,000-char Text (Max Dynamic Limit)
  it('5. 5,000-character Plain Text is valid and stays in dynamic mode', () => {
    const text5000 = 'A'.repeat(5000);
    expect(text5000.length).toBe(5000);

    const validation = validateText(text5000);
    expect(validation.isValid).toBe(true);
    expect(validation.error).toBeUndefined();

    const mode = service.decideMode('text', text5000);
    expect(mode).toBe('dynamic');
  });

  // 6. 5,001-char Text (Blocked Limit)
  it('6. 5,001-character Plain Text is rejected by client-side validation', () => {
    const text5001 = 'A'.repeat(5001);
    const validation = validateText(text5001);

    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe('Maximum is 5,000 characters.');
  });

  // 7. Hindi (Devanagari Script)
  it('7. Hindi Devanagari text counts UTF-8 bytes and applies NFC normalization', () => {
    const hindi = 'नमस्ते दुनिया! यह एक बहुभाषी क्यूआर कोड परीक्षण है।';
    const payload = buildTextPayload(hindi);

    // NFC normalization check
    expect(payload).toBe(hindi.normalize('NFC'));

    // Devanagari characters consume 3 bytes each in UTF-8
    const bytes = new TextEncoder().encode(payload).length;
    expect(bytes).toBeGreaterThan(payload.length * 2);

    // Exceeds NON_ASCII_THRESHOLD_BYTES (60 bytes), so it promotes to dynamic mode
    expect(bytes).toBeGreaterThan(NON_ASCII_THRESHOLD_BYTES);
    expect(service.decideMode('text', hindi)).toBe('dynamic');
  });

  // 8. Gujarati Script
  it('8. Gujarati script calculates UTF-8 bytes and normalizes properly', () => {
    const gujarati = 'નમસ્તે દુનિયા! આ એક ગુજરાતી ક્યુઆર કોડ પરીક્ષણ છે.';
    const payload = buildTextPayload(gujarati);

    expect(payload).toBe(gujarati.normalize('NFC'));
    const bytes = new TextEncoder().encode(payload).length;
    expect(bytes).toBeGreaterThan(gujarati.length * 2);

    expect(bytes).toBeGreaterThan(NON_ASCII_THRESHOLD_BYTES);
    expect(service.decideMode('text', gujarati)).toBe('dynamic');
  });

  // 9. Arabic / Urdu (RTL Script)
  it('9. Arabic / Urdu RTL script handles bidirectional characters without mangling', () => {
    const arabic = 'مرحبا بالعالم! هذا اختبار لرمز الاستجابة السريعة متعدد اللغات.';
    const payload = buildTextPayload(arabic);

    expect(payload).toBe(arabic.normalize('NFC'));
    const bytes = new TextEncoder().encode(payload).length;
    expect(bytes).toBeGreaterThan(arabic.length);

    expect(bytes).toBeGreaterThan(NON_ASCII_THRESHOLD_BYTES);
    expect(service.decideMode('text', arabic)).toBe('dynamic');
  });

  // 10. Chinese (CJK Characters)
  it('10. Chinese CJK characters count 3 bytes per character and preserve semantics', () => {
    const cjk = '你好，世界！这是一个多语言二维码测试。包含更多的文字来确保超过阈值。';
    const payload = buildTextPayload(cjk);

    expect(payload).toBe(cjk.normalize('NFC'));
    const bytes = new TextEncoder().encode(payload).length;
    // CJK characters take 3 UTF-8 bytes each
    expect(bytes).toBeGreaterThan(payload.length * 2);
    expect(bytes).toBeGreaterThan(NON_ASCII_THRESHOLD_BYTES);

    expect(service.decideMode('text', cjk)).toBe('dynamic');
  });

  // 11. Multi-byte Emoji
  it('11. Emoji surrogate pairs count UTF-8 bytes accurately and do not crash encoder', () => {
    // 5 4-byte emojis: 🚀 (U+1F680), 🌍 (U+1F30D), 🎉 (U+1F389), 🔥 (U+1F525), 🥳 (U+1F973)
    const emojiStr = '🚀🌍🎉🔥🥳';
    const payload = buildTextPayload(emojiStr);

    const bytes = new TextEncoder().encode(payload).length;
    // 5 emojis * 4 bytes each = 20 bytes
    expect(bytes).toBe(20);

    const manyEmojis = emojiStr.repeat(10); // 200 bytes
    const manyBytes = new TextEncoder().encode(manyEmojis).length;
    expect(manyBytes).toBeGreaterThan(DYNAMIC_THRESHOLD_BYTES);
    expect(service.decideMode('text', manyEmojis)).toBe('dynamic');
  });

  // 12. Large vCard
  it('12. Large vCard (> 180 bytes) promotes to Smart Link for dense data preservation', () => {
    const vcard = buildVCardPayload({
      firstName: 'Alexander',
      lastName: 'Hamilton',
      company: 'Department of the Treasury & Founding Fathers Council of New York',
      jobTitle: 'First Secretary of the Treasury of the United States',
      phone: '+1 212 555 1789',
      workPhone: '+1 212 555 1790',
      email: 'alexander.hamilton@treasury.gov.us',
      website: 'https://en.wikipedia.org/wiki/Alexander_Hamilton',
      street: '57 Wall Street, Financial District',
      city: 'New York',
      state: 'NY',
      postalCode: '10005',
      country: 'United States',
      notes: 'Key advocate for the national bank, manufacturing, and strong federal constitution.'
    });

    const bytes = new TextEncoder().encode(vcard).length;
    expect(bytes).toBeGreaterThan(DYNAMIC_THRESHOLD_BYTES);
    expect(SMART_LINK_ELIGIBLE_TYPES).toContain('vcard');

    const mode = service.decideMode('vcard', vcard);
    expect(mode).toBe('dynamic');
  });

  // 13. Wi-Fi (Always Direct)
  it('13. Wi-Fi credentials ALWAYS encode in direct mode even when exceeding 180 bytes', () => {
    expect(ALWAYS_DIRECT_TYPES).toContain('wifi');

    const longWifi = buildWifiPayload({
      ssid: 'Very_Long_Enterprise_Campus_Guest_Network_With_Detailed_SSID_Identifiers_2026',
      password: 'ExtremelySecureAndLengthyWPA3EnterpriseSharedSecretPassphrase1234567890!@#$%^&*()',
      security: 'WPA',
      hidden: true
    });

    const bytes = new TextEncoder().encode(longWifi).length;
    expect(bytes).toBeGreaterThan(DYNAMIC_THRESHOLD_BYTES);

    const mode = service.decideMode('wifi', longWifi);
    expect(mode).toBe('direct');
  });

  // 14. Backend Down / Offline Fallback
  it('14. Gracefully falls back to offline state when backend API is unreachable', () => {
    service.saveStoredLink({
      code: 'code123',
      manageToken: 'tok123',
      type: 'URL',
      shortUrl: 'https://acklet.com/q/code123',
      createdAt: '2026-10-25T00:00:00Z',
      preview: 'https://example.com',
      payload: 'https://example.com',
      status: 'ACTIVE'
    });

    mockHttp.post.mockReturnValue(throwError(() => ({ message: 'Network disconnected' })));

    service.fetchLiveSummaries().subscribe(results => {
      expect(results.length).toBe(1);
    });

    expect(service.isOffline()).toBe(true);
    expect(service.summaryError()).toContain('Offline');
  });

  // 15. Edited Destination Update
  it('15. Updating destination payload updates server record while keeping shortUrl intact', () => {
    service.managedLinks.set([
      {
        code: 'demoCode',
        shortUrl: 'https://acklet.com/q/demoCode',
        type: 'TEXT',
        preview: 'Original',
        payload: 'Original',
        scanCount: 0,
        createdAt: '2026-10-25T00:00:00Z',
        status: 'ACTIVE',
        manageToken: 'secret_token_123'
      }
    ]);

    mockHttp.put.mockReturnValue(of({
      success: true,
      data: {
        code: 'demoCode',
        shortUrl: 'https://acklet.com/q/demoCode',
        status: 'ACTIVE',
        type: 'TEXT',
        contentBytes: 45
      }
    }));

    let updated = false;
    service.updateLinkPayload('demoCode', 'Updated destination payload').subscribe(res => {
      updated = true;
      expect(res.code).toBe('demoCode');
      expect(res.shortUrl).toBe('https://acklet.com/q/demoCode');
    });

    expect(updated).toBe(true);
    expect(mockHttp.put).toHaveBeenCalledWith(
      '/api/v1/qr-links/demoCode',
      { payload: 'Updated destination payload', type: 'TEXT' },
      expect.anything()
    );
  });
});
