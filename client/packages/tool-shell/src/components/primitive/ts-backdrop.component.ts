// packages/tool-shell/src/components/primitive/ts-backdrop.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-backdrop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ts-bg ts-bg-page" 
      aria-hidden="true"
      [style.--ts-tool-hue]="accentHueStyle()"
    >
      <div class="ts-bg-grid"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .ts-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      background: radial-gradient(ellipse 70% 40% at 50% 0%, var(--fx-highlight), transparent);
    }

    .ts-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(to right,  var(--fx-grid) 1px, transparent 1px) 0 0 / var(--fx-grid-size) var(--fx-grid-size),
        linear-gradient(to bottom, var(--fx-grid) 1px, transparent 1px) 0 0 / var(--fx-grid-size) var(--fx-grid-size);
      -webkit-mask-image: radial-gradient(ellipse 90% 75% at 50% 0%, #000 35%, transparent 100%);
      mask-image: radial-gradient(ellipse 90% 75% at 50% 0%, #000 35%, transparent 100%);
    }

    .ts-bg::before,
    .ts-bg::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    /* glow 1: accent, top left */
    .ts-bg::before {
      width: 60%;
      aspect-ratio: 1;
      left: -8%;
      top: -28%;
      background: radial-gradient(closest-side, var(--fx-glow-1), transparent 100%);
    }

    /* glow 2: second tone, top right */
    .ts-bg::after {
      width: 52%;
      aspect-ratio: 1;
      right: -10%;
      top: -22%;
      background: radial-gradient(closest-side, var(--fx-glow-2), transparent 100%);
    }

    /* Responsive: under 768px reduce grid size to 32px and glow sizes by 25% */
    @media (max-width: 768px) {
      .ts-bg-grid {
        background-size: 32px 32px;
      }
      .ts-bg::before {
        width: 45%;
        left: -5%;
        top: -20%;
      }
      .ts-bg::after {
        width: 39%;
        right: -6%;
        top: -16%;
      }
    }

    /* High contrast: remove glows, keep faint grid */
    @media (prefers-contrast: more) {
      .ts-bg::before,
      .ts-bg::after {
        display: none !important;
      }
      .ts-bg {
        background: transparent !important;
      }
    }

    /* Forced colors and print: hide decorative layers entirely */
    @media (forced-colors: active), print {
      :host,
      .ts-bg,
      .ts-bg-grid {
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
