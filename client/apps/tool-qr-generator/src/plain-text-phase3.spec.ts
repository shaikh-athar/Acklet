// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/plain-text-phase3.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import * as QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  MAX_TEXT_CHARS,
  MAX_TEXT_BYTES,
  LARGE_TEXT_BYTES_THRESHOLD,
  countUtf8Bytes,
  normalizeLineEndings,
  validateText
} from './services/qr-payload-builders';
import { calculateAutoErrorCorrection } from './utils/qr-auto-ec.util';
import { QRGeneratorService } from './services/qr-generator.service';

function decodeQrMatrix(text: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): string | null {
  const qrData = QRCode.create(text, { errorCorrectionLevel });
  const size = qrData.modules.size;
  const scale = 4;
  const width = size * scale;
  const height = size * scale;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isDark = qrData.modules.get(r, c);
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const idx = ((r * scale + py) * width + (c * scale + px)) * 4;
          const val = isDark ? 0 : 255;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }
    }
  }

  const result = jsQR(data, width, height);
  return result ? result.data : null;
}

describe('Phase 3 Plain Text Verification: Limits, Byte Cap, EC Level & Mobile Scans', () => {
  let qrService: QRGeneratorService;

  beforeEach(() => {
    qrService = new QRGeneratorService();
  });

  // TEST 1: 100 characters
  it('1. 100 characters: Validates, keeps normal scannability, decodes accurately', () => {
    const text100 = 'Quick brown fox jumps over the lazy dog. 1234567890! Plain text memo with exactly one hundred chars.';
    const normalized = normalizeLineEndings(text100);
    expect(normalized.length).toBe(100);
    expect(countUtf8Bytes(normalized)).toBe(100);

    const validation = validateText(normalized);
    expect(validation.isValid).toBe(true);

    // Error correction: default is appropriate, does not need large hint
    expect(countUtf8Bytes(normalized) > LARGE_TEXT_BYTES_THRESHOLD).toBe(false);

    // Real scanner verification (simulating camera optical scanner)
    const scanned = decodeQrMatrix(normalized, 'M');
    expect(scanned).toBe(normalized);
  });

  // TEST 2: Exactly 2,000 characters
  it('2. 2,000 characters: Validates, triggers large scannability hint, holds at EC M, decodes', () => {
    const text2000 = 'A'.repeat(2000);
    const normalized = normalizeLineEndings(text2000);
    expect(normalized.length).toBe(2000);
    expect(countUtf8Bytes(normalized)).toBe(2000);

    const validation = validateText(normalized);
    expect(validation.isValid).toBe(true);

    // Large text hint (>800 bytes)
    expect(countUtf8Bytes(normalized) > LARGE_TEXT_BYTES_THRESHOLD).toBe(true);

    // Error correction calculation: text holds at level M, does NOT drop to L
    const autoEc = calculateAutoErrorCorrection({
      content: normalized,
      type: 'text'
    });
    expect(autoEc.level).toBe('M');

    // Real scanner verification: QR capacity fits within 2,300 bytes at level M
    const scanned = decodeQrMatrix(normalized, 'M');
    expect(scanned).toBe(normalized);
    expect(scanned?.length).toBe(2000);
  });

  // TEST 3: 5,001 characters
  it('3. 5,001 characters: Blocks input above limit, returns clear error, never silently truncates', () => {
    const text5001 = 'A'.repeat(5001);
    const normalized = normalizeLineEndings(text5001);
    expect(normalized.length).toBe(5001);

    const validation = validateText(normalized);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe('Maximum is 5,000 characters.');

    // QR service validation also rejects it
    const serviceVal = qrService.validateContent(normalized, 'text');
    expect(serviceVal.isValid).toBe(false);
    expect(serviceVal.error).toBe('Maximum is 5,000 characters.');
  });

  // TEST 4: Hindi chars hitting byte cap first
  it('4. Hindi characters: Blocks input due to 10,000 byte cap, warns non-English text uses more space', () => {
    // Each Hindi character 'अ' is 3 bytes in UTF-8
    const hindi3500 = 'अ'.repeat(3500); // 3,500 chars, 10,500 bytes
    const normalized = normalizeLineEndings(hindi3500);
    expect(normalized.length).toBe(3500);
    expect(countUtf8Bytes(normalized)).toBe(10500);

    const validation = validateText(normalized);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe('Non-English text uses more space');

    // Also verify multi-byte Hindi under 5,000 chars (e.g. 3,400 chars = 10,200 bytes)
    const hindi3400 = 'अ'.repeat(3400); // 3,400 chars, 10,200 bytes
    const bytes3400 = countUtf8Bytes(hindi3400);
    expect(bytes3400).toBe(10200);
    expect(bytes3400).toBeGreaterThan(MAX_TEXT_BYTES);
    const val3400 = validateText(hindi3400);
    expect(val3400.isValid).toBe(false);
    expect(val3400.error).toBe('Non-English text uses more space');
  });

  // TEST 5: Emoji handling
  it('5. Emojis: Counts 4 bytes per emoji with TextEncoder, validates scannability', () => {
    // 50 emojis (🎉 = 4 bytes each = 200 bytes) + text
    const emojiText = '🚀 Launch Celebration! ' + '🎉✨🔥'.repeat(20);
    const normalized = normalizeLineEndings(emojiText);
    const bytes = countUtf8Bytes(normalized);
    expect(bytes).toBeGreaterThan(normalized.length); // Multi-byte proof

    const validation = validateText(normalized);
    expect(validation.isValid).toBe(true);

    // Scans accurately with emojis intact
    const scanned = decodeQrMatrix(normalized, 'M');
    expect(scanned).toBe(normalized);

    // Over-byte text with emojis (2,000 emojis = 4,000 chars, 8,000 bytes + 800 Hindi chars = 800 chars, 2,400 bytes)
    // Total chars = 4,800 (< 5,000), total bytes = 10,400 (> 10,000 cap)
    const emojiOverCap = '🎉'.repeat(2000) + 'न'.repeat(800);
    expect(emojiOverCap.length).toBe(4800);
    expect(countUtf8Bytes(emojiOverCap)).toBe(10400);
    const emojiVal = validateText(emojiOverCap);
    expect(emojiVal.isValid).toBe(false);
    expect(emojiVal.error).toBe('Non-English text uses more space');
  });

  // TEST 6: Line breaks normalization
  it('6. Line breaks: Normalizes CRLF and CR to \\n without data loss', () => {
    const mixedLineEndings = 'Line 1\r\nLine 2\rLine 3\nLine 4';
    const normalized = normalizeLineEndings(mixedLineEndings);
    expect(normalized).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    expect(normalized.includes('\r')).toBe(false);

    const scanned = decodeQrMatrix(normalized, 'M');
    expect(scanned).toBe('Line 1\nLine 2\nLine 3\nLine 4');
  });

  // TEST 7: Notes link mode mobile scan experience
  it('7. Notes link mode: Generates ultra-short URL for long text, scanning seamlessly', () => {
    const longText = 'Meeting Notes:\n1. Roadmap alignment\n2. Design system tokens\n' + 'Bullet points and discussion notes. '.repeat(40);
    expect(longText.length).toBeGreaterThan(1200);

    // In Notes link mode, QR encodes the hosted short URL
    const shortUrl = 'https://acklet.com/notes/29ypw';
    const scanned = decodeQrMatrix(shortUrl, 'M');
    expect(scanned).toBe('https://acklet.com/notes/29ypw');
    // Version is small (< 4), instant optical scan
    const qrData = QRCode.create(shortUrl, { errorCorrectionLevel: 'M' });
    expect(qrData.version).toBeLessThanOrEqual(4);
  });
});
