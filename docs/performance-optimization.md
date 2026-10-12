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



