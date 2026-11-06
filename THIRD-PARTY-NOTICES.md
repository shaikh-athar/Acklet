# Third-Party Software Notices and Licenses

This file lists third-party open-source software libraries, packages, and dependencies used within the Acklet platform and its tools, along with their respective license types.

---

## 1. JODConverter (Java OpenDocument Converter)

* **Project**: JODConverter (`org.jodconverter:jodconverter-local`)
* **Project Home**: [https://github.com/jodconverter/jodconverter](https://github.com/jodconverter/jodconverter)
* **Copyright**: Copyright (c) 2004-2012 Mirko Nasato; Copyright (c) 2015-2024 Simon Braconnier, and contributors.
* **License**: Apache License, Version 2.0

### Apache License, Version 2.0 Summary
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

## 2. LibreOffice

* **Project**: LibreOffice
* **Project Home**: [https://www.libreoffice.org/](https://www.libreoffice.org/)
* **Copyright**: Copyright (c) 2000-2024 The Document Foundation and contributors.
* **License**: Mozilla Public License, Version 2.0 (MPL-2.0)

### Mozilla Public License 2.0 Summary
LibreOffice is free and open-source software, governed by the Mozilla Public License v2.0 (MPL-2.0). The source code for LibreOffice is available at [https://git.libreoffice.org/core](https://git.libreoffice.org/core).

Acklet uses LibreOffice purely as an external headless server daemon / CLI process via JODConverter standard remote UNO socket/pipe IPC without modifying or bundling LibreOffice source code inside the application binary.

---

## 3. Production Dependencies

### Angular Framework & CDK
- **Packages**: `@angular/core`, `@angular/common`, `@angular/forms`, `@angular/router`, `@angular/cdk`
- **License**: MIT
- **Copyright**: (c) Google LLC
- **Summary**: Component framework, reactive signals, routing, and accessible UI interaction primitives.

### Spartan UI (Helm Primitives)
- **Packages**: `@spartan-ng/ui-core`, `@spartan-ng/helm`
- **License**: MIT
- **Copyright**: (c) Spartan Community
- **Summary**: Accessible, unstyled UI primitives tailored for Angular with Tailwind CSS.

### Lucide Icons
- **Packages**: `lucide-angular`
- **License**: ISC
- **Copyright**: (c) Lucide Contributors
- **Summary**: Open-source icon set providing clean, consistent SVG iconography.

### Tailwind CSS
- **Packages**: `tailwindcss`
- **License**: MIT
- **Copyright**: (c) Tailwind Labs, Inc.
- **Summary**: Utility-first CSS framework powering Acklet design tokens and responsive layouts.

### JSZip
- **Packages**: `jszip`
- **License**: MIT
- **Copyright**: (c) Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
- **Summary**: In-browser ZIP archive generation for client-side batch downloads.

---

## 4. Development & Test Tooling

### Vitest
- **Packages**: `vitest`
- **License**: MIT
- **Copyright**: (c) Anthony Fu and Vitest Contributors
- **Summary**: Fast unit test runner for client packages and tool apps.

### TypeScript
- **Packages**: `typescript`
- **License**: Apache-2.0
- **Copyright**: (c) Microsoft Corporation
- **Summary**: Typed superset of JavaScript compiling to clean ECMAScript.
