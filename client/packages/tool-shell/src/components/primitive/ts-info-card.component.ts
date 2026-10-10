// packages/tool-shell/src/components/primitive/ts-info-card.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolHighlight } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsTooltipDirective } from './ts-tooltip.directive';

@Component({
  selector: 'ts-info-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsTooltipDirective],
  template: `
    @if (highlights() && highlights()!.length > 0) {
      <div class="ts-info-card-root">
        <div class="ts-info-grid">
          @for (item of highlights(); track item.label) {
            <div class="ts-info-stat-box">
              <div class="ts-stat-header">
                <span class="ts-stat-label">{{ item.label }}</span>
                @if (item.tooltip) {
                  <button 
                    type="button" 
                    class="ts-info-tip-btn" 
                    [tsTooltip]="item.tooltip"
                    [attr.aria-label]="item.label + ' information'"
                  >
                    <ts-icon name="info" [size]="12" />
                  </button>
                }
              </div>
              <span class="ts-stat-value">{{ item.value }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-info-card-root {
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-lg, 16px);
      padding: var(--ts-space-3, 12px) var(--ts-space-4, 16px);
      box-shadow: var(--ts-shadow-sm);
    }

    .ts-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--ts-space-3, 12px) var(--ts-space-4, 16px);
    }

    .ts-info-stat-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ts-stat-header {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ts-stat-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--ts-text-muted);
      letter-spacing: var(--ts-tracking-tight);
      text-transform: capitalize;
    }

    .ts-info-tip-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--ts-text-subtle);
      cursor: help;
      padding: 0;
    }

    .ts-info-tip-btn:hover {
      color: var(--ts-text);
    }

    .ts-stat-value {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `]
})
export class TsInfoCardComponent {
  readonly highlights = input<ToolHighlight[] | undefined>([]);
}
