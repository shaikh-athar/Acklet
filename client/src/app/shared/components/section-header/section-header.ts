// src/app/shared/components/section-header/section-header.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  template: `
    <div class="section-header" [class.centered]="centered()">
      @if (eyebrow()) {
        <div class="eyebrow">
          <span class="eyebrow-dot"></span>
          {{ eyebrow() }}
        </div>
      }
      <h2 class="sh-title" [innerHTML]="title()"></h2>
      @if (subtitle()) {
        <p class="sh-subtitle">{{ subtitle() }}</p>
      }
    </div>
  `,
  styles: [`
    .section-header { display: flex; flex-direction: column; gap: 0.75rem; max-width: 640px; }
    .section-header.centered { align-items: center; text-align: center; margin: 0 auto; }
    .eyebrow { display: flex; align-items: center; gap: 0.5rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-brand-500); }
    .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-brand-500); }
    .sh-title { font-size: clamp(2rem, 4vw, 2.75rem); font-family: var(--font-serif); font-weight: 400; color: var(--color-brand-900); line-height: 1.2; letter-spacing: -0.01em; }
    .sh-subtitle { font-size: 1.05rem; color: var(--color-brand-600); line-height: 1.7; }
  `],
})
export class SectionHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly centered = input<boolean>(false);
}
