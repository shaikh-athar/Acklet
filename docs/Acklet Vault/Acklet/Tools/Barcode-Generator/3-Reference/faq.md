# Barcode Generator — Frequently Asked Questions (FAQ)

This document answers common architectural, product, and user questions regarding the Acklet Barcode Generator.

---

## General Product Questions

### Which barcode format should I use?
- **Consumer Retail (North America)**: Use **UPC-A**.
- **Consumer Retail (International / Europe / Asia / Global)**: Use **EAN-13**.
- **Books**: Use **ISBN-13**.
- **Shipping Cartons / Logistics**: Use **ITF-14** or **Code 128**.
- **Internal Inventory, Asset Tracking, Alphanumeric Data**: Use **Code 128**.

### What is the difference between EAN-13 and UPC-A?
UPC-A is a 12-digit format originally established for North America. EAN-13 is a 13-digit superset used worldwide. A UPC-A barcode can be read by any modern EAN-13 scanner by prefixing a leading zero (`0`).

### Do I need to register numbers to sell products in stores?
Yes. Official retail products sold through standard point-of-sale checkout counters require an authorized GTIN issued by **GS1** with a licensed company prefix. Internal barcodes (such as warehouse bins or loyalty cards) do not require registration.

### What is a check digit and do I need to calculate it?
The check digit is the final number calculated from all preceding numbers to verify scan accuracy. You do **not** need to calculate it manually; the Acklet generator computes and adds it automatically.

---

## Technical & Engineering Questions

### Why does my printed barcode fail to scan?
Common causes include:
1. **Inverted or low contrast**: White bars on dark backgrounds cannot be read by standard red laser scanners.
2. **Missing quiet zones**: Printing too close to a package edge or cutting into the white margin.
3. **Incorrect print scaling**: Printing below 80% magnification or with uneven pixel interpolation.
4. **Incorrect check digit**: Scanners will beep in error and reject mismatched checksums.

### Is my entered data stored or transmitted anywhere?
Standard barcodes and bulk spreadsheets are processed 100% locally in your browser memory: no data ever leaves your computer, and no network requests are made.
When creating Temporary expiring barcodes, the verification payload (message, link, or reference) is encrypted with AES-256-GCM and stored on Acklet until the configured expiration date, after which it is permanently purged.

### How do Temporary expiring barcodes work?
Temporary barcodes encode a cryptographic verification token or URL. When scanned, the verification service checks the server clock. While valid, it displays the message, confirmation link, or reference. Once expired or deactivated, the content is never served again and the record is scheduled for deletion.

### What is the difference between a Barcode and a QR Code?
1D barcodes encode small amounts of data (such as product GTINs or serial numbers) along a single horizontal axis and require dedicated linear optical scanners or camera apps. QR codes encode rich 2D data (such as long URLs, WiFi credentials, or contact cards) in both horizontal and vertical axes and can be scanned from any angle by standard smartphone cameras.
