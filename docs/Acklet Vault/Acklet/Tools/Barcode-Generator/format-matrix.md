# Barcode Format Compatibility Matrix

| Format | Variant | Input | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| Code 128 | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| Code 128 | Standard | `TEST12345` | PASS | Rendered valid SVG with positive dimensions |
| Code 128 | Standard | `LONG-STRING-VARIABLE-TEST-1234567890` | PASS | Rendered valid SVG with positive dimensions |
| EAN-13 | Standard | `400638133393` | PASS | Rendered valid SVG with positive dimensions |
| EAN-13 | Standard | `4006381333931` | PASS | Rendered valid SVG with positive dimensions |
| EAN-13 | Standard | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| EAN-8 | Standard | `9638507` | PASS | Rendered valid SVG with positive dimensions |
| EAN-8 | Standard | `96385074` | PASS | Rendered valid SVG with positive dimensions |
| EAN-8 | Standard | `90909092` | PASS | Rendered valid SVG with positive dimensions |
| UPC-A | Standard | `03600029145` | PASS | Rendered valid SVG with positive dimensions |
| UPC-A | Standard | `036000291452` | PASS | Rendered valid SVG with positive dimensions |
| UPC-A | Standard | `012345678905` | PASS | Rendered valid SVG with positive dimensions |
| UPC-E | Standard | `0123456` | PASS | Rendered valid SVG with positive dimensions |
| UPC-E | Standard | `01234565` | PASS | Rendered valid SVG with positive dimensions |
| UPC-E | Standard | `123456` | PASS | Rendered valid SVG with positive dimensions |
| ISBN | Standard | `0306406152` | PASS | Rendered valid SVG with positive dimensions |
| ISBN | Standard | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| ISBN | Standard | `9790260000438` | PASS | Rendered valid SVG with positive dimensions |
| Code 39 | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| Code 39 | Standard | `ACKLET-1` | PASS | Rendered valid SVG with positive dimensions |
| Code 39 | Standard | `CODE39-TEST-1234567890` | PASS | Rendered valid SVG with positive dimensions |
| Code 93 | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| Code 93 | Standard | `ACKLET-93` | PASS | Rendered valid SVG with positive dimensions |
| Code 93 | Standard | `CODE93-FULL-TEST-12345` | PASS | Rendered valid SVG with positive dimensions |
| ITF-14 | Standard | `1001234567890` | PASS | Rendered valid SVG with positive dimensions |
| ITF-14 | Standard | `10012345678902` | PASS | Rendered valid SVG with positive dimensions |
| ITF-14 | Standard | `00012345678905` | PASS | Rendered valid SVG with positive dimensions |
| Interleaved 2 of 5 | Standard | `12` | PASS | Rendered valid SVG with positive dimensions |
| Interleaved 2 of 5 | Standard | `24681357` | PASS | Rendered valid SVG with positive dimensions |
| Interleaved 2 of 5 | Standard | `123456789012` | PASS | Rendered valid SVG with positive dimensions |
| Codabar | Standard | `A12B` | PASS | Rendered valid SVG with positive dimensions |
| Codabar | Standard | `A12345B` | PASS | Rendered valid SVG with positive dimensions |
| Codabar | Standard | `B1234567890D` | PASS | Rendered valid SVG with positive dimensions |
| Data Matrix | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| Data Matrix | Standard | `TEST-DATA-MATRIX` | PASS | Rendered valid SVG with positive dimensions |
| Data Matrix | Standard | `https://acklet.com/tool/barcode` | PASS | Rendered valid SVG with positive dimensions |
| PDF417 | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| PDF417 | Standard | `PASSENGER:DOE/JOHN TICKET:982341` | PASS | Rendered valid SVG with positive dimensions |
| PDF417 | Standard | `PDF417-EXTENSIVE-PAYLOAD-TEST` | PASS | Rendered valid SVG with positive dimensions |
| Aztec | Standard | `A` | PASS | Rendered valid SVG with positive dimensions |
| Aztec | Standard | `AZTEC-DATA` | PASS | Rendered valid SVG with positive dimensions |
| Aztec | Standard | `AZTEC-HIGH-DENSITY-TEST` | PASS | Rendered valid SVG with positive dimensions |
| ISSN | Standard | `12345679` | PASS | Rendered valid SVG with positive dimensions |
| ISSN | Standard | `9771234567003` | PASS | Rendered valid SVG with positive dimensions |
| ISSN | Standard | `9772049363002` | PASS | Rendered valid SVG with positive dimensions |
| ISMN | Standard | `979026000043` | PASS | Rendered valid SVG with positive dimensions |
| ISMN | Standard | `9790260000438` | PASS | Rendered valid SVG with positive dimensions |
| ISMN | Standard | `9790001150019` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Omnidirectional | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Omnidirectional | `09780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Truncated | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Truncated | `09780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Stacked | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Stacked | `09780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Stacked Omnidirectional | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Stacked Omnidirectional | `09780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Limited | `09780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Limited | `19780306406154` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Expanded | `(01)09521234543213(3103)000123` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Expanded | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Expanded Stacked | `(01)09521234543213(3103)000123` | PASS | Rendered valid SVG with positive dimensions |
| GS1 DataBar | Expanded Stacked | `9780306406157` | PASS | Rendered valid SVG with positive dimensions |
| Code 39 Extended | Standard | `Code39_Full_Ascii!` | PASS | Rendered valid SVG with positive dimensions |
| MSI Plessey | Standard | `8492015` | PASS | Rendered valid SVG with positive dimensions |
| Code 11 | Standard | `8401-92` | PASS | Rendered valid SVG with positive dimensions |
| Standard 2 of 5 | Standard | `91827364` | PASS | Rendered valid SVG with positive dimensions |
| Telepen | Standard | `TLP-9482` | PASS | Rendered valid SVG with positive dimensions |
