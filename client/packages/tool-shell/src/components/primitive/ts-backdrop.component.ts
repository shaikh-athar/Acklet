// packages/tool-shell/src/components/primitive/ts-backdrop.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-backdrop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ts-backdrop-root" 
      aria-hidden="true"
      [style.--ts-tool-hue]="accentHueStyle()"
    >
      <div class="ts-gradient-orb orb-1"></div>
      <div class="ts-gradient-orb orb-2"></div>
      <div class="ts-gradient-orb orb-3"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      inset: 0 0 auto 0;
      height: clamp(280px, 38dvh, 420px);
      pointer-events: none;
      z-index: var(--ts-z-base, 0);
      overflow: hidden;
    }

    .ts-backdrop-root {
      position: relative;
      width: 100%;
      height: 100%;
      mask-image: linear-gradient(to bottom, #000 35%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, #000 35%, transparent 100%);
      contain: strict;
    }

    .ts-gradient-orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      mix-blend-mode: normal;
    }

    .orb-1 {
      top: -20%;
      left: 20%;
      width: 60vw;
      height: 360px;
      background: radial-gradient(circle, var(--ts-glow-1) 0%, transparent 70%);
      animation: tsDrift1 calc(50s * var(--ts-motion-scale, 1)) ease-in-out infinite alternate;
    }

    .orb-2 {
      top: -30%;
      right: 15%;
      width: 50vw;
      height: 320px;
      background: radial-gradient(circle, var(--ts-glow-2) 0%, transparent 65%);
      animation: tsDrift2 calc(60s * var(--ts-motion-scale, 1)) ease-in-out infinite alternate;
    }

    .orb-3 {
      top: -10%;
      left: 45%;
      width: 40vw;
      height: 280px;
      background: radial-gradient(circle, var(--ts-glow-3) 0%, transparent 60%);
    }

    @keyframes tsDrift1 {
      0% { transform: translate(0, 0); }
      100% { transform: translate(-30px, 20px); }
    }

    @keyframes tsDrift2 {
      0% { transform: translate(0, 0); }
      100% { transform: translate(30px, -15px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-gradient-orb {
        animation: none !important;
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
