// packages/tool-shell/src/services/tool-capsule.service.ts
import { Injectable } from '@angular/core';

export interface CapsuleRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToolCapsuleService {

  /**
   * Encodes a DOM element bounding rect into a hash parameter string.
   * Format: #cap=x,y,w,h,r
   */
  encodeRect(el: HTMLElement): string {
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    const radius = parseFloat(computed.borderRadius) || 14;

    const x = Math.round(rect.left);
    const y = Math.round(rect.top);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const r = Math.round(radius);

    return `cap=${x},${y},${w},${h},${r}`;
  }

  /**
   * Parses and validates the capsule hash from the URL.
   * Clamps numbers to viewport bounds to prevent arbitrary offsets.
   */
  parseHash(hash: string): CapsuleRect | null {
    if (!hash) return null;
    const clean = hash.startsWith('#') ? hash.slice(1) : hash;
    const match = clean.match(/cap=(-?\d+),(-?\d+),(\d+),(\d+),(\d+)/);
    if (!match) return null;

    const [_, sx, sy, sw, sh, sr] = match;
    const x = parseInt(sx, 10);
    const y = parseInt(sy, 10);
    const w = parseInt(sw, 10);
    const h = parseInt(sh, 10);
    const r = parseInt(sr, 10);

    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || isNaN(r)) {
      return null;
    }

    if (w <= 0 || h <= 0) return null;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

    return {
      x: Math.max(-vw, Math.min(vw * 2, x)),
      y: Math.max(-vh, Math.min(vh * 2, y)),
      w: Math.min(vw * 2, w),
      h: Math.min(vh * 2, h),
      r: Math.min(100, Math.max(0, r))
    };
  }

  /**
   * Plays the Hub-side expanding capsule animation to the full viewport using Web Animations API.
   */
  playHubExpand(
    rowEl: HTMLElement, 
    isDark: boolean, 
    onNavigate: (hashParam: string) => void
  ): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      onNavigate('');
      return;
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hashParam = this.encodeRect(rowEl);

    if (prefersReduced || !('animate' in HTMLElement.prototype)) {
      setTimeout(() => onNavigate(hashParam), 150);
      return;
    }

    const rect = rowEl.getBoundingClientRect();
    const computed = window.getComputedStyle(rowEl);
    const radius = parseFloat(computed.borderRadius) || 14;

    // Create fixed overlay capsule
    const overlay = document.createElement('div');
    overlay.className = 'ts-capsule-overlay-active';
    overlay.style.position = 'fixed';
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.borderRadius = `${radius}px`;
    overlay.style.backgroundColor = isDark ? '#141414' : '#FFFFFF';
    overlay.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,0.7)' : '0 10px 30px rgba(0,0,0,0.1)';
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'none';
    overlay.style.overflow = 'hidden';

    // Clone row contents visually into overlay
    const clone = rowEl.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.pointerEvents = 'none';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';
    clone.style.background = 'transparent';
    overlay.appendChild(clone);

    document.body.appendChild(overlay);

    const animation = overlay.animate([
      {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: `${radius}px`
      },
      {
        left: '0px',
        top: '0px',
        width: '100vw',
        height: '100dvh',
        borderRadius: '0px'
      }
    ], {
      duration: 380,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    let navigated = false;
    const triggerNav = () => {
      if (!navigated) {
        navigated = true;
        onNavigate(hashParam);
      }
    };

    // Trigger navigation at ~300ms
    setTimeout(triggerNav, 300);

    // Hard fallback safety: never wait more than 400ms
    setTimeout(triggerNav, 400);

    // Failsafe cleanup in case of cancelled navigation
    setTimeout(() => {
      overlay.remove();
    }, 1200);
  }

  /**
   * Plays the Tool-side reveal animation if #cap= was present in URL hash.
   */
  playToolReveal(
    mainCardEl: HTMLElement, 
    isDark: boolean
  ): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const hash = window.location.hash;
    const parsed = this.parseHash(hash);

    // Clean hash so refresh/back does not replay animation
    if (hash.includes('cap=')) {
      try {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      } catch (e) {}
    }

    if (!parsed) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('animate' in HTMLElement.prototype)) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'ts-tool-reveal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = isDark ? '#141414' : '#FFFFFF';
    overlay.style.zIndex = '999998';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    // Pointer-events none after 300ms
    setTimeout(() => {
      overlay.style.pointerEvents = 'none';
    }, 300);

    // Animate full screen cover shrinking back to main card or fading smoothly
    const mainRect = mainCardEl.getBoundingClientRect();
    const anim = overlay.animate([
      {
        opacity: 1,
        clipPath: 'inset(0% 0% 0% 0% round 0px)'
      },
      {
        opacity: 0,
        clipPath: `inset(${Math.max(0, mainRect.top)}px ${Math.max(0, window.innerWidth - mainRect.right)}px ${Math.max(0, window.innerHeight - mainRect.bottom)}px ${Math.max(0, mainRect.left)}px round 20px)`
      }
    ], {
      duration: 420,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    anim.onfinish = () => {
      overlay.remove();
      mainCardEl.focus();
    };

    // 1200ms absolute failsafe
    setTimeout(() => {
      overlay.remove();
    }, 1200);
  }
}
