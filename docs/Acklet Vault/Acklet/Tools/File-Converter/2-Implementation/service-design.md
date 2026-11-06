# Universal File Converter — Service Design & Architecture

## System Architecture

```text
[User File Upload]
       │
       ▼
[FileSignatureService] ──> Analyzes ArrayBuffer magic bytes
       │               ──> Validates format integrity against extension
       ▼
[AdapterRegistryService] ──> Queries compatible adapters (canConvert)
       │                 ──> Filters only tested, active output formats
       ▼
[ConversionEngineService] ──> Enqueues conversion job
       │                  ──> Manages progress signals & cancellation tokens
       │
       ├──> [ImageConversionAdapter] (Canvas API, OffscreenCanvas, ImageBitmap)
       ├──> [SubtitleConversionAdapter] (Lossless SRT ↔ VTT state machine)
       ├──> [ContactConversionAdapter] (RFC 6350 vCard ↔ RFC 4180 CSV)
       │
       ▼
[Output Validator] ──> Checks Blob size, integrity, and MIME type
       │
       ▼
[Download & ZIP Pipeline] ──> Direct URL.createObjectURL or JSZip batch bundle
```

---

## 1. FileSignatureService

Reads the initial 8,192 bytes (`ArrayBuffer`) of any input file via `Blob.prototype.slice()` and checks against known magic byte signatures.

### Supported Signatures
- **PNG**: `[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]`
- **JPEG**: `[0xFF, 0xD8, 0xFF]`
- **WebP**: `RIFF` header with `WEBP` brand at byte 8
- **AVIF**: `ftyp` box with `avif` or `avis` major brand
- **SVG**: Text heuristic verifying `<svg` namespace within first 2KB
- **SRT**: Sequential cue index followed by `-->` timestamp line
- **VTT**: `WEBVTT` magic header string
- **VCF**: `BEGIN:VCARD` header

---

## 2. Adapter Specifications

### 2.1 ImageConversionAdapter
- **Supported Pairs**: PNG ↔ JPG, JPG → WebP, PNG → WebP, SVG → PNG, AVIF → PNG/JPG.
- **Mechanism**: Reads input file via `createImageBitmap()` or `HTMLImageElement` loaded through an object URL. Renders onto an `OffscreenCanvas` (with fallback to `HTMLCanvasElement`).
- **Quality Handling**: User-specified quality parameter (default `0.92`) passed to `canvas.convertToBlob({ type, quality })` or `canvas.toBlob()`.

### 2.2 SubtitleConversionAdapter
- **Supported Pairs**: SRT ↔ VTT.
- **SRT to VTT**:
  - Adds `WEBVTT\n\n` header.
  - Converts time format `HH:MM:SS,mmm` to `HH:MM:SS.mmm`.
  - Preserves cue numbering, multi-line dialogue, and HTML-style styling tags (`<b>`, `<i>`, `<u>`).
- **VTT to SRT**:
  - Strips `WEBVTT` header and header metadata.
  - Converts time format `HH:MM:SS.mmm` to `HH:MM:SS,mmm`.
  - Generates sequential integer cue numbers if omitted in WebVTT.

### 2.3 ContactConversionAdapter
- **Supported Pairs**: VCF ↔ CSV.
- **VCF to CSV**:
  - Parses vCard blocks (`BEGIN:VCARD` to `END:VCARD`).
  - Extracts `FN`, `N`, `NICKNAME`, `TEL`, `EMAIL`, `ADR`, `ORG`, `TITLE`, `URL`, `NOTE`.
  - Encodes RFC 4180 compliant CSV with escaped quotes and commas.
- **CSV to VCF**:
  - Maps standard CSV headers (`Full Name`, `First Name`, `Last Name`, `Phone`, `Email`, etc.).
  - Generates standard vCard 3.0 blocks with proper folding and UTF-8 encoding.

---

## 3. Memory & Resource Hygiene

1. **Object URLs**: All object URLs created for previews or downloads are systematically revoked via `URL.revokeObjectURL(url)` during component cleanup or item removal.
2. **Cancellation**: Each conversion job maintains an `AbortController`. Triggering cancellation immediately halts processing and releases canvas or worker resources.
3. **Blob Deallocation**: Intermediate blobs are freed as soon as final conversion outputs or ZIP archives are generated.

---

## Related Documents
- [../0-Requirements/requirements.md](../0-Requirements/requirements.md) — Requirements specifications.
- [../0-Requirements/format-matrix.md](../0-Requirements/format-matrix.md) — Format Matrix.
- [../1-Progress/implementation-log.md](../1-Progress/implementation-log.md) — Implementation Log.

