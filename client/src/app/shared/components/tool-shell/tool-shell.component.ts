import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  signal,
  AfterViewInit,
  OnDestroy,
  inject,
  input,
  output,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer';
import { IconComponent } from '../icon/icon';
import { gsap } from 'gsap';

export type ToolShellTier = 'tool' | 'info' | 'reference' | 'footer';

@Component({
  selector: 'app-tool-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="acklet-shell-root" #shellRoot>
      <!-- ── Tool-Owned Floating Return Action (Projected from Tool) ── -->
      @if (currentTier() !== 'tool') {
        <div class="acklet-shell-hud" (click)="transitionToTool()">
          <ng-content select="[return-action]" />
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════
           TIER 1: TOOL SCREEN (Operational Workspace - 100vh × 100vw)
           Pinned, scroll-locked, 100% mutual exclusivity
           ═══════════════════════════════════════════════════════════ -->
      <div 
        class="acklet-tier-tool"
        #toolTier
        [class.is-locked]="isToolActive()"
        [class.is-transitioning]="isTransitioning()">
        <div class="tool-content-host" #toolContentHost>
          <ng-content select="[tool-screen]" />
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════
           TIERS 2, 3: CONTENT CONTAINER (Info, Reference)
           Revealed underneath ONLY on scroll transition
           ═══════════════════════════════════════════════════════════ -->
      <div 
        class="acklet-tier-scrollable"
        #scrollableTier
        [class.is-hidden]="isToolActive() && !isTransitioning()">
        
        <!-- TIER 2: INFORMATIONAL SCREEN (Architecture, Guarantees, Ads allowed) -->
        <section class="acklet-tier-info" #infoTier id="acklet-info-tier">
          <ng-content select="[info-screen]" />
        </section>

        <!-- TIER 3: REFERENCE SCREEN (Shortcuts, Docs, Changelog, Deeper Specs) -->
        <section class="acklet-tier-reference" #refTier id="acklet-reference-tier">
          <ng-content select="[reference-screen]" />
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    .acklet-shell-root {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--av-bg-canvas, var(--color-surface-950, #ffffff));
      color: var(--av-text-primary, var(--color-neutral-50, #09090b));
    }

    /* ── Floating Return HUD Container ──────────────────────────── */
    .acklet-shell-hud {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999;
      animation: hud-appear 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      cursor: pointer;
    }

    @keyframes hud-appear {
      from { opacity: 0; transform: translateY(12px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── TIER 1: TOOL SCREEN (Operational Workspace) ─────────────── */
    .acklet-tier-tool {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 50;
      background: var(--av-bg-canvas, var(--color-surface-950, #ffffff));
      overflow: hidden;
      transform-origin: center center;
      will-change: transform, opacity, filter;
      display: flex;
      flex-direction: column;
    }

    .acklet-tier-tool.is-locked {
      pointer-events: auto;
    }

    .acklet-tier-tool:not(.is-locked) {
      pointer-events: none;
    }

    .tool-content-host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1;
      overflow: hidden;
    }

    .tool-scroll-indicator {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 60;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: var(--av-surface-primary, rgba(255, 255, 255, 0.8));
      backdrop-filter: blur(8px);
      border: 1px solid var(--av-border, rgba(0, 0, 0, 0.1));
      font-size: 11px;
      font-weight: 500;
      color: var(--av-text-muted, #64748B);
      cursor: pointer;
      opacity: 0.8;
      transition: all 0.2s ease;
      user-select: none;
    }

    .tool-scroll-indicator:hover {
      opacity: 1;
      border-color: #2196F3;
      color: var(--av-text-primary, #0F172A);
    }

    .indicator-chevron {
      animation: chevron-bounce 2s infinite ease-in-out;
    }

    @keyframes chevron-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(3px); }
    }

    /* ── TIERS 2, 3, 4: SCROLLABLE CONTAINER (Mutually Exclusive) ── */
    .acklet-tier-scrollable {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 60;
      background: var(--av-bg-canvas, #F7F8FA);
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }

    :host-context([data-theme="dark"]) .acklet-tier-scrollable {
      background: var(--av-bg-canvas, #0B0D10);
    }

    .acklet-tier-scrollable.is-hidden {
      display: none !important;
      pointer-events: none;
    }

    /* ── TIER SECTIONS ───────────────────────────────────────────── */
    .acklet-tier-info {
      position: relative;
      width: 100%;
      min-height: 80vh;
      background: inherit;
      box-sizing: border-box;
    }

    .acklet-tier-reference {
      position: relative;
      width: 100%;
      background: inherit;
      box-sizing: border-box;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolShellComponent implements AfterViewInit, OnDestroy {
  @ViewChild('shellRoot') shellRoot!: ElementRef<HTMLElement>;
  @ViewChild('toolTier') toolTier!: ElementRef<HTMLElement>;
  @ViewChild('scrollableTier') scrollableTier!: ElementRef<HTMLElement>;
  @ViewChild('toolContentHost') toolContentHost!: ElementRef<HTMLElement>;

  tierChange = output<ToolShellTier>();

  currentTier = signal<ToolShellTier>('tool');
  isToolActive = signal<boolean>(true);
  isTransitioning = signal<boolean>(false);

  private wheelListener?: (e: WheelEvent) => void;
  private keyListener?: (e: KeyboardEvent) => void;
  private scrollDebounce = false;
  private lastTouchY = 0;
  private touchListenerStart?: (e: TouchEvent) => void;
  private touchListenerMove?: (e: TouchEvent) => void;

  ngAfterViewInit() {
    this.setupScrollInterception();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy() {
    if (this.wheelListener && this.toolTier?.nativeElement) {
      this.toolTier.nativeElement.removeEventListener('wheel', this.wheelListener);
    }
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
    }
    if (this.touchListenerStart && this.toolTier?.nativeElement) {
      this.toolTier.nativeElement.removeEventListener('touchstart', this.touchListenerStart);
    }
    if (this.touchListenerMove && this.toolTier?.nativeElement) {
      this.toolTier.nativeElement.removeEventListener('touchmove', this.touchListenerMove);
    }
  }

  /**
   * Transition from Tool Screen (Workspace) to Informational Screen (Tier 2).
   * Executes the orchestrated Zoom-Out + Fade-Out animation.
   */
  transitionToInfo() {
    if (this.isTransitioning() || !this.isToolActive()) return;

    this.isTransitioning.set(true);
    const toolEl = this.toolTier.nativeElement;
    const scrollableEl = this.scrollableTier.nativeElement;

    // Make scrollable tier available for rendering underneath
    scrollableEl.classList.remove('is-hidden');
    scrollableEl.scrollTop = 0;

    gsap.set(scrollableEl, { opacity: 0, scale: 1.02 });

    const tl = gsap.timeline({
      onComplete: () => {
        this.isToolActive.set(false);
        this.isTransitioning.set(false);
        this.currentTier.set('info');
        this.tierChange.emit('info');
        gsap.set(toolEl, { display: 'none', visibility: 'hidden' });
      }
    });

    // 1. Tool Screen zooms out & fades out
    tl.to(toolEl, {
      scale: 0.92,
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.45,
      ease: 'power3.inOut'
    }, 0);

    // 2. Informational Tier fades in & settles
    tl.to(scrollableEl, {
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: 'power3.inOut'
    }, 0.05);
  }

  /**
   * Transition from Content Tier back to Tool Screen (Workspace).
   * Executes the orchestrated Zoom-In + Fade-In animation and re-locks scroll.
   */
  transitionToTool() {
    if (this.isTransitioning() || this.isToolActive()) return;

    this.isTransitioning.set(true);
    const toolEl = this.toolTier.nativeElement;
    const scrollableEl = this.scrollableTier.nativeElement;

    gsap.set(toolEl, { display: 'flex', visibility: 'visible', scale: 0.92, opacity: 0, filter: 'blur(6px)' });

    const tl = gsap.timeline({
      onComplete: () => {
        this.isToolActive.set(true);
        this.isTransitioning.set(false);
        this.currentTier.set('tool');
        this.tierChange.emit('tool');
        scrollableEl.classList.add('is-hidden');
      }
    });

    // 1. Scrollable tier fades out
    tl.to(scrollableEl, {
      opacity: 0,
      scale: 1.02,
      duration: 0.4,
      ease: 'power3.inOut'
    }, 0);

    // 2. Tool tier zooms back to 100% full bleed
    tl.to(toolEl, {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.45,
      ease: 'power3.out'
    }, 0.05);
  }

  private setupScrollInterception() {
    const toolEl = this.toolTier.nativeElement;

    this.wheelListener = (e: WheelEvent) => {
      if (!this.isToolActive() || this.isTransitioning()) return;

      // Only trigger if downward wheel intent is strong enough (> 40px)
      if (e.deltaY > 40) {
        // Quick check if target is inside an element that is scrolled and not at the bottom
        const target = e.target as HTMLElement | null;
        if (target && this.isElementScrolled(target, toolEl)) {
          return;
        }

        if (!this.scrollDebounce) {
          this.scrollDebounce = true;
          this.transitionToInfo();
          setTimeout(() => (this.scrollDebounce = false), 1000);
        }
      }
    };

    toolEl.addEventListener('wheel', this.wheelListener, { passive: true });

    // Touch support for mobile / tablet
    this.touchListenerStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.lastTouchY = e.touches[0].clientY;
      }
    };

    this.touchListenerMove = (e: TouchEvent) => {
      if (!this.isToolActive() || this.isTransitioning() || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = this.lastTouchY - currentY;
      if (deltaY > 80) {
        if (!this.scrollDebounce) {
          this.scrollDebounce = true;
          this.transitionToInfo();
          setTimeout(() => (this.scrollDebounce = false), 1000);
        }
      }
    };

    toolEl.addEventListener('touchstart', this.touchListenerStart, { passive: true });
    toolEl.addEventListener('touchmove', this.touchListenerMove, { passive: true });

    // Listen to scroll inside the scrollable tier to trigger zoom back in when scrolling past top
    const scrollableEl = this.scrollableTier.nativeElement;
    scrollableEl.addEventListener('scroll', () => {
      if (this.isToolActive() || this.isTransitioning()) return;
      const st = scrollableEl.scrollTop;
      if (st < 400) {
        this.currentTier.set('info');
      } else {
        this.currentTier.set('reference');
      }
    }, { passive: true });

    scrollableEl.addEventListener('wheel', (e: WheelEvent) => {
      if (this.isToolActive() || this.isTransitioning()) return;
      if (scrollableEl.scrollTop <= 0 && e.deltaY < -40) {
        if (!this.scrollDebounce) {
          this.scrollDebounce = true;
          this.transitionToTool();
          setTimeout(() => (this.scrollDebounce = false), 1000);
        }
      }
    }, { passive: true });
  }

  private setupKeyboardShortcuts() {
    this.keyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.isToolActive()) {
        this.transitionToTool();
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }

  private isElementScrolled(el: HTMLElement, stopAt: HTMLElement): boolean {
    let curr: HTMLElement | null = el;
    let depth = 0;
    while (curr && curr !== stopAt && depth < 5) {
      if (curr.scrollHeight > curr.clientHeight + 10) {
        const atBottom = curr.scrollHeight - curr.scrollTop - curr.clientHeight <= 4;
        if (!atBottom) return true; // Still has internal content to scroll
      }
      curr = curr.parentElement;
      depth++;
    }
    return false;
  }
}
