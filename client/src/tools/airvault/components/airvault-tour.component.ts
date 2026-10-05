import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
  ChangeDetectorRef,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultTourService, TourStep } from '../services/airvault-tour.service';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SecondaryCalloutPos {
  top: number;
  left: number;
  message: string;
  arrowDir: 'up' | 'down' | 'left' | 'right';
}

@Component({
  selector: 'app-airvault-tour',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (tourService.isActive()) {
      <div
        class="tour-overlay"
        [class.is-entering]="isEntering()"
        [class.is-exiting]="isExiting()"
        (click)="onOverlayClick($event)"
        aria-modal="true"
        role="dialog"
        aria-label="AirVault Guided Tour"
      >
        <!-- SVG mask: dims everything except each spotlight cutout -->
        <svg class="tour-svg-mask" aria-hidden="true">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <!-- Primary spotlight cutout -->
              @if (spotlight(); as sp) {
                <rect
                  [attr.x]="sp.left"
                  [attr.y]="sp.top"
                  [attr.width]="sp.width"
                  [attr.height]="sp.height"
                  rx="8" ry="8"
                  fill="black"
                />
              }
              <!-- Secondary spotlight cutout (separate, tight) -->
              @if (secondarySpotlight(); as sp2) {
                <rect
                  [attr.x]="sp2.left"
                  [attr.y]="sp2.top"
                  [attr.width]="sp2.width"
                  [attr.height]="sp2.height"
                  rx="8" ry="8"
                  fill="black"
                />
              }
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(4, 7, 12, 0.82)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        <!-- Primary spotlight glow ring -->
        @if (spotlight(); as sp) {
          <div
            class="tour-spotlight-ring"
            [style.top.px]="sp.top"
            [style.left.px]="sp.left"
            [style.width.px]="sp.width"
            [style.height.px]="sp.height"
          ></div>
        }

        <!-- Secondary spotlight glow ring (independent, tight) -->
        @if (secondarySpotlight(); as sp2) {
          <div
            class="tour-spotlight-ring tour-spotlight-ring--secondary"
            [style.top.px]="sp2.top"
            [style.left.px]="sp2.left"
            [style.width.px]="sp2.width"
            [style.height.px]="sp2.height"
          ></div>
        }

        <!-- Secondary callout label (lighter arrow + note near a third element) -->
        @if (secondaryCalloutPos(); as scp) {
          <div
            class="tour-secondary-callout"
            [class]="'callout-arrow-' + scp.arrowDir"
            [style.top.px]="scp.top"
            [style.left.px]="scp.left"
            (click)="$event.stopPropagation()"
          >
            <div class="callout-content">
              <span class="callout-bulb">💡</span>
              <span class="callout-text">{{ scp.message }}</span>
            </div>
          </div>
        }

        <!-- Main tooltip callout -->
        @if (tooltipPos(); as pos) {
          <div
            class="tour-tooltip"
            [class]="'tip-' + (tourService.currentStep()?.placement || 'bottom')"
            [style.top.px]="pos.top"
            [style.left.px]="pos.left"
            [class.is-entering]="isEntering()"
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="tip-header">
              @if (tourService.currentStep()?.icon; as iconName) {
                <div class="tip-icon-glow">
                  <app-icon [name]="iconName" class="icon-xs text-cyan"></app-icon>
                </div>
              }
              <div class="tip-header-text">
                <span class="tip-step-badge">
                  Step {{ tourService.currentStepIndex() + 1 }} of {{ tourService.totalSteps }}
                </span>
                <h3 class="tip-title">{{ tourService.currentStep()?.title }}</h3>
              </div>
            </div>

            <!-- Body -->
            <p class="tip-desc" [innerHTML]="tourService.currentStep()?.description"></p>

            <!-- Progress dots -->
            <div class="tip-progress-dots">
              @for (s of stepsArray; track $index) {
                <span
                  class="tip-dot"
                  [class.active]="$index === tourService.currentStepIndex()"
                  [class.done]="$index < tourService.currentStepIndex()"
                ></span>
              }
            </div>

            <!-- Actions -->
            <div class="tip-actions">
              <button class="tip-skip-btn" (click)="skip()">Skip tour</button>
              <button class="tip-next-btn" (click)="next()">
                @if (tourService.isLastStep()) {
                  <app-icon name="check" class="icon-xs"></app-icon>
                  <span>Done</span>
                } @else {
                  <span>Next</span>
                  <app-icon name="arrow-right" class="icon-xs"></app-icon>
                }
              </button>
            </div>

            <!-- Arrow pointing toward target -->
            <div class="tip-arrow"></div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9990;
      pointer-events: none;
    }

    .tour-overlay {
      position: fixed;
      inset: 0;
      z-index: 9990;
      pointer-events: all;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tour-overlay.is-entering { opacity: 1; }
    .tour-overlay.is-exiting  { opacity: 0; transition: opacity 0.22s ease; }

    .tour-svg-mask {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    /* Spotlight glow rings — each is independently positioned */
    .tour-spotlight-ring {
      position: fixed;
      border-radius: 8px;
      pointer-events: none;
      transition: all 0.32s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow:
        0 0 0 3px rgba(33, 150, 243, 0.7),
        0 0 0 6px rgba(33, 150, 243, 0.22),
        0 0 18px rgba(33, 150, 243, 0.38);
      animation: tourRingPulse 2.2s ease-in-out infinite;
    }

    /* Secondary ring has a slight phase offset on the animation */
    .tour-spotlight-ring--secondary {
      animation-delay: 0.6s;
    }

    @keyframes tourRingPulse {
      0%, 100% {
        box-shadow:
          0 0 0 3px rgba(33,150,243,0.7),
          0 0 0 6px rgba(33,150,243,0.22),
          0 0 18px rgba(33,150,243,0.38);
      }
      50% {
        box-shadow:
          0 0 0 3px rgba(33,150,243,0.9),
          0 0 0 9px rgba(33,150,243,0.13),
          0 0 28px rgba(33,150,243,0.5);
      }
    }

    /* Secondary callout label */
    .tour-secondary-callout {
      position: fixed;
      background: #0B0E14;
      border: 1.5px solid #2196F3;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 11.5px;
      color: #FFFFFF;
      font-weight: 600;
      width: 260px;
      max-width: calc(100vw - 32px);
      pointer-events: none;
      line-height: 1.4;
      box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.9),
        0 0 0 1px rgba(33, 150, 243, 0.2),
        0 0 16px rgba(33, 150, 243, 0.35);
      z-index: 9999;
      box-sizing: border-box;
      animation: calloutPulse 2.4s ease-in-out infinite;
    }
    @keyframes calloutPulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .callout-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-align: left;
    }
    .callout-bulb {
      font-size: 14px;
      flex-shrink: 0;
    }
    .callout-text {
      color: #F0F3F6;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .tour-secondary-callout::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
    }
    .callout-arrow-up::before {
      top: -7px;
      left: 50%;
      margin-left: -6px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 7px solid #2196F3;
    }
    .callout-arrow-down::before {
      bottom: -7px;
      left: 50%;
      margin-left: -6px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #2196F3;
    }
    .callout-arrow-left::before {
      left: -7px;
      top: 50%;
      margin-top: -6px;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-right: 7px solid #2196F3;
    }
    .callout-arrow-right::before {
      right: -7px;
      top: 50%;
      margin-top: -6px;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-left: 7px solid #2196F3;
    }

    /* Tooltip */
    .tour-tooltip {
      position: fixed;
      width: 300px;
      background: var(--av-surface-primary, #0B0E14);
      border: 1px solid rgba(33, 150, 243, 0.35);
      border-radius: 14px;
      padding: 18px;
      box-shadow:
        0 20px 60px rgba(0,0,0,0.75),
        0 0 0 1px rgba(33,150,243,0.1),
        0 0 40px rgba(33,150,243,0.07);
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: all;
      opacity: 0;
      transform: translateY(6px) scale(0.97);
      transition:
        opacity 0.28s cubic-bezier(0.16,1,0.3,1),
        transform 0.28s cubic-bezier(0.16,1,0.3,1),
        top 0.32s cubic-bezier(0.4,0,0.2,1),
        left 0.32s cubic-bezier(0.4,0,0.2,1);
    }
    .tour-tooltip.is-entering {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* Arrow */
    .tip-arrow {
      position: absolute;
      width: 10px;
      height: 10px;
      background: var(--av-surface-primary, #0B0E14);
      border: 1px solid rgba(33,150,243,0.35);
      transform: rotate(45deg);
    }
    .tip-top    .tip-arrow { bottom: -6px; left: 50%; margin-left: -5px; border-top: none; border-left: none; }
    .tip-bottom .tip-arrow { top: -6px;    left: 50%; margin-left: -5px; border-bottom: none; border-right: none; }
    .tip-right  .tip-arrow { left: -6px;   top: 50%;  margin-top: -5px;  border-top: none; border-right: none; }
    .tip-left   .tip-arrow { right: -6px;  top: 50%;  margin-top: -5px;  border-bottom: none; border-left: none; }

    .tip-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .tip-icon-glow {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(33,150,243,0.12);
      border: 1px solid rgba(33,150,243,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tip-header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tip-step-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #2196F3;
      text-transform: uppercase;
    }
    .tip-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
      letter-spacing: -0.01em;
    }
    .tip-desc {
      font-size: 12.5px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.55;
      margin: 0;
    }
    .tip-desc strong { color: var(--av-text-primary, #F0F3F6); font-weight: 700; }
    .tip-desc em     { color: #90caf9; font-style: normal; }
    .tip-desc kbd {
      display: inline-flex;
      align-items: center;
      padding: 1px 5px;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 4px;
      font-size: 10.5px;
      font-family: inherit;
      color: var(--av-text-primary, #F0F3F6);
    }
    .tip-progress-dots {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .tip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--av-border, #1E2633);
      transition: all 0.2s ease;
    }
    .tip-dot.active { width: 18px; border-radius: 3px; background: #2196F3; }
    .tip-dot.done   { background: rgba(33,150,243,0.4); }

    .tip-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-top: 1px solid var(--av-border-subtle, #161C26);
      padding-top: 10px;
    }
    .tip-skip-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted, #8B949E);
      font-size: 11.5px;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s ease;
    }
    .tip-skip-btn:hover { color: var(--av-text-primary, #F0F3F6); }
    .tip-next-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      background: #2196F3;
      color: #fff;
      border: none;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: filter 0.15s ease;
    }
    .tip-next-btn:hover { filter: brightness(1.12); }

    .text-cyan { color: #2196F3; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirVaultTourComponent implements OnInit, OnDestroy {
  tourService = inject(AirVaultTourService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  isEntering = signal(false);
  isExiting  = signal(false);

  /** Primary spotlight (always present when a target exists) */
  spotlight = signal<SpotlightRect | null>(null);

  /**
   * Secondary spotlight — rendered as a SEPARATE ring+cutout,
   * not merged into the primary. Used for step 1 (sidebar + footer).
   */
  secondarySpotlight = signal<SpotlightRect | null>(null);

  tooltipPos          = signal<{ top: number; left: number } | null>(null);
  secondaryCalloutPos = signal<SecondaryCalloutPos | null>(null);

  get stepsArray() {
    return Array.from({ length: this.tourService.totalSteps });
  }

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const active  = this.tourService.isActive();
      const stepIdx = this.tourService.currentStepIndex();
      untracked(() => {
        if (active) {
          setTimeout(() => this._positionForCurrentStep(), 120);
        } else {
          this.spotlight.set(null);
          this.secondarySpotlight.set(null);
          this.tooltipPos.set(null);
          this.secondaryCalloutPos.set(null);
        }
      });
    });

    effect(() => {
      const active = this.tourService.isActive();
      untracked(() => {
        if (active) {
          this.isExiting.set(false);
          requestAnimationFrame(() => {
            this.isEntering.set(true);
            this.cdr.markForCheck();
          });
        }
      });
    });
  }

  ngOnInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => {
        if (this.tourService.isActive()) {
          this._positionForCurrentStep();
        }
      });
    });
    this.resizeObserver.observe(document.body);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(e: Event) {
    if (this.tourService.isActive()) {
      e.stopPropagation();
      this.skip();
    }
  }

  onOverlayClick(e: MouseEvent) {
    const x = e.clientX;
    const y = e.clientY;

    // Click inside primary spotlight → don't dismiss
    const sp = this.spotlight();
    if (sp) {
      const inPrimary =
        x >= sp.left && x <= sp.left + sp.width &&
        y >= sp.top  && y <= sp.top  + sp.height;
      if (inPrimary) return;
    }

    // Click inside secondary spotlight → don't dismiss either
    const sp2 = this.secondarySpotlight();
    if (sp2) {
      const inSecondary =
        x >= sp2.left && x <= sp2.left + sp2.width &&
        y >= sp2.top  && y <= sp2.top  + sp2.height;
      if (inSecondary) return;
    }

    this.skip();
  }

  next() {
    this.isEntering.set(false);
    setTimeout(() => {
      this.tourService.next();
      setTimeout(() => {
        this.isEntering.set(true);
        this.cdr.markForCheck();
      }, 80);
    }, 180);
  }

  skip() {
    this.isExiting.set(true);
    this.isEntering.set(false);
    setTimeout(() => {
      this.tourService.skip();
      this.cdr.markForCheck();
    }, 240);
  }

  private _positionForCurrentStep() {
    const step = this.tourService.currentStep();
    if (!step || !this.tourService.isActive()) return;

    // If step is outside the pairing modal, ensure the pairing modal is closed so composer/staging is unobscured
    if (
      step.targetSelector === "[data-tour='composer-bar']" ||
      step.targetSelector === "[data-tour='send-btn']" ||
      step.targetSelector === "[data-tour='pair-device-btn']"
    ) {
      if (this.tourService.uiStore.showPairingModal()) {
        this.tourService.uiStore.showPairingModal.set(false);
      }
    }

    const target = document.querySelector(step.targetSelector) as HTMLElement | null;

    // ── Fallback: primary target not in DOM ──────────────────────────────────
    if (!target) {
      if (step.fallbackIfMissing === 'open-pairing-modal') {
        this.tourService.openPairingModalForTour();
        setTimeout(() => this._positionForCurrentStep(), 420);
        return;
      }
      if (step.fallbackIfMissing === 'skip') {
        this.tourService.next();
        return;
      }
      // Default: center tooltip, no spotlight
      this.spotlight.set(null);
      this.secondarySpotlight.set(null);
      this.secondaryCalloutPos.set(null);
      this.tooltipPos.set({
        top:  window.innerHeight / 2 - 120,
        left: window.innerWidth  / 2 - 150,
      });
      this.cdr.markForCheck();
      return;
    }

    const pad = step.spotlightPadding ?? 8;
    const rect = target.getBoundingClientRect();

    // ── Primary spotlight ────────────────────────────────────────────────────
    const sp: SpotlightRect = {
      top:    rect.top    - pad,
      left:   rect.left   - pad,
      width:  rect.width  + pad * 2,
      height: rect.height + pad * 2,
    };
    this.spotlight.set(sp);

    // ── Secondary spotlight (SEPARATE tight ring, not merged) ────────────────
    if (step.secondaryTargetSelector) {
      const secEl = document.querySelector(step.secondaryTargetSelector) as HTMLElement | null;
      if (secEl) {
        const secRect = secEl.getBoundingClientRect();
        this.secondarySpotlight.set({
          top:    secRect.top    - pad,
          left:   secRect.left   - pad,
          width:  secRect.width  + pad * 2,
          height: secRect.height + pad * 2,
        });
      } else {
        this.secondarySpotlight.set(null);
      }
    } else {
      this.secondarySpotlight.set(null);
    }

    // ── Secondary callout label (near a third element, e.g. mode-switcher) ──
    if (step.secondaryCallout) {
      const scEl = document.querySelector(step.secondaryCallout.targetSelector) as HTMLElement | null;
      if (scEl) {
        const scRect = scEl.getBoundingClientRect();
        const CALLOUT_W = 260;
        const CALLOUT_H = 48;
        let cTop = scRect.top - CALLOUT_H - 10;
        let arrowDir: 'up' | 'down' | 'left' | 'right' = 'down';

        // If not enough room above, place it below
        if (cTop < 10) {
          cTop = scRect.bottom + 10;
          arrowDir = 'up';
        }

        let cLeft = scRect.left + (scRect.width / 2) - (CALLOUT_W / 2);
        cLeft = Math.max(12, Math.min(cLeft, window.innerWidth - CALLOUT_W - 12));

        this.secondaryCalloutPos.set({
          top:      cTop,
          left:     cLeft,
          message:  step.secondaryCallout.message,
          arrowDir: arrowDir,
        });
      } else {
        this.secondaryCalloutPos.set(null);
      }
    } else {
      this.secondaryCalloutPos.set(null);
    }

    // ── Tooltip position (relative to PRIMARY spotlight) ─────────────────────
    const TIP_W      = 300;
    const TIP_H      = 260;
    const ARROW_GAP  = 16;
    const VW         = window.innerWidth;
    const VH         = window.innerHeight;
    const placement  = step.placement ?? 'bottom';

    let top  = 0;
    let left = 0;

    switch (placement) {
      case 'bottom':
        top  = sp.top + sp.height + ARROW_GAP;
        left = sp.left + sp.width / 2 - TIP_W / 2;
        break;
      case 'top':
        top  = sp.top - TIP_H - ARROW_GAP;
        left = sp.left + sp.width / 2 - TIP_W / 2;
        break;
      case 'right':
        top  = sp.top + sp.height / 2 - TIP_H / 2;
        left = sp.left + sp.width + ARROW_GAP;
        break;
      case 'left':
        top  = sp.top + sp.height / 2 - TIP_H / 2;
        left = sp.left - TIP_W - ARROW_GAP;
        break;
    }

    left = Math.max(16, Math.min(left, VW - TIP_W - 16));
    top  = Math.max(16, Math.min(top,  VH - TIP_H - 16));

    this.tooltipPos.set({ top, left });
    this.cdr.markForCheck();
  }
}
