// apps/tool-watermark-remover/src/components/batch-dashboard/batch-dashboard.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { BatchProcessorService } from '../../services/batch-processor.service';
import { ZipExportService, ZipExportProgress } from '../../services/zip-export.service';
import { ExportService } from '../../services/export.service';
import {
  BatchItem,
  BatchViewMode,
  DetectionSensitivity,
  InpaintingMode,
  ExportFormat
} from '../../models/watermark.models';

@Component({
  selector: 'app-batch-dashboard',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="batch-dashboard-container">

      <!-- Top Toolbar Header -->
      <header class="batch-header">
        <div class="batch-header-left">
          <div class="batch-title-group">
            <h2 class="batch-heading">Batch Watermark Remover</h2>
            <div class="batch-count-pill">
              <span>{{ batchService.totalCount() }} images</span>
              <span class="pill-dot">•</span>
              <span>{{ formattedTotalSize() }}</span>
            </div>
          </div>
        </div>

        <div class="batch-header-actions">
          <!-- View Mode Toggle -->
          <div class="view-mode-toggle" role="group" aria-label="View Layout">
            <button
              type="button"
              class="view-btn"
              [class.is-active]="batchService.viewMode() === 'grid'"
              (click)="batchService.setViewMode('grid')"
              title="Grid View"
            >
              <ts-icon name="layout-grid" [size]="16" />
            </button>
            <button
              type="button"
              class="view-btn"
              [class.is-active]="batchService.viewMode() === 'list'"
              (click)="batchService.setViewMode('list')"
              title="List View"
            >
              <ts-icon name="list" [size]="16" />
            </button>
          </div>

          <!-- Add More Images Button -->
          <label class="ts-btn ts-btn-secondary" tabindex="0">
            <ts-icon name="plus" [size]="16" />
            <span>Add Images</span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              class="sr-only"
              (change)="onAddMoreFiles($event)"
            />
          </label>

          <!-- Clear Queue Button -->
          <button
            type="button"
            class="ts-btn ts-btn-ghost danger"
            (click)="onClearQueue()"
            [disabled]="batchService.isProcessing()"
            title="Clear all images in queue"
          >
            <ts-icon name="trash-2" [size]="16" />
            <span>Clear Queue</span>
          </button>
        </div>
      </header>

      <!-- Shared Configuration Panel -->
      <section class="batch-config-bar">
        <div class="config-item">
          <label class="config-toggle-label">
            <input
              type="checkbox"
              [checked]="batchService.config().autoDetect"
              (change)="onToggleAutoDetect($event)"
            />
            <ts-icon name="sparkles" [size]="15" class="config-icon" />
            <span>Auto-Detect Watermarks</span>
          </label>
        </div>

        <!-- Sensitivity Selector -->
        <div class="config-item">
          <span class="config-label">Sensitivity:</span>
          <div class="pill-selector">
            @for (s of sensitivities; track s) {
              <button
                type="button"
                class="pill-opt"
                [class.is-selected]="batchService.config().sensitivity === s"
                (click)="onSetSensitivity(s)"
              >
                {{ s | titlecase }}
              </button>
            }
          </div>
        </div>

        <!-- AI Mode Selector -->
        <div class="config-item">
          <span class="config-label">AI Engine:</span>
          <div class="pill-selector">
            @for (m of inpaintingModes; track m) {
              <button
                type="button"
                class="pill-opt"
                [class.is-selected]="batchService.config().inpaintingMode === m"
                (click)="onSetInpaintingMode(m)"
              >
                {{ m | titlecase }}
              </button>
            }
          </div>
        </div>

        <!-- Output Format Selector -->
        <div class="config-item">
          <span class="config-label">Export:</span>
          <div class="pill-selector">
            @for (fmt of exportFormats; track fmt) {
              <button
                type="button"
                class="pill-opt"
                [class.is-selected]="batchService.config().exportFormat === fmt"
                (click)="onSetExportFormat(fmt)"
              >
                {{ fmt | uppercase }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Global Batch Execution Controls & Progress -->
      <section class="batch-action-banner">
        <div class="action-banner-left">
          <!-- Primary Batch Action -->
          @if (!batchService.isProcessing()) {
            <button
              type="button"
              class="ts-btn ts-btn-primary start-batch-btn"
              (click)="onStartBatch()"
              [disabled]="batchService.pendingCount() === 0"
            >
              <ts-icon name="play" [size]="16" />
              <span>
                {{ batchService.completedCount() > 0 ? 'Process Remaining' : 'Start Batch Removal' }}
                ({{ batchService.pendingCount() }})
              </span>
            </button>
          } @else {
            @if (!batchService.isPaused()) {
              <button
                type="button"
                class="ts-btn ts-btn-secondary"
                (click)="onPauseBatch()"
              >
                <ts-icon name="pause" [size]="16" />
                <span>Pause</span>
              </button>
            } @else {
              <button
                type="button"
                class="ts-btn ts-btn-primary"
                (click)="onResumeBatch()"
              >
                <ts-icon name="play" [size]="16" />
                <span>Resume</span>
              </button>
            }

            <button
              type="button"
              class="ts-btn ts-btn-ghost danger"
              (click)="onCancelBatch()"
            >
              <ts-icon name="x" [size]="16" />
              <span>Cancel</span>
            </button>
          }

          <!-- Retry Failed (if any) -->
          @if (batchService.failedCount() > 0 && !batchService.isProcessing()) {
            <button
              type="button"
              class="ts-btn ts-btn-secondary danger"
              (click)="onRetryFailed()"
            >
              <ts-icon name="refresh-cw" [size]="15" />
              <span>Retry Failed ({{ batchService.failedCount() }})</span>
            </button>
          }

          <!-- Bulk ZIP Download Button -->
          @if (batchService.completedCount() > 0) {
            <button
              type="button"
              class="ts-btn ts-btn-secondary zip-btn"
              [disabled]="isZipping() || batchService.selectedCompletedItems().length === 0"
              (click)="onDownloadZip()"
            >
              @if (isZipping()) {
                <span class="spinner-sm"></span>
                <span>Compressing ZIP ({{ zipPercent() }}%)...</span>
              } @else {
                <ts-icon name="archive" [size]="16" />
                <span>Download ZIP ({{ batchService.selectedCompletedItems().length }})</span>
              }
            </button>
          }
        </div>

        <div class="action-banner-right">
          <!-- Select All Completed Checkbox -->
          @if (batchService.completedCount() > 0) {
            <label class="select-all-label">
              <input
                type="checkbox"
                [checked]="batchService.allCompletedSelected()"
                (change)="onToggleSelectAll($event)"
              />
              <span>Select all completed</span>
            </label>
          }
        </div>
      </section>

      <!-- Global Progress Bar (shown when processing or completed) -->
      @if (batchService.isProcessing() || batchService.completedCount() > 0) {
        <div class="batch-progress-wrapper">
          <div class="batch-progress-bar-track">
            <div
              class="batch-progress-bar-fill"
              [style.width.%]="batchService.overallProgress().percent"
            ></div>
          </div>
          <div class="batch-progress-info">
            <span class="progress-status-text">
              @if (batchService.isProcessing()) {
                Processing: {{ batchService.completedCount() }} of {{ batchService.totalCount() }} completed
                @if (batchService.isPaused()) { (Paused) }
              } @else {
                Batch finished: {{ batchService.completedCount() }} completed
                @if (batchService.failedCount() > 0) { • {{ batchService.failedCount() }} failed }
              }
            </span>
            <span class="progress-percent-text">{{ batchService.overallProgress().percent }}%</span>
          </div>
        </div>
      }

      <!-- Batch Gallery Grid View -->
      @if (batchService.viewMode() === 'grid') {
        <div class="batch-grid">
          @for (item of batchService.items(); track item.id) {
            <div
              class="batch-card"
              [class.is-completed]="item.status === 'completed'"
              [class.is-failed]="item.status === 'failed'"
              [class.is-processing]="item.status === 'processing' || item.status === 'detecting'"
            >
              <!-- Card Header: Checkbox + Status Badge -->
              <div class="card-top-row">
                <label class="item-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="item.selectedForExport"
                    (change)="onToggleItemSelect(item.id)"
                  />
                </label>

                <!-- Status Badge -->
                <div class="status-badge" [class]="'badge-' + item.status">
                  @switch (item.status) {
                    @case ('pending') {
                      <span>Pending</span>
                    }
                    @case ('detecting') {
                      <span class="spinner-xs"></span>
                      <span>Detecting...</span>
                    }
                    @case ('detected') {
                      <ts-icon name="sparkles" [size]="12" />
                      <span>Ready ({{ item.regions.length }})</span>
                    }
                    @case ('processing') {
                      <span class="spinner-xs"></span>
                      <span>{{ item.progress }}%</span>
                    }
                    @case ('completed') {
                      <ts-icon name="check" [size]="12" />
                      <span>Done</span>
                    }
                    @case ('failed') {
                      <ts-icon name="x" [size]="12" />
                      <span>Failed</span>
                    }
                  }
                </div>
              </div>

              <!-- Card Thumbnail Container -->
              <div class="card-thumb-container">
                <img
                  [src]="item.processedDataUrl || item.thumbnailUrl"
                  [alt]="item.name"
                  class="card-thumb-img"
                  loading="lazy"
                />

                @if (item.status === 'processing' || item.status === 'detecting') {
                  <div class="thumb-overlay-progress">
                    <div class="item-progress-ring">
                      <span>{{ item.progress }}%</span>
                    </div>
                  </div>
                }

                @if (item.status === 'completed') {
                  <span class="cleaned-badge">Cleaned</span>
                }
              </div>

              <!-- Card Meta Details -->
              <div class="card-meta">
                <h4 class="card-filename" [title]="item.name">{{ item.name }}</h4>
                <div class="card-specs">
                  <span>{{ item.width }}×{{ item.height }}</span>
                  <span class="meta-dot">•</span>
                  <span>{{ formatSize(item.sizeBytes) }}</span>
                  @if (item.processingTimeMs) {
                    <span class="meta-dot">•</span>
                    <span class="speed-meta">{{ item.processingTimeMs }}ms</span>
                  }
                </div>

                <!-- Watermark Info -->
                <div class="card-wm-info">
                  @if (item.regions.length > 0) {
                    <span class="wm-detected-pill">
                      <ts-icon name="sparkles" [size]="11" />
                      <span>{{ item.regions.length }} watermark{{ item.regions.length > 1 ? 's' : '' }}</span>
                      @if (item.detectionConfidence) {
                        <span class="wm-conf">({{ item.detectionConfidence }}%)</span>
                      }
                    </span>
                  } @else if (item.status === 'completed') {
                    <span class="wm-clean-pill">Clean</span>
                  } @else {
                    <span class="wm-pending-pill">Awaiting analysis</span>
                  }
                </div>

                @if (item.errorMessage) {
                  <div class="card-error-text" [title]="item.errorMessage">
                    {{ item.errorMessage }}
                  </div>
                }
              </div>

              <!-- Card Actions Footer -->
              <div class="card-actions-row">
                <button
                  type="button"
                  class="action-pill-btn"
                  (click)="onEditItem(item)"
                  title="Open manual brush & rectangle editor"
                >
                  <ts-icon name="square-pen" [size]="13" />
                  <span>Edit Mask</span>
                </button>

                @if (item.status === 'completed' && item.processedImageData) {
                  <button
                    type="button"
                    class="action-pill-btn"
                    (click)="onDownloadItem(item)"
                    title="Download cleaned image"
                  >
                    <ts-icon name="download" [size]="13" />
                  </button>
                }

                @if (item.status === 'failed') {
                  <button
                    type="button"
                    class="action-pill-btn"
                    (click)="onRetryItem(item.id)"
                    title="Retry processing"
                  >
                    <ts-icon name="refresh-cw" [size]="13" />
                  </button>
                }

                <button
                  type="button"
                  class="action-pill-btn remove-btn"
                  (click)="onRemoveItem(item.id)"
                  title="Remove image"
                  [disabled]="item.status === 'processing' || item.status === 'detecting'"
                >
                  <ts-icon name="trash-2" [size]="13" />
                </button>
              </div>

            </div>
          }
        </div>
      }

      <!-- Batch Gallery List View -->
      @if (batchService.viewMode() === 'list') {
        <div class="batch-list-wrapper">
          <table class="batch-table">
            <thead>
              <tr>
                <th class="th-check"></th>
                <th class="th-preview">Preview</th>
                <th>Filename</th>
                <th>Dimensions</th>
                <th>Size</th>
                <th>Watermarks</th>
                <th>Status</th>
                <th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of batchService.items(); track item.id) {
                <tr [class.is-row-completed]="item.status === 'completed'">
                  <td>
                    <input
                      type="checkbox"
                      [checked]="item.selectedForExport"
                      (change)="onToggleItemSelect(item.id)"
                    />
                  </td>
                  <td>
                    <img
                      [src]="item.processedDataUrl || item.thumbnailUrl"
                      [alt]="item.name"
                      class="table-thumb"
                      loading="lazy"
                    />
                  </td>
                  <td class="td-filename" [title]="item.name">{{ item.name }}</td>
                  <td>{{ item.width }}×{{ item.height }}</td>
                  <td>{{ formatSize(item.sizeBytes) }}</td>
                  <td>
                    @if (item.regions.length > 0) {
                      <span class="wm-detected-pill sm">
                        {{ item.regions.length }} region{{ item.regions.length > 1 ? 's' : '' }}
                      </span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <div class="status-badge" [class]="'badge-' + item.status">
                      {{ item.status | titlecase }}
                    </div>
                  </td>
                  <td>
                    <div class="table-actions-cell">
                      <button
                        type="button"
                        class="table-icon-btn"
                        (click)="onEditItem(item)"
                        title="Edit Mask"
                      >
                        <ts-icon name="square-pen" [size]="14" />
                      </button>

                      @if (item.status === 'completed') {
                        <button
                          type="button"
                          class="table-icon-btn"
                          (click)="onDownloadItem(item)"
                          title="Download"
                        >
                          <ts-icon name="download" [size]="14" />
                        </button>
                      }

                      @if (item.status === 'failed') {
                        <button
                          type="button"
                          class="table-icon-btn"
                          (click)="onRetryItem(item.id)"
                          title="Retry"
                        >
                          <ts-icon name="refresh-cw" [size]="14" />
                        </button>
                      }

                      <button
                        type="button"
                        class="table-icon-btn danger"
                        (click)="onRemoveItem(item.id)"
                        title="Remove"
                      >
                        <ts-icon name="trash-2" [size]="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

    </div>
  `,
  styles: [`
    .batch-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-16, 16px);
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    /* Header */
    .batch-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ts-space-12, 12px);
      padding-bottom: var(--ts-space-12, 12px);
      border-bottom: 1px solid var(--ts-surface-raised-border, var(--border));
    }

    .batch-title-group {
      display: flex;
      align-items: center;
      gap: var(--ts-space-12, 12px);
    }

    .batch-heading {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--ts-text-primary, var(--foreground));
    }

    .batch-count-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--ts-radius-full, 9999px);
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--ts-surface-raised, rgba(255, 255, 255, 0.06));
      color: var(--ts-text-secondary, #94a3b8);
      border: 1px solid var(--ts-surface-raised-border, var(--border));
    }

    .pill-dot {
      opacity: 0.6;
    }

    .batch-header-actions {
      display: flex;
      align-items: center;
      gap: var(--ts-space-8, 8px);
    }

    /* View Toggle */
    .view-mode-toggle {
      display: inline-flex;
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-base, 8px);
      padding: 2px;
    }

    .view-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--ts-text-secondary, #94a3b8);
      border-radius: var(--ts-radius-sm, 6px);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-btn.is-active {
      background: var(--ts-surface, #1e293b);
      color: var(--accent, #3b82f6);
    }

    /* Shared Config Bar */
    .batch-config-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ts-space-16, 16px);
      padding: var(--ts-space-12, 12px) var(--ts-space-16, 16px);
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-card, 12px);
    }

    .config-item {
      display: flex;
      align-items: center;
      gap: var(--ts-space-8, 8px);
    }

    .config-toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--ts-text-primary, var(--foreground));
      cursor: pointer;
    }

    .config-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ts-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .pill-selector {
      display: inline-flex;
      background: var(--ts-surface, rgba(0, 0, 0, 0.15));
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-full, 9999px);
      padding: 2px;
    }

    .pill-opt {
      border: none;
      background: transparent;
      padding: 3px 10px;
      border-radius: var(--ts-radius-full, 9999px);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ts-text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-opt.is-selected {
      background: var(--accent, #3b82f6);
      color: #ffffff;
    }

    /* Action Banner */
    .batch-action-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ts-space-12, 12px);
    }

    .action-banner-left {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ts-space-10, 10px);
    }

    .select-all-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--ts-text-secondary, #94a3b8);
      cursor: pointer;
    }

    /* Global Progress */
    .batch-progress-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .batch-progress-bar-track {
      width: 100%;
      height: 6px;
      background: var(--ts-surface-raised, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-full, 9999px);
      overflow: hidden;
    }

    .batch-progress-bar-fill {
      height: 100%;
      background: var(--accent, #3b82f6);
      border-radius: var(--ts-radius-full, 9999px);
      transition: width 0.25s ease-out;
    }

    .batch-progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--ts-text-secondary, #94a3b8);
    }

    /* Grid Layout */
    .batch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--ts-space-16, 16px);
    }

    .batch-card {
      display: flex;
      flex-direction: column;
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-card, 14px);
      overflow: hidden;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }

    .batch-card:hover {
      border-color: var(--accent-subtle, rgba(59, 130, 246, 0.4));
    }

    .batch-card.is-completed {
      border-color: rgba(34, 197, 94, 0.3);
    }

    .batch-card.is-failed {
      border-color: rgba(239, 68, 68, 0.4);
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ts-space-8, 8px) var(--ts-space-12, 12px);
    }

    .card-thumb-container {
      position: relative;
      width: 100%;
      height: 160px;
      background: var(--ts-surface, #0f172a);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .card-thumb-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .cleaned-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 2px 8px;
      border-radius: var(--ts-radius-full, 9999px);
      background: rgba(34, 197, 94, 0.85);
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .thumb-overlay-progress {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-progress-ring {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--accent, #3b82f6);
      animation: spin 1s linear infinite;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .card-meta {
      padding: var(--ts-space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-filename {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ts-text-primary, var(--foreground));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-specs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--ts-text-secondary, #94a3b8);
    }

    .meta-dot {
      opacity: 0.5;
    }

    .speed-meta {
      color: #22c55e;
      font-weight: 500;
    }

    .card-wm-info {
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .wm-detected-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      padding: 2px 7px;
      border-radius: var(--ts-radius-full, 9999px);
    }

    .wm-clean-pill {
      font-size: 0.6875rem;
      font-weight: 500;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.12);
      padding: 2px 7px;
      border-radius: var(--ts-radius-full, 9999px);
    }

    .wm-pending-pill {
      font-size: 0.6875rem;
      color: var(--ts-text-secondary, #94a3b8);
    }

    .card-error-text {
      margin-top: 4px;
      font-size: 0.6875rem;
      color: #ef4444;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Card Actions Row */
    .card-actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: var(--ts-space-8, 8px) var(--ts-space-12, 12px);
      border-top: 1px solid var(--ts-surface-raised-border, var(--border));
      background: var(--ts-surface, rgba(0, 0, 0, 0.05));
    }

    .action-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-sm, 6px);
      background: var(--ts-surface-raised, var(--surface));
      color: var(--ts-text-primary, var(--foreground));
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-pill-btn:hover:not(:disabled) {
      border-color: var(--accent, #3b82f6);
      color: var(--accent, #3b82f6);
    }

    .action-pill-btn.remove-btn:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    /* Status Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--ts-radius-full, 9999px);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-pending {
      background: var(--ts-surface, rgba(255, 255, 255, 0.08));
      color: var(--ts-text-secondary, #94a3b8);
    }

    .badge-detecting {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .badge-detected {
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent, #3b82f6);
    }

    .badge-processing {
      background: rgba(59, 130, 246, 0.2);
      color: var(--accent, #3b82f6);
    }

    .badge-completed {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .badge-failed {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    /* List Table Layout */
    .batch-list-wrapper {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-card, 12px);
      background: var(--ts-surface-raised, var(--surface));
    }

    .batch-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.8125rem;
    }

    .batch-table th,
    .batch-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--ts-surface-raised-border, var(--border));
    }

    .batch-table th {
      font-weight: 600;
      color: var(--ts-text-secondary, #94a3b8);
      text-transform: uppercase;
      font-size: 0.6875rem;
      letter-spacing: 0.04em;
    }

    .th-check {
      width: 36px;
    }

    .th-preview {
      width: 60px;
    }

    .table-thumb {
      width: 44px;
      height: 32px;
      object-fit: cover;
      border-radius: var(--ts-radius-sm, 4px);
      background: var(--ts-surface, #0f172a);
    }

    .td-filename {
      font-weight: 500;
      color: var(--ts-text-primary, var(--foreground));
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .table-actions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid var(--ts-surface-raised-border, var(--border));
      border-radius: var(--ts-radius-sm, 6px);
      background: var(--ts-surface-raised, var(--surface));
      color: var(--ts-text-primary, var(--foreground));
      cursor: pointer;
    }

    .table-icon-btn:hover {
      border-color: var(--accent, #3b82f6);
      color: var(--accent, #3b82f6);
    }

    .table-icon-btn.danger:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    /* Buttons */
    .ts-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: var(--ts-radius-base, 8px);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      user-select: none;
    }

    .ts-btn-primary {
      background: var(--accent, #3b82f6);
      color: #ffffff;
    }

    .ts-btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .ts-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ts-btn-secondary {
      background: var(--ts-surface-raised, var(--surface));
      border-color: var(--ts-surface-raised-border, var(--border));
      color: var(--ts-text-primary, var(--foreground));
    }

    .ts-btn-secondary:hover:not(:disabled) {
      border-color: var(--accent, #3b82f6);
    }

    .ts-btn-ghost {
      background: transparent;
      color: var(--ts-text-secondary, #94a3b8);
    }

    .ts-btn-ghost:hover:not(:disabled) {
      color: var(--ts-text-primary, var(--foreground));
    }

    .ts-btn-ghost.danger:hover {
      color: #ef4444;
    }

    .danger {
      color: #ef4444 !important;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-xs {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BatchDashboardComponent {
  readonly batchService = inject(BatchProcessorService);
  private readonly zipExporter = inject(ZipExportService);
  private readonly exporter = inject(ExportService);

  readonly editItemRequested = output<BatchItem>();
  readonly addFilesRequested = output<File[]>();
  readonly toastRequested = output<string>();

  readonly isZipping = signal<boolean>(false);
  readonly zipPercent = signal<number>(0);

  readonly sensitivities: DetectionSensitivity[] = ['low', 'medium', 'high'];
  readonly inpaintingModes: InpaintingMode[] = ['fast', 'balanced', 'ultra'];
  readonly exportFormats: ExportFormat[] = ['png', 'jpg', 'webp'];

  readonly formattedTotalSize = computed(() => {
    return this.formatSize(this.batchService.totalSizeBytes());
  });

  onAddMoreFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileList = Array.from(input.files);
      this.addFilesRequested.emit(fileList);
      input.value = '';
    }
  }

  onClearQueue(): void {
    this.batchService.clearQueue();
    this.toastRequested.emit('Queue cleared.');
  }

  onToggleAutoDetect(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.batchService.updateConfig({ autoDetect: checkbox.checked });
  }

  onSetSensitivity(sensitivity: DetectionSensitivity): void {
    this.batchService.updateConfig({ sensitivity });
  }

  onSetInpaintingMode(inpaintingMode: InpaintingMode): void {
    this.batchService.updateConfig({ inpaintingMode });
  }

  onSetExportFormat(exportFormat: ExportFormat): void {
    this.batchService.updateConfig({ exportFormat });
  }

  onStartBatch(): void {
    this.batchService.startBatch();
  }

  onPauseBatch(): void {
    this.batchService.pauseBatch();
  }

  onResumeBatch(): void {
    this.batchService.startBatch();
  }

  onCancelBatch(): void {
    this.batchService.cancelBatch();
  }

  onRetryFailed(): void {
    this.batchService.retryFailed();
  }

  onRetryItem(id: string): void {
    this.batchService.retryItem(id);
  }

  onRemoveItem(id: string): void {
    this.batchService.removeItem(id);
  }

  onToggleItemSelect(id: string): void {
    this.batchService.toggleItemSelection(id);
  }

  onToggleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.batchService.selectAllCompleted(checkbox.checked);
  }

  onEditItem(item: BatchItem): void {
    this.editItemRequested.emit(item);
  }

  async onDownloadItem(item: BatchItem): Promise<void> {
    if (!item.processedImageData) return;
    const format = this.batchService.config().exportFormat;
    const quality = this.batchService.config().exportQuality;

    await this.exporter.downloadImage(item.processedImageData, item.name, {
      format,
      quality
    });
    this.toastRequested.emit(`Downloaded ${item.name}`);
  }

  async onDownloadZip(): Promise<void> {
    const completedSelected = this.batchService.selectedCompletedItems();
    if (completedSelected.length === 0) return;

    this.isZipping.set(true);
    this.zipPercent.set(0);

    const zipItems = completedSelected.map(item => ({
      id: item.id,
      name: item.name,
      imageData: item.processedImageData,
      dataUrl: item.processedDataUrl,
      format: this.batchService.config().exportFormat,
      quality: this.batchService.config().exportQuality
    }));

    try {
      await this.zipExporter.downloadZip(zipItems, undefined, (progress: ZipExportProgress) => {
        this.zipPercent.set(progress.percent);
      });
      this.toastRequested.emit(`Exported ${zipItems.length} images into ZIP!`);
    } catch (err: any) {
      this.toastRequested.emit(`ZIP export failed: ${err.message}`);
    } finally {
      this.isZipping.set(false);
      this.zipPercent.set(0);
    }
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

