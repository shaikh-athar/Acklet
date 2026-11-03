// apps/tool-barcode-generator/src/components/format-select/format-select.component.ts
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
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { BarcodeFormat, FormatRegistryItem, SymbologyCategory } from '../../models/barcode.models';
import { BARCODE_REGISTRY, getActiveFormatsGrouped } from '../../config/barcode-registry';

@Component({
  selector: 'app-format-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="format-select-container"
      [class.is-open]="isOpen()"
      (click)="$event.stopPropagation()"
    >
      <!-- Trigger Button -->
      <button
        type="button"
        class="format-select-trigger"
        [class.open]="isOpen()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
        (click)="toggleOpen()"
        (keydown)="onTriggerKeydown($event)"
      >
        <div class="trigger-left">
          <ts-icon name="barcode" class="trigger-icon" />
          <div class="trigger-info">
            <span class="trigger-label">{{ selectedFormatItem()?.label || 'Select Format' }}</span>
            <span class="trigger-category">{{ selectedFormatItem()?.category || 'Standard' }}</span>
          </div>
        </div>
        <ts-icon name="chevron-down" class="trigger-chevron" [class.rotated]="isOpen()" />
      </button>

      <!-- Dropdown Menu -->
      @if (isOpen()) {
        <div
          class="format-select-menu slide-fade-up custom-scrollbar"
          role="listbox"
          tabindex="-1"
        >
          <!-- Search Header -->
          <div class="menu-search-wrapper" (click)="$event.stopPropagation()">
            <ts-icon name="search" class="search-icon" />
            <input
              type="text"
              class="menu-search-input"
              placeholder="Search symbology (e.g. EAN, Code 128, UPC)..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              (keydown)="onSearchKeydown($event)"
              autofocus
            />
            @if (searchQuery()) {
              <button
                type="button"
                class="search-clear-btn"
                (click)="searchQuery.set('')"
                aria-label="Clear search"
              >
                <ts-icon name="x" [size]="14" />
              </button>
            }
          </div>

          <!-- Grouped Options List -->
          <div class="menu-scroll-area">
            @for (cat of visibleCategories(); track cat) {
              <div class="format-category-group">
                <div class="category-header">
                  <span>{{ cat }}</span>
                </div>

                @for (item of filteredGroups()[cat]; track item.id) {
                  <button
                    type="button"
                    role="option"
                    class="format-select-item"
                    [class.selected]="item.id === value()"
                    [attr.aria-selected]="item.id === value()"
                    (click)="selectFormat(item.id)"
                  >
                    <div class="item-main">
                      <div class="item-title-row">
                        <span class="item-name">{{ item.label }}</span>
                        @if (item.fixedLength) {
                          <span class="item-length-badge">{{ item.fixedLength }} digits</span>
                        }
                      </div>
                      <span class="item-desc">{{ item.shortHelper }}</span>
                    </div>

                    @if (item.id === value()) {
                      <ts-icon name="check" class="item-check" />
                    }
                  </button>
                }
              </div>
            }

            @if (visibleCategories().length === 0) {
              <div class="empty-search-state">
                <ts-icon name="search" class="empty-icon" />
                <p>No barcode formats found matching "{{ searchQuery() }}"</p>
              </div>
            }
          </div>
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

    .format-select-container {
      position: relative;
      width: 100%;
    }

    .format-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      min-height: 48px;
      border-radius: var(--shell-card-radius, 12px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      text-align: left;
      touch-action: manipulation;
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  box-shadow var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="light"]) .format-select-trigger {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #1E293B;
    }

    .format-select-trigger:hover {
      border-color: var(--tool-accent, #3B82F6);
      background: var(--bg-elevated, #282830);
    }

    :host-context([data-theme="light"]) .format-select-trigger:hover {
      background: #F8FAFC;
    }

    .format-select-trigger.open {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 0 3px var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
    }

    .trigger-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .trigger-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .trigger-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .trigger-label {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trigger-category {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .trigger-chevron {
      color: var(--text-muted, #94a3b8);
      transition: transform var(--ts-dur-fast, 150ms) ease;
      flex-shrink: 0;
    }

    .trigger-chevron.rotated {
      transform: rotate(180deg);
      color: var(--tool-accent, #3B82F6);
    }

    /* Dropdown Menu */
    .format-select-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 50;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: var(--shell-card-radius, 14px);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
      max-height: 380px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      backdrop-filter: blur(12px);
    }

    :host-context([data-theme="light"]) .format-select-menu {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
    }

    .menu-search-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
    }

    :host-context([data-theme="light"]) .menu-search-wrapper {
      border-bottom-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .search-icon {
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .menu-search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text, #fcfcfc);
      font-size: 13px;
    }

    :host-context([data-theme="light"]) .menu-search-input {
      color: #1E293B;
    }

    .search-clear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      padding: 2px;
      display: flex;
    }

    .menu-scroll-area {
      overflow-y: auto;
      max-height: 310px;
      padding: 6px;
    }

    .format-category-group {
      margin-bottom: 8px;
    }

    .category-header {
      padding: 6px 10px 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted, #94a3b8);
    }

    .format-select-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text, #fcfcfc);
      cursor: pointer;
      text-align: left;
      transition: background-color var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .format-select-item {
      color: #1E293B;
    }

    .format-select-item:hover {
      background: var(--tool-accent-soft, rgba(214, 69, 93, 0.08));
    }

    .format-select-item.selected {
      background: var(--tool-accent-soft, rgba(214, 69, 93, 0.12));
    }

    .item-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .item-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .item-name {
      font-size: 13px;
      font-weight: 600;
    }

    .item-length-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }

    .item-desc {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-check {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
      margin-left: 8px;
    }

    .empty-search-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 16px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
      gap: 8px;
      font-size: 13px;
    }

    .empty-icon {
      opacity: 0.5;
    }
  `]
})
export class BarcodeFormatSelectComponent {
  readonly value = input.required<BarcodeFormat>();
  readonly formatChange = output<BarcodeFormat>();

  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  private elementRef = inject(ElementRef);

  readonly selectedFormatItem = computed(() => {
    return BARCODE_REGISTRY[this.value()];
  });

  private allGrouped = getActiveFormatsGrouped();

  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const result: Record<string, FormatRegistryItem[]> = {};

    for (const [cat, items] of Object.entries(this.allGrouped)) {
      const itemList = (items || []) as FormatRegistryItem[];
      result[cat] = itemList.filter((item: FormatRegistryItem) => {
        if (!q) return true;
        const helper = (item as any).shortHelper || item.description || '';
        return (
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          helper.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      });
    }

    return result as Record<SymbologyCategory, FormatRegistryItem[]>;
  });

  readonly visibleCategories = computed(() => {
    const groups = this.filteredGroups();
    return Object.keys(groups).filter(cat => groups[cat as SymbologyCategory]?.length > 0) as SymbologyCategory[];
  });

  toggleOpen(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  selectFormat(formatId: BarcodeFormat): void {
    this.formatChange.emit(formatId);
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.isOpen.set(true);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
