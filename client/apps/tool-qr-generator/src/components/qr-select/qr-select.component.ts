// client/apps/tool-qr-generator/src/components/qr-select/qr-select.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { QrBrandIconComponent } from '../qr-brand-icon/qr-brand-icon.component';

export interface QrSelectOption<T = any> {
  value: T;
  label: string;
  icon?: string;
  sublabel?: string;
}

@Component({
  selector: 'app-qr-select',
  standalone: true,
  imports: [CommonModule, TsIconComponent, QrBrandIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="qr-select-container"
      [class.disabled]="disabled()"
      [class.is-open]="isOpen()"
      (click)="$event.stopPropagation()"
    >
      <button
        type="button"
        [id]="id()"
        class="qr-select-trigger"
        [class.open]="isOpen()"
        [disabled]="disabled()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="ariaLabel() || selectedOption()?.label || placeholder()"
        aria-haspopup="listbox"
        (click)="toggleOpen()"
        (keydown)="onKeydown($event)"
      >
        <div class="trigger-content">
          @if (isBrandIcon(selectedOption()?.icon)) {
            <app-qr-brand-icon [name]="selectedOption()!.icon!" class="select-leading-icon" />
          } @else if (selectedOption()?.icon; as iconName) {
            <ts-icon [name]="iconName" class="select-leading-icon" />
          }
          <span class="selected-label" [class.placeholder]="!selectedOption()">
            {{ selectedOption()?.label ?? placeholder() }}
          </span>
        </div>
        <ts-icon name="chevron-down" class="select-chevron" [class.rotated]="isOpen()" />
      </button>

      @if (isOpen()) {
        <div
          class="qr-select-menu slide-fade-up custom-scrollbar"
          [class.drop-up]="dropUp()"
          role="listbox"
          tabindex="-1"
          (keydown)="onMenuKeydown($event)"
        >
          @for (opt of options(); track opt.value; let idx = $index) {
            <button
              type="button"
              role="option"
              class="qr-select-item"
              [class.selected]="opt.value === value()"
              [class.highlighted]="idx === highlightedIndex()"
              [attr.aria-selected]="opt.value === value()"
              (click)="selectOption(opt.value)"
              (mouseenter)="highlightedIndex.set(idx)"
            >
              @if (isBrandIcon(opt.icon)) {
                <app-qr-brand-icon [name]="opt.icon!" class="item-icon" />
              } @else if (opt.icon) {
                <ts-icon [name]="opt.icon" class="item-icon" />
              }
              <div class="item-text-group">
                <span class="item-label">{{ opt.label }}</span>
                @if (opt.sublabel) {
                  <span class="item-sublabel">{{ opt.sublabel }}</span>
                }
              </div>
              @if (opt.value === value()) {
                <ts-icon name="check" class="item-check" />
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
      position: relative;
    }

    .qr-select-container {
      position: relative;
      width: 100%;
    }

    .qr-select-container.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .qr-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 2.375rem;
      padding: 0 0.875rem;
      background: var(--surface-2, #16233D);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      color: var(--text-primary, #fcfcfc);
      font-size: 0.875rem;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
      box-sizing: border-box;
      user-select: none;
    }

    :host-context([data-theme="light"]) .qr-select-trigger,
    [data-theme="light"] .qr-select-trigger {
      background: #FFFFFF !important;
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text-primary, #09090B);
    }

    .qr-select-trigger:hover:not(:disabled) {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    :host-context([data-theme="light"]) .qr-select-trigger:hover:not(:disabled),
    [data-theme="light"] .qr-select-trigger:hover:not(:disabled) {
      background: #F8FAFC !important;
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    .qr-select-trigger:focus,
    .qr-select-trigger:focus-visible,
    .qr-select-trigger.open {
      outline: none;
      border-color: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 0 3px var(--accent-2-glow, rgba(59, 130, 246, 0.25));
    }

    .trigger-content {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
      flex: 1 1 0%;
    }

    .select-leading-icon {
      width: 1rem;
      height: 1rem;
      color: var(--tool-accent, var(--accent, #3b82f6));
      flex-shrink: 0;
    }

    .selected-label {
      font-size: 0.875rem;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .selected-label.placeholder {
      color: var(--text-3, rgba(255, 255, 255, 0.45));
    }

    :host-context([data-theme="light"]) .selected-label.placeholder,
    [data-theme="light"] .selected-label.placeholder {
      color: #94A3B8;
    }

    .select-chevron {
      width: 13px;
      height: 13px;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      transition: transform 0.15s ease;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .select-chevron.rotated {
      transform: rotate(180deg);
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    /* Floating Dropdown Menu */
    .qr-select-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 100%;
      min-width: 100%;
      max-height: 240px;
      overflow-y: auto;
      background: var(--surface-1, #111A2E);
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      z-index: 60;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-sizing: border-box;
    }

    .qr-select-menu.drop-up {
      top: auto;
      bottom: calc(100% + 4px);
    }

    :host-context([data-theme="light"]) .qr-select-menu,
    [data-theme="light"] .qr-select-menu {
      background: #FFFFFF !important;
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
    }

    .qr-select-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-primary, #fcfcfc);
      font-size: 0.8125rem;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
      box-sizing: border-box;
      user-select: none;
    }

    :host-context([data-theme="light"]) .qr-select-item,
    [data-theme="light"] .qr-select-item {
      color: #09090B;
    }

    .qr-select-item:hover,
    .qr-select-item.highlighted {
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .qr-select-item:hover,
    :host-context([data-theme="light"]) .qr-select-item.highlighted,
    [data-theme="light"] .qr-select-item:hover,
    [data-theme="light"] .qr-select-item.highlighted {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .qr-select-item.selected {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
      color: var(--accent-strong, #60a5fa);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .qr-select-item.selected,
    [data-theme="light"] .qr-select-item.selected {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.3);
      color: #2563EB;
      font-weight: 600;
    }

    .item-icon {
      width: 13px;
      height: 13px;
      color: inherit;
      flex-shrink: 0;
    }

    .item-text-group {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-width: 0;
    }

    .item-label {
      font-size: 0.8125rem;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-sublabel {
      font-size: 0.6875rem;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .item-sublabel,
    [data-theme="light"] .item-sublabel {
      color: #64748B;
    }

    .item-check {
      width: 13px;
      height: 13px;
      color: var(--accent-strong, #60a5fa);
      flex-shrink: 0;
      margin-left: auto;
    }

    :host-context([data-theme="light"]) .item-check,
    [data-theme="light"] .item-check {
      color: #2563EB;
    }

    /* Animation */
    .slide-fade-up {
      animation: slideFadeUp 150ms ease-out;
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up {
        animation: none !important;
      }
    }
  `]
})
export class QrSelectComponent {
  private readonly elementRef = inject(ElementRef);

  readonly id = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly value = input<any>();
  readonly options = input.required<Array<QrSelectOption<any>>>();
  readonly placeholder = input<string>('Select an option');
  readonly disabled = input<boolean>(false);
  readonly dropUp = input<boolean>(false);

  readonly valueChange = output<any>();

  readonly isOpen = signal<boolean>(false);
  readonly highlightedIndex = signal<number>(-1);

  readonly selectedOption = computed(() => {
    const currentVal = this.value();
    return this.options().find(opt => opt.value === currentVal) ?? null;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen()) {
      const target = event.target as HTMLElement | null;
      if (!this.elementRef.nativeElement.contains(target)) {
        this.close();
      }
    }
  }

  toggleOpen(): void {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen.set(true);
    const selectedIdx = this.options().findIndex(opt => opt.value === this.value());
    this.highlightedIndex.set(selectedIdx >= 0 ? selectedIdx : 0);
  }

  close(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  selectOption(val: any): void {
    this.valueChange.emit(val);
    this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.open();
      } else if (this.highlightedIndex() >= 0 && this.highlightedIndex() < this.options().length) {
        this.selectOption(this.options()[this.highlightedIndex()].value);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.open();
      } else {
        const next = (this.highlightedIndex() + 1) % this.options().length;
        this.highlightedIndex.set(next);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.open();
      } else {
        const prev = (this.highlightedIndex() - 1 + this.options().length) % this.options().length;
        this.highlightedIndex.set(prev);
      }
    } else if (event.key === 'Escape') {
      if (this.isOpen()) {
        event.preventDefault();
        this.close();
      }
    } else if (event.key === 'Tab') {
      if (this.isOpen()) {
        this.close();
      }
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    this.onKeydown(event);
  }

  isBrandIcon(name: string | undefined): boolean {
    return QrBrandIconComponent.isBrandIcon(name);
  }
}
