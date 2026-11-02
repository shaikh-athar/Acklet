// apps/tool-barcode-generator/src/components/format-picker/format-picker.component.ts
import {
  Component,
  input,
  output,
  model,
  signal,
  computed,
  inject,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent, ResponsiveService, BottomSheetComponent } from '@acklet/tool-shell';
import { BarcodeCatalogItem, BarcodeCategory, FormatVariant } from '../../models/barcode.models';
import { FormatRegistryService } from '../../services/format-registry.service';
import { BARCODE_SYSTEM_LIMITS } from '../../config/barcode-catalog.config';

@Component({
  selector: 'app-format-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, BottomSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="format-picker-host" (click)="$event.stopPropagation()">
      <!-- Step 1 & 2: Main Format Trigger -->
      <button
        type="button"
        class="picker-trigger-btn"
        [class.is-open]="isOpen()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="dialog"
        (click)="toggleOpen()"
        (keydown)="onTriggerKeydown($event)"
      >
        <div class="trigger-main">
          <ts-icon name="barcode" class="trigger-icon" />
          <div class="trigger-meta">
            <span class="trigger-title">{{ currentItem()?.label || 'Code 128' }}</span>
            <span class="trigger-subtitle">{{ currentItem()?.category || 'General' }}</span>
          </div>
        </div>
        <ts-icon name="chevron-down" class="trigger-chevron" [class.rotated]="isOpen()" />
      </button>

      <!-- Step 3: Variant Segmented Control / Field (Shown only when format has variants) -->
      @if (currentItem()?.variants?.length) {
        <div class="variant-selector-wrap">
          <span class="variant-field-label">Variant</span>
          <div class="variant-segmented-strip" role="radiogroup" aria-label="Format variant">
            @for (v of currentItem()!.variants!; track v.id) {
              <button
                type="button"
                role="radio"
                class="variant-pill-btn"
                [class.active]="selectedVariant() === v.id"
                [attr.aria-checked]="selectedVariant() === v.id"
                (click)="onSelectVariant(v.id)"
              >
                {{ v.label }}
              </button>
            }
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- Phone Viewport: Full-height bottom sheet                       -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (responsive.isPhone()) {
        <ts-bottom-sheet
          [isOpen]="isOpen()"
          title="Select format"
          maxHeight="92dvh"
          (close)="close()"
        >
          <div class="phone-sheet-content">
            <!-- Search Input -->
            <div class="search-header-bar sticky-search">
              <ts-icon name="search" class="search-bar-icon" />
              <input
                type="text"
                class="format-search-input"
                placeholder="Search format, alias or use case"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                autocomplete="off"
                spellcheck="false"
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

            <!-- Category Pills Filter Strip (Phone) -->
            @if (!searchQuery()) {
              <div class="phone-category-scroll custom-scrollbar">
                @for (cat of categories(); track cat) {
                  <button
                    type="button"
                    class="category-pill-btn"
                    [class.active]="selectedCategory() === cat"
                    (click)="selectedCategory.set(cat)"
                  >
                    {{ cat }}
                  </button>
                }
              </div>
            }

            <!-- Format Items List -->
            <div class="phone-format-list custom-scrollbar">
              @if (displayedFormats().length === 0) {
                <div class="empty-search-row">
                  <p>No formats found matching "{{ searchQuery() }}"</p>
                </div>
              } @else {
                @for (item of displayedFormats(); track item.id) {
                  <button
                    type="button"
                    class="format-row-btn"
                    [class.selected]="item.id === value()"
                    (click)="selectFormat(item)"
                  >
                    <div class="row-info">
                      <div class="row-top">
                        <span class="row-name">{{ item.label }}</span>
                        @if (item.length.fixed) {
                          <span class="row-badge">{{ item.length.fixed }} digits</span>
                        }
                      </div>
                      <span class="row-desc">{{ item.description }}</span>
                    </div>
                    @if (item.id === value()) {
                      <ts-icon name="check" class="row-check" />
                    }
                  </button>
                }
              }
            </div>

            <!-- Footer Quiet Link -->
            <div class="picker-footer-note">
              <a [href]="qrToolUrl" target="_blank" rel="noopener" class="qr-cross-link">
                Need a QR code? Open QR Generator
              </a>
            </div>
          </div>
        </ts-bottom-sheet>
      } @else {
        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- Desktop & Tablet Viewport: Two-Pane Popover (480px wide)    -->
        <!-- ════════════════════════════════════════════════════════════ -->
        @if (isOpen()) {
          <div class="popover-backdrop" (click)="close()" aria-hidden="true"></div>
          <div
            class="desktop-popover-panel slide-fade-up"
            role="dialog"
            aria-label="Barcode format picker"
          >
            <!-- Search Header at top -->
            <div class="search-header-bar">
              <ts-icon name="search" class="search-bar-icon" />
              <input
                #searchInput
                type="text"
                class="format-search-input"
                placeholder="Search format, alias or use case"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                (keydown)="onSearchKeydown($event)"
                autocomplete="off"
                spellcheck="false"
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

            <!-- Two-Pane Body -->
            <div class="two-pane-body">
              <!-- Left Pane: Categories -->
              @if (!searchQuery()) {
                <div class="left-category-pane custom-scrollbar" role="tablist">
                  @for (cat of categories(); track cat) {
                    <button
                      type="button"
                      role="tab"
                      class="category-nav-btn"
                      [class.active]="selectedCategory() === cat"
                      [attr.aria-selected]="selectedCategory() === cat"
                      (click)="selectedCategory.set(cat)"
                    >
                      <span>{{ cat }}</span>
                    </button>
                  }
                </div>
              }

              <!-- Right Pane: Formats List -->
              <div
                class="right-format-pane custom-scrollbar"
                [class.full-width]="!!searchQuery()"
                role="listbox"
              >
                <!-- Recent Section (when on Popular category and not searching) -->
                @if (!searchQuery() && selectedCategory() === 'Popular' && recentFormats().length > 0) {
                  <div class="section-label-header">Recent</div>
                  @for (item of recentFormats(); track 'recent-' + item.id) {
                    <button
                      type="button"
                      role="option"
                      class="format-row-btn"
                      [class.selected]="item.id === value()"
                      [attr.aria-selected]="item.id === value()"
                      (click)="selectFormat(item)"
                    >
                      <div class="row-info">
                        <div class="row-top">
                          <span class="row-name">{{ item.label }}</span>
                          @if (item.length.fixed) {
                            <span class="row-badge">{{ item.length.fixed }} digits</span>
                          }
                        </div>
                        <span class="row-desc">{{ item.description }}</span>
                      </div>
                      @if (item.id === value()) {
                        <ts-icon name="check" class="row-check" />
                      }
                    </button>
                  }

                  <div class="section-label-header">Popular</div>
                }

                <!-- Active List of Formats -->
                @if (displayedFormats().length === 0) {
                  <div class="empty-search-row">
                    <p>No formats found matching "{{ searchQuery() }}"</p>
                  </div>
                } @else {
                  @for (item of displayedFormats(); track item.id; let i = $index) {
                    <button
                      type="button"
                      role="option"
                      class="format-row-btn"
                      [class.selected]="item.id === value()"
                      [class.focused]="focusedIndex() === i"
                      [attr.aria-selected]="item.id === value()"
                      (click)="selectFormat(item)"
                    >
                      <div class="row-info">
                        <div class="row-top">
                          <span class="row-name">{{ item.label }}</span>
                          @if (item.length.fixed) {
                            <span class="row-badge">{{ item.length.fixed }} digits</span>
                          }
                        </div>
                        <span class="row-desc">{{ item.description }}</span>
                      </div>
                      @if (item.id === value()) {
                        <ts-icon name="check" class="row-check" />
                      }
                    </button>
                  }
                }
              </div>
            </div>

            <!-- Footer Quiet Link -->
            <div class="picker-footer-note">
              <a [href]="qrToolUrl" target="_blank" rel="noopener" class="qr-cross-link">
                Need a QR code? Open QR Generator
              </a>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }

    .format-picker-host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      position: relative;
    }

    /* Trigger Button */
    .picker-trigger-btn {
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
      touch-action: manipulation;
      transition: border-color var(--ts-dur-fast, 150ms) ease,
                  background var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .picker-trigger-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .picker-trigger-btn:hover,
    .picker-trigger-btn.is-open {
      border-color: var(--tool-accent, #3B82F6);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
    }

    :host-context([data-theme="light"]) .picker-trigger-btn:hover,
    :host-context([data-theme="light"]) .picker-trigger-btn.is-open {
      background: #F8FAFC;
      border-color: var(--tool-accent, #2563EB);
    }

    .trigger-main {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }

    .trigger-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .trigger-meta {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .trigger-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      color: inherit;
    }

    .trigger-subtitle {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.2;
    }

    :host-context([data-theme="light"]) .trigger-subtitle {
      color: #64748B;
    }

    .trigger-chevron {
      color: var(--text-muted, #94a3b8);
      transition: transform var(--ts-dur-fast, 150ms) ease;
      flex-shrink: 0;
    }

    .trigger-chevron.rotated {
      transform: rotate(180deg);
    }

    /* Variant Segmented Control */
    .variant-selector-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 2px;
    }

    .variant-field-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .variant-segmented-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
      border-radius: 8px;
      background: var(--bg-elevated, #F1F5F9);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
    }

    :host-context([data-theme="dark"]) .variant-segmented-strip,
    [data-theme="dark"] .variant-segmented-strip {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .variant-pill-btn {
      padding: 4px 10px;
      min-height: 28px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: transparent;
      border: none;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) ease, color var(--ts-dur-fast, 150ms) ease;
    }

    .variant-pill-btn:hover:not(.active) {
      color: var(--text, #0f172a);
      background: var(--bg-surface-hover, rgba(15, 23, 42, 0.08));
    }

    :host-context([data-theme="dark"]) .variant-pill-btn:hover:not(.active),
    [data-theme="dark"] .variant-pill-btn:hover:not(.active) {
      color: var(--text, #fcfcfc);
      background: rgba(255, 255, 255, 0.12);
    }

    .variant-pill-btn.active {
      background: var(--tool-accent, #3B82F6) !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }

    .variant-pill-btn.active:hover {
      background: var(--tool-accent-hover, #2563EB) !important;
      color: #FFFFFF !important;
    }

    /* Desktop Two-Pane Popover (480px wide, max-height 60vh) */
    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: transparent;
    }

    .desktop-popover-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 125;
      width: 100%;
      min-width: 100%;
      box-sizing: border-box;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      border-radius: var(--shell-card-radius, 14px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .desktop-popover-panel {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    }

    /* Search Bar */
    .search-header-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .search-header-bar {
      border-bottom-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .sticky-search {
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .search-bar-icon {
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .format-search-input {
      flex: 1;
      min-height: 32px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 13.5px;
    }

    :host-context([data-theme="light"]) .format-search-input {
      color: #0F172A;
    }

    .format-search-input::placeholder {
      color: var(--text-muted, #94a3b8);
    }

    .search-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: none;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    /* Two Pane Body */
    .two-pane-body {
      display: flex;
      flex: 1;
      min-height: 320px;
      max-height: 52vh;
      overflow: hidden;
    }

    .left-category-pane {
      width: 140px;
      flex-shrink: 0;
      border-right: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      scrollbar-width: none; /* Hide scrollbar for compact look */
      -ms-overflow-style: none;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.015));
    }

    .left-category-pane::-webkit-scrollbar {
      display: none;
    }

    :host-context([data-theme="light"]) .left-category-pane {
      border-right-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .category-nav-btn {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 7px 10px;
      min-height: 32px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      font-size: 12.5px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .category-nav-btn:hover {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface, rgba(255, 255, 255, 0.05));
    }

    :host-context([data-theme="light"]) .category-nav-btn:hover {
      color: #0F172A;
      background: #E2E8F0;
    }

    .category-nav-btn.active {
      color: var(--tool-accent, #3B82F6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .category-nav-btn.active {
      color: #1D4ED8;
      background: #DBEAFE;
    }

    /* Right Format Pane */
    .right-format-pane {
      flex: 1;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .right-format-pane.full-width {
      width: 100%;
    }

    .section-label-header {
      padding: 6px 8px 2px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .format-row-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 10px;
      min-height: 42px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      transition: background var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .format-row-btn {
      color: #0F172A;
    }

    .format-row-btn:hover,
    .format-row-btn.focused {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .format-row-btn:hover,
    :host-context([data-theme="light"]) .format-row-btn.focused {
      background: #F1F5F9;
    }

    .format-row-btn.selected {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
    }

    :host-context([data-theme="light"]) .format-row-btn.selected {
      background: #EFF6FF;
    }

    .row-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .row-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .row-name {
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1.2;
    }

    .row-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }

    .row-desc {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .row-check {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
      margin-left: 8px;
    }

    :host-context([data-theme="light"]) .row-check {
      color: #2563EB;
    }

    /* Empty state */
    .empty-search-row {
      padding: 30px 16px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
    }

    /* Footer Note */
    .picker-footer-note {
      padding: 8px 14px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      text-align: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .picker-footer-note {
      border-top-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .qr-cross-link {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      text-decoration: none;
      transition: color var(--ts-dur-fast, 150ms) ease;
    }

    .qr-cross-link:hover {
      color: var(--tool-accent, #3B82F6);
      text-decoration: underline;
    }

    :host-context([data-theme="light"]) .qr-cross-link:hover {
      color: #2563EB;
    }

    /* Phone Bottom Sheet Specifics */
    .phone-sheet-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .phone-category-scroll {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      overflow-x: auto;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
    }

    .category-pill-btn {
      padding: 6px 12px;
      min-height: 32px;
      border-radius: 16px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      background: var(--bg-surface, #1e1e24);
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .category-pill-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .category-pill-btn.active {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-weight: 600;
    }

    .phone-format-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slide-fade-up {
      animation: popoverFadeIn 0.15s ease forwards;
    }

    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class BarcodeFormatPickerComponent implements OnInit, OnDestroy {
  readonly responsive = inject(ResponsiveService);
  private registry = inject(FormatRegistryService);

  readonly value = model<string>('code128');
  readonly variant = model<string>('');
  readonly formatChange = output<string>();

  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<BarcodeCategory>('Popular');
  readonly focusedIndex = signal<number>(-1);

  readonly qrToolUrl = BARCODE_SYSTEM_LIMITS.qrToolUrl;

  readonly categories = computed<BarcodeCategory[]>(() => {
    return this.registry.getCategories();
  });

  readonly currentItem = computed<BarcodeCatalogItem | undefined>(() => {
    return this.registry.getFormat(this.value());
  });

  readonly selectedVariant = computed<string>(() => {
    const item = this.currentItem();
    if (!item?.variants?.length) return '';
    return this.variant() || item.variants[0].id;
  });

  readonly recentFormats = computed<BarcodeCatalogItem[]>(() => {
    return this.registry.getRecent();
  });

  readonly displayedFormats = computed<BarcodeCatalogItem[]>(() => {
    const q = this.searchQuery().trim();
    if (q) {
      return this.registry.search(q);
    }
    return this.registry.getByCategory(this.selectedCategory());
  });

  ngOnInit(): void {
    this.syncFromUrl();
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.onPopStateBound);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopStateBound);
    }
  }

  private onPopStateBound = (event: PopStateEvent) => {
    this.syncFromUrl();
  };

  private syncFromUrl(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    if (lastPart) {
      const match = this.registry.getFormat(lastPart);
      if (match && match.enabled && match.id !== this.value()) {
        this.value.set(match.id);
        this.formatChange.emit(match.id);
      }
    }
  }

  toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.focusedIndex.set(-1);
    // If the current format has a category, select it
    const item = this.currentItem();
    if (item && item.category) {
      this.selectedCategory.set(item.category);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.focusedIndex.set(-1);
  }

  selectFormat(item: BarcodeCatalogItem): void {
    this.value.set(item.id);
    this.formatChange.emit(item.id);
    this.registry.addRecent(item.id);

    if (item.variants && item.variants.length > 0) {
      const firstVariant = item.variants[0].id;
      this.variant.set(firstVariant);
    } else {
      this.variant.set('');
    }

    this.updateUrlSlug(item.slug);
    this.close();
  }

  onSelectVariant(variantId: string): void {
    this.variant.set(variantId);
  }

  private updateUrlSlug(slug: string): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    let newPath = '';
    if (path.includes('/barcode/') || path.includes('/tools/barcode-generator/')) {
      const base = path.includes('/tools/barcode-generator')
        ? '/tools/barcode-generator'
        : '/barcode';
      newPath = `${base}/${slug}`;
    } else {
      newPath = `/${slug}`;
    }

    if (window.location.pathname !== newPath) {
      window.history.pushState({ slug }, '', newPath + window.location.search);
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.open();
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const list = this.displayedFormats();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (this.focusedIndex() + 1) % list.length;
      this.focusedIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = this.focusedIndex() <= 0 ? list.length - 1 : this.focusedIndex() - 1;
      this.focusedIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.focusedIndex();
      if (idx >= 0 && idx < list.length) {
        this.selectFormat(list[idx]);
      } else if (list.length > 0) {
        this.selectFormat(list[0]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  @HostListener('window:keydown.escape')
  onWindowEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
