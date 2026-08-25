# EASYCONVERT — MASTER IMPLEMENTATION & PRODUCT PROMPT

## 0. ROLE

You are implementing **EasyConvert**, Acklet's flagship document and file conversion tool.

EasyConvert must become one of the highest-quality tools in Acklet.

This is NOT a simple "upload file → call converter → download" implementation.

Treat EasyConvert as a **security-sensitive, reliability-sensitive document processing product** where users may upload:

* contracts
* invoices
* resumes
* financial documents
* business documents
* academic documents
* scanned documents
* PDFs containing signatures
* confidential company files
* large files
* batches of files

The product must therefore optimize for:

1. Correctness
2. File integrity
3. Security
4. Conversion fidelity
5. Transparency
6. Performance
7. Large-file reliability
8. Excellent UX
9. Accessibility
10. Maintainability

Do NOT optimize for feature count at the expense of reliability.

The goal is:

> **Make conversion feel effortless while making the underlying system extremely deliberate.**

---

# 1. PRODUCT PRINCIPLE

EasyConvert should answer one question immediately:

> "I have a file. I want it in another format."

The user should not need to understand:

* conversion engines
* MIME types
* codecs
* queues
* workers
* WASM
* server processing
* temporary storage
* conversion pipelines

The interface should handle that complexity.

The ideal interaction is:

```text
Open EasyConvert

        ↓

Drop file

        ↓

Detect file automatically

        ↓

Understand available conversions

        ↓

Choose / confirm output

        ↓

Convert

        ↓

Verify result

        ↓

Preview / inspect

        ↓

Download
```

Do NOT force users through unnecessary configuration.

---

# 2. IMPORTANT PRODUCT POSITIONING

Use iLovePDF and similar products only as **functional references**.

Study:

* conversion categories
* supported format relationships
* batch conversion concepts
* compression concepts
* OCR concepts
* PDF/document workflows

Do NOT copy:

* UI
* layout
* colors
* component structure
* terminology unnecessarily
* animations
* visual hierarchy
* CSS
* interaction patterns
* branding

Acklet must have its own identity.

The conversion experience should feel like an **Acklet application**, not an iLovePDF clone.

---

# 3. EASYCONVERT IDENTITY

Product name:

**EasyConvert**

Primary purpose:

> Convert documents and files between supported formats with minimal friction, transparent processing, strong privacy controls, and verified output.

Keep application copy concise.

Good:

```text
Drop a file to get started
```

```text
Convert to
```

```text
Preparing file
```

```text
Converting
```

```text
Checking output
```

```text
Conversion complete
```

```text
Conversion failed
```

Avoid:

```text
✨ Transform your documents like never before!
```

Avoid marketing language inside the actual workspace.

---

# 4. EXISTING ACKLET DESIGN SYSTEM IS MANDATORY

Before writing UI code:

1. Inspect the existing Acklet design system.
2. Inspect installed UI libraries.
3. Inspect existing shared primitives.
4. Reuse existing components whenever appropriate.
5. Do NOT introduce another component library simply because it is convenient.

Follow this component hierarchy:

```text
Acklet Shared Primitives
        ↓
Existing Custom Components
        ↓
Spartan UI
        ↓
Angular CDK
        ↓
Tailwind CSS v4
        ↓
Custom CSS only where genuinely necessary
```

Use the already-installed icon system, preferably the existing Lucide integration.

Do NOT introduce duplicate button, dialog, tooltip, dropdown, toast, progress, tabs, or form systems.

If a required component does not exist:

* first determine whether an existing primitive can support it
* then extend the existing system
* only create a new EasyConvert-specific component when the responsibility is genuinely unique

---

# 5. EASYCONVERT COLOR SYSTEM

The supplied EasyConvert visual direction is based on this blue palette:

```text
#E3F2FD
#90CAF9
#2196F3
#0D47A1
```

Use these as the core visual accent family.

Primary:

```text
#2196F3
```

Deep accent:

```text
#0D47A1
```

Soft surface/accent:

```text
#E3F2FD
```

Secondary blue:

```text
#90CAF9
```

Do not turn the entire UI blue.

Use blue primarily for:

* primary actions
* active states
* progress
* focus states
* upload interaction
* selected conversion
* subtle illustrations
* important highlights

Neutral surfaces should dominate the workspace.

Do not create a rainbow UI.

Semantic colors must remain distinct:

```text
Success
Error
Warning
Information
```

Do not use blue to communicate errors or success.

---

# 6. DUAL THEME

EasyConvert must support:

```text
Light
Dark
System
```

Use Acklet's existing theme infrastructure.

Do not simply invert the light theme.

Dark mode must have:

* proper surface hierarchy
* readable text
* correct border contrast
* correct upload-zone contrast
* accessible progress states
* proper preview contrast
* correct icon visibility
* no glowing blue overload

The blue palette should remain recognizable in dark mode without becoming visually aggressive.

---

# 7. CORE UX — ABOVE THE FOLD

The primary workspace should fit naturally within a desktop viewport.

Recommended structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ Acklet / EasyConvert                         Theme  Settings  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                         EasyConvert                            │
│               Convert files without the friction              │
│                                                               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │                                                       │   │
│   │             Drop your file here                      │   │
│   │                                                       │   │
│   │          or browse from your device                   │   │
│   │                                                       │   │
│   │     PDF · DOCX · XLSX · PPTX · JPG · PNG · ...       │   │
│   │                                                       │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│     Processed locally when possible · No unnecessary upload   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

Do NOT create a giant marketing hero above the actual tool.

The tool is the product.

The conversion workspace should be visible immediately.

---

# 8. UPLOAD EXPERIENCE

Support:

### File picker

```text
Choose file
```

### Drag & drop

Support dropping:

* files
* multiple files
* supported folders where browser capabilities allow it

Drag anywhere over the workspace.

During drag:

```text
Drop files to convert
```

Use a subtle overlay.

Do NOT create a huge animated screen takeover.

---

# 9. FILE AUTO-DETECTION

After upload, inspect the file.

Determine:

* filename
* extension
* MIME type
* actual file signature / magic bytes where appropriate
* size
* page count where applicable
* dimensions where applicable
* basic metadata where safely available

Never trust only the extension.

Example:

```text
invoice.pdf
```

must not automatically be treated as a valid PDF simply because it ends in `.pdf`.

Validate the actual file structure.

If extension and detected type disagree:

```text
File type mismatch

The file extension says PDF, but the file contents appear to be different.

Please choose another file.
```

Do not silently rename or reinterpret suspicious files.

---

# 10. CONVERSION MATRIX

Implement conversion capabilities modularly.

Initial baseline should cover the genuinely supported formats, such as:

### Documents

```text
PDF ↔ Word
PDF ↔ Excel
PDF ↔ PowerPoint
PDF ↔ HTML
PDF ↔ Markdown
PDF ↔ Plain Text
```

### Images

```text
JPG → PDF
PNG → PDF
PDF → JPG
PDF → PNG
HEIC → JPG
HEIC → PDF
WebP → JPG
WebP → PNG
AVIF → JPG
AVIF → PNG
```

### PDF-related

```text
PDF → OCR searchable PDF
PDF → PDF/A
```

Only expose a conversion if the backend/client engine actually supports it.

Never create a button for functionality that does not work.

Never simulate conversion.

Never return the original file while pretending it was converted.

If a format is not implemented:

```text
This conversion is not available yet.
```

Do not fake success.

---

# 11. SMART CONVERSION SELECTION

The user should not have to navigate a grid containing dozens of tools.

After detecting the input:

Example:

```text
invoice.pdf
PDF · 4.8 MB

Convert to

[ Word ] [ Excel ] [ PowerPoint ] [ JPG ] [ PNG ]
```

Only show relevant output formats.

For ambiguous formats:

```text
Choose output format
```

For obvious workflows, make the recommended target prominent.

Example:

```text
PDF → Word

Recommended
```

But never make an irreversible assumption when multiple outputs are equally plausible.

---

# 12. FILE QUEUE

The UI must support multiple files.

Example:

```text
Files

┌────────────────────────────────────────────────────────────┐
│ ✓ invoice.pdf       4.8 MB     PDF → DOCX       Complete │
│ ◐ report.pdf       18.2 MB     PDF → DOCX       64%      │
│ ○ contract.pdf      2.1 MB     PDF → DOCX       Waiting  │
│ ✕ broken.pdf        900 KB     PDF → DOCX       Failed   │
└────────────────────────────────────────────────────────────┘
```

Each file has independent state.

Possible states:

```text
Queued
Inspecting
Ready
Uploading
Processing
Converting
Validating
Completed
Cancelled
Failed
Expired
```

Do not use one global spinner for the entire batch.

Every file needs its own progress and status.

This follows the EasyConvert product direction of true per-file progress rather than hiding batch processing behind one spinner.

---

# 13. BATCH CONVERSION

Batch conversion must be a first-class architecture concern.

Support:

```text
10 files
```

or more according to configured limits.

But do NOT load all large files into memory simultaneously.

Use:

* streaming where possible
* bounded concurrency
* backpressure
* queue management
* browser memory awareness
* server-side job queues for heavy processing

Example:

```text
12 files

2 processing
3 queued
7 waiting
```

Do not create 12 simultaneous heavy conversion processes.

---

# 14. LARGE FILE HANDLING

Large files are a major EasyConvert requirement.

Do NOT use:

```text
File → read entire file into memory → convert
```

for large inputs.

Use:

```text
File
 ↓
Size classification
 ↓
Processing strategy
```

Example strategy:

```text
Small
↓
Immediate processing

Medium
↓
Normal processing

Large
↓
Streaming / background processing

Very large
↓
Validated limits / controlled queue
```

The exact thresholds must be configurable.

Do not hard-code arbitrary limits without first inspecting the existing backend/infrastructure constraints.

The system must distinguish:

```text
File too large
```

from:

```text
Server temporarily unavailable
```

from:

```text
Conversion engine failed
```

from:

```text
Unsupported format
```

---

# 15. LARGE FILE UX

Never show:

```text
Loading...
```

for 45 seconds.

Show actual state:

```text
Preparing 780 MB file
```

then:

```text
Uploading

342 MB / 780 MB
44%
```

then:

```text
Queued for conversion

Position 2
```

then:

```text
Converting

Page 48 / 132
```

then:

```text
Checking output
```

Users should understand what the application is doing.

---

# 16. CANCELLATION

Every long-running operation should support cancellation where technically possible.

Examples:

```text
Cancel
```

If cancellation is immediate:

```text
Conversion cancelled
```

If the operation cannot be immediately interrupted:

```text
Stopping conversion...
```

Then:

```text
Conversion cancelled
```

Do not display cancellation as successful conversion.

---

# 17. RETRY

Retries must distinguish transient errors from permanent errors.

Retry:

* network interruption
* temporary worker unavailable
* temporary storage failure
* transient service failure

Do NOT blindly retry:

* corrupted file
* unsupported format
* invalid password
* invalid document structure
* conversion engine deterministic failure

Use bounded retries.

Never create infinite conversion loops.

---

# 18. ERROR HANDLING

This is one of the most important parts of EasyConvert.

Never display:

```text
Something went wrong.
```

Instead:

```text
Conversion failed

We couldn't convert report.pdf to DOCX.

Reason:
The source PDF contains an unsupported document structure.

Try:
• Convert to TXT
• Try another PDF
• Download the original
```

If the system cannot determine the exact cause:

```text
Conversion failed

The conversion engine could not determine the exact cause.

Your original file has not been modified.

Try again or choose another output format.
```

Never invent an error explanation.

---

# 19. ERROR CLASSIFICATION

Create a real error taxonomy.

Examples:

```text
INVALID_FILE
CORRUPTED_FILE
UNSUPPORTED_FORMAT
MIME_MISMATCH
FILE_TOO_LARGE
PASSWORD_PROTECTED
ENCRYPTED_DOCUMENT
MALFORMED_DOCUMENT
CONVERSION_TIMEOUT
ENGINE_FAILURE
RESOURCE_LIMIT
NETWORK_FAILURE
UPLOAD_FAILURE
STORAGE_FAILURE
OUTPUT_VALIDATION_FAILURE
OUTPUT_CORRUPTED
CANCELLED
QUEUE_FAILURE
UNKNOWN_FAILURE
```

Map technical errors to user-friendly messages.

Do not expose:

* stack traces
* internal paths
* server names
* worker IDs
* implementation details
* credentials
* internal exception messages

Those belong in logs, not the UI.

---

# 20. PASSWORD-PROTECTED FILES

If a file is encrypted/password protected:

Detect it where possible.

Display:

```text
Password-protected file

This document requires a password before it can be converted.
```

Provide:

```text
Password
[________________]

[Unlock & Convert]
```

Never:

* log the password
* store the password unnecessarily
* send it to analytics
* display it in error messages
* persist it after the conversion job

If the conversion engine cannot safely handle encrypted files:

```text
This encrypted document cannot be converted by EasyConvert yet.
```

Do not pretend otherwise.

---

# 21. DIGITAL SIGNATURE SAFETY

This is mandatory.

If a PDF contains a digital signature, detect it where technically possible.

Before a transformation that may invalidate it:

```text
Digital signature detected

Converting this document may invalidate its existing digital signature.

The converted file should not be treated as a digitally signed copy.

[Continue]
[Cancel]
```

Do NOT claim signature preservation unless the conversion engine genuinely guarantees it.

After conversion:

```text
Signature status

Original:
Digitally signed

Converted:
Signature not preserved
```

This is a major trust feature.

---

# 22. METADATA PRIVACY

Documents may contain:

* author
* creator application
* timestamps
* embedded GPS data
* EXIF
* document properties
* revision information
* hidden metadata

Design the architecture for future metadata controls.

Potential future option:

```text
Remove metadata
```

When implemented, make it explicit.

Never silently strip metadata unless the user selected that behavior or product policy clearly states it.

---

# 23. MACRO / ACTIVE CONTENT SAFETY

Office documents may contain:

* macros
* embedded objects
* external links
* scripts
* active content

Never execute arbitrary document content.

The processing engine must treat uploaded documents as untrusted input.

Where relevant, detect and warn:

```text
This document contains active content.

Conversion may remove or alter macros and embedded objects.
```

Do not execute macros.

---

# 24. MALFORMED / HOSTILE FILES

The backend must assume uploaded files are untrusted.

Protect against:

* malformed PDFs
* malformed Office documents
* decompression bombs
* zip bombs
* excessive nesting
* extremely large page counts
* image bombs
* oversized embedded images
* malicious parser payloads
* resource exhaustion
* path traversal
* archive traversal
* invalid Unicode
* invalid filenames

Never trust:

```text
filename
extension
MIME type
document metadata
embedded paths
```

Validate everything.

---

# 25. TEMPORARY STORAGE

If server-side conversion is required:

```text
Upload

↓

Temporary isolated storage

↓

Conversion

↓

Output validation

↓

Download

↓

Cleanup
```

Temporary files must have lifecycle expiration.

Do not permanently store uploaded documents unless the product explicitly requires it.

Do not put private document content into:

* logs
* analytics
* database records
* Redis
* telemetry
* error tracking

---

# 26. CLIENT-SIDE VS SERVER-SIDE PROCESSING

Do NOT force every conversion through the backend.

Use client-side processing when it is technically reliable.

Potential client-side candidates:

```text
Image conversion
PDF ↔ image
Basic PDF manipulation
Some PDF/A operations
```

Heavy document reconstruction may require server-side processing:

```text
PDF → Word
PDF → Excel
PDF → PowerPoint
OCR
complex document reconstruction
```

The exact decision must be based on the actual libraries available in the project.

Do not invent browser capabilities.

The architecture should explicitly identify:

```text
Client Conversion Engine
Server Conversion Engine
```

behind a common conversion interface.

The existing converter research specifically identifies client-side/WASM processing as appropriate for some lighter transformations while heavier OCR and Office reconstruction may require server-side processing.

---

# 27. CONVERSION ABSTRACTION

Do NOT couple the UI directly to a specific conversion library.

Create an abstraction similar to:

```text
ConversionRequest
ConversionCapability
ConversionResult
ConversionError
ConversionProgress
ConversionEngine
```

Conceptually:

```text
EasyConvert UI
      ↓
Conversion Orchestrator
      ↓
Capability Resolver
      ↓
Client Engine / Server Engine
      ↓
Validation
      ↓
Result
```

The UI should not care whether the conversion happened through:

* WASM
* browser API
* backend worker
* LibreOffice
* PDF engine
* image engine
* OCR engine

That is an implementation concern.

---

# 28. CAPABILITY REGISTRY

Create a capability registry.

Example:

```text
PDF → DOCX
Supported
Server
Async

PDF → JPG
Supported
Client
Immediate

DOCX → PDF
Supported
Server
Async

HEIC → JPG
Supported
Client
Immediate
```

The UI consumes this registry.

This prevents hardcoding conversion possibilities in multiple components.

---

# 29. CONVERSION OPTIONS

Do not overwhelm the user.

Basic flow:

```text
Input
Output
Convert
```

Advanced options should be contextual.

For PDF → image:

```text
Page range
DPI
Quality
Output format
```

For image → PDF:

```text
Page order
Orientation
Page size
Margins
Image quality
```

For PDF compression:

```text
Compression level
Estimated output size
Quality impact
```

For OCR:

```text
Language
Searchable output
Page range
```

Only show options relevant to the selected conversion.

---

# 30. PAGE RANGE

For page-based formats support:

```text
All pages

1-10

3,5,8

2-5,8-12
```

Validate ranges.

Never silently ignore invalid pages.

Example:

```text
Invalid page range

Page 18 does not exist.
This document contains 12 pages.
```

---

# 31. FIDELITY PREVIEW

This is one of EasyConvert's signature features.

Where technically possible, provide a preview before download.

Example:

```text
Conversion complete

Original                     Converted

┌───────────────┐            ┌───────────────┐
│               │            │               │
│ original      │     →      │ converted     │
│ document      │            │ document      │
│               │            │               │
└───────────────┘            └───────────────┘
```

Allow:

```text
Side by side
Original
Converted
```

Do not claim pixel-perfect equivalence when it is not possible.

---

# 32. FIDELITY WARNINGS

Before conversion, identify likely fidelity risks where the engine can detect them.

Examples:

```text
This document contains complex tables.

Some formatting may change during PDF → Word conversion.
```

```text
This PDF uses fonts that may not be available during conversion.
```

```text
This document contains scanned pages.

OCR may introduce recognition errors.
```

The warning must be based on actual detection.

Never invent a confidence score.

If confidence scoring is implemented, it must have a documented basis.

---

# 33. OUTPUT VALIDATION

Conversion is NOT complete when the engine returns a file.

The pipeline must be:

```text
Convert

↓

Check file exists

↓

Check size

↓

Check MIME/signature

↓

Check readability

↓

Check structural validity

↓

Check page count where applicable

↓

Check output can be opened

↓

Mark successful
```

Only then:

```text
Conversion complete
```

If validation fails:

```text
Conversion produced an invalid output.

The file was not offered as a successful conversion.
```

This is mandatory.

---

# 34. OUTPUT INTEGRITY

Where appropriate calculate:

```text
input size
output size
input checksum
output checksum
```

Never report success based only on HTTP 200.

The output must actually exist and pass validation.

---

# 35. DOWNLOAD EXPERIENCE

After successful conversion:

```text
Conversion complete

report.pdf
↓
report.docx

4.8 MB → 3.2 MB

[Preview] [Download]
```

Download should happen from the workspace.

Do not redirect to another page.

Do not force signup.

Do not open unnecessary dialogs.

Default filename should be deterministic:

```text
report.docx
```

If converting:

```text
invoice.pdf → invoice.docx
```

Preserve the base name where safe.

Sanitize filenames.

Never trust arbitrary path components from uploaded filenames.

---

# 36. ZIP BATCH DOWNLOAD

For multiple completed files:

```text
Download all
```

Create:

```text
easyconvert-results.zip
```

But do not build massive ZIP archives entirely in RAM.

Use streaming / temporary storage where required.

Validate archive creation.

---

# 37. PARTIAL BATCH FAILURE

Suppose:

```text
10 files

8 completed
1 failed
1 cancelled
```

Do NOT show:

```text
Batch failed
```

Show:

```text
8 completed
1 failed
1 cancelled
```

Actions:

```text
Download completed
Retry failed
Remove failed
Start over
```

The successful files must remain available.

---

# 38. PROGRESS MODEL

Progress must represent actual progress.

Do NOT fake:

```text
10%
20%
30%
...
100%
```

if the system has no real progress information.

If only phase-level progress is available:

```text
Preparing
Uploading
Processing
Validating
Finalizing
```

Use an indeterminate progress indicator within the phase.

Never manufacture precision.

This is a critical "don't bluff" rule.

---

# 39. BACKGROUND PROCESSING

Heavy conversions must not block HTTP requests.

Architecture:

```text
Frontend
   ↓
Conversion API
   ↓
Create Job
   ↓
RabbitMQ
   ↓
Conversion Worker
   ↓
Conversion Engine
   ↓
Validation
   ↓
Result
   ↓
Frontend
```

The existing Acklet architecture already uses RabbitMQ for asynchronous workloads, so EasyConvert should integrate with that architecture rather than creating a second queue mechanism.

---

# 40. JOB STATES

Use explicit job lifecycle states:

```text
CREATED
VALIDATING_INPUT
UPLOADING
QUEUED
PROCESSING
VALIDATING_OUTPUT
COMPLETED
FAILED
CANCEL_REQUESTED
CANCELLED
EXPIRED
```

Do not overload one generic `status` string with ambiguous meanings.

---

# 41. JOB OBSERVABILITY

Every important conversion job should have structured logs.

Log:

```text
operation
job id
conversion type
input size
output size
duration
engine
status
failure category
retry count
correlation id
```

Never log:

```text
document contents
passwords
tokens
private metadata
full filenames if sensitive
```

Follow Acklet's existing logging rule: important operations need contextual logs, while secrets and private content must never enter logs.

---

# 42. RETENTION / CLEANUP

Every temporary file must have a lifecycle.

Example architecture:

```text
Created
 ↓
Processing
 ↓
Completed
 ↓
Download window
 ↓
Automatic deletion
```

If a user closes the browser, server-side temporary jobs must still eventually clean themselves.

Use scheduled cleanup as a safety net.

Never depend only on frontend cleanup.

---

# 43. SECURITY BOUNDARY

Treat every uploaded file as hostile.

Never execute:

* macros
* shell commands
* embedded scripts
* arbitrary binaries
* document-defined commands

Conversion workers must be isolated.

Use:

* restricted filesystem
* resource limits
* CPU limits
* memory limits
* timeout limits
* temporary workspace
* non-root execution where applicable
* network restrictions where possible

A malformed document must not be able to compromise the conversion worker or host.

---

# 44. RESOURCE LIMITS

Every conversion needs limits for:

```text
maximum input size
maximum output size
maximum pages
maximum processing duration
maximum memory
maximum CPU
maximum concurrent jobs
maximum extracted archive size
maximum archive nesting
```

These should be configuration-driven.

Do not scatter magic numbers across the codebase.

---

# 45. TIMEOUT HANDLING

If conversion exceeds the allowed duration:

```text
Conversion timed out

The document took longer than the allowed processing time.

Your original file is safe.

Try a smaller page range or another format.
```

Do not continue processing indefinitely.

The worker must terminate safely.

---

# 46. NETWORK FAILURE

If upload/download/network operations fail:

```text
Connection interrupted

Your conversion could not finish because the connection was interrupted.

[Retry]
```

Do not lose already completed batch items.

Where technically possible, support resumable uploads for large files.

---

# 47. STORAGE FAILURE

If temporary storage fails:

```text
We couldn't prepare the file for conversion.

No converted file was generated.

[Retry]
```

Log the infrastructure reason internally.

Never expose internal storage details.

---

# 48. ENGINE FAILURE

If the conversion engine crashes:

User:

```text
Conversion engine unavailable

We couldn't complete this conversion.

Your original file was not modified.

[Retry]
```

Internal logs should contain:

```text
engine
exception category
duration
resource usage
job id
worker
correlation id
```

Do not expose stack traces.

---

# 49. EMPTY STATES

Initial:

```text
Drop a file to get started.

Convert documents and images without unnecessary steps.
```

No files:

```text
No files added yet.
```

No compatible outputs:

```text
No compatible conversion is available for this file.
```

Queue:

```text
Your files are ready.

Choose an output format to continue.
```

---

# 50. SUCCESS STATE

Success should feel satisfying but not childish.

Example:

```text
✓ Conversion complete

report.pdf
→
report.docx

3.8 MB

[Preview] [Download]
```

For batch:

```text
Conversion complete

8 files ready
1 failed
1 cancelled

[Download all]
```

Use subtle animation.

No confetti.

No excessive celebration.

---

# 51. TOAST SYSTEM

Use existing Acklet toast infrastructure.

Examples:

```text
File added
```

```text
Conversion started
```

```text
Conversion complete
```

```text
Download started
```

```text
Conversion cancelled
```

```text
3 files converted
```

Do not spam toasts for every progress update.

Progress belongs in the workspace.

---

# 52. ACCESSIBILITY

EasyConvert must be keyboard accessible.

Requirements:

* semantic buttons
* keyboard focus
* visible focus states
* accessible labels
* accessible progress information
* screen-reader announcements for status changes
* keyboard-accessible upload
* keyboard-accessible file queue
* keyboard-accessible dialogs
* focus trapping in dialogs
* Escape closes temporary dialogs
* sufficient contrast
* no state communicated by color alone

Example:

Do not rely only on:

```text
green = completed
red = failed
```

Use:

```text
✓ Completed
✕ Failed
```

---

# 53. RESPONSIVE DESIGN

Desktop:

```text
Upload / workspace
File queue
Conversion controls
Preview
```

Tablet:

```text
Stack controls
```

Mobile:

```text
EasyConvert

[Add files]

Files

[Convert]

[Preview]

[Download]
```

Do NOT force a desktop split-panel layout onto mobile.

On mobile:

* stack panels
* use tabs where appropriate
* keep primary action visible
* collapse advanced options
* preserve progress visibility

The original converter research specifically recommends mobile-first behavior and testing on slower Android hardware, not merely desktop responsiveness.

---

# 54. PERFORMANCE

Performance is a product feature.

Requirements:

* lazy-load heavy conversion functionality
* avoid loading every conversion engine at application startup
* stream large files
* use Web Workers for expensive browser processing
* avoid blocking the Angular main thread
* virtualize large file queues where necessary
* debounce expensive calculations
* avoid repeated file inspection
* cache safe derived metadata
* release Blob/Object URLs
* release worker resources
* clean temporary browser memory
* avoid unnecessary change detection

Do not load a 100 MB WASM engine just because the user opened EasyConvert.

Load capabilities when needed.

---

# 55. FRONTEND ARCHITECTURE

Do NOT create:

```text
easy-convert.component.ts
```

with thousands of lines.

Use feature-first separation.

Recommended structure:

```text
easyconvert/

├── workspace/
│   ├── easyconvert-workspace
│   ├── workspace-header
│   └── workspace-toolbar
│
├── upload/
│   ├── upload-zone
│   ├── file-picker
│   ├── drag-drop
│   └── file-inspector
│
├── files/
│   ├── file-queue
│   ├── file-item
│   ├── file-status
│   └── batch-summary
│
├── conversion/
│   ├── conversion-selector
│   ├── conversion-options
│   ├── capability-registry
│   ├── conversion-progress
│   └── conversion-actions
│
├── preview/
│   ├── preview-shell
│   ├── original-preview
│   ├── converted-preview
│   └── fidelity-warning
│
├── engines/
│   ├── client/
│   └── server/
│
├── security/
│   ├── file-validator
│   ├── type-detector
│   ├── size-policy
│   └── security-policy
│
├── jobs/
│   ├── conversion-job
│   ├── job-state
│   └── job-polling
│
├── download/
│   ├── download-manager
│   ├── zip-download
│   └── filename-generator
│
├── history/
│
├── settings/
│
└── shared/
```

Modify the structure to match the actual Acklet codebase.

The principle is mandatory:

> Every major responsibility must have an isolated boundary.

---

# 56. BACKEND ARCHITECTURE

Follow Acklet's existing feature-first architecture.

Conceptually:

```text
conversion/

├── controller
├── service
├── domain
├── engine
├── worker
├── queue
├── validation
├── storage
├── security
├── mapper
└── exception
```

Do not mix:

* HTTP handling
* conversion engine calls
* file storage
* security validation
* job state
* queue publishing

inside one service.

---

# 57. STATE MANAGEMENT

Separate:

### File state

```text
files
```

### Conversion state

```text
selectedOutput
options
capability
```

### Job state

```text
jobId
status
progress
phase
error
```

### Preview state

```text
previewMode
originalPreview
convertedPreview
```

### UI state

```text
activePanel
dialogs
expandedItems
```

### User preferences

```text
theme
default output
recent conversions
```

Do not tightly couple UI state with processing state.

---

# 58. NO UNNECESSARY BACKEND CALLS

If a conversion can safely happen entirely in the browser, do not send the file to the backend.

This is important to Acklet's privacy positioning.

The existing Acklet product direction explicitly prioritizes client-side processing for standard utilities and avoiding unnecessary API calls.

But do NOT claim:

```text
Processed locally
```

unless the actual implementation is local.

The UI must reflect reality.

---

# 59. PRIVACY INDICATOR

Show processing information near the upload area.

Examples:

```text
Processed in your browser
```

or:

```text
Secure server processing
Temporary file · Automatically deleted
```

The badge must be dynamically determined by the selected conversion path.

Do not display a generic "100% private" claim.

Be precise.

---

# 60. CONVERSION PROCESSING INDICATOR

For client-side:

```text
Processing in your browser
```

For server-side:

```text
Secure processing

Your file is temporarily processed for conversion.
```

For queued:

```text
Waiting for a conversion worker
```

This transparency is a feature, not technical noise.

---

# 61. FILENAME SECURITY

Uploaded filenames can contain:

```text
../
..\ 
control characters
Unicode tricks
very long names
reserved names
duplicate names
```

Normalize filenames safely.

Never use uploaded filenames as filesystem paths.

Generate safe internal IDs.

Example:

```text
job UUID
```

instead of:

```text
filename.pdf
```

as the storage identity.

---

# 62. DUPLICATE FILES

If the same file is uploaded multiple times:

Do not accidentally overwrite another job.

Each upload receives an independent identity.

Optionally detect duplicates through checksum.

But do not silently reuse a previous conversion unless that behavior is explicitly designed and safe.

---

# 63. BROWSER MEMORY

For client-side processing:

Monitor memory-sensitive operations.

If the browser cannot safely process a file:

```text
This file is too large for safe browser processing.

EasyConvert can process it using secure background conversion instead.
```

Only offer fallback if server-side processing is genuinely available.

Never crash the browser tab trying to process a huge file.

---

# 64. OFFLINE BEHAVIOR

Client-side conversions should ideally continue working without network connectivity once required assets are available.

But do not claim full offline support until verified.

If server conversion requires network:

```text
Internet connection required for this conversion.
```

---

# 65. HISTORY

Design EasyConvert to support future history.

Potential metadata:

```text
conversion type
input filename
output filename
timestamp
input size
output size
status
```

Do NOT store private file contents remotely merely to provide history.

For local history:

```text
Stored locally on this device.
```

For server-side history, store only safe metadata unless the user explicitly opts into file retention.

---

# 66. SETTINGS

Keep settings lightweight.

Potential settings:

```text
Default output format
Remember last conversion
Auto-download completed files
Theme
```

Advanced settings should not clutter the primary workspace.

---

# 67. KEYBOARD SHORTCUTS

Where appropriate:

```text
Ctrl/Cmd + O
Open file

Ctrl/Cmd + Enter
Start conversion

Esc
Close dialog / cancel transient UI

Ctrl/Cmd + K
Command palette
```

Only add shortcuts that do not conflict with browser/editor behavior.

---

# 68. COMMAND PALETTE

If Acklet's existing command palette infrastructure exists, integrate EasyConvert into it.

Potential commands:

```text
Add file
Start conversion
Cancel conversion
Preview output
Download output
Download all
Clear completed
Open settings
Toggle theme
```

Do not create a second command palette implementation.

---

# 69. ANIMATION

Use subtle motion.

Good:

* upload highlight
* file addition
* progress transition
* panel transition
* preview switch
* success state
* toast appearance

Avoid:

* bouncing upload zones
* floating blobs everywhere
* excessive gradients
* long transitions
* animated backgrounds
* fake progress animations

EasyConvert should feel:

```text
Fast
Precise
Calm
Reliable
```

---

# 70. VISUAL LANGUAGE

Do NOT make every section a card.

Prefer:

```text
workspace
 ├── toolbar
 ├── upload surface
 ├── file queue
 ├── conversion controls
 └── result area
```

rather than:

```text
card
card
card
card
card
```

The application should feel like a cohesive workspace.

---

# 71. MICRO-INTERACTIONS

Important interactions should have immediate feedback.

Example:

Before:

```text
Convert
```

During:

```text
Converting...
```

After:

```text
✓ Converted
```

Download:

```text
Download
```

then:

```text
✓ Downloaded
```

Do not make the user wonder whether their click worked.

---

# 72. NO FAKE UX

This rule is absolute.

Never implement:

```text
Fake progress
Fake conversion
Fake preview
Fake fidelity score
Fake privacy indicator
Fake local processing
Fake output validation
Fake supported format
Fake OCR
Fake signature detection
```

If something cannot be implemented correctly:

1. Do not pretend.
2. Do not mock it as production functionality.
3. Clearly mark it as unavailable.
4. Document the missing capability.

---

# 73. SEO

The application workspace remains app-like.

Below the workspace, provide a lightweight SEO section.

Example:

```text
EasyConvert

Convert documents and files between supported formats quickly and securely.
```

Keep it short.

Do not push SEO content above the actual tool.

The user should be able to use EasyConvert immediately.

---

# 74. RELATED ACKLET TOOLS

After successful conversion, optionally show a subtle related-tool suggestion.

Example:

```text
Need to inspect JSON?

Try JSONLens
```

or:

```text
Need to compress the result?

Try EasyConvert Compression
```

This should be a soft cross-tool discovery element.

Never interrupt the download flow with a popup.

---

# 75. MOBILE UX

Test specifically on:

```text
slow Android device
mobile Chrome
small viewport
poor network
large file
```

Do not assume desktop Chrome behavior represents real users.

Primary mobile flow:

```text
Add file

↓

Detected format

↓

Convert to

↓

Options

↓

Convert

↓

Progress

↓

Preview

↓

Download
```

---

# 76. TESTING REQUIREMENTS

Do not finish implementation when the happy path works.

Test:

### File tests

* valid PDF
* corrupted PDF
* renamed PDF
* empty file
* zero-byte file
* huge file
* unsupported file
* password-protected file
* malformed Office document
* image with EXIF
* Unicode filename
* very long filename
* duplicate filename
* duplicate content

### Conversion tests

* valid conversion
* unsupported conversion
* engine failure
* timeout
* cancellation
* retry
* partial batch failure
* output validation failure

### Security tests

* path traversal filename
* malicious archive
* decompression bomb
* oversized archive
* macro-containing document
* embedded object
* malformed parser input

### UX tests

* drag/drop
* keyboard upload
* mobile
* dark mode
* slow network
* disconnected network
* browser refresh during job
* browser close during server job

---

# 77. FAILURE MATRIX

Create an explicit failure matrix before implementation.

Example:

```text
Failure
    ↓
Detect category
    ↓
Recoverable?
   / \
 Yes  No
 ↓     ↓
Retry  Explain
 ↓     ↓
Success / User action
```

Document expected user behavior for every major failure.

---

# 78. OBSERVABILITY

Use correlation IDs for server-side jobs.

Example:

```text
Request
 ↓
Conversion Job
 ↓
RabbitMQ Message
 ↓
Worker
 ↓
Engine
 ↓
Validation
```

All logs should be traceable through the same job/correlation identifier.

Never expose internal IDs unnecessarily to users.

---

# 79. DOCUMENTATION

Create EasyConvert documentation covering:

```text
Purpose
Architecture
Conversion flow
Client/server processing
Security
Large-file strategy
Queue strategy
Error taxonomy
Cleanup strategy
Output validation
Supported formats
Performance considerations
Known limitations
Future extensions
```

Do not document features that do not actually exist.

---

# 80. IMPLEMENTATION PHASES

Implement in this exact order.

## PHASE 1 — CODEBASE DISCOVERY

Before changing code:

* inspect existing Angular architecture
* inspect shared components
* inspect installed UI libraries
* inspect theme tokens
* inspect backend feature structure
* inspect RabbitMQ configuration
* inspect Redis
* inspect storage abstraction
* inspect existing worker infrastructure
* inspect existing file upload infrastructure
* inspect existing error handling
* inspect existing logging
* inspect existing security boundaries

Do not duplicate existing infrastructure.

Produce a short implementation plan before coding.

---

## PHASE 2 — DOMAIN MODEL

Create:

```text
File
ConversionCapability
ConversionRequest
ConversionOptions
ConversionJob
ConversionResult
ConversionError
ConversionProgress
```

Define lifecycle states.

Define error taxonomy.

Define capability registry.

---

## PHASE 3 — FILE VALIDATION

Implement:

* extension validation
* MIME validation
* magic-byte detection where appropriate
* size validation
* filename sanitization
* corruption detection
* security validation
* encrypted-file detection where supported

No conversion should begin before validation succeeds.

---

## PHASE 4 — CORE CONVERSION

Implement the smallest reliable set of conversions first.

Do NOT implement every possible format immediately.

For every conversion:

```text
Input validation
        ↓
Capability resolution
        ↓
Processing
        ↓
Output validation
        ↓
Result
```

No shortcut.

---

## PHASE 5 — ASYNC CONVERSION

Integrate heavy conversion into:

```text
RabbitMQ
```

Use existing Acklet worker architecture.

Do not introduce another queue system.

Implement:

* job creation
* queue publishing
* worker consumption
* progress
* retry
* timeout
* cancellation
* failure
* completion

---

## PHASE 6 — LARGE FILE SUPPORT

Implement:

* streaming
* bounded concurrency
* temporary storage
* resource limits
* background processing
* progress reporting
* cleanup
* large-file UX

Test using genuinely large files.

Do not merely test a 10 MB file and claim large-file support.

---

## PHASE 7 — BATCH PROCESSING

Implement:

* multiple files
* per-file state
* independent failures
* bounded concurrency
* retry failed
* download completed
* batch ZIP
* batch summary

---

## PHASE 8 — PREVIEW & FIDELITY

Implement preview only for formats that can genuinely be rendered.

Add:

* original preview
* converted preview
* side-by-side mode
* fidelity warnings
* page navigation
* output validation

Never fake a preview.

---

## PHASE 9 — SECURITY HARDENING

Perform explicit review for:

* malicious files
* path traversal
* archive bombs
* memory exhaustion
* CPU exhaustion
* macro execution
* temporary storage leaks
* sensitive logging
* filename injection
* worker isolation
* cleanup failures

---

## PHASE 10 — UX POLISH

Only after functionality works:

* animations
* micro-interactions
* responsive polish
* accessibility
* keyboard shortcuts
* empty states
* loading states
* success states
* error states
* dark mode
* tooltips

Do not polish broken functionality.

---

## PHASE 11 — PERFORMANCE

Measure:

```text
initial page load
upload start
file inspection
conversion startup
conversion duration
memory usage
CPU usage
queue wait
output validation
download startup
```

Optimize based on measurements.

Do not optimize blindly.

---

## PHASE 12 — FINAL AUDIT

Before declaring EasyConvert complete:

### Product

* [ ] Main conversion flow works
* [ ] No fake functionality
* [ ] Unsupported formats are handled correctly
* [ ] Batch conversion works
* [ ] Large files are handled safely
* [ ] Preview works where supported

### Security

* [ ] Files treated as untrusted
* [ ] No secrets in logs
* [ ] No private document content in analytics
* [ ] Temporary files cleaned
* [ ] Resource limits enforced
* [ ] Worker isolated
* [ ] Filename sanitized
* [ ] Archive attacks considered

### Reliability

* [ ] Retries bounded
* [ ] Timeouts enforced
* [ ] Cancellation handled
* [ ] Output validated
* [ ] Partial failures handled
* [ ] Network failures handled
* [ ] Storage failures handled

### UX

* [ ] Upload is obvious
* [ ] Format detection is clear
* [ ] Progress is honest
* [ ] Errors are actionable
* [ ] Success is clear
* [ ] Download is immediate
* [ ] Mobile works
* [ ] Dark mode works
* [ ] Keyboard navigation works

### Architecture

* [ ] No giant component
* [ ] Conversion engines isolated
* [ ] UI independent from engine implementation
* [ ] Client/server processing abstracted
* [ ] RabbitMQ reused
* [ ] Existing Acklet primitives reused
* [ ] No unnecessary dependencies
* [ ] No duplicated infrastructure

---

# 81. ACCEPTANCE CRITERIA

EasyConvert is NOT complete merely because:

```text
PDF → DOCX works
```

It is complete when the system can reliably answer:

### What happens if the file is invalid?

Handled.

### What happens if the file is huge?

Handled.

### What happens if the connection disappears?

Handled.

### What happens if the worker crashes?

Handled.

### What happens if conversion takes too long?

Handled.

### What happens if the output is corrupted?

Detected.

### What happens if only 8 of 10 files succeed?

Handled.

### What happens if the file contains a digital signature?

Warn appropriately.

### What happens if the browser cannot process the file?

Handled honestly.

### What happens if the user closes the browser?

Server jobs continue or are safely cancelled according to architecture.

### What happens if a malicious file is uploaded?

It is treated as untrusted input and processed within security/resource boundaries.

### What happens if the conversion engine cannot explain the failure?

Show an honest generic error rather than inventing a reason.

---

# 82. THE EASYCONVERT QUALITY BAR

The final product should feel like:

```text
Drop
 ↓
Understand
 ↓
Convert
 ↓
Verify
 ↓
Download
```

not:

```text
Upload
 ↓
Wait
 ↓
Spinner
 ↓
Maybe conversion
 ↓
Download
```

The user should always know:

```text
What happened?
What is happening?
What will happen next?
Is my original file safe?
Can I recover from this?
Can I trust the output?
```

That is the EasyConvert standard.

---

# 83. MOST IMPORTANT RULE

When there is a conflict between:

```text
more features
```

and:

```text
more reliability
```

choose reliability.

When there is a conflict between:

```text
faster implementation
```

and:

```text
safer architecture
```

choose the safer architecture.

When there is a conflict between:

```text
pretty UI
```

and:

```text
honest system behavior
```

choose honest system behavior.

When you do not know whether a library supports something:

**STOP.**

Inspect the project, verify the library/documentation, and only then implement it.

Never bluff.

Never create fake capabilities.

Never claim security, privacy, fidelity, local processing, progress, or validation that the implementation cannot prove.

EasyConvert should become a **signature Acklet tool because users can trust what it tells them**, not merely because it looks beautiful.

---

# FINAL IMPLEMENTATION COMMAND

Now inspect the existing Acklet codebase and documentation first.

Do not immediately start coding.

First:

1. Identify existing reusable components.
2. Identify installed UI libraries.
3. Identify existing theme tokens.
4. Identify existing file/upload infrastructure.
5. Identify existing RabbitMQ infrastructure.
6. Identify existing worker infrastructure.
7. Identify existing storage abstraction.
8. Identify existing error-handling conventions.
9. Identify existing logging/observability.
10. Identify what conversion engines/dependencies are already available.

Then produce a concise implementation plan mapped to the phases above.

After that, implement EasyConvert incrementally.

Do not rewrite unrelated Acklet code.

Do not introduce duplicate infrastructure.

Do not add dependencies without justification.

Do not modify other tools such as JSONLens unless a shared infrastructure change is genuinely required.

Keep EasyConvert's concerns isolated.

The final result must feel like:

**Acklet's own premium conversion workspace — not a clone of iLovePDF.**
