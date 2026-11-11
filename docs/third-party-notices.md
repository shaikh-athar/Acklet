# Third-Party Notices & Commercial Licensing Review

## 1. Compliance & Licensing Overview
Acklet Image Converter is engineered as a privacy-focused, zero-backend, client-side digital workstation.
All libraries and custom codecs comply strictly with commercial redistribution guidelines. Proprietary, patent-encumbered, or viral copyleft licenses (such as GPL v3 / AGPL) that could compromise commercial SaaS distribution are strictly prohibited.

---

## 2. Codec & Dependency Evaluation Registry

### Pure TypeScript / Zero-Dependency Internal Codecs
The following codecs are custom-engineered within `client/apps/tool-file-converter/src/services/image-codecs/` in 100% pure TypeScript, running without third-party runtime package dependencies:

| Codec Component | Formats Handled | Implementation Architecture | Commercial License | Native Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| `QoiCodec` | `QOI` | Full QOI 1.0 specification encoder and decoder | MIT Equivalent (Cleanroom) | None |
| `BmpCodec` | `BMP` | 1/4/8/16/24/32-bit DIB decode, 24-bit uncompressed encode | MIT Equivalent (Cleanroom) | None |
| `TiffCodec` | `TIFF`, `TIF` | Baseline TIFF 6.0 directory parsing, PackBits/LZW decode & encode | MIT Equivalent (Cleanroom) | None |
| `TgaCodec` | `TGA` | Truevision Targa uncompressed 24/32-bit decode & encode | MIT Equivalent (Cleanroom) | None |
| `PcxCodec` | `PCX` | ZSoft PC Paintbrush 24-bit TrueColor RLE decode & encode | MIT Equivalent (Cleanroom) | None |
| `NetpbmCodec` | `PPM`, `PNM`, `PGM`, `PBM` | Binary P6 / P5 / P4 pixmap and bitmap decode & encode | MIT Equivalent (Cleanroom) | None |
| `DdsCodec` | `DDS` | DirectDraw Surface 32-bit BGRA texture decode & encode | MIT Equivalent (Cleanroom) | None |
| `IcoCodec` | `ICO` | Windows icon directory parsing & PNG/DIB container wrapping | MIT Equivalent (Cleanroom) | None |
| `IcnsCodec` | `ICNS` | Apple Icon Family container parsing & embedded PNG encoding | MIT Equivalent (Cleanroom) | None |
| `CurCodec` | `CUR` | Windows Cursor structure parsing with hotspot coordinates | MIT Equivalent (Cleanroom) | None |
| `GifCodec` | `GIF` | Multi-frame disposal decoding & NeuQuant/median-cut GIF89a encode | MIT Equivalent (Cleanroom) | None |
| `PdfCodec` | `PDF` | PDF 1.4 single-page image container packaging | MIT Equivalent (Cleanroom) | None |
| `PsdCodec` | `PSD`, `PSB` | Adobe 8BPS header and flattened composite artwork decoding | MIT Equivalent (Cleanroom) | None |
| `HdrCodec` | `HDR` | Radiance RGBE run-length decoding with Reinhard tone mapping | MIT Equivalent (Cleanroom) | None |
| `FitsCodec` | `FITS`, `FIT` | NASA FITS 2880-byte header parsing with min-max contrast scaling | MIT Equivalent (Cleanroom) | None |
| `ExrCodec` | `EXR` | OpenEXR attribute header parsing and half-float scanline extraction | MIT Equivalent (Cleanroom) | None |
| `RawCameraCodec`| `RAW`, `DNG`, `CR2`, `CR3`, `NEF`, `ARW`, `RAF`, `ORF`, `RW2`, `PEF` | Camera calibration metadata & authentic sensor raster extraction | MIT Equivalent (Cleanroom) | None |
| `CorelCodec` | `CDR`, `CMX`, `CPT` | Zip container and RIFF chunk parsing for preview artwork | MIT Equivalent (Cleanroom) | None |
| `XcfCodec` | `XCF` | GIMP XCF versioned header and composite stream parsing | MIT Equivalent (Cleanroom) | None |
| `OraCodec` | `ORA` | OpenRaster standardized `mergedimage.png` composite extraction | MIT Equivalent (Cleanroom) | None |
| `WmfEmfCodec` | `WMF`, `EMF` | Windows Metafile and Enhanced Metafile header/DIB extraction | MIT Equivalent (Cleanroom) | None |
| `SvgzCodec` | `SVGZ` | Gzip stream decompression via standard Web API `DecompressionStream` | MIT Equivalent (Cleanroom) | None |
| `XbmXpmCodec` | `XBM`, `XPM` | X11 C-code monochrome bitmap and color pixmap text parsing | MIT Equivalent (Cleanroom) | None |

---

## 3. Platform & Browser Runtime Dependencies

| Package Name | Version | Official Repository | License | Commercial Permissibility | Browser Safe | WASM / Native Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `@angular/core` | `^19.0.0` | [angular/angular](https://github.com/angular/angular) | MIT | Permitted | Yes | Browser Framework |
| `canvas-confetti` | `^1.9.4` | [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | ISC (Permissive) | Permitted | Yes | Zero DOM impact |
| `jszip` | `^3.10.1` | [Stuk/jszip](https://github.com/Stuk/jszip) | MIT / Dual GPLv3 | Permitted (under MIT) | Yes | In-memory ZIP packaging |
| `lucide-angular` | `^0.468.0`| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | ISC | Permitted | Yes | SVG Icon Set |

---

## 4. Evaluation of External Candidate Libraries

The following open-source candidate libraries were evaluated against technical compatibility, browser bundle overhead, and licensing restrictions:

| Library Candidate | Target Capability | License | Evaluation Verdict | Architectural Decision |
| :--- | :--- | :--- | :--- | :--- |
| `@jsquash/avif` | WASM AVIF Encoding | Apache 2.0 | High quality, 1.2 MB WASM | **Deferred**: Native browser `toBlob('image/avif')` used first, falling back to WebP where unsupported. |
| `@jsquash/jxl` | WASM JPEG XL | Apache 2.0 | Experimental WASM | **Deferred**: Read-only input inspection supported; output deferred until browser standardizes. |
| `ag-psd` | Multi-layer PSD parsing | MIT | 450 KB bundle overhead | **Built Custom `PsdCodec`**: Decodes full-resolution composite artwork without bloating bundle size. |
| `UTIF.js` | TIFF Decoding | MIT | Lightweight | **Built Custom `TiffCodec`**: Pure TS Baseline TIFF 6.0 decoder and encoder with zero external footprint. |
| `resvg-js` | SVG rendering | Apache 2.0 | Requires 3+ MB WASM | **Native Browser Canvas Used**: Native HTMLImageElement rasterization provides instant zero-overhead SVG conversion. |
| `libheif-js` | HEIC/HEIF Decoding | LGPL-3.0 | Viral copyleft risks | **Rejected**: Avoid LGPL risks; rely on native ISO BMFF parsing and browser ImageBitmap where supported. |

---

## 5. Security Safeguards & Decompression Safeguards
- **Max File Size**: 50 MB per file enforce by [`ImageValidationService`](../client/apps/tool-file-converter/src/services/image-validation.service.ts).
- **Decompression Bomb Protection**: Maximum 100 Megapixels (`MAX_PIXEL_COUNT = 100_000_000`) and maximum edge limit of 16,384 pixels.
- **Strict Magic Byte Validation**: Executable binaries (`MZ`, `ELF`, Mach-O) are detected and rejected immediately with user-visible security warnings.
- **Zero Network Transmission**: Processing executes strictly within the client memory context; zero file bytes are transmitted over external networks.

