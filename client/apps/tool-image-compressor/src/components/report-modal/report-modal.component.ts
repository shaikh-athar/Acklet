// apps/tool-image-compressor/src/components/report-modal/report-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal, HostListener } from '@angular/core';
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
                        @if (item.outputWidth > 0 && (item.outputWidth !== item.originalWidth || item.outputHeight !== item.originalHeight)) {
                          <span class="report-resized-note" [title]="'Resized: ' + item.originalWidth + ' × ' + item.originalHeight + ' to ' + item.outputWidth + ' × ' + item.outputHeight">
                            Resized: {{ item.originalWidth }} × {{ item.originalHeight }} to {{ item.outputWidth }} × {{ item.outputHeight }}
                          </span>
                        } @else {
                          {{ item.outputWidth > 0 ? item.outputWidth + '×' + item.outputHeight : '—' }}
                        }
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
            <div class="export-dropdown-wrapper">
              <button
                type="button"
                class="export-btn export-trigger-btn"
                (click)="toggleExportMenu()"
                title="Export report data"
                aria-haspopup="true"
                [attr.aria-expanded]="isExportOpen()"
              >
                <ts-icon name="download" [size]="14" />
                <span>Export</span>
                <ts-icon [name]="isExportOpen() ? 'chevron-up' : 'chevron-down'" [size]="12" />
              </button>

              @if (isExportOpen()) {
                <div class="export-dropdown-menu" role="menu">
                  <button
                    type="button"
                    class="export-dropdown-item"
                    role="menuitem"
                    (click)="onExportCsv()"
                  >
                    <ts-icon name="file-text" [size]="13" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    class="export-dropdown-item"
                    role="menuitem"
                    (click)="onExportJson()"
                  >
                    <ts-icon name="code" [size]="13" />
                    <span>Export JSON (.json)</span>
                  </button>
                </div>
              }
            </div>
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
      z-index: 1200;
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
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      background: var(--ts-surface-base, #111318);
    }

    .report-table {
      min-width: 620px;
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
      white-space: nowrap;
    }

    .report-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-2, #D1D5DB);
      white-space: nowrap;
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

    .export-dropdown-wrapper {
      position: relative;
      display: inline-block;
    }

    .export-dropdown-menu {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      min-width: 175px;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #374151);
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      padding: 4px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .export-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: var(--text-2, #D1D5DB);
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .export-dropdown-item:hover {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .export-dropdown-menu,
    [data-theme="light"] .export-dropdown-menu {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
    }

    :host-context([data-theme="light"]) .export-dropdown-item,
    [data-theme="light"] .export-dropdown-item {
      color: #334155;
    }

    :host-context([data-theme="light"]) .export-dropdown-item:hover,
    [data-theme="light"] .export-dropdown-item:hover {
      background: #EFF6FF;
      color: #2563EB;
    }

    @media (max-width: 640px) {
      .report-summary-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    @media (max-width: 479px) {
      .modal-backdrop {
        padding: 8px !important;
      }
      .modal-dialog {
        max-height: calc(100% - 16px) !important;
        max-height: calc(100dvh - 16px) !important;
        height: auto !important;
      }
      .report-summary-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      .modal-footer {
        padding: 10px 14px !important;
      }
      .export-trigger-btn,
      .close-action-btn {
        min-height: 44px !important;
        height: 44px !important;
      }
    }
  `]
})
export class ReportModalComponent {
  readonly report = input.required<OptimizationReport>();
  readonly close = output<void>();
  readonly exportCsv = output<void>();
  readonly exportJson = output<void>();

  readonly isExportOpen = signal<boolean>(false);

  toggleExportMenu(): void {
    this.isExportOpen.update(v => !v);
  }

  closeExportMenu(): void {
    this.isExportOpen.set(false);
  }

  onExportCsv(): void {
    this.exportCsv.emit();
    this.closeExportMenu();
  }

  onExportJson(): void {
    this.exportJson.emit();
    this.closeExportMenu();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isExportOpen()) {
      this.closeExportMenu();
      return;
    }
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

