# Barcode Generator — Glossary of Terms & Standards

This document defines barcode terminology, symbology concepts, and standards referenced across the Acklet Barcode Generator.

---

## Terms & Definitions

### 1D Barcode (Linear Barcode)
An optical representation of data composed of varying widths of parallel lines and spaces (e.g. Code 128, EAN-13, UPC-A). Data is encoded in a single horizontal dimension.

### 2D Barcode (Matrix Code)
A two-dimensional graphical code that stores information both horizontally and vertically (e.g. QR Code, Data Matrix, Aztec). Stores significantly more data in a smaller footprint.

### Check Digit
A calculated redundant digit appended to the end of a numeric sequence used for error detection. Calculated mathematically using algorithms such as GS1 Modulo-10 or Modulo-43 to prevent scanning errors caused by smudges or misreads.

### GS1 Modulo-10
The international standard check digit calculation method used across GTIN-13 (EAN-13), GTIN-12 (UPC-A), GTIN-8 (EAN-8), GTIN-14 (ITF-14), and SSCC codes. Alternates weights of 3 and 1 moving from right to left from the position preceding the check digit.

### Quiet Zone
The clear, unprinted margin surrounding a barcode on both sides (and top/bottom for some symbologies). Standard specifications require at least 10 module widths or 2.5 mm (whichever is greater). Without a quiet zone, optical scanners cannot distinguish where the barcode begins.

### Bearer Bars
Heavy horizontal (or rectangular frame) bars surrounding interleaved symbologies such as ITF-14. They prevent short-scans (when an angled laser reads only a slice of the code) and equalize printing plate pressure on corrugated packaging.

### X-Dimension (Module Width)
The nominal width of the narrowest bar or space in the barcode. All other bar widths are multiples of the X-dimension (e.g. 1X, 2X, 3X, 4X).

### GS1 Magnification
Standard scaling factor for retail barcodes relative to the nominal 100% size:
- 80% (0.8x): Minimum allowed for retail point-of-sale scanning.
- 100% (1.0x): Nominal standard size (37.29 mm width for EAN-13).
- 150% – 200%: Maximum allowed for high-speed automated sorting conveyor scanners.

### UPC-E Zero-Suppression
A method of compressing a standard 12-digit UPC-A code into 8 digits by eliminating runs of zeros according to specific manufacturer and item number patterns. Used on small items like chewing gum or cosmetics.

### Code 128 Auto A/B/C
A high-density alphanumeric symbology capable of switching dynamically between Subset A (uppercase, control chars), Subset B (standard ASCII), and Subset C (double-density paired digits 00-99) to achieve the shortest physical symbol length.
