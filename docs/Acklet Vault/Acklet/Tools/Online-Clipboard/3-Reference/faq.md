---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Frequently Asked Questions (FAQ)

## 1. Product & Privacy Questions

### Q: Why is Online Clipboard completely account-free?
**A**: Online Clipboard is engineered for speed, privacy, and friction-free utility. Forcing account creation, passwords, or emails introduces tracking surfaces and slows down routine tasks. A short 5-digit code or QR scan connects your devices immediately.

### Q: How long does my shared content stay available?
**A**: By default, clipboard rooms and all associated files are permanently purged after **7 days** (168 hours). Users can adjust the retention window to **15 days** or **30 days** in the Settings drawer, or manually delete individual items or the entire room immediately at any time.

### Q: Does Acklet track my IP address, read my files, or sell data?
**A**: No. Acklet operates under a strict zero-knowledge, zero-tracking promise. We collect zero analytics, run no advertising networks, and set no tracking cookies. When E2EE is enabled, all payloads are encrypted client-side using AES-GCM-256 before leaving your browser, meaning even server administrators cannot read your content.

---

## 2. Technical & Engineering Questions

### Q: How does client-side End-to-End Encryption work without entering a password?
**A**: When E2EE is active, `ClipboardCrypto` derives a 256-bit AES-GCM key from your 5-digit room code using PBKDF2 (10,000 iterations, SHA-256, static application salt). Because anyone entering the code has the room key, it provides zero-knowledge security against the server and network eavesdroppers. For sensitive workflows, you can also set an optional private PIN in the Settings drawer.

### Q: What happens if an upload drops at 50%?
**A**: Files > 5 MB use the Resumable Chunked Upload Protocol. Slices are written to the server in 5 MB parts. If connection drops, restarting the upload sends the file's SHA-256 hash to `/uploads/init`. The server returns `uploadedChunks: [0, 1, 2, ...]`, allowing the browser to skip the first 50% and resume immediately from the drop point.

### Q: Why are single files capped at 200 MB and total room capacity at 500 MB?
**A**: These quotas balance generous capacity for software distributions, videos, and large datasets against browser memory boundaries and server disk availability. Streaming 200 MB via 5 MB chunks keeps memory overhead low even on resource-constrained mobile devices.

### Q: How does folder uploading work without installing software?
**A**: When you drag an uncompressed folder into the window or select "Upload folder", modern browsers provide recursive directory entries via `webkitGetAsEntry()`. Online Clipboard's internal `ZipBuilder` engine compiles the files into a standard `.zip` archive client-side using the Web Stream Compression API (`deflate-raw`) before streaming it to the upload pipeline.

### Q: What happens if two people edit the text canvas at the exact same time?
**A**: Online Clipboard implements version-based optimistic locking. If User A saves version 2, User B's subsequent attempt to save with `expectedVersion: 1` receives an HTTP 409 Conflict response. The UI presents the **Conflict Resolution Banner**, allowing User B to choose **Keep Mine** (override), **Accept Incoming** (reload), or **Compare Versions** (revisions diff).

### Q: What happens if I close my browser tab before clicking Save?
**A**: Online Clipboard attaches a `window:beforeunload` listener that automatically calls `saveTextOnSuddenExit()`. This dispatches an asynchronous `fetch()` with `{ keepalive: true }`, ensuring your text is committed to the server in the background without triggering disruptive browser modal dialogs.
