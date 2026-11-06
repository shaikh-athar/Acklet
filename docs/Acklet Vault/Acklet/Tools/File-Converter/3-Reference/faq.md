# Universal File Converter — Reference & FAQs

## Frequently Asked Questions

### 1. Are my uploaded files sent to any remote server?
No. For all Phase 1 client-side formats (PNG, JPG, WebP, SVG, AVIF, SRT, VTT, VCF, CSV), conversion runs 100% locally on your computer inside browser memory. Your files never leave your device.

### 2. Is there a file size limit?
Browser memory easily handles files up to 100 MB. For exceptionally large files, we advise converting them individually to avoid browser tab memory pressure.

### 3. Does converting PNG to JPG support transparency?
JPEG does not support alpha transparency. When converting a transparent PNG to JPG, transparent pixels are automatically rendered on a crisp white background. If you need transparency preserved with smaller file sizes, convert PNG to WebP instead.

### 4. Will subtitle formatting and timing be altered during SRT ↔ VTT conversion?
No. Our subtitle converter uses a precise millisecond-accurate parser that translates timestamps between SubRip comma syntax (`00:00:01,500`) and WebVTT period syntax (`00:00:01.500`), while strictly preserving cue order, multi-line dialogue, and styling tags (`<b>`, `<i>`, `<u>`).

### 5. How does VCF to CSV conversion organize multiple phone numbers or emails?
When an individual vCard contains multiple contact channels (e.g. Work, Mobile, Home), the converter flattens them into standard semicolon-delimited CSV entries or separate typed columns for effortless import into Excel, Google Sheets, or Apple Contacts.

---

## Related Documents
- [../README.md](../README.md) — Tool Overview.
- [../0-Requirements/requirements.md](../0-Requirements/requirements.md) — Requirements specifications.
- [../2-Implementation/service-design.md](../2-Implementation/service-design.md) — Service Design.

