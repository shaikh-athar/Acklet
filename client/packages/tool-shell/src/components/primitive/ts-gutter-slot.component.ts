// packages/tool-shell/src/components/primitive/ts-gutter-slot.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-gutter-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (enabled()) {
      <aside class="ts-gutter-slot" aria-label="Tool Information & Auxiliary Rail">
        <ng-content />
      </aside>
    }
  `,
  styles: [`
    .ts-gutter-slot {
      width: var(--ts-gutter-width, 260px);
      height: 100%;
      border-left: 1px solid var(--ts-border);
      background: var(--ts-l1-chrome);
      display: none;
      flex-shrink: 0;
      overflow-y: auto;
      z-index: var(--ts-z-chrome, 10);
    }
    @media (min-width: 1280px) {
      .ts-gutter-slot {
        display: block;
      }
    }
  `]
})
export class TsGutterSlotComponent {
  readonly enabled = input<boolean>(true);
}
