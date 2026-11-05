# Temporary Email — Service Design & Architecture

## System Architecture

```text
[Browser User]
     │
     ├──> [TempEmailComponent] (Single-Column Centered Shell, max-width: 880px)
     │         ├── [AddressBarComponent] (Address display, dropdown inboxes, expiry pill, alert toggles)
     │         ├── [InboxListComponent] (Search, filters with counts, non-blocking status banner)
     │         │       └── [Replaced in same workspace area when message opened]
     │         ├── [EmailViewerComponent] (Back to inbox button, authentic HTML iframe, link inspector)
     │         ├── [CustomAddressModalComponent] (Custom alias generator)
     │         ├── [QrModalComponent] (QR code mobile pairing)
     │         ├── [LinkPreviewModalComponent] (Phishing warning & link preview)
     │         └── [WipeDataModalComponent] (Privacy wipe reset)
     │
     └──> [TempEmailService] (Signal Store & Multi-Tab Sync via BroadcastChannel)
               ├── [TempEmailStorageService] (localStorage: multi-inbox, preferences, expiry)
               ├── [TempEmailOtpService] (Regex & heuristic scanner, link analysis)
               └── [ITempEmailProvider] (Provider Abstraction Interface)
                         │
                         ├──> [TempEmailApiService] (Primary: Mail.tm client)
                         └──> [Future Fallbacks: GuerrillaMail / 1secmail / Custom SMTP]
```

## Single Centered Workspace Architecture (List-then-Preview)
- **Problem**: Previous side-by-side two-column layouts compressed both the inbox message cards and the email reading pane on standard desktop displays, while presenting a redundant "No Email Selected" empty state.
- **Solution**: A centered single-column workspace container constrained to `max-width: 880px` with generous whitespace on ultrawide and desktop screens.
  - The inbox list occupies the centered workspace by default.
  - Clicking any email card opens the full authentic HTML viewer in the *exact same centered space*, replacing the list view.
  - A prominent, permanently visible `← Back to Inbox` button at the top of the viewer allows instant return to the list.
  - The list DOM is preserved via CSS visibility toggling (`[class.is-hidden]`), strictly maintaining user scroll position, search queries, and active category filters when navigating back and forth.
  - Mobile viewports follow this identical master-detail workflow seamlessly.

## Pluggable Provider Architecture & Fallback Plan
To eliminate single-provider vulnerability, all network communications are decoupled from the UI via the `ITempEmailProvider` interface:

```typescript
export interface ITempEmailProvider {
  readonly providerId: string;
  readonly providerName: string;
  getDomains(): Promise<MailDomain[]>;
  createAccount(address: string, password?: string): Promise<{ id: string; address: string; createdAt: string }>;
  getToken(address: string, password?: string): Promise<{ token: string; id: string }>;
  getMessages(token: string, page?: number): Promise<{ messages: MessageSummary[]; totalItems: number }>;
  getMessage(token: string, messageId: string): Promise<MessageDetail>;
  deleteMessage(token: string, messageId: string): Promise<void>;
  deleteAccount(token: string, accountId: string): Promise<void>;
  markAsSeen(token: string, messageId: string): Promise<void>;
}
```

### Multi-Provider Strategy & Fallback Options
1. **Primary Provider: Mail.tm (`TempEmailApiService`)**:
   - Modern RESTful JSON API with automatic TLS, MIME attachments, and domain rotation.
   - Throttled at 30 requests/minute. Protected with leader-election multi-tab syncing and exponential backoff.
2. **Secondary Fallback 1: GuerrillaMail**:
   - Mature fallback option supporting custom addresses, immediate message polling, and zero authentication requirement.
   - Ideal when IP-based rate limiting or temporary DNS blacklisting affects primary domains.
3. **Secondary Fallback 2: 1secmail**:
   - Ultra-lightweight JSON endpoint for address generation and message retrieval without session creation.
4. **Self-Hosted SMTP / Cloudflare Email Worker (Long-term Strategy)**:
   - Acklet Cloudflare Worker with Email Routing directing temporary mailboxes into a private Redis/PostgreSQL queue, offering 100% provider independence and unlimited throughput.

## Multi-Tab Synchronization & Leader Election
- All open browser tabs join the `acklet_temp_email_sync` `BroadcastChannel`.
- **Leader Election**: Tabs periodically emit heartbeats. Only the designated leader tab performs background polling against the provider API.
- All follower tabs receive real-time state updates (`SYNC_INBOXES`, `SYNC_MESSAGES`, `WIPE_ALL`) from the leader, eliminating duplicate polling requests and preventing rate-limit exhaustion across multiple tabs.

## Security & Privacy Protections
1. **Sandboxed Authentic HTML Rendering**:
   - Uses an isolated `<iframe>` with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` (strictly omitting `allow-same-origin` and `allow-forms`).
   - Because `allow-same-origin` is omitted, the iframe executes in an opaque `null` origin, completely blocking access to parent window, `document`, `localStorage`, cookies, session tokens, and application state.
   - All external `<script>` and `on*` event handlers from email senders are removed during HTML sanitization.
2. **Link Inspection & Phishing Warning**:
   - Email links are intercepted inside the sandboxed iframe and communicated to the parent via `postMessage`.
   - `LinkPreviewModalComponent` displays the destination domain, full URL, phishing mismatch warnings (when anchor text claims one domain while `href` points elsewhere), and options to Copy Link or Open in New Tab.
3. **Privacy Reset (Wipe Everything)**:
   - A dedicated wipe option in the address dropdown allows immediate clearing of all active inboxes, message caches, credentials, and settings from browser `localStorage` with a confirmation safety modal.
4. **Automatic Image Loading & CID Resolution**:
   - Displays embedded and remote images automatically to preserve authentic email appearance.
   - Resolves inline `cid:` image references against MIME attachments, asynchronously converting binary blobs into high-speed inline Base64 data URLs.
   - Neutralizes invisible 1x1 tracking beacons and 0x0 hidden beacons without distorting visible email layouts.
5. **Non-Intrusive Quick-Copy OTP Strip**:
   - Extracted OTP verification codes appear in a sleek header pill outside the email body with a one-click copy button.

---

## Related Documents
- [README.md](../README.md) — Tool Overview.
- [../0-Requirements/requirements.md](../0-Requirements/requirements.md) — Requirements specifications.
- [../1-Progress/implementation-log.md](../1-Progress/implementation-log.md) — Implementation progress.
- [../3-Reference/faq.md](../3-Reference/faq.md) — Technical FAQs.

