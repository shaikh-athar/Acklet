// apps/tool-barcode-generator/src/components/content-panel/content-panel.component.ts
import {
  Component,
  input,
  output,
  model,
  computed,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { getToolUrl } from '@acklet/shared';
import {
  BarcodeFormat,
  FormatPerOptions,
  BarcodeValidationResult
} from '../../models/barcode.models';
import { BARCODE_REGISTRY, detectFormatSuggestion } from '../../config/barcode-registry';
import { RETAIL_NOTICE } from '../../config/barcode-catalog.config';
import { BarcodeFormatPickerComponent } from '../format-picker/format-picker.component';

@Component({
  selector: 'app-barcode-content-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, BarcodeFormatPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="content-panel-body">
      <!-- 1. Barcode Name Input Field -->
      <div class="form-row">
        <div class="form-label-row">
          <label for="barcode-name-input" class="form-label">
            <span>Barcode Name</span>
            <span class="label-hint">For export files</span>
          </label>
        </div>
        <div class="input-wrapper">
          <ts-icon name="file-text" class="input-leading-icon" />
          <input
            id="barcode-name-input"
            type="text"
            class="ts-input-field"
            placeholder="Barcode 1"
            [ngModel]="barcodeName()"
            (ngModelChange)="barcodeName.set($event)"
            maxlength="60"
          />
          @if (barcodeName()) {
            <button
              type="button"
              class="clear-input-btn"
              (click)="barcodeName.set('')"
              aria-label="Clear barcode name"
            >
              <ts-icon name="x" [size]="14" />
            </button>
          }
        </div>
      </div>

      <!-- 2. Symbology Format Picker -->
      <div class="form-row">
        <label class="form-label">
          <span>Format</span>
          <span class="label-hint">{{ formatItem()?.category || 'Standard' }}</span>
        </label>
        <app-format-picker
          [value]="format()"
          [variant]="formatOptions().variant || ''"
          (formatChange)="onFormatSelect($event)"
          (variantChange)="onVariantChange($event)"
        />
      </div>

      <!-- 3. Value Input Field -->
      <div class="form-row">
        <div class="form-label-row">
          <label for="barcode-value-input" class="form-label">
            <span>Value</span>
            @if (formatRuleSummary(); as rule) {
              <span class="format-rule-badge">{{ rule }}</span>
            }
          </label>

          <!-- Character counter for all formats with target or maximum length -->
          @if (charCounter(); as counter) {
            <span
              class="char-counter"
              [class.is-complete]="counter.isComplete"
              [class.is-under]="counter.isUnder"
              [class.is-over]="counter.isOver"
            >
              {{ counter.text }}
            </span>
          }
        </div>

        <div class="input-wrapper" [class.has-error]="validation().errorMessage">
          <ts-icon name="barcode" class="input-leading-icon" />
          <input
            #valueInput
            id="barcode-value-input"
            type="text"
            class="ts-input-field mono-input"
            [placeholder]="formatPlaceholder()"
            [attr.inputmode]="formatInputMode()"
            maxlength="10000"
            [ngModel]="value()"
            (input)="onNativeInput($event)"
            (beforeinput)="onBeforeValueInput($event)"
            (compositionstart)="onCompositionStart()"
            (compositionend)="onCompositionEnd($event)"
            (paste)="onValuePaste($event)"
            autocomplete="off"
            spellcheck="false"
          />
          @if (value()) {
            <button
              type="button"
              class="clear-input-btn"
              (click)="value.set('')"
              aria-label="Clear value"
            >
              <ts-icon name="x" [size]="14" />
            </button>
          }
        </div>

        <!-- Inline Error Message -->
        @if (validation().errorMessage) {
          <div class="field-error-message" role="alert">
            <ts-icon name="circle-alert" [size]="14" />
            <span>{{ validation().errorMessage }}</span>
          </div>
        }

        <!-- Auto Check Digit Notice -->
        @if (validation().checkDigitAdded) {
          <div class="check-digit-notice">
            <ts-icon name="check" [size]="14" class="notice-icon" />
            <span>Check digit {{ validation().checkDigitAdded }} added.</span>
          </div>
        }

        <!-- Quick Action Prompt Row -->
        @if (hasActionPrompts()) {
          <div class="action-prompt-row">
            @if (validation().suggestedAction === 'fix-check-digit' && validation().suggestedCheckDigit) {
              <button type="button" class="action-prompt-btn" (click)="onFixCheckDigit()">
                <ts-icon name="check" [size]="13" />
                <span>Fix check digit to {{ validation().suggestedCheckDigit }}</span>
              </button>
            }
            @if (validation().suggestedAction === 'strip-non-digits') {
              <button type="button" class="action-prompt-btn" (click)="onStripNonDigits()">
                <ts-icon name="wand" [size]="13" />
                <span>Remove non-digits</span>
              </button>
            }
            @if (validation().suggestedAction === 'prepend-zero') {
              <button type="button" class="action-prompt-btn" (click)="onPrependZero()">
                <span>Add leading 0</span>
              </button>
            }
            @if (validation().suggestedAction === 'uppercase') {
              <button type="button" class="action-prompt-btn" (click)="onUppercase()">
                <span>Convert to uppercase</span>
              </button>
            }
            @if (validation().suggestedAction === 'convert-upce') {
              <button type="button" class="action-prompt-btn" (click)="onConvertUpce()">
                <span>Convert to UPC-E</span>
              </button>
            }
            @if (!validation().valid && exampleValueForVariant() && value() !== exampleValueForVariant()) {
              <button type="button" class="action-prompt-btn-secondary" (click)="onUseExample()">
                <ts-icon name="sparkles" [size]="13" />
                <span>Try example: {{ exampleValueForVariant() }}</span>
              </button>
            }
          </div>
        }

        <!-- Auto-detect Suggestion Chip -->
        @if (formatSuggestion(); as suggested) {
          @if (!dismissedSuggestions().has(suggested)) {
            <div class="suggestion-chip-banner">
              <span class="suggestion-text">Value matches {{ formatLabel(suggested) }}</span>
              <div class="suggestion-btn-group">
                <button
                  type="button"
                  class="suggestion-switch-btn"
                  (click)="onFormatSelect(suggested)"
                >
                  Switch to {{ formatLabel(suggested) }}
                </button>
                <button
                  type="button"
                  class="suggestion-dismiss-btn"
                  (click)="onDismissSuggestion(suggested)"
                  aria-label="Dismiss suggestion"
                  title="Dismiss"
                >
                  <ts-icon name="x" [size]="12" />
                </button>
              </div>
            </div>
          }
        }

        <!-- Smart QR Suggestion -->
        @if (validation().suggestQr) {
          <div class="qr-suggestion-banner">
            <ts-icon name="qr-code" [size]="14" class="qr-icon" />
            <span>This content works better as a QR code.</span>
            <a [href]="qrToolUrl()" target="_blank" rel="noopener" class="qr-link">
              Open QR Generator
            </a>
          </div>
        }

        <!-- Helper line -->
        <p class="format-helper-text">{{ formatHelperLine() }}</p>

        <!-- Plain Retail Notice -->
        @if (formatItem()?.category === 'Retail') {
          <div class="retail-compliance-box">
            <ts-icon name="info" [size]="13" class="retail-info-icon" />
            <span>{{ retailNotice }}</span>
          </div>
        }
      </div>

      <!-- 4. Format-Specific Options -->
      @if (hasFormatSpecificOptions()) {
        <div class="format-options-section">
          <span class="options-section-title">Format Options</span>

          <!-- Retail Add-On (EAN-13, UPC-A, ISSN) -->
          @if (supportsAddon()) {
            <div class="sub-form-row">
              <label class="sub-label" for="addon-input">Add-on (Optional 2 or 5 digits)</label>
              <input
                id="addon-input"
                type="text"
                class="ts-input-field mono-input sub-input"
                placeholder="e.g. 02 or 54321"
                maxlength="5"
                inputmode="numeric"
                [ngModel]="formatOptions().addon || ''"
                (ngModelChange)="onAddonInput($event)"
                (beforeinput)="onBeforeAddonInput($event)"
              />
            </div>
          }

          <!-- Code 39: Include Check Digit -->
          @if (format() === 'code39') {
            <label class="toggle-control-label">
              <input
                type="checkbox"
                class="ts-checkbox"
                [ngModel]="formatOptions().includeCheckDigit"
                (ngModelChange)="updateFormatOption('includeCheckDigit', $event)"
              />
              <span class="toggle-text">Calculate Modulo-43 check digit</span>
            </label>
          }

          <!-- ITF-14: Bearer Bars -->
          @if (format() === 'itf14') {
            <div class="sub-form-row">
              <label class="sub-label">Bearer bars</label>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="(formatOptions().bearerBars || 'top-bottom') === 'top-bottom'"
                  (click)="updateFormatOption('bearerBars', 'top-bottom')"
                >
                  Top and bottom
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().bearerBars === 'frame'"
                  (click)="updateFormatOption('bearerBars', 'frame')"
                >
                  Full frame
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().bearerBars === 'none'"
                  (click)="updateFormatOption('bearerBars', 'none')"
                >
                  None
                </button>
              </div>
            </div>
          }

          <!-- Interleaved 2 of 5: Auto Prepend Zero -->
          @if (format() === 'itf') {
            <label class="toggle-control-label">
              <input
                type="checkbox"
                class="ts-checkbox"
                [ngModel]="formatOptions().autoPrependZero !== false"
                (ngModelChange)="updateFormatOption('autoPrependZero', $event)"
              />
              <span class="toggle-text">Add leading 0 when length is odd</span>
            </label>
          }

          <!-- Codabar: Start & Stop Characters -->
          @if (format() === 'codabar') {
            <div class="codabar-guards-row">
              <div class="sub-field">
                <label class="sub-label">Start character</label>
                <select
                  class="ts-select-small"
                  [ngModel]="formatOptions().codabarStart || 'A'"
                  (ngModelChange)="updateFormatOption('codabarStart', $event)"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div class="sub-field">
                <label class="sub-label">Stop character</label>
                <select
                  class="ts-select-small"
                  [ngModel]="formatOptions().codabarStop || 'B'"
                  (ngModelChange)="updateFormatOption('codabarStop', $event)"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          }

          <!-- Data Matrix (Phase B): Shape -->
          @if (format() === 'datamatrix') {
            <div class="sub-form-row">
              <label class="sub-label">Shape</label>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="(formatOptions().shape || 'square') === 'square'"
                  (click)="updateFormatOption('shape', 'square')"
                >
                  Square
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().shape === 'rectangular'"
                  (click)="updateFormatOption('shape', 'rectangular')"
                >
                  Rectangular
                </button>
              </div>
            </div>
          }

          <!-- PDF417 (Phase B): Security Level -->
          @if (format() === 'pdf417') {
            <div class="sub-form-row">
              <label class="sub-label">Security level</label>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().securityLevel === undefined || formatOptions().securityLevel === null"
                  (click)="updateFormatOption('securityLevel', undefined)"
                >
                  Auto
                </button>
                @for (lvl of [0, 1, 2, 3, 4, 5, 6, 7, 8]; track lvl) {
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="formatOptions().securityLevel === lvl"
                    (click)="updateFormatOption('securityLevel', lvl)"
                  >
                    Level {{ lvl }}
                  </button>
                }
              </div>
              <p class="field-hint-text">Higher levels survive more damage and make the barcode larger.</p>
            </div>
          }

          <!-- Aztec (Phase B): Error Correction -->
          @if (format() === 'aztec') {
            <div class="sub-form-row">
              <label class="sub-label">Error correction</label>
              <div class="pill-group">
                @for (ec of [10, 30, 50]; track ec) {
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="(formatOptions().errorCorrectionPercent ?? 30) === ec"
                    (click)="updateFormatOption('errorCorrectionPercent', ec)"
                  >
                    {{ ec }}%
                  </button>
                }
              </div>
              <p class="field-hint-text">Higher error correction survives more damage and makes the barcode larger.</p>
            </div>
          }

          <!-- MSI Plessey (Phase B): Check Digit Algorithm -->
          @if (format() === 'msi') {
            <div class="sub-form-row">
              <label class="sub-label">Check digit algorithm</label>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="(formatOptions().msiCheck || 'mod10') === 'mod10'"
                  (click)="updateFormatOption('msiCheck', 'mod10')"
                >
                  Mod 10
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().msiCheck === 'mod11'"
                  (click)="updateFormatOption('msiCheck', 'mod11')"
                >
                  Mod 11
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().msiCheck === 'mod1010'"
                  (click)="updateFormatOption('msiCheck', 'mod1010')"
                >
                  Mod 10/10
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="formatOptions().msiCheck === 'none'"
                  (click)="updateFormatOption('msiCheck', 'none')"
                >
                  None
                </button>
              </div>
            </div>
          }

          <!-- GS1 DataBar Expanded Stacked: Segments per row -->
          @if (format() === 'gs1-databar' && formatOptions().variant === 'expanded-stacked') {
            <div class="sub-form-row">
              <label class="sub-label">Segments per row</label>
              <div class="pill-group">
                @for (seg of [2, 4, 6, 8]; track seg) {
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="(formatOptions().segments ?? 4) === seg"
                    (click)="updateFormatOption('segments', seg)"
                  >
                    {{ seg }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- GS1 DataBar Limited rule hint -->
          @if (format() === 'gs1-databar' && formatOptions().variant === 'limited') {
            <div class="plain-hint-box">
              <ts-icon name="info" [size]="13" />
              <span>Limited accepts GTINs starting with 0 or 1.</span>
            </div>
          }

          <!-- GS1 DataBar Expanded rule hint -->
          @if (format() === 'gs1-databar' && (formatOptions().variant === 'expanded' || formatOptions().variant === 'expanded-stacked')) {
            <div class="plain-hint-box">
              <ts-icon name="info" [size]="13" />
              <span>Use parentheses for Application Identifiers, for example (01)00012345678905(10)ABC123</span>
            </div>
          }
        </div>
      }

      <!-- 5. Bottom Navigation Action -->
      <div class="panel-bottom-action">
        <button
          type="button"
          class="primary-customize-btn"
          (click)="customizeClick.emit()"
        >
          <ts-icon name="sliders" [size]="16" />
          <span>Customize Design</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .content-panel-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    @media (max-width: 639px) {
      .content-panel-body {
        gap: 16px;
      }
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .save-separate-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      min-height: 36px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .save-separate-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    .save-separate-btn:hover {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .save-separate-btn {
      background: #EFF6FF;
      border-color: #3B82F6;
      color: #1D4ED8;
    }

    :host-context([data-theme="light"]) .save-separate-btn:hover {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .form-label {
      color: #0F172A;
    }

    .label-hint {
      font-size: 11px;
      font-weight: 400;
      color: var(--text-muted, #94a3b8);
    }

    .format-rule-badge {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 1px 7px;
      border-radius: 4px;
    }

    :host-context([data-theme="light"]) .format-rule-badge {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.06);
      color: #64748B;
    }

    .char-counter {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      padding: 1px 6px;
      border-radius: 4px;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .char-counter {
      background: #F1F5F9;
      color: #64748B;
    }

    .char-counter.is-complete {
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
    }

    .char-counter.is-under {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.12);
    }

    .char-counter.is-over {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: var(--shell-card-radius, 12px);
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  box-shadow var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="light"]) .input-wrapper {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .input-wrapper:focus-within {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 0 3px var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
    }

    .input-wrapper.has-error {
      border-color: #EF4444;
    }

    .input-wrapper.has-error:focus-within {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }

    .input-leading-icon {
      margin-left: 14px;
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .ts-input-field {
      flex: 1;
      min-width: 0;
      padding: 12px 14px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text, #fcfcfc);
      font-size: 14px;
      font-family: inherit;
    }

    :host-context([data-theme="light"]) .ts-input-field {
      color: #0F172A;
    }

    .ts-input-field::placeholder {
      color: var(--text-muted, #94a3b8);
      opacity: 0.6;
    }

    .mono-input {
      font-family: var(--ts-font-mono, monospace);
      letter-spacing: 0.05em;
    }

    .clear-input-btn {
      padding: 6px 12px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--ts-dur-fast, 150ms) ease;
    }

    .clear-input-btn:hover {
      color: var(--text, #fcfcfc);
    }

    .field-error-message {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #EF4444;
      margin-top: 2px;
    }

    .check-digit-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin-top: 2px;
    }

    .notice-icon {
      color: #10B981;
    }

    .action-prompt-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .action-prompt-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      border: 1px solid var(--tool-accent, #3B82F6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.1));
      color: var(--tool-accent, #3B82F6);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .action-prompt-btn {
      color: #1D4ED8;
      border-color: #2563EB;
      background: #EFF6FF;
    }

    .action-prompt-btn:hover {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    .action-prompt-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.2));
      background: var(--bg-surface, rgba(255, 255, 255, 0.04));
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .action-prompt-btn-secondary {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.16);
      color: #475569;
    }

    .action-prompt-btn-secondary:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      border-color: var(--tool-accent, #3B82F6);
    }

    .suggestion-chip-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.2));
      font-size: 12px;
      color: var(--text, #fcfcfc);
      margin-top: 4px;
    }

    :host-context([data-theme="light"]) .suggestion-chip-banner {
      color: #0F172A;
    }

    .suggestion-btn-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .suggestion-dismiss-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .suggestion-dismiss-btn:hover {
      background: var(--bg-hover, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .suggestion-dismiss-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .suggestion-switch-btn {
      padding: 3px 8px;
      border-radius: 5px;
      border: none;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) ease, opacity var(--ts-dur-fast, 150ms) ease;
    }

    .suggestion-switch-btn:hover {
      background: var(--tool-accent-hover, #2563EB) !important;
      color: #FFFFFF !important;
      opacity: 0.92;
    }

    .suggestion-switch-btn:active {
      background: var(--tool-accent-active, #1D4ED8) !important;
      color: #FFFFFF !important;
    }

    .qr-suggestion-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin-top: 4px;
    }

    .qr-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .qr-link {
      margin-left: auto;
      color: var(--tool-accent, #3B82F6);
      text-decoration: none;
      font-weight: 500;
    }

    .qr-link:hover {
      text-decoration: underline;
    }

    .format-helper-text {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin: 2px 0 0;
    }

    .retail-compliance-box {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      font-size: 11px;
      line-height: 1.4;
      color: var(--text-muted, #94a3b8);
      margin-top: 4px;
    }

    .retail-info-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Format Specific Options */
    .format-options-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      border-radius: var(--shell-card-radius, 12px);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .format-options-section {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .options-section-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sub-form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sub-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }

    .sub-input {
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 8px 12px;
      background: var(--bg-surface, #1e1e24);
      font-size: 13px;
    }

    :host-context([data-theme="light"]) .sub-input {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .toggle-control-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .toggle-control-label {
      color: #0F172A;
    }

    .ts-checkbox {
      accent-color: var(--tool-accent, #3B82F6);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .pill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pill-btn {
      padding: 5px 10px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .pill-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .pill-btn:hover:not(.active) {
      color: var(--text, #0f172a);
      background: var(--bg-surface-hover, rgba(15, 23, 42, 0.08));
    }

    :host-context([data-theme="dark"]) .pill-btn:hover:not(.active),
    [data-theme="dark"] .pill-btn:hover:not(.active) {
      color: var(--text, #fcfcfc);
      background: rgba(255, 255, 255, 0.12);
    }

    .pill-btn.active {
      background: var(--tool-accent, #2563EB) !important;
      border-color: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .pill-btn.active {
      background: #2563EB !important;
      border-color: #2563EB !important;
      color: #FFFFFF !important;
    }

    .pill-btn.active:hover {
      background: var(--tool-accent-hover, #1D4ED8) !important;
      border-color: var(--tool-accent-hover, #1D4ED8) !important;
      color: #FFFFFF !important;
    }

    .pill-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    .codabar-guards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .sub-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ts-select-small {
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      font-size: 13px;
      outline: none;
    }

    :host-context([data-theme="light"]) .ts-select-small {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .plain-hint-box {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--bg-surface, rgba(255, 255, 255, 0.03));
    }

    .panel-bottom-action {
      margin-top: 4px;
    }

    .primary-customize-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 18px;
      min-height: 44px;
      border-radius: var(--shell-card-radius, 12px);
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      transition: background var(--ts-dur-fast, 150ms) ease,
                  transform var(--ts-dur-press, 100ms) ease;
    }

    .primary-customize-btn:hover {
      background: var(--tool-accent-hover, #2563EB);
    }

    .primary-customize-btn:active {
      transform: scale(0.99);
    }

    @media (max-width: 639px) {
      .primary-customize-btn {
        background: var(--bg-surface-hover, rgba(255, 255, 255, 0.05));
        color: var(--tool-accent, #3B82F6);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
        font-size: 13px;
        font-weight: 500;
        min-height: 40px;
        padding: 8px 14px;
      }
      :host-context([data-theme="light"]) .primary-customize-btn {
        background: #F8FAFC;
        color: #2563EB;
        border-color: #CBD5E1;
      }
      .primary-customize-btn:hover {
        background: var(--bg-surface-hover, rgba(255, 255, 255, 0.1));
        border-color: var(--tool-accent, #3B82F6);
      }
      :host-context([data-theme="light"]) .primary-customize-btn:hover {
        background: #EFF6FF;
        border-color: #2563EB;
      }
    }

    @media (max-width: 399px) {
      .ts-input-field {
        font-size: 16px;
        min-height: 44px;
      }
      .content-panel-body {
        gap: 14px;
      }
    }
  `]
})
export class BarcodeContentPanelComponent {
  readonly barcodeName = model<string>('Barcode 1');
  readonly format = model<BarcodeFormat>('code128');
  readonly value = model<string>('');
  readonly formatOptions = model<FormatPerOptions>({});
  readonly validation = input.required<BarcodeValidationResult>();
  readonly canSaveSeparate = input<boolean>(false);

  readonly customizeClick = output<void>();
  readonly saveSeparate = output<void>();
  readonly formatChangeRequest = output<BarcodeFormat>();

  readonly retailNotice = RETAIL_NOTICE;

  readonly dismissedSuggestions = signal<Set<string>>(new Set());

  readonly formatItem = computed(() => BARCODE_REGISTRY[this.format()]);

  readonly formatSuggestion = computed(() => {
    return detectFormatSuggestion(this.value(), this.format());
  });

  readonly hasFormatSpecificOptions = computed(() => {
    const f = this.format();
    return (
      this.supportsAddon() ||
      f === 'code39' ||
      f === 'itf14' ||
      f === 'itf' ||
      f === 'codabar' ||
      f === 'datamatrix' ||
      f === 'pdf417' ||
      f === 'aztec' ||
      f === 'msi' ||
      f === 'gs1-databar'
    );
  });

  supportsAddon(): boolean {
    const f = this.format();
    return f === 'ean13' || f === 'upca' || f === 'ean8' || f === 'isbn' || f === 'issn';
  }

  readonly qrToolUrl = computed<string>(() => {
    return getToolUrl('qr');
  });

  readonly exampleValueForVariant = computed<string>(() => {
    const f = this.format();
    const vId = this.formatOptions().variant;
    if (f === 'gs1-databar') {
      if (vId === 'expanded' || vId === 'expanded-stacked') {
        return '(01)09521234543213(3103)000123';
      }
      return '09521234543213';
    }
    return this.formatItem()?.exampleValue || '';
  });

  formatLabel(formatId: BarcodeFormat): string {
    return BARCODE_REGISTRY[formatId]?.label || formatId;
  }

  readonly formatInputMode = computed<'text' | 'numeric'>(() => {
    return this.formatItem()?.inputMode === 'numeric' ? 'numeric' : 'text';
  });

  readonly maxAllowedLength = computed<number | undefined>(() => {
    const item = this.formatItem();
    if (!item) return undefined;
    if (item.length?.fixed) return item.length.fixed;
    if (item.length?.max) return item.length.max;
    return undefined;
  });

  readonly formatPlaceholder = computed<string>(() => {
    const item = this.formatItem();
    if (!item) return 'Enter value';
    if (item.length?.fixed) {
      return `e.g. ${item.exampleValue} (${item.length.fixed} digits)`;
    }
    return `e.g. ${item.exampleValue}`;
  });

  readonly formatRuleSummary = computed<string>(() => {
    const item = this.formatItem();
    if (!item) return '';
    const f = this.format();
    const vId = this.formatOptions().variant;
    if (item.variants?.length && vId) {
      const variant = item.variants.find(v => v.id === vId);
      if (variant?.helperChip) {
        return variant.helperChip;
      }
    }
    switch (f) {
      case 'ean13':
        return '12 or 13 digits · GS1 checksum';
      case 'ean8':
        return '7 or 8 digits · GS1 checksum';
      case 'upca':
        return '11 or 12 digits · GS1 checksum';
      case 'upce':
        return '6, 7 or 8 digits';
      case 'itf14':
        return '13 or 14 digits · Bearer bars';
      case 'itf':
        return 'Even number of digits';
      case 'isbn':
        return '10 or 13 digits (978 or 979)';
      case 'code39':
        return 'A-Z, 0-9, - . $ / + % · Max 43';
      case 'code93':
        return 'A-Z, 0-9, - . $ / + % · Max 50';
      case 'codabar':
        return '0-9, - $ : / . + · Guards A-D';
      case 'code128':
        return 'Any ASCII text · Max 80';
      default:
        if (item.length?.fixed) {
          return `${item.length.fixed} ${item.inputMode === 'numeric' ? 'digits' : 'characters'}`;
        }
        return `${item.length?.min || 1} to ${item.length?.max || 80} ${item.inputMode === 'numeric' ? 'digits' : 'characters'}`;
    }
  });

  readonly formatHelperLine = computed<string>(() => {
    const item = this.formatItem();
    if (!item) return 'Barcode data';
    const vId = this.formatOptions().variant;
    if (item.variants?.length && vId) {
      const variant = item.variants.find(v => v.id === vId);
      if (variant?.helperLine) {
        return variant.helperLine;
      }
    }
    return item.description || 'Barcode data';
  });

  readonly charCounter = computed<{ text: string; isComplete: boolean; isUnder: boolean; isOver: boolean } | null>(() => {
    const item = this.formatItem();
    const current = this.value().length;
    const v = this.validation();

    if (this.format() === 'gs1-databar') {
      const vId = this.formatOptions().variant;
      if (vId === 'expanded' || vId === 'expanded-stacked') {
        const max = 90;
        return {
          text: `${current} / ${max}`,
          isComplete: current >= 1 && current <= max && v.valid,
          isUnder: current === 0,
          isOver: current > max
        };
      }
    }

    if (v.isFixedLength && v.targetLength) {
      const target = v.targetLength;
      return {
        text: `${current} / ${target}`,
        isComplete: current === target && v.valid,
        isUnder: current > 0 && current < target,
        isOver: current > target
      };
    }

    if (item?.length) {
      const min = item.length.min || 1;
      const max = item.length.max || 80;
      return {
        text: `${current} / ${max}`,
        isComplete: current >= min && current <= max && v.valid,
        isUnder: current > 0 && current < min,
        isOver: current > max
      };
    }

    return null;
  });

  readonly hasActionPrompts = computed(() => {
    const v = this.validation();
    const hasSuggested = !!v.suggestedAction;
    const hasExample = !v.valid && !!this.formatItem()?.exampleValue && this.value() !== this.formatItem()?.exampleValue;
    return hasSuggested || hasExample;
  });

  onFormatSelect(newFormat: BarcodeFormat): void {
    if (this.format() !== newFormat) {
      this.formatChangeRequest.emit(newFormat);
    } else {
      const newItem = BARCODE_REGISTRY[newFormat];
      this.formatOptions.set({ ...(newItem?.defaultOptions || {}) });
    }
  }

  onDismissSuggestion(formatId: string): void {
    const next = new Set(this.dismissedSuggestions());
    next.add(formatId);
    this.dismissedSuggestions.set(next);
  }

  onVariantChange(newVariant: string): void {
    const current = this.formatOptions();
    this.formatOptions.set({
      ...current,
      variant: newVariant
    });
  }

  private isComposing = false;

  private applyCaseAndSeparators(val: string): string {
    const item = this.formatItem();
    let res = val;
    if (item?.caseMode === 'upper') {
      res = res.toUpperCase();
    } else if (item?.caseMode === 'lower') {
      res = res.toLowerCase();
    }
    return res;
  }

  onCompositionStart(): void {
    this.isComposing = true;
  }

  onCompositionEnd(event: any): void {
    this.isComposing = false;
    this.onNativeInput(event);
  }

  onBeforeValueInput(event: any): void {
    if (this.formatInputMode() === 'numeric') {
      const data = event.data;
      if (data && /\D/.test(data)) {
        event.preventDefault();
      }
    }
  }

  onNativeInput(event: Event): void {
    if (this.isComposing) return;
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl) return;

    const raw = inputEl.value;
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;

    let processed = raw;
    const item = this.formatItem();
    if (item?.caseMode === 'upper') {
      processed = processed.toUpperCase();
    } else if (item?.caseMode === 'lower') {
      processed = processed.toLowerCase();
    }

    if (processed !== raw) {
      inputEl.value = processed;
      if (start !== null && end !== null) {
        inputEl.setSelectionRange(start, end);
      }
    }

    this.value.set(processed);
  }

  onValuePaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!pasted) return;

    event.preventDefault();
    const item = this.formatItem();
    let transformed = pasted;
    if (item?.caseMode === 'upper') {
      transformed = transformed.toUpperCase();
    } else if (item?.caseMode === 'lower') {
      transformed = transformed.toLowerCase();
    }

    const target = event.target as HTMLInputElement;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const current = this.value();
    const nextVal = current.slice(0, start) + transformed + current.slice(end);
    // Hard cap 10,000 characters only to protect performance; never truncate per-format limits
    const finalVal = nextVal.length > 10000 ? nextVal.slice(0, 10000) : nextVal;

    this.value.set(finalVal);
    target.value = finalVal;
    const newPos = Math.min(start + transformed.length, finalVal.length);
    target.setSelectionRange(newPos, newPos);
  }

  onBeforeAddonInput(event: any): void {
    const data = event.data;
    if (data && /\D/.test(data)) {
      event.preventDefault();
    }
  }

  onAddonInput(newAddon: string): void {
    const cleaned = newAddon.replace(/\D/g, '').slice(0, 5);
    const addonType = cleaned.length === 2 ? 'ean2' : cleaned.length === 5 ? 'ean5' : 'none';
    this.formatOptions.set({
      ...this.formatOptions(),
      addon: cleaned,
      addonType
    });
  }

  onFixCheckDigit(): void {
    const check = this.validation().suggestedCheckDigit;
    if (!check) return;
    const current = this.value();
    const digits = current.replace(/\D/g, '');
    const targetLen = this.validation().targetLength || 13;
    if (digits.length === targetLen) {
      this.value.set(current.slice(0, -1) + check);
    } else if (digits.length === targetLen - 1) {
      this.value.set(current + check);
    } else {
      this.value.set(digits.slice(0, targetLen - 1) + check);
    }
  }

  onStripNonDigits(): void {
    const cleaned = this.value().replace(/\D/g, '');
    this.value.set(cleaned);
  }

  onUseExample(): void {
    const ex = this.exampleValueForVariant();
    if (ex) {
      this.value.set(ex);
    }
  }

  onPrependZero(): void {
    this.value.set('0' + this.value());
  }

  onUppercase(): void {
    this.value.set(this.value().toUpperCase());
  }

  onConvertUpce(): void {
    this.format.set('upce');
  }

  updateFormatOption(key: keyof FormatPerOptions, val: any): void {
    const current = this.formatOptions();
    this.formatOptions.set({
      ...current,
      [key]: val
    });
  }
}
