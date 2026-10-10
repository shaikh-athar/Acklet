// packages/tool-shell/src/components/primitive/ts-skeleton.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ts-skeleton" 
      [style.width]="width()" 
      [style.height]="height()" 
      [style.border-radius]="radius()"
      aria-hidden="true"
    ></div>
  `,
  styles: [`
    .ts-skeleton {
      background: linear-gradient(
        90deg,
        var(--ts-raised) 25%,
        var(--ts-raised-hover) 50%,
        var(--ts-raised) 75%
      );
      background-size: 200% 100%;
      animation: tsShimmer 2s infinite linear;
    }
  `]
})
export class TsSkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('20px');
  readonly radius = input<string>('var(--ts-radius-sm, 8px)');
}
