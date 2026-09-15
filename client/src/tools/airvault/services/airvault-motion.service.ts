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
      y: -12,
      scale: 0.95,
      filter: 'blur(4px)',
      duration: 0.4,
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
