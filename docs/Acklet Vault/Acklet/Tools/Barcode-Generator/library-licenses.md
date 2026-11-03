# Barcode Generator — Third-Party Libraries & Licenses

This document registers all third-party libraries leveraged by the Acklet Barcode Generator tool, their version constraints, licensing terms, and integration strategies.

---

## 1. Pinned Production Dependencies

| Package | Version | License | Primary Purpose | Integration & Bundle Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `bwip-js` | `^4.11.4` | MIT | 1D and 2D vector barcode generation engine | Lazy-loaded on first generation; pure vector SVG output; no server execution |
| `@zxing/library` | `^0.23.0` | Apache-2.0 | Multi-format barcode decoder and reader | Lazy-loaded fallback decoder for silent verification when native `BarcodeDetector` is absent |
| `jszip` | `^3.10.1` | MIT | Client-side archive compression | Lazy-loaded during Bulk batch export to generate `.zip` archives of PNG/SVG barcodes |
| `rxjs` | `~7.8.0` | Apache-2.0 | Reactive event handling and debouncing | Core framework dependency; 150 ms debounce operator for real-time input |
| `tslib` | `^2.3.0` | 0BSD | TypeScript runtime helper functions | Core framework compilation helper |

---

## 2. Dependency Audit & Hygiene

- **Vulnerability Scanning**: Regular execution of `npm audit` across all dependencies.
- **Client-Side Isolation**: None of the third-party dependencies establish outbound HTTP requests or load external scripts from unverified CDNs.
- **Subresource Integrity & Bundling**: All modules are bundled directly into the application distribution artifact, ensuring strict Content Security Policy compliance (`script-src 'self'`).

---

## 3. License Summaries

### 3.1 MIT License
Applies to `bwip-js` and `jszip`.
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

### 3.2 Apache License 2.0
Applies to `@zxing/library` and `rxjs`.
Licensed under the Apache License, Version 2.0; you may not use this file except in compliance with the License. You may obtain a copy of the License at `http://www.apache.org/licenses/LICENSE-2.0`.

---

## 4. Related Documentation
- Technical Specification: [spec.md](./spec.md)
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Format Registry: [format-registry.md](./format-registry.md)
- Security Baseline: [security.md](./security.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Changelog: [changelog.md](./changelog.md)
