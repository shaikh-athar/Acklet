// apps/tool-image-compressor/src/components/processing-summary/processing-summary.component.ts
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-processing-summary',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-card">
      <div class="summary-header">
        <div class="title-with-badge">
          <h4 class="summary-title">Compression Summary</h4>
          <span class="phase-badge">Phase 1 Foundation</span>
        </div>
      </div>

      <!-- Informative Empty State as specified by Phase 1 guidelines -->
      <div class="summary-placeholder-state">
        <div class="placeholder-icon-wrap">
          <ts-icon name="sparkles" [size]="24" class="sparkle-icon" />
        </div>
        <p class="placeholder-primary-text">Your optimized images will appear here.</p>
        <p class="placeholder-subtext">
          Upload and configure your images above. Compression execution and savings calculations will be processed in Phase 2.
        </p>
      </div>

      <!-- Prepared UI Structure for Future Real Results -->
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-label">Original Total</span>
          <span class="metric-value font-mono">{{ formattedOriginalSize() }}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Compressed Size</span>
          <span class="metric-value font-mono placeholder-dash">—</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Space Saved</span>
          <span class="metric-value font-mono placeholder-dash">—</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Reduction</span>
          <span class="metric-value font-mono placeholder-dash">—</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="summary-actions">
        <button
          type="button"
          class="compress-all-btn"
          disabled
          title="Actual compression execution will be enabled in Phase 2"
        >
          <ts-icon name="minimize-2" [size]="16" />
          <span>Compress Images (Phase 2)</span>
        </button>

        <button
          type="button"
          class="download-btn"
          disabled
          title="Download will be active after images are compressed"
        >
          <ts-icon name="download" [size]="16" />
          <span>Download All</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-inner, 16px);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
    }

    .phase-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent, #60A5FA);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .summary-placeholder-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 18px 12px;
      background: var(--ts-surface-base, #111318);
      border-radius: var(--ts-radius-md, 12px);
      border: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .placeholder-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.08);
      color: var(--accent, #60A5FA);
      margin-bottom: 8px;
    }

    .placeholder-primary-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      margin: 0 0 4px 0;
    }

    .placeholder-subtext {
      font-size: 11px;
      color: var(--text-3, #9CA3AF);
      max-width: 380px;
      margin: 0;
      line-height: 1.4;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    @media (min-width: 480px) {
      .metrics-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      background: var(--ts-surface-base, #111318);
      border-radius: var(--ts-radius-sm, 8px);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .metric-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-3, #9CA3AF);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
    }

    .placeholder-dash {
      color: var(--text-3, #6B7280);
    }

    .summary-actions {
      display: flex;
      gap: 8px;
    }

    .compress-all-btn,
    .download-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 38px;
      padding: 0 16px;
      border-radius: var(--ts-radius-md, 12px);
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: not-allowed;
      opacity: 0.55;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .compress-all-btn {
      flex: 2;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .download-btn {
      flex: 1;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-default, #374151);
      color: var(--text-2, #9CA3AF);
    }
  `]
})
export class ProcessingSummaryComponent {
  readonly totalOriginalSize = input<number>(0);

  readonly formattedOriginalSize = computed(() => {
    const bytes = this.totalOriginalSize();
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  });
}

