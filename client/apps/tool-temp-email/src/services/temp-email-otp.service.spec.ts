// apps/tool-temp-email/src/services/temp-email-otp.service.spec.ts
import { TempEmailOtpService } from './temp-email-otp.service';

describe('TempEmailOtpService', () => {
  let service: TempEmailOtpService;

  beforeEach(() => {
    service = new TempEmailOtpService();
  });

  describe('extractOtp', () => {
    it('should extract 6-digit verification code from standard security email', () => {
      const subject = 'Your verification code';
      const text = 'Hello, your security verification code is 482910. Valid for 10 minutes.';
      const res = service.extractOtp(subject, text);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('482910');
      expect(res?.type).toBe('numeric');
      expect(res?.confidence).toBeGreaterThan(0.9);
    });

    it('should extract 4-digit PIN code', () => {
      const subject = 'Your one-time login PIN';
      const text = 'Use code: 7392 to sign in to your dashboard.';
      const res = service.extractOtp(subject, text);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('7392');
      expect(res?.type).toBe('numeric');
    });

    it('should extract OTP directly from subject brackets', () => {
      const subject = '[849201] is your account activation code';
      const text = 'Thank you for signing up.';
      const res = service.extractOtp(subject, text);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('849201');
      expect(res?.confidence).toBe(0.98);
    });

    it('should extract alphanumeric verification code', () => {
      const subject = 'Confirm your new account';
      const text = 'Please enter verification code: K82X9A to finish setup.';
      const res = service.extractOtp(subject, text);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('K82X9A');
      expect(res?.type).toBe('alphanumeric');
    });

    it('should extract code from bold HTML markup', () => {
      const subject = 'Account Security';
      const text = 'Here is your passcode.';
      const html = '<p>Your login passcode is: <strong>928174</strong></p>';
      const res = service.extractOtp(subject, text, html);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('928174');
    });

    it('should not extract 4-digit years like 2026', () => {
      const subject = 'Welcome to 2026 conference';
      const text = 'We look forward to seeing you at the annual event in 2026.';
      const res = service.extractOtp(subject, text);

      expect(res).toBeNull();
    });

    it('should reject repeated identical numbers like 000000 or 111111', () => {
      const subject = 'Test message';
      const text = 'Verification code is 000000.';
      const res = service.extractOtp(subject, text);

      expect(res).toBeNull();
    });

    it('should extract leading numeric code from subject and reject brand names like Postman', () => {
      const subject = '913461 is your account verification code';
      const text = 'Please use the code to complete your verification and start collaborating in Postman.\n913461\nThis code will expire in 10 minutes.';
      const res = service.extractOtp(subject, text);

      expect(res).not.toBeNull();
      expect(res?.code).toBe('913461');
      expect(res?.type).toBe('numeric');
      expect(res?.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('should reject pure alphabetical words like Postman as OTP even when near verification keywords', () => {
      const subject = 'Collaboration invite';
      const text = 'Your verification code is Postman for this team.';
      const res = service.extractOtp(subject, text);

      expect(res).toBeNull();
    });
  });

  describe('extractVerificationLinks', () => {
    it('should detect account confirmation links in HTML', () => {
      const text = '';
      const html = `
        <div>
          <p>Click below to activate:</p>
          <a href="https://app.example.com/auth/verify?token=xyz123abc">Confirm Account</a>
          <p>If you did not request this, ignore this email.</p>
          <a href="https://example.com/unsubscribe">Unsubscribe</a>
        </div>
      `;
      const links = service.extractVerificationLinks(text, html);

      expect(links.length).toBe(1);
      expect(links[0].url).toBe('https://app.example.com/auth/verify?token=xyz123abc');
      expect(links[0].host).toBe('app.example.com');
      expect(links[0].label).toBe('Confirm Account');
    });

    it('should detect raw URLs in plain text containing keywords', () => {
      const text = 'Please visit https://service.org/signup/confirm-email?id=892 to activate your trial.';
      const links = service.extractVerificationLinks(text);

      expect(links.length).toBe(1);
      expect(links[0].url).toContain('https://service.org/signup/confirm-email');
      expect(links[0].host).toBe('service.org');
    });

    it('should exclude social media, privacy policy, and unsubscribe links', () => {
      const html = `
        <a href="https://twitter.com/service">Follow Twitter</a>
        <a href="https://service.com/privacy">Privacy Policy</a>
        <a href="https://service.com/optout">Opt-out</a>
      `;
      const links = service.extractVerificationLinks('', html);
      expect(links.length).toBe(0);
    });
  });

  describe('hasLinks', () => {
    it('should detect links in html anchor tags', () => {
      const html = '<p>Click <a href="https://example.com/login">here</a></p>';
      expect(service.hasLinks('', [html])).toBe(true);
    });

    it('should detect raw http/https links in plain text', () => {
      const text = 'Visit https://example.com to view your receipt';
      expect(service.hasLinks(text)).toBe(true);
    });

    it('should return false when no links exist', () => {
      const text = 'Your code is 123456. Thanks for signing up!';
      expect(service.hasLinks(text)).toBe(false);
    });
  });

  describe('analyzeLink (Phishing & Domain Inspector)', () => {
    it('should parse standard URL and extract hostname', () => {
      const result = service.analyzeLink('https://billing.stripe.com/p/session/test');
      expect(result.displayHost).toBe('billing.stripe.com');
      expect(result.isSuspicious).toBe(false);
      expect(result.fullUrl).toBe('https://billing.stripe.com/p/session/test');
    });

    it('should flag suspicious link when visible text domain mismatches actual href domain', () => {
      const result = service.analyzeLink('http://phishing-site.xyz/login', 'https://paypal.com/signin');
      expect(result.isSuspicious).toBe(true);
      expect(result.displayHost).toBe('phishing-site.xyz');
      expect(result.visibleText).toBe('https://paypal.com/signin');
    });

    it('should not flag matching domains with subdomains', () => {
      const result = service.analyzeLink('https://auth.github.com/setup', 'github.com');
      expect(result.isSuspicious).toBe(false);
    });
  });
});

