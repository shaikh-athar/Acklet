# Acklet URL Shortener — Developer Notes & Architecture Guide

## 1. Backend Service Requirements

The URL Shortener frontend connects to the Spring Boot REST API for persistent short links, server-side encryption/hashing, redirects, analytics, and deactivation.

### Backend Startup Command
To start the backend locally:
```bash
cd server/acklet
./mvnw spring-boot:run
```
The backend starts on `http://localhost:8080`.
The Angular dev server proxy forwards `/api/v1/short-links` to this port.

---

## 2. Unreachable Service & Offline State Handling

When the backend is down (network failure, timeout, ECONNREFUSED, 502/503/504):
1. **Single In-Flight Guard:** Concurrent calls to `getMyLinks()` are deduplicated.
2. **Exponential Backoff:** Up to 2 retries (1s, then 2s) before transitioning to unreachable state. No infinite loops or proxy request spamming.
3. **Calm Banner:** Displays a calm notice at the top of My Links:
   > "Some details can't be loaded right now. Please try again in a few minutes."
   Includes a **Try again** button to manually retry.
4. **Action Disabling:** Server-dependent mutations (*New link*, *Edit*, *Deactivate*, *Reactivate*, *Duplicate*, *Delete*, *Bulk actions*, *Restore*, Home *Shorten* button) are disabled with tooltip explanation:
   > *"Action unavailable while service is unreachable"*
5. **Offline-Safe Actions:**
   - Copy short link (copies link to clipboard)
   - Search & filters (operates on cached links in memory)
   - Sort (in memory)
   - Export CSV (exports currently displayed links)
   - Backup links
6. **Protected Links Handling:** Protected destinations are intentionally omitted from public listing without password unlock. When offline or unreachable, the destination displays `"Not available right now"` with no external link icon.

---

## 3. Dev-Only Sample Preview Mode

To inspect or test all card states without running the backend:
- Pass `?sample=true` in the URL: `http://localhost:4200/links?sample=true`
- Or click **Load sample preview** on the unreachable notice banner in development mode.
- This loads realistic mock links covering:
  - `/nothing` — protected, one-time, limit reached, max 1 click, offline destination placeholder.
  - Active links with high click counts.
  - Expired links.
  - Links with custom labels and tags.

---

## 4. Responsive Breakpoints & Card Architecture

- **Small (`< 600px`):**
  - Toolbar stacks cleanly: Search (100%), Status (50%) & Sort (50%) on row 2, Filters (100%) on row 3. Zero overflow on 320px screens.
  - 1-column structured cards with `grid-template-columns: minmax(0, 1fr) !important;` and `10px` grid padding, strictly preventing CSS track expansion.
  - `.mobile-link-card` enforces `width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden;` with `14px` padding.
  - Single scroll container with safe-area insets (`padding-bottom: max(32px, env(safe-area-inset-bottom, 32px))`).
- **Medium (`600px - 1023px`):**
  - 2-column auto-fit structured card grid (`minmax(280px, 1fr)`).
- **Large (`>= 1024px`):**
  - Full desktop table with un-squeezed columns, missing destination placeholder, and proper pluralization.
- **Card Anatomy & Mobile Fit:**
  - Row 1: Short code (`/code` in monospace bold bronze, truncated with ellipsis) + 38px high-contrast bronze Copy button + 38px 3-dots More menu (both persistently visible in the top-right corner).
  - Row 2: Link icon + original link (with ellipsis, tooltip on link hover only) OR `"Not available right now"` with `min-width: 0; flex: 1; text-overflow: ellipsis;`.
  - Row 3: Label pill (if label present) with text truncation.
  - Row 4: Badges wrapped with 6px gap and compact 3px 8px padding (Status label only, Protected, One-time, Max click(s), Expiry) to prevent blowing card width.
  - Divider line.
  - Row 5: 3-column stats grid (`grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;`): Clicks, Created, and Last visited all visible side-by-side with zero horizontal clipping.

---

## 5. Mobile Dropdowns, Popovers & Stacking Context Architecture

On small screens (`< 600px`), all four dropdown and popover patterns are structured to avoid overflow clipping and stacking context collisions:

1. **Card 3-Dots Action Dropdown (`app-action-dropdown`):**
   - `.mobile-link-card` uses `overflow: visible;` (no `overflow: hidden`) so the action dropdown popup can freely extend downward outside the card boundary.
   - When open, `.mobile-link-card` is elevated to `z-index: 100 !important;` via both `:has(.action-dropdown-host.is-open)` and `[class.is-menu-open]="activeMenuCode() === link.code"`. This prevents sibling cards below in the DOM tree from painting over the open menu.
   - `.action-menu-container` enforces `max-height: min(340px, calc(100dvh - 32px));` and `overflow-y: auto; -webkit-overflow-scrolling: touch;` to guarantee all 6 items (*Copy link*, *Make QR*, *Preview*, *Edit*, *Deactivate*, *Delete*) are reachable and scrollable on any viewport size.
   - `checkFlipDirection()` dynamically flips the menu upward if `spaceBelow < estHeight && rect.top > spaceBelow`.

2. **Status & Sort Filter Dropdowns:**
   - In `.toolbar-filters-row`, Status is in Col 1 and Sort is in Col 2, while the Filters button is on Row 2.
   - When Status or Sort is opened, the parent `.filter-dropdown` is elevated to `z-index: 200 !important;` (via `:has(.filter-menu-popover.is-open)` and `.is-open`), ensuring the dropdown menu paints completely over the Filters button in Row 2 instead of getting clipped underneath it.
   - Positioning on mobile:
     - Status: `left: 0 !important; right: auto !important; transform-origin: top left; min-width: 160px; max-width: calc(100vw - 32px);`
     - Sort: `right: 0 !important; left: auto !important; transform-origin: top right; min-width: 160px; max-width: calc(100vw - 32px);`
   - `.filter-dropdown-backdrop` provides a fixed full-screen dismiss overlay on mobile touch.

3. **Attribute Filters Popover (`.attribute-popover-panel`):**
   - Scoped: Desktop floating 480px popover is enclosed in `@media (min-width: 600px)` inside the toolbar wrapper.
   - Mobile: Under `@media (max-width: 599px)`, the bottom sheet is rendered at the root template level (`.mobile-filter-drawer-backdrop` and `.mobile-filter-drawer-surface`) via a shared `<ng-template #attributeFiltersContent>` with `<ng-container *ngTemplateOutlet="...">`.
   - **Containing-Block Isolation:** Rendering at the component root prevents CSS `backdrop-filter: blur(...)` and card transforms on `.links-unified-card` from creating an accidental containing block that traps `position: fixed` descendants.
   - Includes full-screen fixed backdrop (`z-index: 10000; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);`), a top drag handle pill, Reset and (X) Close buttons in the header, 1-column scrollable filter attribute options, and an "Apply" button in the footer.



