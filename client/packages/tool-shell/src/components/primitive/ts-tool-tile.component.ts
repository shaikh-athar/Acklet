// packages/tool-shell/src/components/primitive/ts-tool-tile.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-tool-tile',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div 
      class="ts-tile-box" 
      [style.width.px]="size()" 
      [style.height.px]="size()"
      [style.border-radius.px]="size() <= 28 ? 8 : 12"
      [attr.aria-hidden]="true"
    >
      @if (icon()) {
        <ts-icon [name]="icon()!" [size]="iconSize()" />
      } @else {
        <span class="ts-tile-fallback">{{ fallbackChar() }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    .ts-tile-box {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      color: var(--text, #18181B);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      flex-shrink: 0;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    [data-theme="dark"] .ts-tile-box {
      background: var(--surface-hover, #1E1E22);
      border-color: var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #FCFCFC);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .ts-tile-fallback {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      color: inherit;
    }
  `]
})
export class TsToolTileComponent {
  readonly icon = input<string | null>(null);
  readonly name = input<string>('Tool');
  readonly size = input<number>(44);
  readonly category = input<string | null>(null);

  readonly iconSize = computed(() => Math.max(14, Math.round(this.size() * 0.55)));
  readonly fallbackChar = computed(() => (this.name() ? this.name().charAt(0) : 'T'));
}
