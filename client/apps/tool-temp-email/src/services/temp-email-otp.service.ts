// apps/tool-temp-email/src/services/temp-email-otp.service.ts
import { Injectable } from '@angular/core';
import { createToolLogger } from '@acklet/shared';
import { OtpExtractionResult, VerificationLinkResult, EmailScanResults, LinkPreviewData } from '../models/temp-email.models';

const log = createToolLogger('TempEmailOtp');

@Injectable({
  providedIn: 'root'
})
export class TempEmailOtpService {
  /**
   * Scans text, HTML, and subject to detect verification codes and confirmation links.
   */
  scanEmail(subject: string, text: string, htmlList: string[] = []): EmailScanResults {
    const combinedHtml = (htmlList || []).join('\n');
    const otp = this.extractOtp(subject, text, combinedHtml);
    const verificationLinks = this.extractVerificationLinks(text, combinedHtml);
    if (otp) {
      log.info(`Extracted verification code: ${otp.code} (${otp.type}, confidence=${otp.confidence})`);
    }
    if (verificationLinks.length > 0) {
      log.info(`Extracted ${verificationLinks.length} verification link(s): ${verificationLinks.map(l => l.url).join(', ')}`);
    }
    return { otp, verificationLinks };
  }

  /**
   * Intelligently extracts OTP / Verification codes from subject, body text, or HTML.
   */
  extractOtp(subject: string, text: string, html: string = ''): OtpExtractionResult | null {
    const rawContent = `${subject}\n${text}\n${this.stripHtml(html)}`;

    // 1. High confidence: Subject patterns (e.g. "Your verification code is 849201" or "[482910]")
    const subjectResult = this.scanSubjectForOtp(subject);
    if (subjectResult) return subjectResult;

    // 2. High confidence: Explicit phrase matching in body text
    const phrasePatterns: Array<{ regex: RegExp; type: 'numeric' | 'alphanumeric'; confidence: number }> = [
      {
        regex: /(?:verification|verify|security|confirmation|confirm|auth|login)\s*(?:code|pin|password|token|passcode)?\s*(?:is|:|=|\-)?\s*([0-9]{4,8})\b/i,
        type: 'numeric',
        confidence: 0.95
      },
      {
        regex: /\bone[\s\-]time\s*(?:password|passcode|code|pin|auth)?\s*(?:is|:|=|\-)?\s*([0-9]{4,8})\b/i,
        type: 'numeric',
        confidence: 0.95
      },
      {
        regex: /\bOTP\s*(?:code)?\s*(?:is|:|=|\-)?\s*([0-9]{4,8})\b/i,
        type: 'numeric',
        confidence: 0.95
      },
      {
        regex: /(?:code|PIN)\s*(?:is|:|=|\-)?\s*([0-9]{4,8})\b/i,
        type: 'numeric',
        confidence: 0.85
      },
      {
        regex: /(?:enter|use|input)\s*(?:the\s*)?(?:following\s*)?(?:code|pin)?\s*(?:to\s*(?:verify|continue|sign\s*in|log\s*in))?\s*(?:is|:|=|\-)?\s*([0-9]{4,8})\b/i,
        type: 'numeric',
        confidence: 0.85
      },
      // Alphanumeric codes: e.g. "verification code: A8F9X2"
      {
        regex: /(?:verification|confirm|security)\s*(?:code|pin)\s*(?:is|:|=|\-)?\s*([A-Z0-9]{6,8})\b/i,
        type: 'alphanumeric',
        confidence: 0.88
      }
    ];

    for (const pattern of phrasePatterns) {
      const match = rawContent.match(pattern.regex);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (this.isValidCode(candidate)) {
          return {
            code: candidate,
            type: pattern.type,
            contextPhrase: match[0].trim(),
            confidence: pattern.confidence
          };
        }
      }
    }

    // 3. Medium confidence: HTML emphasized elements (<b>, <strong>, large font sizes)
    if (html) {
      const htmlMatches = this.scanHtmlEmphasis(html);
      if (htmlMatches.length > 0) {
        return htmlMatches[0];
      }
    }

    // 4. Moderate confidence: Standalone 6-digit number that is not a date/year
    const standaloneNumeric = rawContent.match(/\b([0-9]{6})\b/);
    if (standaloneNumeric && standaloneNumeric[1]) {
      const num = standaloneNumeric[1];
      if (this.isValidCode(num)) {
        return {
          code: num,
          type: 'numeric',
          contextPhrase: `Detected code ${num}`,
          confidence: 0.65
        };
      }
    }

    return null;
  }

  /**
   * Scans email subject line for codes.
   */
  private scanSubjectForOtp(subject: string): OtpExtractionResult | null {
    if (!subject) return null;

    // 1. Brackets, e.g. "[849201] is your account activation code"
    const bracketMatch = subject.match(/\[([0-9]{4,8})\]/);
    if (bracketMatch && this.isValidCode(bracketMatch[1])) {
      return {
        code: bracketMatch[1],
        type: 'numeric',
        contextPhrase: `Subject [${bracketMatch[1]}]`,
        confidence: 0.98
      };
    }

    // 2. Leading number in subject, e.g. "913461 is your account verification code"
    const leadingCodeMatch = subject.match(/^\s*([0-9]{4,8})\b.*?(?:code|pin|otp|verification|auth|password|passcode)\b/i);
    if (leadingCodeMatch && this.isValidCode(leadingCodeMatch[1])) {
      return {
        code: leadingCodeMatch[1],
        type: 'numeric',
        contextPhrase: `Subject code: ${leadingCodeMatch[1]}`,
        confidence: 0.98
      };
    }

    // 3. Number preceding verification keywords in subject, e.g. "913461 is your Postman verification code"
    const numberBeforeKeyword = subject.match(/\b([0-9]{4,8})\b\s*(?:is\s+)?(?:your\s+)?.*?(?:code|pin|otp|verification|auth|security|login)\b/i);
    if (numberBeforeKeyword && this.isValidCode(numberBeforeKeyword[1])) {
      return {
        code: numberBeforeKeyword[1],
        type: 'numeric',
        contextPhrase: `Subject code: ${numberBeforeKeyword[1]}`,
        confidence: 0.96
      };
    }

    // 4. Verification keyword followed by number, e.g. "Your verification code: 913461"
    const codeInSubject = subject.match(/(?:code|otp|pin|verification)[^\d]{1,10}([0-9]{4,8})\b/i);
    if (codeInSubject && this.isValidCode(codeInSubject[1])) {
      return {
        code: codeInSubject[1],
        type: 'numeric',
        contextPhrase: `Subject code: ${codeInSubject[1]}`,
        confidence: 0.95
      };
    }
    return null;
  }

  /**
   * Scans HTML for <b>, <strong>, or header tags wrapping codes.
   */
  private scanHtmlEmphasis(html: string): OtpExtractionResult[] {
    const results: OtpExtractionResult[] = [];
    const strongRegex = /<(?:b|strong|h1|h2|h3)[^>]*>\s*([0-9]{4,8}|[A-Z0-9]{6,8})\s*<\/(?:b|strong|h1|h2|h3)>/gi;
    let match: RegExpExecArray | null;

    while ((match = strongRegex.exec(html)) !== null) {
      const candidate = match[1].trim();
      if (this.isValidCode(candidate)) {
        results.push({
          code: candidate,
          type: /^[0-9]+$/.test(candidate) ? 'numeric' : 'alphanumeric',
          contextPhrase: `Emphasized in message: ${candidate}`,
          confidence: 0.8
        });
      }
    }
    return results;
  }

  /**
   * Validates whether candidate string looks like a true OTP rather than a year, word, or phone prefix.
   */
  private isValidCode(code: string): boolean {
    if (!code) return false;
    const len = code.length;
    if (len < 4 || len > 8) return false;

    // Filter out common 4-digit years: 1950 - 2040
    if (len === 4 && /^(19[5-9]\d|20[0-4]\d)$/.test(code)) {
      return false;
    }

    // Reject all identical repeated characters (e.g. 000000, 111111)
    if (/^(.)\1+$/.test(code)) {
      return false;
    }

    // Reject pure alphabetical words (e.g. "Postman", "Security", "Account", "Please")
    // Legitimate alphanumeric OTP codes must contain at least one digit (e.g. "K82X9A")
    if (/^[A-Za-z]+$/.test(code)) {
      return false;
    }

    return true;
  }

  /**
   * Extracts verification, confirmation, and account activation links.
   */
  extractVerificationLinks(text: string, html: string = ''): VerificationLinkResult[] {
    const results: VerificationLinkResult[] = [];
    const seenUrls = new Set<string>();

    const linkKeywords = ['verify', 'confirm', 'activate', 'validation', 'token=', 'signup/confirm', 'auth/verify', 'account/confirm', 'magic-link', 'login/verify'];
    const excludeKeywords = ['unsubscribe', 'optout', 'privacy', 'terms', 'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'help', 'support'];

    // 1. Scan <a> tags from HTML
    if (html) {
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"'>\s]+)\1[^>]*>(.*?)<\/a>/gis;
      let match: RegExpExecArray | null;

      while ((match = anchorRegex.exec(html)) !== null) {
        const url = match[2];
        const rawLabel = this.stripHtml(match[3]).trim();
        this.evaluateLinkCandidate(url, rawLabel, linkKeywords, excludeKeywords, results, seenUrls);
      }
    }

    // 2. Scan raw URLs in plain text
    const textUrlRegex = /\bhttps?:\/\/[^\s<>"')]+/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = textUrlRegex.exec(text)) !== null) {
      const url = urlMatch[0];
      this.evaluateLinkCandidate(url, 'Confirmation Link', linkKeywords, excludeKeywords, results, seenUrls);
    }

    return results;
  }

  private evaluateLinkCandidate(
    url: string,
    label: string,
    linkKeywords: string[],
    excludeKeywords: string[],
    results: VerificationLinkResult[],
    seenUrls: Set<string>
  ): void {
    if (!url || seenUrls.has(url)) return;

    const lowerUrl = url.toLowerCase();
    const lowerLabel = label.toLowerCase();

    // Check excludes
    if (excludeKeywords.some(bad => lowerUrl.includes(bad) || lowerLabel.includes(bad))) {
      return;
    }

    // Check includes
    const isKeywordMatch = linkKeywords.some(kw => lowerUrl.includes(kw) || lowerLabel.includes(kw));
    if (isKeywordMatch) {
      seenUrls.add(url);
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        host = 'External Link';
      }

      let displayLabel = label.length > 3 && label.length < 50 ? label : 'Verify & Activate Account';
      // Clean up common link label artifacts
      displayLabel = displayLabel.replace(/\s+/g, ' ').trim();

      results.push({
        url,
        label: displayLabel,
        host
      });
    }
  }

  /**
   * Fast check if snippet contains hyperlinks.
   */
  hasLinks(intro: string = '', text: string = '', html: string = ''): boolean {
    const raw = `${intro} ${text} ${html}`;
    return /https?:\/\/[^\s<>"']+/i.test(raw);
  }

  /**
   * Analyzes an email link for safety, destination domain, and phishing mismatches.
   */
  analyzeLink(url: string, visibleText?: string): LinkPreviewData {
    let displayHost = '';
    try {
      const parsed = new URL(url);
      displayHost = parsed.hostname;
    } catch {
      displayHost = url;
    }

    let isSuspicious = false;
    if (visibleText) {
      const cleanText = visibleText.trim().toLowerCase();
      // If visible text looks like a domain name
      const domainMatch = cleanText.match(/(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})/);
      if (domainMatch) {
        const textDomain = domainMatch[1].replace(/^www\./, '');
        const actualDomain = displayHost.toLowerCase().replace(/^www\./, '');
        if (textDomain !== actualDomain && !actualDomain.endsWith('.' + textDomain)) {
          isSuspicious = true;
        }
      }
    }

    return {
      url,
      displayHost,
      fullUrl: url,
      visibleText,
      isSuspicious
    };
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<style[^>]*>.*?<\/style>/gis, '')
               .replace(/<script[^>]*>.*?<\/script>/gis, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/\s+/g, ' ');
  }
}

