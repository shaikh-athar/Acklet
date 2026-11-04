# Temporary (Expiring) QR Codes — Architecture & Specification

## Overview
Temporary QR Codes allow users to generate verifiable QR codes that expire automatically after a set duration (e.g. 15 minutes, 1 hour, 6 hours, 24 hours, 7 days, 30 days, or a custom duration up to 365 days).

This capability is housed exclusively inside **QR Code Generator** (`tool-qr-generator`), keeping Acklet's tool identities clean and separated from industrial barcode formats (which reside in `tool-barcode-generator`).

## Architectural Highlights
- **Preserved Native Content Pipeline**: When "Temporary QR code" is enabled, user content is never replaced or diverted. All QR types (URL, vCard, Text, Wi-Fi, Phone, Email, Location, Calendar, etc.) and their standard input panels remain fully active and editable. Toggling Temporary ON merely introduces the compact "Expires after" configuration section directly below the toggle switch.
- **Server-Side Expiry Enforcement**: Expiry is calculated and verified on the server using UTC timestamps. Tokens and verifiable links cannot be validated purely in the browser.
- **Preview Panel Integration**:
  - Live preview renders the authentic QR code encoding the user's real content at all times.
  - Primary button dynamically displays "Create temporary QR code" when temporary mode is on, switching to "Download PNG" / standard export once created or when temporary mode is off.
  - After creation: Renders the verified code with a live countdown chip ("Expires in 59 min"), unlocks Download (PNG/SVG) and Print, and provides a direct "View in dashboard" action.
  - History and Share are hidden/disabled for temporary codes (the dashboard is the record of truth).
- **Temporary Tab as Dashboard**:
  - The Temporary tab serves as a dedicated full-width dashboard to view, search, filter, and manage all temporary codes created on the device.
  - Live status counters: Active, Expiring soon, Expired.
  - Toolbar uses canonical custom popover dropdowns (`Status` and `Sort`) matching the Acklet Design System, replacing native browser select controls with dual-theme high-contrast menus.
  - Desktop view: Responsive data table with Name, Type, Content, Expiry, Status, and Actions (Extend, Copy link, Open check page, Download, Rename, Expire now, Delete).
  - Mobile view: Mobile-friendly card list with touch-friendly action pills.
  - Interactive modals for Extending (+1h, +6h, +24h, +7d, +30d) and Renaming.

## Simplification & Streamlining (What Was Removed and Why)
In earlier iterations, enabling Temporary mode replaced the primary content inputs with an alternate creation form ("Show when checked", "Message text", and "Encode as") and swapped the live preview with a placeholder sample. This added unnecessary complexity and prevented expiring codes from encoding native formats like vCards, Wi-Fi credentials, or formatted URLs.

### What Was Removed:
1. **"Show when checked" Selection (Message / Link / Reference only)**: Removed because content should come directly from the user's selected QR type, not a secondary verification choice.
2. **"Message text" Box (0/500)**: Removed because users define their payload in the primary input panel.
3. **"Encode as" Mode (Link / Code)**: Removed; temporary codes cleanly use verification-backed links while retaining native content.
4. **"Sample layout" Badge & Banner**: Removed; the preview always displays the real, live QR code.
5. **Standing Connection Warning Banner**: Removed from the idle preview panel. Network/connection errors are now surfaced as clear notifications only when the user clicks "Create temporary QR code".

### Why:
- **Zero Content Mutation**: A URL stays a URL, a vCard stays a vCard, and Wi-Fi stays Wi-Fi. The tool only adds an expiration deadline.
- **Predictable Workflow**: The user selects a type, enters data, styles the QR code, chooses an expiry preset (or custom date/duration), and generates the temporary QR code in a single seamless flow.
- **Security & Privacy**:
  - Content is encrypted at rest using AES-256-GCM.
  - Codes are permanently deleted from storage after expiry by the backend purge job.
  - Owner tokens (`X-Owner-Token`) are persisted in browser `localStorage` (`acklet_qr_owner_token`) to authorize owner management actions (extend, expire now, rename, delete).
- **Dual-Theme High Contrast**:
  - Full support for both Light and Dark modes adhering to Acklet Design System tokens (`client/packages/tool-shell/src/styles/tokens.css`) and WCAG AA contrast standards ($\ge 4.5:1$).
  - Semantic CSS variables (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`) used throughout with zero hardcoded hex values.

## Launch Icon (`arrow-up-right`) Specification

To avoid misleading indicators, launch icons are displayed strictly for **redirectable / external actions** that open an app, browser, or protocol handler on scan. Static on-device data formats do not display a launch icon.

### Classification Matrix:

| Category | QR Content Types | Shows Launch Icon? | Rationale |
| :--- | :--- | :---: | :--- |
| **Launchable / Redirectable** | `URL`, `Email`, `Phone`, `SMS`, `Location`, `Calendar Event`, `Social Profile`, `App Store`, `Crypto Wallet` | **Yes** (`arrow-up-right`) | Scanning directly launches a browser, dialer, messaging client, map app, calendar application, or cryptocurrency wallet. |
| **Non-Launchable / Direct** | `Text`, `Wi-Fi`, `vCard` | **No** | Consumed locally by the device (plain text read, local Wi-Fi credential connection, local address book import). Does not redirect or open external web/app pages. |

### Application Surfaces:
1. **Type Selector Dropdowns**: Displays `arrow-up-right` adjacent to the item title in both desktop and mobile dropdowns. The dropdown trigger pill also dynamically reflects the launch icon when an external type is selected.
2. **Mobile Summary Badges**: The compact type indicator badge in mobile view displays the launch icon only when the selected type is launchable.
3. **Temporary Tab Dashboard**: In the temporary codes table and card lists, the `Type` format pill and the "Check page" external link button appear only for launchable/redirectable content.

## Related Documents
- [QR Generator Overview](README.md)
- [Barcode Generator Temporary Codes](../Barcode-Generator/temporary-codes.md)
