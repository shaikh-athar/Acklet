---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Feature Catalog & Behavior

## 1. Feature Index

| Feature ID | Feature Name | Description | Status |
| :--- | :--- | :--- | :--- |
| **QR-F01** | Multi-Type Content Input | 12 structured content types with live formatting, validation, and plain text notes link mode | **Implemented** |
| **QR-F02** | Type-Aware Fast Presets | Quick demo samples for URL, Wi-Fi, vCard, Event, and Crypto | **Implemented** |
| **QR-F03** | Color & Gradient Customization | Solid, Linear Gradient, and Radial Gradient modes with 0–360° angle rotation, dual stops, and presets | **Implemented** |
| **QR-F04** | WCAG AA/AAA Contrast Guard | Mathematical relative luminance check with < 2.5:1 scanner warning alert | **Implemented** |
| **QR-F05** | Resolution Range Slider & Chips | Continuous 100–2000px slider plus 4 quick resolution chips (Small 256px, Medium 512px, Large 1024px, Print 2048px) | **Implemented** |
| **QR-F06** | Error Correction Selector | L (7%), M (15% recommended), Q (25%), and H (30%) recovery modes with automatic logo boost | **Implemented** |
| **QR-F07** | Dynamic ISO/IEC 18004 Metadata | Dynamic Version (1–40), Capacity, Used Bytes, and animated Progress Bar | **Implemented** |
| **QR-F08** | In-Browser Multi-Format Download | Scalable vector SVG, lossless PNG, JPEG, and direct image clipboard copy | **Implemented** |
| **QR-F09** | Dual-Theme High Contrast UI | Canonical Acklet Scoutie Sans font, Blue accent (`#3B82F6`), and dual-theme tokens | **Implemented** |
| **QR-F10** | 12 Complete Content Types & Builders | Dedicated structured forms and pure RFC payload builders for all 12 types | **Implemented** |
| **QR-F11** | Multi-Pass Scannability Verifier | In-browser 4-pass decoding engine powered by `jsQR` with diagnostic payload matching | **Implemented** |
| **QR-F12** | Hosted Dynamic QR Code Shortlinks | Spring Boot `/q/{code}` shortlinks with Base62 slugs, device-aware routing, and HTTP 302/307 redirects | **Implemented** |
| **QR-F13** | Anonymous Manage Key Authorization | Secret 256-bit manage keys with SHA-256 storage allowing editing without an account | **Implemented** |
| **QR-F14** | Privacy-Preserving Scan Telemetry | Salted daily visitor hashes, country, device, OS, and browser tracking respecting DNT/GPC | **Implemented** |
| **QR-F15** | Dynamic QR Manager & Inline Editor | Drawer for updating destination URLs anytime, toggling pause/resume, and viewing analytics | **Implemented** |
| **QR-F16** | Hosted Landing Page Viewer & Types | Responsive viewer at `/tools/qr-generator/view/:code` for PDF, Menu, Coupon, vCard, Multi-URL | **Implemented** |
| **QR-F17** | Hosted Dynamic QR Creator Drawer | Direct creation of hosted PDF, Menu, Coupon, vCard, and Multi-URL dynamic codes | **Implemented** |
| **QR-F18** | Dynamic QR Passcode Gate | Optional client-side PIN/passcode verification before unlocking private hosted content | **Implemented** |
| **QR-F19** | Decorative Frames & CTA Ribbons | 18+ vector frames (`bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, etc.) with custom CTA captions | **Implemented** |
| **QR-F20** | Batch QR Code Generation | Client-side bulk generation from CSV or text list with live progress and ZIP archive download | **Implemented** |
| **QR-F21** | Module & Corner Shape Styling | 11 dot styles, 8 corner locator squares, and 10 corner dots with independent coloring | **Implemented** |
| **QR-F22** | Logo Embedding & Auto EC Boost | Custom image upload (PNG/SVG/JPEG), 20+ brand presets, transparent background toggle, and auto EC boost to H/Q | **Implemented** |
| **QR-F23** | Calm Scan Confidence & Auto-Fix | Calm scan confidence rating chip (High, Medium, Low), diagnostic tips, and one-click automatic fix | **Implemented** |

---

## 2. Detailed Feature Behavior

### QR-F01: Multi-Type Content Input & Plain Text Dual Mode
- **Purpose**: Allow users to encode structured data or plain notes without memorizing protocol schemas.
- **Content Types Supported**: Website URL, Plain Text, Email, Phone, SMS, Wi-Fi, Location / Geo, Calendar Event, vCard 3.0, Social Profile, App Store, and Crypto Wallet.
- **Type Selection**: Accessible centered dropdown trigger matching input panel width with instant search filter, type icon badges, and keyboard navigation.
- **Plain Text Dual Modes**:
  - **Direct Text Mode (Default)**: Directly encodes raw UTF-8 text into the QR code matrix (up to 2,000 characters and 2,300 bytes enforced via `TextEncoder`).
    - Live character counter: `{{ charCount }} / 2,000 characters`.
    - Warning banner if non-English multi-byte text hits byte cap first: *"Non-English text uses more space"*.
    - Scannability hint above ~800 bytes: *"Large codes are harder to scan. Try Notes link mode."*
  - **Hosted Notes Link Mode**: Uses `POST /api/v1/qr-links` to encode a compact `/q/{code}` link into the QR code, resolving to an optimized mobile-first Notes viewer at `/tools/qr-generator/notes/:code`.
    - Supports larger text payloads (up to 20,000 characters) while maintaining a low-density, easily scannable QR code.
    - Responsive viewer provides "Copy", "Share / Save to Notes" (via Web Share API), and "Download .txt" actions.

### QR-F02: Type-Aware Fast Presets
- **Purpose**: Quick sample workflows for demonstration and instant testing.
- **Presets Available**:
  - **URL**: Pre-populates `https://acklet.com`.
  - **Wi-Fi**: Pre-populates `Acklet-Guest` WPA2 network.
  - **vCard**: Pre-populates comprehensive digital business card for Alex Mercer.
  - **Event**: Pre-populates Acklet Product Launch calendar event.
  - **Crypto**: Pre-populates Bitcoin wallet address and amount.

### QR-F03: Color & Gradient Customization
- **Purpose**: Brand and style the QR code modules, corner locators, and canvas background.
- **Modes**:
  - **Solid Color**: Single foreground color and background color with native color pickers, normalized uppercase hex inputs, and one-click Swap button.
  - **Linear Gradient**: Dual color stops (`color1`, `color2`) with a continuous rotation slider from $0^\circ$ to $360^\circ$.
  - **Radial Gradient**: Concentric color transition radiating from the center of the QR matrix.
- **Curated Gradient Presets**: Ready-made color pairings (Ocean Blue, Sunset Glow, Emerald Forest, Purple Dawn, Neon Cyber).
- **Independent Corner Styling**: Optional dedicated color pickers for corner locator outer squares and inner dots.

### QR-F04: WCAG AA/AAA Contrast Guard
- **Purpose**: Ensure generated codes remain decodable by camera sensors under variable lighting conditions.
- **Mathematical Luminance Formula**:
  $$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
  $$\text{Contrast Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$
- **Behavior**:
  - Calculates ratio in real time (e.g. `12.4:1`) and renders WCAG compliance badge (**AAA** $\ge 7:1$, **AA** $\ge 4.5:1$, **Fail** $< 4.5:1$).
  - When contrast ratio drops below $2.5:1$, displays a prominent warning banner:
    *"Low contrast (< 2.5:1). Camera scanners may fail to scan this code reliably."*

### QR-F05: Resolution Range Slider & Preset Chips
- **Purpose**: Output scaling for digital screens, mobile apps, and high-DPI print media.
- **Controls**:
  - Slider: Continuous range from `100px` to `2000px` (step `50px`).
  - Preset Chips: **Small (256px)** for web thumbnails, **Medium (512px)** for general mobile scanning, **Large (1024px)** for flyers and documents, and **Print (2048px)** for large posters and signage.

### QR-F06: Error Correction Selector & Auto-Boost
- **Purpose**: Control Reed-Solomon redundancy blocks to tolerate dirt, damage, or logo obstruction.
- **Levels**:
  - **L (Low)**: Recovers ~7% of damaged data (lowest density, highest character capacity).
  - **M (Medium - Default)**: Recovers ~15% of damaged data (recommended balance for mobile cameras).
  - **Q (Quartile)**: Recovers ~25% of damaged data (high reliability for print materials).
  - **H (High)**: Recovers ~30% of damaged data (maximum fault tolerance with denser module grid).
- **Automatic Logo Boost**: Uploading a logo image or selecting a brand preset automatically raises error correction to Level H or Q via `calculateAutoErrorCorrection()`, preventing scanning failure with helpful toast feedback.

### QR-F07: Dynamic ISO/IEC 18004 Metadata Display
- **Purpose**: Real-time feedback on payload saturation and matrix complexity.
- **Metrics Calculated**:
  - **Version**: Minimum QR version ($1\text{ to }40$) dynamically computed from byte length.
  - **Capacity**: Upper character/byte limit for the resolved version and EC level.
  - **Used Bytes**: Exact payload byte length.
  - **Recovery**: Percentage error recovery tolerance.
  - **Usage Bar**: Animated progress meter (`width: usagePercent%`), turning amber when $> 90\%$.

### QR-F08: Multi-Format Download & Clipboard Copy
- **Purpose**: Instant, client-side export without server round-trips.
- **Formats**:
  - **SVG**: Scalable vector markup via `qr-svg-renderer.ts` with embedded shapes, frames, and logos.
  - **PNG**: Lossless high-resolution raster export.
  - **JPEG**: Web-compatible raster export.
  - **Clipboard Copy**: Direct image blob copy to system clipboard (`navigator.clipboard.write`).
- **Filename**: Formatted as `qr-code-<timestamp>.<ext>`.

### QR-F09: Dual-Theme High Contrast UI
- **Typography**: Unified Acklet tool font **Scoutie Sans** (`font-family: 'Scoutie Sans', sans-serif;`).
- **Color Identity**: Blue Accent (`#3B82F6` dark / `#2563EB` light) registered in manifest and CSS variables.
- **Contrast Guarantee**: Text, inputs, buttons, and badges maintain $\ge 4.5:1$ contrast against dark and light surface tokens.

### QR-F10: 12 Structured Content Types & Pure Builders
All payloads are generated via deterministic pure functions in `qr-payload-builders.ts`:
- **URL**: Normalizes schemes and constructs standardized UTM query parameters.
- **Plain Text**: Normalizes line breaks to CRLF or LF consistently.
- **Email**: Constructs RFC 5322 compliant `mailto:` URIs with URL-encoded query parameters.
- **Phone & SMS**: Parses international numbers into E.164 standard strings via `libphonenumber-js`.
- **Wi-Fi**: Formats ZXing strings with standard character escaping (`\`, `;`, `,`, `:`, `"`), supporting WPA/WEP/WPA3 and Enterprise EAP.
- **Location**: RFC 5870 `geo:` URI generation and coordinate extraction from Google/Apple Maps links.
- **Event**: RFC 5545 iCalendar generation with 75-octet line folding and timezone parsing.
- **vCard 3.0**: RFC 2426 format with UTF-8 character encoding and structured address fields.
- **Social**: 20+ platform extractors normalising handles to canonical profile URLs.
- **App Store**: Device-aware smart links directing to iOS App Store or Google Play.
- **Crypto**: BIP21 and EIP-681 URIs for Bitcoin, Ethereum, Solana, Litecoin, and Bitcoin Cash.

### QR-F11: Multi-Pass Scannability Verifier
- **Engine**: In-browser camera barcode decoder powered by `jsQR`.
- **4-Pass Decoding Pipeline**:
  1. *Standard Pass*: Direct decode of canvas image bitmap.
  2. *Contrast-Stretched Pass*: Histogram equalization and local binarization to decode low-contrast codes.
  3. *Inverted Luminance Pass*: Checks if the code was styled with inverted polarity.
  4. *Center Crop Pass*: Isolates the core QR matrix from surrounding decorative frames.
- **Confidence Rating**: Evaluated into High, Medium, or Low with diagnostic guidance and an auto-fix action.

### QR-F12: Hosted Dynamic QR Code Shortlinks
- **Endpoint**: `GET /q/{code}` hosted by Spring Boot 3.4.1.
- **Slug Generation**: Base62 6-character random slugs with collision retries and reserved word defense.
- **Redirection Behavior**:
  - `DYNAMIC_URL`: Returns **HTTP 302 Found** directly redirecting to destination URL.
  - Device-aware routing: Automatically routes iOS devices to `iosUrl`, Android devices to `androidUrl`, and other platforms to `fallbackUrl`.
  - Hosted types: Returns **HTTP 307 Temporary Redirect** to `/tools/qr-generator/view/:code`.
  - Status management: Returns friendly HTML notices for `PAUSED` or `EXPIRED` codes; returns HTTP 404 for unknown codes.

### QR-F13: Anonymous Manage Key Authorization
- **Security Architecture**:
  - Server generates 256-bit cryptographic keys.
  - Key is displayed once to the creator and stored in browser `localStorage`.
  - Server stores only the `SHA-256` hash (`manage_key_hash`) in PostgreSQL `qr_codes`.
  - Required in the path for updates (`PUT /api/v1/qr/manage/{key}`).
  - Allows full management and inline editing without requiring account registration.

### QR-F14: Privacy-Preserving Scan Telemetry
- **Guarantees**:
  - Zero raw IP addresses are persisted to disk or database.
  - Unique daily visitors aggregated via `SHA-256(ip + salt + date)`.
  - Full compliance with Do Not Track (`DNT: 1`) and Global Privacy Control (`Sec-GPC: 1`).
  - Lightweight user-agent parsing for device category (Mobile, Tablet, Desktop), OS, and browser family.

### QR-F15: Dynamic QR Manager Drawer & Inline Editor
- **Features**:
  - Unified drawer displaying all managed dynamic QR codes stored in `localStorage` or imported via manage key.
  - Live scan counters and status badges (`ACTIVE`, `PAUSED`, `EXPIRED`).
  - Inline destination URL editor updating backend routing instantly without changing the printed QR code.
  - One-click Pause and Resume toggles.
  - Scan analytics modal featuring daily scan timeline, country breakdown, and device distribution.

### QR-F16: Hosted Dynamic Landing Page Viewer (`/tools/qr-generator/view/:code`)
- **Supported Hosted Content Types**:
  - **PDF Document (`DYNAMIC_PDF`)**: Clean preview card with file size, description, and direct download button.
  - **Restaurant Menu (`DYNAMIC_MENU`)**: Categorized sections, dish prices, descriptions, and dietary badges.
  - **Promo Coupon (`DYNAMIC_COUPON`)**: Highlighted discount badge, promo code copy, expiry countdown, and checkout button.
  - **Digital Business Card (`DYNAMIC_VCARD`)**: Profile card with one-click **Save Contact** generating a `.vcf` file.
  - **Multi-Links Hub (`DYNAMIC_MULTI_URL`)**: Link-in-bio hub with profile bio and outbound social buttons.

### QR-F17: Hosted Dynamic QR Creator Drawer
- **Workflow**:
  - Select dynamic type (Website URL, PDF, Menu, Coupon, vCard, Multi-URL).
  - Fill in type-specific fields and attach assets (up to 20MB).
  - Optional custom vanity slug (e.g. `summer-promo`).
  - Creates dynamic code on backend and registers manage key in `localStorage`.

### QR-F18: Dynamic QR Passcode Gate
- **Purpose**: Restrict access to confidential documents, VIP menus, or private coupons.
- **Workflow**:
  - Creator sets optional passcode during creation.
  - Viewer renders authentication PIN gate before retrieving payload data.
  - Passcode verification executed via `POST /api/v1/qr/public/{code}/verify-password`.

### QR-F19: Decorative Frames & CTA Ribbons
- **Styles Available**: `none`, `bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, `tag`, `ticket`, `coffee-cup`, `shopping-bag`, `phone`, `speech-bubble`, `banner-ribbon`, `badge`, `minimal-bracket`, `gift-box`, `storefront`, `sticker-peel`, `delivery-box`, `envelope`.
- **CTA Customization**: Real-time editable text with quick suggestion chips ("SCAN ME", "VISIT WEBSITE", "VIEW MENU", "CONNECT WI-FI", "SAVE CONTACT", "GET OFFER").
- **Colors**: Independent frame background and text color pickers with automatic high-contrast theme defaults.

### QR-F20: Batch QR Code Generation & ZIP Export
- **Workflow**:
  - Accessible via "Batch Generate" header button.
  - CSV file upload or multi-line text list pasting (e.g. `Title,URL`).
  - Built-in "Load Sample CSV" demo button.
  - Real-time generation progress bar (`Generating X of Y`).
  - Interactive preview grid with single-item downloads.
  - Single-click "Download ZIP Archive" powered by `jszip` (`acklet-qr-batch-<timestamp>.zip`).

### QR-F21: Module & Corner Shape Styling
- **Module Dot Shapes (11 styles)**: `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`, `scanline`.
- **Corner Square Locators (8 styles)**: `square`, `dot`, `extra-rounded`, `classy`, `classy-rounded`, `rounded`, `pinch`, `shield`.
- **Corner Dot Locators (10 styles)**: `square`, `dot`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`.

### QR-F22: Logo Embedding & Auto EC Boost
- **Capabilities**:
  - Drag-and-drop file upload supporting PNG, SVG, and JPEG files.
  - 20+ built-in brand preset icons (WhatsApp, Instagram, X/Twitter, YouTube, LinkedIn, GitHub, etc.).
  - Logo size slider (10% to 45%) and margin clearance slider.
  - Transparent logo background plate toggle.
  - Automatic Reed-Solomon Error Correction elevation to Level H or Q with toast notification.

### QR-F23: Calm Scan Confidence & Auto-Fix
- **Confidence Rating**: Evaluates decoder passes and dynamic range into High, Medium, or Low.
- **One-Click Auto-Fix**: Automatically elevates Error Correction to Level H, adjusts dot density to Safe/Balanced, and sharpens contrast to guarantee instantaneous camera recognition.

---

## 3. Dependencies & Libraries

- **`qr-code-styling` (`^1.9.2`)**: Client-side QR generation engine with shape customization, corner customization, and logo embedding.
- **`jsqr` (`^1.4.0`)**: In-memory camera barcode image decoder for client-side scannability testing.
- **`jszip` (`^3.10.1`)**: In-browser client-side asynchronous ZIP file creation for batch QR code downloads.
- **`libphonenumber-js` (`^1.12.35`)**: International E.164 phone number parser and validator.
- **`@acklet/tool-shell`**: Shared design system tokens, Spartan UI primitives, and `TsIconComponent`.
- **`rxjs` (`^7.8.0`)**: Reactive debounced pipelines.
