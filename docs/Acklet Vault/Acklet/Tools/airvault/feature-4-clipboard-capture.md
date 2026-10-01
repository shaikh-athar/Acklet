# Feature 4 — Clipboard Capture & Processing Specification

## 1. Executive Summary & Objective

**Feature 4 (Clipboard Capture)** provides intelligent clipboard listening, drag-and-drop file ingestion, size guards, sensitive pattern detection, off-thread Web Worker processing, and automatic categorization for **AirVault by Acklet**.

---

## 2. Capture Pipeline & Web Worker Offloading Flow

```text
  [ User Action: Paste (⌘V) / Drag & Drop / Window Focus (Auto-Capture) ]
                                   │
                                   ▼
                    [ Read Payload Text or File Blob ]
                                   │
                                   ▼
                   [ Size Guard Check (< 500MB Single File) ]
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          [ Exceeds 500MB: Reject ]        [ Size Valid ]
                                                   │
                                                   ▼
                                       [ Duplicate Hash Check ]
                                                   │
                                   ┌───────────────┴───────────────┐
                                   ▼                               ▼
                          [ Duplicate: Ignore ]           [ New Item ]
                                                           │
                                                           ▼
                                [ Offload to Web Worker (airvault.worker.ts) ]
                                                           │
                   ┌────────────────┬──────────────────────┼──────────────────────┐
                   ▼                ▼                      ▼                      ▼
              [ Code ]           [ URL ]               [ Image ]           [ Plain Text ]
                   │                │                      │                      │
                   │                │             (OffscreenCanvas        │
                   │                │             Low-Res Thumbnail)      │
                   │                │                      │                      │
                   └────────────────┴──────────────────────┴──────────────────────┘
                                                   │
                                                   ▼
                                      [ Sensitive Shield Scanner ]
                                      (AWS, OpenAI, GitHub, JWT, CC)
                                                   │
                                                   ▼
                                    [ Return Result to Main Thread ]
                                                   │
                                                   ▼
                                    [ Stage & Beam / Stream Store ]
```

---

## 3. Supported Content Types & Detection

| Category | Detection Criteria | Handling & Rendering |
| :--- | :--- | :--- |
| **Rich Text & Formatted Documents** | TipTap rich editor HTML / Markdown (`<p>`, `<h1>`-`<h6>`, `<ul>/<ol>/<li>`, `<strong>`, `<em>`, `<a>`, `<pre>/<code>`). | Sanitized and safely rendered as live rich HTML (`[innerHTML]`) in both compact card tiles and full preview without tag exposure. |
| **Formatted Code** | Strict programming markup (`<!DOCTYPE html>`, `<html>`, `<svg>`, JSX components), JSON, JavaScript/TypeScript, Python, SQL, C++, Java, Rust syntax. | Preserves indentation, renders monospaced code block with language badge in `<pre><code>`. |
| **Rich URLs** | Valid HTTP/HTTPS web links. | Clickable 1-click external link navigation. |
| **Images** | Base64 `data:image/*` or dragged image files (`PNG`, `JPEG`, `WebP`, `SVG`, `GIF`). | Off-thread thumbnail generation via `createImageBitmap` + `OffscreenCanvas` in `airvault.worker.ts`. |
| **Files** | Arbitrary dropped files up to 500 MB (with 1.0 GB total clipboard storage cap and 7-day auto-expiry). | Shows filename, byte size, category badge, and formatted preview. |
| **Folders & Directories** | Dropped directories (via `webkitGetAsEntry`) or directory picker selection. | Automatically recursively archives directory contents into a single compressed `.zip` file client-side before AES-GCM encryption. |
| **Plain Text (Live Staging)** | Multi-line text, paragraphs, terminal logs typed or pasted incrementally. | Incremental typing and small pastes stay in the live shared editor and stream continuously to peers without premature auto-conversion. |
| **Large Single Paste (> 5,000 chars)** | Massive multi-page pastes or large data dumps. | Instantly offloads to background Web Worker with pointer-anchored inline progress indicator and converts directly into a vault tile. |

---

## 4. Sensitive Data Masking Matrix

| Pattern Type | Detection Regex | Masked Presentation |
| :--- | :--- | :--- |
| **AWS Access Key** | `AKIA[0-9A-Z]{16}` | `AKIA●●●●●●●●●●●●●●●●` |
| **OpenAI API Key** | `sk-[a-zA-Z0-9]{32,}` | `sk-●●●●●●●●●●●●●●●●●●●●●●●●` |
| **GitHub Token** | `gh[pousr]_[0-9a-zA-Z]{36}` | `ghp_●●●●●●●●●●●●●●●●●●●●●●●●` |
| **JWT Access Token** | `eyJ[A-Za-z0-9_-]+\.eyJ...` | `eyJhbGci●●●●●●●●●●●●●●●●●●●●...xxxxxx` |
| **Payment Cards** | Luhn pattern (13-16 digits) | `●●●●-●●●●-●●●●-1234` |
| **Private Keys** | `-----BEGIN * PRIVATE KEY-----` | `-----BEGIN PRIVATE KEY----- ●●●● [PROTECTED]` |

---

## 5. Rich WYSIWYG Composer, Safe HTML Sanitization & Rendering Pipeline

- **Headless TipTap Integration**: Built on `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-link`, and `@tiptap/extension-placeholder` ([`AirVaultRichEditorService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-rich-editor.service.ts)).
- **End-to-End Rich Text Fidelity Pipeline**:
  - `COPY → COMPOSER → SEND → STORAGE → SYNC → TILE → PREVIEW` preserves full HTML structure (`<p>`, `<h1>...<h6>`, `<ul>/<ol>/<li>`, `<strong>`, `<em>`, `<a>`, `<pre>/<code>`).
  - Strict classification separation via `isStrictCodeMarkup` ensures rich formatting is categorized as `category: 'text'` rather than raw XML/HTML code.
  - Safe sanitization via [`renderMarkdownToSafeHtml`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-markdown.util.ts) securely strips scripts/iframes and applies `DomSanitizer.bypassSecurityTrustHtml` safely.
- **Floating Selection Bubble**: Appears dynamically ~40px above active text selections with bounds-aware positioning, offering:
  - Text formatting: **Bold** (`⌘B`), *Italic* (`⌘I`), `Code` (`⌘E`), Link insertion (`⌘K`).
  - Structural formatting: Headings H1, H2, H3, Bulleted List (`- `), Numbered List (`1. `).
  - Dynamic Font Size Capsule: `12px` (Small), `13.5px` (Default), `15px` (Comfortable), `17px` (Large).
- **Bidirectional Markdown Serialization**: Two-way seamless conversion via `AirVaultMarkdownUtil` ensuring raw Markdown clipboard interchange and formatted visual display.
- **Line Blame Preservation**: Preserves per-line author attribution during rich edits.

---

## 6. Controls & Configuration

- **Auto-Capture Switch**: Toggle `ON / OFF` in staging composer header (persisted in `localStorage`).
- **Paste Button**: 1-click `[📋 Paste]` button or standard keyboard shortcut (`⌘V` / `Ctrl+V`).
- **Drag & Drop**: Native drag overlay with multi-file reader and chunked streaming worker initialization.

---

## 7. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Web Worker Pipeline: [feature-13-web-workers-pipeline.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-13-web-workers-pipeline.md)
- Backend Architecture: [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md)
- Clipboard Synchronization: [feature-5-clipboard-synchronization.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-5-clipboard-synchronization.md)
