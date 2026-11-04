// apps/tool-barcode-generator/src/components/bulk-panel/bulk-panel.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TsIconComponent, ResponsiveService } from '@acklet/tool-shell';
import { firstValueFrom } from 'rxjs';
import {
  BarcodeDesignOptions,
  FormatPerOptions,
  BarcodeFormat,
  BulkOutputType,
  BulkSourceMode,
  BulkRecord
} from '../../models/barcode.models';
import { BARCODE_SYSTEM_LIMITS } from '../../config/barcode-catalog.config';
import {
  LABEL_SHEET_PRESETS,
  LABEL_ROLL_PRESETS,
  LabelSheetPreset,
  LabelRollPreset,
  PageSize
} from '../../config/label-templates.config';
import { BulkGeneratorService, BulkProgress } from '../../services/bulk-generator.service';
import { BulkStateService } from '../../services/bulk-state.service';
import { FormatRegistryService } from '../../services/format-registry.service';
import { TempCodeService } from '../../services/temp-code.service';
import { TEMP_CODE_CONFIG } from '../../config/temp-code.config';
import { PayloadMode, TempContentType } from '../../models/temp-code.models';
import { BarcodeFormatPickerComponent } from '../format-picker/format-picker.component';

@Component({
  selector: 'app-barcode-bulk-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, BarcodeFormatPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bulk-flow-body" [class.is-running-locked]="isRunning()">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TOP ACTIVE RUN BANNER (when generation is running)           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (isRunning()) {
        <div class="active-run-banner" role="status" aria-live="polite">
          <div class="run-header">
            <div class="run-title-row">
              <ts-icon name="refresh-cw" [size]="16" class="spin-animation" />
              <span class="run-title">Bulk generation in progress</span>
            </div>
            <button type="button" class="cancel-run-btn" (click)="onCancel()">Cancel</button>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" [style.width.%]="progress()?.percent || 0"></div>
          </div>
          <div class="run-meta-row">
            <span class="run-count">
              Generating {{ progress()?.completed }} of {{ progress()?.total }} ({{ progress()?.percent }}%)
            </span>
            @if (progress()?.currentValue) {
              <span class="run-current mono-font">{{ progress()?.currentValue }}</span>
            }
          </div>
          <p class="run-locked-note">Settings are locked while generating to prevent resetting.</p>
        </div>
      }

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- SECTION 1: SOURCE                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <section class="bulk-section-card" aria-labelledby="sec-source-title">
        <div class="section-header-row">
          <div class="section-title-wrap">
            <span class="step-num">1</span>
            <h3 id="sec-source-title" class="section-title">Source</h3>
          </div>
          <span class="section-summary-chip">{{ sourceSummaryText() }}</span>
        </div>

        <div class="pill-segmented-control">
          <button
            type="button"
            class="seg-btn"
            [disabled]="isRunning()"
            [class.active]="state.sourceMode() === 'list'"
            (click)="state.sourceMode.set('list')"
          >
            List
          </button>
          <button
            type="button"
            class="seg-btn"
            [disabled]="isRunning()"
            [class.active]="state.sourceMode() === 'csv'"
            (click)="state.sourceMode.set('csv')"
          >
            CSV file
          </button>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- SECTION 2: FORMAT                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <section class="bulk-section-card" aria-labelledby="sec-format-title">
        <div class="section-header-row">
          <div class="section-title-wrap">
            <span class="step-num">2</span>
            <h3 id="sec-format-title" class="section-title">Format</h3>
          </div>
          @if (formatItem()?.label; as lbl) {
            <span class="section-summary-chip">{{ lbl }}</span>
          }
        </div>

        <div class="form-row">
          <div class="form-label-row">
            <label class="form-label">
              <span>Barcode format</span>
              @if (formatRuleSummary(); as rule) {
                <span class="format-rule-badge">{{ rule }}</span>
              }
            </label>
            <span class="label-hint">{{ formatItem()?.category || 'Standard' }}</span>
          </div>
          <app-format-picker
            [value]="state.formatId()"
            [variant]="state.formatOptions().variant || ''"
            [onlyTemporary]="isTemporary()"
            (formatChange)="onFormatChange($event)"
            (variantChange)="onVariantChange($event)"
          />
        </div>

        <!-- Format quiet note when auto-switched -->
        @if (isTemporary() && formatSwitchNote()) {
          <div class="quiet-format-note slide-fade-in" role="status">
            <ts-icon name="info" [size]="14" />
            <span>{{ formatSwitchNote() }}</span>
          </div>
        }

        <!-- Switch after Format: Make these barcodes temporary -->
        <div class="temporary-toggle-row">
          <div class="toggle-text-col">
            <label for="bulk-temp-toggle" class="toggle-title-label">Make these barcodes temporary</label>
            <span class="toggle-helper-text">Stops working after the time you set. Stored on Acklet until it expires.</span>
          </div>
          <label class="ts-switch">
            <input
              id="bulk-temp-toggle"
              type="checkbox"
              [disabled]="isRunning()"
              [checked]="isTemporary()"
              (change)="onToggleTemporary($event)"
            />
            <span class="ts-switch-slider"></span>
          </label>
        </div>

        <!-- Temporary settings for bulk when isTemporary() is true -->
        @if (isTemporary()) {
          <div class="bulk-temp-settings-block slide-fade-in">
            <!-- 1. Show each value when checked -->
            <div class="form-row">
              <label class="form-label">
                <span>Show each value when checked</span>
              </label>
              <div class="segmented-control" role="radiogroup" aria-label="Show each value when checked">
                <button
                  type="button"
                  role="radio"
                  class="segment-btn"
                  [disabled]="isRunning()"
                  [class.active]="tempContentType() === 'MESSAGE'"
                  [attr.aria-checked]="tempContentType() === 'MESSAGE'"
                  (click)="tempContentType.set('MESSAGE')"
                >
                  <ts-icon name="message-square" [size]="14" />
                  <span>Value as message</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  class="segment-btn"
                  [disabled]="isRunning()"
                  [class.active]="tempContentType() === 'REFERENCE_ONLY'"
                  [attr.aria-checked]="tempContentType() === 'REFERENCE_ONLY'"
                  (click)="tempContentType.set('REFERENCE_ONLY')"
                >
                  <ts-icon name="shield-check" [size]="14" />
                  <span>Reference only</span>
                </button>
              </div>
              <p class="field-hint-text">
                {{ tempContentType() === 'MESSAGE' ? 'Each value is displayed as text on its check page while valid.' : 'The check page confirms validity without showing the value.' }}
              </p>
            </div>

            <!-- Optional reference text when Reference Only is selected -->
            @if (tempContentType() === 'REFERENCE_ONLY') {
              <div class="form-row">
                <label for="bulk-temp-ref" class="form-label">
                  <span>Reference text</span>
                  <span class="label-hint">Optional</span>
                </label>
                <input
                  id="bulk-temp-ref"
                  type="text"
                  class="ts-input-field"
                  placeholder="Bulk upload"
                  maxlength="64"
                  [disabled]="isRunning()"
                  [ngModel]="tempReference()"
                  (ngModelChange)="tempReference.set($event)"
                />
              </div>
            }

            <!-- 2. Encode as -->
            <div class="form-row">
              <label class="form-label">
                <span>Encode as</span>
                <span class="label-hint">What the barcodes encode</span>
              </label>
              <div class="segmented-control" role="radiogroup" aria-label="Encode as">
                <button
                  type="button"
                  role="radio"
                  class="segment-btn"
                  [disabled]="isRunning()"
                  [class.active]="tempPayloadMode() === 'LINK'"
                  [attr.aria-checked]="tempPayloadMode() === 'LINK'"
                  (click)="setTempPayloadMode('LINK')"
                >
                  <ts-icon name="link" [size]="14" />
                  <span>Link (verification URL)</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  class="segment-btn"
                  [disabled]="isRunning()"
                  [class.active]="tempPayloadMode() === 'CODE'"
                  [attr.aria-checked]="tempPayloadMode() === 'CODE'"
                  (click)="setTempPayloadMode('CODE')"
                >
                  <ts-icon name="hash" [size]="14" />
                  <span>Code (token only)</span>
                </button>
              </div>
            </div>

            <!-- 3. Expires after -->
            <div class="form-row">
              <div class="form-label-row">
                <label class="form-label">
                  <span>Expires after</span>
                </label>
                <div class="expiry-mode-toggle" role="radiogroup" aria-label="Expiry style">
                  <button
                    type="button"
                    class="mini-seg-btn"
                    [disabled]="isRunning()"
                    [class.active]="tempExpiryMode() === 'preset'"
                    (click)="tempExpiryMode.set('preset')"
                  >
                    Presets
                  </button>
                  <button
                    type="button"
                    class="mini-seg-btn"
                    [disabled]="isRunning()"
                    [class.active]="tempExpiryMode() === 'custom'"
                    (click)="tempExpiryMode.set('custom')"
                  >
                    Custom
                  </button>
                </div>
              </div>

              @if (tempExpiryMode() === 'preset') {
                <div class="presets-grid" role="radiogroup" aria-label="Expires after presets">
                  @for (preset of presets; track preset.id) {
                    <button
                      type="button"
                      role="radio"
                      class="preset-card-btn"
                      [disabled]="isRunning()"
                      [class.selected]="tempPreset() === preset.id"
                      [attr.aria-checked]="tempPreset() === preset.id"
                      (click)="selectPreset(preset.id)"
                    >
                      <span class="preset-label">{{ preset.label }}</span>
                    </button>
                  }
                </div>
              } @else {
                <div class="custom-expiry-wrap">
                  <div class="segmented-control" role="radiogroup" aria-label="Custom expiry style">
                    <button
                      type="button"
                      role="radio"
                      class="segment-btn"
                      [disabled]="isRunning()"
                      [class.active]="customSubMode() === 'duration'"
                      [attr.aria-checked]="customSubMode() === 'duration'"
                      (click)="customSubMode.set('duration')"
                    >
                      <span>Duration</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      class="segment-btn"
                      [disabled]="isRunning()"
                      [class.active]="customSubMode() === 'until'"
                      [attr.aria-checked]="customSubMode() === 'until'"
                      (click)="customSubMode.set('until')"
                    >
                      <span>Until</span>
                    </button>
                  </div>

                  @if (customSubMode() === 'duration') {
                    <div class="duration-inputs-row">
                      <input
                        type="number"
                        class="ts-input-field number-input"
                        [disabled]="isRunning()"
                        [ngModel]="customDurationValue()"
                        (ngModelChange)="onCustomDurationValueChange($event)"
                        min="1"
                        max="525600"
                      />
                      <select
                        class="ts-select unit-select"
                        [disabled]="isRunning()"
                        [ngModel]="customDurationUnit()"
                        (ngModelChange)="onCustomDurationUnitChange($event)"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  } @else {
                    <div class="until-inputs-row">
                      <input
                        type="datetime-local"
                        class="ts-input-field datetime-input"
                        [disabled]="isRunning()"
                        [ngModel]="customUntilDateTime()"
                        (ngModelChange)="onCustomUntilChange($event)"
                      />
                    </div>
                  }
                </div>
              }

              <!-- Formatted Expiry Output Text -->
              <div class="expiry-result-strip" role="status">
                <ts-icon name="clock" [size]="13" />
                <span class="expiry-result-text">{{ formattedExpiryString() }} ({{ formattedRelativeString() }})</span>
              </div>
            </div>

            <!-- Density Warning Banner when payload doesn't fit layout -->
            @if (densityWarning()) {
              <div class="density-warning-banner slide-fade-in" role="alert">
                <ts-icon name="circle-alert" [size]="15" class="warning-icon" />
                <div class="warning-text-col">
                  <span class="warning-title">Barcode density warning</span>
                  <span class="warning-desc">Switch to QR Code or choose a larger label preset.</span>
                </div>
                <button
                  type="button"
                  class="density-fix-btn"
                  [disabled]="isRunning()"
                  (click)="onFormatChange('qrcode')"
                >
                  Switch to QR Code
                </button>
              </div>
            }

            <!-- Notice: Stored on Acklet -->
            <div class="plain-notice-box" role="note">
              <ts-icon name="info" [size]="14" class="notice-icon" />
              <span>These codes are stored on Acklet until they expire and are then deleted.</span>
            </div>
          </div>
        }

        <!-- Customize link -->
        <div class="customize-link-row">
          <span class="hint-text">Colors and text style come from the Customize tab. Size is set by the label.</span>
          <button
            type="button"
            class="link-action-btn"
            [disabled]="isRunning()"
            (click)="switchToCustomize.emit()"
          >
            <span>Customize</span>
            <ts-icon name="arrow-right" [size]="12" />
          </button>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- SECTION 3: DATA                                             -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <section class="bulk-section-card" aria-labelledby="sec-data-title">
        <div class="section-header-row">
          <div class="section-title-wrap">
            <span class="step-num">3</span>
            <h3 id="sec-data-title" class="section-title">Data</h3>
          </div>
          <span class="item-counter" [class.is-limit]="rawRecords().length >= maxItems">
            {{ rawRecords().length }} / {{ maxItems }}
          </span>
        </div>

        <!-- Mode 1: List -->
        @if (state.sourceMode() === 'list') {
          <div class="form-row">
            <textarea
              id="bulk-list-textarea"
              class="ts-textarea mono-input"
              rows="5"
              placeholder="Paste one value per line&#10;ITEM-1001&#10;ITEM-1002&#10;ITEM-1003"
              [disabled]="isRunning()"
              [ngModel]="listRawText()"
              (ngModelChange)="onListTextChange($event)"
              spellcheck="false"
            ></textarea>
            <div class="list-meta-bar">
              <span class="field-helper">{{ listParsedResult().totalFound }} records found</span>
              @if (listParsedResult().suggestsCommaSplit) {
                <button
                  type="button"
                  class="hint-action-btn"
                  [disabled]="isRunning()"
                  (click)="listSeparator.set('comma')"
                >
                  <span>Looks like columns separated by commas. Split into columns?</span>
                </button>
              }
              @if (listParsedResult().suggestsSemicolonSplit) {
                <button
                  type="button"
                  class="hint-action-btn"
                  [disabled]="isRunning()"
                  (click)="listSeparator.set('semicolon')"
                >
                  <span>Looks like columns separated by semicolons. Split into columns?</span>
                </button>
              }
            </div>

            <!-- Separator Select -->
            <div class="row-two-col">
              <div class="sub-field">
                <label class="sub-label"><span>Separator</span></label>
                <select
                  class="ts-select"
                  [disabled]="isRunning()"
                  [ngModel]="listSeparator()"
                  (ngModelChange)="listSeparator.set($event)"
                >
                  <option value="newline">New line only</option>
                  <option value="comma">Comma</option>
                  <option value="semicolon">Semicolon</option>
                  <option value="tab">Tab</option>
                </select>
              </div>

              @if (listParsedResult().detectedColumns > 1) {
                <div class="sub-field toggle-field">
                  <label class="toggle-checkbox-label">
                    <input
                      type="checkbox"
                      [disabled]="isRunning()"
                      [ngModel]="listHasHeader()"
                      (ngModelChange)="listHasHeader.set($event)"
                    />
                    <span>First line is a header</span>
                  </label>
                </div>
              }
            </div>

            <!-- List Preview Chips -->
            @if (rawRecords().length > 0) {
              <div class="preview-mini-strip">
                <span class="strip-label">First 5 records:</span>
                <div class="chip-row">
                  @for (r of rawRecords().slice(0, 5); track r.value) {
                    <span class="record-chip">{{ r.value }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Mode 2: CSV File -->
        @if (state.sourceMode() === 'csv') {
          <div class="form-row">
            @if (!csvFileName()) {
              <div
                class="file-dropzone"
                [class.is-disabled]="isRunning()"
                [class.is-dragover]="isDropzoneActive()"
                (click)="!isRunning() && fileInput.click()"
                (keydown.enter)="!isRunning() && fileInput.click()"
                (keydown.space)="!isRunning() && fileInput.click()"
                (dragover)="onDropzoneDragOver($event)"
                (dragleave)="onDropzoneDragLeave($event)"
                (drop)="onDropzoneDrop($event)"
                tabindex="0"
                role="button"
                aria-label="Upload CSV or TSV file"
              >
                <input
                  #fileInput
                  type="file"
                  accept=".csv,.tsv,.txt"
                  class="hidden-file-input"
                  [disabled]="isRunning()"
                  (change)="onFileSelected($event)"
                />
                <ts-icon name="upload-cloud" [size]="28" class="dropzone-icon" />
                <div class="dropzone-text">
                  <span class="dropzone-title">
                    {{ isDropzoneActive() ? 'Drop CSV or TSV file here' : 'Drop CSV or TSV file here, or click to browse' }}
                  </span>
                  <span class="dropzone-sub">Max file size 2 MB. Up to 500 records.</span>
                </div>
              </div>
            } @else {
              <div class="file-summary-card">
                <div class="file-info-col">
                  <div class="file-name-row">
                    <ts-icon name="file-text" [size]="16" />
                    <span class="file-name">{{ csvFileName() }}</span>
                  </div>
                  <span class="file-stats">
                    {{ csvParsedResult().totalRows }} data rows found • {{ csvParsedResult().headers.length }} columns
                  </span>
                </div>
                <div class="file-actions">
                  <button
                    type="button"
                    class="btn-subtle"
                    [disabled]="isRunning()"
                    (click)="fileInput.click()"
                  >
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    class="btn-subtle is-danger"
                    [disabled]="isRunning()"
                    (click)="onRemoveCsvFile()"
                  >
                    <span>Remove</span>
                  </button>
                  <input
                    #fileInput
                    type="file"
                    accept=".csv,.tsv,.txt"
                    class="hidden-file-input"
                    [disabled]="isRunning()"
                    (change)="onFileSelected($event)"
                  />
                </div>
              </div>

              <!-- Header toggle -->
              <div class="sub-form-row">
                <label class="toggle-checkbox-label">
                  <input
                    type="checkbox"
                    [disabled]="isRunning()"
                    [ngModel]="csvHasHeader()"
                    (ngModelChange)="onCsvHasHeaderChange($event)"
                  />
                  <span>First row is a header</span>
                </label>
              </div>

              <!-- Column Selectors -->
              <div class="row-two-col">
                <div class="sub-field">
                  <label class="sub-label"><span>Which column holds the barcode value?</span></label>
                  <select
                    class="ts-select"
                    [disabled]="isRunning()"
                    [ngModel]="csvValueColIdx()"
                    (ngModelChange)="onCsvValueColChange($event)"
                  >
                    @for (h of csvParsedResult().headers; track h; let i = $index) {
                      <option [ngValue]="i">{{ h }} (Column {{ i + 1 }})</option>
                    }
                  </select>
                </div>

                <div class="sub-field">
                  <label class="sub-label"><span>Which column is the label text? (optional)</span></label>
                  <select
                    class="ts-select"
                    [disabled]="isRunning()"
                    [ngModel]="csvCaptionColIdx()"
                    (ngModelChange)="onCsvCaptionColChange($event)"
                  >
                    <option [ngValue]="-1">None (use barcode value)</option>
                    @for (h of csvParsedResult().headers; track h; let i = $index) {
                      <option [ngValue]="i">{{ h }} (Column {{ i + 1 }})</option>
                    }
                  </select>
                </div>
              </div>

              <!-- CSV Data Table (matching Review table styling) -->
              @if (csvParsedResult().totalRows > 0) {
                <div class="csv-table-wrapper">
                  <div class="csv-table-top-bar">
                    <span class="csv-table-title">CSV Data Table</span>
                    <span class="csv-table-count">
                      {{ csvParsedResult().totalRows }} data rows • {{ csvParsedResult().headers.length }} columns
                    </span>
                  </div>

                  <div class="review-table-container csv-table-container">
                    <table class="review-table csv-table">
                      <thead>
                        <tr>
                          <th class="col-row sticky-col">Row</th>
                          @for (h of csvParsedResult().headers; track h; let colIdx = $index) {
                            <th
                              [class.is-value-col]="colIdx === csvValueColIdx()"
                              [class.is-caption-col]="colIdx === csvCaptionColIdx()"
                            >
                              <div class="th-content">
                                <span class="th-name">{{ h }}</span>
                                @if (colIdx === csvValueColIdx()) {
                                  <span class="col-role-pill is-value">Value</span>
                                } @else if (colIdx === csvCaptionColIdx()) {
                                  <span class="col-role-pill is-caption">Caption</span>
                                }
                              </div>
                            </th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of paginatedCsvRows(); track $index; let rowIdx = $index) {
                          <tr>
                            <td class="col-row sticky-col mono-font">
                              {{ (csvPage() - 1) * 10 + rowIdx + 1 }}
                            </td>
                            @for (cell of row; track $index; let colIdx = $index) {
                              <td
                                [class.is-value-col]="colIdx === csvValueColIdx()"
                                [class.is-caption-col]="colIdx === csvCaptionColIdx()"
                                [class.mono-font]="colIdx === csvValueColIdx()"
                              >
                                {{ cell }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Pagination Bar matching Review table -->
                  @if (csvParsedResult().totalRows > 10) {
                    <div class="table-pagination-bar">
                      <span class="pag-info">
                        Showing {{ (csvPage() - 1) * 10 + 1 }}–{{ Math.min(csvPage() * 10, csvParsedResult().totalRows) }} of {{ csvParsedResult().totalRows }}
                      </span>
                      <div class="pag-btn-group">
                        <button
                          type="button"
                          class="pag-btn"
                          [disabled]="isRunning() || csvPage() <= 1"
                          (click)="csvPage.update(p => p - 1)"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          class="pag-btn"
                          [disabled]="isRunning() || csvPage() * 10 >= csvParsedResult().totalRows"
                          (click)="csvPage.update(p => p + 1)"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        }
      </section>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- SECTION 4: REVIEW                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <section class="bulk-section-card" aria-labelledby="sec-review-title">
        <div class="section-header-row">
          <div class="section-title-wrap">
            <span class="step-num">4</span>
            <h3 id="sec-review-title" class="section-title">Review</h3>
          </div>
          <span
            class="review-summary-chip"
            [class.has-issues]="reviewResult().invalidCount > 0"
          >
            {{ reviewSummaryText() }}
          </span>
        </div>

        <!-- Format Suggestion Chip if available -->
        @if (reviewResult().suggestedFormat; as altFmt) {
          <div class="suggestion-chip-banner">
            <span class="suggestion-text">Values match {{ formatRegistry.getFormat(altFmt)?.label || altFmt }}</span>
            <button
              type="button"
              class="suggestion-switch-btn"
              [disabled]="isRunning()"
              (click)="onFormatChange(altFmt)"
            >
              Switch to {{ formatRegistry.getFormat(altFmt)?.label || altFmt }}
            </button>
          </div>
        }

        <!-- 10-Row Review Table with Pagination -->
        <div class="review-table-container">
          <table class="review-table">
            <thead>
              <tr>
                <th class="col-row">Row</th>
                <th class="col-val">Value</th>
                <th class="col-enc">Encoded as</th>
                <th class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of paginatedReviewRows(); track rec.row) {
                <tr [class.row-invalid]="rec.status === 'invalid'" [class.row-dup]="rec.status === 'duplicate'">
                  <td class="col-row">{{ rec.row }}</td>
                  <td class="col-val mono-font">{{ rec.value }}</td>
                  <td class="col-enc mono-font">{{ rec.cleanValue }}</td>
                  <td class="col-status">
                    @if (rec.status === 'valid') {
                      <span class="status-pill is-valid">
                        <ts-icon name="check" [size]="11" />
                        <span>Valid</span>
                      </span>
                    } @else if (rec.status === 'duplicate') {
                      <span class="status-pill is-dup">Duplicate</span>
                    } @else {
                      <span class="status-pill is-invalid" [title]="rec.errorMessage || 'Invalid'">
                        <ts-icon name="circle-alert" [size]="11" />
                        <span>{{ rec.errorMessage || 'Invalid' }}</span>
                      </span>
                    }
                  </td>
                </tr>
              }
              @if (reviewResult().records.length === 0) {
                <tr>
                  <td colspan="4" class="empty-table-cell">No records to review.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Expand / Pagination Bar for Review Table -->
        @if (reviewResult().records.length > 10) {
          <div class="table-pagination-bar">
            <span class="pag-info">
              Showing {{ (reviewPage() - 1) * 10 + 1 }}–{{ Math.min(reviewPage() * 10, reviewResult().records.length) }} of {{ reviewResult().records.length }}
            </span>
            <div class="pag-btn-group">
              <button
                type="button"
                class="pag-btn"
                [disabled]="isRunning() || reviewPage() <= 1"
                (click)="reviewPage.update(p => p - 1)"
              >
                Previous
              </button>
              <button
                type="button"
                class="pag-btn"
                [disabled]="isRunning() || reviewPage() * 10 >= reviewResult().records.length"
                (click)="reviewPage.update(p => p + 1)"
              >
                Next
              </button>
            </div>
          </div>
        }

        <!-- Review Choices & Checkboxes -->
        <div class="review-options-box">
          <label class="toggle-checkbox-label">
            <input
              type="checkbox"
              [disabled]="isRunning()"
              [ngModel]="state.skipInvalidRows()"
              (ngModelChange)="state.skipInvalidRows.set($event)"
            />
            <span>
              Skip invalid rows
              @if (reviewResult().invalidCount > 0) {
                <span class="count-badge">({{ reviewResult().invalidCount }} found)</span>
              }
            </span>
          </label>

          <label class="toggle-checkbox-label">
            <input
              type="checkbox"
              [disabled]="isRunning()"
              [ngModel]="state.removeDuplicates()"
              (ngModelChange)="state.removeDuplicates.set($event)"
            />
            <span>
              Remove duplicate values
              @if (reviewResult().duplicateCount > 0) {
                <span class="count-badge">({{ reviewResult().duplicateCount }} found)</span>
              }
            </span>
          </label>

          @if (reviewResult().invalidCount > 0) {
            <button
              type="button"
              class="btn-download-errors"
              [disabled]="isRunning()"
              (click)="onDownloadErrorReport()"
            >
              <ts-icon name="download" [size]="13" />
              <span>Download error report (CSV)</span>
            </button>
          }
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- SECTION 5: OUTPUT                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <section class="bulk-section-card" aria-labelledby="sec-output-title">
        <div class="section-header-row">
          <div class="section-title-wrap">
            <span class="step-num">5</span>
            <h3 id="sec-output-title" class="section-title">Output</h3>
          </div>
          <span class="section-summary-chip">{{ outputSummaryText() }}</span>
        </div>

        @if (responsive.isXs()) {
          <div class="output-select-wrap">
            <select
              id="mobile-output-format"
              class="ts-select output-select"
              [disabled]="isRunning()"
              [ngModel]="state.outputType()"
              (ngModelChange)="state.outputType.set($event)"
              aria-label="Output format"
            >
              <option value="print-sheet">Print sheet (PDF)</option>
              <option value="label-roll">Label roll (PDF)</option>
              <option value="zip-png">ZIP of PNG</option>
              <option value="zip-svg">ZIP of SVG</option>
              <option value="sheet-png">Sheet images (PNG)</option>
            </select>
          </div>
        } @else {
          <div class="pill-segmented-control output-types-strip">
            <button
              type="button"
              class="seg-btn"
              [disabled]="isRunning()"
              [class.active]="state.outputType() === 'print-sheet'"
              (click)="state.outputType.set('print-sheet')"
            >
              Print sheet (PDF)
            </button>
            <button
              type="button"
              class="seg-btn"
              [disabled]="isRunning()"
              [class.active]="state.outputType() === 'label-roll'"
              (click)="state.outputType.set('label-roll')"
            >
              Label roll (PDF)
            </button>
            <button
              type="button"
              class="seg-btn"
              [disabled]="isRunning()"
              [class.active]="state.outputType() === 'zip-png'"
              (click)="state.outputType.set('zip-png')"
            >
              ZIP of PNG
            </button>
            <button
              type="button"
              class="seg-btn"
              [disabled]="isRunning()"
              [class.active]="state.outputType() === 'zip-svg'"
              (click)="state.outputType.set('zip-svg')"
            >
              ZIP of SVG
            </button>
            <button
              type="button"
              class="seg-btn"
              [disabled]="isRunning()"
              [class.active]="state.outputType() === 'sheet-png'"
              (click)="state.outputType.set('sheet-png')"
            >
              Sheet images (PNG)
            </button>
          </div>
        }

        <!-- 5A. Print Sheet Options -->
        @if (state.outputType() === 'print-sheet' || state.outputType() === 'sheet-png' || state.outputType() === 'pdf-labels') {
          <div class="output-settings-form">
            <div class="row-two-col">
              <div class="sub-field">
                <label class="sub-label"><span>Page size</span></label>
                <select
                  class="ts-select"
                  [disabled]="isRunning()"
                  [ngModel]="state.pageSize()"
                  (ngModelChange)="onPageSizeChange($event)"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                </select>
              </div>

              <div class="sub-field">
                <label class="sub-label"><span>Label layout</span></label>
                <select
                  class="ts-select"
                  [disabled]="isRunning()"
                  [ngModel]="state.selectedPresetId()"
                  (ngModelChange)="onPresetChange($event)"
                >
                  @for (preset of availablePresets(); track preset.id) {
                    <option [value]="preset.id">{{ preset.name }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Custom layout dimensions if Custom is selected -->
            @if (state.selectedPresetId() === 'custom') {
              <div class="custom-dims-grid">
                <div class="sub-field">
                  <label class="sub-label"><span>Cols</span></label>
                  <input type="number" class="ts-input" min="1" max="10" [disabled]="isRunning()" [ngModel]="state.customPreset().cols" (ngModelChange)="updateCustomCols($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>Rows</span></label>
                  <input type="number" class="ts-input" min="1" max="30" [disabled]="isRunning()" [ngModel]="state.customPreset().rows" (ngModelChange)="updateCustomRows($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>Width (mm)</span></label>
                  <input type="number" class="ts-input" min="5" max="210" [disabled]="isRunning()" [ngModel]="state.customPreset().labelWidthMm" (ngModelChange)="updateCustomWidth($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>Height (mm)</span></label>
                  <input type="number" class="ts-input" min="5" max="297" [disabled]="isRunning()" [ngModel]="state.customPreset().labelHeightMm" (ngModelChange)="updateCustomHeight($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>H Gap (mm)</span></label>
                  <input type="number" class="ts-input" min="0" max="50" [disabled]="isRunning()" [ngModel]="state.customPreset().gapHMm" (ngModelChange)="updateCustomGapH($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>V Gap (mm)</span></label>
                  <input type="number" class="ts-input" min="0" max="50" [disabled]="isRunning()" [ngModel]="state.customPreset().gapVMm" (ngModelChange)="updateCustomGapV($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>Left margin (mm)</span></label>
                  <input type="number" class="ts-input" min="0" max="50" [disabled]="isRunning()" [ngModel]="state.customPreset().leftMarginMm" (ngModelChange)="updateCustomMarginLeft($event)" />
                </div>
                <div class="sub-field">
                  <label class="sub-label"><span>Top margin (mm)</span></label>
                  <input type="number" class="ts-input" min="0" max="50" [disabled]="isRunning()" [ngModel]="state.customPreset().topMarginMm" (ngModelChange)="updateCustomMarginTop($event)" />
                </div>
              </div>

              @if (state.customLayoutError(); as customErr) {
                <div class="custom-layout-error-box" role="alert">
                  <ts-icon name="circle-alert" [size]="14" class="error-icon" />
                  <span>{{ customErr }}</span>
                </div>
              }
            }

            <div class="toggles-row">
              <label class="toggle-checkbox-label">
                <input
                  type="checkbox"
                  [disabled]="isRunning()"
                  [ngModel]="state.showCutGuides()"
                  (ngModelChange)="state.showCutGuides.set($event); state.savePageSetup()"
                />
                <span>Show cut guides</span>
              </label>

              <label class="toggle-checkbox-label">
                <input
                  type="checkbox"
                  [disabled]="isRunning()"
                  [ngModel]="state.showLabelText()"
                  (ngModelChange)="state.showLabelText.set($event)"
                />
                <span>Show label text from caption column</span>
              </label>
            </div>

            <div class="print-actual-size-notice">
              <ts-icon name="info" [size]="13" />
              <span>Print at 100%, actual size. Do not use Fit to page.</span>
            </div>
          </div>
        }

        <!-- 5B. Label Roll Options -->
        @if (state.outputType() === 'label-roll') {
          <div class="output-settings-form">
            <div class="sub-field">
              <label class="sub-label"><span>Roll label size</span></label>
              <select
                class="ts-select"
                [disabled]="isRunning()"
                [ngModel]="state.selectedRollPresetId()"
                (ngModelChange)="state.selectedRollPresetId.set($event); state.savePageSetup()"
              >
                @for (roll of rollPresets; track roll.id) {
                  <option [value]="roll.id">{{ roll.name }}</option>
                }
              </select>
            </div>

            <div class="toggles-row">
              <label class="toggle-checkbox-label">
                <input
                  type="checkbox"
                  [disabled]="isRunning()"
                  [ngModel]="state.showLabelText()"
                  (ngModelChange)="state.showLabelText.set($event)"
                />
                <span>Show label text from caption column</span>
              </label>
            </div>

            <p class="field-helper">Printer resolution: 203 or 300 DPI supported natively.</p>
          </div>
        }
      </section>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- GENERATION COMPLETION & ACTION BAR                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (progress()?.status === 'completed') {
        <div class="bulk-success-card" role="status">
          <div class="success-header-row">
            <div class="success-badge-icon">
              <ts-icon name="check" [size]="16" />
            </div>
            <div class="success-text-col">
              <span class="success-headline">Generation complete</span>
              <span class="success-subtext">{{ progress()?.resultSummary }}</span>
            </div>
          </div>
          <button type="button" class="btn-redownload" [disabled]="isRunning()" (click)="onDownloadExport()">
            <ts-icon name="download" [size]="13" />
            <span>Download {{ outputTypeLabel() }}</span>
          </button>
        </div>
      }

      @if (progress()?.status === 'error') {
        <div class="error-notice" role="alert">
          <ts-icon name="circle-alert" [size]="15" class="error-icon" />
          <span>{{ progress()?.errorMessage }}</span>
        </div>
      }

      <div class="panel-bottom-action">
        <button
          type="button"
          class="primary-bulk-btn"
          [disabled]="isGenerateDisabled()"
          (click)="onGenerateBulk()"
        >
          @if (isRunning()) {
            <ts-icon name="refresh-cw" [size]="16" class="spin-animation" />
            <span>Generating barcodes...</span>
          } @else {
            <ts-icon name="layers" [size]="16" />
            <span>Generate {{ state.activeValidRecords().length }} barcodes</span>
          }
        </button>
      </div>

      <!-- Batch Completed Summary with View Batch in Dashboard CTA -->
      @if (generatedBatchSummary(); as bSummary) {
        <div class="batch-completed-summary slide-fade-in" role="status">
          <div class="summary-info-row">
            <ts-icon name="check" [size]="16" class="summary-check-icon" />
            <span class="summary-text">{{ bSummary.count }} temporary barcodes generated. Batch expires {{ bSummary.expiryFormatted }}.</span>
          </div>
          <button
            type="button"
            class="view-batch-dashboard-btn"
            (click)="onViewBatchInDashboard()"
          >
            <ts-icon name="layout-dashboard" [size]="14" />
            <span>View batch in dashboard</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .bulk-flow-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 24px;
      position: relative;
    }

    @media (max-width: 639px) {
      .bulk-flow-body {
        gap: 16px;
      }
    }

    /* Active Run Card */
    .active-run-banner {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px;
      border-radius: var(--shell-card-radius, 12px);
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.28);
    }

    :host-context([data-theme="light"]) .active-run-banner {
      background: #EFF6FF;
      border-color: rgba(59, 130, 246, 0.35);
    }

    .run-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: nowrap;
    }

    .run-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .run-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--tool-accent, #3B82F6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .spin-animation {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .run-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .run-meta-row {
      color: #0F172A;
    }

    .run-current {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      padding: 1px 6px;
      border-radius: 4px;
    }

    :host-context([data-theme="light"]) .run-current {
      background: #E2E8F0;
      color: #334155;
    }

    .run-locked-note {
      margin: 0;
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .run-locked-note {
      color: #64748B;
    }

    /* Locked state during run */
    .is-running-locked .bulk-section-card:not(.active-run-banner) {
      opacity: 0.65;
      pointer-events: none;
    }

    .bulk-section-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border-radius: var(--shell-card-radius, 12px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .bulk-section-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      min-width: 0;
    }

    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
    }

    .section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .section-title {
      color: #0F172A;
    }

    .section-summary-chip {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    :host-context([data-theme="light"]) .section-summary-chip {
      background: #F1F5F9;
      color: #475569;
    }

    .review-summary-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
    }

    .review-summary-chip.has-issues {
      background: rgba(245, 158, 11, 0.12);
      color: #F59E0B;
    }

    /* Pill Segmented Control */
    .pill-segmented-control {
      display: flex;
      gap: 4px;
      padding: 3px;
      border-radius: 10px;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .pill-segmented-control {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .output-types-strip {
      flex-wrap: wrap;
    }

    .seg-btn {
      flex: 1;
      min-width: 80px;
      padding: 7px 10px;
      min-height: 40px;
      border-radius: 7px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .seg-btn:hover:not(:disabled):not(.active) {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .seg-btn:hover:not(:disabled):not(.active) {
      color: #0F172A;
      background: #F1F5F9;
    }

    .seg-btn.active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .seg-btn.active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    .seg-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    .seg-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 639px) {
      .pill-segmented-control {
        width: 100%;
        display: flex;
      }
      .pill-segmented-control .seg-btn {
        flex: 1 1 0%;
        min-height: 44px;
        min-width: 0;
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
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .label-hint {
      color: #64748B;
    }

    .format-rule-badge {
      font-size: 10.5px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .format-rule-badge {
      background: #F1F5F9;
      color: #475569;
    }

    .item-counter {
      font-size: 11.5px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
    }

    .item-counter.is-limit {
      color: #F59E0B;
    }

    .customize-link-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 4px;
    }

    .hint-text {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      flex: 1;
    }

    .link-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: var(--tool-accent, #3B82F6);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .link-action-btn:hover:not(:disabled) {
      text-decoration: underline;
    }

    .link-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 639px) {
      .customize-link-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .link-action-btn {
        margin-top: 2px;
      }
    }

    /* Inputs */
    .ts-textarea, .ts-input, .ts-select {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border-radius: var(--shell-card-radius, 8px);
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 13px;
      outline: none;
    }

    .ts-textarea {
      min-height: 160px;
      resize: vertical;
    }

    .sub-field .ts-select {
      max-width: 280px;
    }

    @media (max-width: 639px) {
      .ts-textarea {
        min-height: 120px;
      }
      .sub-field .ts-select {
        max-width: 100%;
      }
    }

    :host-context([data-theme="light"]) .ts-textarea,
    :host-context([data-theme="light"]) .ts-input,
    :host-context([data-theme="light"]) .ts-select {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .ts-textarea:focus-visible:not(:disabled),
    .ts-input:focus-visible:not(:disabled),
    .ts-select:focus-visible:not(:disabled) {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
      border-color: var(--tool-accent, #2563EB) !important;
    }

    .ts-textarea:disabled, .ts-input:disabled, .ts-select:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .mono-input, .mono-font {
      font-family: var(--ts-font-mono, monospace);
    }

    .field-helper {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      margin: 2px 0 0;
    }

    .list-meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .hint-action-btn {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      color: var(--tool-accent, #3B82F6);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }

    .row-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 639px) {
      .row-two-col {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }

    .row-three-col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .sub-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sub-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    :host-context([data-theme="light"]) .sub-label {
      color: #475569;
    }

    .locked-badge {
      font-size: 9.5px;
      font-weight: 500;
      color: #F59E0B;
    }

    .toggle-field {
      justify-content: flex-end;
      padding-bottom: 8px;
    }

    .toggle-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text, #fcfcfc);
      cursor: pointer;
      user-select: none;
    }

    :host-context([data-theme="light"]) .toggle-checkbox-label {
      color: #0F172A;
    }

    .count-badge {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .count-badge {
      color: #64748B;
    }

    /* File Dropzone */
    .file-dropzone {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px;
      border-radius: var(--shell-card-radius, 10px);
      background: var(--bg-base, #121216);
      border: 2px dashed var(--border, rgba(255, 255, 255, 0.15));
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .file-dropzone:hover:not(.is-disabled) {
      border-color: var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.04);
    }

    .file-dropzone.is-dragover {
      border-color: var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
      transform: scale(1.01);
    }

    :host-context([data-theme="light"]) .file-dropzone {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .file-dropzone:hover:not(.is-disabled) {
      border-color: #2563EB;
      background: #EFF6FF;
    }

    :host-context([data-theme="light"]) .file-dropzone.is-dragover {
      border-color: #2563EB;
      background: #DBEAFE;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.2);
      transform: scale(1.01);
    }

    .file-dropzone.is-disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .hidden-file-input {
      display: none;
    }

    .dropzone-icon {
      color: var(--tool-accent, #3B82F6);
    }

    .dropzone-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dropzone-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .dropzone-title {
      color: #0F172A;
    }

    .dropzone-sub {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
    }

    .file-summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    :host-context([data-theme="light"]) .file-summary-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .file-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .file-name-row {
      color: #0F172A;
    }

    .file-stats {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    .file-actions {
      display: flex;
      gap: 6px;
    }

    .btn-subtle {
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 11.5px;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-subtle {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      color: #0F172A;
    }

    .btn-subtle.is-danger {
      color: #EF4444;
    }

    .btn-subtle:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Sequence Grid: Balanced 2-column layout */
    .sequence-grid-rebalanced {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .row-padding-check {
      align-items: flex-end;
    }

    .toggle-align-field {
      padding-bottom: 8px;
    }

    .sequence-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 640px) {
      .sequence-grid {
        grid-template-columns: 1fr;
      }
    }

    .preview-sequence-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      border-radius: 8px;
      background: var(--bg-base, #121216);
    }

    :host-context([data-theme="light"]) .preview-sequence-box {
      background: #F8FAFC;
    }

    .preview-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }

    .sequence-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .seq-chip, .record-chip {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      padding: 2px 8px;
      border-radius: 5px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      color: var(--text, #fcfcfc);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .seq-chip,
    :host-context([data-theme="light"]) .record-chip {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .info-badge-note {
      color: #38BDF8;
      font-size: 11.5px;
      margin: 0;
    }

    /* Review & CSV Data Tables */
    .review-table-container,
    .csv-table-container {
      max-height: 360px;
      overflow-y: auto;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-base, #121216);
      scrollbar-width: thin;
    }

    @media (max-width: 639px) {
      .review-table-container,
      .csv-table-container {
        max-height: 240px;
      }
    }

    :host-context([data-theme="light"]) .review-table-container {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .review-table-container::-webkit-scrollbar,
    .csv-table-container::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    .review-table-container::-webkit-scrollbar-thumb,
    .csv-table-container::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 3px;
    }

    :host-context([data-theme="light"]) .review-table-container::-webkit-scrollbar-thumb,
    :host-context([data-theme="light"]) .csv-table-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
    }

    .review-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }

    .review-table th {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .review-table th {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .review-table td {
      padding: 7px 12px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.04));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .review-table td {
      border-color: rgba(0, 0, 0, 0.04);
      color: #0F172A;
    }

    .col-row {
      width: 44px;
      min-width: 44px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
      font-size: 11px;
    }

    :host-context([data-theme="light"]) .col-row {
      color: #64748B;
    }

    /* CSV Preview Table Specifics */
    .csv-table-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      width: 100%;
    }

    .csv-table-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }

    .csv-table-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .csv-table-title {
      color: #0F172A;
    }

    .csv-table-count {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      font-variant-numeric: tabular-nums;
    }

    :host-context([data-theme="light"]) .csv-table-count {
      color: #64748B;
    }

    .csv-table-container {
      max-height: 240px;
    }

    .csv-table {
      min-width: 100%;
      width: max-content;
    }

    .csv-table th,
    .csv-table td {
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    .csv-table th {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .csv-table th.sticky-col,
    .csv-table td.sticky-col {
      position: sticky;
      left: 0;
      width: 44px;
      min-width: 44px;
      text-align: center;
      border-right: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .csv-table th.sticky-col {
      z-index: 4;
      background: var(--bg-elevated, #18181B);
    }

    :host-context([data-theme="light"]) .csv-table th.sticky-col {
      background: #F1F5F9;
      border-right-color: rgba(0, 0, 0, 0.08);
    }

    .csv-table td.sticky-col {
      z-index: 3;
      background: var(--bg-base, #121216);
      color: var(--text-muted, #94a3b8);
      font-size: 11px;
    }

    :host-context([data-theme="light"]) .csv-table td.sticky-col {
      background: #FFFFFF;
      color: #64748B;
      border-right-color: rgba(0, 0, 0, 0.08);
    }

    .th-content {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .th-name {
      font-weight: 600;
    }

    .col-role-pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }

    .col-role-pill.is-value {
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }

    :host-context([data-theme="light"]) .col-role-pill.is-value {
      background: rgba(2, 132, 199, 0.12);
      color: #0284C7;
      border-color: rgba(2, 132, 199, 0.28);
    }

    .col-role-pill.is-caption {
      background: rgba(168, 85, 247, 0.15);
      color: #C084FC;
      border: 1px solid rgba(168, 85, 247, 0.35);
    }

    :host-context([data-theme="light"]) .col-role-pill.is-caption {
      background: rgba(147, 51, 234, 0.12);
      color: #7E22CE;
      border-color: rgba(147, 51, 234, 0.28);
    }

    .csv-table th.is-value-col {
      color: #38BDF8;
    }

    :host-context([data-theme="light"]) .csv-table th.is-value-col {
      color: #0284C7;
    }

    .csv-table td.is-value-col {
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.03);
    }

    :host-context([data-theme="light"]) .csv-table td.is-value-col {
      color: #0369A1;
      background: rgba(2, 132, 199, 0.03);
    }

    .csv-table th.is-caption-col {
      color: #C084FC;
    }

    :host-context([data-theme="light"]) .csv-table th.is-caption-col {
      color: #7E22CE;
    }

    .csv-table td.is-caption-col {
      color: #C084FC;
      background: rgba(168, 85, 247, 0.02);
    }

    :host-context([data-theme="light"]) .csv-table td.is-caption-col {
      color: #7E22CE;
      background: rgba(147, 51, 234, 0.02);
    }

    .csv-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    :host-context([data-theme="light"]) .csv-table tr:hover td {
      background: rgba(0, 0, 0, 0.02);
    }

    .csv-table tr:hover td.is-value-col {
      background: rgba(56, 189, 248, 0.08);
    }

    :host-context([data-theme="light"]) .csv-table tr:hover td.is-value-col {
      background: rgba(2, 132, 199, 0.06);
    }

    .csv-table tr:hover td.is-caption-col {
      background: rgba(168, 85, 247, 0.07);
    }

    :host-context([data-theme="light"]) .csv-table tr:hover td.is-caption-col {
      background: rgba(147, 51, 234, 0.05);
    }

    .row-invalid {
      background: rgba(239, 68, 68, 0.08);
    }

    .row-dup {
      background: rgba(245, 158, 11, 0.06);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 500;
    }

    .status-pill.is-valid {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
    }

    .status-pill.is-dup {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
    }

    .status-pill.is-invalid {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty-table-cell {
      text-align: center;
      padding: 20px;
      color: var(--text-muted, #94a3b8);
    }

    .table-pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    .pag-btn-group {
      display: flex;
      gap: 6px;
    }

    .pag-btn {
      padding: 3px 8px;
      border-radius: 5px;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 11px;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .pag-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      color: #0F172A;
    }

    .pag-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .review-options-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 6px;
    }

    .btn-download-errors {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #EF4444;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-download-errors:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Output Section */
    .output-settings-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 4px;
    }

    .custom-dims-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    @media (min-width: 640px) and (max-width: 1023px) {
      .custom-dims-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 639px) {
      .custom-dims-grid {
        grid-template-columns: 1fr;
      }
    }

    .toggles-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .print-actual-size-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-base, #121216);
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .print-actual-size-notice {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    /* Custom layout validation error banner */
    .custom-layout-error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #F87171;
      font-size: 12px;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .custom-layout-error-box {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #B91C1C;
    }

    .field-subnote {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      margin-top: 3px;
      display: block;
    }

    .field-subnote.is-warn {
      color: #F59E0B;
    }

    .input-with-unit {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-with-unit .ts-input {
      padding-right: 36px;
    }

    .unit-badge {
      position: absolute;
      right: 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      pointer-events: none;
    }

    ::ng-deep .check-digit-highlight {
      color: #10B981 !important;
      font-weight: 700 !important;
    }

    .in-tab-overflow-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
    }

    :host-context([data-theme="light"]) .in-tab-overflow-banner {
      background: #F1F5F9;
      color: #475569;
    }

    /* Actions & Success */
    .panel-bottom-action {
      margin-top: 4px;
    }

    @media (max-width: 639px) {
      .panel-bottom-action {
        position: sticky;
        bottom: 0;
        z-index: 20;
        padding: 10px 0;
        background: var(--bg-surface, #1e1e24);
        border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      }

      :host-context([data-theme="light"]) .panel-bottom-action {
        background: #FFFFFF;
        border-top-color: rgba(0, 0, 0, 0.08);
      }
    }

    .primary-bulk-btn {
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
      transition: background var(--ts-dur-fast, 150ms) ease;
    }

    .primary-bulk-btn:hover:not(:disabled) {
      background: var(--tool-accent-hover, #2563EB);
    }

    .primary-bulk-btn:active:not(:disabled) {
      background: var(--tool-accent-active, #1D4ED8);
    }

    .primary-bulk-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .primary-bulk-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    .bulk-success-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .success-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .success-badge-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #10B981;
      color: #FFFFFF;
      flex-shrink: 0;
    }

    .success-text-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .success-headline {
      font-size: 13px;
      font-weight: 700;
      color: #10B981;
    }

    .success-subtext {
      font-size: 11.5px;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .success-subtext {
      color: #0F172A;
    }

    .btn-redownload {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border: none;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
    }

    .btn-redownload:hover {
      background: var(--tool-accent-hover, #1D4ED8);
    }

    .error-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #EF4444;
      font-size: 12.5px;
      font-weight: 500;
    }

    .field-error-message {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #EF4444;
      font-size: 12px;
      font-weight: 500;
    }

    .suggestion-chip-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .suggestion-text {
      font-size: 12px;
      color: var(--tool-accent, #3B82F6);
      font-weight: 500;
    }

    .suggestion-switch-btn {
      padding: 3px 8px;
      border-radius: 5px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    @media (max-width: 399px) {
      .section-header-row {
        flex-wrap: wrap;
        row-gap: 4px;
      }
      .section-summary-chip {
        max-width: 100%;
      }
      .step-num {
        width: 24px;
        height: 24px;
        font-size: 11px;
      }
      .output-select {
        min-height: 44px;
        font-size: 16px;
      }
      .bulk-section-card {
        padding: 12px;
      }
    }

    /* Temporary Code in Bulk Styles */
    .temporary-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      margin-top: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
    }
    :host-context([data-theme="light"]) .temporary-toggle-row {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }
    .toggle-title-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }
    :host-context([data-theme="light"]) .toggle-title-label {
      color: #0F172A;
    }
    .toggle-helper-text {
      display: block;
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      margin-top: 2px;
    }
    :host-context([data-theme="light"]) .toggle-helper-text {
      color: #64748B;
    }

    .ts-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .ts-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .ts-switch-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      transition: 0.2s ease;
      border-radius: 24px;
    }
    :host-context([data-theme="light"]) .ts-switch-slider {
      background-color: #E2E8F0;
      border-color: rgba(0, 0, 0, 0.15);
    }
    .ts-switch-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background-color: #FFFFFF;
      transition: 0.2s ease;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .ts-switch input:checked + .ts-switch-slider {
      background-color: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
    }
    :host-context([data-theme="light"]) .ts-switch input:checked + .ts-switch-slider {
      background-color: #2563EB;
      border-color: #2563EB;
    }
    .ts-switch input:checked + .ts-switch-slider:before {
      transform: translateX(20px);
    }

    .quiet-format-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-top: 8px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
    }
    :host-context([data-theme="light"]) .quiet-format-note {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
    }

    .bulk-temp-settings-block {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 14px;
      margin-top: 10px;
      border-radius: 10px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }
    :host-context([data-theme="light"]) .bulk-temp-settings-block {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .segmented-control {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 3px;
      gap: 4px;
    }
    :host-context([data-theme="light"]) .segmented-control {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.1);
    }
    .segment-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      min-height: 38px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-muted, #94a3b8);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="light"]) .segment-btn {
      color: #475569;
    }
    .segment-btn:hover:not(.active) {
      color: var(--text, #fcfcfc) !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }
    :host-context([data-theme="light"]) .segment-btn:hover:not(.active) {
      color: #0F172A !important;
      background: rgba(0, 0, 0, 0.06) !important;
    }
    .segment-btn.active,
    .segment-btn.active:hover {
      background: var(--tool-accent, #3B82F6) !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }
    :host-context([data-theme="light"]) .segment-btn.active,
    :host-context([data-theme="light"]) .segment-btn.active:hover {
      background: #2563EB !important;
      color: #FFFFFF !important;
    }

    .expiry-mode-toggle {
      display: inline-flex;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }
    :host-context([data-theme="light"]) .expiry-mode-toggle {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.1);
    }
    .mini-seg-btn {
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }
    :host-context([data-theme="light"]) .mini-seg-btn {
      color: #475569;
    }
    .mini-seg-btn:hover:not(.active) {
      color: var(--text, #fcfcfc) !important;
    }
    :host-context([data-theme="light"]) .mini-seg-btn:hover:not(.active) {
      color: #0F172A !important;
    }
    .mini-seg-btn.active,
    .mini-seg-btn.active:hover {
      background: var(--tool-accent, #3B82F6) !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }
    :host-context([data-theme="light"]) .mini-seg-btn.active,
    :host-context([data-theme="light"]) .mini-seg-btn.active:hover {
      background: #2563EB !important;
      color: #FFFFFF !important;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    @media (max-width: 500px) {
      .presets-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .preset-card-btn {
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="light"]) .preset-card-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      color: #0F172A;
    }
    .preset-card-btn:hover:not(.selected) {
      border-color: var(--tool-accent, #3B82F6) !important;
      background: rgba(59, 130, 246, 0.1) !important;
      color: #60A5FA !important;
    }
    :host-context([data-theme="light"]) .preset-card-btn:hover:not(.selected) {
      background: #EFF6FF !important;
      border-color: #2563EB !important;
      color: #1D4ED8 !important;
    }
    .preset-card-btn.selected,
    .preset-card-btn.selected:hover {
      border-color: var(--tool-accent, #3B82F6) !important;
      background: var(--tool-accent, #3B82F6) !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }
    :host-context([data-theme="light"]) .preset-card-btn.selected,
    :host-context([data-theme="light"]) .preset-card-btn.selected:hover {
      border-color: #2563EB !important;
      background: #2563EB !important;
      color: #FFFFFF !important;
      font-weight: 600;
    }
    .preset-label {
      color: inherit;
    }

    .custom-expiry-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .duration-inputs-row,
    .until-inputs-row {
      display: flex;
      gap: 8px;
    }
    .duration-inputs-row .number-input {
      flex: 1;
    }
    .duration-inputs-row .unit-select {
      flex: 1;
    }

    .expiry-result-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      color: var(--tool-accent, #3B82F6);
      font-size: 11.5px;
      font-weight: 500;
    }
    :host-context([data-theme="light"]) .expiry-result-strip {
      background: #F1F5F9;
      color: #2563EB;
    }

    .density-warning-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
    }
    .warning-icon {
      flex-shrink: 0;
    }
    .warning-text-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .warning-title {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
    }
    .warning-desc {
      font-size: 11px;
      opacity: 0.9;
      line-height: 1.3;
    }
    .density-fix-btn {
      padding: 5px 10px;
      border-radius: 6px;
      background: #F59E0B;
      color: #000000;
      border: none;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .plain-notice-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
    }
    :host-context([data-theme="light"]) .plain-notice-box {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .batch-completed-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    :host-context([data-theme="light"]) .batch-completed-summary {
      background: #ECFDF5;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .summary-info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #10B981;
      font-weight: 500;
    }
    :host-context([data-theme="light"]) .summary-info-row {
      color: #047857;
    }
    .summary-check-icon {
      color: #10B981;
      flex-shrink: 0;
    }
    :host-context([data-theme="light"]) .summary-check-icon {
      color: #047857;
    }
    .view-batch-dashboard-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text, #fcfcfc);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    :host-context([data-theme="light"]) .view-batch-dashboard-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.15);
      color: #0F172A;
    }
    .view-batch-dashboard-btn:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }
    :host-context([data-theme="light"]) .view-batch-dashboard-btn:hover {
      background: #F1F5F9;
    }
  `]
})
export class BarcodeBulkPanelComponent implements OnInit {
  readonly responsive = inject(ResponsiveService);
  readonly bulkService = inject(BulkGeneratorService);
  readonly formatRegistry = inject(FormatRegistryService);
  readonly state = inject(BulkStateService);
  readonly sanitizer = inject(DomSanitizer);
  readonly tempCodeService = inject(TempCodeService);

  readonly format = input<BarcodeFormat>('code128');
  readonly formatOptions = input<FormatPerOptions>({});
  readonly designOptions = input.required<BarcodeDesignOptions>();
  readonly barcodeName = input<string>('Barcode 1');

  readonly formatChangeRequest = output<BarcodeFormat>();
  readonly switchToCustomize = output<void>();
  readonly viewBatchInDashboard = output<string>();

  readonly maxItems = BARCODE_SYSTEM_LIMITS.maxListItems;
  readonly rollPresets = LABEL_ROLL_PRESETS;
  readonly Math = Math;

  // Mode 1: List
  readonly listRawText = signal<string>('');
  readonly listSeparator = signal<'newline' | 'comma' | 'semicolon' | 'tab'>('newline');
  readonly listHasHeader = signal<boolean>(false);

  // Temporary Codes in Bulk
  readonly isTemporary = signal<boolean>(false);
  readonly previousFormat = signal<string>('code128');
  readonly formatSwitchNote = signal<string | null>(null);
  readonly tempContentType = signal<TempContentType>('MESSAGE');
  readonly tempReference = signal<string>('Bulk upload');
  readonly tempPayloadMode = signal<PayloadMode>('LINK');
  readonly tempExpiryMode = signal<'preset' | 'custom'>('preset');
  readonly tempPreset = signal<string>('24h');
  readonly customSubMode = signal<'duration' | 'until'>('duration');
  readonly customDurationValue = signal<number>(24);
  readonly customDurationUnit = signal<'minutes' | 'hours' | 'days'>('hours');
  readonly customUntilDateTime = signal<string>('');
  readonly presets = TEMP_CODE_CONFIG.presets;
  private bulkBatchRunId = `bulk-batch-${Date.now()}`;
  readonly generatedBatchSummary = signal<{ batchId: string; count: number; expiryFormatted: string } | null>(null);

  readonly computedExpiryDate = computed<Date>(() => {
    const now = Date.now();
    if (this.tempExpiryMode() === 'preset') {
      const p = this.presets.find(item => item.id === this.tempPreset()) || this.presets[3];
      return new Date(now + p.seconds * 1000);
    }

    if (this.customSubMode() === 'duration') {
      const val = this.customDurationValue();
      const unit = this.customDurationUnit();
      let ms = val * 60 * 1000;
      if (unit === 'hours') ms = val * 3600 * 1000;
      if (unit === 'days') ms = val * 86400 * 1000;
      return new Date(now + ms);
    }

    const dStr = this.customUntilDateTime();
    if (!dStr) return new Date(now + 86400 * 1000);
    const parsed = new Date(dStr);
    return isNaN(parsed.getTime()) ? new Date(now + 86400 * 1000) : parsed;
  });

  readonly formattedExpiryString = computed<string>(() => {
    const d = this.computedExpiryDate();
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'long'
      });
      return `Expires ${formatter.format(d)}`;
    } catch {
      return `Expires ${d.toLocaleString()}`;
    }
  });

  readonly formattedRelativeString = computed<string>(() => {
    const target = this.computedExpiryDate().getTime();
    const diffMs = target - Date.now();
    if (diffMs <= 0) return 'Expired';
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) return `in ${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    if (diffHrs < 24) {
      return remMin > 0 ? `in ${diffHrs} h ${remMin} min` : `in ${diffHrs} hours`;
    }
    const diffDays = Math.round(diffHrs / 24);
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  });

  readonly densityWarning = computed<boolean>(() => {
    if (!this.isTemporary()) return false;
    const fmt = this.state.formatId();
    if (fmt === 'qrcode' || fmt === 'datamatrix' || fmt === 'aztec' || fmt === 'pdf417') {
      return false;
    }
    if (this.tempPayloadMode() === 'LINK') {
      const preset = this.state.currentPreset();
      if (preset && preset.labelWidthMm < 90) {
        return true;
      }
    }
    return false;
  });

  // Mode 2: CSV
  readonly csvFileName = this.state.csvFileName;
  readonly csvRawText = this.state.csvRawText;
  readonly csvHasHeader = this.state.csvHasHeader;
  readonly csvValueColIdx = this.state.csvValueColIdx;
  readonly csvCaptionColIdx = this.state.csvCaptionColIdx;

  readonly isDropzoneActive = signal<boolean>(false);

  // CSV and Review table pagination
  readonly csvPage = signal<number>(1);
  readonly reviewPage = signal<number>(1);

  // Run progress
  readonly progress = signal<BulkProgress | null>(null);

  // Computed isRunning flag
  readonly isRunning = computed<boolean>(() => {
    return this.progress()?.status === 'running' || this.state.isRunning();
  });

  constructor() {
    // 1. Keep BulkStateService.reviewedRecords in sync with our computed reviewResult (NO writes inside computed!)
    effect(() => {
      const rev = this.reviewResult();
      this.state.reviewedRecords.set(rev.records);
    });

    // 2. Keep formatId in sync with parent format() input
    effect(() => {
      const f = this.format();
      if (f && f !== this.state.formatId()) {
        this.state.formatId.set(f);
      }
    });

    // 3. Keep formatOptions in sync with parent formatOptions() input
    effect(() => {
      const opts = this.formatOptions();
      if (opts) {
        this.state.formatOptions.set(opts);
      }
    });

    // 4. Trigger bulk generation or download when requested by Bulk Preview
    effect(() => {
      const trig = this.state.triggerGenerateRun();
      if (trig > 0) {
        if (!this.state.isGenerated()) {
          this.onGenerateBulk();
        } else {
          this.onDownloadExport();
        }
      }
    });
  }

  ngOnInit(): void {
    const initialFmt = this.format() || this.state.formatId() || 'code128';
    this.state.formatId.set(initialFmt);
    if (this.formatOptions()) {
      this.state.formatOptions.set(this.formatOptions());
    }
  }

  getSafeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  readonly formatItem = computed(() => {
    return this.formatRegistry.getFormat(this.state.formatId());
  });

  readonly formatRuleSummary = computed<string>(() => {
    const item = this.formatItem();
    if (!item) return '';
    const f = this.state.formatId();
    const vId = this.state.formatOptions().variant;
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

  readonly availablePresets = computed<LabelSheetPreset[]>(() => {
    const sz = this.state.pageSize();
    return LABEL_SHEET_PRESETS.filter(p => p.pageSize === sz || p.isAutoGrid || p.isCustom);
  });

  // Source summaries
  readonly sourceSummaryText = computed<string>(() => {
    const m = this.state.sourceMode();
    if (m === 'list') {
      return `List (${this.rawRecords().length} items)`;
    } else {
      return this.csvFileName() ? `CSV (${this.csvFileName()})` : 'CSV file';
    }
  });

  readonly outputSummaryText = computed<string>(() => {
    const o = this.state.outputType();
    if (o === 'print-sheet' || o === 'pdf-labels') return `Print sheet (${this.state.currentPreset().name})`;
    if (o === 'label-roll') return `Label roll (${this.state.currentRollPreset().name})`;
    if (o === 'zip-png') return 'ZIP of PNG';
    if (o === 'zip-svg') return 'ZIP of SVG';
    return 'Sheet images (PNG)';
  });

  // Parsers
  readonly listParsedResult = computed(() => {
    return this.bulkService.parseList(
      this.listRawText(),
      this.listSeparator(),
      this.listHasHeader()
    );
  });

  readonly csvParsedResult = computed(() => {
    return this.bulkService.parseCsv(
      this.csvRawText(),
      this.csvValueColIdx(),
      this.csvCaptionColIdx(),
      'auto',
      this.csvHasHeader()
    );
  });

  // Extract raw { value, labelText } records depending on sourceMode
  readonly rawRecords = computed<{ value: string; labelText?: string }[]>(() => {
    const m = this.state.sourceMode();
    if (m === 'list') {
      return this.listParsedResult().records;
    } else {
      const csv = this.csvParsedResult();
      return csv.values.map((v, i) => ({
        value: v,
        labelText: csv.labelTexts[i]
      }));
    }
  });

  // Pure review & validation of all raw records (no writes to signals inside computed!)
  readonly reviewResult = computed(() => {
    const raw = this.rawRecords();
    const item = this.formatItem();
    if (!item || raw.length === 0) {
      return {
        records: [] as BulkRecord[],
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0
      };
    }

    const isRoll = this.state.outputType() === 'label-roll';
    const labelWidthMm = isRoll
      ? this.state.currentRollPreset().widthMm
      : this.state.currentPreset().labelWidthMm;
    const labelHeightMm = isRoll
      ? this.state.currentRollPreset().heightMm
      : this.state.currentPreset().labelHeightMm;

    return this.bulkService.reviewRecords(
      raw,
      item,
      this.state.formatOptions(),
      labelWidthMm,
      labelHeightMm,
      isRoll,
      this.state.removeDuplicates()
    );
  });

  readonly paginatedReviewRows = computed<BulkRecord[]>(() => {
    const all = this.reviewResult().records;
    const page = this.reviewPage();
    const start = (page - 1) * 10;
    return all.slice(start, start + 10);
  });

  readonly paginatedCsvRows = computed<string[][]>(() => {
    const all = this.csvParsedResult().allRows;
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / 10));
    const page = Math.min(Math.max(1, this.csvPage()), maxPage);
    const start = (page - 1) * 10;
    return all.slice(start, start + 10);
  });

  readonly reviewSummaryText = computed<string>(() => {
    const rev = this.reviewResult();
    const parts: string[] = [];
    parts.push(`${rev.validCount} valid`);
    if (rev.invalidCount > 0) {
      parts.push(`${rev.invalidCount} need attention`);
    }
    if (rev.duplicateCount > 0) {
      parts.push(`${rev.duplicateCount} duplicates`);
    }
    return parts.join(', ');
  });

  readonly isGenerateDisabled = computed<boolean>(() => {
    if (this.isRunning()) return true;
    if (this.state.customLayoutError() !== null) return true;
    const rev = this.reviewResult();
    if (rev.records.length === 0) return true;
    if (rev.validCount === 0) return true;
    // Disabled if invalid records exist and skipInvalidRows is not checked
    if (rev.invalidCount > 0 && !this.state.skipInvalidRows()) return true;
    return false;
  });

  formatValueWithCheckDigit(val: string): SafeHtml {
    if (!val) return '';
    const item = this.formatItem();
    if (item?.checksumType && item.checksumType !== 'none' && val.length > 1) {
      const body = val.slice(0, -1);
      const checkDigit = val.slice(-1);
      const html = `${body}<span class="check-digit-highlight">${checkDigit}</span>`;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }
    return this.sanitizer.bypassSecurityTrustHtml(val);
  }

  onFormatChange(newFmt: string): void {
    this.state.formatId.set(newFmt);
    this.state.formatOptions.set({});
    this.formatChangeRequest.emit(newFmt as BarcodeFormat);
  }

  onVariantChange(newVariant: string): void {
    this.state.formatOptions.update(opts => ({ ...opts, variant: newVariant }));
  }

  onListTextChange(text: string): void {
    this.listRawText.set(text);
    this.reviewPage.set(1);
  }

  onDropzoneDragOver(event: DragEvent): void {
    if (this.isRunning()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDropzoneActive.set(true);
  }

  onDropzoneDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropzoneActive.set(false);
  }

  onDropzoneDrop(event: DragEvent): void {
    if (this.isRunning()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDropzoneActive.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) return;
    this.processFile(inputEl.files[0]);
    inputEl.value = '';
  }

  onCsvHasHeaderChange(hasHeader: boolean): void {
    this.csvHasHeader.set(hasHeader);
    this.csvPage.set(1);
    this.reviewPage.set(1);
  }

  onCsvValueColChange(idx: number): void {
    this.csvValueColIdx.set(idx);
    this.reviewPage.set(1);
  }

  onCsvCaptionColChange(idx: number): void {
    this.csvCaptionColIdx.set(idx);
    this.reviewPage.set(1);
  }

  processFile(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      this.state.showBulkAlert('File too large', 'File size exceeds the 2 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      this.state.loadCsvFile(file.name, text);
      this.csvPage.set(1);
      this.reviewPage.set(1);
    };
    reader.readAsText(file);
  }

  onRemoveCsvFile(): void {
    this.state.clearCsvFile();
    this.csvPage.set(1);
    this.reviewPage.set(1);
  }

  onPageSizeChange(newSize: PageSize): void {
    this.state.pageSize.set(newSize);
    const available = this.availablePresets();
    if (!available.some(p => p.id === this.state.selectedPresetId())) {
      this.state.selectedPresetId.set(available[0]?.id || 'a4-3x8');
    }
    this.state.savePageSetup();
  }

  onPresetChange(newPresetId: string): void {
    this.state.selectedPresetId.set(newPresetId);
    this.state.savePageSetup();
  }

  updateCustomCols(cols: number): void {
    this.state.customPreset.update(p => ({ ...p, cols: Math.max(1, Number(cols) || 1) }));
  }

  updateCustomRows(rows: number): void {
    this.state.customPreset.update(p => ({ ...p, rows: Math.max(1, Number(rows) || 1) }));
  }

  updateCustomWidth(w: number): void {
    this.state.customPreset.update(p => ({ ...p, labelWidthMm: Math.max(5, Number(w) || 10) }));
  }

  updateCustomHeight(h: number): void {
    this.state.customPreset.update(p => ({ ...p, labelHeightMm: Math.max(5, Number(h) || 10) }));
  }

  updateCustomGapH(gap: number): void {
    this.state.customPreset.update(p => ({ ...p, gapHMm: Math.max(0, Number(gap) || 0) }));
  }

  updateCustomGapV(gap: number): void {
    this.state.customPreset.update(p => ({ ...p, gapVMm: Math.max(0, Number(gap) || 0) }));
  }

  updateCustomMarginLeft(m: number): void {
    this.state.customPreset.update(p => ({ ...p, leftMarginMm: Math.max(0, Number(m) || 0) }));
  }

  updateCustomMarginTop(m: number): void {
    this.state.customPreset.update(p => ({ ...p, topMarginMm: Math.max(0, Number(m) || 0) }));
  }

  onDownloadErrorReport(): void {
    const csvContent = this.bulkService.generateErrorReportCsv(this.reviewResult().records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.bulkService.triggerDownload(blob, `barcode-bulk-errors-${this.state.formatId()}.csv`);
  }

  onCancel(): void {
    this.bulkService.cancel();
    this.state.isRunning.set(false);
    this.state.resetGenerated();
    this.progress.set(null);
  }

  onToggleTemporary(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.isTemporary.set(checked);
    this.bulkBatchRunId = `bulk-batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.generatedBatchSummary.set(null);

    if (checked) {
      this.previousFormat.set(this.state.formatId());
      const supported = this.formatRegistry.getTemporaryFormats();
      const current = this.state.formatId();
      if (!supported.some(f => f.id === current)) {
        const target = this.tempPayloadMode() === 'LINK' ? 'qrcode' : 'code128';
        this.onFormatChange(target as BarcodeFormat);
        this.formatSwitchNote.set('Switched to QR Code. Links need a 2D code or a long barcode.');
      }
    } else {
      this.formatSwitchNote.set(null);
      const prev = this.previousFormat();
      if (prev && prev !== this.state.formatId()) {
        this.onFormatChange(prev as BarcodeFormat);
      }
    }
  }

  selectPreset(id: string): void {
    this.tempPreset.set(id);
  }

  setTempPayloadMode(mode: PayloadMode): void {
    this.tempPayloadMode.set(mode);
    if (this.isTemporary()) {
      const current = this.state.formatId();
      if (mode === 'LINK' && current === 'code128') {
        this.onFormatChange('qrcode');
        this.formatSwitchNote.set('Switched to QR Code. Links need a 2D code or a long barcode.');
      } else if (mode === 'CODE' && current === 'qrcode') {
        this.onFormatChange('code128');
        this.formatSwitchNote.set(null);
      }
    }
  }

  onCustomDurationValueChange(val: any): void {
    this.customDurationValue.set(Math.max(1, parseInt(val, 10) || 1));
  }

  onCustomDurationUnitChange(unit: 'minutes' | 'hours' | 'days'): void {
    this.customDurationUnit.set(unit);
  }

  onCustomUntilChange(val: string): void {
    this.customUntilDateTime.set(val);
  }

  onViewBatchInDashboard(): void {
    const summary = this.generatedBatchSummary();
    if (summary) {
      this.viewBatchInDashboard.emit(summary.batchId);
    }
  }

  async prepareTemporaryRecordsIfActive(records: BulkRecord[]): Promise<BulkRecord[]> {
    if (!this.isTemporary() || records.length === 0) {
      return records;
    }

    const items = records.map((r, i) => ({
      name: r.labelText || `Barcode ${i + 1}`,
      content: this.tempContentType() === 'MESSAGE' ? r.value : undefined,
      reference: this.tempContentType() === 'REFERENCE_ONLY' ? (this.tempReference() || 'Bulk upload') : undefined
    }));

    const durationSeconds = Math.max(60, Math.floor((this.computedExpiryDate().getTime() - Date.now()) / 1000));
    const expiresAt = this.computedExpiryDate().toISOString();

    const batchRes = await firstValueFrom(
      this.tempCodeService.createBatch({
        items,
        idempotencyKey: this.bulkBatchRunId,
        payloadMode: this.tempPayloadMode(),
        contentType: this.tempContentType(),
        barcodeFormat: this.state.formatId(),
        durationSeconds,
        expiresAt,
        showExpiryOnLabel: false
      })
    );

    this.generatedBatchSummary.set({
      batchId: batchRes.batchId,
      count: batchRes.totalCount,
      expiryFormatted: this.formattedExpiryString().replace('Expires ', '')
    });

    return records.map((r, i) => {
      const bItem = batchRes.items[i];
      if (!bItem) return r;
      return {
        ...r,
        cleanValue: bItem.payload,
        displayValue: bItem.payload,
        token: bItem.token,
        checkUrl: bItem.verifyUrl,
        expiresAt: bItem.expiresAt,
        name: bItem.name
      };
    });
  }

  async onGenerateBulk(): Promise<void> {
    if (this.isGenerateDisabled() || this.isRunning()) return;

    this.progress.set(null);
    this.state.isRunning.set(true);

    try {
      let activeRecords = this.state.reviewedRecords();
      if (this.isTemporary()) {
        activeRecords = await this.prepareTemporaryRecordsIfActive(activeRecords);
      }

      const runResult = (await this.bulkService.runBulk(
        {
          formatId: this.state.formatId(),
          formatOptions: this.state.formatOptions(),
          designOptions: this.designOptions(),
          records: activeRecords,
          outputType: this.state.outputType(),
          labelPreset: this.state.currentPreset(),
          rollPreset: this.state.currentRollPreset(),
          startAtLabel: 1,
          showValueText: this.state.showValueText(),
          showLabelText: this.state.showLabelText(),
          textSizePt: 'auto',
          showCutGuides: this.state.showCutGuides(),
          copies: 1,
          fitMode: this.state.fitMode(),
          skipInvalidRows: this.state.skipInvalidRows(),
          removeDuplicates: this.state.removeDuplicates(),
          nudgeXmm: 0,
          nudgeYmm: 0,
          dpi: this.state.exportDpi(),
          baseFileName: this.barcodeName() || `Barcode-${this.state.activeValidRecords().length}`,
          captionStyle: this.state.captionStyle(),
          exportImmediately: false
        },
        prog => {
          this.progress.set(prog);
        }
      )) as any;

      if (runResult && runResult.successfulItems && runResult.verificationSummary) {
        this.state.setGenerated(
          runResult.successfulItems.map((item: any) => ({
            value: item.value,
            cleanValue: item.value,
            displayValue: item.labelItem?.displayValue || item.value,
            labelText: item.labelItem?.labelText,
            svg: item.svg,
            verified: item.verified,
            error: item.verifyError
          })),
          runResult.verificationSummary,
          runResult.pageModels,
          runResult.rollModels
        );
      }
    } finally {
      this.state.isRunning.set(false);
    }
  }

  async onDownloadExport(verifiedOnly = false): Promise<void> {
    if (this.isRunning()) return;

    const baseRecords = this.state.reviewedRecords();
    let recordsToExport = baseRecords;
    if (verifiedOnly && this.state.verificationSummary()?.failedItems?.length) {
      const failedIndices = new Set(this.state.verificationSummary()!.failedItems.map(f => f.index));
      recordsToExport = baseRecords.filter((_, idx) => !failedIndices.has(idx + 1));
    }

    this.state.isRunning.set(true);
    try {
      if (this.isTemporary()) {
        recordsToExport = await this.prepareTemporaryRecordsIfActive(recordsToExport);
      }

      await this.bulkService.runBulk(
        {
          formatId: this.state.formatId(),
          formatOptions: this.state.formatOptions(),
          designOptions: this.designOptions(),
          records: recordsToExport,
          outputType: this.state.outputType(),
          labelPreset: this.state.currentPreset(),
          rollPreset: this.state.currentRollPreset(),
          startAtLabel: 1,
          showValueText: this.state.showValueText(),
          showLabelText: this.state.showLabelText(),
          textSizePt: 'auto',
          showCutGuides: this.state.showCutGuides(),
          copies: 1,
          fitMode: this.state.fitMode(),
          skipInvalidRows: this.state.skipInvalidRows(),
          removeDuplicates: this.state.removeDuplicates(),
          nudgeXmm: 0,
          nudgeYmm: 0,
          dpi: this.state.exportDpi(),
          baseFileName: this.barcodeName() || `Barcode-${this.state.activeValidRecords().length}`,
          captionStyle: this.state.captionStyle(),
          exportImmediately: true
        },
        prog => {
          this.progress.set(prog);
        }
      );
    } finally {
      this.state.isRunning.set(false);
    }
  }

  outputTypeLabel(): string {
    const o = this.state.outputType();
    if (o === 'print-sheet' || o === 'pdf-labels') return 'PDF sheet';
    if (o === 'label-roll') return 'Roll PDF';
    if (o === 'zip-png') return 'ZIP of PNG';
    if (o === 'zip-svg') return 'ZIP of SVG';
    return 'Sheet images (PNG)';
  }
}
