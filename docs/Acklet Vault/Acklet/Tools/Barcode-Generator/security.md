# Barcode Generator — Security Baseline & Compliance

This document outlines the security architecture, data handling practices, client-side isolation guarantees, and deployment configurations for the Acklet Barcode Generator.

---

## 1. Zero-Data Transmission Baseline

- **Local Execution**: 100% of encoding, checksum validation, rendering, decoding, and export occurs inside the user's browser.
- **No Network Egress**: User-entered values, captions, file names, or generated graphics are never transmitted to any remote server or API endpoint.
- **Privacy-Preserving Analytics**: The analytics module ([`AnalyticsService`](../../../../client/apps/tool-barcode-generator/src/services/analytics.service.ts)) requires explicit user consent and only records aggregate counts of format selections and export formats (e.g. `ean13`, `svg`). Entered payload text is strictly excluded from telemetry.
- **Sharing Notice**: When generating a share link, parameters are encoded directly in the URL query string. The UI displays an explicit disclosure: *"The value is visible in the link."* Formats flagged with `isSensitive: true` have the Share action disabled.

---

## 2. Sanitization & XSS Defense

- **No innerHTML Bypasses on User Input**: The application adheres strictly to Angular's DOM sanitization pipeline (`DomSanitizer`). User text, values, and captions are never injected via `[innerHTML]`.
- **Vector Blob Image Pipeline**: The barcode preview renders via an `<img>` tag backed by an in-memory `image/svg+xml` Blob URL (`URL.createObjectURL`). `DomSanitizer.bypassSecurityTrustUrl` is applied solely to our own locally created blob URLs, and object URLs are revoked immediately when the preview updates or upon component destruction (`ngOnDestroy`) to avoid memory leaks.
- **XML Entity Escaping**: Values and caption strings embedded within SVG `<title>`, `<desc>`, and text nodes are escaped via strict XML entity encoding (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`).
- **Accessible SVG Metadata**: Root `<svg>` elements include accessible `<title>` and `<desc>` elements for screen readers (WCAG 2.2 AA) with user values sanitized.

---

## 3. CSV Formula Injection Defense (Bulk Processing)

In bulk batch operations ([`BulkGeneratorService`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.ts)):
- **Prefix Sanitization**: Every imported or exported CSV cell beginning with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is automatically prefixed with an apostrophe (`'`).
- **No Dynamic Evaluation**: Uploaded spreadsheets are processed as inert text without executing macros or formulas.
- **Batch Caps**: File size is capped at 2 MB, and total items per run are capped at 500 rows to prevent main-thread denial of service.

---

## 4. Resource & Dimension Limits

All resource limits are governed by [`BARCODE_SYSTEM_LIMITS`](../../../../client/apps/tool-barcode-generator/src/config/barcode-catalog.config.ts):

| Parameter | Limit | Enforcement Mechanism |
| :--- | :--- | :--- |
| Max Input Length | 1,500 characters (format-specific) | Input field maxlength and ValidatorService check |
| Max Canvas Width / Height | 4,096 px | ExportService dimensions clamping |
| Max Export Pixels | 16,777,216 px (16 MP) | ExportService allocation guard |
| Input Debounce | 150 ms | RxJS `debounceTime(150)` in component lifecycle |
| Max History Items | 20 entries | BarcodeHistoryService auto-pruning |
| Max Bulk Items | 500 records | BulkGeneratorService batch partitioner |
| Max Bulk Upload Size | 2,097,152 bytes (2 MB) | File size validation before reader execution |

---

## 5. Local Storage & Cookie Policy

- **No Tracking Cookies**: The Barcode Generator sets zero cookies.
- **Local Storage Isolation**:
  - `acklet:barcode:history`: Stores recent items locally on device.
  - `acklet:barcode:history-optout`: Disables history storage when the user toggles *"Don't save history"*.
  - `acklet:barcode:analytics-consent`: Manages opt-in state for anonymous feature usage.
- **Purge Capability**: The History modal includes a dedicated *"Clear history"* action that deletes all stored entries.

---

## 6. Content Security Policy (CSP) & Response Headers

Recommended HTTP response headers for production deployment:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
X-Frame-Options: DENY
```

---

## 7. Plaintext Encryption Notice

The tool explicitly educates users in the FAQ and About blocks regarding symbology transparency:
> *"Barcodes are not encrypted. Anyone who scans one can read its value."*

Retail symbology notice:
> *"Numbers used on products sold in stores must be issued by GS1. Codes made here are suitable for testing and internal use."*

---

## 8. Related Documentation
- Technical Specification: [spec.md](./spec.md)
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Format Registry: [format-registry.md](./format-registry.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Library Licenses: [library-licenses.md](./library-licenses.md)
- Changelog: [changelog.md](./changelog.md)
