// apps/tool-file-converter/src/components/document-converter/conversion-settings.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionCapability, ConversionOptions, FileJobItem, ConversionTransforms } from '../../converter.models';
import {
  TargetFormatOption,
  computeCommonTestedTargets,
  computeRecommendedTarget,
  POPULAR_CONVERSIONS_LIST,
  PopularConversionItem,
  getTargetFormatMeta,
  formatDisplayLabel,
  DOCUMENT_CONVERTER_CONFIG
} from '../../converter.config';

interface QualityPreset {
  label: string;
  value: number;
}

const QUALITY_PRESETS: QualityPreset[] = [
  { label: 'Smallest Size 65%', value: 65 },
  { label: 'Balanced 85%', value: 85 },
  { label: 'Best Quality 95%', value: 95 }
];

const IMAGE_OUTPUT_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif']);
const LOSSY_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'webp']);
const DOCX_FAMILY_OUTPUTS = new Set(['docx', 'doc', 'pptx']);
const EMBEDDED_IMAGE_OUTPUTS = new Set(['docx', 'md', 'html', 'pptx']);

@Component({
  selector: 'app-conversion-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar-inner-card" aria-label="Conversion settings">
      <!-- Sidebar Header (Matches Image Compressor) -->
      <div class="sidebar-header">
        <h3 class="sidebar-title">Conversion Settings</h3>
        <span class="sidebar-subtitle">Applies to all files</span>
      </div>

      <!-- Scrollable Settings Body -->
      <div class="sidebar-scrollable-body">

        <!-- SECTION 1: CONVERT TO (Segmented chips + Recommended Badge + More Dropdown) -->
        @if (files().length > 0) {
          <div class="sidebar-section" id="section-convert-to">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">CONVERT TO</label>
              @if (recommendedTargetFormat(); as rec) {
                <span class="format-badge-recommended font-mono">
                  {{ rec | uppercase }} (RECOMMENDED)
                </span>
              }
            </div>

            @if (availableTargetFormats().length === 0) {
              <div class="empty-formats-msg" role="status">
                No common format for these files. Remove a file or convert in groups.
              </div>
            } @else {
              <!-- Segmented format chip grid of top tested targets -->
              <div class="format-chips-grid font-mono" role="radiogroup" aria-label="Target format">
                @for (fmt of topTargetFormats(); track fmt.format) {
                  <button
                    type="button"
                    class="format-chip-btn"
                    [class.is-active]="currentTarget().toLowerCase() === fmt.format"
                    (click)="setTargetFormat(fmt.format)"
                    [title]="fmt.description"
                    role="radio"
                    [attr.aria-checked]="currentTarget().toLowerCase() === fmt.format"
                  >
                    <span>{{ fmt.format | uppercase }}</span>
                    @if (fmt.isBeta) {
                      <span class="beta-badge font-mono">BETA</span>
                    }
                  </button>
                }
              </div>

              <!-- Beta limit explanatory notice banner -->
              @if (currentBetaLimit(); as betaLimit) {
                <div class="beta-notice-banner" role="status">
                  <span class="beta-tag font-mono">BETA</span>
                  <span class="beta-limit-text">{{ betaLimit }}</span>
                </div>
              }

              <!-- More dropdown for extra tested targets -->
              @if (extraTargetFormats().length > 0) {
                <div class="select-wrapper extra-format-wrap">
                  <select
                    class="custom-select font-mono"
                    [value]="isExtraTargetSelected() ? currentTarget().toLowerCase() : ''"
                    (change)="onExtraFormatChange($event)"
                    aria-label="More target formats"
                  >
                    <option value="" disabled [selected]="!isExtraTargetSelected()">More formats...</option>
                    @for (fmt of extraTargetFormats(); track fmt.format) {
                      <option [value]="fmt.format">{{ fmt.label }}</option>
                    }
                  </select>
                  <ts-icon name="chevron-down" [size]="14" class="select-arrow-icon" />
                </div>
              }
            }
          </div>
        }

        <!-- SECTION 2: POPULAR CONVERSIONS (Quick Chips in Row) -->
        @if (validPopularConversions().length > 0) {
          <div class="sidebar-section" id="section-popular-conversions">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">POPULAR CONVERSIONS</label>
            </div>
            <div class="target-presets-row">
              @for (pair of validPopularConversions(); track pair.label) {
                <button
                  type="button"
                  class="target-pill-btn"
                  [class.is-active]="currentTarget().toLowerCase() === pair.target.toLowerCase()"
                  (click)="setTargetFormat(pair.target)"
                  [title]="'Set target format to ' + (pair.target | uppercase)"
                >
                  {{ pair.label }}
                </button>
              }
            </div>
          </div>
        }

        <!-- SECTION 3: QUALITY (Image outputs only: JPG, WebP) -->
        @if (showQualityControl()) {
          <div class="sidebar-section" id="section-quality">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">QUALITY</label>
              <div class="header-right-group">
                @if (isQualityModified()) {
                  <button type="button" class="reset-link-btn" (click)="resetQuality()">Reset to defaults</button>
                }
                <span class="selected-quality-badge font-mono">{{ currentQuality() }}%</span>
              </div>
            </div>

            <div class="slider-wrapper">
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                [ngModel]="currentQuality()"
                (ngModelChange)="onQualityChange($event)"
                class="quality-slider"
                aria-label="Quality level"
              />
            </div>

            <div class="preset-pill-group">
              @for (preset of qualityPresets; track preset.value) {
                <button
                  type="button"
                  class="preset-pill-btn"
                  [class.is-active]="currentQuality() === preset.value"
                  (click)="onQualityChange(preset.value)"
                >
                  {{ preset.label }}
                </button>
              }
            </div>
          </div>
        }

        <!-- SECTION 4: RESIZE (Image outputs only) -->
        @if (showResizeControl()) {
          <div class="sidebar-section" id="section-resize">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">RESIZE</label>
              @if (isResizeModified()) {
                <button type="button" class="reset-link-btn" (click)="resetResize()">Reset to defaults</button>
              }
            </div>

            <div class="select-wrapper">
              <select
                class="custom-select"
                [ngModel]="currentResizeMode()"
                (ngModelChange)="onResizeModeChange($event)"
                aria-label="Resize mode"
              >
                <option value="none">Original (no resize)</option>
                <option value="maxWidth">Max width (1920px)</option>
                <option value="maxHeight">Max height (1080px)</option>
                <option value="custom">Custom</option>
              </select>
              <ts-icon name="chevron-down" [size]="14" class="select-arrow-icon" />
            </div>

            @if (currentResizeMode() === 'custom') {
              <div class="custom-dims-row">
                <div class="dim-input-wrap">
                  <span class="dim-prefix">W</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="Width"
                    class="dim-input font-mono"
                    [ngModel]="options().resizeWidth || 1920"
                    (ngModelChange)="onCustomWidthChange($event)"
                  />
                  <span class="dim-unit font-mono">px</span>
                </div>
                <span class="dim-sep">&times;</span>
                <div class="dim-input-wrap">
                  <span class="dim-prefix">H</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="Height"
                    class="dim-input font-mono"
                    [ngModel]="options().resizeHeight || 1080"
                    (ngModelChange)="onCustomHeightChange($event)"
                  />
                  <span class="dim-unit font-mono">px</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- SECTION 5: DPI (PDF or Presentation to Image only) -->
        @if (showDpiControl()) {
          <div class="sidebar-section" id="section-dpi">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">DPI</label>
              @if (isDpiModified()) {
                <button type="button" class="reset-link-btn" (click)="resetDpi()">Reset to defaults</button>
              }
            </div>
            <div class="target-presets-row font-mono">
              @for (dpiVal of [150, 200, 300]; track dpiVal) {
                <button
                  type="button"
                  class="target-pill-btn"
                  [class.is-active]="currentDpi() === dpiVal"
                  (click)="onDpiChange(dpiVal)"
                >
                  {{ dpiVal }} DPI
                </button>
              }
            </div>
          </div>
        }

        <!-- SECTION 6: LAYOUT FIDELITY (DOCX, DOC, PPTX outputs only) -->
        @if (showFidelityControl()) {
          <div class="sidebar-section" id="section-fidelity">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">LAYOUT FIDELITY</label>
              @if (isFidelityModified()) {
                <button type="button" class="reset-link-btn" (click)="resetFidelity()">Reset to defaults</button>
              }
            </div>

            <div class="mode-segmented-control" role="radiogroup" aria-label="Layout fidelity">
              @for (fid of fidelityOptions; track fid.id) {
                <button
                  type="button"
                  class="mode-segment-btn"
                  [class.is-active]="options().fidelity === fid.id"
                  (click)="onFidelityChange(fid.id)"
                  [title]="fid.helperText"
                >
                  {{ fid.label }}
                </button>
              }
            </div>
          </div>
        }

        <!-- SECTION 7: OPTIONS (Checkboxes & Page range) -->
        @if (showOptionsSection()) {
          <div class="sidebar-section" id="section-options">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">OPTIONS</label>
              @if (isOptionsModified()) {
                <button type="button" class="reset-link-btn" (click)="resetOptions()">Reset to defaults</button>
              }
            </div>

            <div class="checkboxes-stack">
              @if (showKeepImagesControl()) {
                <label class="checkbox-row">
                  <input
                    type="checkbox"
                    class="native-checkbox"
                    [checked]="options().keepImages"
                    (change)="toggleKeepImages($event)"
                  />
                  <span class="checkbox-text">Keep embedded images</span>
                </label>
              }

              @if (showOcrControl()) {
                <label class="checkbox-row">
                  <input
                    type="checkbox"
                    class="native-checkbox"
                    [checked]="options().ocr"
                    (change)="toggleOcr($event)"
                  />
                  <span class="checkbox-text">OCR for scanned pages</span>
                </label>
              }
            </div>

            @if (showPageRangeControl()) {
              <div class="page-range-wrap">
                <label class="field-sub-label" for="pageRangeInput">Page range</label>
                <input
                  id="pageRangeInput"
                  type="text"
                  placeholder="e.g. 1-5, 8, 11-14"
                  [ngModel]="options().pageRange"
                  (ngModelChange)="onPageRangeChange($event)"
                  class="custom-text-input font-mono"
                  [class.has-error]="!!pageRangeError()"
                  aria-label="Page range selection"
                />
                @if (pageRangeError()) {
                  <span class="field-error-msg">{{ pageRangeError() }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- SECTION 8: TRANSFORMS (Image input to Image output only) -->
        @if (showTransformsControl()) {
          <div class="sidebar-section" id="section-transforms">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">TRANSFORMS</label>
              @if (isTransformsModified()) {
                <button type="button" class="reset-link-btn" (click)="resetTransforms()">Reset to defaults</button>
              }
            </div>
            <div class="tool-btn-group">
              <button
                type="button"
                class="transform-btn"
                (click)="rotate90Left()"
                title="Rotate 90 degrees counter-clockwise"
              >
                <ts-icon name="rotate-ccw" [size]="12" />
                <span>90&deg; Left</span>
              </button>

              <button
                type="button"
                class="transform-btn"
                (click)="rotate90Right()"
                title="Rotate 90 degrees clockwise"
              >
                <ts-icon name="rotate-cw" [size]="12" />
                <span>90&deg; Right</span>
              </button>

              <button
                type="button"
                class="transform-btn"
                [class.is-active]="isFlipHorizontalActive()"
                (click)="toggleFlipH()"
                title="Flip horizontally"
              >
                <ts-icon name="flip-horizontal" [size]="12" />
                <span>Flip H</span>
              </button>
            </div>
          </div>
        }

        <!-- SECTION 9: DELIVERY (Only when files().length > 1) -->
        @if (showDeliveryControl()) {
          <div class="sidebar-section" id="section-delivery">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">DELIVERY</label>
            </div>
            <div class="select-wrapper">
              <select
                class="custom-select"
                [ngModel]="options().deliveryMode"
                (ngModelChange)="onDeliveryChange($event)"
                aria-label="Delivery mode"
              >
                <option value="individual">Download each file</option>
                <option value="zip">Download as ZIP</option>
              </select>
              <ts-icon name="chevron-down" [size]="14" class="select-arrow-icon" />
            </div>
          </div>
        }

      </div>

      <!-- Fixed Sidebar Action Footer (Always visible) -->
      <div class="sidebar-action-footer">
        @if (files().length > 0 && !isConverting()) {
          <button
            type="button"
            class="sidebar-primary-cta"
            (click)="convert.emit()"
            [disabled]="!hasValidTarget()"
          >
            <span>Convert {{ readyCount() }} {{ readyCount() === 1 ? 'File' : 'Files' }} &rarr;</span>
          </button>
        } @else if (isConverting()) {
          <button type="button" class="sidebar-primary-cta is-converting" disabled>
            <span class="spinner-circle-sm"></span>
            <span>Converting ({{ convertingCount() }}/{{ files().length }})...</span>
          </button>
        } @else {
          <button
            type="button"
            class="sidebar-primary-cta"
            disabled
          >
            <span>Convert 0 Files &rarr;</span>
          </button>
        }

        <!-- Short reason under button if target is invalid -->
        @if (!hasValidTarget() && files().length > 0) {
          <p class="disabled-reason-text">Choose a format that works for all files</p>
        }

        <!-- Trust notice: 12px, muted -->
        <p class="trust-notice-line">Files are deleted automatically after 1 hour.</p>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .sidebar-inner-card {
      height: 100%;
      max-height: calc(100vh - 110px);
      min-height: 480px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: var(--ts-radius-card, 18px);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }

    :host-context([data-theme="dark"]) .sidebar-inner-card,
    [data-theme="dark"] .sidebar-inner-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    /* ── Header ── */
    .sidebar-header {
      flex-shrink: 0;
      border-bottom: 1px solid #F1F5F9;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .sidebar-header,
    [data-theme="dark"] .sidebar-header {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }

    .header-custom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .back-to-global-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: none;
      color: var(--tool-accent, #2563EB);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    :host-context([data-theme="dark"]) .back-to-global-btn,
    [data-theme="dark"] .back-to-global-btn {
      color: var(--tool-accent, #3B82F6);
    }

    .reset-custom-btn {
      font-size: 11px;
      color: #EF4444;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.015em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .sidebar-title,
    [data-theme="dark"] .sidebar-title {
      color: #FFFFFF;
    }

    .sidebar-subtitle {
      font-size: 11.5px;
      color: #64748B;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .sidebar-subtitle,
    [data-theme="dark"] .sidebar-subtitle {
      color: #94A3B8;
    }

    /* ── Scrollable Body ── */
    .sidebar-scrollable-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-right: 2px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      overscroll-behavior: contain;
    }

    .sidebar-scrollable-body::-webkit-scrollbar {
      display: none;
      width: 0;
    }

    /* ── Sections ── */
    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sidebar-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .sidebar-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .sidebar-section-label,
    [data-theme="dark"] .sidebar-section-label {
      color: #94A3B8;
    }

    .header-right-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reset-link-btn {
      font-size: 10px;
      color: #64748B;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    :host-context([data-theme="dark"]) .reset-link-btn,
    [data-theme="dark"] .reset-link-btn {
      color: #94A3B8;
    }

    .reset-link-btn:hover {
      color: var(--tool-accent, #2563EB);
    }

    .format-badge-recommended {
      font-size: 9.5px;
      font-weight: 700;
      color: #10B981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    /* Format chips grid */
    .format-chips-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }

    .format-chip-btn {
      height: 30px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .format-chip-btn,
    [data-theme="dark"] .format-chip-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #F8FAFC;
    }

    .format-chip-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .format-chip-btn:hover,
    [data-theme="dark"] .format-chip-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .format-chip-btn.is-active {
      background: var(--tool-accent-soft, #EFF6FF);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .format-chip-btn.is-active,
    [data-theme="dark"] .format-chip-btn.is-active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.14));
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .extra-format-wrap {
      margin-top: 2px;
    }

    .beta-badge {
      font-size: 8px;
      font-weight: 700;
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 4px;
      line-height: 1;
    }

    .beta-notice-banner {
      margin-top: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #92400E;
    }

    :host-context([data-theme="dark"]) .beta-notice-banner,
    [data-theme="dark"] .beta-notice-banner,
    :host-context(.dark) .beta-notice-banner,
    .dark .beta-notice-banner {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.3);
      color: #FDE68A;
    }

    .beta-tag {
      font-size: 9px;
      font-weight: 700;
      color: #D97706;
      background: rgba(245, 158, 11, 0.18);
      padding: 1px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .beta-tag,
    [data-theme="dark"] .beta-tag,
    :host-context(.dark) .beta-tag,
    .dark .beta-tag {
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.25);
    }

    .beta-limit-text {
      line-height: 1.3;
      flex: 1;
    }

    /* Popular conversions / target pills */
    .target-presets-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .target-pill-btn {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .target-pill-btn,
    [data-theme="dark"] .target-pill-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      color: #CBD5E1;
    }

    .target-pill-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .target-pill-btn:hover,
    [data-theme="dark"] .target-pill-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .target-pill-btn.is-active {
      background: var(--tool-accent-soft, #EFF6FF);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .target-pill-btn.is-active,
    [data-theme="dark"] .target-pill-btn.is-active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.14));
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    /* Quality Slider */
    .selected-quality-badge {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .selected-quality-badge,
    [data-theme="dark"] .selected-quality-badge {
      color: var(--tool-accent, #3B82F6);
    }

    .slider-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .quality-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #E2E8F0;
      accent-color: var(--tool-accent, #2563EB);
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .quality-slider,
    [data-theme="dark"] .quality-slider {
      background: rgba(255, 255, 255, 0.16);
      accent-color: var(--tool-accent, #3B82F6);
    }

    .preset-pill-group {
      display: flex;
      gap: 6px;
    }

    .preset-pill-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 10.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4px;
    }

    :host-context([data-theme="dark"]) .preset-pill-btn,
    [data-theme="dark"] .preset-pill-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .preset-pill-btn:hover {
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .preset-pill-btn.is-active {
      background: var(--tool-accent-soft, #EFF6FF);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .preset-pill-btn.is-active,
    [data-theme="dark"] .preset-pill-btn.is-active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.14));
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    /* Selects & Inputs */
    .select-wrapper {
      position: relative;
      width: 100%;
    }

    .custom-select {
      width: 100%;
      height: 36px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 32px 0 10px;
      font-size: 12px;
      font-weight: 500;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .custom-select,
    [data-theme="dark"] .custom-select {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .custom-select:focus {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    .select-arrow-icon {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #94A3B8;
    }

    /* Custom dimensions row */
    .custom-dims-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dim-input-wrap {
      display: flex;
      align-items: center;
      flex: 1;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0 6px;
      height: 32px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .dim-input-wrap,
    [data-theme="dark"] .dim-input-wrap {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.12);
    }

    .dim-prefix {
      font-size: 10px;
      font-weight: 700;
      color: #94A3B8;
      margin-right: 4px;
    }

    .dim-input {
      width: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-size: 11px;
      color: inherit;
    }

    .dim-unit {
      font-size: 10px;
      color: #94A3B8;
    }

    .dim-sep {
      color: #94A3B8;
      font-size: 12px;
    }

    /* Mode Segmented Control (Layout Fidelity) */
    .mode-segmented-control {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 3px;
    }

    :host-context([data-theme="dark"]) .mode-segmented-control,
    [data-theme="dark"] .mode-segmented-control {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .mode-segment-btn {
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4px;
    }

    :host-context([data-theme="dark"]) .mode-segment-btn,
    [data-theme="dark"] .mode-segment-btn {
      color: #94A3B8;
    }

    .mode-segment-btn.is-active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="dark"]) .mode-segment-btn.is-active,
    [data-theme="dark"] .mode-segment-btn.is-active {
      background: #27272A;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Transforms */
    .tool-btn-group {
      display: flex;
      gap: 6px;
    }

    .transform-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s;
    }

    :host-context([data-theme="dark"]) .transform-btn,
    [data-theme="dark"] .transform-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .transform-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .transform-btn.is-active {
      background: var(--tool-accent-soft, #EFF6FF);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    /* Checkboxes & page range */
    .checkboxes-stack {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .native-checkbox {
      width: 15px;
      height: 15px;
      accent-color: var(--tool-accent, #2563EB);
      cursor: pointer;
    }

    .checkbox-text {
      font-size: 11.5px;
      color: #334155;
    }

    :host-context([data-theme="dark"]) .checkbox-text,
    [data-theme="dark"] .checkbox-text {
      color: #CBD5E1;
    }

    .page-range-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .field-sub-label {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748B;
    }

    .custom-text-input {
      height: 32px;
      border-radius: 6px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      padding: 0 8px;
      font-size: 11.5px;
      color: #0F172A;
      outline: none;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .custom-text-input,
    [data-theme="dark"] .custom-text-input {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .custom-text-input:focus {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    .custom-text-input.has-error {
      border-color: #EF4444;
    }

    .field-error-msg {
      font-size: 10.5px;
      color: #EF4444;
    }

    .empty-formats-msg {
      padding: 8px 10px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #EF4444;
      font-size: 11px;
    }

    /* ── Action Footer ── */
    .sidebar-action-footer {
      flex-shrink: 0;
      border-top: 1px solid #F1F5F9;
      padding-top: 12px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme="dark"]) .sidebar-action-footer,
    [data-theme="dark"] .sidebar-action-footer {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .sidebar-primary-cta {
      width: 100%;
      height: 42px;
      border-radius: 10px;
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-size: 13.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .sidebar-primary-cta,
    [data-theme="dark"] .sidebar-primary-cta {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    .sidebar-primary-cta:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    .sidebar-primary-cta:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner-circle-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .disabled-reason-text {
      font-size: 11px;
      color: #EF4444;
      text-align: center;
      margin: 0;
    }

    .trust-notice-line {
      font-size: 12px;
      color: #94A3B8;
      text-align: center;
      margin: 0;
    }
  `]
})
export class ConversionSettingsComponent {
  readonly files = input.required<FileJobItem[]>();
  readonly options = input.required<ConversionOptions>();
  readonly capabilities = input<ConversionCapability[]>([]);
  readonly isConverting = input<boolean>(false);
  readonly pageRangeError = input<string | null>(null);
  readonly zipDownloadUrl = input<string | null>(null);

  readonly optionsChange = output<ConversionOptions>();
  readonly convert = output<void>();

  readonly qualityPresets = QUALITY_PRESETS;
  readonly fidelityOptions = DOCUMENT_CONVERTER_CONFIG.fidelityOptions;

  // Active target format (reads from global options)
  readonly currentTarget = computed<string>(() => {
    return this.options().targetFormat || 'pdf';
  });

  // Current quality
  readonly currentQuality = computed<number>(() => {
    return this.options().quality ?? 85;
  });

  // Current DPI
  readonly currentDpi = computed<number>(() => {
    return this.options().dpi ?? 200;
  });

  // Current Resize Mode
  readonly currentResizeMode = computed<'none' | 'maxWidth' | 'maxHeight' | 'custom'>(() => {
    const opts = this.options();
    return opts.resizeMode || (opts.resizeDimension ? 'maxWidth' : 'none');
  });

  // Unique source formats among active files
  readonly sourceFormats = computed<string[]>(() => {
    return Array.from(new Set(this.files().map(f => f.sourceFormat.toLowerCase())));
  });

  // Available common target formats for all selected inputs
  readonly availableTargetFormats = computed<TargetFormatOption[]>(() => {
    const sources = this.sourceFormats();
    if (sources.length === 0) return [];
    const common = computeCommonTestedTargets(sources, this.capabilities());
    return common.map(ext => getTargetFormatMeta(ext, this.capabilities()));
  });

  // BEST / RECOMMENDED Target Format
  readonly recommendedTargetFormat = computed<string | null>(() => {
    const targets = this.availableTargetFormats().map(t => t.format);
    return computeRecommendedTarget(this.sourceFormats(), targets, this.capabilities());
  });

  // Current Beta limit if active format is beta
  readonly currentBetaLimit = computed<string | null>(() => {
    const cur = this.currentTarget().toLowerCase();
    const opt = this.availableTargetFormats().find(t => t.format === cur);
    return opt?.isBeta ? (opt.limitDescription || 'Format conversion in beta. Limits may apply.') : null;
  });

  // Split targets into top 4 chips and remainder into More dropdown
  readonly topTargetFormats = computed<TargetFormatOption[]>(() => {
    const all = this.availableTargetFormats();
    const rec = this.recommendedTargetFormat();
    // Sort so recommended target is first in top chips
    const sorted = [...all].sort((a, b) => {
      if (a.format === rec) return -1;
      if (b.format === rec) return 1;
      return 0;
    });
    return sorted.slice(0, 4);
  });

  readonly extraTargetFormats = computed<TargetFormatOption[]>(() => {
    const top = new Set(this.topTargetFormats().map(t => t.format));
    return this.availableTargetFormats().filter(t => !top.has(t.format));
  });

  readonly isExtraTargetSelected = computed<boolean>(() => {
    const cur = this.currentTarget().toLowerCase();
    return this.extraTargetFormats().some(t => t.format === cur);
  });

  // Valid popular conversion pairs for current inputs (valid for EVERY selected input type)
  readonly validPopularConversions = computed<PopularConversionItem[]>(() => {
    const sources = this.sourceFormats();
    const available = new Set(this.availableTargetFormats().map(t => t.format.toLowerCase()));
    if (sources.length === 0 || available.size === 0) return [];

    const caps = this.capabilities();
    if (caps && caps.length > 0) {
      const matches: PopularConversionItem[] = [];
      const testedOutputs = Array.from(available);
      for (const target of testedOutputs) {
        const supportedByAll = sources.every(src =>
          caps.some(c => c.inputType.toLowerCase() === src.toLowerCase() && c.outputType.toLowerCase() === target && (c.status === 'tested' || c.status === 'stable'))
        );
        if (!supportedByAll) continue;

        const primaryCap = caps.find(c => sources.includes(c.inputType.toLowerCase()) && c.outputType.toLowerCase() === target);
        const usage = primaryCap?.usage || primaryCap?.recommendationScore || 50;
        const isBeta = primaryCap?.tier === 'beta';
        const limitDesc = primaryCap?.limitDescription;
        const srcLabel = formatDisplayLabel(sources[0]);
        const tgtLabel = formatDisplayLabel(target);
        const label = sources.length === 1 ? `${srcLabel} → ${tgtLabel}` : `→ ${tgtLabel}`;

        matches.push({
          inputFormats: sources,
          target,
          label,
          usage,
          isBeta,
          limitDescription: limitDesc
        });
      }
      if (matches.length > 0) {
        return matches.sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0)).slice(0, 8);
      }
    }

    return POPULAR_CONVERSIONS_LIST.filter(p => {
      const validForEveryInput = sources.every(src => p.inputFormats.includes(src.toLowerCase()));
      const matchesTarget = available.has(p.target.toLowerCase());
      return validForEveryInput && matchesTarget;
    });
  });

  // Section visibility conditions
  readonly showQualityControl = computed<boolean>(() => {
    return LOSSY_IMAGE_FORMATS.has(this.currentTarget().toLowerCase());
  });

  readonly showResizeControl = computed<boolean>(() => {
    return IMAGE_OUTPUT_FORMATS.has(this.currentTarget().toLowerCase());
  });

  readonly showDpiControl = computed<boolean>(() => {
    const out = this.currentTarget().toLowerCase();
    const isImageOutput = out === 'png' || out === 'jpg' || out === 'jpeg';
    const isPdfOrPresentation = this.sourceFormats().some(s => s === 'pdf' || s === 'pptx' || s === 'ppt' || s === 'odp');
    return isImageOutput && isPdfOrPresentation;
  });

  readonly showFidelityControl = computed<boolean>(() => {
    return DOCX_FAMILY_OUTPUTS.has(this.currentTarget().toLowerCase());
  });

  readonly showKeepImagesControl = computed<boolean>(() => {
    return EMBEDDED_IMAGE_OUTPUTS.has(this.currentTarget().toLowerCase());
  });

  readonly showOcrControl = computed<boolean>(() => {
    return this.files().some(f => f.structureReport?.hasScannedPages);
  });

  readonly showPageRangeControl = computed<boolean>(() => {
    return this.sourceFormats().some(s => s === 'pdf' || s === 'pptx');
  });

  readonly showOptionsSection = computed<boolean>(() => {
    return this.showKeepImagesControl() || this.showOcrControl() || this.showPageRangeControl();
  });

  readonly showTransformsControl = computed<boolean>(() => {
    const allInputsImages = this.sourceFormats().every(s => IMAGE_OUTPUT_FORMATS.has(s));
    const outputIsImage = IMAGE_OUTPUT_FORMATS.has(this.currentTarget().toLowerCase());
    return allInputsImages && outputIsImage;
  });

  readonly showDeliveryControl = computed<boolean>(() => {
    return this.files().length > 1;
  });

  readonly hasValidTarget = computed<boolean>(() => {
    const cur = this.currentTarget().toLowerCase();
    return this.availableTargetFormats().some(t => t.format === cur);
  });

  readonly readyCount = computed<number>(() => {
    return this.files().filter(f => f.status === 'ready' || f.status === 'queued').length;
  });

  readonly convertingCount = computed<number>(() => {
    return this.files().filter(f => f.status === 'converting').length;
  });

  // Modification checks for "Reset to defaults"
  isQualityModified(): boolean {
    return this.currentQuality() !== 85;
  }

  isResizeModified(): boolean {
    return this.currentResizeMode() !== 'none';
  }

  isDpiModified(): boolean {
    return this.currentDpi() !== 200;
  }

  isFidelityModified(): boolean {
    return this.options().fidelity !== 'balanced';
  }

  isOptionsModified(): boolean {
    return this.options().keepImages !== true || this.options().ocr !== false || (this.options().pageRange || '') !== '';
  }

  isTransformsModified(): boolean {
    const t = this.options().transforms;
    if (!t) return false;
    return t.rotateAngle !== 0 || t.flipH !== false;
  }

  isFlipHorizontalActive(): boolean {
    return Boolean(this.options().transforms?.flipH);
  }

  // Mutation handlers
  setTargetFormat(format: string): void {
    const next: ConversionOptions = {
      ...this.options(),
      targetFormat: format.toLowerCase()
    };
    this.optionsChange.emit(next);
  }

  onExtraFormatChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.setTargetFormat(select.value);
    }
  }

  onQualityChange(val: number): void {
    this.optionsChange.emit({
      ...this.options(),
      quality: val
    });
  }

  resetQuality(): void {
    this.onQualityChange(85);
  }

  onResizeModeChange(mode: 'none' | 'maxWidth' | 'maxHeight' | 'custom'): void {
    let dim = 0;
    if (mode === 'maxWidth') dim = 1920;
    if (mode === 'maxHeight') dim = 1080;
    this.optionsChange.emit({
      ...this.options(),
      resizeMode: mode,
      resizeDimension: dim
    });
  }

  resetResize(): void {
    this.onResizeModeChange('none');
  }

  onCustomWidthChange(w: number): void {
    this.optionsChange.emit({
      ...this.options(),
      resizeMode: 'custom',
      resizeWidth: w
    });
  }

  onCustomHeightChange(h: number): void {
    this.optionsChange.emit({
      ...this.options(),
      resizeMode: 'custom',
      resizeHeight: h
    });
  }

  onDpiChange(dpi: number): void {
    this.optionsChange.emit({
      ...this.options(),
      dpi
    });
  }

  resetDpi(): void {
    this.onDpiChange(200);
  }

  onFidelityChange(fid: 'editable' | 'balanced' | 'exact'): void {
    this.optionsChange.emit({
      ...this.options(),
      fidelity: fid
    });
  }

  resetFidelity(): void {
    this.onFidelityChange('balanced');
  }

  toggleKeepImages(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.optionsChange.emit({
      ...this.options(),
      keepImages: checked
    });
  }

  toggleOcr(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.optionsChange.emit({
      ...this.options(),
      ocr: checked
    });
  }

  onPageRangeChange(val: string): void {
    this.optionsChange.emit({
      ...this.options(),
      pageRange: val
    });
  }

  resetOptions(): void {
    this.optionsChange.emit({
      ...this.options(),
      keepImages: true,
      ocr: false,
      pageRange: ''
    });
  }

  rotate90Left(): void {
    const currentAngle = this.options().transforms?.rotateAngle || 0;
    const nextAngle = (currentAngle - 90 + 360) % 360;
    this.updateTransforms({ rotateAngle: nextAngle });
  }

  rotate90Right(): void {
    const currentAngle = this.options().transforms?.rotateAngle || 0;
    const nextAngle = (currentAngle + 90) % 360;
    this.updateTransforms({ rotateAngle: nextAngle });
  }

  toggleFlipH(): void {
    const currentFlip = this.options().transforms?.flipH || false;
    this.updateTransforms({ flipH: !currentFlip });
  }

  resetTransforms(): void {
    this.updateTransforms({ rotateAngle: 0, flipH: false });
  }

  private updateTransforms(partial: Partial<ConversionTransforms>): void {
    const current = this.options().transforms || { rotateAngle: 0, flipH: false };
    this.optionsChange.emit({
      ...this.options(),
      transforms: { ...current, ...partial }
    });
  }

  onDeliveryChange(val: 'individual' | 'zip'): void {
    this.optionsChange.emit({
      ...this.options(),
      deliveryMode: val
    });
  }
}
