---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Visual & Terminology Legend

## 1. Icon Legend

All icons render via `<ts-icon>` from `@acklet/tool-shell`:

| Icon Name | UI Location | Meaning / Semantic Role |
| :--- | :--- | :--- |
| `qr-code` | App Title, Manifest, Empty State | QR Code tool branding and empty stage indicator |
| `type` | Workspace Mode / Content Tab | Content input studio workspace |
| `palette` | Workspace Mode / Customize Tab | Design customization studio (Colors sub-tab) |
| `frame` | Customize Studio (Frame Sub-Tab) | Decorative CTA ribbon frames selector |
| `grid` | Customize Studio (Shape Sub-Tab) | Module dot patterns and corner locator shapes |
| `image` | Customize Studio (Logo Sub-Tab) | Logo image upload and brand icon embedding |
| `graph-star` | Workspace Mode / Dynamic Tab | Hosted dynamic links and scan analytics manager |
| `square-pen` | Studio Header (QR Name Bar) | Editable title and label for the active QR code |
| `shield-check` | Preview Panel / Verifier | Camera-grade in-browser decodability verification pass |
| `alert-triangle` | Validation & Contrast Card | Input formatting error or low-contrast (< 2.5:1) warning |
| `download` | Preview Panel Action Bar | Download PNG export CTA |
| `copy` | Preview Panel / Action Bar | Copy image blob directly to system clipboard |
| `share-2` | Preview Panel / Action Bar | Native OS Web Share sheet invocation |
| `history` | Preview Panel Action Bar | Open history drawer for saved QR codes in `localStorage` |
| `arrow-left-right`| Color Customizer | Swap foreground and background colors |
| `loader-2` | Preview Stage Overlay | Real-time matrix computation or link creation in progress |

---

## 2. Badges & State Indicators

| Badge / Element | Visual Appearance | Meaning |
| :--- | :--- | :--- |
| `Verified Scannable` | Green pill badge with checkmark | Code successfully decoded by `jsQR` multi-pass pipeline |
| `High Confidence` | Green confidence indicator | Optimal contrast, clear quiet zone, and high scannability |
| `Medium Confidence` | Amber confidence indicator | Code decodes successfully but has dense modules or moderate contrast |
| `Scan Warning` | Red warning banner with fix link | Camera may fail to scan; one-click auto-fix available |
| `100% Client-Side` | Blue pill (`--accent-soft` + `--accent-strong`) | Computed 100% locally in browser memory without network egress |
| `Zero Telemetry` | Neutral surface-2 pill with border | Privacy guarantee: no tracking or user profiling |
| `WCAG AAA` | Green pass badge | Color contrast ratio is $\ge 7:1$ (optimal readability) |
| `WCAG AA` | Light green pass badge | Color contrast ratio is $\ge 4.5:1$ (standards-compliant) |
| `WCAG Fail` | Red warning outline badge | Color contrast ratio is $< 4.5:1$ |
| `Level M (15%)` | Blue active badge | Default recommended error correction level |
| `★ Recommended` | Star indicator | Highlights Error Correction Level M for general distribution |
| `ACTIVE` | Green status pill | Hosted dynamic shortlink is active and redirecting |
| `PAUSED` | Amber status pill | Hosted dynamic shortlink is paused; renders friendly notice |
| `EXPIRED` | Gray status pill | Hosted dynamic shortlink TTL has elapsed |

---

## 3. Reed-Solomon Error Correction Levels (ISO/IEC 18004)

| Level Code | Recovery Capacity | Matrix Density | Best Use Case |
| :--- | :--- | :--- | :--- |
| **L (Low)** | **~7%** data recovery | Lowest density | Clean screen environments, long URLs, low-density displays |
| **M (Medium)** | **~15%** data recovery | Balanced density | General public distribution, marketing flyers (**Recommended**) |
| **Q (Quartile)** | **~25%** data recovery | High density | Industrial use, outdoor signage, moderate logo coverage |
| **H (High)** | **~30%** data recovery | Highest density | High-wear badges, print merchandise, embedded center logos |

---

## 4. QR Code Module Terminology

| Term | Technical Meaning |
| :--- | :--- |
| **Module** | The individual dark and light squares comprising the QR matrix grid. |
| **Finder Patterns** | The three prominent concentric square locators positioned in the top-left, top-right, and bottom-left corners. |
| **Alignment Patterns**| Smaller secondary concentric squares used in Version 2+ to correct for camera curvature and distortion. |
| **Timing Patterns** | Alternating dark and light modules connecting the three finder patterns to determine coordinate scale. |
| **Quiet Zone** | The mandatory blank margin surrounding the QR code (strictly $\ge 4$ module widths). |
| **Version (1–40)** | The matrix dimension symbol: Version 1 is $21 \times 21$ modules; Version 40 is $177 \times 177$ modules. |
| **Contrast Ratio** | The relative luminance ratio between light and dark modules. Minimum safe camera threshold is **`2.5:1`**. |
