# AirVault — Motion System & UX Interaction Design

## 1. Motion Principles
AirVault’s motion design reinforces connection and spatial awareness without introducing sluggish delays:
- **Purposeful:** Animations confirm state changes (syncing, delivered, offline, copied).
- **Fast & Responsive:** Duration stays between `150ms` and `250ms` using cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Spatial Continuity:** Items sent to other devices visually travel upward/outward; received items slide in from top with a subtle pulse.
- **Accessibility:** Full support for `prefers-reduced-motion: reduce`.

---

## 2. Feature Motion Specification

| Event / State | Trigger | Animation Behavior | Duration / Curve |
| :--- | :--- | :--- | :--- |
| **New Synchronized Item Received** | Remote clip event arrived | Hero card subtle green/emerald radial pulse + downward slide-in (`translateY(-8px) -> 0`). | `220ms` ease-out |
| **Outbound Syncing** | Content captured / staged | Border pulse indicator glows blue -> changes to steady green on ACK. | `180ms` loop -> resolve |
| **1-Click Copy Confirmation** | User clicks Copy button | Icon smoothly transitions from `Copy` to `Check` with scale spring (`scale(1.15) -> 1`). | `150ms` spring |
| **Device Pairing / Connection** | Peer device registers | New device card enters with fade + scale (`scale(0.95) -> 1`), pulse ring around status dot. | `240ms` ease-out |
| **Device Disconnect / Offline** | Heartbeat missed / Revoke | Device status indicator changes from green to amber/gray with smooth color fade. | `300ms` linear |
| **Target Send Action** | User pushes to device | Button ripple + toast feedback with device name. | `200ms` ease |

---

## 3. Visual & Theming Direction

- **Dark Theme (Default):** Deep slate/zinc backdrop (`#09090b`), surface containers (`#18181b`), subtle zinc borders (`#27272a`), emerald accents for live sync, sky blue for transport.
- **Light Theme:** Crisp white/slate surface (`#ffffff` / `#f8fafc`), clean zinc borders (`#e4e4e7`), high-contrast text (`#09090b`), rich emerald and indigo accents.
- **Typography:** Inter / Outfit clean sans-serif with monospace font for hashes, codes, and JSON/code clipboard items.
