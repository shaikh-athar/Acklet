---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — Feature Catalog & Behavior

## 1. Feature Index

| Feature ID | Feature Name | Description | Status |
| :--- | :--- | :--- | :--- |
| **QR-F01** | Multi-Type Content Input | Text, URL, Email, and Phone with live formatting and validation | **Implemented** |
| **QR-F02** | Type-Aware Fast Presets | Quick switching between URL, Email, and Phone with sample placeholders | **Implemented** |
| **QR-F03** | Dual-Tone Color Customization | Native color pickers, normalized hex inputs, swap button, and 4 preset pairs | **Implemented** |
| **QR-F04** | WCAG AA/AAA Contrast Guard | Mathematical relative luminance check with < 2.5:1 scanner warning alert | **Implemented** |
| **QR-F05** | Resolution Range Slider & Chips | Continuous 100–2000px slider (50px steps) plus 4 quick resolution chips | **Implemented** |
| **QR-F06** | Error Correction Selector | L (7%), M (15% recommended), Q (25%), and H (30%) recovery modes | **Implemented** |
| **QR-F07** | Dynamic ISO/IEC 18004 Metadata | Dynamic Version (1–40), Capacity, Used Bytes, and animated Emerald Progress Bar | **Implemented** |
| **QR-F08** | In-Browser PNG, SVG & JPEG Download | One-click instant export in PNG, scalable vector SVG, or JPEG format | **Implemented** |
| **QR-F09** | Dual-Theme High Contrast UI | Full high-contrast legibility across Light and Dark themes via tokens | **Implemented** |
| **QR-F10** | 12 Complete Content Types & Builders | Dedicated structured forms & pure builders for URL, Text, Email, Phone, SMS, Wi-Fi, Geo, Event, vCard, Social, App Store, and Crypto | **Implemented** |
| **QR-F11** | Client-Side Scannability Verifier | In-browser camera-grade QR decode testing via `jsqr` with diagnostic payload matching | **Implemented** |
| **QR-F12** | Hosted Dynamic QR Code Shortlinks | Spring Boot `/q/{code}` shortlinks with Base62 slugs and HTTP 302/307 redirection | **Implemented** |
| **QR-F13** | Anonymous Manage Key Authorization | Secret 256-bit manage keys with SHA-256 storage allowing editing without an account | **Implemented** |
| **QR-F14** | Privacy-Preserving Scan Telemetry | Salted daily visitor hashes, country, device, OS, and browser tracking respecting DNT/GPC | **Implemented** |
| **QR-F15** | Dynamic QR Manager & Inline Editor | Drawer for updating destination URLs anytime, toggling pause/resume, and viewing analytics | **Implemented** |
| **QR-F16** | Hosted Landing Page Viewer & Asset Types | Responsive viewer at `/tools/qr-generator/view/:code` for PDF, Menu, Coupon, vCard, Multi-URL | **Implemented** |
| **QR-F17** | Hosted Dynamic QR Creator Drawer | Direct creation of hosted PDF, Menu, Coupon, vCard, and Multi-URL dynamic codes | **Implemented** |
| **QR-F18** | Dynamic QR Passcode Gate | Optional client-side PIN/passcode verification before unlocking private hosted content | **Implemented** |
| **QR-F19** | Decorative Frames & CTA Borders | Vector frames (Bottom Banner, Top Header, Polaroid, Badge Pill, Chat Bubble) with custom CTA captions | **Implemented** |
| **QR-F20** | Batch QR Code Generation | Client-side bulk generation from CSV or text list with live progress and ZIP archive download | **Implemented** |
| **QR-F21** | Overall Shape Engine | 12 geometric overall shapes (Circle, Heart, Star, Hexagon, Diamond, Shield, Drop, Speech Bubble, Badge, Ticket) across Around, Badge, and Trim modes | **Implemented** |
| **QR-F22** | Brand Name & Brand Artwork | Custom brand typography (8 Google Fonts, up to 12 chars), client-side verified image silhouettes (PNG/JPEG/SVG <= 2MB), and 3 placements | **Implemented** |
| **QR-F23** | Calm Scan Confidence & Auto-Fix | Calm scan confidence rating chip (High, Medium, Low), one-click automatic fix, and ready-made presets | **Implemented** |

---

## 2. Detailed Feature Behavior

### QR-F01: Multi-Type Content Input
- **Purpose**: Allow users to encode text or standardized protocol strings without needing to memorize protocol syntax.
- **User Interaction**:
  - Selecting content type via tab buttons updates placeholder text, character limits, and validation rules.
  - Typing in the multi-line textarea updates character count in real time.
- **Processing Flow**:
  1. Content is validated against the active type (`text`, `url`, `email`, `phone`, `sms`, `wifi`, `geo`, `event`, `vcard`, `social`, `app`, `crypto`).
  2. If invalid, an inline error is displayed below the textarea and QR generation is paused.
  3. If valid, payload formatter prepends appropriate protocol (`mailto:`, `tel:`, `smsto:`, `WIFI:`, `geo:`, etc.) or formats raw URL/text.
- **Edge Cases**:
  - Whitespace-only input: Clears error and renders the empty state placeholder.
  - Multi-line text: Preserves CRLF line breaks for standard text mode.

### QR-F02: Type-Aware Fast Presets
- **Purpose**: Quick sample workflows for fast testing and demonstration.
- **Presets**:
  - **URL**: Pre-fills `https://acklet.com`.
  - **Wi-Fi**: Pre-fills `Acklet-Guest` network.
  - **vCard**: Pre-fills complete digital contact card for Alex Mercer.
  - **Event**: Pre-fills Acklet Product Launch event.
  - **Crypto**: Pre-fills Bitcoin receiving wallet.

### QR-F03: Dual-Tone Color Customization
- **Purpose**: Brand and style the QR code modules (foreground) and stage background (background).
- **User Interaction**:
  - Clicking native `<input type="color">` opens the OS color picker.
  - Typing into hex text input validates syntax and auto-uppercases characters.
  - Clicking **Swap** inverts foreground and background colors.
  - Clicking a preset swatch pair (**Classic**, **Emerald**, **Navy**, **Dark Mode**) updates both colors simultaneously.
- **Integration**: Feeds into `QRCodeStyling` options object.

### QR-F04: WCAG AA/AAA Contrast Guard
- **Purpose**: Guarantee that generated QR codes can be decoded reliably by camera hardware under poor lighting conditions.
- **Math Formula**:
  $$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
  $$\text{Contrast Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$
- **Behavior**:
  - Displays numerical ratio (e.g. `21.00:1`) and WCAG level badge (**AAA**, **AA**, or **Fail**).
  - When ratio is $< 2.5:1$, displays a prominent red warning banner:
    *"Low contrast (< 2.5:1). Camera scanners may fail to scan this code reliably."*

### QR-F05: Resolution Range Slider & Chips
- **Purpose**: Allow fine-grained control over export resolution for both small web embeds and high-DPI print.
- **Range**:
  - Minimum: `100px`
  - Maximum: `2,000px`
  - Step: `50px`
- **Preset Chips**:
  - **Small**: 150px (Web thumbnails)
  - **Medium**: 300px (Default web display)
  - **Large**: 500px (Document prints)
  - **XL**: 800px (High-resolution print signage)

### QR-F06: Error Correction Selector
- **Purpose**: Control Reed-Solomon redundancy blocks to tolerate dirt, damage, or partial obscuration.
- **Modes**:
  - **Level L**: Recovers ~7% of data (smallest module count, highest capacity).
  - **Level M (Default / Recommended)**: Recovers ~15% of data (optimal balance for mobile scanning).
  - **Level Q**: Recovers ~25% of data (suitable for industrial environments).
  - **Level H**: Recovers ~30% of data (densest matrix, maximum damage resistance).

### QR-F07: Dynamic ISO/IEC 18004 Metadata Display
- **Purpose**: Give developers and creators instant feedback on version capacity and payload saturation.
- **Fields**:
  - **QR Version**: Minimum required version ($1\text{ to }40$) dynamically computed from encoded byte length.
  - **Max Capacity**: Upper byte ceiling for the resolved version and error correction level.
  - **Used Bytes**: Exact byte length of the encoded payload.
  - **Recovery**: Percentage error recovery tolerance.
  - **Visual Bar**: Animated progress bar (`width: usagePercent%`). When $> 90\%$, changes to warning amber.

### QR-F08: In-Browser Multi-Format Download & Clipboard Copy
- **Purpose**: Export the rendered QR code as a standard image file or copy to clipboard without server latency.
- **Implementation**:
  - Exports in PNG, SVG (vector), and JPEG formats.
  - Copy directly to OS clipboard as image blob with fallback.
  - Filename format: `qr-code-<timestamp>.<ext>`.

### QR-F10: 12 Complete Content Types & Pure Builders
- **12 Types**: Website, Plain Text, Email, Phone, SMS, Wi-Fi, Location / Geo, Event, vCard 3.0, Social, App Store, and Crypto Wallet.
- **Progressive Disclosure**: Primary essential inputs visible upfront; advanced and optional fields neatly nested under native `<details class="more-options">` accordions.
- **Standards Compliance**:
  - iCalendar: RFC 5545 VCALENDAR/VEVENT with CRLF, 75-octet line folding, alarms, recurrence rules, and timezones.
  - vCard: RFC 2426 vCard 3.0 and NTT DoCoMo MECARD format with structured addresses and UTF-8 escaping.
  - Wi-Fi: ZXing standard with character escaping (`\`, `;`, `,`, `:`, `"`), WPA/WEP/WPA3/nopass, and Enterprise EAP.
  - Phone & SMS: International E.164 parsing via `libphonenumber-js`.
  - Location: RFC 5870 `geo:` URI, Google/Apple Maps URLs, and paste URL coordinate extractor.
  - Crypto: BIP21 & EIP-681 URIs for Bitcoin, Ethereum, Solana, Litecoin, and Bitcoin Cash.

### QR-F11: Client-Side Scannability Verifier
- **Engine**: In-browser decoding powered by `jsqr`.
- **Workflow**: Decodes off-screen canvas bitmap of the generated QR code to verify camera-grade readability before print or deployment.
- **Feedback**:
  - Status Badge: "Verified 100% Scannable" (green) or "Scan Warning" (amber/red).
  - Exact payload string match comparison against active content.
  - Diagnostic warnings for unreadable matrix, low contrast, or excessive density.

### QR-F12: Hosted Dynamic QR Code Short Links
- **Purpose**: Short URLs (`/q/{code}`) hosted by Spring Boot 3.4.1 that can be redirected to any destination URL without requiring re-printing of physical QR codes.
- **Implementation**:
  - Base62 6-character random slugs with collision check (`Base62.java`) or custom user slugs (3-32 chars).
  - Status management: `ACTIVE`, `PAUSED` (renders paused notice), `EXPIRED` (renders expiration notice).
  - Redirection: HTTP 302 Found for direct links (never 301, preventing permanent proxy cache), HTTP 307 Temporary Redirect for hosted landing page types or password verification.

### QR-F13: Anonymous Manage Key Authorization
- **Purpose**: Allow users to edit their dynamic QR codes without forcing mandatory account creation or logins.
- **Security**:
  - Server generates 256-bit random cryptographic keys.
  - Key is displayed once to the user and saved to client-side `localStorage`.
  - Stored in PostgreSQL `qr_codes` table only as a `SHA-256` hash (`manage_key_hash`).
  - Required in the path for management operations (`PUT /api/v1/qr/manage/{key}`).

### QR-F14: Privacy-Preserving Scan Telemetry
- **Purpose**: Provide scan counts, unique device estimates, and demographic breakdown without tracking individuals or storing PII.
- **Privacy Protections**:
  - No raw IP addresses are persisted.
  - `visitor_hash` computed as `SHA-256(ip + salt + date)` for daily unique metrics.
  - Full respect for Do Not Track (`DNT: 1`) and Global Privacy Control (`Sec-GPC: 1`).
  - Country code parsed from Cloudflare headers (`CF-IPCountry`) or proxy headers.
  - Device type, OS, and browser parsed using lightweight, zero-dependency `UserAgentParser`.

### QR-F15: Dynamic QR Manager Drawer & Inline Editor
- **Purpose**: Manage all created dynamic QR codes in a unified, accessible drawer UI.
- **Capabilities**:
  - Displays list of managed dynamic QRs saved in `localStorage` or imported via private Manage Key.
  - Real-time scan counters and status pills.
  - Inline destination URL editor (updates backend immediately without re-printing QR code).
  - One-click Pause and Resume toggles.
  - Detailed scan analytics modal with breakdown by daily trend, device type, OS, and country.

### QR-F16: Hosted Dynamic Landing Page Viewer & Types
- **Route**: `/tools/qr-generator/view/:code`.
- **Purpose**: Render beautiful, mobile-optimized landing pages when a dynamic QR code points to hosted content instead of an external website.
- **Hosted Content Types**:
  - **PDF Document (`DYNAMIC_PDF`)**: Displays document title, file size, description, preview frame, and instant download button.
  - **Restaurant/Cafe Menu (`DYNAMIC_MENU`)**: Categorized menu sections with dish names, prices, descriptions, and dietary badges (`vegan`, `vegetarian`, `gluten-free`, `spicy`).
  - **Promo Coupon (`DYNAMIC_COUPON`)**: Highlighted discount percentage/badge, expiration countdown, terms, one-click promo code copy, and checkout redirection CTA.
  - **Digital Business Card (`DYNAMIC_VCARD`)**: Clean profile card with job title, company, phone, email, address, and a one-click **Save Contact** button that generates and downloads a native `.vcf` file.
  - **Multi-Links Hub (`DYNAMIC_MULTI_URL`)**: Link-in-bio style page featuring user bio and responsive list of outbound social/profile links.

### QR-F17: Hosted Dynamic QR Creator Drawer
- **Purpose**: Create and manage hosted dynamic QR codes directly from the drawer UI.
- **Workflow**:
  - Choose between Website URL, PDF Document, Menu, Coupon, vCard, or Multi-Links.
  - Fill in type-specific metadata (with optional PDF file attachment).
  - Optional custom vanity slug (e.g. `summer-promo`).
  - Generates Base62 slug, uploads associated files to backend asset storage, and registers secret manage key in browser `localStorage`.

### QR-F18: Dynamic QR Passcode Protection Gate
- **Purpose**: Restrict access to sensitive hosted documents, confidential menus, or exclusive coupons with a PIN or password.
- **Implementation**:
  - Creator sets optional passcode during creation or via manager update.
  - Landing viewer detects `hasPassword: true` and renders an authentication gate before fetching or displaying payload data.
  - Verification performed via `POST /api/v1/qr/public/{code}/verify-password`.

### QR-F19: Decorative Frames & CTA Borders
- **Purpose**: Surround the generated QR code with customizable high-converting decorative frames and call-to-action captions.
- **Frame Styles**:
  - `none`: Standard borderless QR code.
  - `bottom-banner`: Outer container card with a bottom ribbon displaying customizable CTA text.
  - `top-header`: Card with top ribbon badge displaying caption header.
  - `polaroid`: Classic white polaroid border with authentic bottom margin caption.
  - `badge-pill`: Rounded pill surrounding frame with an anchored floating badge chip.
  - `chat-bubble`: Conversation bubble frame with a speech notch pointing toward the content.
- **Customization**:
  - Real-time CTA text input with quick preset suggestion chips ("SCAN ME", "VISIT WEBSITE", "VIEW MENU", "CONNECT WI-FI", "SAVE CONTACT", "GET OFFER").
  - Independent native frame background color and text color pickers with hex normalization.
  - Export: Automatically baked into vector SVG downloads and rasterized into PNG/JPEG downloads via canvas composition.

### QR-F20: Batch QR Code Generation & ZIP Export
- **Purpose**: Generate dozens or hundreds of customized QR codes at once for events, table tents, inventory labels, or marketing campaigns.
- **Features**:
  - Modal workflow accessible via "Batch Generate" header button.
  - CSV file upload (`.csv`, `.txt`) or direct multi-line pasting (e.g. `Title,URL`).
  - Pre-built "Load Sample CSV" demo button.
  - Real-time item parser supporting quoted and unquoted CSV fields.
  - Live generation progress bar (`Generating X of Y`).
  - Scrollable interactive preview grid with individual PNG downloads and payload clipboard copy.
  - Single-click "Download ZIP Archive" powered by `jszip` packaging all generated codes into a formatted archive (`acklet-qr-batch-<timestamp>.zip`).

### QR-F21: Overall Shape Engine
- **Purpose**: Render scannable QR codes styled into non-square silhouettes while preserving ISO 18004 locator patterns.
- **Shapes Supported**: Circle, Heart, Star, Hexagon, Diamond, Shield, Drop, Speech Bubble, Badge, Ticket, Rounded Square, Square.
- **Rendering Modes**:
  - `Around`: Keeps the core QR rectangular with a >= 4 module quiet zone, scattering decorative modules outward into the shape boundary with edge fade and anti-finder rules.
  - `Badge`: Encapsulates the complete QR code inside a solid shaped vector SVG badge with high-contrast border and padding.
  - `Trim`: Soft-crops outer non-reserved data modules within a strict 12% error-correction allowance and automatically elevates recovery to Level H (30%). Real finder locators (top-left, top-right, bottom-left) remain 100% untouched.

### QR-F22: Brand Name & Brand Image Artwork
- **Purpose**: Infuse brand identity into the QR code client-side without compromising camera readability.
- **Brand Name**: Encodes up to 12 characters in 8 Google fonts (Outfit, Inter, Montserrat, Playfair Display, Space Grotesk, Plus Jakarta Sans, Bebas Neue, Caveat) across 3 placements:
  - `In the code`: Tone-maps modules over the text mask using WCAG AA compliant contrast.
  - `Around the code`: Styles modules in the perimeter silhouette field to highlight letter forms.
  - `Banner`: Adds a vector pill banner beneath the code with bold, uppercase brand text.
- **Brand Image**: Client-side validated (magic-byte checks for PNG, JPEG, SVG up to 2MB) in-memory thresholding generating decorative module masks.

### QR-F23: Calm Scan Confidence & Auto-Fix
- **Purpose**: Provide reassurance about real-world camera readability with actionable one-click resolution.
- **Confidence Rating**: Evaluates decoder passes and luminance dynamic range into High, Medium, or Low confidence.
- **Fix Automatically**: Single-click button that automatically elevates error correction to Level H, adjusts shape density to Safe/Balanced, and sharpens contrast to guarantee instantaneous camera recognition.
- **Examples Menu**: Quick-load presets for Circle Badge, Heart Silhouette, Brand Name "Acklet", and Standard Sample.

---

## 3. Dependencies & Libraries

- **`qr-code-styling` (`^1.9.2`)**: Client-side QR generation engine with shape customization, corner customization, and logo embedding.
- **`jszip` (`^3.10.1`)**: In-browser client-side asynchronous ZIP file creation for batch QR code downloads.
- **`jsqr` (`^1.4.0`)**: In-memory camera-grade barcode image decoder for client-side scannability testing.
- **`libphonenumber-js` (`^1.12.35`)**: International E.164 phone number parser and validator.
- **`@acklet/tool-shell`**: Shared design system tokens, Spartan UI primitives (`HlmButton`, `HlmBadge`, `HlmInput`), and `TsIconComponent`.
- **`rxjs` (`^7.8.0`)**: Reactive debounced pipelines.

