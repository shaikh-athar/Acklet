// apps/tool-image-compressor/src/components/custom-select/custom-select.component.ts
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
import { DropdownManagerService } from '../../services/dropdown-manager.service';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: string;
  sub?: string;
  badge?: string;
  disabled?: boolean;
}

let nextCustomSelectId = 0;

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="custom-select-container"
      [class.is-open]="isOpen()"
      [class.is-disabled]="disabled()"
      [class.size-sm]="size() === 'sm'"
    >
      <!-- Trigger Button -->
      <button
        #triggerBtn
        type="button"
        class="select-trigger font-mono"
        [disabled]="disabled()"
        (click)="toggleOpen($event)"
        (keydown)="onTriggerKeydown($event)"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-label]="ariaLabel()"
      >
        <div class="trigger-label-group">
          @if (selectedOption()?.icon; as iconName) {
            <ts-icon [name]="iconName" [size]="size() === 'sm' ? 12 : 14" class="trigger-icon" />
          }
          <span class="trigger-text">
            {{ selectedOption()?.label || placeholder() }}
          </span>
          @if (selectedOption()?.badge; as b) {
            <span class="trigger-badge font-mono">{{ b }}</span>
          }
        </div>

        <div class="trigger-arrow" [class.is-rotated]="isOpen()" aria-hidden="true">
          <ts-icon name="chevron-down" [size]="size() === 'sm' ? 12 : 14" />
        </div>
      </button>

      <!-- Dropdown Popover Menu -->
      @if (isOpen()) {
        <div
          class="select-dropdown-menu animate-scale-up"
          role="listbox"
          [attr.aria-label]="ariaLabel()"
          tabindex="-1"
          (keydown)="onMenuKeydown($event)"
        >
          @for (opt of options(); track opt.value; let idx = $index) {
            <button
              type="button"
              class="select-option-item font-mono"
              [class.is-selected]="opt.value === value()"
              [class.is-focused]="focusedIndex() === idx"
              [class.is-disabled]="opt.disabled"
              [disabled]="opt.disabled"
              role="option"
              [attr.aria-selected]="opt.value === value()"
              (click)="selectOption(opt, $event)"
              (mouseenter)="focusedIndex.set(idx)"
            >
              <div class="option-left">
                @if (opt.icon) {
                  <ts-icon [name]="opt.icon" [size]="13" class="option-icon" />
                }
                <div class="option-text-stack">
                  <span class="option-main-label">{{ opt.label }}</span>
                  @if (opt.sub) {
                    <span class="option-sub-label">{{ opt.sub }}</span>
                  }
                </div>
              </div>

              <div class="option-right">
                @if (opt.badge) {
                  <span class="option-badge">{{ opt.badge }}</span>
                }
                @if (opt.value === value()) {
                  <ts-icon name="check" [size]="13" class="option-check-icon" />
                }
              </div>
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
      position: relative;
    }

    .custom-select-container {
      position: relative;
      width: 100%;
    }

    /* ── Trigger Button ── */
    .select-trigger {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-radius: 9px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }

    :host-context([data-theme="dark"]) .select-trigger,
    [data-theme="dark"] .select-trigger {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .select-trigger:hover:not(:disabled) {
      border-color: var(--accent, #2563EB);
      background: rgba(37, 99, 235, 0.02);
    }

    :host-context([data-theme="dark"]) .select-trigger:hover:not(:disabled),
    [data-theme="dark"] .select-trigger:hover:not(:disabled) {
      border-color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.06);
    }

    .custom-select-container.is-open .select-trigger,
    .select-trigger:focus-visible {
      border-color: var(--accent, #2563EB);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
    }

    :host-context([data-theme="dark"]) .custom-select-container.is-open .select-trigger,
    :host-context([data-theme="dark"]) .select-trigger:focus-visible,
    [data-theme="dark"] .custom-select-container.is-open .select-trigger,
    [data-theme="dark"] .select-trigger:focus-visible {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    /* Small Variant */
    .custom-select-container.size-sm .select-trigger {
      height: 34px;
      padding: 0 10px;
      font-size: 11.5px;
      border-radius: 7px;
    }

    .trigger-label-group {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      overflow: hidden;
    }

    .trigger-icon {
      color: var(--accent, #2563EB);
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .trigger-icon,
    [data-theme="dark"] .trigger-icon {
      color: var(--accent, #3B82F6);
    }

    .trigger-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }

    .trigger-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(37, 99, 235, 0.08);
      color: var(--accent, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    :host-context([data-theme="dark"]) .trigger-badge,
    [data-theme="dark"] .trigger-badge {
      background: rgba(59, 130, 246, 0.16);
      color: #60A5FA;
      border-color: rgba(59, 130, 246, 0.3);
    }

    .trigger-arrow {
      color: #64748B;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .trigger-arrow,
    [data-theme="dark"] .trigger-arrow {
      color: #94A3B8;
    }

    .trigger-arrow.is-rotated {
      transform: rotate(180deg);
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .trigger-arrow.is-rotated,
    [data-theme="dark"] .trigger-arrow.is-rotated {
      color: var(--accent, #3B82F6);
    }

    /* ── Dropdown Popover ── */
    .select-dropdown-menu {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 999;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 5px;
      max-height: 240px;
      overflow-y: auto;
      box-shadow:
        0 12px 28px -4px rgba(15, 23, 42, 0.15),
        0 4px 10px -2px rgba(15, 23, 42, 0.05);
      outline: none;
    }

    :host-context([data-theme="dark"]) .select-dropdown-menu,
    [data-theme="dark"] .select-dropdown-menu {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow:
        0 16px 36px -6px rgba(0, 0, 0, 0.65),
        0 4px 12px -2px rgba(0, 0, 0, 0.4);
    }

    .select-option-item {
      width: 100%;
      min-height: 34px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #0F172A;
      font-size: 12px;
      font-weight: 500;
      text-align: left;
      transition: background 0.1s ease, color 0.1s ease;
      outline: none;
    }

    :host-context([data-theme="dark"]) .select-option-item,
    [data-theme="dark"] .select-option-item {
      color: #F1F5F9;
    }

    .select-option-item:hover,
    .select-option-item.is-focused {
      background: rgba(37, 99, 235, 0.06);
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .select-option-item:hover,
    :host-context([data-theme="dark"]) .select-option-item.is-focused,
    [data-theme="dark"] .select-option-item:hover,
    [data-theme="dark"] .select-option-item.is-focused {
      background: rgba(59, 130, 246, 0.12);
      color: #60A5FA;
    }

    .select-option-item.is-selected {
      background: rgba(37, 99, 235, 0.1);
      color: var(--accent, #2563EB);
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .select-option-item.is-selected,
    [data-theme="dark"] .select-option-item.is-selected {
      background: rgba(59, 130, 246, 0.18);
      color: #93C5FD;
    }

    .option-left {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      flex: 1;
    }

    .option-icon {
      color: var(--accent, #2563EB);
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .option-icon,
    [data-theme="dark"] .option-icon {
      color: var(--accent, #3B82F6);
    }

    .option-text-stack {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .option-main-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .option-sub-label {
      font-size: 10.5px;
      color: #64748B;
      font-weight: 400;
    }

    :host-context([data-theme="dark"]) .option-sub-label,
    [data-theme="dark"] .option-sub-label {
      color: #94A3B8;
    }

    .option-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .option-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(100, 116, 139, 0.1);
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .option-badge,
    [data-theme="dark"] .option-badge {
      background: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .option-check-icon {
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .option-check-icon,
    [data-theme="dark"] .option-check-icon {
      color: var(--accent, #3B82F6);
    }

    .animate-scale-up {
      animation: selectPop 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: top center;
    }

    @keyframes selectPop {
      0% {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class CustomSelectComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly dropdownManager = inject(DropdownManagerService);
  readonly selectId = `custom-select-${++nextCustomSelectId}`;

  readonly options = input.required<CustomSelectOption[]>();
  readonly value = input<string>('');
  readonly placeholder = input<string>('Select an option');
  readonly disabled = input<boolean>(false);
  readonly size = input<'sm' | 'md'>('md');
  readonly ariaLabel = input<string>('Select option');

  readonly valueChange = output<string>();

  readonly isOpen = computed(() => this.dropdownManager.isOpen(this.selectId));
  readonly focusedIndex = signal<number>(-1);

  readonly selectedOption = computed<CustomSelectOption | undefined>(() => {
    const val = this.value();
    return this.options().find(o => o.value === val);
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  toggleOpen(event?: MouseEvent): void {
    if (this.disabled()) return;
    event?.stopPropagation();
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled()) return;
    this.dropdownManager.open(this.selectId);
    const currVal = this.value();
    const idx = this.options().findIndex(o => o.value === currVal);
    this.focusedIndex.set(idx >= 0 ? idx : 0);
  }

  close(): void {
    this.dropdownManager.close(this.selectId);
    this.focusedIndex.set(-1);
  }

  selectOption(option: CustomSelectOption, event?: Event): void {
    event?.stopPropagation();
    if (option.disabled) return;
    this.valueChange.emit(option.value);
    this.close();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.open();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const opts = this.options();
    const curIdx = this.focusedIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIdx = (curIdx + 1) % opts.length;
      this.focusedIndex.set(nextIdx);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIdx = (curIdx - 1 + opts.length) % opts.length;
      this.focusedIndex.set(prevIdx);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (curIdx >= 0 && curIdx < opts.length) {
        this.selectOption(opts[curIdx]);
      }
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.close();
    }
  }
}

