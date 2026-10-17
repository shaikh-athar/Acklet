# Tool Shell & Page Performance Architecture

This document details the scroll performance, rendering optimizations, developer performance switches, and dependency reductions implemented for the Acklet tool shell and tool pages.

Related Documents:
- Build Configuration: [build-configuration.md](build-configuration.md)
- UI Foundation Architecture: [.agents/rules/UI-FOUNDATION.md](../.agents/rules/UI-FOUNDATION.md)

---

## 1. Developer Performance Switches (`?perf=`)

Acklet provides dynamic performance triage switches via URL search parameters handled by `PerfFlagsService` ([perf-flags.service.ts](../client/packages/tool-shell/src/services/perf-flags.service.ts)) and global styles ([styles.css](../client/src/styles.css)):

Usage format:
```text
http://<tool>.localhost:4200/?perf=noblur,nobg,noshadow,noanim,noicons
```

Supported flags:
- `noblur`: Disables all `-webkit-backdrop-filter` and `backdrop-filter` rules.
- `nobg`: Hides background ambient radial glows and grid layers.
- `noshadow`: Disables animated `box-shadow` and `filter: drop-shadow(...)`.
- `noanim`: Disables CSS keyframe animations and transitions.
- `noicons`: Hides Lordicon and Lottie animation player elements.

---

## 2. Rendering & Frame-Rate Optimizations

### 2.1 Elimination of Scrolling Backdrop Filters
- Removed heavy `-webkit-backdrop-filter` from `.ts-main-card` (the 100dvh scrollable view).
- Fixed background contrast tokens in `tokens.css` to maintain high contrast in light and dark themes without continuous GPU compositor blurs.

### 2.2 Event Listeners Outside NgZone
- **Spotlight Directive** (`TsSpotlightDirective`): Replaced `@HostListener('pointermove')` with passive event listeners registered outside `NgZone` (`zone.runOutsideAngular`), throttled via `requestAnimationFrame`.
- **Sidebar Resize Handle** (`TsResizeHandleComponent`): Drag tracking runs outside `NgZone` with `requestAnimationFrame` width dispatching.
- **Pointer Glow Directive** (`TsPointerGlowDirective`): Pointer tracking executes outside `NgZone` with lerp smoothing.

### 2.3 Angular Change Detection (`OnPush`)
Upgraded all major shell and tool components to `ChangeDetectionStrategy.OnPush`:
- `TsShellComponent`
- `TsTopbarComponent`
- `TsSidebarComponent`
- `TsToolListComponent`
- `TsToolContentComponent`
- `TsFaqComponent`
- `TsAboutCardComponent`
- `TsResizeHandleComponent`
- `TsIconComponent`
- `ClipboardComponent`

### 2.4 Template Pure Pipes
- Created `FormatBytesPipe` (`apps/tool-online-clipboard/src/pipes/format-bytes.pipe.ts`) to eliminate repeated formatting calculations during change detection passes.
- Precomputed `railTools` in `groupedCategories` signal to avoid recurring `.slice(0, 5)` array allocations in template loops.

---

## 3. Scroll Reveal Engine (`[appReveal]`, `[tsReveal]`)

The scroll reveal system is implemented via `TsRevealDirective` ([reveal.directive.ts](../client/packages/tool-shell/src/directives/reveal.directive.ts)) and hardware-accelerated CSS ([base.css](../client/packages/tool-shell/src/styles/base.css)):

- **Single Shared Static Observer**: Uses one static `IntersectionObserver` instance across all elements, configured with `threshold: 0.08` and `rootMargin: '0px 0px -4% 0px'`.
- **Outside NgZone**: Intersect detection and class application run outside `NgZone` to prevent triggering change detection during scrolling.
- **One-Shot Execution**: Elements unobserve immediately upon entering the viewport.
- **Component-Tailored Signatures**:
  - **How-to Step Cards (01, 02, 03, 04)**: Horizontal glide from the left (`translate3d(-32px, 0, 0)` -> `0`) with progressive stagger (`idx * 85ms`) plus spring number tile pop (`scale(0.8)` -> `scale(1.0)`). Includes hover elevation (`translateY(-2px)`) and accent border/tile highlights.
  - **FAQ Accordion Boxes**: Upward depth and soft scale entrance (`translate3d(0, 20px, 0) scale(0.975)` -> `1`) with progressive stagger (`i * 75ms`).
  - **Feature Chips & Badges**: Tactile micro bounce/pop entrance (`translate3d(0, 10px, 0) scale(0.88)` -> `1`) with fast progressive stagger (`fIdx * 45ms`).
  - **Section Headings & Text**: Subtle vertical fade-up (`translate3d(0, 24px, 0)` -> `0`).
- **Hardware Acceleration**: Transitions use `translate3d` with cubic-bezier easing and release layer memory via `will-change: auto` once `.is-visible` is applied.
- **Accessibility**: Honors `prefers-reduced-motion: reduce` by immediately making elements visible with zero transition delay.

---

## 4. Unused Package Removal

Removed 34 unused npm packages (including transitive dependencies):
- `lenis`: Unused smooth scrolling library.
- `@taiga-ui/cdk`, `@taiga-ui/core`, `@taiga-ui/kit`: Unused secondary fallback component library.
- `@angular/animations`: Replaced with pure CSS animations in `toast.ts`.

---

## 5. Shell Layout & Sidebar Motion Architecture

Implemented synchronized, smooth sidebar collapse and expansion tokens:
- **Design Tokens**:
  - `--ts-motion-sidebar: 520ms;`
  - `--ts-motion-theme: 1100ms;`
  - `--ts-ease-premium: cubic-bezier(.22, .61, .36, 1);`
- **Synchronized Shell Transitions**: The shell grid column tracks animate seamlessly over 520ms, preventing jumpy content reflows in the main workspace and description sections.
- **Fixed Width Inner Overflow Guard**: Prevents text wrapping or layout shifts during width transitions.
- **Accessibility**: Full `prefers-reduced-motion: reduce` guards disable layout animations and apply instant width changes.

---

## 6. Flower-Opening Theme Switch Transition

- Implemented an organic, slow circular theme reveal spreading outwards from the theme toggle switch using `document.startViewTransition` when supported (and smooth fallback where unsupported).
- Timed at 1100ms with `var(--ts-ease-premium)` for a tranquil, blooming aesthetic that preserves high-contrast readability across all surfaces.

---

## 7. FAQ Accordion Physics & Geometry Fixes

- **Accordion Motion (`ts-faq.component.ts`)**:
  - Card-level clickable hit targets with `padding: 16px 20px` and complete card-level outline on `:focus-within`.
  - Accordion expansion transition set to `0.7s var(--ts-ease-premium)` via smooth `grid-template-rows: 0fr` to `1fr`.
  - Extra questions drawer (`.ts-faq-extra-drawer`) expands/collapses over 0.7s with rotating chevron indicator.
- **Minus Icon Geometry Fix**: Changed toggle rotation from 90deg (which turned horizontal `-` into a vertical `|`) to 180deg so the minus symbol always remains a true horizontal line.

---

## 8. Navbar Focus & Jewel Star Celebration Micro-Burst

- **Light Theme Navigation Focus (`ts-topbar.component.ts`)**:
  - High-contrast capsule track (`rgba(15, 23, 42, 0.045)`) and elevated white indicator pill (`#FFFFFF` + accent border + shadow).
  - Active section link text styled in deep teal (`#0F766E`) for instantaneous section identification.
- **Jewel Star Save Celebration**:
  - Star polygon filled with radiant linear gradient (`#F59E0B` gold -> `#10B981` emerald -> `#06B6D4` cyan).
  - Main star springs with elastic scale pop (`tsStarPop`: 1.0 -> 1.35 -> 0.9 -> 1.08 -> 1.0).
  - 4 miniature four-point star SVGs burst diagonally outward and fade smoothly upon saving.

---

## 9. Online Clipboard UX Architecture (`apps/tool-online-clipboard`)

- **Underline Tab Group**:
  - Removed brittle, hardcoded pixel offsets (`translateX(156px)`, `translateX(276px)`).
  - Implemented responsive per-tab active indicators via `.underline-tab::after` that dynamically fit any tab width and font metrics.
  - Standardized sizing hierarchy: 18px tab icon, 14px label, 11px count badge.
  - Active tab accent color applied to icon, text, and count badge with smooth hover transitions.
- **Receiver Pairing Box (`Enter 5-Digit Code or Word Code`)**:
  - Separated into an elevated, dedicated pairing card box (`.receiver-input-section`) with 16px radius, soft drop shadow, header icon tile, and monospace code input with prefix key icon.
  - Added live sync pulse dot indicator and connected share badge.
- **Unified Upload & Drop Zone**:
  - Permanently hidden native browser `<input type="file">` elements (`style="display: none"` + `.hidden` utility class), eliminating default "Choose files No file chosen" text.
  - Combined drag-and-drop and upload browse target into a single unified hero component in Send mode.
  - Suppressed redundant duplicate empty-state upload cards beneath the drop zone when in Send mode.
- **Tool Area Borderless Refinements**:
  - Removed container borders from `.text-input-box-container`, `.empty-spartan-card`, `.mode-segmented-control`, `.receiver-input-section`, `.file-drop-zone`, and `.ts-tool-card-surface`.
  - Replaced border-dependent containment with clean surface fills (`var(--surface-hover)`), subtle elevated shadows, and accessible focus outlines.

---

## 10. FAQ Accordion & Navigation Polish (`packages/tool-shell`)

- **Zero Unnecessary Space When FAQ Is Closed**:
  - Removed `[initialOpenIndex]="0"` so that FAQ items are not unexpectedly expanded on initial load.
  - Set default `initialOpenIndex` to `null` in `ts-faq.component.ts`.
  - Eliminated bottom padding from `.ts-faq-panel-content` when collapsed (`padding: 0 20px 0 20px`), applying `18px` padding-bottom only when `.is-open`.
  - Added `visibility: hidden; opacity: 0;` on collapsed grid rows to prevent any sub-pixel layout leaks.
- **Dedicated Horizontal Minus Icon & 0.6s Smooth Accordion**:
  - Replaced rotated dynamic icon with dedicated SVG line primitives (`<line x1="5" y1="12" x2="19" y2="12"></line>`).
  - Removed all wrapper rotation transforms (`rotate(180deg)`), ensuring the close icon remains perfectly horizontal (`-`) and never resembles an "or" pipe (`|`).
  - Tuned accordion expand/collapse timing to `0.6s` with `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- **Light Theme Navbar Focus & Active State**:
  - Corrected Angular component encapsulation targeting using `:host-context([data-theme="light"])` and `:host-context(:not([data-theme="dark"]))`.
  - Styled center capsule track with soft recessed background `rgba(15, 23, 42, 0.05)` and subtle hairline border.
  - Active pill renders crisp solid white `#FFFFFF` with soft drop shadow and subtle accent border.
  - Active navigation label utilizes bold `700` weight with high-contrast accent `#0F766E` for effortless visual identification without funky styling.

---

## 12. Online Clipboard Responsive Restructure & Layout System

- **Three-Zone Architecture (Desktop 100dvh First-Screen Rule & Zero Outer Scroll)**:
  - `.clipboard-container` forms a flex column (`flex: 1 1 auto; height: 100%; min-height: 0; overflow: hidden;`).
  - **Zone 1 (Fixed Top)**: Fixed-height mode switcher (`Send | Receive`) and right-aligned action cluster (`Settings`, `History`, `ZIP`, `Report`). Tab strip reserves exactly 44px with 0px jumping between tabs.
  - **Zone 2 (Flexible Middle)**: The sole scrolling area with `overflow-y: auto`, `scrollbar-gutter: stable`, and `overscroll-behavior: contain`. Textarea grows dynamically to fill the viewport (min-height 160px). Empty drop zones stretch to fill available height (min-height 220px).
  - **Zone 3 (Fixed Bottom)**: Sticky primary action button with `padding-bottom: env(safe-area-inset-bottom)`.
- **Drawer History & Settings Placement**:
  - Removed permanently visible recent clipboards panel from the top of the tool area. History is accessible via the top-bar button (desktop right-side drawer, mobile bottom sheet).
  - Moved Private Mode toggle into Settings modal; a subtle `Private` badge chip appears beside the mode switch only while enabled.
- **Copy Tokens & Config Single-Source-of-Truth**:
  - Centralized all user-facing strings into [`clipboard.copy.ts`](file:///Users/ayaz/Acklet/client/apps/tool-online-clipboard/src/clipboard.copy.ts).
  - Centralized limits (1 MB text, 200 MB files, 1 GB total, 7-day retention) into [`clipboard.config.ts`](file:///Users/ayaz/Acklet/client/apps/tool-online-clipboard/src/clipboard.config.ts).
- **Responsive Breakpoint Verification**:
  - `< 640px`: Full width segmented control; tabs collapse to 3-column segmented button grid with icon above label; 44x44px minimum tap targets; toolbar buttons icon-only; history drawer transforms into bottom sheet.
  - `640px - 1024px`: Tablet layout with single-row toolbar and proportional spacing.
  - `> 1024px`: Full desktop expansion with centered readable content stream.
  - `Landscape phones` (`orientation: landscape` & `max-height: 520px`): Compressed vertical spacing, middle zone still scrolls, bottom button stays reachable.

---

## 13. Phase 5 Performance & AI Workflow Optimizations

### 13.1 Smart Scope Verification Architecture (`scripts/verify.mjs`)
- **Auto-Detecting Changed Surfaces**: Leverages git working tree status (`git status --porcelain`) to detect whether files under `client/`, `server/`, or both have changed.
- **Selective Layer Skipping**:
  - Frontend-only changes automatically skip `mvnw test-compile`, executing in **~5.0s**.
  - Backend-only changes automatically skip frontend typechecks and linters, executing in **~2.8s**.
  - All layers run unconditionally during Level C integration checks or when passed `--all`.
- **Honest Skipped Reporting**: Every skipped step is explicitly tracked in the summary table with its underlying reason and duration (`0.00s`), ensuring full visibility without pipeline gaming.

### 13.2 Build Optimization Bailout Elimination
- **CommonJS Dependency Allowlist**: Configured `allowedCommonJsDependencies` in [angular.json](../client/angular.json) for `qrcode`, `lottie-web`, and `dijkstrajs`.
- **Impact**: Completely eliminated Angular CLI build optimization bailout warnings during production builds.

### 13.3 Atomic High-Throughput Usage Increments
- **Direct SQL Execution**: Upgraded `ToolRepository` with an atomic `@Modifying @Query("UPDATE Tool t SET t.usageCount = t.usageCount + 1 WHERE t.id = :toolId")` query.
- **Cache Eviction Elimination**: Removed the destructive `@CacheEvict(value = {"tools_detail", "tools_trending", "tools_featured"}, allEntries = true)` from `ToolService.incrementUsage()`. Tool tracking no longer thrashes the entire tools catalog cache or executes a 2-step SELECT-then-UPDATE database roundtrip.

### 13.4 Bounded In-Memory Share Management
- **TTL & Expiry Cleansing**: Added `cleanupExpiredShares()` in `ClipboardService` triggered on lookup thresholds (`size > 500`), removing expired shares past their `expiresAt` timestamp.
- **Impact**: Guarantees zero memory leaks in long-running processes without requiring complex external cron daemons.

### 13.5 AI Workflow & Productivity Rules
- Codified strict agent guidelines in [.agents/AGENTS.md](../.agents/AGENTS.md):
  1. Targeted line-range inspections (`view_file` slices) instead of dumping 800+ line files.
  2. Command failure circuit breaker prohibiting repeated attempts of identical failed commands.
  3. Strict elimination of redundant browser exploration and repetitive screenshot capture when no visual template or CSS code has changed.
  4. Three-tier verification discipline (`-A`, `-B`, `-C`).
