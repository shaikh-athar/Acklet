// apps/tool-temp-email/src/components/email-viewer/email-viewer.component.spec.ts
import { describe, it, expect } from 'vitest';

describe('Email Viewer HTML Rendering & Sanitization Logic', () => {

  function sanitizeTestHtml(html: string, cidMap: Record<string, string> = {}): string {
    let s = html;

    // 1. Remove dangerous executable scripts
    s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Remove nested iframes, objects, embeds, applets, forms
    s = s.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    s = s.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    s = s.replace(/<embed\b[^>]*>/gi, '');
    s = s.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');
    s = s.replace(/<\/?form\b[^>]*>/gi, '');

    // 3. Remove meta refresh redirects
    s = s.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

    // 4. Remove base tags
    s = s.replace(/<base\b[^>]*>/gi, '');

    // 5. Remove inline JavaScript event handlers
    s = s.replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

    // 6. Neutralize dangerous URL schemes
    s = s.replace(/href\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html):[^"']*\1/gi, 'href="#"');
    s = s.replace(/src\s*=\s*(["'])\s*(javascript|vbscript):[^"']*\1/gi, 'src=""');

    // 7. Replace cid: inline images with resolved base64 data URLs
    s = s.replace(/src=(["'])cid:([^"'>\s\)]+)\1/gi, (match, quote, cidKey) => {
      const cleanKey = cidKey.replace(/^<|>$/g, '');
      const resolved = cidMap[cidKey] || cidMap[cleanKey];
      if (resolved) {
        return `src=${quote}${resolved}${quote}`;
      }
      return match;
    });

    // 8. Filter invisible 1x1 / 0x0 tracking beacons while allowing legitimate visible images
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    s = s.replace(/<img\s+([^>]*?)>/gi, (imgTag, attributes) => {
      const isTinyWidth = /\bwidth\s*=\s*["']?(0|1)(px)?["']?/i.test(attributes);
      const isTinyHeight = /\bheight\s*=\s*["']?(0|1)(px)?["']?/i.test(attributes);
      const isHiddenStyle = /style\s*=\s*["'][^"']*\b(display\s*:\s*none|visibility\s*:\s*hidden|width\s*:\s*[01]px|height\s*:\s*[01]px)/i.test(attributes);

      if ((isTinyWidth && isTinyHeight) || isHiddenStyle) {
        return `<img ${attributes.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src="${transparentPixel}"`)} style="display:none !important;" alt="" />`;
      }
      return imgTag;
    });

    return s;
  }

  it('should strip dangerous <script> tags and inline event handlers', () => {
    const malicious = `
      <div onclick="stealTokens()">
        <p>Hello User</p>
        <script>alert('xss');</script>
        <img src="https://example.com/pic.jpg" onload="badCode()" />
      </div>
    `;
    const clean = sanitizeTestHtml(malicious);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onload');
    expect(clean).toContain('Hello User');
    expect(clean).toContain('https://example.com/pic.jpg');
  });

  it('should block javascript: and vbscript: URIs', () => {
    const malicious = `<a href="javascript:doSomethingEvil()">Click here</a>`;
    const clean = sanitizeTestHtml(malicious);
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('href="#"');
  });

  it('should block meta refresh redirects', () => {
    const malicious = `<meta http-equiv="refresh" content="0;url=http://evil.com">`;
    const clean = sanitizeTestHtml(malicious);
    expect(clean).not.toContain('http-equiv');
    expect(clean).not.toContain('evil.com');
  });

  it('should resolve cid: inline images to corresponding data URLs', () => {
    const input = `<img src="cid:company-logo.png" alt="Company Logo">`;
    const cidMap = {
      'company-logo.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE='
    };
    const clean = sanitizeTestHtml(input, cidMap);
    expect(clean).toContain('src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE="');
    expect(clean).not.toContain('cid:');
  });

  it('should neutralize 1x1 tracking beacons while leaving legitimate images intact', () => {
    const input = `
      <div>
        <!-- Legitimate hero banner -->
        <img src="https://example.com/hero.png" width="600" height="200" alt="Hero" />
        <!-- 1x1 tracking beacon -->
        <img src="https://tracker.com/pixel.gif" width="1" height="1" alt="" />
      </div>
    `;
    const clean = sanitizeTestHtml(input);
    expect(clean).toContain('src="https://example.com/hero.png"');
    expect(clean).not.toContain('src="https://tracker.com/pixel.gif"');
    expect(clean).toContain('display:none !important;');
  });

  it('should preserve tables, bold text, buttons, and custom layout', () => {
    const authenticEmail = `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="background-color: #7C3AED; color: #FFFFFF; font-weight: bold; padding: 12px;">
            Verify Your Email
          </td>
        </tr>
      </table>
    `;
    const clean = sanitizeTestHtml(authenticEmail);
    expect(clean).toContain('table style="width: 100%');
    expect(clean).toContain('background-color: #7C3AED');
    expect(clean).toContain('Verify Your Email');
  });
});

