import { Injectable } from '@angular/core';
import { gsap } from 'gsap';

@Injectable({
  providedIn: 'root'
})
export class AirVaultMotionService {
  private prefersReducedMotion = false;

  // Tactile playful spring easing
  readonly springEase = 'back.out(1.4)';
  readonly elasticEase = 'elastic.out(1, 0.75)';

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  /**
   * 1. Elastic-ease clipboard item insertion animation.
   */
  animateItemInsert(element: HTMLElement) {
    if (this.prefersReducedMotion || !element) return;

    gsap.fromTo(
      element,
      { y: -16, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: this.elasticEase }
    );
  }

  /**
   * 1b. Distinct Entrance Animation for Clipboard Item lifecycle:
   * - New local capture: Crisp upward spring entrance with slight overshoot (scale 0.94 -> 1, translateY 16px -> 0, opacity 0 -> 1)
   * - Synced from peer: Peer beacon entrance (translateY -16px -> 0, scale 0.95 -> 1, opacity 0 -> 1) followed by subtle accent halo pulse
   */
  animateCardEnter(element: HTMLElement, isSynced: boolean = false) {
    if (!element) return;
    if (this.prefersReducedMotion) {
      gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      return;
    }

    if (isSynced) {
      // Synced peer entrance: slide down + accent border pulse
      gsap.fromTo(
        element,
        { opacity: 0, y: -18, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.38,
          ease: 'back.out(1.6)',
          clearProps: 'transform,opacity',
          onComplete: () => {
            this.animateCardSyncPulse(element);
          }
        }
      );
    } else {
      // Local capture entrance: crisp spring pop up
      gsap.fromTo(
        element,
        { opacity: 0, y: 18, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          ease: 'back.out(1.5)',
          clearProps: 'transform,opacity'
        }
      );
    }
  }

  /**
   * 1c. Distinct Deletion / Dismissal Animation:
   * Smoothly shrinks and slides out (scale 1 -> 0.88, translateY 0 -> 12px, opacity 1 -> 0)
   * in 240ms with smooth cubic-bezier easing before triggering onComplete.
   * Immediately disables pointer-events and marks element as exiting to prevent ghost clicks.
   */
  animateCardDelete(element: HTMLElement, onComplete?: () => void) {
    if (!element) {
      if (onComplete) onComplete();
      return;
    }

    // Immediately neutralize all user interactions on exiting tile
    element.style.pointerEvents = 'none';
    element.style.userSelect = 'none';
    element.classList.add('av-card-exiting');

    if (this.prefersReducedMotion) {
      gsap.to(element, {
        opacity: 0,
        duration: 0.1,
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });
      return;
    }

    gsap.to(element, {
      opacity: 0,
      scale: 0.88,
      y: 12,
      duration: 0.22,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * 1c-2. FLIP (First Last Invert Play) Grid Layout Transition:
   * Smoothly moves neighboring tiles when an item is added, removed, or reordered.
   */
  animateGridFlip(container: HTMLElement, cardPositionsBefore: Map<string, DOMRect>) {
    if (this.prefersReducedMotion || !container || cardPositionsBefore.size === 0) return;

    const cards = container.querySelectorAll<HTMLElement>('.vault-card-cell');
    cards.forEach(card => {
      const cardInner = card.querySelector<HTMLElement>('.av-card');
      const cardId = cardInner?.getAttribute('data-card-id');
      if (!cardId) return;

      const firstRect = cardPositionsBefore.get(cardId);
      if (!firstRect) return; // New card — handled by entrance animation

      const lastRect = card.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        gsap.fromTo(
          card,
          { x: deltaX, y: deltaY },
          {
            x: 0,
            y: 0,
            duration: 0.32,
            ease: 'power2.out',
            clearProps: 'transform'
          }
        );
      }
    });
  }

  /**
   * 1d. Distinct Sync / Update / Resend Flash Animation:
   * Fast, subtle border glow / halo pulse that signals an item was refreshed or synced.
   */
  animateCardSyncPulse(element: HTMLElement) {
    if (this.prefersReducedMotion || !element) return;

    element.classList.remove('av-sync-pulse-active');
    // Force reflow to re-trigger if already active
    void element.offsetWidth;
    element.classList.add('av-sync-pulse-active');

    setTimeout(() => {
      element.classList.remove('av-sync-pulse-active');
    }, 850);
  }

  /**
   * 1e. Tactile Pin / Unpin Spring Transition:
   * Subtle micro-tilt and spring settle when pinning or unpinning.
   */
  animateCardPin(element: HTMLElement, isPinned: boolean) {
    if (this.prefersReducedMotion || !element) return;

    if (isPinned) {
      // Pinning: micro-lift + subtle rotation settle
      gsap.timeline()
        .to(element, { scale: 1.02, y: -3, duration: 0.12, ease: 'power2.out' })
        .to(element, { scale: 1, y: 0, duration: 0.22, ease: this.springEase, clearProps: 'transform' });
    } else {
      // Unpinning: quick tactile dip
      gsap.timeline()
        .to(element, { scale: 0.98, y: 2, duration: 0.1, ease: 'power1.out' })
        .to(element, { scale: 1, y: 0, duration: 0.18, ease: 'power2.out', clearProps: 'transform' });
    }
  }

  /**
   * 2. 4-step progress timeline animation for beamed sync items.
   */
  animateSyncTimeline(container: HTMLElement) {
    if (this.prefersReducedMotion || !container) return;

    const steps = container.querySelectorAll('.stage-step');
    const connectors = container.querySelectorAll('.stage-connector');

    const tl = gsap.timeline();

    steps.forEach((step, idx) => {
      tl.fromTo(
        step,
        { scale: 0.85, opacity: 0.6 },
        { scale: 1.05, opacity: 1, duration: 0.18, ease: 'back.out(1.6)' }
      ).to(step, { scale: 1, duration: 0.1 });

      if (connectors[idx]) {
        tl.fromTo(
          connectors[idx],
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.14, ease: 'power2.out' },
          '-=0.08'
        );
      }
    });
  }

  /**
   * 2b. Prototype signature Beam line fill sequence.
   */
  animateBeamTrack(fills: HTMLElement[], nodes?: NodeListOf<Element> | HTMLElement[]) {
    if (this.prefersReducedMotion || !fills || fills.length === 0) return;

    gsap.set(fills, { width: '0%' });
    const tl = gsap.timeline();

    fills.forEach((fill, i) => {
      tl.to(fill, { width: '100%', duration: 0.35, ease: 'power1.inOut' });
      if (nodes && nodes[i + 1]) {
        tl.to(nodes[i + 1], { scale: 1.25, duration: 0.15, ease: 'back.out(3)' }, '-=0.1')
          .to(nodes[i + 1], { scale: 1, duration: 0.2 }, '-=0.05');
      }
    });
  }

  /**
   * 3. Micro-bounce on buttons / interactive controls.
   */
  animateButtonBounce(element: HTMLElement) {
    if (this.prefersReducedMotion || !element) return;

    gsap.to(element, {
      scale: 0.92,
      duration: 0.08,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut'
    });
  }

  /**
   * 4. Directional particle streak traveling between components/devices.
   */
  animateBeam(fromEl: HTMLElement, toEl: HTMLElement, onComplete?: () => void) {
    if (this.prefersReducedMotion || !fromEl || !toEl) {
      if (onComplete) onComplete();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const particle = document.createElement('div');
    particle.className = 'airvault-sync-particle';
    particle.style.position = 'fixed';
    particle.style.zIndex = '9999';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.borderRadius = '50%';
    particle.style.background = '#2196F3';
    particle.style.boxShadow = '0 0 12px #2196F3, 0 0 24px #90CAF9';
    particle.style.pointerEvents = 'none';
    particle.style.left = `${fromRect.left + fromRect.width / 2}px`;
    particle.style.top = `${fromRect.top + fromRect.height / 2}px`;

    document.body.appendChild(particle);

    const targetX = toRect.left + toRect.width / 2;
    const targetY = toRect.top + toRect.height / 2;

    const tl = gsap.timeline({
      onComplete: () => {
        particle.remove();
        if (onComplete) onComplete();
      }
    });

    tl.to(particle, {
      x: targetX - (fromRect.left + fromRect.width / 2),
      y: targetY - (fromRect.top + fromRect.height / 2),
      scale: 1.5,
      duration: 0.42,
      ease: 'power2.inOut'
    }).to(particle, {
      opacity: 0,
      scale: 0.4,
      duration: 0.12
    });
  }

  /**
   * 5. Physical "Lift & Settle" animation on ⌘V paste / drag-drop
   */
  animateCaptureLift(element: HTMLElement) {
    if (this.prefersReducedMotion || !element) return;

    gsap.fromTo(
      element,
      { scale: 0.98, y: 4, opacity: 0.85 },
      {
        scale: 1.02,
        y: -3,
        opacity: 1,
        duration: 0.18,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(element, { scale: 1, y: 0, duration: 0.2, ease: this.springEase });
        }
      }
    );
  }

  /**
   * 6. Failed connection shake
   */
  animateFailureShake(element: HTMLElement) {
    if (this.prefersReducedMotion || !element) return;

    gsap.fromTo(
      element,
      { x: 0 },
      {
        x: 4,
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: 'linear',
        onComplete: () => {
          gsap.set(element, { x: 0 });
        }
      }
    );
  }

  /**
   * 7. Staggered entrance for list of cards or devices.
   */
  animateStaggerIn(elements: HTMLElement[] | NodeListOf<Element>) {
    if (this.prefersReducedMotion || !elements || elements.length === 0) return;

    gsap.fromTo(
      elements,
      { opacity: 0, y: 12, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.28, stagger: 0.05, ease: 'power2.out' }
    );
  }

  /**
   * 8. Burn-after-read card/tile dissolve animation:
   * Animates opacity 1→0, translateY 0→-12px, scale 1→0.95 over ~400ms ease-out,
   * then calls onComplete to remove the node cleanly.
   */
  animateBurnDissolve(element: HTMLElement, onComplete?: () => void) {
    if (!element) {
      if (onComplete) onComplete();
      return;
    }

    // Immediately disable interactions on dissolving element
    element.style.pointerEvents = 'none';
    element.style.userSelect = 'none';
    element.classList.add('av-card-exiting');

    if (this.prefersReducedMotion) {
      gsap.to(element, {
        opacity: 0,
        duration: 0.15,
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });
      return;
    }

    gsap.to(element, {
      opacity: 0,
      y: -24,
      scale: 0.94,
      filter: 'blur(3px) brightness(1.25)',
      duration: 0.42,
      ease: 'power2.out',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * 9. Burn-after-read preview modal dissolve animation:
   * Fades content opacity 1→0 over ~500ms, then invokes onContentFaded to reveal
   * "This item has been viewed and removed" overlay before auto-closing.
   */
  animateModalBurnDissolve(contentElement: HTMLElement, onComplete?: () => void) {
    if (!contentElement) {
      if (onComplete) onComplete();
      return;
    }

    gsap.to(contentElement, {
      opacity: 0,
      scale: 0.98,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }
}
