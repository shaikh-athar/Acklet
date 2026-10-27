// client/apps/tool-qr-generator/src/components/error-correction-selector/error-correction-selector.component.ts
import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ErrorCorrectionLevel,
  EC_LEVEL_CONFIGS,
  ECLevelConfig
} from '../../models/qr-generator.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-error-correction-selector',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ec-selector-root">
      <div class="ec-header-row">
        <label class="ec-title-label">
          <ts-icon name="shield" class="section-icon" />
          <span>Error Correction</span>
        </label>
        <span class="ec-active-badge">Level {{ errorCorrection() }} ({{ activeConfig().recovery }})</span>
      </div>

      <!-- Compact Segmented Control -->
      <div class="ec-segmented-track" role="radiogroup" aria-label="Error Correction Level">
        @for (levelKey of levels; track levelKey) {
          <button
            type="button"
            role="radio"
            class="ec-segment-btn"
            [class.active]="errorCorrection() === levelKey"
            [attr.aria-checked]="errorCorrection() === levelKey"
            (click)="selectLevel(levelKey)"
            [title]="ecConfigs[levelKey].description"
          >
            <span class="level-code">{{ levelKey }}</span>
            <span class="recovery-tag">{{ ecConfigs[levelKey].recovery }}</span>
            @if (ecConfigs[levelKey].recommended) {
              <span class="rec-star" title="Recommended">★</span>
            }
          </button>
        }
      </div>

      <p class="ec-desc">
        {{ activeConfig().description }}
      </p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ec-selector-root {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ec-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ec-title-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .section-icon {
      width: 15px;
      height: 15px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .ec-active-badge {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, var(--accent, #3b82f6));
      font-weight: 600;
    }

    /* Compact Segmented Control Track */
    .ec-segmented-track {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      padding: 3px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-control, 10px);
    }

    .ec-segment-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 32px;
      padding: 0 6px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      transition: all 150ms ease;
    }

    .ec-segment-btn:hover:not(.active) {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }

    .ec-segment-btn.active {
      background: var(--surface-1, #111A2E);
      border-color: var(--tool-accent-border, var(--border-strong, rgba(59, 130, 246, 0.4)));
      color: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .level-code {
      font-weight: 700;
    }

    .recovery-tag {
      font-size: 10px;
      opacity: 0.8;
    }

    .rec-star {
      font-size: 10px;
      color: #f59e0b;
    }

    .ec-desc {
      margin: 0;
      font-size: 11.5px;
      line-height: 15px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }
  `]
})
export class ErrorCorrectionSelectorComponent {
  readonly errorCorrection = input<ErrorCorrectionLevel>('M');
  readonly errorCorrectionChange = output<ErrorCorrectionLevel>();

  readonly levels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
  readonly ecConfigs = EC_LEVEL_CONFIGS;

  readonly activeConfig = computed<ECLevelConfig>(() => this.ecConfigs[this.errorCorrection()]);

  selectLevel(level: ErrorCorrectionLevel): void {
    this.errorCorrectionChange.emit(level);
  }
}
