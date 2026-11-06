# Universal File Converter — Format Support Matrix

## Format Support Tiers & Execution Modes

| Source Format | Target Format | Category | Execution Mode | Engine / Technique | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PNG** | JPG | Image | In-Browser | Canvas API / OffscreenCanvas | **Active (Stage 1 & 2)** |
| **PNG** | WebP | Image | In-Browser | Canvas API / OffscreenCanvas | **Active (Stage 1 & 2)** |
| **JPG / JPEG** | PNG | Image | In-Browser | Canvas API / OffscreenCanvas | **Active (Stage 1 & 2)** |
| **JPG / JPEG** | WebP | Image | In-Browser | Canvas API / OffscreenCanvas | **Active (Stage 1 & 2)** |
| **SVG** | PNG | Graphics | In-Browser | DOMParser / ImageBitmap / Canvas | **Active (Stage 1 & 2)** |
| **AVIF** | PNG | Modern Image | In-Browser | ImageDecoder / Canvas fallback | **Active (Stage 1 & 2)** |
| **AVIF** | JPG | Modern Image | In-Browser | ImageDecoder / Canvas fallback | **Active (Stage 1 & 2)** |
| **SRT** | VTT | Subtitle | In-Browser | Lossless Cue Parser / Time Serializer | **Active (Stage 1 & 2)** |
| **VTT** | SRT | Subtitle | In-Browser | WebVTT Parser / Millisecond Normalizer | **Active (Stage 1 & 2)** |
| **VCF (vCard)** | CSV | Contact | In-Browser | RFC 6350 Parser / RFC 4180 CSV Writer | **Active (Stage 1 & 3)** |
| **CSV** | VCF (vCard) | Contact | In-Browser | CSV Header Mapper / vCard 3.0 Serializer | **Active (Stage 1 & 3)** |
| **HEIC** | JPG | Modern Image | Hybrid / Worker | libheif / Canvas | Stage 4 |
| **ODT** | DOCX | Document | Server-Side | Document Conversion Engine | Stage 4 |
| **EPUB** | PDF | Document | Server-Side | Document Conversion Engine | Stage 4 |
| **M4A** | MP3 | Audio | Server-Side | FFmpeg Worker Pipeline | Stage 4 |
| **WAV** | FLAC | Audio | Server-Side | FFmpeg Worker Pipeline | Stage 4 |
| **MOV** | MP4 | Video | Server-Side | FFmpeg Worker Pipeline | Stage 4 |

---

## File Signature (Magic Bytes) Reference Table

| Format | Magic Bytes (Hex / Text) | Byte Offset | Notes |
| :--- | :--- | :--- | :--- |
| **PNG** | `89 50 4E 47 0D 0A 1A 0A` | 0 | 8-byte PNG header |
| **JPEG** | `FF D8 FF` | 0 | SOI + APP marker |
| **WebP** | `52 49 46 46` ... `57 45 42 50` | 0 & 8 | RIFF header + WEBP brand |
| **AVIF** | `66 74 79 70` (`ftyp`) + `avif`/`avis` | 4 & 8 | ISO BMFF box |
| **HEIC** | `66 74 79 70` (`ftyp`) + `heic`/`mif1` | 4 & 8 | ISO BMFF box |
| **SVG** | `<svg` or `<?xml` | Variable (< 512) | XML document structure |
| **SRT** | `1` + `\r?\n` + `\d\d:\d\d:\d\d` | 0 | Sequential subtitle index |
| **VTT** | `WEBVTT` (`57 45 42 56 54 54`) | 0 | WebVTT header |
| **VCF** | `BEGIN:VCARD` | 0 | vCard block start |
| **PDF** | `25 50 44 46` (`%PDF-`) | 0 | PDF header |
| **ZIP/EPUB/DOCX/ODT** | `50 4B 03 04` (`PK..`) | 0 | Standard ZIP container |
| **WAV** | `52 49 46 46` ... `57 41 56 45` | 0 & 8 | RIFF header + WAVE brand |
| **FLAC** | `66 4C 61 43` (`fLaC`) | 0 | FLAC magic marker |
| **MP3** | `49 44 33` (`ID3`) or `FF FB/F3/F2` | 0 | ID3 tag or MPEG sync word |

---

## Related Documents
- [requirements.md](requirements.md) — Product Requirements.
- [../2-Implementation/service-design.md](../2-Implementation/service-design.md) — Service Design.

