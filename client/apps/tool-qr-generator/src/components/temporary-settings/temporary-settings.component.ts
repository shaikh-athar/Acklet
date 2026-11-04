// client/apps/tool-qr-generator/src/components/temporary-settings/temporary-settings.component.ts
import {
  Component,
  input,
  output,
  model,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ExpiryMode, TempQrRecord } from '../../models/temp-qr.models';
import { TEMP_QR_CONFIG } from '../../config/temp-qr.config';

@Component({
  selector: 'app-qr-temporary-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="temporary-settings-block slide-fade-in" aria-label="Temporary QR code expiry configuration">
      <!-- Expires after -->
      <div class="form-row">
        <div class="form-label-row">
          <label class="form-label">
            <span>Expires after</span>
          </label>
          <div class="expiry-mode-toggle" role="radiogroup" aria-label="Expiry style">
            <button
              type="button"
              class="mini-seg-btn"
              [class.active]="expiryMode() === 'preset'"
              (click)="expiryMode.set('preset')"
            >
              Presets
            </button>
            <button
              type="button"
              class="mini-seg-btn"
              [class.active]="expiryMode() === 'custom'"
              (click)="expiryMode.set('custom')"
            >
              Custom
            </button>
          </div>
        </div>

        @if (expiryMode() === 'preset') {
          <div class="presets-grid" role="radiogroup" aria-label="Expires after presets">
            @for (p of presets; track p.id) {
              <button
                type="button"
                role="radio"
                class="preset-card-btn"
                [class.selected]="preset() === p.id"
                [attr.aria-checked]="preset() === p.id"
                (click)="selectPreset(p.id)"
              >
                <span class="preset-label">{{ p.label }}</span>
              </button>
            }
          </div>
        } @else {
          <!-- Custom: Duration vs Until -->
          <div class="custom-expiry-wrap">
            <div class="segmented-control" role="radiogroup" aria-label="Custom expiry style">
              <button
                type="button"
                role="radio"
                class="segment-btn"
                [class.active]="customStyle() === 'duration'"
                [attr.aria-checked]="customStyle() === 'duration'"
                (click)="customStyle.set('duration')"
              >
                <span>Duration</span>
              </button>
              <button
                type="button"
                role="radio"
                class="segment-btn"
                [class.active]="customStyle() === 'until'"
                [attr.aria-checked]="customStyle() === 'until'"
                (click)="customStyle.set('until')"
              >
                <span>Until</span>
              </button>
            </div>

            @if (customStyle() === 'duration') {
              <div class="duration-input-row">
                <input
                  type="number"
                  min="1"
                  max="365"
                  class="ts-input-field duration-num"
                  [ngModel]="customDurationValue()"
                  (ngModelChange)="onDurationValueChange($event)"
                />
                <select
                  class="ts-select-field duration-unit"
                  [ngModel]="customDurationUnit()"
                  (ngModelChange)="onDurationUnitChange($event)"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            } @else {
              <div class="until-input-row">
                <input
                  type="datetime-local"
                  class="ts-input-field until-input"
                  [ngModel]="customUntilDate()"
                  (ngModelChange)="onUntilDateChange($event)"
                />
              </div>
            }
          </div>
        }
      </div>

      <!-- Expiry Preview Banner -->
      <div class="expiry-preview-banner">
        <ts-icon name="clock" [size]="16" class="expiry-banner-icon" />
        <div class="expiry-banner-text">
          <span class="expiry-abs-text">{{ formattedExpiryString() }}</span>
          <span class="expiry-rel-text">{{ formattedRelativeString() }}</span>
        </div>
      </div>

      @if (expiryValidationError()) {
        <p class="error-notice-text">
          {{ expiryValidationError() }}
        </p>
      }

      <!-- Show expiry on the label Toggle -->
      <div class="label-toggle-row">
        <label class="toggle-checkbox-label">
          <input
            type="checkbox"
            class="ts-checkbox"
            [checked]="showExpiryOnLabel()"
            (change)="toggleShowExpiryOnLabel()"
          />
          <span class="toggle-text">Show expiry on the label</span>
        </label>
        <span class="label-subnote">
          Adds "Valid until ..." under the QR code. If you extend the code later, the printed text does not change.
        </span>
      </div>

      <!-- Storage Notice -->
      <p class="acklet-storage-notice">
        {{ storageNotice }}
      </p>

      <!-- Create Another CTA if code was created -->
      @if (createdRecord()) {
        <div class="create-another-wrap slide-fade-in">
          <button
            type="button"
            class="create-another-btn"
            (click)="createAnother.emit()"
          >
            <ts-icon name="plus" [size]="15" />
            <span>Create another temporary QR code</span>
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

    .temporary-settings-block {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      padding-top: 4px;
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .form-label {
      color: #0F172A;
    }

    /* Segmented controls */
    .segmented-control {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      padding: 4px;
      border-radius: 10px;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .segmented-control {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .segment-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .segment-btn {
      color: #64748B;
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .segment-btn.active,
    :host-context([data-theme="light"]) .segment-btn.active:hover {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
    }

    /* Inputs */
    .ts-input-field,
    .ts-select-field {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: var(--bg-base, #121216);
      color: var(--text, #fcfcfc);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color var(--ts-dur-fast, 150ms) ease,
                  box-shadow var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .ts-input-field,
    :host-context([data-theme="light"]) .ts-select-field {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.15);
      color: #0F172A;
    }

    .ts-input-field:focus,
    .ts-select-field:focus {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    /* Presets & Custom Expiry */
    .expiry-mode-toggle {
      display: inline-flex;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 2px;
    }

    :host-context([data-theme="light"]) .expiry-mode-toggle {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .mini-seg-btn {
      padding: 4px 10px;
      border: none;
      background: transparent;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .mini-seg-btn {
      color: #64748B;
    }

    .mini-seg-btn:hover:not(.active) {
      color: var(--text, #fcfcfc) !important;
    }
    :host-context([data-theme="light"]) .mini-seg-btn:hover:not(.active) {
      color: #0F172A !important;
    }

    .mini-seg-btn.active,
    .mini-seg-btn.active:hover {
      background: var(--bg-surface, #1e1e24) !important;
      color: var(--text, #fcfcfc) !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .mini-seg-btn.active,
    :host-context([data-theme="light"]) .mini-seg-btn.active:hover {
      background: #FFFFFF !important;
      color: #0F172A !important;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .preset-card-btn {
      padding: 9px 8px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
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

    .duration-input-row {
      display: flex;
      gap: 8px;
    }

    .duration-num {
      flex: 1;
    }

    .duration-unit {
      flex: 1.5;
    }

    .until-input-row {
      width: 100%;
    }

    .expiry-preview-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .expiry-preview-banner {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .expiry-banner-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .expiry-banner-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .expiry-abs-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .expiry-abs-text {
      color: #0F172A;
    }

    .expiry-rel-text {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    .error-notice-text {
      font-size: 11.5px;
      color: #EF4444;
      margin: 0;
    }

    .label-toggle-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 2px;
    }

    .toggle-checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .toggle-text {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .toggle-text {
      color: #0F172A;
    }

    .label-subnote {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.35;
      padding-left: 24px;
    }

    .acklet-storage-notice {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.4;
      margin: 0;
      padding: 2px 4px;
    }

    .create-another-wrap {
      padding-top: 4px;
    }

    .create-another-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .create-another-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .create-another-btn:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .create-another-btn:hover {
      background: #F1F5F9;
    }
  `]
})
export class QrTemporarySettingsComponent {
  readonly showExpiryOnLabel = model<boolean>(false);
  readonly expiryMode = model<ExpiryMode>('preset');
  readonly preset = model<string>('24h');
  readonly customStyle = model<'duration' | 'until'>('duration');
  readonly customDurationValue = model<number>(2);
  readonly customDurationUnit = model<'minutes' | 'hours' | 'days'>('hours');
  readonly customUntilDate = model<string>(this.getDefaultUntilDate());

  readonly createdRecord = input<TempQrRecord | null>(null);
  readonly isCreating = input<boolean>(false);

  readonly temporaryChange = output<void>();
  readonly createAnother = output<void>();

  readonly presets = TEMP_QR_CONFIG.presets;
  readonly storageNotice = TEMP_QR_CONFIG.messages.storageNotice;

  selectPreset(id: string): void {
    this.preset.set(id);
    this.temporaryChange.emit();
  }

  onDurationValueChange(num: number): void {
    this.customDurationValue.set(num);
    this.temporaryChange.emit();
  }

  onDurationUnitChange(unit: 'minutes' | 'hours' | 'days'): void {
    this.customDurationUnit.set(unit);
    this.temporaryChange.emit();
  }

  onUntilDateChange(val: string): void {
    this.customUntilDate.set(val);
    this.temporaryChange.emit();
  }

  toggleShowExpiryOnLabel(): void {
    this.showExpiryOnLabel.set(!this.showExpiryOnLabel());
    this.temporaryChange.emit();
  }

  readonly computedExpiryDate = computed<Date>(() => {
    const now = Date.now();
    if (this.expiryMode() === 'preset') {
      const p = this.presets.find(item => item.id === this.preset()) || this.presets[3];
      return new Date(now + p.seconds * 1000);
    }

    if (this.customStyle() === 'duration') {
      const val = this.customDurationValue();
      const unit = this.customDurationUnit();
      let ms = val * 60 * 1000;
      if (unit === 'hours') ms = val * 3600 * 1000;
      if (unit === 'days') ms = val * 86400 * 1000;
      return new Date(now + ms);
    }

    const dStr = this.customUntilDate();
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
    if (diffHrs < 24) return remMin > 0 ? `in ${diffHrs} h ${remMin} min` : `in ${diffHrs} h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  });

  readonly expiryValidationError = computed<string | null>(() => {
    if (this.expiryMode() === 'preset') return null;

    const diffSec = Math.floor((this.computedExpiryDate().getTime() - Date.now()) / 1000);
    if (diffSec < TEMP_QR_CONFIG.limits.minSeconds) {
      return TEMP_QR_CONFIG.messages.minExpiry;
    }
    if (diffSec > TEMP_QR_CONFIG.limits.maxSeconds) {
      return TEMP_QR_CONFIG.messages.maxExpiry;
    }
    return null;
  });

  readonly isExpiryValid = computed<boolean>(() => {
    return this.expiryValidationError() === null;
  });

  private getDefaultUntilDate(): string {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
