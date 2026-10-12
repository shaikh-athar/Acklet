import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsPointerGlowDirective } from '../../directives/ts-pointer-glow.directive';

@Component({
  selector: 'ts-backdrop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsPointerGlowDirective],
  host: {
    'class': 'page-bg'
  },
  template: `
    <div
      class="ts-bg"
      tsPointerGlow
      aria-hidden="true"
      [style.--ts-tool-hue]="accentHueStyle()"
    >
      <!-- Static decorative grid -->
      <div class="ts-bg-grid"></div>

      <!-- Pointer-following glow (opacity managed by TsPointerGlowDirective) -->
      <div class="ts-bg-spot-glow" aria-hidden="true"></div>
      <div class="ts-bg-spot-grid" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: -1;
      contain: strict;
      overflow: hidden;
      background-color: var(--ts-page-bg, var(--page-bg, #F7F8F8));
    }

    :host-context([data-theme="dark"]),
    [data-theme="dark"] :host {
      background-color: var(--ts-page-bg, var(--page-bg, #0F1011));
    }

    /* ── Main .ts-bg: corner glows stacked as gradients (Top-Left emphasized) ─── */
    .ts-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      transform: translateZ(0);
      /* Dark mode: Top-left subtle ambient glow, gentle tints on all other corners */
      background:
        radial-gradient(ellipse 52% 46% at 0% 0%,
          color-mix(in oklab, var(--accent, #2DD4BF) 16%, transparent) 0%,
          color-mix(in oklab, var(--accent, #2DD4BF)  8%, transparent) 40%,
          transparent 70%),
        radial-gradient(ellipse 46% 40% at 100% 0%,
          color-mix(in oklab, var(--accent, #2DD4BF) 10%, transparent) 0%,
          transparent 70%),
        radial-gradient(ellipse 48% 42% at 0% 100%,
          color-mix(in oklab, var(--accent, #2DD4BF)  9%, transparent) 0%,
          transparent 70%),
        radial-gradient(ellipse 46% 40% at 100% 100%,
          color-mix(in oklab, var(--accent, #2DD4BF)  8%, transparent) 0%,
          transparent 70%);
    }

    /* Light mode: Top-left soft radiant glow, elegant visible tints on other corners */
    :host-context([data-theme="light"]) .ts-bg,
    [data-theme="light"] .ts-bg {
      background:
        radial-gradient(ellipse 52% 46% at 0% 0%,
          color-mix(in oklab, var(--accent, #0D9488) 20%, transparent) 0%,
          color-mix(in oklab, var(--accent, #0D9488) 10%, transparent) 40%,
          transparent 70%),
        radial-gradient(ellipse 46% 40% at 100% 0%,
          color-mix(in oklab, var(--accent, #0D9488) 14%, transparent) 0%,
          transparent 70%),
        radial-gradient(ellipse 48% 42% at 0% 100%,
          color-mix(in oklab, var(--accent, #0D9488) 12%, transparent) 0%,
          transparent 70%),
        radial-gradient(ellipse 46% 40% at 100% 100%,
          color-mix(in oklab, var(--accent, #0D9488) 10%, transparent) 0%,
          transparent 70%);
    }

    /* ── Grid overlay ─────────────────────────────────────────── */
    .ts-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(to right,  color-mix(in srgb, var(--accent-strong, var(--accent, #5EEAD4)) 7%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, var(--accent-strong, var(--accent, #5EEAD4)) 7%, transparent) 1px, transparent 1px);
      background-size: 24px 24px;
      background-position: 0 0;
      -webkit-mask-image: radial-gradient(ellipse 120% 100% at 0% 0%, #000 0%, rgba(0,0,0,0.5) 50%, transparent 100%);
              mask-image: radial-gradient(ellipse 120% 100% at 0% 0%, #000 0%, rgba(0,0,0,0.5) 50%, transparent 100%);
    }

    :host-context([data-theme="light"]) .ts-bg-grid,
    [data-theme="light"] .ts-bg-grid {
      background-image:
        linear-gradient(to right,  color-mix(in srgb, var(--accent-strong, var(--accent, #0F766E)) 6%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, var(--accent-strong, var(--accent, #0F766E)) 6%, transparent) 1px, transparent 1px);
    }

    /* ── Pointer glow spot (blurred radial) ───────────────────── */
    .ts-bg-spot-glow {
      position: absolute;
      left: 0;
      top: 0;
      width: 320px;
      height: 320px;
      pointer-events: none;
      opacity: 0;
      will-change: transform;
      transition: opacity 300ms ease;
      background: radial-gradient(circle closest-side,
        color-mix(in oklab, var(--ts-lift, var(--accent, #5EEAD4)) 22%, transparent),
        transparent 100%);
    }

    :host-context([data-theme="light"]) .ts-bg-spot-glow,
    [data-theme="light"] .ts-bg-spot-glow {
      background: radial-gradient(circle closest-side,
        color-mix(in oklab, var(--ts-lift, var(--accent, #0F766E)) 40%, transparent),
        transparent 100%);
    }

    /* ── Pointer glow grid (aligned to page grid) ─────────────── */
    .ts-bg-spot-grid {
      position: absolute;
      left: 0;
      top: 0;
      width: 420px;
      height: 420px;
      pointer-events: none;
      opacity: 0;
      will-change: transform;
      transition: opacity 300ms ease;
      background-image:
        linear-gradient(to right,  color-mix(in srgb, var(--accent-strong, var(--accent, #5EEAD4)) 30%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, var(--accent-strong, var(--accent, #5EEAD4)) 30%, transparent) 1px, transparent 1px);
      background-size: 32px 32px;
      -webkit-mask-image: radial-gradient(circle closest-side, #000, transparent 100%);
              mask-image: radial-gradient(circle closest-side, #000, transparent 100%);
    }

    :host-context([data-theme="light"]) .ts-bg-spot-grid,
    [data-theme="light"] .ts-bg-spot-grid {
      background-image:
        linear-gradient(to right,  color-mix(in srgb, var(--accent-strong, var(--accent, #0F766E)) 26%, transparent) 1px, transparent 1px),
        linear-gradient(to bottom, color-mix(in srgb, var(--accent-strong, var(--accent, #0F766E)) 26%, transparent) 1px, transparent 1px);
    }

    /* ── Responsive: under 768px, 24px grid ──────────────────── */
    @media (max-width: 767px) {
      .ts-bg-grid,
      .ts-bg-spot-grid {
        background-size: 24px 24px;
      }
    }

    /* ── Print / forced-colors: hide entirely ─────────────────── */
    @media print, (forced-colors: active) {
      :host,
      .ts-bg,
      .ts-bg-grid,
      .ts-bg-spot-glow,
      .ts-bg-spot-grid {
        display: none !important;
      }
    }

    /* ── High contrast: drop glows, keep faint grid ───────────── */
    @media (prefers-contrast: more) {
      .ts-bg {
        background: none !important;
      }
      .ts-bg-spot-glow {
        display: none !important;
      }
      .ts-bg-grid {
        opacity: 0.4;
      }
    }

    /* ── prefers-contrast: more / forced-colors: drop corner glows ── */
    @media (forced-colors: active), (prefers-contrast: more) {
      .ts-bg-spot-glow,
      .ts-bg-spot-grid {
        display: none !important;
      }
    }
  `]
})
export class TsBackdropComponent {
  readonly accentHue = input<number | null>(null);

  readonly accentHueStyle = computed(() => {
    const hue = this.accentHue();
    return hue !== null && hue !== undefined ? `${hue}deg` : 'initial';
  });
}
