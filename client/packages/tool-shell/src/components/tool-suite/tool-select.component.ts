// packages/tool-shell/src/components/tool-suite/tool-select.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

export interface ToolSelectOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
}

@Component({
  selector: 'app-tool-select',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-select-wrapper" (clickOutside)="isOpen.set(false)">
      <button
        type="button"
        class="tool-select-trigger"
        [class.is-open]="isOpen()"
        [disabled]="disabled()"
        (click)="isOpen.set(!isOpen())"
        (keydown)="onKeydown($event)"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="ariaLabel()"
      >
        <div class="trigger-content">
          <span class="trigger-label">{{ currentLabel() }}</span>
          @if (currentBadge(); as b) {
            <span class="trigger-badge">{{ b }}</span>
          }
        </div>
        <ts-icon [name]="isOpen() ? 'chevron-up' : 'chevron-down'" [size]="14" class="trigger-chevron" />
      </button>

      @if (isOpen()) {
        <div class="tool-select-popover" role="listbox">
          @for (opt of options(); track opt.value; let idx = $index) {
            <button
              type="button"
              class="select-option-item"
              [class.is-selected]="value() === opt.value"
              (click)="selectOption(opt.value)"
              role="option"
              [attr.aria-selected]="value() === opt.value"
            >
              <div class="option-text-group">
                <span class="option-label">{{ opt.label }}</span>
                @if (opt.description) {
                  <span class="option-desc">{{ opt.description }}</span>
                }
              </div>
              @if (opt.badge) {
                <span class="option-badge">{{ opt.badge }}</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-select-wrapper {
      position: relative;
      width: 100%;
      font-family: var(--tool-font-family, inherit);
    }

    .tool-select-trigger {
      width: 100%;
      height: var(--tool-control-height, 40px);
      padding: 0 14px;
      border-radius: var(--tool-radius-control, 12px);
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13.5px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: border-color 150ms ease, box-shadow 150ms ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .tool-select-trigger,
    [data-theme="dark"] .tool-select-trigger {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
    }

    .tool-select-trigger:hover:not(:disabled),
    .tool-select-trigger.is-open {
      border-color: var(--tool-accent, #2563EB);
      outline: none;
    }

    .trigger-content {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
    }

    .trigger-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
    }

    .trigger-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.1));
      color: var(--tool-accent, #2563EB);
    }

    .trigger-chevron {
      color: var(--text-muted, #94A3B8);
      flex-shrink: 0;
    }

    .tool-select-popover {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 100;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--tool-radius-control, 12px);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .tool-select-popover,
    [data-theme="dark"] .tool-select-popover {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .select-option-item {
      padding: 8px 12px;
      border-radius: calc(var(--tool-radius-control, 12px) - 4px);
      border: none;
      background: transparent;
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    :host-context([data-theme="dark"]) .select-option-item,
    [data-theme="dark"] .select-option-item {
      color: #F8FAFC;
    }

    .select-option-item:hover {
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      color: var(--tool-accent, #2563EB);
    }

    .select-option-item.is-selected {
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-weight: 600;
    }

    .option-text-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
    }

    .option-desc {
      font-size: 11px;
      color: var(--text-muted, #94A3B8);
    }

    .select-option-item.is-selected .option-desc {
      color: rgba(255, 255, 255, 0.8);
    }

    .option-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    .select-option-item.is-selected .option-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }
  `]
})
export class ToolSelectComponent {
  readonly options = input.required<ToolSelectOption[]>();
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('Select option');

  readonly valueChange = output<string>();

  readonly isOpen = signal(false);

  currentLabel(): string {
    const found = this.options().find(o => o.value === this.value());
    return found ? found.label : (this.options()[0]?.label || '');
  }

  currentBadge(): string | undefined {
    const found = this.options().find(o => o.value === this.value());
    return found?.badge;
  }

  selectOption(val: string): void {
    this.valueChange.emit(val);
    this.isOpen.set(false);
  }

  onKeydown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape') {
      this.isOpen.set(false);
    } else if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      this.navigateOptions(1);
    } else if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      this.navigateOptions(-1);
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      this.isOpen.set(!this.isOpen());
    }
  }

  private navigateOptions(direction: number): void {
    const opts = this.options();
    const currIdx = opts.findIndex(o => o.value === this.value());
    let nextIdx = currIdx + direction;
    if (nextIdx < 0) nextIdx = opts.length - 1;
    if (nextIdx >= opts.length) nextIdx = 0;
    this.selectOption(opts[nextIdx].value);
  }
}
