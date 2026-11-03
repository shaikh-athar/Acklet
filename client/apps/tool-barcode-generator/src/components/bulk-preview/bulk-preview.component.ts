// apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.ts
import {
  Component,
  inject,
  computed,
  signal,
  viewChild,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TsIconComponent, ResponsiveService } from '@acklet/tool-shell';
import { BulkStateService } from '../../services/bulk-state.service';
import { SheetLayoutService, RollLabelModel } from '../../services/sheet-layout.service';
import { PdfBuilderService } from '../../services/pdf-builder.service';
import { BulkGeneratorService } from '../../services/bulk-generator.service';

@Component({
  selector: 'app-barcode-bulk-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bulk-preview-wrapper" [attr.aria-label]="previewAriaLabel()">
      <!-- Preview Header Toolbar -->
      <div class="preview-toolbar">
        <div class="toolbar-title-wrap">
          <span class="toolbar-title">Bulk Preview</span>
          @if (isSheetMode()) {
            <span class="toolbar-badge" [attr.title]="state.currentPreset().name">{{ state.currentPreset().name }}</span>
          } @else if (isRollMode()) {
            <span class="toolbar-badge" [attr.title]="'Roll: ' + state.currentRollPreset().name">Roll: {{ state.currentRollPreset().name }}</span>
          } @else {
            <span class="toolbar-badge">First 6 barcodes</span>
          }
        </div>

        <!-- Header Actions: Zoom Segmented Control, Caption Styling Pill, and Pagination -->
        <div class="toolbar-actions-wrap">
          <!-- Caption Style Pill Button (active when captions exist) -->
          @if (state.hasCaptions()) {
            <button
              type="button"
              class="toolbar-caption-pill"
              [class.is-active]="isCaptionToastOpen()"
              (click)="isCaptionToastOpen.update(v => !v)"
              title="Caption styling toolbar"
              aria-label="Toggle caption formatting popup"
            >
              <ts-icon name="type" [size]="13" />
              <span>Caption Style</span>
              <span class="caption-active-dot"></span>
            </button>
          }

          <!-- Zoom Dropdown for sm/md breakpoints (Finding F4 & Responsive Spec) -->
          <div class="zoom-dropdown-wrap">
            <label for="bulkZoomSelect" class="sr-only">Zoom level</label>
            <select
              id="bulkZoomSelect"
              class="zoom-dropdown-select"
              [value]="state.zoomMode()"
              (change)="onZoomSelectChange($event)"
              aria-label="Preview zoom level"
            >
              <option value="fit">Fit</option>
              <option value="100">100%</option>
              <option value="150">150%</option>
            </select>
          </div>

          <!-- High-Contrast Zoom Segmented Control (Finding F4) -->
          <div class="zoom-segmented-control" role="group" aria-label="Preview zoom level">
            <button
              type="button"
              class="zoom-btn"
              [class.is-active]="state.zoomMode() === 'fit'"
              (click)="setZoom('fit')"
              aria-label="Fit preview to width"
            >
              Fit
            </button>
            <button
              type="button"
              class="zoom-btn"
              [class.is-active]="state.zoomMode() === '100'"
              (click)="setZoom('100')"
              aria-label="Zoom to 100% actual print size"
            >
              100%
            </button>
            <button
              type="button"
              class="zoom-btn"
              [class.is-active]="state.zoomMode() === '150'"
              (click)="setZoom('150')"
              aria-label="Zoom to 150%"
            >
              150%
            </button>
          </div>

          <!-- Pagination for Sheet Mode ONLY (Finding F5: rolls use series strip) -->
          @if (isSheetMode()) {
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="state.previewPage() <= 1"
                (click)="state.prevPage()"
                aria-label="Previous sheet page"
              >
                <ts-icon name="chevron-left" [size]="14" />
              </button>
              <span class="page-indicator">
                Page {{ state.previewPage() }} of {{ state.totalPreviewPages() }}
              </span>
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="state.previewPage() >= state.totalPreviewPages()"
                (click)="state.nextPage()"
                aria-label="Next sheet page"
              >
                <ts-icon name="chevron-right" [size]="14" />
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Caption Styling Toast / Bottom Sheet Popup (Runtime, does not affect barcodes) -->
      @if (state.hasCaptions() && isCaptionToastOpen()) {
        <div class="caption-toast-overlay" (click)="onOverlayClick($event)" role="dialog" aria-label="Caption Formatting">
          <div class="caption-toast-card">
            <div class="sheet-drag-handle" aria-hidden="true"></div>
            <!-- Toast Header -->
            <div class="caption-toast-header">
              <div class="toast-title-row">
                <ts-icon name="type" [size]="13" class="toast-title-icon" />
                <span class="toast-title">Caption Styling</span>
                <span class="toast-live-chip">Live</span>
              </div>
              <div class="toast-actions">
                <button
                  type="button"
                  class="toast-reset-btn"
                  (click)="state.resetCaptionStyle()"
                  title="Reset caption styles"
                >
                  Reset
                </button>
                <button
                  type="button"
                  class="toast-close-btn"
                  (click)="isCaptionToastOpen.set(false)"
                  title="Close popup"
                  aria-label="Close caption formatting popup"
                >
                  <ts-icon name="x" [size]="12" />
                </button>
              </div>
            </div>

            <!-- Toast Body -->
            <div class="caption-toast-body">
              <!-- Size Control: Dropdown on xs mobile, pill buttons on larger -->
              <div class="toast-field-row">
                <span class="toast-field-label">Size</span>
                @if (responsive.isXs()) {
                  <select
                    class="toast-size-select"
                    [ngModel]="state.captionFontSizePt()"
                    (ngModelChange)="state.captionFontSizePt.set($event)"
                    aria-label="Caption font size"
                  >
                    @for (s of fontSizes; track s.id) {
                      <option [ngValue]="s.value">{{ s.label }}</option>
                    }
                  </select>
                } @else {
                  <div class="toast-size-group">
                    @for (s of fontSizes; track s.id) {
                      <button
                        type="button"
                        class="toast-pill-btn"
                        [class.is-active]="state.captionFontSizePt() === s.value"
                        (click)="state.captionFontSizePt.set(s.value)"
                      >
                        {{ s.label }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Color Palette -->
              <div class="toast-field-row">
                <span class="toast-field-label">Color</span>
                <div class="toast-colors-row">
                  @for (c of colorPresets; track c.color) {
                    <button
                      type="button"
                      class="color-dot-btn"
                      [class.is-active]="state.captionColor() === c.color"
                      [style.background-color]="c.color"
                      [title]="c.name"
                      (click)="state.captionColor.set(c.color)"
                    >
                      @if (state.captionColor() === c.color) {
                        <ts-icon name="check" [size]="9" [style.color]="c.checkColor" />
                      }
                    </button>
                  }
                  <label class="custom-color-btn" title="Choose custom color">
                    <input
                      type="color"
                      class="hidden-color-input"
                      [value]="state.captionColor()"
                      (input)="onCustomColorChange($event)"
                    />
                    <ts-icon name="palette" [size]="11" />
                  </label>
                </div>
              </div>

              <!-- Format (Bold, Mono, Case, Alignment) -->
              <div class="toast-field-row">
                <span class="toast-field-label">Style</span>
                <div class="toast-format-row">
                  <button
                    type="button"
                    class="toast-pill-btn is-icon"
                    [class.is-active]="state.captionBold()"
                    (click)="state.captionBold.update(b => !b)"
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>

                  <button
                    type="button"
                    class="toast-pill-btn"
                    [class.is-active]="state.captionFontFamily() === 'mono'"
                    (click)="toggleFontFamily()"
                    title="Monospace"
                  >
                    Mono
                  </button>

                  <button
                    type="button"
                    class="toast-pill-btn"
                    [class.is-active]="state.captionTransform() === 'uppercase'"
                    (click)="toggleTransform()"
                    title="UPPERCASE"
                  >
                    AA
                  </button>

                  <div class="toast-sep"></div>

                  <div class="toast-align-group">
                    <button
                      type="button"
                      class="toast-align-btn"
                      [class.is-active]="state.captionAlign() === 'left'"
                      (click)="state.captionAlign.set('left')"
                      title="Align Left"
                    >
                      L
                    </button>
                    <button
                      type="button"
                      class="toast-align-btn"
                      [class.is-active]="state.captionAlign() === 'center'"
                      (click)="state.captionAlign.set('center')"
                      title="Align Center"
                    >
                      C
                    </button>
                    <button
                      type="button"
                      class="toast-align-btn"
                      [class.is-active]="state.captionAlign() === 'right'"
                      (click)="state.captionAlign.set('right')"
                      title="Align Right"
                    >
                      R
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Toast Footer Note -->
            <div class="caption-toast-footer">
              <span>Instant preview • Barcodes not affected</span>
            </div>
          </div>
        </div>
      }

      <!-- Roll Series Meta Strip (Finding F5: shown outside label cards) -->
      @if (isRollMode() && state.activeValidRecords().length > 0) {
        <div class="roll-series-meta-bar">
          <div class="roll-specs-text">
            <span class="roll-specs-count">{{ state.activeValidRecords().length }} labels on roll</span>
            <span class="roll-specs-dims">({{ state.currentRollPreset().widthMm }} × {{ state.currentRollPreset().heightMm }} mm · 203 / 300 DPI)</span>
          </div>
          <div class="roll-tracker-wrap">
            <span class="roll-tracker-text">Label {{ rollCurrentIndex() }} of {{ state.activeValidRecords().length }}</span>
            <div class="roll-jump-wrap">
              <label for="rollJumpInput" class="sr-only">Jump to label number</label>
              <input
                id="rollJumpInput"
                type="number"
                class="roll-jump-input"
                [value]="rollCurrentIndex()"
                min="1"
                [max]="state.activeValidRecords().length"
                (change)="onJumpToRollLabel($event)"
                title="Jump to label number"
              />
            </div>
          </div>
        </div>
      }

      <!-- Preview Canvas Area -->
      <div
        class="preview-canvas-area custom-scrollbar"
        #scrollContainer
        (scroll)="onCanvasScroll()"
      >
        <!-- 1. Print Sheet Mode Preview (Single Page Model SVG) -->
        @if (isSheetMode()) {
          <div class="sheet-viewport-container">
            @if (state.activeValidRecords().length === 0) {
              <!-- Finding F9: clean empty state with guidance and file gather prompt -->
              <div
                class="empty-preview-placeholder is-drop-target"
                (click)="sheetFileInput.click()"
                (keydown.enter)="sheetFileInput.click()"
                (keydown.space)="sheetFileInput.click()"
                tabindex="0"
                role="button"
                aria-label="Upload CSV or TSV file to populate preview"
              >
                <input
                  #sheetFileInput
                  type="file"
                  accept=".csv,.tsv,.txt"
                  class="hidden-file-input"
                  (change)="onPreviewFileSelected($event)"
                />
                <ts-icon name="upload-cloud" [size]="40" class="empty-icon" />
                <span class="empty-title">Sheet preview</span>
                <span class="empty-desc">Drop a CSV, TSV or text file anywhere, or click to upload.</span>
                <span class="empty-action-badge">Upload CSV / TSV</span>
              </div>
            } @else {
              @if (!state.isGenerated()) {
                <div class="un-generated-banner" role="status">
                  <ts-icon name="layers" [size]="15" />
                  <span>Click Generate in the left panel to create barcodes</span>
                </div>
              }

              <div
                class="sheet-svg-wrapper"
                [style.width]="sheetZoomWidthStyle()"
                [style.max-width]="state.zoomMode() === 'fit' ? '100%' : 'none'"
              >
                @if (currentSheetSvg(); as sheetSvg) {
                  <div class="sheet-svg-host" [innerHTML]="sheetSvg"></div>
                }
              </div>

              <div class="print-actual-size-notice">
                <ts-icon name="info" [size]="13" />
                <span>Print at 100%, actual size. Do not use Fit to page.</span>
              </div>
            }
          </div>
        }

        <!-- 2. Label Roll Mode Preview (Continuous Vertical Series) (Finding F5) -->
        @if (isRollMode()) {
          <div class="roll-viewport-container">
            @if (state.activeValidRecords().length === 0) {
              <div
                class="empty-preview-placeholder is-drop-target"
                (click)="rollFileInput.click()"
                (keydown.enter)="rollFileInput.click()"
                (keydown.space)="rollFileInput.click()"
                tabindex="0"
                role="button"
                aria-label="Upload CSV or TSV file to populate roll preview"
              >
                <input
                  #rollFileInput
                  type="file"
                  accept=".csv,.tsv,.txt"
                  class="hidden-file-input"
                  (change)="onPreviewFileSelected($event)"
                />
                <ts-icon name="upload-cloud" [size]="40" class="empty-icon" />
                <span class="empty-title">Roll preview</span>
                <span class="empty-desc">Drop a CSV, TSV or text file anywhere, or click to upload.</span>
                <span class="empty-action-badge">Upload CSV / TSV</span>
              </div>
            } @else {
              @if (!state.isGenerated()) {
                <div class="un-generated-banner" role="status">
                  <ts-icon name="layers" [size]="15" />
                  <span>Click Generate in the left panel to create barcodes</span>
                </div>
              }

              <div
                class="roll-series-strip"
                [style.width]="rollZoomWidthStyle()"
                [style.max-width]="state.zoomMode() === 'fit' ? '100%' : 'none'"
              >
                @for (item of rollLabelsWithSvg(); track item.model.index) {
                  <div
                    class="roll-series-item"
                    [attr.data-label-index]="item.model.index"
                    [id]="'roll-label-' + item.model.index"
                  >
                    <!-- Row number and module dimension outside label card -->
                    <div class="roll-item-header">
                      <span class="roll-item-num">#{{ item.model.index }}</span>
                      @if (item.model.effectiveXmm) {
                        <span class="roll-item-x">{{ item.model.effectiveXmm.toFixed(2) }} mm module</span>
                      }
                      @if (item.model.isReducedHeight) {
                        <span class="roll-item-tag">truncated height</span>
                      }
                    </div>

                    <!-- Label Card drawn at exact aspect ratio -->
                    <div
                      class="roll-series-card"
                      [style.aspect-ratio]="item.model.widthMm + ' / ' + item.model.heightMm"
                    >
                      @if (item.safeSvg) {
                        <div class="roll-label-svg-host" [innerHTML]="item.safeSvg"></div>
                      } @else {
                        <div class="roll-empty-state">
                          <ts-icon name="barcode" [size]="24" />
                          <span>{{ item.model.value }}</span>
                        </div>
                      }
                    </div>

                    <!-- Cut mark between labels in roll series -->
                    @if (item.model.index < state.activeValidRecords().length) {
                      <div class="roll-cut-separator" aria-hidden="true">
                        <span class="cut-dash"></span>
                        <span class="cut-icon">✂</span>
                        <span class="cut-dash"></span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- 3. ZIP Archive / Grid Preview -->
        @if (isZipMode()) {
          <div class="zip-grid-container">
            @if (!state.isGenerated() && state.activeValidRecords().length > 0) {
              <div class="un-generated-banner zip-banner" role="status">
                <ts-icon name="layers" [size]="15" />
                <span>Click Generate in the left panel to create barcodes</span>
              </div>
            }

            @for (item of zipPreviewItems(); track item.index) {
              <div class="zip-item-card">
                <div class="zip-card-svg-wrap">
                  @if (item.safeSvg) {
                    <div class="zip-svg-host" [innerHTML]="item.safeSvg"></div>
                  } @else {
                    <div class="zip-card-fallback">
                      <ts-icon name="barcode" [size]="24" />
                    </div>
                  }
                </div>
                <div class="zip-card-footer">
                  <span class="zip-card-filename">{{ item.fileName }}</span>
                  <span class="zip-card-val">{{ item.value }}</span>
                </div>
              </div>
            }

            @if (zipPreviewItems().length === 0) {
              <div class="zip-empty-banner">
                <ts-icon name="layers" [size]="24" />
                <span>Enter valid barcode data in the left panel to preview outputs.</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Bottom Action Bar (Finding F8: Print & Download actions) -->
      <div class="preview-action-bar" (click)="closeDropdownIfOutside($event)">
        <div class="action-summary-col">
          <div class="summary-status-row">
            <span class="action-summary-text">{{ actionSummaryText() }}</span>
            @if (state.verificationSummary(); as vs) {
              @if (vs.failed === 0) {
                <span class="verification-badge is-verified">
                  <ts-icon name="check" [size]="12" />
                  <span>{{ vs.verified }} of {{ vs.total }} verified</span>
                </span>
              } @else {
                <span class="verification-badge is-warning">
                  <ts-icon name="circle-alert" [size]="12" />
                  <span>{{ vs.verified }} of {{ vs.total }} verified, {{ vs.failed }} failed</span>
                </span>
              }
            }
          </div>
          @if (hasFitWarning()) {
            <span class="fit-warning-chip">{{ fitWarningText() }}</span>
          }
        </div>

        <div class="action-buttons-group">
          <!-- If verification failures, offer Download verified only -->
          @if (hasVerificationFailures()) {
            <button
              type="button"
              class="action-btn is-outline is-warn"
              [disabled]="isActionDisabled()"
              (click)="onDownloadVerifiedOnly()"
              title="Download only barcodes that passed decoder verification"
            >
              <ts-icon name="download" [size]="14" />
              <span>Download verified only</span>
            </button>
          }

          <!-- Print Button (Hidden iframe print, Finding F3) -->
          @if (isSheetMode() || isRollMode()) {
            <button
              type="button"
              class="action-btn is-outline"
              [disabled]="isActionDisabled()"
              (click)="onPrint()"
              [title]="actionButtonTooltip('Print only the labels (actual size, no browser headers/footers)')"
            >
              <ts-icon name="printer" [size]="14" />
              <span>Print</span>
            </button>
          }

          <!-- Primary Download Button -->
          <button
            type="button"
            class="action-btn is-primary"
            [disabled]="isActionDisabled()"
            (click)="onDownload()"
            [title]="actionButtonTooltip('Download generated barcodes')"
          >
            <ts-icon name="download" [size]="14" />
            <span class="download-label-full">Download {{ state.activeValidRecords().length }} barcodes</span>
            <span class="download-label-short">Download ({{ state.activeValidRecords().length }})</span>
          </button>

          <!-- More Options Dropdown -->
          <div class="more-menu-wrapper">
            <button
              type="button"
              class="action-btn is-more"
              [disabled]="isActionDisabled()"
              (click)="toggleMoreMenu($event)"
              aria-label="More export options"
            >
              <ts-icon name="ellipsis" [size]="14" />
            </button>

            @if (isMoreMenuOpen()) {
              <div class="more-dropdown-panel" role="menu">
                @if (isSheetMode()) {
                  <button
                    type="button"
                    class="dropdown-menu-item"
                    role="menuitem"
                    (click)="onPrintAlignment()"
                  >
                    <ts-icon name="crosshair" [size]="13" />
                    <span>Print alignment test sheet</span>
                  </button>
                }

                <button
                  type="button"
                  class="dropdown-menu-item"
                  role="menuitem"
                  (click)="onExportManifest()"
                >
                  <ts-icon name="file-text" [size]="13" />
                  <span>Export manifest (CSV)</span>
                </button>

                @if (hasErrors()) {
                  <button
                    type="button"
                    class="dropdown-menu-item is-warn"
                    role="menuitem"
                    (click)="onExportErrorReport()"
                  >
                    <ts-icon name="circle-alert" [size]="13" />
                    <span>Export error report (CSV)</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .bulk-preview-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 520px;
      background: var(--bg-surface, #1e1e24);
      border-radius: var(--shell-card-radius, 14px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .bulk-preview-wrapper {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    /* Un-generated guide banner */
    .un-generated-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: 8px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.05));
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.18));
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 14px;
    }

    .un-generated-banner.zip-banner {
      grid-column: 1 / -1;
    }

    :host-context([data-theme="light"]) .un-generated-banner {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #475569;
    }

    .summary-status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .verification-badge.is-verified {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    :host-context([data-theme="light"]) .verification-badge.is-verified {
      background: #ECFDF5;
      color: #065F46;
      border-color: #A7F3D0;
    }

    .verification-badge.is-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    :host-context([data-theme="light"]) .verification-badge.is-warning {
      background: #FFFBEB;
      color: #92400E;
      border-color: #FDE68A;
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* TOOLBAR                                                         */
    /* ══════════════════════════════════════════════════════════════ */
    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .preview-toolbar {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .toolbar-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .toolbar-title {
      color: #0F172A;
    }

    .toolbar-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .toolbar-badge {
      background: #E2E8F0;
      color: #475569;
    }

    .toolbar-actions-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .toolbar-caption-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      height: 32px;
      font-size: 11.5px;
      font-weight: 600;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      background: var(--bg-base, rgba(0, 0, 0, 0.2));
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toolbar-caption-pill:hover:not(.is-active) {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
    }

    .toolbar-caption-pill.is-active {
      background: rgba(37, 99, 235, 0.18);
      border-color: rgba(56, 189, 248, 0.6);
      color: #38BDF8;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .toolbar-caption-pill.is-active:hover {
      background: rgba(37, 99, 235, 0.28);
      border-color: #38BDF8;
      color: #7DD3FC;
    }

    :host-context([data-theme="light"]) .toolbar-caption-pill {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #475569;
    }

    :host-context([data-theme="light"]) .toolbar-caption-pill:hover:not(.is-active) {
      background: #F1F5F9;
      color: #0F172A;
      border-color: #94A3B8;
    }

    :host-context([data-theme="light"]) .toolbar-caption-pill.is-active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #1D4ED8;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.15);
    }

    :host-context([data-theme="light"]) .toolbar-caption-pill.is-active:hover {
      background: #DBEAFE;
      border-color: #1D4ED8;
      color: #1E40AF;
    }

    .caption-active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tool-accent, #2563EB);
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* CAPTION STYLING TOAST POPUP (Runtime)                          */
    /* ══════════════════════════════════════════════════════════════ */
    .caption-toast-overlay {
      position: absolute;
      top: 54px;
      right: 16px;
      z-index: 40;
      pointer-events: auto;
      animation: toastFadeIn 0.15s ease-out;
    }

    @keyframes toastFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .caption-toast-card {
      width: 320px;
      background: #18191E;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    :host-context([data-theme="light"]) .caption-toast-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
    }

    .caption-toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .caption-toast-header {
      border-color: #F1F5F9;
    }

    .toast-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toast-title-icon {
      color: #38BDF8;
    }

    :host-context([data-theme="light"]) .toast-title-icon {
      color: #0284C7;
    }

    .toast-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #FCFCFC);
    }

    :host-context([data-theme="light"]) .toast-title {
      color: #0F172A;
    }

    .toast-live-chip {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    :host-context([data-theme="light"]) .toast-live-chip {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .toast-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toast-reset-btn {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .toast-reset-btn:hover {
      color: var(--text, #FCFCFC);
      border-color: rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .toast-reset-btn {
      border-color: #CBD5E1;
      color: #475569;
      background: #FFFFFF;
    }

    :host-context([data-theme="light"]) .toast-reset-btn:hover {
      color: #0F172A;
      border-color: #94A3B8;
      background: #F1F5F9;
    }

    .toast-close-btn {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .toast-close-btn:hover {
      color: var(--text, #FCFCFC);
      background: rgba(255, 255, 255, 0.1);
    }

    :host-context([data-theme="light"]) .toast-close-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .toast-close-btn:hover {
      color: #0F172A;
      background: #E2E8F0;
    }

    .caption-toast-body {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .toast-field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .toast-field-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94A3B8);
      min-width: 42px;
    }

    :host-context([data-theme="light"]) .toast-field-label {
      color: #64748B;
    }

    .toast-size-group {
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--bg-base, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 2px;
    }

    :host-context([data-theme="light"]) .toast-size-group {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .toast-pill-btn {
      height: 22px;
      padding: 0 7px;
      font-size: 10.5px;
      font-weight: 600;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
      white-space: nowrap;
    }

    .toast-pill-btn strong {
      color: inherit;
      font-weight: 800;
    }

    .toast-pill-btn:hover:not(.is-active) {
      color: var(--text, #FCFCFC);
      background: rgba(255, 255, 255, 0.09);
    }

    .toast-pill-btn.is-active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    .toast-pill-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
    }

    :host-context([data-theme="light"]) .toast-pill-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .toast-pill-btn:hover:not(.is-active) {
      color: #0F172A;
      background: #E2E8F0;
    }

    :host-context([data-theme="light"]) .toast-pill-btn.is-active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
    }

    :host-context([data-theme="light"]) .toast-pill-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .toast-pill-btn.is-active:hover {
      background: #1D4ED8;
      color: #FFFFFF !important;
    }

    .toast-pill-btn.is-icon {
      min-width: 22px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .toast-colors-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-dot-btn {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: transform 0.12s ease, box-shadow 0.12s ease, outline 0.12s ease;
    }

    .color-dot-btn:hover {
      transform: scale(1.18);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }

    .color-dot-btn.is-active {
      outline: 2px solid #38BDF8;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
    }

    :host-context([data-theme="light"]) .color-dot-btn {
      border-color: rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .color-dot-btn.is-active {
      outline: 2px solid #2563EB;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    }

    .custom-color-btn {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed rgba(255, 255, 255, 0.3);
      cursor: pointer;
      position: relative;
      color: var(--text-muted, #94A3B8);
      transition: all 0.12s ease;
    }

    .custom-color-btn:hover {
      border-color: #38BDF8;
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.12);
      transform: scale(1.12);
    }

    :host-context([data-theme="light"]) .custom-color-btn {
      border-color: #CBD5E1;
      color: #64748B;
    }

    :host-context([data-theme="light"]) .custom-color-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
      background: #EFF6FF;
      transform: scale(1.12);
    }

    .hidden-color-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .toast-format-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toast-sep {
      width: 1px;
      height: 14px;
      background: rgba(255, 255, 255, 0.12);
      margin: 0 2px;
    }

    :host-context([data-theme="light"]) .toast-sep {
      background: #CBD5E1;
    }

    .toast-align-group {
      display: flex;
      align-items: center;
      background: var(--bg-base, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 2px;
      gap: 1px;
    }

    :host-context([data-theme="light"]) .toast-align-group {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .toast-align-btn {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
    }

    .toast-align-btn:hover:not(.is-active) {
      color: var(--text, #FCFCFC);
      background: rgba(255, 255, 255, 0.09);
    }

    .toast-align-btn.is-active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
    }

    .toast-align-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.35);
    }

    :host-context([data-theme="light"]) .toast-align-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .toast-align-btn:hover:not(.is-active) {
      color: #0F172A;
      background: #E2E8F0;
    }

    :host-context([data-theme="light"]) .toast-align-btn.is-active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.3);
    }

    :host-context([data-theme="light"]) .toast-align-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
    }

    .caption-toast-footer {
      font-size: 10px;
      color: var(--text-muted, #64748B);
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      text-align: center;
    }

    :host-context([data-theme="light"]) .caption-toast-footer {
      border-color: #F1F5F9;
      color: #94A3B8;
    }

    /* Zoom Dropdown Control (for sm/md breakpoints) */
    .zoom-dropdown-wrap {
      display: none;
      align-items: center;
    }

    .zoom-dropdown-select {
      height: 32px;
      padding: 0 8px;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: var(--bg-surface, #1e1e24);
      color: var(--text, #fcfcfc);
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    :host-context([data-theme="light"]) .zoom-dropdown-select {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .zoom-dropdown-select:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    @media (max-width: 1023px) {
      .zoom-dropdown-wrap {
        display: inline-flex !important;
      }
      .zoom-segmented-control {
        display: none !important;
      }
    }

    /* High Contrast Zoom Segmented Control (Finding F4) */
    .zoom-segmented-control {
      display: inline-flex;
      align-items: center;
      padding: 2px;
      background: var(--bg-base, rgba(0, 0, 0, 0.3));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .zoom-segmented-control {
      background: #EDF2F7;
      border-color: #CBD5E1;
    }

    .zoom-btn {
      min-width: 44px;
      min-height: 32px;
      padding: 0 10px;
      font-size: 11.5px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease, transform 0.05s ease;
    }

    :host-context([data-theme="light"]) .zoom-btn {
      color: #475569;
    }

    .zoom-btn:hover:not(.is-active) {
      color: var(--text, #fcfcfc);
      background: rgba(255, 255, 255, 0.06);
    }

    :host-context([data-theme="light"]) .zoom-btn:hover:not(.is-active) {
      color: #0F172A;
      background: rgba(0, 0, 0, 0.05);
    }

    .zoom-btn.is-active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    .zoom-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .zoom-btn.is-active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .zoom-btn.is-active:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    :host-context([data-theme="light"]) .page-nav-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .page-nav-btn:hover:not(:disabled) {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
    }

    .page-nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .page-indicator {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      min-width: 70px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .page-indicator {
      color: #475569;
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* ROLL SERIES META STRIP (Finding F5)                             */
    /* ══════════════════════════════════════════════════════════════ */
    .roll-series-meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 16px;
      background: var(--bg-base, #121216);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .roll-series-meta-bar {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .roll-specs-text {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
    }

    .roll-specs-count {
      font-weight: 700;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .roll-specs-count {
      color: #0F172A;
    }

    .roll-specs-dims {
      color: var(--text-muted, #94a3b8);
      font-family: var(--ts-font-mono, monospace);
    }

    :host-context([data-theme="light"]) .roll-specs-dims {
      color: #64748B;
    }

    .roll-tracker-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .roll-tracker-text {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .roll-tracker-text {
      color: #0F172A;
    }

    .roll-jump-wrap {
      display: flex;
      align-items: center;
    }

    .roll-jump-input {
      width: 44px;
      height: 26px;
      padding: 0 4px;
      font-size: 11.5px;
      font-weight: 600;
      text-align: center;
      border-radius: 5px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: var(--bg-surface, #1e1e24);
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .roll-jump-input {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* CANVAS AREA                                                     */
    /* ══════════════════════════════════════════════════════════════ */
    .preview-canvas-area {
      flex: 1;
      overflow: auto;
      padding: 20px;
      background: var(--bg-base, #121216);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    :host-context([data-theme="light"]) .preview-canvas-area {
      background: #F8FAFC;
    }

    .empty-preview-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 8px;
      padding: 60px 24px;
      color: var(--text-muted, #94a3b8);
      max-width: 360px;
      margin: auto;
    }

    .empty-preview-placeholder.is-drop-target {
      cursor: pointer;
      border-radius: 14px;
      padding: 44px 28px;
      border: 1.5px dashed var(--border, rgba(255, 255, 255, 0.15));
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.02));
      transition: all 0.2s ease;
      outline: none;
    }

    .empty-preview-placeholder.is-drop-target:hover,
    .empty-preview-placeholder.is-drop-target:focus-visible {
      border-color: var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.06);
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .empty-preview-placeholder.is-drop-target {
      border-color: rgba(0, 0, 0, 0.14);
      background: rgba(0, 0, 0, 0.02);
    }

    :host-context([data-theme="light"]) .empty-preview-placeholder.is-drop-target:hover,
    :host-context([data-theme="light"]) .empty-preview-placeholder.is-drop-target:focus-visible {
      border-color: #2563EB;
      background: #EFF6FF;
    }

    .empty-action-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      transition: background 0.15s ease;
    }

    :host-context([data-theme="light"]) .empty-action-badge {
      background: #2563EB;
      color: #FFFFFF;
    }

    .empty-action-badge:hover {
      background: var(--tool-accent-hover, #2563EB);
    }

    .hidden-file-input {
      display: none;
    }

    .empty-icon {
      opacity: 0.4;
      margin-bottom: 4px;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .empty-title {
      color: #0F172A;
    }

    .empty-desc {
      font-size: 12px;
      line-height: 1.5;
    }

    /* 1. Sheet Viewport */
    .sheet-viewport-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      height :100%
      gap: 14px;
    }

    .sheet-svg-wrapper {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: hidden;
      background: #FFFFFF;
      transition: width 0.15s ease;
    }

    :host-context([data-theme="light"]) .sheet-svg-wrapper {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    }

    .sheet-svg-host {
      width: 100%;
      display: block;
      line-height: 0;
    }

    .sheet-svg-host ::ng-deep svg {
      width: 100%;
      height: auto;
      display: block;
    }

    .print-actual-size-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .print-actual-size-notice {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* 2. Roll Viewport (Continuous Vertical Series) (Finding F5) */
    .roll-viewport-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .roll-series-strip {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: width 0.15s ease;
    }

    .roll-series-item {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 4px;
    }

    .roll-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
    }

    .roll-item-num {
      font-size: 11px;
      font-weight: 700;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .roll-item-num {
      color: #475569;
    }

    .roll-item-x {
      font-size: 10.5px;
      color: var(--text-muted, #64748b);
      font-family: var(--ts-font-mono, monospace);
    }

    .roll-item-tag {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
      font-weight: 600;
    }

    .roll-series-card {
      width: 100%;
      background: #FFFFFF;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    :host-context([data-theme="light"]) .roll-series-card {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      border: 1px solid #E2E8F0;
    }

    .roll-label-svg-host {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    .roll-label-svg-host ::ng-deep svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .roll-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #94A3B8;
      font-size: 11px;
    }

    .roll-cut-separator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 4px 0;
      color: var(--text-muted, #64748b);
      opacity: 0.6;
    }

    .cut-dash {
      flex: 1;
      height: 1px;
      border-top: 1px dashed var(--border, rgba(255, 255, 255, 0.15));
    }

    :host-context([data-theme="light"]) .cut-dash {
      border-color: #CBD5E1;
    }

    .cut-icon {
      font-size: 10px;
      transform: rotate(90deg);
    }

    /* 3. ZIP Archive Grid Preview */
    .zip-grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      width: 100%;
    }

    .zip-item-card {
      display: flex;
      flex-direction: column;
      background: var(--bg-surface, #1e1e24);
      border-radius: var(--shell-card-radius, 10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .zip-item-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .zip-card-svg-wrap {
      padding: 16px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90px;
    }

    .zip-svg-host {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .zip-svg-host ::ng-deep svg {
      width: 100%;
      height: auto;
      max-height: 80px;
      display: block;
    }

    .zip-card-footer {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.03));
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .zip-card-footer {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .zip-card-filename {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .zip-card-filename {
      color: #0F172A;
    }

    .zip-card-val {
      font-size: 10.5px;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .zip-empty-banner {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* BOTTOM ACTION BAR (Finding F8)                                  */
    /* ══════════════════════════════════════════════════════════════ */
    .preview-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-surface, #1e1e24);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .preview-action-bar {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .action-summary-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .action-summary-text {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .action-summary-text {
      color: #0F172A;
    }

    .fit-warning-chip {
      font-size: 11px;
      color: #F59E0B;
      font-weight: 600;
    }

    .action-buttons-group {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 14px;
      font-size: 12.5px;
      font-weight: 600;
      border-radius: var(--shell-card-radius, 8px);
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
      border: none;
      white-space: nowrap;
    }

    .action-btn.is-outline {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .action-btn.is-outline {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .action-btn.is-outline:hover:not(:disabled) {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.1));
    }

    .action-btn.is-primary {
      background: var(--accent-primary, #2563eb);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .action-btn.is-primary {
      background: #2563EB;
      color: #FFFFFF;
    }

    .action-btn.is-primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .action-btn.is-more {
      min-width: 36px;
      padding: 0;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .action-btn.is-more {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* More dropdown panel */
    .more-menu-wrapper {
      position: relative;
    }

    .more-dropdown-panel {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      min-width: 220px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: var(--shell-card-radius, 8px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      padding: 4px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .more-dropdown-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .dropdown-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text, #fcfcfc);
      background: transparent;
      border: none;
      border-radius: var(--shell-card-radius, 5px);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
    }

    :host-context([data-theme="light"]) .dropdown-menu-item {
      color: #1E293B;
    }

    .dropdown-menu-item:hover:not(:disabled) {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .dropdown-menu-item:hover:not(:disabled) {
      background: #F1F5F9;
    }

    .dropdown-menu-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dropdown-menu-item.is-warn {
      color: #EF4444;
    }

    /* Focus rings & accessibility */
    .zoom-btn:focus-visible,
    .page-nav-btn:focus-visible,
    .toolbar-caption-pill:focus-visible,
    .action-btn:focus-visible,
    .dropdown-menu-item:focus-visible,
    .roll-jump-input:focus-visible,
    .toast-pill-btn:focus-visible,
    .toast-align-btn:focus-visible,
    .toast-reset-btn:focus-visible,
    .toast-close-btn:focus-visible,
    .color-dot-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    .download-label-full {
      display: inline;
    }

    .download-label-short {
      display: none;
    }

    /* Small breakpoint (0 - 639px) adjustments */
    @media (max-width: 639px) {
      .preview-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 10px 12px;
      }

      .toolbar-title-wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .toolbar-actions-wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 8px;
      }

      .preview-action-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px 14px;
      }

      .action-summary-col {
        align-items: center;
        text-align: center;
      }

      .summary-status-row {
        justify-content: center;
      }

      .action-buttons-group {
        width: 100%;
        display: flex;
        gap: 8px;
      }

      .action-buttons-group .action-btn.is-primary {
        flex: 1 1 auto;
      }

      .download-label-full {
        display: none !important;
      }

      .download-label-short {
        display: inline !important;
      }

      .action-btn {
        min-height: 44px;
      }

      .page-nav-btn {
        min-width: 44px;
        min-height: 44px;
      }

      .toolbar-caption-pill {
        min-height: 40px;
        padding: 0 12px;
      }

      .zoom-dropdown-select {
        min-height: 44px;
      }

      .preview-canvas-area {
        padding: 12px;
        max-width: 100%;
        overflow-x: auto;
      }

      .caption-toast-overlay {
        position: fixed;
        inset: 0;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        animation: toastSheetUp 0.15s ease-out;
      }

      @keyframes toastSheetUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .caption-toast-card {
        width: 100%;
        max-width: 500px;
        border-radius: 18px 18px 0 0;
        border-bottom: none;
        border-left: none;
        border-right: none;
        padding: 14px 18px calc(16px + env(safe-area-inset-bottom, 0px)) 18px;
        box-shadow: 0 -10px 35px rgba(0, 0, 0, 0.45);
        max-height: 80vh;
        overflow-y: auto;
        box-sizing: border-box;
      }

      .sheet-drag-handle {
        display: block;
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.25);
        margin: 0 auto 10px auto;
        flex-shrink: 0;
      }

      :host-context([data-theme="light"]) .sheet-drag-handle {
        background: rgba(0, 0, 0, 0.2);
      }

      .toast-reset-btn {
        white-space: nowrap !important;
        min-width: 64px !important;
        min-height: 32px !important;
        text-align: center;
      }

      .toast-close-btn {
        min-width: 32px !important;
        min-height: 32px !important;
      }

      .toast-size-select {
        width: 100%;
        min-height: 40px;
        padding: 0 10px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 8px;
        background: var(--bg-surface, #1e1e24);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
        color: var(--text, #fcfcfc);
      }

      :host-context([data-theme="light"]) .toast-size-select {
        background: #FFFFFF;
        border-color: #CBD5E1;
        color: #0F172A;
      }
    }

    @media (max-width: 399px) {
      .toolbar-title {
        white-space: nowrap;
        font-size: 13px;
      }
      .toolbar-badge {
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .zoom-dropdown-wrap {
        display: flex !important;
      }
      .zoom-segmented-control {
        display: none !important;
      }
      .toast-format-row {
        flex-wrap: wrap;
        gap: 8px;
      }
      .toast-sep {
        display: none;
      }
      .toast-align-group {
        width: 100%;
        justify-content: space-around;
      }
      .toast-align-btn {
        flex: 1;
        min-height: 28px;
      }
      .color-dot-btn {
        width: 34px !important;
        height: 34px !important;
      }
      .custom-color-btn {
        width: 34px !important;
        height: 34px !important;
      }
      .toast-colors-row {
        gap: 8px !important;
      }
      .fit-warning-chip {
        font-size: 11px;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .preview-action-bar {
        padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px;
      }
      .action-btn.is-outline {
        padding: 0 10px;
      }
      .action-btn.is-primary {
        padding: 0 10px;
      }
      .action-btn.is-more {
        flex: 0 0 44px;
        min-width: 44px;
      }
    }
  `]
})
export class BarcodeBulkPreviewComponent {
  readonly responsive = inject(ResponsiveService);
  readonly state = inject(BulkStateService);
  private sheetLayout = inject(SheetLayoutService);
  private pdfBuilder = inject(PdfBuilderService);
  private bulkService = inject(BulkGeneratorService);
  private sanitizer = inject(DomSanitizer);

  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  readonly isMoreMenuOpen = signal<boolean>(false);
  readonly rollCurrentIndex = signal<number>(1);
  readonly isCaptionToastOpen = signal<boolean>(true);

  readonly fontSizes: Array<{ id: string; label: string; value: number | 'auto' }> = [
    { id: 'auto', label: 'Auto', value: 'auto' },
    { id: '6pt', label: '6 pt', value: 6 },
    { id: '7pt', label: '7 pt', value: 7 },
    { id: '8pt', label: '8 pt', value: 8 },
    { id: '9pt', label: '9 pt', value: 9 },
    { id: '10pt', label: '10 pt', value: 10 }
  ];

  readonly colorPresets = [
    { name: 'Slate', color: '#334155', checkColor: '#FFFFFF' },
    { name: 'Black', color: '#000000', checkColor: '#FFFFFF' },
    { name: 'Muted', color: '#64748B', checkColor: '#FFFFFF' },
    { name: 'Sapphire', color: '#0284C7', checkColor: '#FFFFFF' },
    { name: 'Crimson', color: '#DC2626', checkColor: '#FFFFFF' }
  ];

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.isCaptionToastOpen.set(false);
    }
  }

  toggleFontFamily(): void {
    this.state.captionFontFamily.update(f => (f === 'mono' ? 'sans' : 'mono'));
  }

  toggleTransform(): void {
    this.state.captionTransform.update(t => (t === 'uppercase' ? 'none' : 'uppercase'));
  }

  onCustomColorChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.state.captionColor.set(val);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.isSheetMode()) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.state.prevPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.state.nextPage();
      }
    }
  }

  readonly isSheetMode = computed<boolean>(() => {
    const o = this.state.outputType();
    return o === 'print-sheet' || o === 'sheet-png' || o === 'pdf-labels';
  });

  readonly isRollMode = computed<boolean>(() => {
    return this.state.outputType() === 'label-roll';
  });

  readonly isZipMode = computed<boolean>(() => {
    const o = this.state.outputType();
    return o === 'zip-png' || o === 'zip-svg';
  });

  readonly previewAriaLabel = computed<string>(() => {
    if (this.isSheetMode()) {
      return `Page ${this.state.previewPage()} of ${this.state.totalPreviewPages()}, ${this.state.labelsPerPage()} labels`;
    } else if (this.isRollMode()) {
      return `Label roll series, ${this.state.activeValidRecords().length} labels`;
    }
    return 'Bulk barcode preview';
  });

  setZoom(mode: 'fit' | '100' | '150'): void {
    this.state.zoomMode.set(mode);
  }

  onZoomSelectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as 'fit' | '100' | '150';
    if (val === 'fit' || val === '100' || val === '150') {
      this.setZoom(val);
    }
  }

  readonly sheetZoomWidthStyle = computed<string>(() => {
    const mode = this.state.zoomMode();
    const model = this.state.currentPageModel();
    if (!model || mode === 'fit') return '100%';

    // 100% actual size at 96 CSS DPI: mm * (96 / 25.4)
    const basePx = model.pageWidthMm * (96 / 25.4);
    const px = mode === '150' ? Math.round(basePx * 1.5) : Math.round(basePx);
    return `${px}px`;
  });

  readonly rollZoomWidthStyle = computed<string>(() => {
    const mode = this.state.zoomMode();
    const preset = this.state.currentRollPreset();
    if (mode === 'fit') return 'min(460px, 100%)';

    const basePx = preset.widthMm * (96 / 25.4);
    const px = mode === '150' ? Math.round(basePx * 1.5) : Math.round(basePx);
    return `${px}px`;
  });

  readonly currentSheetSvg = computed<SafeHtml | null>(() => {
    const model = this.state.currentPageModel();
    if (!model) return null;
    const svgStr = this.sheetLayout.renderPageToSvg(model, this.state.captionStyle());
    return this.sanitizer.bypassSecurityTrustHtml(svgStr);
  });

  readonly rollLabelsWithSvg = computed<Array<{ model: RollLabelModel; safeSvg?: SafeHtml }>>(() => {
    const labels = this.state.rollLabels();
    const style = this.state.captionStyle();
    return labels.map(model => {
      const svgStr = this.sheetLayout.renderRollModelToSvg(model, style);
      return {
        model,
        safeSvg: svgStr ? this.sanitizer.bypassSecurityTrustHtml(svgStr) : undefined
      };
    });
  });

  readonly zipPreviewItems = computed<{ index: number; value: string; fileName: string; safeSvg?: SafeHtml }[]>(() => {
    if (!this.state.isGenerated()) {
      return [];
    }

    const items = this.state.generatedItems().slice(0, 6);
    const ext = this.state.outputType() === 'zip-svg' ? 'svg' : 'png';
    const fmt = this.state.formatId();

    return items.map((it, idx) => {
      const formattedIdx = String(idx + 1).padStart(3, '0');
      const safeVal = (it.cleanValue || it.value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
      return {
        index: idx,
        value: it.displayValue || it.value,
        fileName: `${formattedIdx}-${safeVal}-${fmt}.${ext}`,
        safeSvg: it.svg ? this.sanitizer.bypassSecurityTrustHtml(it.svg) : undefined
      };
    });
  });

  readonly isActionDisabled = computed<boolean>(() => {
    return (
      !this.state.isGenerated() ||
      this.state.activeValidRecords().length === 0 ||
      this.state.isRunning()
    );
  });

  readonly hasVerificationFailures = computed<boolean>(() => {
    return (this.state.verificationSummary()?.failed ?? 0) > 0;
  });

  actionButtonTooltip(defaultTip: string): string {
    if (!this.state.isGenerated()) {
      return 'Click Generate in the left panel to create barcodes.';
    }
    return defaultTip;
  }

  onPreviewFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2 MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      this.state.loadCsvFile(file.name, text);
    };
    reader.readAsText(file);
    inputEl.value = '';
  }

  onDownloadVerifiedOnly(): void {
    this.state.triggerGenerate();
  }

  readonly actionSummaryText = computed<string>(() => {
    const total = this.state.activeValidRecords().length;
    if (total === 0) return '0 labels ready';

    if (this.isSheetMode()) {
      const pages = this.state.totalPreviewPages();
      const curr = this.state.previewPage();
      return `${total} labels, ${pages} ${pages === 1 ? 'page' : 'pages'} (Page ${curr} of ${pages})`;
    } else if (this.isRollMode()) {
      const roll = this.state.currentRollPreset();
      return `${total} labels on roll (${roll.name})`;
    }
    return `${total} barcodes ready`;
  });

  readonly hasFitWarning = computed<boolean>(() => {
    if (this.isSheetMode()) {
      return !!this.state.currentPageModel()?.warning;
    } else if (this.isRollMode()) {
      return this.state.rollLabels().some(l => !l.fits || l.isReducedHeight);
    }
    return false;
  });

  readonly fitWarningText = computed<string>(() => {
    if (this.isSheetMode()) {
      return this.state.currentPageModel()?.warning || 'Test scan before printing.';
    } else if (this.isRollMode()) {
      const tooSmall = this.state.rollLabels().find(l => !l.fits);
      if (tooSmall?.tooSmallReason) return tooSmall.tooSmallReason;
      const reduced = this.state.rollLabels().some(l => l.isReducedHeight);
      if (reduced) return 'Truncated bar height. Test scan before printing.';
    }
    return 'Test scan before printing.';
  });

  readonly hasErrors = computed<boolean>(() => {
    return this.state.reviewedRecords().some(r => r.status === 'invalid');
  });

  onCanvasScroll(): void {
    if (!this.isRollMode()) return;
    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>('.roll-series-item');
    if (items.length === 0) return;

    const containerTop = container.scrollTop;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemTop = item.offsetTop - container.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      if (itemBottom >= containerTop + 30) {
        const idx = parseInt(item.getAttribute('data-label-index') || '1', 10);
        if (idx !== this.rollCurrentIndex()) {
          this.rollCurrentIndex.set(idx);
        }
        break;
      }
    }
  }

  onJumpToRollLabel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const targetIdx = parseInt(input.value, 10);
    const max = this.state.activeValidRecords().length;
    if (isNaN(targetIdx) || targetIdx < 1 || targetIdx > max) {
      input.value = String(this.rollCurrentIndex());
      return;
    }

    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`#roll-label-${targetIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.rollCurrentIndex.set(targetIdx);
    }
  }

  toggleMoreMenu(e: Event): void {
    e.stopPropagation();
    this.isMoreMenuOpen.update(v => !v);
  }

  closeDropdownIfOutside(e: Event): void {
    if (this.isMoreMenuOpen()) {
      this.isMoreMenuOpen.set(false);
    }
  }

  onDownload(): void {
    this.state.triggerGenerate();
  }

  /**
   * Dedicated hidden iframe print (Finding F3):
   * Prints only the label SVGs in millimeter dimensions without application headers/footers.
   * Never invokes window.print() on the main app screen.
   */
  onPrint(): void {
    const totalRecords = this.state.activeValidRecords().length;
    if (totalRecords === 0) return;

    try {
      let widthMm = 210;
      let heightMm = 297;
      let pagesHtml = '';
      const style = this.state.captionStyle();

      if (this.isSheetMode()) {
        const pages = this.state.sheetPages();
        if (pages.length === 0) return;
        widthMm = pages[0].pageWidthMm;
        heightMm = pages[0].pageHeightMm;
        pagesHtml = pages.map(p => {
          const svg = this.sheetLayout.renderPageToSvg(p, style);
          return `<div class="print-page">${svg}</div>`;
        }).join('\n');
      } else if (this.isRollMode()) {
        const labels = this.state.rollLabels();
        if (labels.length === 0) return;
        widthMm = labels[0].widthMm;
        heightMm = labels[0].heightMm;
        pagesHtml = labels.map(l => {
          const svg = this.sheetLayout.renderRollModelToSvg(l, style);
          return `<div class="print-page">${svg}</div>`;
        }).join('\n');
      } else {
        return;
      }

      const docHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Acklet Barcode Print</title>
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              width: ${widthMm}mm;
            }
            .print-page {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              page-break-after: always;
              break-after: page;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-sizing: border-box;
            }
            .print-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            svg {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              display: block;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `.trim();

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        document.body.removeChild(iframe);
        this.fallbackPdfDownload();
        return;
      }

      frameDoc.open();
      frameDoc.write(docHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          this.fallbackPdfDownload();
        }

        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 300);

    } catch {
      this.fallbackPdfDownload();
    }
  }

  private fallbackPdfDownload(): void {
    if (this.isSheetMode()) {
      const pageModels = this.state.sheetPages();
      if (pageModels.length === 0) return;
      const pdfBytes = this.pdfBuilder.generateLabelSheetPdfFromModel(pageModels);
      const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  }

  onPrintAlignment(): void {
    this.isMoreMenuOpen.set(false);
    const preset = this.state.currentPreset();
    const pdfBytes = this.pdfBuilder.generateAlignmentTestPagePdf(preset, 0, 0);
    const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
    this.bulkService.triggerDownload(blob, `Alignment-Test-${preset.id}.pdf`);
  }

  onExportManifest(): void {
    this.isMoreMenuOpen.set(false);
    const records = this.state.activeValidRecords();
    const manifestItems = records.map((r, i) => ({
      index: i,
      value: r.value,
      status: 'success' as const,
      fileName: `item-${String(i + 1).padStart(3, '0')}-${r.cleanValue || r.value}`
    }));
    const csv = this.bulkService.generateManifestCsv(manifestItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.bulkService.triggerDownload(blob, `manifest-${this.state.formatId()}.csv`);
  }

  onExportErrorReport(): void {
    this.isMoreMenuOpen.set(false);
    const csv = this.bulkService.generateErrorReportCsv(this.state.reviewedRecords());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.bulkService.triggerDownload(blob, `error-report-${this.state.formatId()}.csv`);
  }
}
