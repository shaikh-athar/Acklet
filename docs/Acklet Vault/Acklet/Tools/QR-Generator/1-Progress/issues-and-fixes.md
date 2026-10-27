---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Progress
---

# Issues & Fixes

Track all bugs found, root causes, and solutions.

---

## Bug #1: Color Picker Not Updating QR in Real-Time

**Found**: 2026-10-16, InputPanelComponent during testing

**Description**: 
User changes foreground color via color picker → QR image doesn't update immediately.

**Root Cause**: 
Event binding was `(ngModelChange)="..."` but color input doesn't reliably fire ngModelChange. Should use native `(change)` event instead.

**Fix Applied**:
Changed `(ngModelChange)="onColorChange()"` to `(change)="onColorChange()"` in ColorCustomizerComponent template.

**Testing**:
- Tested color change: now updates in < 100ms
- Tested on Chrome, Firefox, Safari (all work)
- Mobile: Works on iOS Safari + Chrome mobile

**Prevention**:
- Prefer native events `(change)` over Angular-specific `(ngModelChange)` for native inputs
- Test color/number/range inputs separately

---

## Bug #2: CSS Variables Not Loaded on First Page Load

**Found**: 2026-10-17, during styling pass

**Description**: 
Tool loads, but colors appear as defaults (black/white) instead of emerald accent. After hard refresh, accent appears.

**Root Cause**: 
Theme CSS variables not defined in global `styles.scss` before QRGeneratorComponent initializes. Component tries to use `var(--color-accent)` but variable doesn't exist yet.

**Fix Applied**:
Moved theme token definitions to `src/styles/theme-tokens.scss` and ensured it's imported before any component styles in `angular.json` styles array.

**Testing**:
- Fresh page load: accent now appears immediately
- Dark/light mode toggle: works correctly
- Inspector shows variables defined at `:root`

**Prevention**:
- Always define CSS variables in global styles BEFORE component imports
- Test page load (hard refresh) not just reload

---

## Bug #3: Download Button Disabled on Empty Content

**Found**: 2026-10-18, integration testing

**Description**: 
Download button shows disabled (grey) even when QR is visible on screen. User confused.

**Root Cause**: 
Service returns null if content empty; parent sets `isLoading = false` but `qrDataUrl` stays null → button binding `[disabled]="!qrDataUrl || isLoading"` evaluates to true.

**Intended Behavior**: 
Button should only be disabled if QR is actually generating. If QR is visible, button should be enabled.

**Fix Applied**:
Added check: `isLoading || !qrDataUrl ? disabled : enabled`  and ensured qrDataUrl is never null (defaults to empty string if no content).

**Testing**:
- Empty content → button disabled ✓
- Type content → button enabled ✓
- Download → file saved ✓

**Prevention**:
- Be explicit about null vs empty state
- Test happy path + empty state separately

---

## Bug #4: Route Collision / 404 on Hosted Shortlink Resolution (Issue a)

**Found**: 2026-10-25, Hosted Short-Link E2E Flow

**Description**: 
Requesting `/q/{code}` returned 404 or routed to Angular index.html instead of resolving through the backend.

**Root Cause**: 
Proxy configuration in `proxy.conf.json` did not route `/q` through to the Spring Boot backend (`http://localhost:8080`), and dev server required proxy reload.

**Fix Applied**:
Ensured `proxy.conf.json` defines `/q` context target `http://localhost:8080`, and updated Spring `SecurityConfig` to explicitly permit `/q/**` without authentication and exempt it from CSRF.

**Testing**:
- `curl -I http://localhost:8080/q/testcode` -> Verified handled by `QrResolutionController`.
- `curl -I http://localhost:4200/q/testcode` -> Verified correctly forwarded through Angular dev proxy.

---

## Bug #5: Hostname & Public Base URL Mismatch (Issue b)

**Found**: 2026-10-25, Phone Scanning Testing

**Description**: 
QR code encoded `http://localhost:8080/q/{code}`, rendering the QR unscannable by mobile phones on the local network or public internet.

**Root Cause**: 
Backend hardcoded localhost host header fallback when generating short URLs, with no injection mechanism for tunnel URLs or LAN IP addresses.

**Fix Applied**:
1. Added `app.qr.link.public-base-url` property in `application.properties`, backed by environment variable `QR_PUBLIC_BASE_URL`.
2. Frontend `SmartLinkService.computeEffectiveShortUrl` automatically adjusts the hostname if connected via public tunnels (e.g. ngrok) or `window.__ACKLET_CONFIG__.qrPublicBaseUrl`.
3. Added `isShortUrlLocalOrPrivate` check in `preview-panel.component` displaying a dev notice warning when testing against localhost/private IPs.

**Testing**:
- Set `QR_PUBLIC_BASE_URL=https://melvin-operose-disconsolately.ngrok-free.dev` -> generated QR links accurately contain the public HTTPS tunnel.
- Dev notice banner verifies cleanly in Angular UI when URL points to `127.0.0.1` or `localhost`.

---

## Bug #6: Dead Link Generation & Race Condition (Issue c)

**Found**: 2026-10-25, Async Link Generation Flow

**Description**: 
QR code generated immediately with unconfirmed/unsynced data while network request to `/api/v1/qr-links` was still in-flight, risking dead QR codes upon network failure.

**Root Cause**: 
`executeGeneration` in `QRGeneratorComponent` rendered the QR canvas before awaiting backend confirmation.

**Fix Applied**:
Implemented strict "create-then-generate" flow:
1. `PreviewPanelComponent` shows a visible "Creating link..." skeleton spinner while `isCreatingHostedLink` is true.
2. QR canvas rendering is suspended until `SmartLinkService.onShortUrlReady$` emits the confirmed URL.
3. If the backend is unreachable, the system falls back to a static dense QR (if content <= 1500 chars) with a fallback notice banner and "Retry" action. If content > 1500 chars, an explicit error state with "Retry" is shown.

**Testing**:
- Vitest unit test in `qr-generator.component.spec.ts` and `preview-panel.component.spec.ts`.
- Smoke test verified creation before resolution.

---

## Bug #7: Base62 Short Code Collisions & Case Sensitivity (Issue d)

**Found**: 2026-10-25, Code Collision Analysis

**Description**: 
Base62 short codes (`[0-9a-zA-Z]`) run the risk of colliding with system routes (`admin`, `api`, `q`, etc.) or case-insensitive DB collations.

**Root Cause**: 
Random string generation had no reserved route check, and case-insensitive collations could match `aB3` to `Ab3`.

**Fix Applied**:
1. Added `RESERVED_CODES` set blocking collisions with system endpoints.
2. In `QrLinkService.findByCode()`, added `.filter(e -> e.getCode().equals(trimmed))` ensuring exact case-sensitive verification across any DB collation.

**Testing**:
- JUnit test `testShortCodeCaseSensitivity` in `QrLinkServiceTest`.

---

## Bug #8: Search Engine Redirect Loop on Long Text (Issue e)

**Found**: 2026-10-25, Mobile Scanner QR Testing

**Description**: 
Scanning long text redirected users to Google search or attempted navigation on invalid URLs, causing user frustration.

**Root Cause**: 
Mobile QR scanner apps treat plain text looking like domains as search queries when scanned directly, or resolvers issued redirects for text payloads.

**Fix Applied**:
1. Resolver returns HTTP 302 (with `no-cache, no-store, max-age=0`) exclusively for `URL` payloads.
2. Resolver returns HTTP 200 OK directly rendering a mobile-first HTML text viewer for `TEXT` payloads.
3. Viewer includes prominent "Copy", "Share / Save to Notes" (Web Share API with fallback), and "Download .txt" buttons, with clear hint instructions.

**Testing**:
- `curl -i http://localhost:8080/q/{textCode}` -> Verified HTTP 200 OK HTML response, zero search engine redirects.

---

## Bug #9: Text Encoding & Unicode Corruption (Issue f)

**Found**: 2026-10-25, Multilingual Payload Validation

**Description**: 
Multiline text, Hindi/Devanagari characters, and emojis were susceptible to charset mismatch or HTML injection.

**Root Cause**: 
Improper escaping during HTML injection and lack of Unicode NFC normalization before storage.

**Fix Applied**:
1. Backend applies `Normalizer.normalize(raw, Normalizer.Form.NFC)` before persistence.
2. `QrHtmlRenderer` applies strict HTML entity escaping (`&`, `<`, `>`, `"`, `'`) for DOM rendering.
3. Text payload is safely embedded as JSON for JavaScript clipboard/Web Share.
4. `.txt` download includes UTF-8 BOM (`\uFEFF`) ensuring native Notepad/TextEdit render emojis cleanly.

**Testing**:
- Integration test with Hindi script `"नमस्ते दुनिया! ✨🚀\nLine 2"` -> round trip perfectly verified.

---

## Bug #10: Spring Security Referrer-Policy Override (Issue g)

**Found**: 2026-10-25, Security Header Audit

**Description**: 
Spring Security global configuration was emitting `Referrer-Policy: strict-origin-when-cross-origin` instead of `no-referrer`.

**Root Cause**: 
`SecurityConfig.java` had default `referrerPolicy` configuration.

**Fix Applied**:
Configured `referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))` in `SecurityConfig.java`.

**Testing**:
- Smoke test verified `Referrer-Policy: no-referrer` across 302, 200, 404, and 410 responses.

---

## Bug #11: Scan Confidence "Low" False Positive on Fresh Hosted/Smart QR Codes

**Found**: 2026-10-26, Hosted Link Generation Verification

**Description**: 
Immediately after clicking "Fill example" or generating any hosted/smart link QR code, the red "Scan Confidence: Low" chip appeared instantly, even for simple, high-contrast black-on-white QR codes.

**Root Cause**: 
When hosted link mode was active, `qr-generator.component.ts` correctly generated a QR code encoding the short URL (`http://localhost:8080/l/abc12345`). However, it was passing `[formattedPayload]="formattedPayload()"` (the raw unhosted long text or vCard content) to `PreviewPanelComponent`. 
`QRVerifierService.verifyScannability(dataUrl, expectedPayload)` decoded the image with `jsQR` (extracting the short URL) and compared `code.data === expectedPayload`. Because `shortUrl !== rawFormattedPayload`, `match` evaluated to `false`. Whenever `match` was false, the scoring algorithm automatically degraded confidence to `'low'` with the reason `"Decoded content differs from expected payload"`. Furthermore, `runSilentVerification` never set `isVerifying.set(true)`, so the red chip displayed instantaneously with zero checking transition.

**Fix Applied**:
1. Added `activeEncodedPayload` computed signal in [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts) which returns `shortUrl()` when hosted link mode is active and short URL exists, falling back to `formattedPayload()`.
2. Passed `[encodedPayload]="activeEncodedPayload()"` to `<app-qr-preview-panel>` in [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts).
3. Added `encodedPayload = input<string | null>(null)` in [preview-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.ts) and passed `this.encodedPayload() || this.formattedPayload()` to `verifyScannability()`.
4. Added `isVerifying.set(true)` in `runSilentVerification()` and rendered a neutral "Checking..." state until decoding finishes.
5. In [qr-verifier.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-verifier.service.ts), normalized payload comparison with trimming and trailing slash stripping.

**Testing**:
- Unit test in [qr-verifier.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-verifier.service.spec.ts) confirms a plain black-on-white short-link QR scores `confidence: 'high'` and never scores `'low'`.
- Component test in [preview-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts) verifies the neutral "Checking..." state and state sequence.

---

## Bug #12: Dynamic Link Management 404 "QR link not found: <code>" on Legacy QR Records

**Found**: 2026-10-26, Dynamic QR Links Management Studio

**Description**:
Dynamic QR codes created via the primary generator workflow or legacy table (`qr_codes`, e.g. code `5LirxQ`) exist in the database and render in the UI table, but attempting to Edit, Delete, or Preview/load into Studio resulted in error `"QR link not found: 5LirxQ"`.

**Root Cause**:
The dynamic links management endpoints (`/api/v1/qr-links`) and `QrLinkService` operated exclusively against `QrLinkRepository` (`qr_links` table). When a record existed in `qr_codes` (legacy table), `QrLinkService.verifyOwnerAndGet()` and `lookupSummaries()` failed to find the code and threw `ResourceNotFoundException("QR link not found: " + code)`.

**Fix Applied**:
1. In `QrLinkService.java`:
   - Injected `QrCodeRepository` with backward-compatible constructors.
   - Updated `verifyOwnerAndGet(code, rawToken)` to check `qrCodeRepository` when not found in `qrLinkRepository`, verify the SHA-256 hash against `legacy.getManageKeyHash()`, auto-migrate the record to `QrLinkEntity`, and persist it into `qrLinkRepository`.
   - Updated `lookupSummaries()` to check `qrCodeRepository` for any unmigrated codes and return summaries.
   - Updated `updateLink()` to sync `targetUrl` on `QrCodeEntity`.
   - Updated `deleteLink()` to remove from both `qr_links` and `qr_codes`.
   - Updated `getStats()`, `setStatus()`, `extendExpiry()`, and `markDownloaded()` to support legacy records.
2. In `dynamic-links.component.ts`:
   - Added `toastType` signal (`'success' | 'error'`) and updated `.toast-banner.toast-error` CSS with alert icon so errors are visually distinguished from success banners.
3. In `QrLinkServiceTest.java`:
   - Added unit tests for legacy code auto-migration, stats retrieval, update sync, deletion, and token validation.

**Testing**:
- Java test suite: `mvn test -Dtest=QrLinkServiceTest` (20/20 passed).
- Frontend Vitest suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 351/351 tests passed).

---

## Bug #13: Customization (Frames, Shapes, Colors) Not Applied to Live Preview & CTA Text Color Theme Default

**Found**: 2026-10-26, QR Generator Studio

**Description**:
1. When selecting frames (e.g. Coffee Cup, Thin Border), shapes, dot types, or colors in the Customize tab, the Live Preview QR code failed to update and remained stuck on the default un-framed QR code.
2. The Frame "CTA Text Color" defaulted to `#ffffff` (white) even in Light Theme, making the CTA caption text invisible on white/light backgrounds in open-framed styles (e.g., Coffee Cup, Thin Border, Tag).

**Root Cause**:
1. In `qr-generator.component.ts`, `triggerRegeneration()` emitted `{ content: this.content(), type: this.selectedType() }` to `this.inputChange$`. The subscription on `inputChange$` included `distinctUntilChanged((prev, curr) => prev.content === curr.content && prev.type === curr.type)`. Because design changes did not change `content` or `type`, `distinctUntilChanged` silently suppressed the emission, preventing `executeGeneration()` from ever running when design options were selected.
2. In `qr-generator.models.ts` and `qr-generator.service.ts`, `DEFAULT_FRAME_OPTIONS.textColor` was statically hardcoded to `#ffffff`, with no awareness of the active theme (light vs dark).

**Fix Applied**:
1. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Decoupled `triggerRegeneration()` from `inputChange$` so design edits execute `executeGeneration(this.content(), this.selectedType(), true)` directly with a 50ms trailing debounce timer.
   - Added `themeObserver` (`MutationObserver` monitoring `data-theme` on `document.documentElement`) to automatically adapt the default CTA text color to `#000000` (black) in light mode and `#ffffff` (white) in dark mode when uncustomized.
   - Tracked `userExplicitlySetCtaTextColor` in `onFrameChange()` to preserve intentional custom colors picked by the user.
   - Cleaned up `themeObserver` and `regenTimer` in `ngOnDestroy()`.
2. In [qr-generator.models.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-generator.models.ts):
   - Added `getDefaultCtaTextColor(theme?)` helper returning `#000000` for light theme and `#ffffff` for dark theme.
   - Updated `DEFAULT_FRAME_OPTIONS.textColor` default to `#000000`.
3. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
   - Updated `wrapSvgWithFrame()` to fall back to `getDefaultCtaTextColor()` rather than hardcoded `#ffffff`.
4. In [design-customizer.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/design-customizer/design-customizer.component.spec.ts):
   - Added unit tests validating frame selection emission, CTA text color changes, and theme-adaptive defaults.

**Testing**:
- Frontend Vitest suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 352/352 tests passed).

---

## Bug #14: Animation Fires Twice per Content Change

**Found**: 2026-10-26, Live QR Preview Animation Pipeline

**Description**:
Typing or modifying text caused the QR reveal animation to fire twice per content change.

**Root Causes**:
1. **Premature Animation Trigger Before Generation Completed**:
   In `qr-generator.component.ts`, `this.shouldAnimateQR.set(true)` was set *before* `await this.qrService.generate(...)` resolved. This triggered the CSS `.animate-qr` (`qrFadeInScale`) on the *previous* QR image in the DOM. Then, when generation finished, `this.qrDataUrl.set(result)` updated the image source while `shouldAnimateQR` was still `true`, causing the browser to replay the animation on the newly mounted image.
2. **Double Execution on Dynamic Link Resolution**:
   When `isSmartLink()` was active, typing content called `executeGeneration()` via `inputChange$`. In background, `smartLinkService` synchronized with the API and emitted `onShortUrlReady$`, whose subscription immediately called `executeGeneration()` a second time with the short URL, restarting the animation cycle.
3. **Double Execution on Content Type Switching**:
   In `onTypeChange()`, `this.executeGeneration(existing, type)` was called directly. Immediately afterward, `input-panel` emitted `contentChange`, which dispatched into `inputChange$` and triggered a second execution.
4. **Conflicting Cascading Animations in the DOM**:
   In `preview-panel.component.ts`, `<app-qr-assemble-effect>` wrapped `<img class="qr-tile-img" [class.animate-qr]="shouldAnimateQR()" />`. When `qrDataUrl` changed, `app-qr-assemble-effect` detected the change and triggered `qrPhaseAFade` (which forced `.qr-content-slot` back to opacity 0 and blur) 180ms after `.animate-qr` had already scaled and faded in the image.

**Fix Applied**:
1. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Inverted execution order in `executeGeneration()`: `qrService.generate()` completes first; only then is `console.log('Animation START')` and `shouldAnimateQR.set(true)` triggered, followed immediately by `console.log('State updated')` and `qrDataUrl.set(result)`.
   - Added generation deduplication with `lastGeneratedKey` and `lastEncodedContent` to guard against redundant runs and animations when output has not changed.
   - Guarded `onShortUrlReady$` subscription to only regenerate if `lastEncodedContent !== shortUrl`.
   - Routed `onTypeChange()` through `inputChange$.next()` instead of invoking `executeGeneration()` synchronously, ensuring single debounced execution.
   - Removed `.animate-qr` (`qrFadeInScale` pop-over zoom) completely from mobile QR preview and styles.
   - Added explicit lifecycle logging: `Animation START`, `State updated`, and `Animation END` (after 500ms).
2. In [preview-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.ts):
   - Removed `[class.animate-qr]` from the desktop preview image and removed `.animate-qr` / `@keyframes qrFadeInScale` CSS.
   - Removed duplicate `qr-scan-line-track` from the ready state so laser sweep does not conflict with the assemble animation.
3. In [qr-assemble-effect.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/qr-assemble-effect/qr-assemble-effect.component.ts):
   - Enforced `.is-pending .qr-content-slot { opacity: 0 !important; }` so newly generated QR images are held in memory and never displayed before the animation starts.
   - Single unified assemble animation reveals the QR image cleanly from frame 0 with canvas mosaic, soft focus reveal, beam sweep, and glow pulse.
4. In [qr-generator-responsive.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator-responsive.spec.ts):
   - Added unit test verifying that across 5 consecutive content changes, exactly 1 `Animation START`, 1 `State updated`, and 1 `Animation END` log fires per change.

**Testing**:
- Focused suite: `npx vitest run apps/tool-qr-generator/src/qr-generator-responsive.spec.ts` (20/20 passed).
- Assemble effect suite: `npx vitest run apps/tool-qr-generator/src/components/qr-assemble-effect/qr-assemble-effect.component.spec.ts` (8/8 passed).
- Full QR suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 353/353 tests passed).

---

## Bug #15: Frame Download Background Seam, Clipboard Image Copy & Clean Share

**Found**: 2026-10-26, Export & Frame Rendering Pipeline

**Description**:
1. When downloading or exporting a QR code with a frame applied (e.g., `minimal-bracket`), an awkward box boundary seam appeared around the QR code, with the frame margin being transparent/mismatched while the inner QR had its own background box.
2. Clicking "Copy Image" copied raw text/code (the SVG XML data URL) to the system clipboard instead of the actual image.
3. Clicking "Share" shared raw text URLs or text captions rather than purely sharing the framed QR PNG image file without extra clutter.

**Root Causes**:
1. **Frame Layout Background Discontinuity**:
   In `renderVectorFrame()` ([qr-frames.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.ts)), the 18 modern vector templates did not specify a full canvas background rect (they defaulted to `fill="none"`). The inner QR vector block drawn by `renderQrToSvg()` drew `<rect width="100%" height="100%" fill="${bgColor}"/>` at `(qrBox.x, qrBox.y)`. This left the outer frame margins transparent, creating a visible seam/boundary in downloaded PNGs.
2. **Clipboard SVG Rejection & Raw String Fallback**:
   In `preview-panel.component.ts` and `qr-generator.component.ts`, `navigator.clipboard.write([new ClipboardItem({ 'image/svg+xml': blob })])` was attempted. Modern browsers reject non-PNG image MIME types in the Async Clipboard API, throwing a `DOMException`. The `catch` block then fell back to `navigator.clipboard.writeText(dataUrl)` or `copyRawPayload()`, copying raw code/text to the user's clipboard.
3. **Web Share API Sharing Text Rather than Media**:
   In `onShare()` and `onMobileShare()`, `text: this.formattedPayload()` and `url: ...` were passed alongside or instead of the image file. Native share sheets (WhatsApp, Messages, AirDrop) prioritized the text parameter, sharing the URL string rather than the framed image file.

**Fix Applied**:
1. In [qr-frames.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.ts):
   - Updated `renderVectorFrame()` to accept `bgColor` and insert `<rect width="100%" height="100%" fill="${bgColor}" rx="16"/>` at the root of the frame SVG, ensuring a unified, seamless background across the entire framed card.
2. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
   - Passed `bgColor` to `renderVectorFrame()` in `wrapSvgWithFrame()`.
   - Updated JPEG rasterizer in `exportFramedRaster()` to use `options.backgroundColor`.
   - Added `svgToPngBlob(svgDataUrl, scaleMultiplier)` to convert framed SVG data URLs into true high-resolution PNG Blobs via HTML5 Canvas.
   - Exported `QRGeneratorService as QrGeneratorService` for seamless DI compatibility.
3. In [preview-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.ts) and [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Updated `copyImageToClipboard()` and `onMobileCopy()` to convert the framed QR into a genuine PNG blob via `svgToPngBlob()` and write `new ClipboardItem({ 'image/png': blob })`. Removed raw text fallbacks.
   - Updated `onShare()` and `onMobileShare()` to share *only* the PNG image file (`files: [file]`) without extra text/URLs. If file sharing is not supported by the platform, gracefully fall back to downloading the PNG image.

**Testing**:
- Unit tests: [preview-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts) (15/15 passed).
- Responsive & mobile share tests: [qr-generator-responsive.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator-responsive.spec.ts) (20/20 passed).
- Vector frame tests: [qr-frames.data.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.spec.ts) and [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) (passed).
- Complete QR suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 353/353 tests passed).

---

## Bug #16: False Positive "Instagram" Domain Error for LinkedIn & Non-Instagram Social Profiles

**Found**: 2026-10-26, Social Profile Input & Generation Validation

**Description**:
When selecting LinkedIn (or any non-Instagram platform such as X, YouTube, GitHub, Discord) in the Social Profile section and entering a valid profile URL (e.g., `https://www.linkedin.com/in/athar-shaikh-b9035931b/`), the generator blocked generation and displayed a false validation error:
`URL domain "www.linkedin.com" does not match platform INSTAGRAM.`

**Root Cause**:
In `QRGeneratorService.validateContent(content, type)` ([qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts)), the `case 'social'` branch was hardcoded as:
`return validateSocial({ platform: 'instagram', handleOrUrl: trimmed });`
Because `platform: 'instagram'` was hardcoded, `validateSocial` verified the hostname against `SOCIAL_DOMAINS['instagram']` (`instagram.com`), rejecting all LinkedIn, X, YouTube, and other valid social profiles with a mismatch error naming Instagram.

**Fix Applied**:
1. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
   - Updated `validateContent(content, type, platform?)` to accept an optional `platform` parameter.
   - For `case 'social'`, dynamically resolved the platform using `platform || detectPlatformFromUrl(trimmed)?.id || 'instagram'`. If `custom`, it validates as a website URL; otherwise it validates against the resolved platform.
2. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - In `executeGeneration()`, dynamically retrieved `this.inputPanel()?.socialData?.platform` when `type === 'social'` and passed it to `validateContent(trimmed, type, activePlatform)`.
3. In [qr-payload-builders.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-payload-builders.ts):
   - Expanded `SOCIAL_DOMAINS` to explicitly include all 20+ supported platforms (`github`, `discord`, `spotify`, `twitch`, `threads`, `reddit`, `pinterest`, `medium`, `behance`, `dribbble`, etc.).
4. In [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts):
   - Added unit tests verifying that LinkedIn URLs, auto-detected platforms, and handles validate without false mismatch errors.

**Testing**:
- Service tests: [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) (44/44 passed).
- Input panel tests: [input-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.spec.ts) (21/21 passed).
- Full suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 354/354 tests passed).

---

## Bug #17: Distorted LinkedIn Center Logo & Missing "Remove Logo" Action State

**Found**: 2026-10-26, Center Logo Badge & Social Link Input UX

**Description**:
1. When adding a LinkedIn center logo to the QR code, the `in` glyph appeared warped and distorted inside the QR center, with inverted white outer borders and squished letters.
2. Clicking the "Add logo" button caused the suggestion prompt to vanish completely with no button remaining visible, giving users no immediate indication that the logo was active and no way to remove the center logo from the social profile tab.

**Root Causes**:
1. **Inverted Cutout Path in LinkedIn Center Brand SVG**:
   In `BRAND_SVGS['linkedin']` ([social-platforms.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/social-platforms.data.ts)), the path definition included an outer perimeter boundary `M18.5 4.5h-13...` filled in white over a blue rectangle (`#0A66C2`). Because this cutout path was drawn in white, it inverted the logo colors (rendering a white box with an inverted `in` outline) and distorted the winding geometry.
2. **Missing Active State & Unbound `hasCenterIconActive`**:
   In [social-link-input.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/social-link-input/social-link-input.component.ts), clicking "Add logo" dismissed the prompt and set `dismissedPromptFor(platform.id)`. However, `hasCenterIconActive` was not bound from `<app-qr-input-panel>`, and there was no template branch rendering an active state when a center logo was placed. Once clicked, the prompt disappeared and no "Remove logo" action existed.

**Fix Applied**:
1. In [social-platforms.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/social-platforms.data.ts):
   - Replaced `BRAND_SVGS['linkedin']` with the official, pixel-perfect LinkedIn vector specification: a `#0A66C2` rounded rectangle (`rx="4.5"`) with clean, crisp, pure white (`#ffffff`) `in` letterforms.
2. In [social-link-input.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/social-link-input/social-link-input.component.ts):
   - Added an active state `@if (hasCenterIconActive() && selectedPlatform().iconName)` that displays:
     `{{ selectedPlatform().name }} logo placed in center` alongside a visible `[Remove logo]` button.
   - Added `removeCenterIcon = output<void>()` and `triggerRemoveCenterIcon()` which clears the dismissed state and emits the removal event.
3. In [input-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.ts):
   - Added `hasCenterIconActive = input<boolean>(false)` and `removeSocialCenterIcon = output<void>()`, wiring them cleanly between the parent generator and `<app-social-link-input>`.
4. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Bound `[hasCenterIconActive]="!!logo()"` in both desktop and mobile flow templates.
   - Implemented `onRemoveSocialCenterIcon()` to reset `this.logo.set(null)` and trigger immediate lossless re-generation.

**Testing**:
- Component tests: [social-link-input.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/social-link-input/social-link-input.component.spec.ts) (7/7 passed).
- Input panel tests: [input-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.spec.ts) (22/22 passed).
- Full suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 355/355 tests passed).

---

## Bug #18: Downloaded Image (PNG/JPEG) Fails Camera Scan While Live Preview Scans Correctly

**Found**: 2026-10-26, Export Raster Engine & Mobile Camera Verification

**Description**:
While the QR code rendered in Live Preview scanned and redirected properly on mobile devices, downloading the PNG or JPEG image resulted in an unscannable image file. Mobile scanners (iOS Camera, Google Lens) could not decode the downloaded image when displayed or opened in photo viewers.

**Root Causes**:
1. **SVG Percentage Dimensions (300x150 Replaced Element Sizing)**:
   In `qr-frames.data.ts`, frame SVG templates specified `width="100%" height="100%"`. When an SVG with percentage dimensions is loaded into an in-memory `new Image()` without a DOM container, browsers apply the CSS 2.1 §10.3.2 default replaced element dimensions of 300px by 150px (2:1 aspect ratio). When drawn to canvas, the QR code was squashed vertically by 50%, flattening 1:1 square finder patterns into rectangular bars that scanner cameras cannot recognize.
2. **Transparent Canvas Background on Downloaded PNGs**:
   In `exportFramedRaster()`, solid background fill (`ctx.fillRect`) was only executed if `format === 'jpeg'`. For default PNG downloads, the canvas remained completely transparent (`rgba(0,0,0,0)`). Opening the PNG in mobile photo viewers or dark mode file managers rendered transparent pixels as solid black, obliterating quiet zones and contrast.
3. **Canvas Drawing & Scaling Misalignment**:
   `exportFramedRaster()` applied `ctx.scale(scale, scale)` before `ctx.drawImage(img, 0, 0)`, which relied on implicit 3-argument image sizing rather than drawing to explicit target canvas dimensions.

**Fix Applied**:
1. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
   - In `exportFramedRaster()` and `svgToPngBlob()`, parsed true intrinsic dimensions directly from the SVG's `viewBox` or attributes to bypass browser 300x150 fallback.
   - If the SVG contains percentage dimensions (`100%`), injected explicit pixel width and height before assigning `img.src`.
   - Set high-resolution square canvas dimensions (target ~2048px).
   - Filled solid background color (`backgroundColor || '#ffffff'`) across the entire canvas for both PNG and JPEG.
   - Replaced context scaling with explicit bounds drawing: `ctx.drawImage(img, 0, 0, outW, outH)`.
2. In [qr-frames.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.ts):
   - In `renderVectorFrame()`, injected explicit `template.width` and `template.height` pixel attributes onto the root `<svg>`.
3. In [qr-svg-renderer.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/qr-svg-renderer.ts):
   - Added `xlink:href` alongside `href` on embedded logos for universal SVG rasterization compatibility.

**Testing**:
- Service tests: [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) (44/44 passed).
- QR renderer tests: [qr-svg-renderer.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/qr-svg-renderer.spec.ts) (13/13 passed).

---

## Bug #19: Logo Size and Safety Margin Buffer Sliders Inactive Due to Deduplication Key Omission

**Found**: 2026-10-26, Customize → Logo Tab Sliders

**Description**:
Dragging the "Logo Size" slider (10% to 40%) or "Safety Margin Buffer" slider (0px to 8px) in Customize → Logo had no visual effect on the QR preview: the logo remained stuck at its default 24% size and 1px margin buffer.

**Root Causes**:
1. **Omission in `genKey` Deduplication Hash**:
   In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts), `executeGeneration()` computes a cache key `genKey` to prevent redundant QR re-renders:
   `const genKey = \`${encodeType}::${contentToEncode}::...::${options.logo}::${JSON.stringify(options.frame)}...\``
   `options.logoSize`, `options.logoMargin`, `options.cornerSquareColor`, and `options.cornerDotColor` were missing from `genKey`. When the user dragged either slider, `onLogoSizeChange` or `onLogoMarginChange` triggered regeneration, but `executeGeneration()` saw `this.lastGeneratedKey === genKey` and immediately returned without generating.
2. **Buffer Margin Clamping in Vector Engine**:
   In [qr-svg-renderer.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/qr-svg-renderer.ts), `pad` calculation was hard-capped to `Math.min(3, ...)`. Moving the slider above 3 had no effect even if the hash changed.

**Fix Applied**:
1. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Added `options.logoSize`, `options.logoMargin`, `options.cornerSquareColor`, and `options.cornerDotColor` to `genKey`:
     `const genKey = \`${encodeType}::${contentToEncode}::...::${options.logo}::${options.logoSize}::${options.logoMargin}::...\``
   - Dragging either slider now immediately updates `genKey` and triggers full, responsive vector re-rendering.
2. In [qr-svg-renderer.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/qr-svg-renderer.ts):
   - Calculated dynamic `maxSafePad = Math.max(0, Math.min(8, Math.floor((N - logoModuleW) / 2) - 1))`, allowing the margin buffer to scale up to 8px safely without encroaching on finder pattern boundaries.

**Testing**:
- Customizer tests: [design-customizer.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/design-customizer/design-customizer.component.spec.ts) (2/2 passed).
- QR renderer tests: [qr-svg-renderer.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/utils/qr-svg-renderer.spec.ts) (13/13 passed).
- Full suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 355/355 passed).

---

## Bug #20: Exported QR File Named Generic 'qrcode.png' Without User-Defined Identifier and History Lacks Meaningful Label

**Found**: 2026-10-26, Studio Header & Download Flow

**Description**:
Every downloaded QR code was unconditionally saved as `qrcode.png` or `qrcode.jpg`, overwriting previously saved files in the user's downloads folder or requiring manual renaming. Users had no ability to assign a descriptive name (e.g., "Menu QR", "LinkedIn Profile", "Wifi Guest") to their QR codes, and recent history items showed only raw encoded content without clear names.

**Root Causes**:
1. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts), `download(format)` hardcoded `qrcode.${format}` as the download attribute on the anchor element:
   `link.download = \`qrcode.\${format}\``
2. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts), there was no user-editable `qrName` state in the header or passed into `download()`.
3. In [qr-history.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-history.service.ts), `QRHistoryItem` lacked an optional `name?: string` field, and the recent history list only displayed raw content strings.

**Fix Applied**:
1. In [qr-history.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-history.service.ts):
   - Added `name?: string` to `QRHistoryItem` and `CreateQRHistoryItem` interfaces.
2. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
   - Enhanced `download(format, filenameWithoutExt = 'qrcode')` to accept custom filename base.
   - Enhanced `exportFramedRaster(svgDataUrl, format, filenameWithoutExt = 'qrcode')` to apply the custom name.
3. In [qr-generator.component.html](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.html) & [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Added sleek inline editable QR Name input (`qrName` signal, defaulting to `'My QR Code'`) in the studio header next to the title.
   - Connected `qrName` sanitization into `onDownload(format)` (`download(format, sanitizedName)`), ensuring file exports default to `[qr-name].[ext]`.
   - Included `name: this.qrName()` when recording history and restored `item.name` on restoring a history item.
4. In [preview-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.ts):
   - Displayed `item.name` badge with ellipsis in recent history item rows.

**Testing**:
- History tests: [qr-history.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-history.service.spec.ts) (13/13 passed).
- Generator service tests: [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) (44/44 passed).
- Full suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 355/355 passed).
- Monorepo Tier B verification: `node scripts/verify.mjs -B` passed (Client build passed, Tests passed, Scope checks passed).

---

## Bug #21: QR Name Input Icon Customization (Square Pen)

**Found**: 2026-10-26, Studio Header Styling

**Description**:
The QR Name input badge used a generic `tag` icon rather than the edit-focused `square-pen` (pencil in square) icon indicating editable name / renaming actions.

**Fix Applied**:
1. In [ts-icon-map.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/icon/ts-icon-map.ts):
   - Imported `LucideSquarePen` from `@lucide/angular`.
   - Registered `square-pen`, `pen-square`, and updated `edit` to resolve to `LucideSquarePen`.
2. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Updated desktop and mobile QR Name badges to `<ts-icon name="square-pen" [size]="13" class="qr-name-badge-icon" />`.

**Testing**:
- Architecture & type check: `node scripts/verify.mjs -A` passed.
- Unit tests: [preview-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts) (15/15 passed).

---

## Bug #22: Mobile Result Flow Lacked Direct Access to QR History & Advanced Settings Bottom Sheets

**Found**: 2026-10-26, Mobile Responsive QR Generator Experience

**Description**:
In the mobile phone state machine (`input` -> `result` -> `design`), once a user generated a QR code and landed on the `result` view, there was no direct action to inspect their recent QR history or access advanced QR encoding settings (quiet zone, error correction level, auto-detection) without returning to the first step or opening the full desktop panel.

**Root Causes**:
1. The secondary actions grid in the mobile result view only contained "Customize Design" and "Full Screen" buttons.
2. The bottom sheets for `isMobileHistoryOpen` and `isMobileSettingsOpen` were declared in certain subviews but were missing corresponding entry point buttons and pill counter indicators in the primary mobile result action grid.

**Fix Applied**:
1. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Added secondary action buttons for **Settings** (`isMobileSettingsOpen.set(true)`) and **History** (`isMobileHistoryOpen.set(true)` with dynamic badge counter `historyItems().length`) in the mobile Result View actions bar.
   - Integrated full `<app-qr-bottom-sheet>` for Mobile Recent History displaying saved QR items with thumbnail preview, name, type badge, and clear-all action.
   - Integrated `<app-qr-bottom-sheet>` for Mobile Advanced Settings with direct controls for error correction level, version, and quiet zone margin.
   - Added `onRestoreMobileHistory(item)` which applies previous configurations and transitions smoothly into the result preview.
2. In CSS:
   - Added responsive styles for `.mobile-btn-pill`, `.mobile-history-sheet`, `.mobile-history-item`, `.mobile-history-thumb`, and empty history states matching Spartan UI / Acklet design tokens.

**Testing**:
- Complete test suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 356/356 passed).

---

## Bug #23: QR Animation Flickering, Blank Flash, Ghosting, and Duplicate Triggering on Content Edits

**Found**: 2026-10-27, QR Generator Preview Experience

**Description**:
In the QR Generator preview, every content edit re-triggered the full 1300ms assemble animation (mosaic uncover, dim overlay, glow pulse), often twice in rapid succession. The previous QR image momentarily stayed, the tile flashed blank, a ghost image appeared, a pixel reveal ran, and then repeated. A static QR image was also visible before the animation started.

**Root Causes**:
1. **Internal Debounce Blank-out (`qr-assemble-effect.component.ts`)**: An internal `ASSEMBLE_DEBOUNCE_MS = 180` and `.is-pending .qr-content-slot { opacity: 0 !important; }` rule wiped the QR image to opacity 0 on every `qrDataUrl` change before re-triggering the mosaic canvas, causing the blank flash.
2. **Preview Tile Destruction by `@if` (`preview-panel.component.ts`)**: The preview panel had `@if (isCreatingHostedLink() || (isGenerating() && !qrDataUrl()))`, which destroyed `<app-qr-assemble-effect>` whenever a shortlink sync was in flight, removing the existing QR from the DOM.
3. **Double Render in Dynamic / Hosted Link Flow (`qr-generator.component.ts`)**: Keystrokes in dynamic link mode immediately dispatched generation with pending/stale short URLs and then triggered a second generation when `smartLinkService.onShortUrlReady$` resolved, resulting in a duplicate animation loop.
4. **Unconditional Full Animation Triggering**: Every generation set `shouldAnimateQR = true` and started a new mosaic canvas run, instead of restricting full animation to the first generation, content type switches, or preset/example loading.
5. **Missing Atomic Swap & Stale Render Cancellation**: Subsequent edits did not render off-screen with an atomic crossfade, and overlapping async QR generations were not discarded by a render token.

**Fix Applied**:
1. In [qr-assemble-effect.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/qr-assemble-effect/qr-assemble-effect.component.ts):
   - Added `shouldAnimate` input (`boolean | null`) to distinguish between full reveal animations and subsequent updates.
   - Removed `.is-pending .qr-content-slot { opacity: 0 !important; }` to eliminate the blank tile flash.
   - Implemented atomic 150ms crossfade between `outgoingUrl` and `displayedUrl` for subsequent edits with zero pixel reveal.
   - Added 300ms generation timer that dims the current QR to 0.65 opacity (`is-dimmed`) and displays a small spinner badge (`.qr-spinner-badge` with `.qr-spinner-ring`) if generation exceeds 300ms, never flashing blank.
   - Full support for `prefers-reduced-motion` (instant swap, bypassed canvas loops, no glow/sweep transforms).
2. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts):
   - Restricted full reveal animation (`shouldAnimateQR.set(true)`) strictly to the first successful generation (`!hasGeneratedFirstQr`), content type switch (`onTypeChange`), and sample/example loading (`loadSample`, `applyPreset`, `onRestoreHistory`).
   - For all subsequent edits, set `shouldAnimateQR.set(false)` so updates perform atomic crossfade without full animation.
   - Introduced `currentRenderToken` to cancel and discard stale asynchronous renders.
   - Debounced dynamic link creation, reusing existing links when content is unchanged.
3. In [preview-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.ts):
   - Updated template `@if` condition to `(isCreatingHostedLink() || isGenerating()) && !qrDataUrl()` to keep the ready QR mounted during subsequent background updates.
   - Connected `[shouldAnimate]="shouldAnimateQR()"` to `<app-qr-assemble-effect>`.
4. In Tests:
   - Updated [qr-assemble-effect.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/qr-assemble-effect/qr-assemble-effect.component.spec.ts) to verify atomic crossfade, slow render spinner, and single animation on first generation.
   - Updated [qr-generator-responsive.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator-responsive.spec.ts) to test single animation on first generation, no animation on subsequent updates, re-trigger on type change/sample, and debounced single-render per burst.

**Testing**:
- Assemble effect unit tests: `npx vitest run apps/tool-qr-generator/src/components/qr-assemble-effect/qr-assemble-effect.component.spec.ts` (9/9 passed).
- Preview panel unit tests: `npx vitest run apps/tool-qr-generator/src/components/preview-panel/preview-panel.component.spec.ts` (15/15 passed).
- Responsive unit tests: `npx vitest run apps/tool-qr-generator/src/qr-generator-responsive.spec.ts` (22/22 passed).
- Complete tool suite: `npx vitest run apps/tool-qr-generator` (30/30 test files, 359/359 passed).

---

## Bug #24: Responsive UI, Navigation vs Tools Drawer Roles, Swipe Gestures, Viewport Dead Space, and Mobile Advanced Settings

**Found**: 2026-10-27, Mobile & Tablet Responsive Audit (Samsung Galaxy A55 360x800, iPhone SE, iPhone 14, Pixel, iPad mini, iPad Air)

**Description**:
1. Tools Drawer looked faded/washed out in light theme compared to other surfaces.
2. Hamburger button misbehaved / swapped with grid button.
3. Missing touch swipe gestures for opening/closing drawer on mobile/tablet.
4. On 360x800 screens, ~130px leftover empty gap appeared below the sticky bottom bar, and dead space floated within the input form card.
5. Small screen labels broke mid-word ("Auto (Recommen-ded)"), and input fonts caused iOS Safari auto-zoom.
6. Advanced Settings modal clipped behind footer, wrapped into uneven 3+2 rows, and sat inside a heavy nested dark frame.
7. Broken "History / Settings / Sample" text bar was duplicated under QR name input.

**Root Causes & Solutions**:
1. **Washed Out Drawer**: `.ts-mobile-sheet-panel` used a translucent glass gradient over a heavy dark scrim, degrading light mode contrast. Fixed by converting the drawer into an opaque content card surface (`background: var(--bg-card)`) with dual-theme border and shadow, resting above a moderate scrim (`rgba(0, 0, 0, 0.45)` with `blur(4px)`).
2. **Menu vs Drawer Roles**: Hamburger button previously opened the tools drawer while the grid button opened a partial links menu. Inverted roles at the root: Hamburger toggles tool section navigation (`Tool`, `About`, `How to use`, `FAQ`, `Related`, `Share`, `Save`), rendered as an anchored popover on tablet/desktop and clean bottom sheet on phone with 44px tap targets. Grid button exclusively opens the tools drawer.
3. **Swipe Gestures (`DrawerGestureService`)**: Implemented pointer-based swipe detection with edge zone ($16\text{px} \le \text{clientX} \le 48\text{px}$) to avoid conflict with iOS system back swipe ($0-15\text{px}$), swipe-left to dismiss, velocity threshold ($\ge 0.4\text{px/ms}$), horizontal scroll exclusion, and `prefers-reduced-motion` compliance.
4. **130px Viewport Dead Space**: `.mobile-input-view` had `justify-content: space-between` and `padding-bottom: 72px` which pushed the form card away from the bottom action bar. Fixed to `justify-content: flex-start; gap: 8px; padding-bottom: 0;` with form card `flex: 1 1 0%; min-height: 0; overflow-y: auto;` anchoring content at the top and pinning the action bar cleanly at the bottom.
5. **Small Screen Text & Sizing**: Shortened "Auto (Recommended)" to "Auto" + small `.rec-badge` ("Recommended"), added `white-space: nowrap` for Generate button with responsive short label fallback, added 16px minimum font size for mobile inputs to stop iOS zoom, and applied `text-wrap: balance` to headings.
6. **Advanced Settings Bottom Sheet**: Restructured modal on $\le 640\text{px}$ as a native bottom sheet (up to $90\text{dvh}$) with sticky header, drag handle, scrollable body, compact footer (Done primary, Reset secondary beside it), 5-column grid for resolution presets, and normal scrim without dark box framing. Centered dialog retained for tablets.
7. **Removed Broken Links**: Removed `.mobile-top-tools-bar`, keeping History and Settings in the bottom action bar and relocating "Try an example" cleanly into the studio type bar.

**Testing**:
- Complete test suite: `npx vitest run packages/tool-shell apps/tool-qr-generator` (42/42 test files, 452/452 tests passed).
- Tier A verification: `node scripts/verify.mjs -A` (Static, Architecture, Type Checks, Shared Tests, Java Compilation passed).

---

## Bug #25: Mobile Result Header Layout Break, 4-Circles Navigation Button Swap, Drawer Swipe-Left Block, Theme Ghost Click on Sidebar Close, and Navigation Dark Theme & Dynamic Links

**Found**: 2026-10-27, Mobile Navigation & Sidebar Polish (Samsung Galaxy A55 360x800)

**Description**:
1. **Image 1 — Result Card Header Layout Break**: In the mobile result summary card, "My QR Code" broke character-by-character vertically (`M\ny\nQ\nR\nC\no\nd\ne`), and the `WEBSITE URL` type badge overlapped horizontally with `Website URL: http...`.
2. **Image 2 & 3 — 4-Circles Button & Hamburger Removal**: The topbar had both a 3-line hamburger menu on the left and a 4-circles button on the right. User requested removing the 3-line hamburger menu completely and assigning the 4-circles button (`.ts-tools-grid-btn`) to open the Navigation sheet (Image 3).
3. **Image 4 — Ghost Theme Switch on Close Click**: Clicking the `✕` close button on the tools sidebar drawer (Image 4) toggled the theme instead of just closing the sidebar. This occurred because `<ts-theme-toggle>` in the topbar was located directly under the `✕` close button on a 360px viewport, and event bubbling/pointer fallthrough triggered the underlying button upon drawer unmounting.
4. **Image 4 — Swipe Left Not Closing Sidebar**: Swiping left on the opened tools sidebar failed to close the drawer.
5. **Image 3 — Missing Dynamic Links & Theme Option in Navigation**: Navigation sheet needed a dedicated "Dynamic Links" section/item and Dark Theme switch option, removing theme toggle from the mobile topbar.

**Root Causes & Solutions**:
1. **Result Header Layout (Image 1)**:
   - Fixed `.mobile-summary-card` layout in [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts).
   - Changed `.summary-meta` to `flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; flex: 1 1 0%; overflow: hidden;`.
   - Structured `.summary-name-row` with `display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0;`.
   - Applied `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex-shrink: 1;` on `.summary-qr-name` and `flex-shrink: 0; white-space: nowrap;` on `.summary-type-badge`.
   - Truncated `.summary-text` to 1 line with ellipsis (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).
2. **4-Circles Button & Hamburger Removal (Image 2 & 3)**:
   - Removed `.ts-mobile-menu-btn` (3-line hamburger button) from [ts-topbar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts).
   - Re-wired the 4-circles button (`.ts-tools-grid-btn`) on the right to call `toggleNavMenu($event)`, expanding the bottom navigation sheet.
3. **Ghost Click Fix & Theme Toggle Relocation (Image 3 & 4)**:
   - Added `onCloseButtonClick($event)` on `.ts-sheet-close-btn` in [ts-sidebar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts) with `$event.stopPropagation()` and `$event.preventDefault()`, stopping touch/pointer event bleed-through.
   - Hid `<ts-theme-toggle>` on mobile/tablet screens in topbar via `@media (max-width: 1023px) { ts-theme-toggle { display: none !important; } }`.
   - Embedded a tactile iOS/Linear-style Dark Mode row with switch knob inside the Navigation Sheet (`.ts-nav-theme-row` and `.ts-nav-theme-toggle-switch`), wired to `ToolThemeService.toggleTheme()`.
4. **Swipe Left Physics on Sidebar (Image 4)**:
   - In [drawer-gesture.service.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/services/drawer-gesture.service.ts), `isTargetExcluded` previously excluded `button, a, .custom-scrollbar`, blocking swipe start across the entire drawer body.
   - Introduced `isTargetExcludedForDismiss(target)` which only excludes text inputs and sliders (`input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [role="slider"], [type="range"], .slider, [data-no-swipe]`), allowing swipe-to-dismiss gestures across buttons, links, and scrollers.
   - Refined `onTouchMove`, `onTouchEnd`, and pointer handlers in [ts-sidebar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts) for frictionless dismiss physics.
5. **Dynamic Links in Navigation (Image 3)**:
   - Added `{ id: 'dynamic', label: 'Dynamic Links' }` to `sectionLinks()` in [ts-topbar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts).
   - Added `dynamicLinksClick` output and reactive `acklet:switch-tab` custom event dispatching, switching tabs to the Dynamic Links studio and closing the navigation menu.

**Testing & Verification**:
- Unit tests: `npx vitest run packages/tool-shell apps/tool-qr-generator` (42/42 test files, 453/453 passed).
- Tier A verification: `node scripts/verify.mjs -A` (Glass styling, Shell isolation, TypeScript compilation, Shared vitest, Java test-compile passed).
- Working tree remains uncommitted per instructions.

---

## Bug #26: Removal of "Try an Example", Advanced Settings Modal Light Theme Contrast & 360px Layout, and Mobile Result Home Redirect Link

**Found**: 2026-10-27, Mobile Polish & Light Theme Verification (Samsung Galaxy A55 360x800)

**Description**:
1. **Try an Example Removal**: Redundant "Try an example" button remained beside the content type selector dropdown on mobile screens, cluttering the studio header.
2. **Advanced Settings Modal Light Theme Contrast & 360px Layout**:
   - In light theme, the Advanced Settings modal (`app-qr-advanced-modal`) displayed a dark background (`#18181b`) with black text (`#09090B`) rendered over dark gray/black surfaces, making titles, labels, diagnostic items, and stepper buttons illegible.
   - On 360px viewports (Samsung Galaxy A55), the "Auto Recommended" / "Manual Override" segmented toggle clipped text against the right boundary, and the resolution slider label "4096px (Billboard)" overflowed off-screen.
   - Footer buttons ("Reset" and "Done") risked being obscured or partially clipped without proper sticky anchoring.
3. **Missing "← Go to home" Navigation on Mobile Result View**:
   - After generating a QR code on mobile, the result view displayed a large empty vertical space below the `<ts-sticky-action-bar>`. Users had no intuitive way to navigate back to the Acklet Tools Hub / home page.

**Root Causes & Solutions**:
1. **Try an Example Removal**:
   - Removed `.mobile-try-example-btn` button element and cleaned up obsolete CSS rules from [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts).
   - The studio type bar on mobile now cleanly hosts the anchored content type selector dropdown with full touch width and search support.
2. **Advanced Settings Light Theme & Layout**:
   - In [advanced-modal.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/advanced-modal/advanced-modal.component.ts), replaced non-existent `--bg-card` variable references with canonical Acklet tokens `var(--ts-surface-raised, var(--surface, #141416))` across `.advanced-modal-card`, `.modal-header`, and `.modal-footer`.
   - Added complete dual-theme styles with high-contrast Light Theme rules (`#FFFFFF` modal card background, `#09090B` headers, `#64748B` muted labels, `#F1F5F9` segmented toggle tracks, `#EFF6FF` active error correction tiles, `#FFFBEB` warning banners, and `#F8FAFC` diagnostic cards).
   - In `.ec-mode-toggle`, added `min-width: 0; overflow: hidden;` and adjusted button padding to `6px 6px` to ensure "Auto Recommended" and "Manual Override" fit comfortably on 360px viewports without wrapping or clipping.
   - Refined `.slider-labels` with `font-size: 0.68rem; gap: 4px; overflow: hidden;` and right-aligned the billboard label to eliminate horizontal text clipping.
   - Anchored `.modal-header` and `.modal-footer` as sticky bars around the scrollable body (`overflow-y: auto; -webkit-overflow-scrolling: touch;`), ensuring the "Done" and "Reset" buttons remain fully accessible at all viewport heights.
3. **Mobile Result Home Redirect Link**:
   - Imported `getToolsHubUrl()` from `@acklet/shared` and declared `readonly hubUrl = getToolsHubUrl();` in `QRGeneratorComponent`.
   - Added `<div class="mobile-home-redirect-wrap"><a [href]="hubUrl" class="mobile-home-redirect-link" title="Go to Acklet Tools Hub"><ts-icon name="arrow-left" [size]="15" /><span>Go to home</span></a></div>` below `<ts-sticky-action-bar>` in [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts).
   - Styled the link with dual-theme tokens: in light theme, soft slate background (`rgba(15, 23, 42, 0.04)`) with `#52525B` text and `#09090B` on hover; in dark theme, translucent white (`rgba(255, 255, 255, 0.06)`) with `#A1A1AA` text and `#FFFFFF` on hover, with a 40px touch-friendly hit target.

**Testing & Verification**:
- Unit tests: `npx vitest run apps/tool-qr-generator packages/tool-shell` (42/42 test files passed).
- Tier A verification: `node scripts/verify.mjs -A` passed.
- Working tree remains uncommitted per developer guidelines.

---

## Bug #27: Content Type URI Scheme Handling for Native Device Actions (Phone, SMS, Email, Location, Crypto, etc.)

**Found**: 2026-10-27, Native Scanner & Interoperability Testing

**Description**:
When scanning generated QR codes on iOS and Android devices, native camera scanners failed to recognize the intended action and opened the web browser (e.g., Google Chrome) instead of launching the appropriate native application.
- Example: Phone QR opened Chrome browser (performing a web search) instead of opening the phone dialer.
- SMS QR opened browser or failed to prefill message body instead of launching Messages.
- Email QR opened browser instead of native Mail/Gmail client when query parameters had spaces or exceeded smart link threshold.

**Root Causes**:
1. **Plain Text and Uncleaned Formatting**: `formatPayload()` in [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts) bypassed formatting if content started with `tel:`, `sms:`, `mailto:`, etc., returning uncleaned user input with raw whitespace (e.g. `tel: +1 415 555 2671`). Mobile scanners do not parse phone numbers with spaces, treating them as generic search strings.
2. **Legacy SMS Format**: SMS encoding defaulted to `SMSTO:`, which is inconsistently handled by modern mobile operating systems compared to RFC 5724 `sms:`.
3. **Unencoded Query Parameters**: Query strings in `sms:?body=...` and `mailto:?subject=...&body=...` were not consistently strict-URL-encoded (spaces converted to `%20`, `@` converted to `%40`), causing parser truncation in mobile mail and messaging clients.
4. **Smart Link Promotion of Native Action Types**: In [smart-link.config.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/smart-link.config.ts), `email`, `crypto`, and `app` were included in `SMART_LINK_ELIGIBLE_TYPES`. When content exceeded 180 bytes, the generator promoted them to dynamic hosted links (`https://tools.acklet.com/l/...`), which strictly forced devices into the web browser upon scan.
5. **Conditional Input Emission**: In [input-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.ts), phone and SMS changes were guarded by `val.isValid`, which prevented intermediate emissions and left unformatted strings in the payload state.

**Fix Applied**:
1. **Added `encodeContent()` and Refactored `formatPayload()` in [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts)**:
   - **Phone**: Strips `tel:`, punctuation, spaces, and brackets; parses via `parsePhoneNumberFromString` for standard E.164 (`tel:+919876543210`); fallback ensures clean digits with optional leading `+`.
   - **SMS**: Formats as RFC 5724 `sms:${phone}?body=${encodeURIComponentStrict(body)}`; strips `SMSTO:`/`sms:`, cleans phone, and strict-encodes body.
   - **Email**: Strips `mailto:`, parses query params, and strict-URL-encodes all parameter values (`mailto:user@example.com?subject=...&body=...`).
   - **URL**: Prepend `https://` if protocol omitted; handles UTM tracking parameters.
   - **Wi-Fi**: Preserves ZXing format (`WIFI:T:WPA;S:NetworkName;P:Password;;` or `WIFI:S:...;T:...;`) with escaped reserved characters.
   - **Location**: Extracts coordinates from pasted Google Maps/Apple Maps links via `parseMapCoordinates`, cleans RFC 5870 `geo:${lat},${lng}?q=${encodedLabel}`.
   - **vCard**: Produces full RFC 2426 format (`BEGIN:VCARD...END:VCARD`).
   - **Calendar**: Produces full RFC 5545 format (`BEGIN:VCALENDAR...END:VCALENDAR`).
   - **Social**: Formats canonical profile URLs (`https://instagram.com/username`, etc.).
   - **App Store**: Formats direct store URLs (`https://play.google.com/store/apps/details?id=...`, etc.).
   - **Crypto**: Formats as `bitcoin:${address}` or `ethereum:${address}` with encoded transaction parameters.
   - **Text**: Applies Unicode NFC normalization, preserving explicit URI schemes if entered directly.
2. **Updated Smart Link Configuration in [smart-link.config.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/smart-link.config.ts)**:
   - Added `email`, `crypto`, and `app` to `ALWAYS_DIRECT_TYPES` and removed them from `SMART_LINK_ELIGIBLE_TYPES` so action types are always encoded directly into the QR matrix.
3. **Updated Input Panel in [input-panel.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.ts)**:
   - Changed default `smsData.format` from `'SMSTO'` to `'sms'`.
   - Updated `onPhoneInputValueChange` and `onSmsPhoneInputValueChange` to emit changes unconditionally during typing.
4. **Updated Test Suites**:
   - In [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) and [input-panel.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.spec.ts), verified `encodeContent()`, `formatPayload()`, RFC 5724 `sms:`, phone punctuation stripping, URL-encoded email query params, and crypto prefixes.

**Testing & Verification**:
- Unit tests: `npx vitest run apps/tool-qr-generator packages/tool-shell` (42/42 test files, 455/455 tests passed).
- Tier A verification: `node scripts/verify.mjs -A` passed.
- Working tree remains uncommitted per developer guidelines.

---

## Bug #28: Mobile "Go to Home" Redirection to QR Studio & Location Link Direct Encoding (No Lat/Long Required)

**Found**: 2026-10-27, Mobile Navigation & Location Flow Refinement

**Description**:
1. **Mobile "Go to home" Redirection**: The "Go to home" button at the bottom of the mobile QR result view (`phoneState() === 'result'`) was previously hyperlinked to the Acklet Tools Hub URL (`hubUrl = https://tools.acklet.com`), navigating the user completely out of the QR Generator rather than returning them to the QR Generator's initial studio input page.
2. **Location Link Input Flow**: In Location mode, when users pasted a map link (e.g. Google Maps link or shortlink), the component previously required or attempted to extract numerical latitude and longitude, converting the link to `geo:lat,lng` or failing with coordinate validation errors when place links lacked explicit coordinates. Users required a clear "one at a time" experience: if a Location Link is provided, the QR code must encode that exact location link directly so scanning it redirects straight to that destination without requiring lat/long.

**Root Causes**:
1. In [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts), the `.mobile-home-redirect-wrap` contained an `<a [href]="hubUrl">` anchor targeting the tools hub instead of transitioning the internal mobile state back to the input studio (`goToInputState()`).
2. In [location-input.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/location-input/location-input.component.ts), `validation` intercepted map URLs and forced coordinate extraction via `parseMapCoordinates` and `buildGeoPayload`.
3. In [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts), `encodeContent` and `validateContent` for `type === 'geo'` assumed all inputs were comma-separated coordinates and rejected valid HTTP/HTTPS map links.

**Fix Applied**:
1. **Mobile Home Redirection**:
   - Replaced the anchor with an accessible `<button type="button" class="mobile-home-redirect-link" (click)="goToInputState()">` in [qr-generator.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/qr-generator.component.ts).
   - Updated `goToInputState()` to set `this.phoneState.set('input')` and smooth-scroll to top, keeping the user in the QR Generator without full-page reloads.
2. **Location Link Direct Encoding (One at a Time)**:
   - Updated [location-input.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/location-input/location-input.component.ts):
     - In **Map Link mode**: When user provides a link (Google Maps, Apple Maps, OpenStreetMap, or shortlink), it validates as a URL and emits the exact link directly. Latitude and longitude are **not required**.
     - In **Coordinates mode**: Prominently features Latitude, Longitude, and device GPS auto-detection, outputting RFC 5870 `geo:lat,lng`.
   - Updated [qr-generator.service.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.ts):
     - `encodeContent` for `case 'geo'`: Preserves web location links (`/^https?:\/\//i`) directly so scans redirect to that exact link. Coordinates are formatted as `geo:${lat},${lng}` only in Coordinates mode.
     - `validateContent` for `case 'geo'`: Accepts valid web map URLs as well as coordinate ranges.
3. **Updated Test Suites**:
   - Updated [location-input.component.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/components/location-input/location-input.component.spec.ts) and [qr-generator.service.spec.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts) to verify direct location link encoding and validation.


---

## Bug #29: Navigation Bar Invisibility on Medium Devices (Tablets, iPad Mini 768px - 1023px)

**Found**: 2026-10-27, Responsive Inspection on Medium Device Viewport (iPad Mini 768x1024)

**Description**:
On medium screen devices (tablet viewports between 768px and 1023px, such as the iPad Mini at 768x1024), the topbar navigation links (`.ts-zone-center`: "Tool", "About", "How to use", "FAQ", "Related") and the theme toggle were hidden, leaving an unsightly empty expanse across the middle of the navbar. Simultaneously, the 4-circle navigation drawer trigger button (`.ts-tools-grid-btn`) was rendered on tablet viewports despite being requested strictly for small screens (< 768px).

**Root Causes**:
In [ts-topbar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts), the responsive breakpoint was set to `@media (max-width: 1023px)`. This prematurely hid `.ts-zone-center` (`display: none`) and `ts-theme-toggle` (`display: none !important`), forcing `.ts-topbar-card` into a 2-column layout (`1fr auto`) and displaying `.ts-tools-grid-btn` on all tablets up to 1023px width.

**Fix Applied**:
1. In [ts-topbar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts):
   - Restricted the navigation-hiding and 4-circle drawer trigger button strictly to small screens: `@media (max-width: 767px)`.
   - Added a dedicated medium screen breakpoint `@media (min-width: 768px) and (max-width: 1023px)`:
     - Keeps `.ts-zone-center` and `ts-theme-toggle` visible in the navbar.
     - Sets `.ts-tools-grid-btn { display: none !important; }`.
     - Tunes `.ts-topbar-card` padding (`0 12px`), `.ts-tool-chip` max width (`140px`), and `.ts-nav-link-btn` padding (`5px 10px`) and font size (`13px`) for comfortable breathing room without horizontal clipping on 768px tablets.
2. In [ts-topbar.component.spec.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/topbar/ts-topbar.component.spec.ts):
   - Added unit test asserting that medium screen query `@media (min-width: 768px) and (max-width: 1023px)` preserves navigation and hides `.ts-tools-grid-btn`.

**Testing & Verification**:
- Unit tests: `npx vitest run packages/tool-shell/src/components/topbar/ts-topbar.component.spec.ts` (13/13 passed).
- Responsive tests: `npx vitest run apps/tool-qr-generator/src/qr-generator-responsive.spec.ts` (22/22 passed).
- Tier A verification: `node scripts/verify.mjs -A` passed.
- Working tree remains uncommitted per developer guidelines.
