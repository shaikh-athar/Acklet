# Barcode Generator — Test Vectors & Verification

This document specifies the official test vectors and validation rules for Tier 1 and Tier 2 symbologies supported by the Acklet Barcode Generator. All vectors are continuously verified via automated Vitest test suites ([`validator.service.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/validator.service.spec.ts), [`check-digit.service.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/check-digit.service.spec.ts), [`bulk-generator.service.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.spec.ts), [`barcode-engine.adapter.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/barcode-engine.adapter.spec.ts), [`responsive-layout.spec.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-layout.spec.ts)).

---

## 1. Checksum & Conversion Vectors

### 1.1 EAN-13 (GTIN-13)
- **12-digit payload**: `400638133393`
- **Computed check digit**: `1`
- **Full valid code**: `4006381333931`
- **Human-readable grouping**: `4 006381 333931`
- **Result**: PASS

### 1.2 UPC-A (GTIN-12)
- **11-digit payload**: `03600029145`
- **Computed check digit**: `2`
- **Full valid code**: `036000291452`
- **Human-readable grouping**: `0 36000 29145 2`
- **Result**: PASS

### 1.3 EAN-8
- **7-digit payload**: `9638507`
- **Computed check digit**: `4`
- **Full valid code**: `96385074`
- **Human-readable grouping**: `9638 5074`
- **Result**: PASS

### 1.4 ISBN-13
- **12-digit payload**: `978030640615`
- **Computed check digit**: `7`
- **Full valid code**: `9780306406157`
- **Human-readable grouping**: `978-0-306-40615-7`
- **Result**: PASS

### 1.5 ISBN-10 to ISBN-13 Conversion
- **Raw input**: `0-306-40615-2`
- **Prefix prepended**: `978`
- **Computed check digit**: `7`
- **Converted output**: `9780306406157`
- **Result**: PASS

### 1.6 ITF-14
- **13-digit payload**: `1001234567890`
- **Computed check digit**: `2`
- **Full valid code**: `10012345678902`
- **Result**: PASS

---

## 2. Rejection & Error Recovery Vectors

| Test Case | Format | Input | Expected Output & Message | Suggested Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Letters in numeric format | `ean13` | `400638133393A` | Invalid: *"Use digits only."* | None | PASS |
| Letters in numeric format | `upca` | `03600029145A` | Invalid: *"Use digits only."* | None | PASS |
| Length below minimum | `ean8` | `12345` | Invalid: *"Enter 7 or 8 digits."* | None | PASS |
| Incorrect check digit | `ean13` | `4006381333939` | Invalid: *"Check digit should be 1."* | None | PASS |
| Odd length Interleaved 2 of 5 | `itf` | `12345` | Invalid: *"Length must be an even number of digits."* | `prepend-zero` ("Add a leading 0") | PASS |
| Lowercase in Code 39 | `code39` | `acklet-123` | Invalid: *"Use uppercase letters, digits and - . $ / + %."* | `uppercase` ("Convert to uppercase") | PASS |
| GS1 DataBar Limited leading digit | `gs1-databar` | `20012345678909` | Invalid: *"Limited accepts only GTINs starting with 0 or 1."* | None | PASS |
| URL in 1D barcode | `code128` | `https://example.com/checkout` | Suggestion chip: QR Generator recommendation | None | PASS |

---

## 3. Bulk & Formula Injection Vectors

| Vector Payload | Input Mode | Expected Processed Cell | Defended Against |
| :--- | :--- | :--- | :--- |
| `=SUM(A1:A10)` | CSV Upload / Paste | `'=SUM(A1:A10)` | Spreadsheet formula execution |
| `-10+20` | CSV Upload / Paste | `'-10+20` | Dynamic cell evaluation |
| `+18005550199` | CSV Upload / Paste | `'+18005550199` | Formula hijacking |
| `@cmd` | CSV Upload / Paste | `'@cmd` | DDE / command injection |
| `12345\tEVIL` | CSV Upload / Paste | `'12345\tEVIL` | Tab-delimited command piping |

---

## 4. Fuzz & Robustness Vectors

- **High-volume character payload**: Inputs exceeding 5,000 characters (e.g. `A.repeat(5000)`) are cleanly rejected by the bounds checker before entering the encoding adapter.
- **Null and control bytes**: Inputs containing `\x00`, `\x08`, and Unicode surrogates are sanitized without throwing unhandled exceptions or freezing the browser thread.
- **Dual Decoder Verification**: Test SVGs are verified against the browser's native `BarcodeDetector` when available, with fallback to `@zxing/library` to confirm round-trip decodability.

---

## 5. Related Documentation
- Technical Specification: [spec.md](./spec.md)
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Format Registry: [format-registry.md](./format-registry.md)
- Security Baseline: [security.md](./security.md)
- Library Licenses: [library-licenses.md](./library-licenses.md)
- Changelog: [changelog.md](./changelog.md)
