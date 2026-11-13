// apps/tool-image-compressor/src/components/report-modal/report-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { OptimizationReport } from '../../models/compressor.models';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Optimization Report"
    >
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-titles">
            <div class="header-badge font-mono">
              <ts-icon name="file-text" [size]="12" />
              <span>DEVELOPER OPTIMIZATION AUDIT</span>
            </div>
            <h3 class="modal-title">Compression & Space Savings Report</h3>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="close.emit()"
            aria-label="Close report modal"
          >
            <ts-icon name="x" [size]="18" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          @if (report(); as rep) {
            <!-- Top Metrics Grid -->
            <div class="report-summary-grid">
              <div class="summary-stat-box">
                <span class="stat-label">Processed Images</span>
                <span class="stat-value font-mono">{{ rep.completedCount }} / {{ rep.totalImages }}</span>
                <span class="stat-sub font-mono">{{ rep.failedCount }} failed • {{ rep.skippedCount }} skipped</span>
              </div>

              <div class="summary-stat-box">
                <span class="stat-label">Total Space Saved</span>
                <span class="stat-value font-mono success-val">{{ formatBytes(rep.totalSavedBytes) }}</span>
                <span class="stat-sub font-mono success-val">-{{ rep.overallSavingsPercentage }}% net reduction</span>
              </div>

              <div class="summary-stat-box">
                <span class="stat-label">Variants & Fidelity</span>
                <span class="stat-value font-mono accent-val">
                  {{ rep.totalVariantsGenerated }} variant{{ rep.totalVariantsGenerated === 1 ? '' : 's' }}
                </span>
                <span class="stat-sub font-mono">
                  {{ rep.averageSsim !== null ? 'Avg SSIM: ' + rep.averageSsim : 'No SSIM computed' }}
                </span>
              </div>

              <div class="summary-stat-box">
                <span class="stat-label">Processing Time</span>
                <span class="stat-value font-mono">{{ (rep.totalProcessingTimeMs / 1000).toFixed(2) }}s</span>
                <span class="stat-sub font-mono">Client-side browser engine</span>
              </div>
            </div>

            <!-- Detailed Per-Image Table -->
            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Format</th>
                    <th>Dimensions</th>
                    <th>Original</th>
                    <th>Optimized</th>
                    <th>Saved</th>
                    <th>SSIM</th>
                    <th>Variants</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of rep.items; track item.id) {
                    <tr>
                      <td class="col-filename" [title]="item.originalName">
                        <span class="file-name">{{ item.originalName }}</span>
                      </td>
                      <td class="col-format font-mono">
                        {{ item.detectedFormat }} → {{ item.outputFormat }}
                      </td>
                      <td class="col-dim font-mono">
                        {{ item.outputWidth > 0 ? item.outputWidth + '×' + item.outputHeight : '—' }}
                      </td>
                      <td class="col-size font-mono">{{ formatBytes(item.originalSize) }}</td>
                      <td class="col-size font-mono">{{ formatBytes(item.compressedSize) }}</td>
                      <td class="col-saved font-mono" [class.success-val]="item.savedPercentage > 0">
                        {{ item.savedPercentage > 0 ? '-' + item.savedPercentage + '%' : (item.savedPercentage < 0 ? '+' + Math.abs(item.savedPercentage) + '%' : '0%') }}
                      </td>
                      <td class="col-ssim font-mono">
                        {{ item.ssim !== undefined ? item.ssim : '—' }}
                      </td>
                      <td class="col-variants font-mono">
                        {{ item.variantsCount }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <div class="footer-export-actions">
            <button
              type="button"
              class="export-btn"
              (click)="exportCsv.emit()"
              title="Download RFC 4180 compliant CSV spreadsheet"
            >
              <ts-icon name="download" [size]="14" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              class="export-btn"
              (click)="exportJson.emit()"
              title="Download structured JSON report"
            >
              <ts-icon name="code" [size]="14" />
              <span>Export JSON</span>
            </button>
          </div>

          <button
            type="button"
            class="close-action-btn"
            (click)="close.emit()"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 180ms ease-out;
    }

    .modal-dialog {
      display: flex;
      flex-direction: column;
      max-width: 960px;
      width: 100%;
      height: 85vh;
      max-height: 750px;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #2E3342);
      border-radius: var(--ts-radius-card, 18px);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
      letter-spacing: 0.05em;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1 1 0%;
      overflow: hidden;
    }

    .report-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      flex-shrink: 0;
    }

    .summary-stat-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      border-radius: 10px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .stat-label {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-3, #9CA3AF);
    }

    .stat-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
    }

    .stat-sub {
      font-size: 10px;
      color: var(--text-3, #9CA3AF);
    }

    .success-val {
      color: var(--success, #10B981);
    }

    .accent-val {
      color: var(--accent, #60A5FA);
    }

    .table-container {
      flex: 1 1 0%;
      overflow-y: auto;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      background: var(--ts-surface-base, #111318);
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      text-align: left;
    }

    .report-table th {
      position: sticky;
      top: 0;
      background: var(--ts-surface-card, #1A1C23);
      padding: 10px 12px;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-3, #9CA3AF);
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      z-index: 1;
    }

    .report-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-2, #D1D5DB);
    }

    .report-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .col-filename {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-name {
      font-weight: 600;
      color: var(--text, #F9FAFB);
    }

    .modal-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .footer-export-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-default, #374151);
      color: var(--text, #F9FAFB);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .export-btn:hover {
      background: rgba(59, 130, 246, 0.12);
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #60A5FA);
    }

    .close-action-btn {
      height: 34px;
      padding: 0 18px;
      border-radius: 8px;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    .close-action-btn:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    /* ── Light Theme Dual-Theme Overrides ── */
    :host-context([data-theme="light"]) .modal-backdrop,
    [data-theme="light"] .modal-backdrop {
      background: rgba(15, 23, 42, 0.45);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .summary-stat-box,
    [data-theme="light"] .summary-stat-box {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .stat-label,
    [data-theme="light"] .stat-label {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .stat-value,
    [data-theme="light"] .stat-value {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .report-table-card,
    [data-theme="light"] .report-table-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .report-table th,
    [data-theme="light"] .report-table th {
      background: #F8FAFC;
      color: #475569;
      border-bottom-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .report-table td,
    [data-theme="light"] .report-table td {
      border-bottom-color: #F1F5F9;
      color: #334155;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .export-btn,
    [data-theme="light"] .export-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .export-btn:hover,
    [data-theme="light"] .export-btn:hover {
      background: #F1F5F9;
      border-color: #94A3B8;
    }

    @media (max-width: 640px) {
      .report-summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class ReportModalComponent {
  readonly report = input.required<OptimizationReport>();
  readonly close = output<void>();
  readonly exportCsv = output<void>();
  readonly exportJson = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  readonly Math = Math;

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

