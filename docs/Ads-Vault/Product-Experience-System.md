# Acklet Product Experience System

> **Related Documents**:
> - [Design System](Design-System.md)
> - [Motion System](Motion-System.md)
> - [Information Architecture](Information-Architecture.md)

---

## 1. Core Principles

Acklet is engineered for utility. Every pixel and interaction is guided by our product philosophy:

1.  **Less but Better**: If a feature or visual element does not help the user accomplish their direct goal, delete it.
2.  **Content First**: The tool's output panel is the hero of the screen. Keep control sidebars compact.
3.  **Physical Intent**: Every state transition mimics physics. Elements feel tactile, possessing weight, speed, and responsiveness.
4.  **No Placeholders**: Real data, crisp icons, and complete workflows.
5.  **Always Desktop-First**: It operates in the browser, but it should feel like it was installed native to macOS or Windows.

---

## 2. Premium Details (Aesthetic Enhancements)

These enhancements must remain subtle and never distract from usability. They represent the "craftsmanship" layer of the application.

### A. Ambient Lighting & Spotlight Effects
Hoverable cards or interactive headers feature a dynamic "spotlight hover" where the mouse cursor acts as a soft light source on the element border.

```typescript
// Spotlight Directive implementation
import { Directive, HostListener, HostBinding } from '@angular/core';

@Directive({
  selector: '[appSpotlight]',
  standalone: true
})
export class SpotlightDirective {
  @HostBinding('style.--mouse-x') mouseX = '0px';
  @HostBinding('style.--mouse-y') mouseY = '0px';

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.mouseX = `${e.clientX - rect.left}px`;
    this.mouseY = `${e.clientY - rect.top}px`;
  }
}
```
Corresponding border style:
```css
.card-spotlight {
  position: relative;
  background: var(--color-surface-panel);
}
.card-spotlight::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: radial-gradient(
    150px circle at var(--mouse-x) var(--mouse-y),
    rgba(6, 182, 212, 0.15),
    transparent 80%
  );
  z-index: 0;
  pointer-events: none;
}
```

### B. Border Shimmer & Sweeping Highlights
When a tool runs successfully or changes focus, a subtle sweep of light moves across the border:

```css
@keyframes shimmer-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.shimmer-border {
  position: relative;
  overflow: hidden;
}

.shimmer-border::after {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.4), transparent);
  animation: shimmer-sweep 2s infinite linear;
}
```

### C. Glass Reflections & Frosting
Popovers and floating menus use high-fidelity glassmorphism with dynamic backing color adjustments to avoid muddiness in dark interfaces:

```css
.premium-glass {
  background: rgba(10, 10, 12, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

### D. Magnetic Action Pull
Primary call-to-actions (CTAs) magnetize to the user's cursor when within a `40px` radius, giving a satisfying "stick" to navigation. This is handled via GSAP hover listening on the element bounds.

---

## 3. Component State Matrix

Every component (Buttons, Inputs, Cards, Badges) must support its entire lifecycle states:

```
[Default] ──► [Hover] ──► [Pressed] ──► [Loading/Running] ──► [Success / Error]
   │             │                                                   │
   ▼             ▼                                                   ▼
[Disabled]   [Focus-Ring]                                       [Empty State]
```

### A. Lifecycle State Requirements
1.  **Default**: High contrast text, neutral subtle border.
2.  **Hover**: Spotlight active, border turns to accent-blend.
3.  **Focus**: Highlight ring (`var(--color-brand-cyan)`), no system outline.
4.  **Pressed/Active**: `-1px` transform drop, scale down `0.98`.
5.  **Disabled**: Cursor `not-allowed`, opacity `0.4`, background changes to static neutral dark.
6.  **Loading**: Replaces text with a smooth loading loop, button is inactive.
7.  **Success/Error**: Transition to state border color (`feedback-success` or `feedback-error`) with subtle icon pop.
8.  **Empty**: Icon + Title + secondary instructions, clean layout.

---

## 4. Scalability Architecture

To ensure the design scales cleanly as the platform grows, the interface is split into two primary layout components:

### 1. Public Content Architecture ([MainLayoutComponent](file:///Users/ayaz/Acklet/client/src/app/layout/main-layout/main-layout.ts))
This component hosts all unauthenticated, discoverable pages (Home, About, Contact, Blog, Community).
*   **Global Navigation**: Header links focus on discovery (Tools catalog, Categories, Blog, Community threads).
*   **Content Canvas**: Flexible column formatting which centers copy for article details or maps to multi-column grids for tools and categories.
*   **Global Footer**: Handles site-wide copyright, policy references, and visual typography highlights. Suppressed on auth routes to minimize distraction.

### 2. Workspace Sidebar Architecture ([ShellLayoutComponent](file:///Users/ayaz/Acklet/client/src/app/layout/shell/shell.ts))
This layout handles all logged-in operations, providing a dense, application-like dashboard interface.
*   **Sticky Sidebar**: Left-hand navigation containing all cockpit routes (Dashboard, Favorites, History, Collections, Notifications, Settings). Dynamically collapses to a compact icon strip on viewport sizes below `768px` to preserve screen real estate.
*   **Core Workspace Canvas**: Maximizes horizontal and vertical space, aligning components to standard padding margins for data density.
*   **Expansion Ready**: Designed to support future layout elements (like a floating AI Companion or right-side inspection drawer) without disrupting core navigation workflows.
