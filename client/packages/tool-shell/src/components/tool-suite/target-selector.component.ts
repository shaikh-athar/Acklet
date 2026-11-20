// packages/tool-shell/src/components/tool-suite/target-selector.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

export interface TargetSelectorOption {
  value: string;
  label: string;
  badge?: string;
  title?: string;
}

@Component({
  selector: 'app-target-selector',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (options().length <= 4) {
      <!-- Segmented Control Mode (<= 4 options) -->
      <div class="target-segmented-control" role="radiogroup" [attr.aria-label]="ariaLabel()">
        @for (opt of options(); track opt.value) {
          <button
            type="button"
            class="segmented-btn"
            [class.is-active]="value() === opt.value"
            (click)="selectOption(opt.value)"
            role="radio"
            [attr.aria-checked]="value() === opt.value"
            [title]="opt.title || opt.label"
          >
            <span>{{ opt.label }}</span>
            @if (opt.badge) {
              <span class="opt-badge">{{ opt.badge }}</span>
            }
          </button>
        }
      </div>
    } @else {
      <!-- Dropdown Control Mode (>= 5 options) -->
      <div class="target-dropdown-wrap" (clickOutside)="isOpen.set(false)">
        <button
          type="button"
          class="target-dropdown-trigger"
          [class.is-open]="isOpen()"
          (click)="isOpen.set(!isOpen())"
          aria-haspopup="listbox"
          [attr.aria-expanded]="isOpen()"
        >
          <span class="trigger-label">{{ selectedLabel() }}</span>
          @if (selectedBadge(); as b) {
            <span class="opt-badge">{{ b }}</span>
          }
          <ts-icon [name]="isOpen() ? 'chevron-up' : 'chevron-down'" [size]="14" class="trigger-chevron" />
        </button>

        @if (isOpen()) {
          <div class="target-dropdown-menu" role="listbox">
            @for (opt of options(); track opt.value) {
              <button
                type="button"
                class="dropdown-item"
                [class.is-active]="value() === opt.value"
                (click)="selectOption(opt.value)"
                role="option"
                [attr.aria-selected]="value() === opt.value"
              >
                <span>{{ opt.label }}</span>
                @if (opt.badge) {
                  <span class="opt-badge">{{ opt.badge }}</span>
                }
              </button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    /* ── Segmented Control ── */
    .target-segmented-control {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
      gap: 4px;
      padding: 4px;
      background: var(--ts-surface-inset, rgba(15, 23, 42, 0.04));
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--tool-radius-control, 12px);
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .target-segmented-control,
    [data-theme="dark"] .target-segmented-control {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .segmented-btn {
      height: 32px;
      border-radius: calc(var(--tool-radius-control, 12px) - 4px);
      border: none;
      background: transparent;
      color: var(--text-secondary, #64748B);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .segmented-btn,
    [data-theme="dark"] .segmented-btn {
      color: #94A3B8;
    }

    .segmented-btn:hover:not(.is-active) {
      color: var(--text, #0F172A);
      background: rgba(0, 0, 0, 0.03);
    }

    :host-context([data-theme="dark"]) .segmented-btn:hover:not(.is-active),
    [data-theme="dark"] .segmented-btn:hover:not(.is-active) {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }

    .segmented-btn.is-active {
      background: #FFFFFF;
      color: var(--tool-accent, #2563EB);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .segmented-btn.is-active,
    [data-theme="dark"] .segmented-btn.is-active {
      background: #27272A;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* ── Dropdown Control ── */
    .target-dropdown-wrap {
      position: relative;
      width: 100%;
    }

    .target-dropdown-trigger {
      width: 100%;
      height: var(--tool-control-height, 40px);
      padding: 0 14px;
      border-radius: var(--tool-radius-control, 12px);
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    :host-context([data-theme="dark"]) .target-dropdown-trigger,
    [data-theme="dark"] .target-dropdown-trigger {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
    }

    .target-dropdown-trigger:hover,
    .target-dropdown-trigger.is-open {
      border-color: var(--tool-accent, #2563EB);
      outline: none;
    }

    .trigger-chevron {
      color: #94A3B8;
      flex-shrink: 0;
    }

    .target-dropdown-menu {
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
    }

    :host-context([data-theme="dark"]) .target-dropdown-menu,
    [data-theme="dark"] .target-dropdown-menu {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .dropdown-item {
      height: 34px;
      padding: 0 12px;
      border-radius: calc(var(--tool-radius-control, 12px) - 4px);
      border: none;
      background: transparent;
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    :host-context([data-theme="dark"]) .dropdown-item,
    [data-theme="dark"] .dropdown-item {
      color: #F8FAFC;
    }

    .dropdown-item:hover {
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      color: var(--tool-accent, #2563EB);
    }

    .dropdown-item.is-active {
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-weight: 600;
    }

    .opt-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    .dropdown-item.is-active .opt-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }
  `]
})
export class TargetSelectorComponent {
  readonly options = input.required<TargetSelectorOption[]>();
  readonly value = input<string>('');
  readonly ariaLabel = input<string>('Target selection');
  readonly valueChange = output<string>();

  readonly isOpen = signal(false);

  selectedLabel(): string {
    const found = this.options().find(o => o.value === this.value());
    return found ? found.label : (this.options()[0]?.label || '');
  }

  selectedBadge(): string | undefined {
    const found = this.options().find(o => o.value === this.value());
    return found?.badge;
  }

  selectOption(val: string): void {
    this.valueChange.emit(val);
    this.isOpen.set(false);
  }
}
