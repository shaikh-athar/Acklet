# AirVault — Baseline Features & Product Requirements

## 1. Product Overview
AirVault is a secure, cross-device clipboard synchronization tool within the Acklet workspace ecosystem. It enables friction-free text, URL, and code sharing between a user's paired personal devices (laptops, desktops, mobile phones, tablets) with real-time transport, offline fallback, and privacy controls.

## 2. Target User & Core Promise
> **"Copy something on one device, access it on another connected device with minimal friction and zero ambiguity."**

AirVault prioritizes:
- **Instant Speed:** Minimal latency for active peer synchronization.
- **Clarity & Spatial Awareness:** Clear visibility into which devices are connected, syncing, or offline.
- **Privacy & Control:** Auto-sync pause, sensitive data exclusion, and instant device revocation.

---

## 3. Baseline Feature Matrix

| Feature ID | Feature Name | Description | Baseline Scope |
| :--- | :--- | :--- | :--- |
| **AV-01** | User Identity & Scoping | User session binding and device tenancy. | Bound to Acklet user identity; devices belong to user account room. |
| **AV-02** | Device Pairing & Registration | Connect new desktop, phone, or tablet. | 6-digit one-time code + QR code pairing + session inherit on same browser. |
| **AV-03** | Device Management & Lifecycle | View, rename, monitor, and revoke devices. | Full lifecycle: `Unregistered` -> `Pairing` -> `Connected (Active/Idle)` -> `Offline` -> `Revoked`. |
| **AV-04** | Clipboard Capture & Ingestion | Detect or stage content for synchronization. | Web Clipboard API capture (with user permission) + Direct manual staging. |
| **AV-05** | Real-Time Sync & Loopback Guard | Broadcast clipboard events to peer devices. | SHA-256 deduplication, origin device tagging, sync loop prevention. |
| **AV-06** | Live Clipboard Experience | Prominent hero card showing current synchronized item. | Live status badge, source device metadata, 1-click copy, delivery status. |
| **AV-07** | Clipboard History & Types | Browse past synchronized items. | Tagged by type (`plain-text`, `url`, `code`, `rich-text`), search, filter, and delete. |
| **AV-08** | Manual Target Send | Push content explicitly to specific device(s). | Device selector modal/action, targeted broadcast, delivery acknowledgment. |
| **AV-09** | Offline Queue & Recovery | Resilience when devices lose connectivity. | Local Outbox queue, automatic flush upon reconnection with conflict ordering. |
| **AV-10** | Privacy & Settings | Security controls and clipboard policies. | Auto-sync toggle, password/token auto-masking regex, history clear. |

---

## 4. Supported Content Types (Baseline)

1. **Plain Text:** Raw multiline strings, notes, numbers, unformatted text.
2. **URLs:** Validated web links, deep links (with quick "Open in new tab" contextual action).
3. **Code Snippets:** Detected programming language snippets with formatted monospace display.
4. **Rich Text / Formatted Markdown:** Markdown or formatted text blocks.

*(Note: Heavy binary file and large image transfer is scheduled for Phase 2 expansion).*
