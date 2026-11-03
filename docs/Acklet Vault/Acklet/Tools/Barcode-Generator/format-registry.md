# Barcode Symbology & Format Registry

This document defines the single source of truth for all barcode symbologies supported by the Acklet Barcode Generator. All properties, length rules, character sets, checksum algorithms, and engine identifiers are managed in [`barcode-catalog.config.ts`](../../../../client/apps/tool-barcode-generator/src/config/barcode-catalog.config.ts) and accessed through [`FormatRegistryService`](../../../../client/apps/tool-barcode-generator/src/services/format-registry.service.ts).

---

## 1. Catalog Overview

The registry organizes symbologies into three production tiers:
- **Tier 1 (Core 1D Symbologies)**: Enabled by default, fully tested with automatic check digit calculation and formatting.
- **Tier 2 (2D & Extended Industrial/Retail)**: Enabled, including 2D matrix symbologies (Data Matrix, PDF417, Aztec), retail add-ons (ISSN, ISMN, EAN-2/5), GS1 DataBar variants, and specialized industrial formats.
- **Tier 3 (Deferred / Specialized)**: Registry entries configured with `enabled: false` (GS1-128 builder, Digital Link, Pharmacode, MaxiCode, Code 49, Codablock F, EPC RFID).

---

## 2. Tier 1 Formats (Enabled)

| ID | Slug | Label | Category | Charset | Length | Checksum | Engine ID | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code128` | `code-128` | Code 128 | General and logistics | All ASCII (0–127) | 1–80 chars | Automatic Mod-103 | `code128` | General purpose, any text |
| `ean13` | `ean-13` | EAN-13 | Retail | Digits (0–9) | 12 or 13 digits | GS1 Mod-10 | `ean13` | Retail products, 13 digits |
| `ean8` | `ean-8` | EAN-8 | Retail | Digits (0–9) | 7 or 8 digits | GS1 Mod-10 | `ean8` | Small retail packages, 8 digits |
| `upca` | `upc-a` | UPC-A | Retail | Digits (0–9) | 11 or 12 digits | GS1 Mod-10 | `upca` | North American retail, 12 digits |
| `upce` | `upc-e` | UPC-E | Retail | Digits (0–9) | 6, 7 or 8 digits | Parity check | `upce` | Compact retail products, 8 digits |
| `isbn` | `isbn` | ISBN | Retail | Digits & hyphens | 10, 12 or 13 digits | GS1 Mod-10 | `isbn` | Books and publications |
| `code39` | `code-39` | Code 39 | Industrial | `0-9`, `A-Z`, `-. $/+%` | 1–43 chars | Optional Mod-43 | `code39` | Inventory and government asset tags |
| `code93` | `code-93` | Code 93 | Industrial | `0-9`, `A-Z`, `-. $/+%` | 1–50 chars | Dual C & K | `code93` | High-density postal and inventory |
| `itf14` | `itf-14` | ITF-14 | General and logistics | Digits (0–9) | 13 or 14 digits | GS1 Mod-10 | `itf14` | Corrugated carton shipping packaging |
| `itf` | `interleaved-2-of-5` | Interleaved 2 of 5 | Industrial | Digits (0–9) | Even length (2–40) | None | `interleaved2of5` | Paired numeric industrial tracking |
| `codabar` | `codabar` | Codabar | Healthcare | Digits, `-$:/.+`, guards `A-D` | 3–40 chars | Guard chars | `rationalizedCodabar` | Blood banks and libraries |

---

## 3. Tier 2 Formats (Enabled)

| ID | Slug | Label | Category | Charset | Length | Checksum | Engine ID | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `datamatrix` | `data-matrix` | Data Matrix | 2D | Full ASCII / UTF-8 | 1–1000 chars | Reed-Solomon | `datamatrix` | Electronics and direct part marking |
| `pdf417` | `pdf417` | PDF417 | 2D | Full ASCII | 1–1100 chars | Reed-Solomon | `pdf417` | Transport, boarding passes and ID cards |
| `aztec` | `aztec` | Aztec Code | 2D | Full ASCII | 1–1500 chars | Reed-Solomon | `azteccode` | Transit tickets and airline boarding |
| `issn` | `issn` | ISSN | Retail | Digits (0–9) | 8 digits (or +2 add-on) | Mod-11 / GS1 | `issn` | Serial publications and periodicals |
| `ismn` | `ismn` | ISMN | Retail | Digits starting 979-0 | 13 digits | GS1 Mod-10 | `ismn` | Notated music publications |
| `gs1-databar` | `gs1-databar` | GS1 DataBar | GS1 DataBar | Digits (0–9) | 13 or 14 digits | GS1 Mod-10 | `databaromni` | Fresh produce and coupons |
| `code39ext` | `code-39-extended` | Code 39 Extended | Industrial | Full ASCII (1–128) | 1–40 chars | Mod-43 | `code39ext` | Full ASCII inventory tagging |
| `msi` | `msi-plessey` | MSI Plessey | Industrial | Digits (0–9) | 1–30 digits | Mod 10, 11, 10/10 | `msi` | Warehouse shelving and storage racks |
| `code11` | `code-11` | Code 11 | Industrial | Digits and `-` | 1–30 chars | Weighted Mod-11 | `code11` | Telecommunications equipment |
| `standard2of5` | `standard-2-of-5` | Standard 2 of 5 | Industrial | Digits (0–9) | 1–30 digits | None | `matrix2of5` | Airline baggage and warehouse tracking |
| `telepen` | `telepen` | Telepen | Industrial | Full ASCII or numeric | 1–40 chars | Mod-127 | `telepen` | High-density document tracking |

---

## 4. Tier 3 Formats (Deferred: `enabled: false`)

These symbologies are defined in the catalog with typed metadata, validation schemas, and documentation content, but have `enabled: false` and are hidden from user-facing navigation until future releases:

| ID | Slug | Label | Category | Reason for Deferral |
| :--- | :--- | :--- | :--- | :--- |
| `gs1-128` | `gs1-128` | GS1-128 | General and logistics | Requires specialized multi-field AI builder interface |
| `gs1-datamatrix` | `gs1-datamatrix` | GS1 DataMatrix | 2D | Requires GS1 Application Identifier parser |
| `gs1-digital-link` | `gs1-digital-link` | GS1 Digital Link | 2D | Web URI resolver architecture deferred |
| `pharmacode` | `pharmacode` | Pharmacode | Healthcare | Specialized two-track pharmaceutical manufacturing |
| `postnet` | `postnet` | POSTNET | Postal | Legacy USPS symbology superseded by Intelligent Mail |
| `planet` | `planet` | PLANET | Postal | Legacy USPS symbology superseded by Intelligent Mail |
| `usps-imb` | `usps-intelligent-mail` | USPS Intelligent Mail | Postal | Complex 4-state 65-bar encoding layout |
| `royalmail` | `royal-mail-4-state` | Royal Mail 4-State | Postal | UK postal sorting format |
| `kix` | `kix-code` | KIX Code | Postal | Netherlands Post Dutch sorting format |
| `japanpost` | `japan-post` | Japan Post | Postal | Japanese postal sorting format |
| `auspost` | `australia-post` | Australia Post 4-State | Postal | Australian customer sorting format |
| `maxicode` | `maxicode` | MaxiCode | 2D | UPS shipping honeycomb matrix |
| `code49` | `code-49` | Code 49 | 2D | Ultra-compact stacked 2D format |
| `codablockf` | `codablock-f` | Codablock F | 2D | Stacked Code 128 format |
| `epc-qr` | `epc-qr` | EPC QR / Swiss QR | Payments | Banking payment slip standard |

---

## 5. Checksum Verification Methods

### 5.1 GS1 Modulo-10 Algorithm
Used by **EAN-13**, **UPC-A**, **EAN-8**, **ISBN**, **ITF-14**, and **GS1 DataBar**:
1. Beginning with the rightmost payload digit, multiply alternating digits by weights `3` and `1`.
2. Sum the weighted products.
3. Check digit = `(10 - (Sum % 10)) % 10`.
Implemented independently in [`check-digit.service.ts`](../../../../client/apps/tool-barcode-generator/src/services/check-digit.service.ts) and verified through automated test suites.

### 5.2 ISBN-10 to ISBN-13 Conversion
1. Strip all hyphens and spaces.
2. Drop the 10th check character.
3. Prepend prefix `978` to the remaining 9 digits.
4. Compute the GS1 Modulo-10 check digit over the 12-digit string.
5. Append the resulting check digit.

### 5.3 Code 39 Modulo-43 Checksum
Uses character weights: `0–9` (0–9), `A–Z` (10–35), `-` (36), `.` (37), space (38), `$` (39), `/` (40), `+` (41), `%` (42). Sum values modulo 43 to select the check character.

---

## 6. Related Documentation
- Technical Specification: [spec.md](./spec.md)
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Security Baseline: [security.md](./security.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Library Licenses: [library-licenses.md](./library-licenses.md)
- Changelog: [changelog.md](./changelog.md)
