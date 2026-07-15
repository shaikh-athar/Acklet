# Acklet Motion & Interaction System

> **Related Documents**:
> - [Design System](Design-System.md)
> - [Product Experience System](Product-Experience-System.md)
> - [Information Architecture](Information-Architecture.md)

---

## 1. Motion Principles

Motion at Acklet is functional, not decorative. It is designed to:
- Communicate relationships (where elements come from).
- Guide attention (draw focus to success/error states).
- Establish hierarchy (expand/collapse cards).
- Maintain responsiveness (animations trigger instantly, never delaying the user).

Every animation must maintain 60 FPS. If an animation stutters, it must be simplified or removed.

---

## 2. Motion Tokens

All CSS transitions use standard tokens to maintain kinetic consistency.

```css
:root {
  /* --- Durations --- */
  --duration-instant: 100ms;  /* Feedback/Hover states */
  --duration-fast: 200ms;     /* Button hover, tooltip fade */
  --duration-smooth: 350ms;   /* Modals, drawers, small expansions */
  --duration-intent: 500ms;   /* Route changes, main page transitions */
  --duration-slow: 750ms;     /* Complex illustrative changes */

  /* --- Easings (Bezier Curves) --- */
  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-cubic: cubic-bezier(0.215, 0.610, 0.355, 1.000);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1); /* Elegant deceleration */
  --ease-in-out-sine: cubic-bezier(0.445, 0.050, 0.550, 0.950);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bounce feedback */
}
```

---

## 3. Kinetic Lifecycle (State Matrix)

Every interactive element defines its lifecycle transitions through the following CSS class structure:

```css
/* --- Base Element CSS --- */
.interactive-item {
  transition: 
    background-color var(--duration-fast) var(--ease-out-cubic),
    border-color var(--duration-fast) var(--ease-out-cubic),
    transform var(--duration-fast) var(--ease-spring),
    box-shadow var(--duration-fast) var(--ease-out-cubic);
}

/* --- Lifecycles --- */
.interactive-item:hover {
  transform: translateY(-2px);
  border-color: rgba(6, 182, 212, 0.3);
  box-shadow: var(--shadow-raised);
}

.interactive-item:focus-visible {
  outline: 2px solid var(--color-brand-cyan);
  outline-offset: 4px;
}

.interactive-item:active {
  transform: translateY(0px) scale(0.98); /* Tactile press down */
}

.interactive-item.disabled {
  pointer-events: none;
  opacity: 0.4;
  transform: none;
}
```

---

## 4. UI Transitions & Animations

### A. Route/Page Transitions
Route changes should feel seamless. We use Angular standard routing animations to slide and fade components:

```typescript
import { trigger, transition, style, animate, query } from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 0,
        transform: 'translateY(12px)'
      })
    ], { optional: true }),
    query(':enter', [
      animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({
        opacity: 1,
        transform: 'translateY(0)'
      }))
    ], { optional: true })
  ])
]);
```

### B. Scroll-Driven Storytelling (GSAP & ScrollTrigger)
Acklet utilizes GSAP `ScrollTrigger` to create layouts that reveal content based on scroll depth.

```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Setup scroll tracking for premium section reveal
export function initScrollReveal(element: HTMLElement) {
  gsap.fromTo(element.querySelectorAll('.scroll-reveal-item'),
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    }
  );
}
```

### C. Success & Feedback Transitions
To confirm actions (e.g. copying a token, completing a format), we trigger a localized micro-animation:

```typescript
// Angular component trigger for toast/badge popups
export const popAnimation = trigger('pop', [
  transition(':enter', [
    style({ transform: 'scale(0.8) translateY(10px)', opacity: 0 }),
    animate('250ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) translateY(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ transform: 'scale(0.95)', opacity: 0 }))
  ])
]);
```

---

## 5. Overlay Motion Architecture

Overlays must maintain consistent enter/exit physics.

### A. Modals
*   **Trigger**: Instant opacity backdrop fade-in.
*   **Scale**: Scale-up from `0.92` to `1.0` with `--ease-spring` timing (`350ms`).
*   **Exit**: Immediate drop slide-down and fade out.

### B. Drawers (Sidebar Panels)
*   **Slide Direction**: Slide from the right edge.
*   **Easing**: `--ease-out-expo` (`350ms`).
*   **Exit**: Reverse slide out.

### C. Toasts
*   **Position**: Bottom-right corner.
*   **Slide**: Slide-up from off-screen (`translateY(100%)`).
*   **Exit**: Slide-right fade out (`translateX(100%)`).

---

## 6. Ambient Kinetic Enhancements

To reinforce the premium desktop environment, subtle continuous animations run in the background:

1.  **Mesh Drift**: The primary background radial gradients shift position subtly over a 30s loop.
2.  **Glass Shimmer**: Light sweeps across cards upon scroll intersection.
3.  **Active Progress**: Real-time loading skeletons use a soft pulsate gradient instead of sharp moving bars.

```css
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-loading {
  background: linear-gradient(90deg, #111115 25%, #1d1d25 50%, #111115 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.8s infinite linear;
}
```
