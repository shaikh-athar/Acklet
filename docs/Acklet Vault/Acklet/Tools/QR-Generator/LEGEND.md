---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — Visual & Terminology Legend

## 1. Icon Legend

All icons render via `<ts-icon>` from `@acklet/tool-shell`:

| Icon Name | UI Location | Meaning / Semantic Role |
| :--- | :--- | :--- |
| `zap` | Header Pill Badge | Signifies instant client-side execution |
| `shield-check` | Header & Footer | Indicates zero tracking, local in-browser processing |
| `qr-code` | Section Header & Empty State | QR Code tool branding / visual identity |
| `type` | Input Panel (Text Tab) | Plain text input mode |
| `link` | Input Panel (URL Tab) | Web link input mode |
| `mail` | Input Panel (Email Tab) | Email `mailto:` protocol mode |
| `phone` | Input Panel (Phone Tab) | Phone `tel:` protocol mode |
| `palette` | Customization Panel | Color & styling settings |
| `arrow-left-right` | Color Customizer | Swap foreground & background colors |
| `maximize-2` | Size Slider | Resolution and output dimension scaling |
| `shield` | Error Correction | Reed-Solomon redundancy and damage protection |
| `info` | Metadata Card | Technical QR specifications & capacities |
| `download` | Preview Panel CTA | Direct lossless PNG export |
| `alert-triangle` | Validation & Contrast Box | Input formatting error or low-contrast warning |
| `loader-2` | Preview Canvas (Generating) | In-progress canvas matrix computation |

---

## 2. Badges & State Indicators

| Badge / Element | Visual Appearance | Meaning |
| :--- | :--- | :--- |
| `Ready` | Subtle green outline + pulsing live green dot | QR code has been generated and is ready for download |
| `Client-Side Utility` | Emerald pill (`--accent-soft` + `--accent-strong`) | Tool runs 100% in the user's browser without backend |
| `Processed locally` | Surface-2 neutral pill with subtle border | Emphasizes user privacy and zero data collection |
| `SVG / PNG` | Card header outline badge | Export formats supported or planned |
| `WCAG AAA` | Green pass badge | Color contrast is $\ge 7:1$ (optimal readability) |
| `WCAG AA` | Light green pass badge | Color contrast is $\ge 4.5:1$ (standards-compliant) |
| `WCAG Fail` | Red warning outline badge | Color contrast is $< 4.5:1$ |
| `Level M (15%)` | Emerald active badge | Currently selected error correction setting |
| `★ Recommended` | Emerald text with star | Error correction level M is the recommended default |

---

## 3. Error Correction Levels (ISO/IEC 18004)

| Level Code | Recovery Capacity | Matrix Density | Best Use Case |
| :--- | :--- | :--- | :--- |
| **L** | **~7%** data recovery | Lowest density | Clean environments, large payloads, small displays |
| **M** | **~15%** data recovery | Balanced density | General public distribution, posters, standard web (**Recommended**) |
| **Q** | **~25%** data recovery | High density | Industrial use, outdoor signage subject to partial dirt/wear |
| **H** | **~30%** data recovery | Highest density | High-wear badges, vehicles, business cards, partial logo coverage |

---

## 4. QR Code Module Terminology

| Term | Technical Meaning |
| :--- | :--- |
| **Module** | The individual black and white squares comprising the QR matrix grid. |
| **Foreground Color** | The color applied to the dark data modules (default `#000000`). |
| **Background Color** | The color applied to the light modules and surrounding quiet zone (default `#FFFFFF`). |
| **Quiet Zone** | The blank margin surrounding the QR code (typically 4 module widths). |
| **Version (1–40)** | The matrix dimension symbol: Version 1 is $21 \times 21$ modules; Version 40 is $177 \times 177$ modules. |
| **Data Capacity** | The maximum number of characters or bytes the resolved version can store. |
| **Contrast Ratio** | The luminance ratio between light and dark modules. Minimum safe scanner threshold is **`2.5:1`**. |
