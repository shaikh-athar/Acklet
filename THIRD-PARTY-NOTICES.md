# Third-Party Software Notices and Licenses

This document catalogs third-party open-source libraries, packages, and runtimes used across the Acklet platform, along with their respective licenses and usage summaries.

---

## 1. Backend & Server Document Transformation Libraries

### Apache POI
* **Version**: 5.4.1
* **License**: Apache License, Version 2.0
* **Project Home**: [https://poi.apache.org/](https://poi.apache.org/)
* **Usage**: Reading and writing Microsoft OpenXML formats (DOCX, XLSX, PPTX) and tabular data transformation (XLSX <-> CSV).

### Apache PDFBox
* **Version**: 3.0.4
* **License**: Apache License, Version 2.0
* **Project Home**: [https://pdfbox.apache.org/](https://pdfbox.apache.org/)
* **Usage**: PDF document rendering to raster images (PNG, JPEG), text stream parsing, and image wrapping.

### JODConverter & Headless Office
* **Version**: 4.4.9
* **License**: Apache License, Version 2.0
* **Project Home**: [https://github.com/jodconverter/jodconverter](https://github.com/jodconverter/jodconverter)
* **Headless Office**: LibreOffice (governed by Mozilla Public License, Version 2.0; managed as an external OS process without modified binary distribution).
* **Usage**: Document rendering for office document formats (ODT, RTF, DOC, DOCX, XLSX, PPTX) to vector PDF.

### TwelveMonkeys ImageIO & webp-imageio
* **Version**: 3.12.0
* **License**: BSD 3-Clause License / Apache License, Version 2.0
* **Project Home**: [https://github.com/haraldk/TwelveMonkeys](https://github.com/haraldk/TwelveMonkeys)
* **Usage**: Extended image format I/O codecs for TIFF, BMP, ICO, and WebP raster processing.

### Apache Batik
* **Version**: 1.18
* **License**: Apache License, Version 2.0
* **Project Home**: [https://xmlgraphics.apache.org/batik/](https://xmlgraphics.apache.org/batik/)
* **Usage**: Scalable Vector Graphics (SVG) transcoding to raster formats.

### Tess4J / Tesseract OCR
* **Version**: 5.14.0
* **License**: Apache License, Version 2.0
* **Project Home**: [https://github.com/nguyenq/tess4j](https://github.com/nguyenq/tess4j)
* **Usage**: Optical character recognition for scanned document pages without native digital text streams.

### RabbitMQ Java Client & Spring AMQP
* **Version**: 5.21.0 / 3.2.1
* **License**: Apache License, Version 2.0 / Mozilla Public License, Version 2.0
* **Project Home**: [https://www.rabbitmq.com/](https://www.rabbitmq.com/)
* **Usage**: Message brokering, worker concurrency throttling, TTL retry queues, and publisher confirmation guarantees.

---

## 2. Frontend & Client Dependencies

### Angular Framework & Angular CDK
* **Version**: 22.x
* **License**: MIT
* **Copyright**: (c) Google LLC
* **Project Home**: [https://angular.dev/](https://angular.dev/)
* **Usage**: Core application framework, reactive signals, routing, and accessible overlay primitives.

### Spartan UI (Helm Primitives)
* **Version**: 1.3.x
* **License**: MIT
* **Copyright**: (c) Spartan Community
* **Project Home**: [https://spartan.ng/](https://spartan.ng/)
* **Usage**: Accessible primitives for form controls, buttons, tooltips, dialogs, and navigation.

### Lucide Angular Icons
* **Version**: 1.61.0
* **License**: ISC
* **Copyright**: (c) Lucide Contributors
* **Project Home**: [https://lucide.dev/](https://lucide.dev/)
* **Usage**: Consistent SVG iconography across document statuses, file types, and tool buttons.

### JSZip
* **Version**: 3.10.1
* **License**: MIT
* **Copyright**: (c) Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
* **Project Home**: [https://stuk.github.io/jszip/](https://stuk.github.io/jszip/)
* **Usage**: In-browser document ZIP inspection, client-side OpenXML transformation, and multi-file download packaging.

### Tailwind CSS
* **Version**: 4.3.2
* **License**: MIT
* **Copyright**: (c) Tailwind Labs, Inc.
* **Project Home**: [https://tailwindcss.com/](https://tailwindcss.com/)
* **Usage**: Utility-first CSS engine implementing dual-theme Acklet design tokens.
