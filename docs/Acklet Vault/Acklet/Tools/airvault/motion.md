# AirVault — Motion & Animation Architecture

Every motion in **AirVault** communicates **state or causality**. No animation exists for purely decorative purposes.

---

## 1. Core Principles & Implementation Summary

| Principle | Interaction & State | Technical Implementation |
| :--- | :--- | :--- |
| **1. Lifecycle Tracker** | `Captured → Secured → Beamed → Ready` | Spring curve `back.out(1.35)` (tension ~300, friction ~26). Morphing stage icons. Single scale bounce (`1 → 1.04 → 1`) on Ready. |
| **2. Directional Beam** | Staging to Constellation Node | GSAP timeline spawning a directional particle from source coordinate traveling toward selected target node bounding rect. |
| **3. Device Constellation** | Node Presence States | Slow `2.4s` breathing glow on active online nodes. `400ms` opacity/border fade when a device goes offline. |
| **4. Sync / ACK Receipt** | Delivery Confirmation (`✓✓`) | First check rendered on send (`Beamed`), second check draws in via SVG `stroke-dashoffset` path animation upon receipt of `SYNC_ACK`. |
| **5. Capture Lift** | ⌘V Paste / Auto-Capture | Physical lift (`scale: 1.02` + elevation) then spring settle into staging area. |
| **6. Sensitive Shutter** | Credential Shielding | Visible `clip-path` shutter close over `220ms` so users register the shielded secret. |
| **7. History Insertion** | Item Feed Reflow | Smooth `translateY(-6px)` + opacity fade in `250ms`. |
| **8. Tile Reflow & FLIP Layout Shift** | Item Arrival, Deletion, Reorder | GSAP FLIP (`First Last Invert Play`) delta calculation smoothly animating sibling tiles to their new grid positions (`power2.out` in `320ms`) when any resource arrives or is deleted. |
| **9. Peer Arrival & Live Beacon** | Remote Cross-Device Arrival | Slide-down (`y: -18px`, `scale: 0.94 -> 1`, `back.out(1.6)`) + expanding radial GPU accent halo pulse (`avSyncPulse` over `950ms`). |
| **10. Smooth Tile Dismissal** | Item Delete / Removal | Shrink and slide-out (`scale: 1 -> 0.88`, `y: 12px`, `opacity: 1 -> 0` in `240ms` with `power2.inOut`) before removing from state. |
| **11. Burn Dissolve Fade-Up** | Burn-After-Read Dismissal | Dedicated fade-up + blur + scale-down (`y: -24px`, `scale: 0.94`, `filter: blur(3px) brightness(1.25)`, `opacity: 0` in `420ms` with `power2.out`) triggered on destination upon preview dismissal, followed by destination-only local purging. |

---

## 2. Global Constraints & Accessibility

- **Duration Ceiling**: No transition exceeds `400ms` (except constellation breathing glow and particle beam travel).
- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` strips transforms and long transitions, falling back to clean opacity updates.
- **Looping Policy**: Continuous animation loops are restricted exclusively to the active presence breathing glow.

---

## 3. Tile Lifecycle, Ghost-Click Prevention & Sizing Rules

### Explicit Lifecycle State Machine
```text
[Rendered / Interactive]
         ↓ (User triggers delete confirmation & executes delete)
[Exiting: pointer-events: none, user-select: none, isExiting=true]
         ↓ (220ms GSAP scale/opacity slide-down exit transition)
[Removed from Signal State: storageService.deleteItemGlobally/Locally]
         ↓ (Angular @for track item.id unmounts DOM node completely)
[FLIP Reflow: Neighboring tiles smoothly translate into reclaimed space]
```

### Key Architectural Invariants
1. **Zero Ghost Click Targets**: Immediately upon initiating an exit animation or burn dissolve, `pointer-events: none` and `user-select: none` are applied to the element, and card action/preview handlers are guarded with `if (this.isExiting()) return;`.
2. **True DOM Unmount**: Tiles are fully unmounted from Angular's DOM tree once the exit transition completes. No invisible (`opacity: 0`) elements remain in the layout.
3. **No Conflicting CSS Transitions**: Sibling `.vault-card-cell` grid items do not use CSS `transition: transform` which would interfere with GSAP's FLIP delta calculations.
4. **Natural Content-Driven Sizing**: Card dimensions are driven naturally by their internal preview content (with a baseline `min-height: 140px`) rather than hardcoded fixed heights.
5. **Absolute Floating Suggestions**: Ghost suggestion docks float above the composer bar (`position: absolute; bottom: 100%`) so that input drafts never displace or reserve space in the clipboard collection before submission.

