// packages/tool-shell/src/components/tool-suite/tool-chip.component.ts
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tool-chip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="tool-chip-btn"
      [class.is-active]="active()"
      [disabled]="disabled()"
      (click)="clicked.emit()"
      [attr.aria-pressed]="active()"
      [title]="title() || label()"
    >
      <span class="chip-label">{{ label() }}</span>
      @if (badge()) {
        <span class="chip-badge">{{ badge() }}</span>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .tool-chip-btn {
      height: var(--tool-chip-height, 36px);
      padding: 0 16px;
      border-radius: var(--tool-radius-pill, 999px);
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
      text-transform: none;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: background-color 150ms cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 150ms cubic-bezier(0.16, 1, 0.3, 1),
                  color 150ms cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .tool-chip-btn,
    [data-theme="dark"] .tool-chip-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .tool-chip-btn:hover:not(:disabled):not(.is-active) {
      border-color: var(--tool-accent, #2563EB);
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      color: var(--tool-accent, #2563EB);
    }

    .tool-chip-btn.is-active {
      background: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    .tool-chip-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chip-badge {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      font-weight: 700;
    }
  `]
})
export class ToolChipComponent {
  readonly label = input.required<string>();
  readonly active = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly badge = input<string | null>(null);
  readonly title = input<string | null>(null);

  readonly clicked = output<void>();
}
