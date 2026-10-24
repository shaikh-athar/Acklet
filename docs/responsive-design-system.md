# Acklet Responsive Design System & Mobile Rollout Guide

## 1. Overview
This document specifies the responsive and device-aware architecture for Acklet tools and the shared tool shell. It defines capability-based device classes, layout arrangements, interactive touch gestures, performance optimizations, and a rollout checklist for adopting tools.

Related documentation:
- [ui-design-system.md](./ui-design-system.md)
- [standalone-tool-architecture.md](./standalone-tool-architecture.md)
- [performance-optimization.md](./performance-optimization.md)
- [verification-guide.md](./verification-guide.md)

---

## 2. Device Breakpoints & Capability Matrix

Acklet strictly rejects user-agent sniffing. Device awareness is determined purely through viewport geometry, media capabilities, visual viewport metrics, and pointer mechanics.

### 2.1 Breakpoint Classification
| Device Class | Viewport Width | Primary Layout | Shell Navigation | Overflow Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Phone** | $\le 640$px | Single-column stacked / state-driven flow | Hamburger drawer + 3-dots menu | Segmented tabs (`Tool`, `About`, `How`, `FAQ`, `Related`) |
| **Tablet Portrait** | $641\text{px} - 1023\text{px}$ | Stacked / wide column | Expanded topbar with icon buttons | Segmented tabs for secondary content |
| **Tablet Landscape** | $1024\text{px} - 1279\text{px}$ | Split two-column ($55\% / 45\%$) | Standard topbar | Standard sidebar / on-scroll sections |
| **Desktop** | $\ge 1280$px | Two-column split grid with sticky preview | Full desktop topbar + tool links | Full below-the-fold content sections |

### 2.2 Input Mode Detection
- **`mouse`**: `(hover: hover) and (pointer: fine)`
- **`touch`**: `(hover: none) and (pointer: coarse)`
- **`hybrid`**: Devices reporting both touch and fine pointing (e.g. iPad with Magic Keyboard, Microsoft Surface).

---

## 3. Shared Reusable Primitives (`@acklet/tool-shell`)

All responsive primitives are maintained in `client/packages/tool-shell` and exported from the library root for universal reuse across any tool.

### 3.1 `ResponsiveService`
Injectable root service providing reactive signals for device dimensions and capabilities:
- `deviceClass`: Signal<'phone' | 'tablet-portrait' | 'tablet-landscape' | 'desktop'>
- `inputMode`: Signal<'mouse' | 'touch' | 'hybrid'>
- `orientation`: Signal<'portrait' | 'landscape'>
- `keyboardOpen`: Signal<boolean> (Tracks `window.visualViewport` shrinkage $\ge 150$px)
- `safeAreaInsets`: Signal<{ top: number, right: number, bottom: number, left: number }>
- `prefersReducedMotion`: Signal<boolean>
- `shouldReduceEffects`: Signal<boolean> (`isPhone() || prefersReducedMotion()`)
- Convenience helpers: `isPhone()`, `isTablet()`, `isTabletPortrait()`, `isTabletLandscape()`, `isDesktop()`, `isTouch()`, `isMouse()`, `isShortViewport()`.

### 3.2 `BottomSheetComponent` (`<ts-bottom-sheet>`)
Mobile-native sliding sheet component designed for phone viewports:
- **Gestures**: Drag handle with touch tracking; dismisses on downward swipe $\ge 75$px.
- **Backdrop & Dismiss**: Click backdrop to dismiss; `Escape` key support.
- **Safe Areas**: Automatically includes `env(safe-area-inset-bottom)`.
- **Performance**: Disables GPU-heavy blur on phone in favor of solid surfaces (`rgba(0, 0, 0, 0.75)`).
- **Reduced Motion**: Disables slide/fade transitions when `prefers-reduced-motion` is active.

### 3.3 `StickyActionBarComponent` (`<ts-sticky-action-bar>`)
Docked or floating bottom action bar:
- **Virtual Keyboard Evasion**: Reactively hides (`transform: translateY(...)`) when virtual keyboards open (`keyboardOpen() === true`), preventing form inputs from being obstructed.
- **Touch Target Enforcements**: Enforces minimum $44 \times 44$px touch targets for nested buttons.
- **Safe Area Padding**: Adds bottom safe-area insets (`calc(12px + env(safe-area-inset-bottom))`).

### 3.4 `AdaptiveDropdownComponent` (`<ts-adaptive-dropdown>`)
Hybrid menu that automatically adapts to the user's device:
- On **Desktop & Tablet Landscape**: Renders an accessible floating popover menu.
- On **Phone**: Automatically transitions into a `<ts-bottom-sheet>` for thumb-friendly reachability.

### 3.5 Touch Gesture Directives
- **`TsLongPressDirective` (`[tsLongPress]`)**: Triggers after a 500ms hold. Includes touch drift cancellation (12px threshold) and light haptic feedback on trigger.
- **`TsDoubleTapDirective` (`[tsDoubleTap]`)**: Triggers on double tap within 300ms and 20px radius.

### 3.6 `HapticService`
Lightweight tactile feedback utility wrapping `navigator.vibrate`:
- Patterns: `light` (12ms), `medium` (24ms), `heavy` (45ms), `selection` (8ms), `success` ([12ms, 40ms, 20ms]), `warning` ([25ms, 40ms, 25ms]), `error` ([40ms, 40ms, 40ms]).
- Silently degrades to no-op on unsupported browsers or desktop mice.

---

## 4. Reference Implementation: QR Generator (`tool-qr-generator`)

The QR Generator demonstrates full adoption of the responsive design system:

1. **State-Driven Mobile Flow (`phoneState`)**:
   - **State A (`input`)**: Content-focused input view. The QR preview is omitted until requested.
   - **State B (`result`)**: Displays the generated QR code with animated reveal, primary download/share actions, and Quick Actions.
   - **State C (`design`)**: Full-screen customizer with a sticky live mini-preview and a "Done" button.
2. **Browser History Integration**:
   - Tapping "Generate QR Code" or "Customize Design" pushes a new history state via `window.history.pushState({ qrScreenState: ... })`.
   - The device hardware/browser Back button triggers `popstate` to navigate cleanly backward (`design` $\to$ `result` $\to$ `input`) without leaving the page.
3. **QR Quick Action Context Sheet**:
   - Long pressing or double tapping the QR code triggers a `<ts-bottom-sheet>` with Save, Share, Copy, and Fullscreen actions.
4. **iOS Safari Auto-Zoom Fix**:
   - All text inputs and select dropdowns enforce `font-size: 16px !important` on viewports $\le 1023$px, preventing involuntary viewport zooming on focus.
5. **Dynamic Generation Debounce**:
   - Input updates dynamically debounce at 350ms on mobile touch devices (reducing CPU/battery drain during virtual keyboard typing) and 200ms on desktop.

---

## 5. Rollout Checklist for Other Tools

Follow this step-by-step checklist when upgrading any existing or new Acklet tool (e.g. JSONLens, JWT Decoder, Hash Generator):

### Step 1: Import Tool-Shell Primitives
```typescript
import {
  ResponsiveService,
  BottomSheetComponent,
  StickyActionBarComponent,
  AdaptiveDropdownComponent,
  TsLongPressDirective,
  TsDoubleTapDirective,
  HapticService
} from '@acklet/tool-shell';
```

### Step 2: Form Input Touch & Zoom Safeguards
In the tool's component stylesheet, guarantee 16px font sizing on mobile to prevent iOS Safari auto-zoom:
```css
@media (max-width: 1023px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
```
Specify appropriate mobile keyboard attributes:
- `inputmode="url"` for URL inputs
- `inputmode="email"` for email addresses
- `inputmode="numeric"` for numbers
- `enterkeyhint="done"` or `enterkeyhint="go"`

### Step 3: Replace Popovers with `<ts-adaptive-dropdown>`
Replace custom floating popovers with `<ts-adaptive-dropdown>` so options open in a native bottom sheet on phones:
```html
<ts-adaptive-dropdown title="Select Encoding" [(isOpen)]="isMenuOpen">
  <!-- Trigger -->
  <button trigger type="button" class="my-trigger-btn">...</button>
  
  <!-- Content items -->
  <button type="button" class="menu-item" (click)="setEncoding('utf-8')">UTF-8</button>
  <button type="button" class="menu-item" (click)="setEncoding('base64')">Base64</button>
</ts-adaptive-dropdown>
```

### Step 4: Primary Actions Docked in `<ts-sticky-action-bar>`
On phone viewports, dock primary submit, copy, or format actions to the bottom:
```html
@if (responsive.isPhone()) {
  <ts-sticky-action-bar [hideOnKeyboard]="true">
    <button type="button" class="spartan-btn spartan-btn-default w-full" (click)="executeAction()">
      Run Tool
    </button>
  </ts-sticky-action-bar>
}
```

### Step 5: Mobile Performance & Backdrop Optimization
- Verify that heavy animations check `@media (prefers-reduced-motion: reduce)`.
- Use `responsive.shouldReduceEffects()` to debounce heavy background recalculations or omit resource-intensive canvas blurs.
- Avoid full-screen `backdrop-filter: blur(...)` on phone screens; replace with opaque background fills.

---

## 6. Verification Checklist
- [ ] **Phone Portrait (390px)**: Inputs do not auto-zoom; primary CTA visible without scrolling; menus open in bottom sheet.
- [ ] **Phone Landscape (844x390)**: Layout uses compact headers (`isShortViewport()`); no elements clipped.
- [ ] **Tablet Portrait (768px)**: Segmented tabs cleanly display tool vs metadata sections.
- [ ] **Desktop (1440px)**: Two-column layout; floating dropdowns; sticky sidebars.
- [ ] **Keyboard Interaction**: Virtual keyboard appearance evades action bar; inputs remain in view.
- [ ] **Touch & Haptics**: Long press triggers haptics; tapping backdrop dismisses sheets cleanly.
