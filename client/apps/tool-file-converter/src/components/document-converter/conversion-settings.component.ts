// apps/tool-file-converter/src/components/document-converter/conversion-settings.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionCapability, ConversionOptions, FileJobItem } from '../../converter.models';
import { TargetFormatOption, computeCommonTestedTargets, getTargetFormatMeta, DOCUMENT_CONVERTER_CONFIG } from '../../converter.config';

@Component({
  selector: 'app-conversion-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="settings-panel" aria-label="Conversion configuration panel">
      <h2 class="settings-title">Conversion settings</h2>

      <!-- Convert To (Radio list) -->
      <fieldset class="setting-group" id="setting-group-target-format">
        <legend class="group-label">Convert to</legend>
        <div class="radio-vertical-list" role="radiogroup" aria-label="Target format">
          @if (availableTargetFormats().length === 0) {
            <div class="empty-formats-msg" role="status">
              No common format for these files. Remove a file or convert in groups.
            </div>
          } @else {
            @for (fmt of availableTargetFormats(); track fmt.format) {
              <label
                class="radio-card"
                [class.is-selected]="options().targetFormat.toLowerCase() === fmt.format"
              >
                <input
                  type="radio"
                  name="targetFormat"
                  [value]="fmt.format"
                  [checked]="options().targetFormat.toLowerCase() === fmt.format"
                  (change)="setTargetFormat(fmt.format)"
                  class="native-radio"
                />
                <div class="radio-content">
                  <div class="format-header">
                    <span class="format-title">{{ fmt.label }}</span>
                    @if (bestTargetFormat() === fmt.format) {
                      <span class="badge-best">BEST</span>
                    }
                    @if (isBetaTarget(fmt.format)) {
                      <span
                        class="badge-beta"
                        [class.show-tooltip]="showBetaTooltip(fmt.format)"
                        tabindex="0"
                        [attr.aria-label]="'Beta: ' + getBetaTooltip(fmt.format)"
                      >
                        Beta
                        <span class="beta-tooltip" role="tooltip">{{ getBetaTooltip(fmt.format) }}</span>
                      </span>
                    }
                  </div>
                  <span class="format-desc">{{ fmt.description }}</span>
                </div>
              </label>
            }
          }
        </div>
      </fieldset>

      <!-- Layout Fidelity (Segmented Control) -->
      @if (activeCapabilityFlags().layoutFidelity) {
        <fieldset class="setting-group">
          <legend class="group-label">Layout fidelity</legend>
          <div class="segmented-control" role="radiogroup" aria-label="Layout fidelity mode">
            @for (fid of config.fidelityOptions; track fid.id) {
              <button
                type="button"
                class="segment-btn"
                [class.is-active]="options().fidelity === fid.id"
                role="radio"
                [attr.aria-checked]="options().fidelity === fid.id"
                (click)="setFidelity(fid.id)"
              >
                {{ fid.label }}
              </button>
            }
          </div>
          <span class="fidelity-hint">{{ currentFidelityHelperText() }}</span>
        </fieldset>
      }

      <!-- Options (Toggles & Page Range) -->
      <div class="setting-group">
        <span class="group-label">Options</span>

        <div class="options-list">
          <!-- OCR Toggle -->
          @if (activeCapabilityFlags().ocr && hasScannedPages()) {
            <label class="toggle-row">
              <span class="toggle-label">Optical character recognition (OCR)</span>
              <input
                type="checkbox"
                class="native-checkbox"
                [checked]="options().ocr"
                (change)="toggleOcr($event)"
              />
            </label>
          }

          <!-- Keep Images Toggle -->
          @if (activeCapabilityFlags().keepImages) {
            <label class="toggle-row">
              <span class="toggle-label">Keep embedded graphics & images</span>
              <input
                type="checkbox"
                class="native-checkbox"
                [checked]="options().keepImages"
                (change)="toggleKeepImages($event)"
              />
            </label>
          }

          <!-- DPI Setting for raster images -->
          @if (activeCapabilityFlags().dpi) {
            <div class="input-row">
              <span class="input-label">Image resolution</span>
              <div class="segmented-control" role="radiogroup" aria-label="Resolution DPI">
                @for (d of [150, 200, 300]; track d) {
                  <button
                    type="button"
                    class="segment-btn"
                    [class.is-active]="(options().dpi || 200) === d"
                    (click)="setDpi(d)"
                  >
                    {{ d }} DPI
                  </button>
                }
              </div>
            </div>
          }

          <!-- Page Range Input -->
          @if (activeCapabilityFlags().pageRange) {
            <div class="input-row">
              <label for="page-range-input" class="input-label">Page range</label>
              <input
                id="page-range-input"
                type="text"
                class="text-input"
                [value]="options().pageRange"
                (input)="onPageRangeChange($event)"
                placeholder="e.g. 1-3, 5 (blank for all)"
                [class.input-error]="pageRangeError()"
                aria-describedby="page-range-hint"
              />
              @if (pageRangeError(); as err) {
                <span id="page-range-hint" class="input-hint hint-error" role="alert">{{ err }}</span>
              } @else {
                <span id="page-range-hint" class="input-hint">Leave blank to convert all pages</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Delivery Mode Select -->
      <div class="setting-group">
        <label for="delivery-select" class="group-label">Delivery</label>
        <select
          id="delivery-select"
          class="select-control"
          [value]="options().deliveryMode"
          (change)="onDeliveryChange($event)"
        >
          <option value="individual">Download each file</option>
          <option value="zip">Download as ZIP archive</option>
        </select>
      </div>

      <!-- Primary Action CTA -->
      <div class="action-container">
        @if (allReady() && zipDownloadUrl() && options().deliveryMode === 'zip') {
          <a
            [href]="zipDownloadUrl()"
            download="converted_documents.zip"
            class="primary-btn-link"
            aria-label="Download all converted files as ZIP"
          >
            <ts-icon name="download" [size]="20" />
            <span>Download all as ZIP</span>
          </a>
        } @else {
          <button
            type="button"
            class="primary-cta-btn"
            [disabled]="isConvertDisabled()"
            (click)="convert.emit()"
            aria-label="Start file conversion"
          >
            @if (isConverting()) {
              <span class="spinner" aria-hidden="true"></span>
              <span>Converting {{ files().length }} {{ files().length === 1 ? 'file' : 'files' }}...</span>
            } @else {
              <span>Convert {{ files().length }} {{ files().length === 1 ? 'file' : 'files' }}</span>
            }
          </button>
          @if (convertDisabledReason(); as reason) {
            <p class="convert-disabled-reason" role="alert">{{ reason }}</p>
          }
        }

        <!-- Trust Line -->
        <p class="settings-trust-line">Files are deleted automatically after 1 hour.</p>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .settings-panel {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-surface);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: sticky;
      top: 24px;
    }

    .settings-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border: none;
      padding: 0;
      margin: 0;
    }

    .group-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
      display: block;
    }

    /* Vertical Radio List */
    .radio-vertical-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .radio-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-surface);
      cursor: pointer;
      transition: border-color 150ms ease, background-color 150ms ease;
    }

    .radio-card:hover:not(.is-disabled) {
      border-color: var(--border-default);
    }

    .radio-card.is-selected {
      border-color: var(--tool-accent);
      background: var(--tool-accent-soft);
    }

    .radio-card.is-disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .native-radio {
      margin-top: 3px;
      accent-color: var(--tool-accent);
      cursor: pointer;
    }

    .radio-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .format-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-best {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      border-radius: 4px;
      background: var(--tool-accent);
      color: var(--tool-accent-contrast);
      line-height: 1.2;
    }

    .badge-beta {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      border-radius: 4px;
      background: var(--tool-accent-soft);
      color: var(--tool-accent);
      border: 1px solid var(--tool-accent);
      line-height: 1.2;
      position: relative;
      cursor: help;
      outline: none;
    }

    .badge-beta:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 1px;
    }

    .beta-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      width: max-content;
      max-width: 240px;
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.4;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 150ms ease, visibility 150ms ease;
      white-space: normal;
      text-align: left;
    }

    .badge-beta:hover .beta-tooltip,
    .badge-beta:focus .beta-tooltip,
    .badge-beta:focus-visible .beta-tooltip,
    .badge-beta.show-tooltip .beta-tooltip {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .subtext-pill {
      display: inline-block;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 500;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-muted, rgba(128, 128, 128, 0.15));
      color: var(--text-muted);
      margin-left: 6px;
    }

    .fidelity-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
      line-height: 1.4;
    }

    .format-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .format-desc {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* Segmented Control */
    .segmented-control {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      background: var(--bg-muted);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
    }

    .segment-btn {
      border: 1px solid transparent;
      background: transparent;
      padding: 8px 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      outline: none;
      transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    }

    .segment-btn:hover:not(.is-active) {
      color: var(--text-primary);
    }

    .segment-btn.is-active {
      background: var(--tool-accent-soft);
      color: var(--tool-accent);
      border-color: var(--tool-accent);
    }

    .segment-btn:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    /* Options List */
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .native-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--tool-accent);
      cursor: pointer;
    }

    .input-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .input-label {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .text-input {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      font-weight: 400;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      background: var(--bg-surface);
      color: var(--text-primary);
      outline: none;
      transition: border-color 150ms ease;
      box-sizing: border-box;
    }

    .text-input:focus {
      border-color: var(--tool-accent);
      outline: 2px solid var(--tool-accent);
      outline-offset: 1px;
    }

    .text-input.input-error {
      border-color: var(--color-error, #dc2626);
    }

    .input-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .hint-error {
      color: var(--color-error, #dc2626);
    }

    /* Select Control */
    .select-control {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      font-weight: 400;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      background: var(--bg-surface);
      color: var(--text-primary);
      outline: none;
      transition: border-color 150ms ease;
      cursor: pointer;
      box-sizing: border-box;
    }

    .select-control:focus {
      border-color: var(--tool-accent);
      outline: 2px solid var(--tool-accent);
      outline-offset: 1px;
    }

    /* Actions */
    .action-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }

    .primary-cta-btn,
    .primary-btn-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 16px;
      background: var(--tool-accent);
      color: var(--tool-accent-contrast);
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      outline: none;
      transition: opacity 150ms ease, transform 150ms ease;
      box-sizing: border-box;
    }

    .primary-cta-btn:hover:not(:disabled),
    .primary-btn-link:hover {
      opacity: 0.92;
    }

    .primary-cta-btn:active:not(:disabled),
    .primary-btn-link:active {
      transform: scale(0.99);
    }

    .primary-cta-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .primary-cta-btn:focus-visible,
    .primary-btn-link:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 750ms linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-formats-msg {
      padding: 14px 16px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-surface);
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }

    .convert-disabled-reason {
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-muted);
      margin: 6px 0 0 0;
      text-align: center;
    }

    .settings-trust-line {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-muted);
      margin: 0;
      text-align: center;
      line-height: 1.4;
    }

    @media (prefers-reduced-motion: reduce) {
      .radio-card,
      .segment-btn,
      .text-input,
      .select-control,
      .primary-cta-btn,
      .primary-btn-link {
        transition: none !important;
      }
      .spinner {
        animation-duration: 1.5s;
      }
    }
  `]
})
export class ConversionSettingsComponent {
  readonly config = DOCUMENT_CONVERTER_CONFIG;

  readonly files = input.required<FileJobItem[]>();
  readonly options = input.required<ConversionOptions>();
  readonly capabilities = input<ConversionCapability[]>([]);
  readonly isConverting = input<boolean>(false);
  readonly pageRangeError = input<string | null>(null);
  readonly zipDownloadUrl = input<string | null>(null);

  readonly optionsChange = output<ConversionOptions>();
  readonly convert = output<void>();

  readonly allReady = computed(() => {
    const list = this.files();
    return list.length > 0 && list.every(f => f.status === 'ready');
  });

  readonly currentFidelityHelperText = computed(() => {
    const opt = this.config.fidelityOptions.find(f => f.id === this.options().fidelity);
    return opt ? opt.helperText : '';
  });

  readonly activeCapabilityFlags = computed(() => {
    const caps = this.capabilities();
    const list = this.files();
    const target = this.options().targetFormat.toLowerCase();
    if (caps.length === 0 || list.length === 0) {
      return { ocr: false, pageRange: true, structureCheck: true, quality: false, layoutFidelity: true, resize: false, keepImages: true, dpi: false, tableFocus: false };
    }
    const matching = caps.filter(c => c.outputType === target && list.some(f => f.sourceFormat.toLowerCase() === c.inputType));
    if (matching.length === 0) {
      return { ocr: false, pageRange: true, structureCheck: true, quality: false, layoutFidelity: true, resize: false, keepImages: true, dpi: false, tableFocus: false };
    }
    return {
      ocr: matching.some(m => m.flags?.ocr),
      pageRange: matching.some(m => m.flags?.pageRange),
      structureCheck: matching.some(m => m.flags?.structureCheck),
      quality: matching.some(m => m.flags?.quality),
      layoutFidelity: matching.some(m => m.flags?.layoutFidelity),
      resize: matching.some(m => m.flags?.resize),
      keepImages: matching.some(m => m.flags?.keepImages),
      dpi: matching.some(m => m.flags?.dpi),
      tableFocus: matching.some(m => m.flags?.tableFocus)
    };
  });

  readonly hasScannedPages = computed<boolean>(() => {
    return this.files().some(f => f.structureReport?.hasScannedPages);
  });

  readonly availableTargetFormats = computed<TargetFormatOption[]>(() => {
    const list = this.files();
    if (list.length === 0) return [];
    const caps = this.capabilities();
    const exts = list.map(f => f.sourceFormat.toLowerCase());
    const commonFmts = computeCommonTestedTargets(exts, caps);
    return commonFmts.map(fmt => getTargetFormatMeta(fmt));
  });

  readonly bestTargetFormat = computed<string>(() => {
    const formats = this.availableTargetFormats();
    if (formats.length === 0) return '';
    const list = this.files();

    // Check if document analysis returned a recommended target format
    const serverRec = list.find(f => f.structureReport?.recommendedTarget)?.structureReport?.recommendedTarget?.toLowerCase();
    if (serverRec && formats.some(f => f.format === serverRec)) {
      return serverRec;
    }

    const caps = this.capabilities();
    if (caps.length === 0 || list.length === 0) {
      return formats[0].format;
    }

    let bestFmt = formats[0].format;
    let highestScore = -1;

    for (const fmt of formats) {
      let total = 0;
      let count = 0;
      for (const item of list) {
        const entry = caps.find(
          c => c.inputType.toLowerCase() === item.sourceFormat.toLowerCase() &&
               c.outputType.toLowerCase() === fmt.format.toLowerCase() &&
               c.status === 'tested'
        );
        if (entry) {
          total += entry.recommendationScore;
          count++;
        }
      }
      const avg = count > 0 ? total / count : 0;
      if (avg > highestScore) {
        highestScore = avg;
        bestFmt = fmt.format;
      }
    }
    return bestFmt;
  });

  readonly convertDisabledReason = computed<string | null>(() => {
    if (this.files().length === 0) return null;
    const formats = this.availableTargetFormats();
    if (formats.length === 0) {
      return 'No common format for these files. Remove a file or convert in groups.';
    }
    const currentTarget = this.options().targetFormat?.toLowerCase();
    const isValid = formats.some(f => f.format === currentTarget);
    if (!isValid) {
      return 'Please choose a target format.';
    }
    if (this.pageRangeError()) {
      return this.pageRangeError();
    }
    return null;
  });

  isFormatDisabled(targetFormat: string): boolean {
    const formats = this.availableTargetFormats();
    return !formats.some(f => f.format === targetFormat.toLowerCase());
  }

  isConvertDisabled(): boolean {
    if (this.isConverting()) return true;
    if (this.files().length === 0) return true;
    return Boolean(this.convertDisabledReason());
  }

  setTargetFormat(targetFormat: string): void {
    this.optionsChange.emit({
      ...this.options(),
      targetFormat
    });
  }

  setDpi(dpi: number): void {
    this.optionsChange.emit({
      ...this.options(),
      dpi
    });
  }

  setFidelity(fidelity: 'editable' | 'balanced' | 'exact'): void {
    this.optionsChange.emit({
      ...this.options(),
      fidelity
    });
  }

  toggleOcr(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.optionsChange.emit({
      ...this.options(),
      ocr: checked
    });
  }

  toggleKeepImages(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.optionsChange.emit({
      ...this.options(),
      keepImages: checked
    });
  }

  onPageRangeChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.optionsChange.emit({
      ...this.options(),
      pageRange: val
    });
  }

  onDeliveryChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value as 'individual' | 'zip';
    this.optionsChange.emit({
      ...this.options(),
      deliveryMode: val
    });
  }

  isBetaTarget(targetFormat: string): boolean {
    const list = this.files();
    const caps = this.capabilities();
    const tgt = targetFormat.toLowerCase();
    return list.some(item => {
      const src = item.sourceFormat.toLowerCase();
      const cap = caps.find(c => c.inputType.toLowerCase() === src && c.outputType.toLowerCase() === tgt);
      if (cap && cap.tier === 'beta') return true;
      if (src === 'docx' && tgt === 'md') return true;
      if (src === 'pptx' && tgt === 'txt') return true;
      if (src === 'pdf' && (tgt === 'docx' || tgt === 'xlsx')) return true;
      return false;
    });
  }

  getBetaTooltip(targetFormat: string): string {
    const list = this.files();
    const src = list.length > 0 ? list[0].sourceFormat.toLowerCase() : '';
    const tgt = targetFormat.toLowerCase();

    if (src === 'docx' && tgt === 'md') {
      return 'Headings, lists, bold, and tables; complex nested formatting converted to plain text.';
    }
    if (src === 'pptx' && tgt === 'txt') {
      return 'Extracts slide titles, body bullets, and speaker notes in reading order.';
    }
    if (src === 'pdf' && tgt === 'docx') {
      return 'Text-focused layout; complex columns and shapes may reflow.';
    }
    if (src === 'pdf' && tgt === 'xlsx') {
      return 'Ruled or simple aligned tables only; unformatted text ignored.';
    }
    return 'Experimental layout extraction; some complex styling may be simplified.';
  }

  showBetaTooltip(fmt: string): boolean {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return (p.get('demo') === 'beta' || p.get('tooltip') === '1') && fmt.toLowerCase() === 'md';
  }
}

