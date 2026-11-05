# Temporary Email — Implementation Log

## Milestones Completed

1. **Design Tokens & Accent Integration**:
   - Added canonical `[data-accent="violet"]` palette in `client/packages/tool-shell/src/styles/tokens.css` for both dark (`#8B5CF6`) and light (`#7C3AED`) modes, passing WCAG AA contrast.
   - Mapped `inbox` in `ts-icon-map.ts` using `LucideInbox`.

2. **Tool Registry & Manifest Registration**:
   - Created `TEMP_EMAIL_MANIFEST` in `client/packages/tool-registry/src/manifests/temp-email.manifest.ts`.
   - Registered `temp-email` and `temp-mail` aliases in `tools.manifest.ts`.
   - Added routing entries in `client/src/app/app.routes.ts` (`/temp-email`, `/temp-mail`, `/tools/temp-email`, `/tools/temp-mail`).
   - Registered `tool-temp-email` application in `client/angular.json`.

3. **Core Services Implementation**:
   - `TempEmailApiService`: Interacts directly with `https://api.mail.tm` REST endpoints (`/domains`, `/accounts`, `/token`, `/messages`, `/me`).
   - `TempEmailOtpService`: Heuristic OTP pattern recognition engine and verification link detector.
   - `TempEmailStorageService`: LocalStorage persistence for multiple inboxes, auto-cleanup of expired accounts, and secure password generation.
   - `TempEmailService`: Orchestrates reactive signals, auto-refresh countdown, and error management.

4. **Component Hierarchy**:
   - `AddressBarComponent`: Prominent monospace email address display, 1-click copy, multi-inbox switcher, and action buttons (never hidden on hover!).
   - `InboxListComponent`: Search input, filter pills (All, Unread, With OTP, With Attachments), loading skeleton, and message cards with direct OTP chips.
   - `EmailViewerComponent`: Standout VIP OTP hero banner, verification link quick-action row, sandboxed iframe HTML viewer with tracking protection, and raw text export.
   - `CustomAddressModalComponent`: Custom username selection on active domains.
   - `QrModalComponent`: QR code generation via `qrcode` for cross-device mobile sharing.

5. **Subdomain Routing & Bootstrap Integration**:
   - Fixed entry point dispatch in `client/src/main.ts` to recognize `temp-email.localhost`, `temp-mail.localhost`, `/temp-email`, and `?tool=temp-email`.
   - Updated manifest subdomain from `mail` (a reserved network subdomain) to `temp-email` in `client/packages/tool-registry/src/manifests/temp-email.manifest.ts`.
   - Mapped `temp-email` and `temp-mail` icons in `client/src/app/shared/components/icon/icon.ts` and `client/packages/tool-shell/src/components/icon/ts-icon-map.ts`.

6. **Verification & Build**:
   - Built application via `npx ng build tool-temp-email` (compiled successfully with 0 errors).
   - Glass design constraints verified via `node scripts/check-glass.mjs` (PASSED).
   - Tool Shell and Portal isolation verified via `node scripts/check-shell-isolation.mjs` (PASSED).
   - Full tier A suite verified via `node scripts/verify.mjs -A` (PASSED in 8.07s).
   - 30/30 unit tests passing (Vitest).

7. **Light-Theme Contrast & 100vh Viewport Containment**:
   - Resolved ViewEncapsulation scope limitation by pairing `:host-context([data-theme="light"])` with `[data-theme="light"]` across all components (`AddressBarComponent`, `InboxListComponent`, `EmailViewerComponent`, `CustomAddressModalComponent`, `QrModalComponent`).
   - Fixed white-on-white text issues: email address, buttons, search input, filter pills, and empty state cards now feature `#0F172A` / `#1E293B` text and `#CBD5E1` borders in light theme, exceeding WCAG AA contrast (18:1).
   - Removed secondary footer content from `temp-email.component.html` and pinned layout with `height: 100%`, `min-height: 0`, and `overflow: hidden` on all root and column containers, strictly containing the 3 components (`app-address-bar`, `inbox-column`, `viewer-column`) within `100vh` without page-level scrolling.

8. **Structured Responsive Cards & Cross-Device Empty States**:
   - Replaced temporary static pixel heights (`height: 430px` on `.inbox-empty-card` and `height: 540px` on `.viewer-empty-state`) with dynamic flexbox containment (`flex: 1 1 0%`, `height: 100%`, `box-sizing: border-box`, `min-height: 0`).
   - Defined `:host` flex column containment on both [`InboxListComponent`](file:///Users/ayaz/Acklet-Temp-Tools/client/apps/tool-temp-email/src/components/inbox-list/inbox-list.component.ts) and [`EmailViewerComponent`](file:///Users/ayaz/Acklet-Temp-Tools/client/apps/tool-temp-email/src/components/email-viewer/email-viewer.component.ts) so cards stretch evenly side-by-side on all screens.
   - Implemented responsive device breakpoints: Ultrawide (1440px+, 420px list), Desktop (1200px+, 380px list), Medium Laptops (861px–1200px, 340px list), Tablets/Mobile (<860px master-detail stack with back-navigation).
   - Added height-adaptive media query (`max-height: 700px`) scaling down padding and icon envelopes for compact vertical viewports.

9. **MCP Configuration, Postman CLI & API Integration Hardening**:
   - Configured Mail.tm remote SSE/HTTP MCP server in `~/.gemini/config/mcp_config.json` with endpoint `https://docs.mail.tm/mcp`.
   - Installed Postman CLI (`v1.86.0`) globally and initialized the workspace repository using `postman init --yes`.
   - Created reusable Postman environment [`postman/environments/mailtm.environment.json`](file:///Users/ayaz/Acklet-Temp-Tools/postman/environments/mailtm.environment.json) and test collection [`postman/collections/mailtm-api-test.collection.json`](file:///Users/ayaz/Acklet-Temp-Tools/postman/collections/mailtm-api-test.collection.json).
   - Executed Postman CLI test suite: 6/6 requests and 11/11 assertions passed across domains, account creation, token generation, profile retrieval, inbox messages, and account deletion.
   - Generated live account and validated JWT bearer token, securely appending credentials to `.env` (git-ignored, never exposed in code/logs/responses).
   - Added `/mail-api` reverse proxy in `client/proxy.conf.json` with `changeOrigin: true` to eliminate browser CORS blocks.
   - Completely scrubbed vendor/third-party mentions from all user-facing UI messages, dialogs, and errors, ensuring neutral, negotiable messages ("Temporary email service is temporarily unavailable. Please try again in a moment.").

10. **Active Mailbox Dropdown, Mobile Single-Row Bar, and Session Recovery**:
    - **Active Mailbox Dropdown**: Converted top multi-inbox tab strip into an integrated dropdown selector right on the disposable address bar with interactive open/close chevron icon (`chevron-down` / `chevron-up`) and count badge (`2/5`).
    - **Single-Line Address Display**: Enforced `white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis; word-break: keep-all;` preventing text wrapping of email domain suffixes (e.g., `...fldubai.c` / `om`).
    - **Mobile 1-Row Action Buttons**: Grouped all 5 action buttons (`Refresh`, `Custom`, `New`, `QR Code`, and `Delete`) into a responsive 5-column grid (`display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))`) on mobile (≤640px), hiding button text and showing only icons (+ countdown badge) so Delete is never broken onto a second line.
    - **Mobile Icon-Only Copy Button**: Replaced "Copy" text with icon-only action on small viewports (`.hide-on-mobile-copy-text`) to preserve maximum horizontal width for the address.
    - **Session Expiry & 401 Auto-Recovery**: Replaced special-character password generation with clean 16-character alphanumeric tokens (`[a-zA-Z0-9]`), preventing JSON parsing and backend auth rejects. Added retry backoff in `getToken`, auto-purge of invalid tokens from `localStorage`, and automatic zero-click provisioning of fresh mailboxes upon session expiration without stranding the user.
    - **Copy Code & Dropdown Button Hover Contrast**: Ensured OTP copy chips, the multi-inbox toggle button (`.inbox-dropdown-toggle-btn`), and the address copy badge (`.copy-indicator-badge`) maintain high-contrast styling (`#EDE9FE` background with `#6D28D9` text in Light Mode idle state; `#7C3AED` background with `#FFFFFF` text on hover/active states) with `!important` overrides and `.btn-accent-chip` class exemptions, preventing global shell styles from stripping backgrounds or washing out text on hover.

11. **Single Centered Workspace, Reliability Safeguards, and Retention Quick Wins**:
    - **Single Centered Workspace (List-then-Preview)**: Eliminated the cramped two-column split and removed the "No Email Selected" empty state. Designed a centered card container (`max-width: 880px`) with clean whitespace on wide monitors. Clicking an email opens the full reading pane in the exact same workspace area; a prominent, permanently visible `← Back to Inbox` button returns the user to the list while keeping scroll position, search queries, and active filters intact via visibility toggling.
    - **Address Expiry Countdown & Extension**: Added an interactive countdown pill (`Expires in 23h 45m`) with an `[Extend]` (+24h) action and `[New]` renewal fallback upon expiration.
    - **Browser Alerts & Chime Notifications**: Placed the user-provided audio chime in `/assets/sounds/notification.mp3` with a local mute toggle. Implemented Web Notifications API with sender, subject, and extracted OTP context, requested strictly after user gesture ("Enable alerts").
    - **Privacy Reset ("Wipe Everything")**: Added a safe data-clearing action inside the address dropdown with a confirmation modal (`WipeDataModalComponent`) removing all inboxes, tokens, and cached messages from the browser.
    - **Link Destination Inspector & Phishing Warning**: Intercepted email links inside the sandboxed iframe and routed them through `LinkPreviewModalComponent`, displaying destination hostname, full URL, phishing alerts for deceptive anchor text, and actions to copy or open in a new tab.
    - **Search Filters with Dynamic Counts**: Added real-time badge counts across all filter tabs: `All (N)`, `Unread (N)`, `With OTP (N)`, `Has Link (N)`, and `Attachments (N)`.
    - **Multi-Tab Sync & Leader Election**: Used `BroadcastChannel('acklet_temp_email_sync')` with automated leader election so only one tab polls the provider at a time, completely preventing rate-limit burnout across multiple open windows.
    - **Pluggable Provider Architecture & Latency Monitor**: Established `ITempEmailProvider` interface for seamless future backend swaps, accompanied by non-blocking status alerts (`slow`, `rate-limited`, `unavailable`) that auto-clear on recovery.


12. **Custom Inbox Availability Pre-Check, Suggestion Chips, and Light-Mode Hover Polish**:
    - **Custom Address Taken/Conflict Detection**: Enhanced `TempEmailApiService.handleError` to parse Mail.tm's RFC 7807 / Hydra JSON-LD 422 responses (`hydra:description: "address: This value is already used."`, `violations[0].message`). When a username is already taken, it now resolves directly to a friendly, informative message: `"This email address is already in use. Please choose a different username."`.
    - **Inline Modal Taken Alert & Suggestion Chips**: `CustomAddressModalComponent` intercepts duplicate address creation errors in-situ rather than allowing global red error banners to flash behind the dialog. It immediately resets `isSubmitting: false`, displays an inline `.taken-alert-card` with an informative warning, and generates 3 dynamic, available alternatives (e.g., `user-482`, `user.26`, `user-box`). Clicking any chip immediately populates the input and clears the conflict state.
    - **Local Active Inbox Pre-Check**: Added an instant pre-check in `CustomAddressModalComponent` and `TempEmailService.createCustomAccount` verifying whether the desired username and domain combination is already active in the user's local multi-inbox list before making an unnecessary network request.
    - **Light-Mode Button Hover Contrast & Suggestion Chips**: Fixed hover state wash-out on `Create Inbox` (`CustomAddressModalComponent`), `Extend` (`AddressBarComponent`), and custom username suggestion chips (`.suggestion-pill-btn`). Added `.btn-accent-chip` class exemptions and explicit `!important` backgrounds and text colors:
      - **Idle State**: High-contrast solid `#FFFFFF` pill with `#7C3AED` (1.5px) border and `#6D28D9` text (contrast ratio > 7:1) in Light Mode, crisp against the `#FEF2F2` conflict card.
      - **Hover State**: Vibrant `#7C3AED` solid background with `#FFFFFF` text and glowing elevation (`box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35)`), completely overriding global shell `.ts-root button:not(...):hover` transparent background resets.
    - **Centered Layout Spacing**: Added top padding (`10px`) to `.temp-email-centered-shell`, increased hero card internal padding to `16px 20px`, and adjusted badge gaps for clean optical balance.

---

## Related Documents
- [README.md](../README.md) — Tool Overview.
- [../2-Implementation/service-design.md](../2-Implementation/service-design.md) — Architectural design.

