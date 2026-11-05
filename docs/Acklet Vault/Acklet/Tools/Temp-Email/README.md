# Temporary Email Generator & Inbox — Acklet Tools

## Overview
**Temporary Email by Acklet** is a modern, responsive, privacy-focused disposable email generator and real-time inbox. It enables users to create instant throwaway email addresses, receive messages with configurable auto-refresh, safely inspect HTML emails with tracking protection, and automatically extract OTP verification codes and confirmation links with one-click access.

Powered by the **Mail.tm API** (https://docs.mail.tm/), the tool operates 100% serverlessly from the Acklet backend perspective, communicating directly and securely from client browser sessions with zero server storage costs.

---

## Key Features & Capabilities

### 1. Instant Disposable Email Generation
- Automatically creates a fresh, valid temporary email on initial page load.
- Seamless multi-domain support from available Mail.tm domains.
- Monospace address display with one-click copy and instant visual feedback.
- Custom address creation modal to choose custom usernames (e.g. `test.workflow@domain`).

### 2. Smart OTP Extractor
- Automatic detection of 4–8 digit verification codes and one-time passwords (OTPs).
- Non-intrusive subtle OTP quick-copy strip in the email viewer with monospace digits and one-click copy.
- Direct OTP chips on inbox list cards for instant copying without opening the email.

### 3. Multiple Concurrent Inboxes & Dropdown Selector
- Manage up to 5 concurrent temporary inboxes simultaneously.
- Integrated directly into the address bar as an active inbox selector with open/close chevron icons (`chevron-down` / `chevron-up`) and count badge.
- Persisted securely in browser `localStorage`.
- Switch seamlessly between addresses via the dropdown or delete secondary inboxes without affecting the active one.

### 4. Authentic HTML Sandboxed Rendering & Image Resolution
- Renders emails in authentic original HTML format by default within an isolated, sandboxed `<iframe>` (`sandbox="allow-popups allow-popups-to-escape-sandbox"`), preventing script execution and CSS style bleed.
- Automatically resolves inline `cid:` image references to MIME attachments using high-speed Base64 data URLs.
- Seamless fallback to typography-formatted plain text with linkified URLs when an email has no HTML body.
- Automatic tracking beacon neutralization without distorting visible email layouts.

### 5. Configurable Auto-Refresh & Countdown
- Real-time periodic refresh options: 5s, 10s, 15s, 30s, or manual.
- Visual countdown badge displaying seconds until next check.
- Page Visibility API integration: pauses refresh countdown when the browser tab is hidden to conserve API quota, and refreshes immediately when the tab is focused.

### 6. Mobile-Optimized Single-Row Layout
- Disposable address bar guarantees single-line text without domain wrapping (`cyber-eagle-211@fldubai.com`).
- On mobile (≤640px), copy action switches to an icon-only button to maximize address room.
- All 5 action buttons (`Refresh`, `Custom`, `New`, `QR Code`, `Delete`) fit neatly in one single row on mobile devices via a responsive 5-column grid.

### 7. Cross-Device QR Sharing
- In-browser QR code generation powered by `qrcode`.
- Allows instant transfer of temporary email addresses to mobile devices.

### 8. Full Dual-Theme High Contrast & Session Self-Healing
- Built with canonical Acklet Design System tokens (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`).
- Violet accent palette (`#8B5CF6` dark / `#7C3AED` light) meeting WCAG AA contrast ratio (>= 4.5:1).
- Automatic session self-healing: invalid or expired tokens are cleaned from `localStorage` and replaced with a fresh address automatically without leaving the user stranded.

---

## Related Documentation
- [0-Requirements/requirements.md](0-Requirements/requirements.md) — Specifications and API contract.
- [1-Progress/implementation-log.md](1-Progress/implementation-log.md) — Implementation steps and testing log.
- [2-Implementation/service-design.md](2-Implementation/service-design.md) — Architecture, services, and component tree.
- [3-Reference/faq.md](3-Reference/faq.md) — Technical FAQs and Mail.tm details.
- [../README.md](../README.md) — Acklet Tools Catalog & Directory Index.

