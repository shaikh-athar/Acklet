// client/apps/tool-device-studio/src/components/shared/acklet-dropdown.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-acklet-dropdown',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="acklet-dropdown-wrapper" [class.is-disabled]="disabled()" [class.is-open]="isOpen()">
      @if (label()) {
        <label class="dropdown-label">{{ label() }}</label>
      }

      <!-- Trigger Button -->
      <button
        type="button"
        class="dropdown-trigger"
        [class.is-active]="isOpen()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-label]="label() || placeholder()"
        [disabled]="disabled()"
        (click)="toggleOpen($event)"
        (keydown)="onTriggerKeydown($event)"
      >
        <div class="trigger-left">
          @if (selectedOption()?.icon || icon()) {
            <ts-icon [name]="selectedOption()?.icon || icon()" [size]="15" class="trigger-icon" />
          }
          <span class="trigger-text" [class.is-placeholder]="!selectedOption()">
            {{ selectedOption()?.label || placeholder() }}
          </span>
          @if (selectedOption()?.badge) {
            <span class="trigger-badge">{{ selectedOption()!.badge }}</span>
          }
        </div>
        <ts-icon name="chevron-down" [size]="14" class="trigger-chevron" [class.rotated]="isOpen()" />
      </button>

      <!-- Dropdown Popup Menu -->
      @if (isOpen()) {
        <div
          class="dropdown-menu custom-scrollbar"
          role="listbox"
          [attr.aria-label]="label() || placeholder()"
          (click)="$event.stopPropagation()"
        >
          @if (options().length === 0) {
            <div class="dropdown-empty-state">
              <ts-icon name="alert-circle" [size]="14" />
              <span>{{ emptyText() }}</span>
            </div>
          } @else {
            <div class="dropdown-list">
              @for (opt of options(); track opt.value; let idx = $index) {
                <button
                  type="button"
                  class="dropdown-item"
                  role="option"
                  [class.is-selected]="opt.value === value()"
                  [class.is-focused]="focusedIndex() === idx"
                  [attr.aria-selected]="opt.value === value()"
                  [disabled]="opt.disabled"
                  (click)="selectOption(opt, $event)"
                  (mouseenter)="focusedIndex.set(idx)"
                >
                  <div class="item-left">
                    @if (opt.icon) {
                      <ts-icon [name]="opt.icon" [size]="14" class="item-icon" />
                    }
                    <div class="item-text-group">
                      <span class="item-label">{{ opt.label }}</span>
                      @if (opt.description) {
                        <span class="item-desc">{{ opt.description }}</span>
                      }
                    </div>
                    @if (opt.badge) {
                      <span class="item-badge">{{ opt.badge }}</span>
                    }
                  </div>

                  @if (opt.value === value()) {
                    <ts-icon name="check" [size]="14" class="item-check" />
                  }
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }

    .acklet-dropdown-wrapper {
      position: relative;
      width: 100%;
    }

    .dropdown-label {
      display: block;
      font-size: 0.725rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #71717A);
      margin-bottom: 0.35rem;
    }

    /* Trigger Button */
    .dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 38px;
      padding: 0.45rem 0.75rem;
      border-radius: var(--ts-radius-md, 10px);
      background: var(--ds-card-bg, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      font-family: inherit;
      font-size: 0.85rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      outline: none;
      user-select: none;
    }

    :host-context([data-theme="light"]) .dropdown-trigger {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      color: #0F172A;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .dropdown-trigger:hover:not(:disabled) {
      border-color: var(--tool-accent, #2563EB);
      background: var(--surface-hover, rgba(255, 255, 255, 0.05));
    }

    :host-context([data-theme="light"]) .dropdown-trigger:hover:not(:disabled) {
      background: rgba(37, 99, 235, 0.04);
      border-color: #2563EB;
    }

    .dropdown-trigger.is-active,
    .dropdown-trigger:focus-visible {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--tool-accent, #2563EB) 25%, transparent);
    }

    .dropdown-trigger:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .trigger-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex: 1;
    }

    .trigger-icon {
      color: var(--tool-accent, #2563EB);
      flex-shrink: 0;
    }

    .trigger-text {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .trigger-text.is-placeholder {
      color: var(--text-muted, #71717A);
    }

    .trigger-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 99px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.25);
      flex-shrink: 0;
    }

    .trigger-chevron {
      color: var(--text-muted, #71717A);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      flex-shrink: 0;
      margin-left: 0.5rem;
    }

    .trigger-chevron.rotated {
      transform: rotate(180deg);
      color: var(--tool-accent, #2563EB);
    }

    /* Popup Menu */
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 100;
      max-height: 240px;
      overflow-y: auto;
      border-radius: var(--ts-radius-md, 10px);
      background: var(--shell-card, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
      padding: 0.25rem;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: fadeInDown 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="light"]) .dropdown-menu {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.05);
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-list {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.65rem;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text, #E4E4E7);
      font-family: inherit;
      font-size: 0.825rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.12s ease;
      outline: none;
      user-select: none;
    }

    :host-context([data-theme="light"]) .dropdown-item {
      color: #1E293B;
    }

    .dropdown-item:hover,
    .dropdown-item.is-focused {
      background: var(--surface-hover, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .dropdown-item:hover,
    :host-context([data-theme="light"]) .dropdown-item.is-focused {
      background: rgba(15, 23, 42, 0.04);
    }

    .dropdown-item.is-selected {
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .dropdown-item.is-selected {
      background: rgba(37, 99, 235, 0.08);
      color: #1D4ED8;
    }

    .dropdown-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      color: var(--text-muted, #71717A);
      flex-shrink: 0;
    }

    .dropdown-item.is-selected .item-icon {
      color: var(--tool-accent, #2563EB);
    }

    .item-text-group {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .item-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-desc {
      font-size: 0.7rem;
      color: var(--text-muted, #71717A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.05rem 0.35rem;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted, #A1A1AA);
      flex-shrink: 0;
    }

    .dropdown-item.is-selected .item-badge {
      background: rgba(37, 99, 235, 0.2);
      color: var(--tool-accent, #2563EB);
    }

    .item-check {
      color: var(--tool-accent, #2563EB);
      flex-shrink: 0;
      margin-left: 0.5rem;
    }

    .dropdown-empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-muted, #71717A);
      justify-content: center;
    }
  `]
})
export class AckletDropdownComponent {
  private readonly elRef = inject(ElementRef);

  public readonly options = input.required<DropdownOption[]>();
  public readonly value = input<string | null | undefined>('');
  public readonly placeholder = input<string>('Select an option...');
  public readonly disabled = input<boolean>(false);
  public readonly icon = input<string>('');
  public readonly label = input<string>('');
  public readonly emptyText = input<string>('No devices found');

  public readonly valueChange = output<string>();

  public readonly isOpen = signal<boolean>(false);
  public readonly focusedIndex = signal<number>(-1);

  public readonly selectedOption = computed<DropdownOption | undefined>(() => {
    const val = this.value();
    return this.options().find(opt => opt.value === val);
  });

  public toggleOpen(event?: MouseEvent): void {
    if (this.disabled()) return;
    if (event) event.stopPropagation();
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      const idx = this.options().findIndex(o => o.value === this.value());
      this.focusedIndex.set(idx >= 0 ? idx : 0);
    }
  }

  public close(): void {
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
  }

  public selectOption(opt: DropdownOption, event?: MouseEvent): void {
    if (opt.disabled) return;
    if (event) event.stopPropagation();
    this.valueChange.emit(opt.value);
    this.close();
  }

  public onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.toggleOpen();
      } else {
        const opts = this.options();
        if (opts.length === 0) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const cur = this.focusedIndex();
        const next = Math.max(0, Math.min(opts.length - 1, cur + delta));
        this.focusedIndex.set(next);
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.isOpen()) {
        const idx = this.focusedIndex();
        const opts = this.options();
        if (idx >= 0 && idx < opts.length) {
          this.selectOption(opts[idx]);
        }
      } else {
        this.toggleOpen();
      }
    } else if (event.key === 'Escape') {
      if (this.isOpen()) {
        event.preventDefault();
        this.close();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
