# Online Clipboard Tool

## Overview
The **Online Clipboard** tool allows users to share text, links, and files across devices in real time with end-to-end optional encryption and responsive layout integration.

## Key Features & UI Structure
- **Top Strip**:
  - Displays the active **Clipboard ID** (short alphanumeric code).
  - Inline editing with uniqueness verification: users can click the edit pencil icon to set a custom unique room name (e.g. `my-test-room`), which validates and updates the room and session seamlessly.
  - Active session persistence in device storage (`localStorage['acklet_clipboard_active_code']`) so closing and reopening the browser restores the active session without loss.
  - Seamless path variable routing (`/${code}`) without fragment hashes.
  - Centered and visually balanced action links: "Copy link" and "New clipboard" with clean spacing.
  - Modern join code input in the tab row with key prefix icon, monospace typography, clear button, and arrow open action.
  - Live status indicator (real-time sync indicator).
- **Tabs**:
  - **Modern Segmented Pill Navigation**: Housing **Text & Links** and **Files & Images** tabs with smooth state transitions, balanced 16px Lucide icons, dynamic file count badges, and dedicated dual-theme contrast styling.
  - **Text & Links**:
    - Automatic multi-URL detection: automatically identifies all valid `http://` and `https://` URLs, strips trailing sentence punctuation, and renders clickable chips above the editor with `target="_blank"` and `rel="noopener noreferrer"`.
    - Real-time refresh with dedicated spinning animation, concurrent request prevention, and confirmation dialog if local unsaved edits are present.
    - Full undo support for text clearing.
  - **Files & Images**:
    - Integrated file library supporting drag-and-drop, filter categories, search pill, grid/list view toggling, and multi-file downloads.
    - SHA-256 client-side content hashing for deduplication: skips redundant uploads of identical files within the same clipboard room.
    - 4-way deterministic sorting (`Newest first`, `Oldest first`, `Name A–Z`, `Largest first`) with stable secondary ID tiebreakers.
- **End-to-End Encryption (E2EE)**:
  - Enabled by default using Web Cryptography API (`AES-GCM-256`).
  - 12-byte random initialization vector (IV) generated per payload with 128-bit authentication tag.
  - Keys are generated client-side and transferred strictly via URL query parameters (`?key=...`) or QR codes.
  - Zero-knowledge backend: the server receives only ciphertext blobs and never sees plaintext content or cryptographic keys.
  - Clipboard room isolation: switching clipboards completely cleans caches, active selections, and state.
- **Payload Capacity & File Handling**:
  - Unlocked 50 MB text payload ceiling and 500 MB total clipboard capacity.
  - Manual, reliable saving via Save button with dirty-state indicator ("Unsaved changes" / "All changes saved") preventing unexpected background writes.
  - Dedicated **Paste** button next to **Copy** in the text action row, allowing direct one-click pasting from the system clipboard.
  - Granular **History Management**: Individual clipboard history records can be removed on demand via a delete icon without wiping unrelated clipboard history; history persists reliably across page refreshes and browser sessions.
  - Unified **Files & Media** tab with high-contrast dual-theme "Add files or media" empty state button ensuring full visibility on hover across both Light and Dark themes.
  - Clean URL address bar (`/<code>`) keeping encryption keys out of browser history and query strings; keys stored securely in client storage and sent encrypted in payload bodies.
  - Native clipboard paste flow (`navigator.clipboard.read()` and `window:paste`) for direct pasting of images, screenshots, and text snippets into the file library.
  - Unsaved edit protection via `window:beforeunload` and custom Acklet confirmation dialogs.
  - Non-existent clipboard detection & recovery: navigating to or joining a clipboard code that does not exist or has expired displays an Acklet confirmation dialog alerting the user that the code was not found and offering a one-click option to start a fresh clipboard.
  - Dynamic Button Loading Feedback: All switching, joining, and creation buttons ("Join", "New clipboard", and History item rows) display circular micro-spinners and are disabled while asynchronous operations are running to prevent duplicate submissions and provide clear visual feedback.
  - Configurable auto-delete retention policy defaulting to **7 Days** (with **15 Days** and **1 Month / 30 Days** options), enforced and cleaned automatically by the backend.
- **Surface & Design System**:
  - Purposeful micro-animations: All modals (Settings, QR, Confirmation Alert, Details Sheet, Drawer) feature smooth backdrop fade (`tsBackdropFadeIn`) and spring entrance scaling (`modalEnter`), and the Join button transitions dynamically (`tsButtonPop`) when input is provided.
  - Image preview lightbox with prominent **"Close Preview"** button and quick-dismiss navigation for seamless desktop and mobile inspection.
  - Distinct active sub-filter chips: Active filters ("All", "Images", "Files") use a filled brand accent pill with dedicated count pill badges, making active category state immediately recognizable.
  - Clean borderless file cards and selection states: Replaced harsh borders with soft elevated accent rings (`box-shadow: 0 0 0 2px var(--accent)`), maintaining clean borderless surfaces in both Light and Dark themes.
  - Animated item deletion: Selected files smoothly scale down and fade out (`cardDeleteExit` / `rowDeleteExit`, 220ms ease) before removal, with full undo capability via the floating toast.
  - Ambient soft focus ring and borderless resting state.
  - Complete Lucide icon integration for all toolbars, view toggles, filters, and file categories.
  - Viewport-locked layout (`100dvh` / `100vh`) keeping the entire workspace within view with internal scrolling containers.
  - Full dual-theme high contrast support (Light & Dark) on all dialogs, action buttons, and hover states.

For complete design system tokens and component architecture, refer to [ui-design-system.md](file:///Users/ayaz/Acklet/docs/ui-design-system.md).
For backend integration, CORS headers, and real-time synchronization tracing, refer to [integration-and-reliability.md](file:///Users/ayaz/Acklet/docs/integration-and-reliability.md).
For verification commands and test layers, refer to [verification-guide.md](file:///Users/ayaz/Acklet/docs/verification-guide.md).
