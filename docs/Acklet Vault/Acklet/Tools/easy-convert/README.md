# EasyConvert — High-Fidelity Multi-Format File Converter

EasyConvert is Acklet's flagship client-first document and image conversion engine. Designed with strict privacy principles, EasyConvert executes lightweight conversions directly in your browser using standard HTML5 Canvas and FileReader APIs, while delegating heavy document transformations to isolated Spring Boot background workers.

---

## 1. Core Architecture & Technology Stack

- **Frontend Engine**: Angular 22 standalone components with OnPush change detection and reactive state managed via Angular Signals (`ConversionStateService`).
- **Backend Service**: Spring Boot Java backend (`com.code.acklet.tool.easyconvert`) providing REST endpoints (`/api/v1/tools/easy-convert/jobs`) and background processing workers.
- **Client Processing**: In-browser Canvas bitmap rendering and Blob decoding for JPG, PNG, WebP, Markdown, Text, and HTML formats.
- **Server Processing**: Multi-part upload and stream conversion for heavy PDF and Microsoft Office formats.
- **Zip Compression**: Pure browser TypeScript ZIP archive builder (`ZipBuilderService`) for batch downloads.
- **Observability**: Distributed correlation ID tracing (`ObservabilityService`) with SLF4J `MDC` context tracking.

---

## 2. End-to-End Conversion Flow

```text
       [ User Upload (Drag-and-Drop / File Picker) ]
                           │
                           ▼
          [ Filename & Binary Magic Inspection ]
            (Check Zero-byte, Corrupted, EXIF)
                           │
                           ▼
            [ SHA-256 Checksum Fingerprint ]
            (Assign Isolated UUID Storage Key)
                           │
                           ▼
           [ Capability Resolution Engine ]
          /                                \
     (Client-side)                    (Server-side)
         │                                  │
  [ Canvas/Blob Stream ]          [ Multipart Upload ]
         │                                  │
         │                        [ Spring Boot Worker ]
         │                                  │
  [ Output Validation ]           [ Output Validation ]
         │                                  │
          \                                /
           [ Verified Download / ZIP Package ]
```

---

## 3. Security & Privacy Guarantees

1. **Path Traversal Sanitization**: `FilenameSanitizerService` strips directory traversal signatures (`../`, `..\`), control characters, null bytes, and Windows reserved names (`CON`, `PRN`, `AUX`).
2. **Digital Signature Safety**: Detects `/ByteRange` and `/Sig` in PDF files and displays an explicit confirmation warning before processing.
3. **Password Protection Protection**: Detects `/Encrypt` headers and halts conversion with a user-friendly error card.
4. **Metadata Stripping**: Global `[x] Strip Metadata` toggle strips EXIF headers from JPEG images prior to canvas re-encoding.
5. **Local History Retention**: Local conversion audit logs (`ConversionHistoryService`) remain strictly on the user's device in browser `localStorage`.
6. **Scheduled Temporary Storage Cleanup**: Spring Boot `@Scheduled` worker (`cleanupExpiredStorage`) purges temporary worker files older than 1 hour.

---

## 4. REST API Endpoint Specification

| Method | Endpoint                                           | Description                                                    |
| :----- | :------------------------------------------------- | :------------------------------------------------------------- |
| `POST` | `/api/v1/tools/easy-convert/jobs`                  | Submit file and target format for background worker conversion |
| `GET`  | `/api/v1/tools/easy-convert/jobs/{jobId}/status`   | Poll real-time progress percentage and stage notifications     |
| `GET`  | `/api/v1/tools/easy-convert/jobs/{jobId}/download` | Stream converted output binary payload                         |
| `POST` | `/api/v1/tools/easy-convert/jobs/{jobId}/cancel`   | Cancel active conversion job                                   |

---

## 5. Supported Format Capabilities Matrix

| Source Format | Target Format  | Engine | Execution Location |
| :------------ | :------------- | :----- | :----------------- |
| PNG           | JPG, WebP      | Client | In-Browser Canvas  |
| JPG           | PNG, WebP      | Client | In-Browser Canvas  |
| WebP          | PNG, JPG       | Client | In-Browser Canvas  |
| TXT / MD      | HTML, Markdown | Client | In-Browser Stream  |
| PDF           | DOCX, TXT      | Server | Spring Boot Worker |
| DOCX          | PDF, TXT       | Server | Spring Boot Worker |

---

## 6. Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter`: Trigger batch conversion for all ready queue items.
- `Ctrl+O` / `Cmd+O` / `Ctrl+U`: Open file picker dialog.
- `Esc`: Close open modal overlays (Fidelity Preview, Local Audit History).
