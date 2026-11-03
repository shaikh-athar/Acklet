# Barcode Generator — Label Templates & Sizing Reference

## 1. Sheet Dimensions & Units

All label sheet geometry in the Acklet Barcode Generator is specified in millimeters and converted to standard typographic points for PDF generation:
- **Conversion Factor**: `1 mm = 72 / 25.4 points ≈ 2.83464567 pt`
- **A4 Standard**: `210 mm × 297 mm` (`595.28 pt × 841.89 pt`)
- **US Letter Standard**: `215.9 mm × 279.4 mm` (`8.5 in × 11 in = 612.0 pt × 792.0 pt`)

---

## 2. Implemented Label Sheet Presets

| Preset ID | Preset Name | Grid | Label Dimensions | Top Margin | Left Margin | Horiz. Gap | Vert. Gap | Standard Reference | Verification Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `a4-3x8` | A4 3 × 8 (24 labels) | 3 × 8 | 63.5 × 33.9 mm | 13.0 mm | 7.2 mm | 2.5 mm | 0.0 mm | Avery Zweckform 3474 / L7160 | Published manufacturer spec. Verify top margin on physical feed. |
| `a4-3x7` | A4 3 × 7 (21 labels) | 3 × 7 | 63.5 × 38.1 mm | 15.15 mm | 7.2 mm | 2.5 mm | 0.0 mm | Avery Zweckform L7159 | Published manufacturer spec. |
| `a4-2x7` | A4 2 × 7 (14 labels) | 2 × 7 | 99.1 × 38.1 mm | 15.15 mm | 4.7 mm | 2.5 mm | 0.0 mm | Avery Zweckform L7163 | Published manufacturer spec. |
| `a4-2x4` | A4 2 × 4 (8 labels) | 2 × 4 | 99.1 × 67.7 mm | 13.1 mm | 4.7 mm | 2.5 mm | 0.0 mm | Avery Zweckform L7165 / Shipping | Published manufacturer spec. |
| `a4-5x13` | A4 5 × 13 (65 labels) | 5 × 13 | 38.1 × 21.2 mm | 10.7 mm | 4.7 mm | 2.5 mm | 0.0 mm | Avery Zweckform L7651 / Mini | Published manufacturer spec. Check minimum quiet zones for 1D codes. |
| `a4-4x10` | A4 4 × 10 (40 labels) | 4 × 10 | 48.5 × 25.4 mm | 21.5 mm | 5.0 mm | 0.0 mm | 0.0 mm | Avery Zweckform 3422 / Butt cut | Published manufacturer spec. Zero-gap layout. |
| `letter-3x10` | US Letter 3 × 10 (30 labels) | 3 × 10 | 66.675 × 25.4 mm (2.625 × 1 in) | 12.7 mm (0.5 in) | 4.76 mm (0.1875 in) | 3.175 mm (0.125 in) | 0.0 mm | Avery 5160 / 8160 Standard Address | Published Avery standard. |
| `letter-2x5` | US Letter 2 × 5 (10 labels) | 2 × 5 | 101.6 × 50.8 mm (4 × 2 in) | 12.7 mm (0.5 in) | 3.97 mm (0.156 in) | 3.97 mm (0.156 in) | 0.0 mm | Avery 5163 / Shipping | Published Avery standard. |
| `letter-4x20` | US Letter 4 × 20 (80 labels) | 4 × 20 | 44.45 × 12.7 mm (1.75 × 0.5 in) | 12.7 mm (0.5 in) | 7.14 mm (0.281 in) | 7.94 mm (0.3125 in) | 0.0 mm | Avery 5167 / Return Address | Published Avery standard. Requires small barcode scales. |
| `grid-auto` | One barcode grid (plain paper) | 3 × 6 | 60.0 × 40.0 mm | 15.0 mm | 10.0 mm | 5.0 mm | 5.0 mm | Generic Plain Paper Grid | Generated dynamically with cut guides enabled. |
| `custom` | Custom layout | User defined | User defined | User defined | User defined | User defined | User defined | User configurable mm | Configurable live. |

---

## 3. Implemented Thermal Label Roll Presets

| Roll Preset ID | Dimensions (mm) | Approximate Inches | Typical Applications | Target Printer Resolutions | Verification Status |
|:---|:---|:---|:---|:---|:---|
| `25x15` | 25 × 15 mm | 1.0 × 0.6 in | Jewelry, small vial tracking, asset tags | 203 DPI / 300 DPI | Recommended for 2D codes (Data Matrix, QR). 1D linear codes may require small char count. |
| `38x25` | 38 × 25 mm | 1.5 × 1.0 in | Retail shelf tags, parts bins | 203 DPI / 300 DPI | Verified with Code 128 and EAN-8. |
| `50x25` | 50 × 25 mm | 2.0 × 1.0 in | Standard retail inventory, packaging | 203 DPI / 300 DPI | Default roll preset. |
| `50x30` | 50 × 30 mm | 2.0 × 1.2 in | Logistics carton labels, price stickers | 203 DPI / 300 DPI | Verified. |
| `100x50` | 100 × 50 mm | 4.0 × 2.0 in | Shipping box labels, pallet routing | 203 DPI / 300 DPI | Verified with Code 128, GS1-128, ITF-14. |
| `100x150` | 100 × 150 mm | 4.0 × 6.0 in | Standard 4x6 courier shipping labels (USPS, FedEx, DHL, UPS) | 203 DPI / 300 DPI | Verified. |
| `roll-custom` | Custom | Custom | Specialty thermal rolls | 203 DPI / 300 DPI | User defined. |

---

## 4. Physical Print Verification Notes

> [!IMPORTANT]
> The following items cannot be fully verified without physical laser/thermal printing hardware and require developer or end-user test printing:
> 1. **Printer Margins & Non-Printable Areas**: Consumer inkjet printers often enforce a 3 mm to 5 mm unprintable margin on trailing edges unless borderless printing is active in the printer driver.
> 2. **Physical Sheet Feed Gripper Drift**: Certain desktop printers exhibit ±0.5 mm to ±1.0 mm vertical feeding variance on thick multi-layer sticker sheets.
> 3. **Print Scaling**: Users must ensure the print dialog is set to **"Actual size"** or **100% scale**, and that "Fit to printable area" is explicitly unchecked.
> 4. **Thermal Printer Tear-off Calibration**: Thermal printers (Zebra, Brother, Dymo) require calibration for black-mark or gap sensors to halt precisely between roll pages.

---

## 5. Single Page Model & Calibration Tools

- **Single Page Model Engine**: All label geometry is computed once in millimeters by `SheetLayoutService` ([bulk-spec.md](bulk-spec.md)). Live SVG preview, vector PDF generator, canvas rasterizer, and browser print dialog all use identical millimeter coordinates.
- **Auto Text Sizing**: Evaluates label height in mm and whether a caption is present:
  - `>= 45 mm`: 10 pt (caption) / 12 pt (no caption)
  - `32 - 44 mm`: 9 pt (caption) / 10 pt (no caption)
  - `24 - 31 mm`: 8 pt (caption) / 9 pt (no caption)
  - `18 - 23 mm`: 7 pt (caption) / 8 pt (no caption)
  - `< 18 mm`: 6 pt (minimum legible)
- **Calibration Nudge**: Allows shifting the entire layout horizontally and vertically by -5 mm to +5 mm in 0.5 mm steps to compensate for printer tray feed drift.
- **Alignment Test Page**: Printable PDF available from the Bulk Preview card More menu to verify margins and grid alignment against actual physical label sheets before printing sticker batches.


