// client/apps/tool-qr-generator/src/components/metadata-display/metadata-display.component.ts
import {
  Component,
  input,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRMetadata, ErrorCorrectionLevel } from '../../models/qr-generator.models';

@Component({
  selector: 'app-qr-metadata-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metadata-strip" role="status" aria-label="QR Code Matrix Specifications">
      <div class="strip-items-row">
        <div class="strip-cell">
          <span class="strip-label">Ver:</span>
          <span class="strip-val">v{{ metadata().version }}</span>
        </div>
        <span class="strip-sep" aria-hidden="true">·</span>
        <div class="strip-cell">
          <span class="strip-label">EC:</span>
          <span class="strip-val">Level {{ errorCorrection() }}</span>
        </div>
        <span class="strip-sep" aria-hidden="true">·</span>
        <div class="strip-cell">
          <span class="strip-label">Used:</span>
          <span class="strip-val">{{ metadata().used }}/{{ metadata().capacity }}</span>
        </div>
        <div class="strip-spacer"></div>
        <div
          class="strip-percent"
          [class.warn]="metadata().usagePercent > 80 && metadata().usagePercent <= 100"
          [class.danger]="metadata().usagePercent > 100"
        >
          {{ metadata().usagePercent }}%
        </div>
      </div>

      <!-- Thin Themed Progress Bar -->
      <div
        class="strip-progress-track"
        role="progressbar"
        [attr.aria-valuenow]="metadata().usagePercent"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="'QR Capacity Used: ' + metadata().usagePercent + '%'"
      >
        <div
          class="strip-progress-fill"
          [style.width.%]="Math.min(metadata().usagePercent, 100)"
          [class.warn]="metadata().usagePercent > 80 && metadata().usagePercent <= 100"
          [class.danger]="metadata().usagePercent > 100"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .metadata-strip {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-sm, 8px);
      box-sizing: border-box;
    }

    .strip-items-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      line-height: 14px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      white-space: nowrap;
    }

    .strip-cell {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .strip-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      font-weight: 600;
    }

    .strip-val {
      font-weight: 650;
      color: var(--text, #fcfcfc);
      font-family: var(--ts-font-mono, monospace);
    }

    .strip-sep {
      color: var(--border-strong, rgba(255, 255, 255, 0.2));
      user-select: none;
    }

    .strip-spacer {
      flex: 1;
    }

    .strip-percent {
      font-weight: 700;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .strip-percent.warn {
      color: #f59e0b;
    }

    .strip-percent.danger {
      color: #ef4444;
    }

    /* Progress Track: 4px thin line */
    .strip-progress-track {
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      overflow: hidden;
      position: relative;
    }

    .strip-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: var(--tool-accent, var(--accent, #3b82f6));
      transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .strip-progress-fill.warn {
      background: #f59e0b;
    }

    .strip-progress-fill.danger {
      background: #ef4444;
    }
  `]
})
export class MetadataDisplayComponent {
  readonly metadata = input.required<QRMetadata>();
  readonly errorCorrection = input<ErrorCorrectionLevel>('M');
  readonly Math = Math;
}
