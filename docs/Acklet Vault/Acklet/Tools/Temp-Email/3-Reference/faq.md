# Temporary Email — Technical Reference & FAQs

## Frequently Asked Questions

### 1. Does Mail.tm support CORS from browser origins?
Yes. Mail.tm API responses include `access-control-allow-origin: *`, allowing web browsers to perform direct `GET`, `POST`, `PATCH`, and `DELETE` requests without requiring a backend proxy.

### 2. How are expired accounts handled?
`TempEmailStorageService` checks the `expiresAt` timestamp upon initial retrieval. Any account older than 24 hours is automatically pruned from `localStorage`. If no accounts remain, a fresh mailbox is created immediately.

### 3. What regex heuristics does the Smart OTP Extractor use?
- Looks for explicit keyword prefixes (`verification code:`, `security pin:`, `one-time passcode`, `OTP:`) followed by 4–8 digits.
- Evaluates HTML emphasis tags (`<b>`, `<strong>`, `font-size: 24px`).
- Extracts bracketed numbers in subject lines (`[123456]`).
- Excludes common calendar years (1950–2040) and repeated sequences (`000000`, `111111`).

### 4. How does cross-device sharing work?
The QR modal generates a QR code representing the temporary email address. Scanning this with any smartphone camera allows opening a `mailto:` prompt or copying the exact temporary email to the mobile device clipboard.

---

## Related Documents
- [README.md](../README.md) — Tool Overview.
- [../2-Implementation/service-design.md](../2-Implementation/service-design.md) — Service Design.

