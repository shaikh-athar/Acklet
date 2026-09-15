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

---

## 2. Global Constraints & Accessibility

- **Duration Ceiling**: No transition exceeds `400ms` (except constellation breathing glow and particle beam travel).
- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` strips transforms and long transitions, falling back to clean opacity updates.
- **Looping Policy**: Continuous animation loops are restricted exclusively to the active presence breathing glow.
