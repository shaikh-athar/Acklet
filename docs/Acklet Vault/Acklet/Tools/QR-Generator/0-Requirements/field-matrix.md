---
tool: QR Generator
phase: 3
last-updated: 2026-10-21
status: Complete
---

# QR Generator — Complete Field Specification Matrix

This document provides the definitive field specification, validation logic, escaping rules, and payload wire formats for all static and dynamic QR content types supported by Acklet.

---

## 1. Static Content Types Matrix

All static types are computed entirely on the client, validated with pure builder functions, and encoded directly into the QR symbol matrix.

| Type | Required Fields | Optional Fields (Progressive Disclosure) | Validation Rules | Exact Payload Format | Standard / RFC Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Website / URL** | `url`: string | `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent` | Auto-prepends `https://`. Rejects `javascript:` and `data:`. Warns on non-HTTPS, localhost/private IP, punycode domains, and length > 300 chars. | `https://acklet.com/path?utm_source=...` | RFC 3986, URI Syntax |
| **Plain Text** | `text`: string | None | Trimmed non-empty string. Maximum 2,953 characters (ISO/IEC 18004 Version 40 Byte capacity limit). | Raw UTF-8 string text. | ISO/IEC 18004:2015 |
| **Email** | `to`: string | `cc`, `bcc`, `subject`, `body` | Comma-separated email validation against RFC 5322 regex. Encodes query params with `%20` (never `+`). | `mailto:user@acklet.com?cc=...&subject=...&body=...` | RFC 6068 (`mailto:` scheme) |
| **Phone** | `countryCode`: string, `number`: string | None | Validated via `libphonenumber-js`. Emits strictly formatted international E.164 string. | `tel:+14155552671` | RFC 3966 (`tel:` URI) |
| **SMS** | `phone`: string | `message`: string, `format`: `'smsto' \| 'sms'` | Recipient phone validated. Default `smsto` uses standard `SMSTO:num:msg`. `sms` option emits RFC 5724 `sms:num?body=msg`. | `SMSTO:+14155552671:Hello` or `sms:+14155552671?body=Hello` | RFC 5724 / ZXing Standard |
| **Wi-Fi** | `ssid`: string, `security`: `'WPA' \| 'WEP' \| 'WPA3' \| 'nopass'` | `password`: string, `hidden`: boolean, `eapMethod`: string, `identity`: string, `anonymousIdentity`: string | SSID required. Min 8 chars password unless `nopass`. Escapes reserved characters `\;,:""` with `\`. Supports Enterprise EAP. | `WIFI:S:MySSID;T:WPA;P:pass\;123;H:false;;` | ZXing Wi-Fi Barcode Standard |
| **Location / Geo** | `latitude`: number, `longitude`: number | `label`: string, `provider`: `'geo' \| 'google' \| 'apple'` | Latitude $\in [-90, 90]$, Longitude $\in [-180, 180]$. Supports coordinate extraction from pasted Google/Apple Maps URLs. | `geo:37.7749,-122.4194?q=Label` or `https://maps.google.com/?q=...` | RFC 5870 (`geo:` URI) |
| **Event (iCal)** | `title`: string, `startDate`: string | `endDate`, `startTime`, `endTime`, `allDay`, `location`, `description`, `reminderMinutes`, `repeat` | Required title and date. Enforces strict RFC 5545 CRLF (`\r\n`), 75-octet line folding, and character escaping (`\,`, `\;`, `\n`). | `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT...` | RFC 5545 (iCalendar) |
| **vCard 3.0 / MECARD** | `firstName`: string, `lastName`: string | `company`, `jobTitle`, `phone`, `email`, `website`, `street`, `city`, `state`, `zip`, `country`, `notes`, `format`: `'vcard' \| 'mecard'` | Required name. Emits RFC 2426 vCard 3.0 with UTF-8, CRLF, and 75-octet folding, or NTT DoCoMo MECARD format. Warns if > 500 bytes. | `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alex Mercer\r\n...` | RFC 2426 (vCard 3.0) / DoCoMo MECARD |
| **Social Profile** | `platform`: string, `handleOrUrl`: string | `startTime`: number (YouTube/Vimeo), `whatsappMessage`: string | Canonical handle normalization (`@user` $\to$ platform URL). Domain allowlist check to protect against deceptive links. | Platform deep link (e.g. `https://instagram.com/user`, `https://wa.me/num?text=...`) | Platform URL Deep Linking |
| **App Store** | `platform`: `'ios' \| 'android' \| 'both'` | `iosUrl`, `androidUrl`, `fallbackUrl` | Validates target store domains (`apps.apple.com`, `play.google.com`). Emits direct link or smart fallback redirect URL. | `https://apps.apple.com/app/id...` | Apple / Google Play URI |
| **Crypto Wallet** | `coin`: `'bitcoin' \| 'ethereum' \| 'solana' \| 'litecoin' \| 'bitcoincash'`, `address`: string | `amount`: string, `label`: string, `message`: string | Bitcoin (Bech32/Base58), Ethereum (`0x` 40 hex), Solana (Base58 32-44 chars). Warnings on irreversible transactions. | `bitcoin:bc1q...?amount=0.05&label=Invoice` or `ethereum:0x...?value=1.5` | BIP21 / EIP-681 |

---

## 2. Dynamic (Hosted) Content Types Matrix

Dynamic QR codes resolve through the Acklet Spring Boot shortlink engine (`/q/{code}`). The target destination or hosted payload can be updated anytime without re-printing the QR symbol.

| Dynamic Type | Payload Structure (`contentJson`) | Associated Assets (`qr_assets`) | Redirection Behavior (`/q/{code}`) | Password Gate Support |
| :--- | :--- | :--- | :--- | :--- |
| **Dynamic URL (`DYNAMIC_URL`)** | Target destination URL stored in `target_url` | None | **HTTP 302 Found** directly to external destination URL. Never 301, ensuring fresh analytics on every scan. | Supported (Redirects to `/tools/qr-generator/view/:code?auth=required` if protected) |
| **Dynamic PDF (`DYNAMIC_PDF`)** | `{ title, description, assetId, filename, sizeBytes }` | 1 PDF file (up to 20MB, validated MIME, stored with SHA-256 deduplication) | **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code` rendering PDF preview and direct download CTA. | Supported |
| **Dynamic Menu (`DYNAMIC_MENU`)** | `{ restaurantName, currency, categories: [ { name, items: [ { name, description, price, badges } ] } ] }` | Optional banner image or item photos | **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code` rendering responsive, categorized menu with dietary badges. | Supported |
| **Dynamic Coupon (`DYNAMIC_COUPON`)** | `{ headline, discount, promoCode, expiryDate, terms, ctaUrl }` | Optional hero badge graphic | **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code` with copyable coupon code, countdown timer, and redemption link. | Supported |
| **Dynamic vCard (`DYNAMIC_VCARD`)** | `{ firstName, lastName, company, jobTitle, phone, email, website, street, city, notes }` | Optional avatar image | **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code` rendering interactive digital contact card with 1-click `.vcf` download. | Supported |
| **Dynamic Multi-URL (`DYNAMIC_MULTI_URL`)** | `{ title, bio, links: [ { title, url, icon } ] }` | Optional profile avatar | **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code` rendering link-in-bio hub with outbound tracked links. | Supported |

---

## 3. Escaping & Formatting Rules

### 3.1 Wi-Fi Escaping
Characters `\`, `;`, `,`, `:`, and `"` must be prefixed with a backslash `\`:
```typescript
escaped = raw.replace(/([\\;,:"'])/g, '\\$1');
```

### 3.2 iCalendar Line Folding & CRLF
* Lines MUST end with CRLF (`\r\n`).
* Lines longer than 75 octets must be folded by inserting `\r\n ` (CRLF followed by a space).
* Commas `,`, semicolons `;`, and newlines `\n` in text properties MUST be escaped with a backslash.

### 3.3 vCard 3.0 Formatting
* Property lines must use `\r\n` line endings.
* Multi-byte UTF-8 characters must be preserved without corruption.
* Names format: `N:LastName;FirstName;MiddleName;Prefix;Suffix`.
* Full name format: `FN:FirstName LastName`.

### 3.4 Email Query String
* Subject and body parameters MUST use percent-encoding (`%20` for spaces) rather than application/x-www-form-urlencoded `+`.
