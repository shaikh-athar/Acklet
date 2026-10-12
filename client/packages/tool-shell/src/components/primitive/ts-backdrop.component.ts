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
      background:
        radial-gradient(ellipse 62% 52% at 0% 0%, var(--fx-glow-1) 0%, transparent 70%),
        radial-gradient(ellipse 40% 36% at 100% 0%, var(--fx-glow-2) 0%, transparent 70%);
    }

    .ts-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(to right,  var(--fx-grid) 1px, transparent 1px),
        linear-gradient(to bottom, var(--fx-grid) 1px, transparent 1px);
      background-size: var(--fx-grid-size, 32px) var(--fx-grid-size, 32px);
      background-position: 0 0;
      -webkit-mask-image: radial-gradient(ellipse 120% 100% at 0% 0%, #000 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%);
              mask-image: radial-gradient(ellipse 120% 100% at 0% 0%, #000 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%);
    }

    /* Responsive: under 768px grid 24px */
    @media (max-width: 767px) {
      .ts-bg-grid {
        background-size: 24px 24px;
      }
      .ts-bg {
        background:
          radial-gradient(ellipse 62% 52% at 0% 0%,   var(--fx-glow-1) 0%, transparent 70%),
          radial-gradient(ellipse 40% 36% at 100% 0%, var(--fx-glow-2) 0%, transparent 70%);
      }
    }

    /* High contrast: remove glows, keep fainter grid */
    @media (prefers-contrast: more) {
      .ts-bg {
        background: none !important;
      }
      .ts-bg-grid {
        opacity: 0.6;
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
