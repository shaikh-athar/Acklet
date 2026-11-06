# Multi-Format File Converter Module

The **File Converter** module provides high-fidelity, multi-format document transformation across Microsoft Office formats, OpenDocument standards, plain text, and PDF outputs for the Acklet platform.

It is implemented with a clean abstraction layer hiding the underlying conversion runtime behind [`ConverterService`](file:///Users/ayaz/Acklet-file-Converter/server/acklet/src/main/java/com/code/acklet/converter/ConverterService.java), with [`JodConverterService`](file:///Users/ayaz/Acklet-file-Converter/server/acklet/src/main/java/com/code/acklet/converter/JodConverterService.java) orchestrating headless LibreOffice process pools via JODConverter.

Related Architecture Documents:
* [Standalone Tool Architecture](standalone-tool-architecture.md)
* [UI Design System](ui-design-system.md)
* [Verification Guide](verification-guide.md)
* [Third-Party Notices](../THIRD-PARTY-NOTICES.md)

---

## 1. Architecture & Design

```mermaid
flowchart TD
    Client["Client / Angular UI (apps/tool-file-converter)"] -->|POST /api/v1/converter/convert| Controller["ConversionController"]
    Controller -->|validate| Validator["ConverterValidator"]
    Controller -->|convert| Service["ConverterService (Interface)"]
    Service --> Implementation["JodConverterService"]
    Implementation -->|Small payload (<5MB)| SyncExec["Synchronous Execution"]
    Implementation -->|Large payload (>=5MB) or async=true| AsyncQueue["ExecutorService Worker Queue"]
    SyncExec --> LocalOffice["JODConverter / Headless LibreOffice"]
    AsyncQueue --> LocalOffice
    Implementation --> TempDir["Temp Storage (jobs/{jobId}/)"]
    Scheduler["@Scheduled cleanupOldJobs()"] -.->|Purge TTL > 60m| TempDir
```

### Decoupled Engine Architecture
The conversion engine is hidden behind the `ConverterService` interface:
* `ConverterService`: Public API for conversion requests, status polling, file streaming, and health checks.
* `JodConverterService`: Default production implementation utilizing `LocalOfficeManager` and `LocalConverter`.
* `ConverterValidator`: Enforces max file size, MIME type and extension rules, and path-traversal sanitization.
* `ConverterProperties`: Externalized settings mapped from `application.yml` under `app.converter`.

---

## 2. Supported Formats Matrix

| Source Category | Source Format | Target Formats |
|---|---|---|
| **Word Processing** | `.docx`, `.doc`, `.odt`, `.rtf`, `.txt`, `.html` | `.pdf`, `.docx`, `.doc`, `.odt`, `.rtf`, `.txt`, `.html` |
| **Spreadsheets** | `.xlsx`, `.xls`, `.ods`, `.csv`, `.tsv` | `.pdf`, `.xlsx`, `.xls`, `.ods`, `.csv`, `.html` |
| **Presentations** | `.pptx`, `.ppt`, `.odp` | `.pdf`, `.pptx`, `.ppt`, `.odp` |
| **Drawings** | `.odg` | `.pdf`, `.png`, `.svg` |

---

## 3. Configuration (`application.yml` & `application.properties`)

```yaml
app:
  converter:
    enabled: true
    max-file-size: 50MB
    temp-dir: ""                     # Blank defaults to {java.io.tmpdir}/acklet-converter
    timeout-seconds: 120             # Process execution timeout
    libreoffice-path: ""             # Blank auto-detects system LibreOffice
    async-threshold-bytes: 5242880   # 5 MB threshold for automatic async routing
    job-ttl-minutes: 60              # Retention before automatic cleanup
    cleanup-cron: "0 */15 * * * *"   # Scheduled cleanup cadence
```

---

## 4. REST API Specification

### Convert Document
* **Method**: `POST /api/v1/converter/convert`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  * `file`: Multipart file binary
  * `targetFormat`: Target extension (e.g., `pdf`, `docx`, `xlsx`)
  * `async`: (Optional) Boolean flag to force background execution
* **Responses**:
  * `200 OK`: Synchronous conversion completed. Returns `ConversionResult` with `COMPLETED` status and `downloadUrl`.
  * `202 Accepted`: Asynchronous conversion queued. Returns `ConversionResult` with `PENDING` / `PROCESSING` status.
  * `400 Bad Request`: Validation failure (empty file, unsupported format, illegal filename).
  * `503 Service Unavailable`: LibreOffice engine offline.

### Get Job Status
* **Method**: `GET /api/v1/converter/status/{jobId}`
* **Response**: `ConversionResult` JSON object with current status, duration, and download link.

### Download Converted File
* **Method**: `GET /api/v1/converter/download/{jobId}`
* **Headers**: `Content-Disposition: attachment; filename="{sanitized_name}.{ext}"`
* **Response**: Binary stream of the converted document.

### Supported Formats & Health
* `GET /api/v1/converter/formats`: Dynamic matrix of available source and target pairs.
* `GET /api/v1/converter/health`: Converter engine availability status (`UP` / `DEGRADED`).

---

## 5. Docker & LibreOffice Server Setup

The production Docker container runs headless LibreOffice on Ubuntu Jammy with Microsoft-compatible font metrics.

### Building and Running Docker Image
```bash
# Build image
docker build -t acklet-backend -f server/acklet/Dockerfile server/acklet

# Run container with headless LibreOffice
docker run -p 8080:8080 -e LIBREOFFICE_PATH=/usr/lib/libreoffice acklet-backend
```

### Local Development Requirements
For native development on macOS / Linux:
* **macOS**: `brew install --cask libreoffice`
* **Debian/Ubuntu**: `sudo apt install -y libreoffice libreoffice-writer libreoffice-calc fonts-dejavu-core fonts-liberation`
* **Standby Mode**: If LibreOffice is not installed locally, the backend runs in degraded standby mode. Unit and integration tests run with mock `DocumentConverter` doubles.

---

## 6. Frontend Tool Screen (`apps/tool-file-converter`)

The UI follows the canonical Acklet design system:
* **Theme Token Scoping & Distinct Accent**: The tool uses `BLUE_ACCENT` (#3B82F6 in dark mode, #2563EB in light mode, hue 217), giving it a crisp, distinctive identity from other tools (such as Image Converter which uses Indigo). The backdrop cursor glow and ambient highlights automatically align to this accent.
* **Distraction-Free Topbar**: Clean navigation header featuring only Share, Save, and Theme Toggle, with unnecessary settings icons removed.
* **Component States**:
  1. **Idle State**: Minimal drag-and-drop zone with format chips and size constraints. The native file input is hidden via `display: none !important;` to eliminate any browser file text leakage.
  2. **Configuring State**: Uploaded file metadata with target format pills.
  3. **Converting State**: Progress bar and background polling indicator.
  4. **Completed State**: Document conversion specs and instant download CTA.
  5. **Error State**: Negotiable, user-friendly, and non-technical error messaging with troubleshooting tips and options to either retry or choose another file.
* **Accessibility**: Full keyboard navigation, ARIA attributes, and WCAG AA contrast compliance in both light and dark themes.

