import {
  Component,
  signal,
  computed,
  HostListener,
  ElementRef,
  viewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../app/shared/components/icon/icon';
import { ToastService } from '../../../../app/core/services/toast.service';
import { FileInspectorService, FileInspectionResult } from '../services/file-inspector.service';
import {
  ClientConverterEngine,
  ConversionResult,
  ConversionProgress,
  FileSizeClass,
} from '../services/client-converter.engine';
import { ErrorTaxonomy, UserFacingError } from '../services/error-taxonomy';
import {
  ConversionRegistryService,
  ConversionCapability,
  AdvancedConversionOptions,
} from '../services/conversion-registry.service';
import { ZipBuilderService, ZipFileEntry } from '../services/zip-builder.service';
import { MemoryCleanupService } from '../services/memory-cleanup.service';
import { DropzoneComponent } from '../components/dropzone.component';
import { ConversionStateService } from '../services/conversion-state.service';
import { FilenameSanitizerService } from '../services/filename-sanitizer.service';
import {
  ConversionHistoryService,
  ConversionHistoryRecord,
} from '../services/conversion-history.service';
import { SeoFooterComponent } from '../components/seo-footer.component';
import { DEFAULT_RESOURCE_LIMITS } from '../services/resource-limits.config';

export type JobState =
  | 'CREATED'
  | 'VALIDATING_INPUT'
  | 'QUEUED'
  | 'PROCESSING'
  | 'VALIDATING_OUTPUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  jobState: JobState;
  status:
    | 'queued'
    | 'inspecting'
    | 'ready'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'mismatch'
    | 'cancelled'
    | 'encrypted';
  targetFormat?: string;
  progress: number;
  stageMessage?: string;
  sizeClass: FileSizeClass;
  inspection?: FileInspectionResult;
  conversionResult?: ConversionResult;
  formattedError?: UserFacingError;
  errorMessage?: string;
  signatureWarningConfirmed?: boolean;
  stripMetadata: boolean;
  advancedOptions: AdvancedConversionOptions;
  showOptionsDrawer?: boolean;
  abortController?: AbortController;
  retryCount?: number;
  rawFile: File;
}

@Component({
  selector: 'app-easy-convert',
  standalone: true,
  imports: [CommonModule, IconComponent, DropzoneComponent, SeoFooterComponent],
  template: `
    <div class="easy-convert-workspace" [class.is-dragging-global]="isDraggingGlobal()">
      <!-- GLOBAL DRAG OVERLAY (SECTION 8) -->
      @if (isDraggingGlobal()) {
        <div class="ec-global-drag-overlay">
          <div class="ec-global-drag-card">
            <app-icon name="upload-cloud" class="size-12 text-ec-primary mb-2" />
            <h3 class="text-xl font-bold text-neutral-100">Drop files to convert</h3>
          </div>
        </div>
      }
      <!-- Header Bar & Privacy Settings -->
      <div class="ec-header-bar">
        <div class="ec-badge-privacy">
          <app-icon name="shield-check" class="size-4 text-emerald-400 mr-1.5" />
          <span>Processed locally when possible · No unnecessary upload</span>
        </div>

        <div class="flex items-center gap-4">
          <!-- METADATA PRIVACY TOGGLE -->
          <label
            class="ec-toggle-label"
            title="Strip EXIF, author, and revision metadata during conversion"
          >
            <input
              type="checkbox"
              [checked]="stripMetadataGlobal()"
              (change)="toggleGlobalMetadata($event)"
            />
            <app-icon name="lock" class="size-3.5 text-ec-secondary mr-1" />
            <span class="text-xs text-neutral-300">Strip Metadata</span>
          </label>

          <div
            class="ec-shortcut-pill"
            (click)="openHistoryModal()"
            tabindex="0"
            (keydown.enter)="openHistoryModal()"
          >
            <app-icon name="history" class="size-3.5 text-ec-secondary mr-1" />
            <span class="text-xs text-neutral-300">History</span>
          </div>

          <div
            class="ec-shortcut-pill"
            (click)="triggerFileInput()"
            tabindex="0"
            (keydown.enter)="triggerFileInput()"
          >
            <span class="text-xs text-neutral-400">Quick Upload:</span>
            <kbd class="ec-kbd">Ctrl</kbd> + <kbd class="ec-kbd">U</kbd>
          </div>
        </div>
      </div>

      <!-- SECTION 7: ABOVE THE FOLD TOOL TITLE & SUBTITLE -->
      <div class="text-center my-2">
        <h1 class="text-3xl font-extrabold text-neutral-50 tracking-tight">EasyConvert</h1>
        <p class="text-sm text-neutral-400 mt-1">Convert files without the friction</p>
      </div>

      <!-- MAIN UPLOAD ZONE (SECTION 55 ARCHITECTURE) -->
      @if (fileList().length === 0) {
        <app-easy-convert-dropzone (filesSelected)="handleFilesFromDropzone($event)" />
      } @else {
        <!-- ACTIVE QUEUE & CONVERSION WORKSPACE -->
        <div class="ec-active-workspace">
          <div class="ec-workspace-header">
            <div class="flex items-center gap-3">
              <app-icon name="layers" class="size-5 text-ec-primary" />
              <h3 class="font-bold text-neutral-100 text-lg">
                Batch Queue ({{ fileList().length }})
              </h3>

              <!-- PARTIAL BATCH STATUS PILL (SECTION 37) -->
              @if (completedCount() > 0 || failedCount() > 0) {
                <div class="ec-batch-summary-pill">
                  @if (completedCount() > 0) {
                    <span class="text-emerald-400 font-semibold flex items-center gap-1">
                      <app-icon name="check-circle" class="size-3" /> {{ completedCount() }} Done
                    </span>
                  }
                  @if (failedCount() > 0) {
                    <span class="text-rose-400 font-semibold flex items-center gap-1">
                      <app-icon name="alert-circle" class="size-3" /> {{ failedCount() }} Failed
                    </span>
                  }
                </div>
              }
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              @if (completedCount() > 1) {
                <button class="btn-ec-success btn-sm" (click)="downloadBatchZip()">
                  <app-icon name="check" class="size-4 mr-1" /> Download All (ZIP)
                </button>
              }
              @if (failedCount() > 0) {
                <button class="btn-ec-secondary btn-sm" (click)="retryAllFailed()">
                  <app-icon name="arrow-right-left" class="size-4 mr-1" /> Retry Failed
                </button>
                <button class="btn-ec-ghost btn-sm" (click)="removeFailedItems()">
                  Remove Failed
                </button>
              }
              @if (hasProcessingItems()) {
                <button class="btn-ec-danger btn-sm" (click)="cancelAllActive()">
                  <app-icon name="x" class="size-4 mr-1" /> Cancel Active
                </button>
              }
              <button
                class="btn-ec-primary btn-sm"
                [disabled]="!canConvertAll()"
                (click)="convertAllReady()"
              >
                <app-icon name="zap" class="size-4 mr-1 fill-current" /> Convert All
              </button>
              <button class="btn-ec-secondary btn-sm" (click)="triggerFileInput()">
                <app-icon name="plus" class="size-4 mr-1" /> Add Files
              </button>
              <button class="btn-ec-ghost btn-sm" (click)="clearAllFiles()">Clear Queue</button>
            </div>
          </div>

          <input #fileInput type="file" multiple class="hidden" (change)="onFileSelected($event)" />

          <!-- FILE QUEUE LIST -->
          <div class="ec-queue-grid">
            @for (item of fileList(); track item.id) {
              <div
                class="ec-file-card"
                [class.card-mismatch]="item.status === 'mismatch'"
                [class.card-encrypted]="item.status === 'encrypted'"
                [class.card-completed]="item.status === 'completed'"
              >
                <div class="ec-file-info">
                  <div class="ec-file-icon">
                    <app-icon [name]="getFileIcon(item.extension)" class="size-6 text-ec-primary" />
                  </div>
                  <div class="ec-file-meta">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="ec-file-name" [title]="item.name">{{ item.name }}</span>
                      <span class="ec-tier-badge" [class]="'tier-' + item.sizeClass">
                        {{ item.sizeClass.toUpperCase() }}
                      </span>
                      <!-- SECTION 59: DYNAMIC PRIVACY INDICATOR BADGE -->
                      @if (item.targetFormat) {
                        <span
                          class="ec-privacy-badge-dynamic"
                          [class.is-server]="
                            !getPrivacyInfo(item.extension, item.targetFormat).isLocal
                          "
                        >
                          <app-icon
                            [name]="getPrivacyInfo(item.extension, item.targetFormat).icon"
                            class="size-3 mr-1 inline"
                          />
                          {{ getPrivacyInfo(item.extension, item.targetFormat).text }}
                        </span>
                      }
                      @if (item.status === 'completed') {
                        <!-- ACCESSIBLE STATUS BADGE (TEXT + ICON, NOT COLOR ALONE) -->
                        <span
                          class="ec-status-accessible-badge text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                        >
                          <app-icon name="check" class="size-3 mr-0.5 inline" /> ✓ Completed
                        </span>
                      }
                      @if (item.inspection?.hasDigitalSignature) {
                        <span
                          class="ec-sig-warning-badge"
                          title="Contains official digital signature"
                        >
                          <app-icon name="shield" class="size-3 mr-0.5 inline" /> SIGNED
                        </span>
                      }
                      @if (item.inspection?.hasActiveContent) {
                        <span
                          class="ec-sig-warning-badge text-amber-400 bg-amber-950/40 border-amber-800/40"
                          title="Contains macros or embedded active content"
                        >
                          <app-icon name="alert-triangle" class="size-3 mr-0.5 inline" /> MACROS /
                          ACTIVE CONTENT
                        </span>
                      }
                      @if (item.inspection?.magicHeaderHex) {
                        <span
                          class="ec-sig-tag"
                          [title]="'Magic Bytes: ' + item.inspection?.magicHeaderHex"
                        >
                          {{ item.inspection?.signatureName }}
                        </span>
                      }
                    </div>
                    <span class="ec-file-sub">
                      {{ formatBytes(item.size) }}
                      @if (item.conversionResult) {
                        ➔
                        <strong class="text-emerald-400">{{
                          formatBytes(item.conversionResult.outputSize)
                        }}</strong>
                      }
                      · {{ item.extension.toUpperCase() }}
                    </span>
                  </div>
                </div>

                <!-- DIGITAL SIGNATURE WARNING OVERLAY / CONFIRMATION -->
                @if (item.inspection?.hasDigitalSignature && !item.signatureWarningConfirmed) {
                  <div class="ec-sig-warning-card">
                    <div class="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <app-icon name="shield-alert" class="size-4" /> Digital Signature Detected
                    </div>
                    <p class="text-xs text-neutral-300 mt-1">
                      Converting this file will invalidate its digital signature.
                    </p>
                    <div class="flex gap-2 mt-2">
                      <button
                        class="btn-ec-warning btn-xs"
                        (click)="confirmSignatureWarning(item.id)"
                      >
                        Confirm & Proceed
                      </button>
                      <button class="btn-ec-ghost btn-xs" (click)="removeFile(item.id)">
                        Cancel
                      </button>
                    </div>
                  </div>
                } @else if (item.formattedError) {
                  <!-- FORMAL ERROR TAXONOMY CARD -->
                  <div class="ec-error-taxonomy-card">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-rose-400 text-xs flex items-center gap-1">
                        <app-icon name="shield-alert" class="size-3.5" />
                        {{ item.formattedError.title }}
                      </span>
                    </div>
                    <p class="text-xs text-neutral-300 mt-1">{{ item.formattedError.reason }}</p>
                    <div class="ec-actions-list mt-2">
                      @for (act of item.formattedError.suggestedActions; track act) {
                        <span class="ec-action-chip">• {{ act }}</span>
                      }
                    </div>
                  </div>
                } @else if (item.status === 'processing') {
                  <div class="ec-stage-banner">
                    <app-icon
                      name="clock"
                      class="size-4 text-ec-primary mr-1.5 animate-spin flex-shrink-0"
                    />
                    <span>{{ item.stageMessage || 'Processing file...' }}</span>
                  </div>
                } @else {
                  <!-- TARGET SELECTION -->
                  <div class="ec-target-selection">
                    <span class="ec-target-label">Target:</span>
                    <div class="ec-format-options">
                      @for (cap of getCapabilities(item.extension); track cap.outputFormat) {
                        <button
                          class="ec-target-btn"
                          [class.ec-target-active]="item.targetFormat === cap.outputFormat"
                          [class.ec-target-recommended]="cap.isRecommended"
                          (click)="setTargetFormat(item.id, cap.outputFormat)"
                        >
                          @if (cap.isRecommended) {
                            <app-icon name="sparkles" class="size-3 mr-1 text-amber-400 inline" />
                          }
                          {{ cap.label }}
                        </button>
                      }
                    </div>

                    <!-- OPTIONS TOGGLE -->
                    <button class="btn-ec-secondary btn-xs" (click)="toggleOptionsDrawer(item.id)">
                      <app-icon name="settings" class="size-3 mr-1" /> Options
                    </button>
                  </div>
                }

                <!-- CONTEXTUAL ADVANCED OPTIONS DRAWER -->
                @if (item.showOptionsDrawer) {
                  <div class="ec-options-popover">
                    <div
                      class="flex items-center justify-between border-b border-[var(--border-soft)] pb-2 mb-2"
                    >
                      <span class="text-xs font-bold text-neutral-200">Conversion Settings</span>
                      <button class="ec-ghost-close" (click)="toggleOptionsDrawer(item.id)">
                        <app-icon name="x" class="size-3.5" />
                      </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label class="text-neutral-400 block mb-1">Quality Level</label>
                        <select
                          class="ec-select"
                          [value]="item.advancedOptions.quality || 0.92"
                          (change)="updateOption(item.id, 'quality', $event)"
                        >
                          <option [value]="1.0">Maximum (100%)</option>
                          <option [value]="0.92">High (92%)</option>
                          <option [value]="0.75">Medium (75%)</option>
                        </select>
                      </div>

                      <div>
                        <label class="text-neutral-400 block mb-1">Orientation</label>
                        <select
                          class="ec-select"
                          [value]="item.advancedOptions.orientation || 'portrait'"
                          (change)="updateOption(item.id, 'orientation', $event)"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }

                <!-- ACTIONS -->
                <div class="ec-file-actions">
                  @if (item.status === 'processing') {
                    <div class="flex items-center gap-2">
                      <div class="ec-progress-wrap">
                        <div class="ec-progress-bar" [style.width.%]="item.progress"></div>
                        <span class="ec-progress-text">{{ item.progress }}%</span>
                      </div>
                      <button
                        class="ec-cancel-btn"
                        (click)="cancelSingleConversion(item.id)"
                        title="Cancel Conversion"
                      >
                        <app-icon name="x" class="size-4" />
                      </button>
                    </div>
                  } @else if (item.status === 'completed') {
                    <div class="flex items-center gap-2">
                      <button class="btn-ec-secondary btn-sm" (click)="openPreviewModal(item)">
                        <app-icon name="eye" class="size-4 mr-1" /> Preview
                      </button>
                      <button class="btn-ec-success btn-sm" (click)="downloadOutput(item)">
                        <app-icon name="check" class="size-4 mr-1" /> Download
                      </button>
                    </div>
                  } @else if (item.status === 'cancelled' || item.status === 'failed') {
                    <button class="btn-ec-secondary btn-sm" (click)="retrySingleConversion(item)">
                      <app-icon name="arrow-right-left" class="size-4 mr-1" /> Retry
                    </button>
                  } @else if (
                    item.status !== 'mismatch' &&
                    item.status !== 'encrypted' &&
                    (!item.inspection?.hasDigitalSignature || item.signatureWarningConfirmed)
                  ) {
                    <button
                      class="btn-ec-primary btn-sm"
                      [disabled]="!item.targetFormat"
                      (click)="convertSingleFile(item)"
                    >
                      <app-icon name="arrow-right-left" class="size-4 mr-1" /> Convert
                    </button>
                  }

                  <button class="ec-remove-btn" (click)="removeFile(item.id)" title="Remove File">
                    <app-icon name="x" class="size-4" />
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- FIDELITY PREVIEW MODAL (ACCESSIBLE KEYBOARD TRAPPING & ESCAPE DISMISSAL) -->
      @if (activePreviewItem()) {
        <div class="ec-modal-overlay" (click)="closePreviewModal()">
          <div
            class="ec-modal-container"
            (click)="$event.stopPropagation()"
            role="dialog"
            aria-modal="true"
          >
            <div class="ec-modal-header">
              <div class="flex items-center gap-2">
                <app-icon name="eye" class="size-5 text-ec-primary" />
                <h3 class="font-bold text-neutral-100">
                  Output Fidelity Preview — {{ activePreviewItem()?.name }}
                </h3>
              </div>
              <button class="ec-ghost-close" (click)="closePreviewModal()" aria-label="Close modal">
                <app-icon name="x" class="size-5" />
              </button>
            </div>

            <div class="ec-modal-body">
              <div
                class="flex items-center justify-between bg-surface-800 p-3 rounded-lg border border-[var(--border-soft)] mb-4 text-xs"
              >
                <div>
                  <span class="text-neutral-400">Original: </span>
                  <strong class="text-neutral-200">{{
                    formatBytes(activePreviewItem()?.size || 0)
                  }}</strong>
                </div>
                <div>
                  <app-icon name="arrow-right" class="size-4 text-ec-primary" />
                </div>
                <div>
                  <span class="text-neutral-400">Converted: </span>
                  <strong class="text-emerald-400">{{
                    formatBytes(activePreviewItem()?.conversionResult?.outputSize || 0)
                  }}</strong>
                </div>
              </div>

              <!-- SECTION 21: SIGNATURE STATUS NOT PRESERVED NOTICE -->
              @if (activePreviewItem()?.inspection?.hasDigitalSignature) {
                <div
                  class="ec-sig-status-box my-2 p-2 bg-amber-950/40 border border-amber-800/40 rounded text-xs text-amber-300 flex items-center justify-between"
                >
                  <span>Original: <strong>Digitally Signed</strong></span>
                  <span
                    >Converted:
                    <strong class="text-amber-400">Signature Not Preserved</strong></span
                  >
                </div>
              }

              @if (activePreviewItem()?.conversionResult?.previewUrl) {
                <div class="ec-preview-frame">
                  <img
                    [src]="activePreviewItem()?.conversionResult?.previewUrl"
                    class="max-h-[350px] rounded object-contain mx-auto"
                    alt="Converted preview"
                  />
                </div>
              }
            </div>

            <div class="ec-modal-footer">
              <button class="btn-ec-ghost btn-sm" (click)="closePreviewModal()">Close</button>
              <button class="btn-ec-success btn-sm" (click)="downloadOutput(activePreviewItem()!)">
                <app-icon name="check" class="size-4 mr-1" /> Download Result
              </button>
            </div>
          </div>
        </div>
      }

      <!-- LOCAL CONVERSION HISTORY MODAL (SECTION 65) -->
      @if (showHistoryModal()) {
        <div class="ec-modal-overlay" (click)="closeHistoryModal()">
          <div
            class="ec-modal-container"
            (click)="$event.stopPropagation()"
            role="dialog"
            aria-modal="true"
          >
            <div class="ec-modal-header">
              <div class="flex items-center gap-2">
                <app-icon name="history" class="size-5 text-ec-primary" />
                <h3 class="font-bold text-neutral-100">Local Conversion Audit Log</h3>
              </div>
              <button class="ec-ghost-close" (click)="closeHistoryModal()" aria-label="Close modal">
                <app-icon name="x" class="size-5" />
              </button>
            </div>

            <div class="ec-modal-body max-h-[400px] overflow-y-auto">
              @if (historyLogs().length === 0) {
                <div class="text-center py-8 text-neutral-400 text-sm">
                  No local conversion history found on this device.
                </div>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (log of historyLogs(); track log.id) {
                    <div
                      class="flex items-center justify-between p-3 bg-surface-800 rounded-lg border border-[var(--border-soft)] text-xs"
                    >
                      <div>
                        <span class="font-semibold text-neutral-200">{{ log.inputFilename }}</span>
                        <span class="text-neutral-400 font-mono ml-2"
                          >({{ log.sourceFormat.toUpperCase() }} ➔
                          {{ log.targetFormat.toUpperCase() }})</span
                        >
                        <div class="text-neutral-400 text-[0.7rem] mt-0.5">
                          {{ formatBytes(log.inputSize) }} ➔ {{ formatBytes(log.outputSize) }} ·
                          {{ log.timestamp | date: 'short' }}
                        </div>
                      </div>
                      <span
                        class="ec-status-accessible-badge text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                      >
                        ✓ {{ log.status }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="ec-modal-footer">
              @if (historyLogs().length > 0) {
                <button class="btn-ec-danger btn-sm mr-auto" (click)="clearHistoryLogs()">
                  Clear History
                </button>
              }
              <button class="btn-ec-ghost btn-sm" (click)="closeHistoryModal()">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- BELOW THE FOLD SEO & MULTI-TOOL ECOSYSTEM (SECTION 73 & 74) -->
      <app-easy-convert-seo-footer />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        --ec-primary: #2196f3;
        --ec-primary-deep: #0d47a1;
        --ec-surface-soft: #e3f2fd;
        --ec-secondary: #90caf9;
      }

      .easy-convert-workspace {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 1rem 0 4rem 0;
        min-height: 100vh;
        overflow-y: auto;
      }

      .ec-global-drag-overlay {
        position: fixed;
        inset: 0;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(18, 24, 39, 0.85);
        backdrop-filter: blur(4px);
        pointer-events: none;
      }

      .ec-global-drag-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 4rem;
        border-radius: var(--radius-2xl, 1.5rem);
        background: var(--color-surface-900, #121827);
        border: 2px dashed var(--ec-primary);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      }

      .ec-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.25rem;
        background: var(--color-surface-900, #121827);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        border-radius: var(--radius-xl, 1rem);
      }
      .ec-badge-privacy {
        display: flex;
        align-items: center;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-neutral-300, #cbd5e1);
      }
      .ec-toggle-label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      .ec-shortcut-pill {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        border-radius: var(--radius-md, 0.5rem);
        cursor: pointer;
      }
      .ec-kbd {
        font-family: var(--font-mono, monospace);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.1rem 0.4rem;
        background: var(--color-surface-800, #1e293b);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
        border-radius: 0.25rem;
        color: var(--ec-secondary);
      }

      .ec-dropzone {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 380px;
        padding: 3rem 2rem;
        background: color-mix(in srgb, var(--ec-primary) 3%, var(--color-surface-900, #121827));
        border: 2px dashed
          color-mix(in srgb, var(--ec-primary) 35%, var(--border-soft, rgba(255, 255, 255, 0.1)));
        border-radius: var(--radius-2xl, 1.5rem);
        cursor: pointer;
      }
      .ec-dropzone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.25rem;
        max-width: 600px;
      }
      .ec-upload-icon-ring {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--ec-primary) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--ec-primary) 30%, transparent);
      }
      .ec-drop-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-neutral-50, #f8fafc);
      }
      .ec-drop-subtitle {
        font-size: 0.95rem;
        color: var(--color-neutral-400, #94a3b8);
      }
      .ec-browse-link {
        color: var(--ec-primary);
        font-weight: 600;
        text-decoration: underline;
      }
      .ec-formats-pills {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      .fmt-badge {
        padding: 0.3rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        color: var(--color-neutral-300, #cbd5e1);
      }

      .ec-active-workspace {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem;
        background: var(--color-surface-900, #121827);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        border-radius: var(--radius-2xl, 1.5rem);
      }
      .ec-workspace-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
      }
      .ec-batch-summary-pill {
        display: flex;
        gap: 0.75rem;
        padding: 0.25rem 0.75rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        border-radius: 9999px;
        font-size: 0.75rem;
      }
      .ec-queue-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .ec-file-card {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        padding: 1.25rem;
        background: var(--color-surface-800, #1e293b);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        border-radius: var(--radius-xl, 1rem);
        transition: all 0.2s ease;
      }
      .card-completed {
        border-color: rgba(16, 185, 129, 0.25) !important;
        background: color-mix(in srgb, #10b981 3%, var(--color-surface-800, #1e293b)) !important;
      }
      .card-mismatch,
      .card-encrypted {
        border-color: rgba(244, 63, 94, 0.3) !important;
        background: rgba(244, 63, 94, 0.04) !important;
      }
      .ec-status-accessible-badge {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        border: 1px solid;
      }
      .ec-file-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 240px;
      }
      .ec-file-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-lg, 0.75rem);
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--ec-primary) 10%, transparent);
        border: 1px solid color-mix(in srgb, var(--ec-primary) 20%, transparent);
        flex-shrink: 0;
      }
      .ec-file-meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .ec-file-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-neutral-100, #f1f5f9);
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ec-privacy-badge-dynamic {
        font-size: 0.65rem;
        font-weight: 600;
        padding: 0.1rem 0.45rem;
        border-radius: 0.25rem;
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      .ec-privacy-badge-dynamic.is-server {
        background: rgba(59, 130, 246, 0.1);
        color: #60a5fa;
        border-color: rgba(59, 130, 246, 0.2);
      }
      .tier-small {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .tier-medium {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
      .tier-large,
      .tier-very_large {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }

      .ec-sig-warning-badge {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .ec-sig-tag {
        font-size: 0.65rem;
        font-family: var(--font-mono, monospace);
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        background: rgba(33, 150, 243, 0.12);
        color: var(--ec-secondary);
        border: 1px solid rgba(33, 150, 243, 0.2);
      }
      .ec-file-sub {
        font-size: 0.75rem;
        color: var(--color-neutral-400, #94a3b8);
      }

      .ec-sig-warning-card {
        padding: 0.75rem;
        border-radius: var(--radius-md, 0.5rem);
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.25);
        flex: 1;
      }
      .ec-error-taxonomy-card {
        padding: 0.75rem;
        border-radius: var(--radius-md, 0.5rem);
        background: rgba(244, 63, 94, 0.08);
        border: 1px solid rgba(244, 63, 94, 0.2);
        flex: 1;
      }
      .ec-action-chip {
        font-size: 0.7rem;
        color: var(--color-neutral-400, #94a3b8);
        display: inline-block;
        margin-right: 0.5rem;
      }

      .ec-stage-banner {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-md, 0.5rem);
        background: rgba(33, 150, 243, 0.1);
        border: 1px solid rgba(33, 150, 243, 0.2);
        color: var(--ec-secondary);
        font-size: 0.8rem;
        font-weight: 500;
        flex: 1;
      }

      .ec-target-selection {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
      }
      .ec-target-label {
        font-size: 0.8rem;
        color: var(--color-neutral-400, #94a3b8);
        white-space: nowrap;
      }
      .ec-format-options {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .ec-target-btn {
        padding: 0.4rem 0.85rem;
        border-radius: var(--radius-md, 0.5rem);
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
        color: var(--color-neutral-300, #cbd5e1);
        cursor: pointer;
      }
      .ec-target-active {
        background: var(--ec-primary) !important;
        color: #ffffff !important;
        border-color: var(--ec-primary-deep) !important;
      }
      .ec-target-recommended {
        border-color: color-mix(in srgb, var(--ec-primary) 40%, transparent);
      }

      .ec-options-popover {
        position: absolute;
        top: 100%;
        left: 1.25rem;
        right: 1.25rem;
        z-index: 10;
        margin-top: 0.5rem;
        padding: 0.85rem 1.25rem;
        background: var(--color-surface-900, #121827);
        border: 1px solid var(--ec-primary);
        border-radius: var(--radius-lg, 0.75rem);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .ec-select {
        width: 100%;
        padding: 0.35rem 0.5rem;
        background: var(--color-surface-800, #1e293b);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
        border-radius: var(--radius-md, 0.375rem);
        color: #ffffff;
      }

      .ec-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }
      .ec-modal-container {
        width: 100%;
        max-width: 640px;
        background: var(--color-surface-900, #121827);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
        border-radius: var(--radius-2xl, 1.5rem);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }
      .ec-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
      }
      .ec-modal-body {
        padding: 1.5rem;
      }
      .ec-preview-frame {
        padding: 1rem;
        background: var(--color-surface-950, #090d16);
        border-radius: var(--radius-xl, 1rem);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
      }
      .ec-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
      }

      .ec-file-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 140px;
        justify-content: flex-end;
      }
      .ec-progress-wrap {
        position: relative;
        width: 110px;
        height: 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 9999px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
      }
      .ec-progress-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: var(--ec-primary);
      }
      .ec-progress-text {
        position: relative;
        z-index: 2;
        font-size: 0.7rem;
        font-weight: 700;
        color: #ffffff;
      }
      .btn-ec-primary {
        padding: 0.5rem 1.25rem;
        border-radius: var(--radius-lg, 0.75rem);
        font-size: 0.85rem;
        font-weight: 600;
        background: var(--ec-primary);
        color: #ffffff;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }
      .btn-ec-primary:hover:not(:disabled) {
        background: color-mix(in srgb, var(--ec-primary) 85%, #ffffff);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px color-mix(in srgb, var(--ec-primary) 30%, transparent);
      }
      .btn-ec-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-ec-success {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-lg, 0.75rem);
        font-size: 0.85rem;
        font-weight: 600;
        background: #10b981;
        color: #ffffff;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }
      .btn-ec-success:hover {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      .btn-ec-secondary {
        padding: 0.4rem 0.85rem;
        border-radius: var(--radius-md, 0.5rem);
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
        color: var(--color-neutral-200, #e2e8f0);
        cursor: pointer;
      }
      .btn-ec-warning {
        padding: 0.25rem 0.6rem;
        border-radius: var(--radius-md, 0.35rem);
        font-size: 0.75rem;
        font-weight: 600;
        background: #f59e0b;
        color: #ffffff;
        border: none;
        cursor: pointer;
      }
      .btn-ec-danger {
        padding: 0.4rem 0.85rem;
        border-radius: var(--radius-md, 0.5rem);
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(244, 63, 94, 0.15);
        border: 1px solid rgba(244, 63, 94, 0.3);
        color: #f87171;
        cursor: pointer;
      }
      .btn-ec-ghost {
        background: transparent;
        border: none;
        color: var(--color-neutral-400, #94a3b8);
        font-size: 0.8rem;
        cursor: pointer;
      }
      .btn-xs {
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
      }
      .ec-cancel-btn,
      .ec-remove-btn,
      .ec-ghost-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--color-neutral-400, #94a3b8);
        cursor: pointer;
      }

      /* SECTION 53: RESPONSIVE BREAKPOINTS */
      @media (max-width: 768px) {
        .ec-file-card {
          flex-direction: column;
          align-items: stretch;
          gap: 1rem;
        }
        .ec-target-selection {
          flex-direction: column;
          align-items: flex-start;
        }
        .ec-file-actions {
          justify-content: space-between;
          width: 100%;
        }
      }
    `,
  ],
})
export class EasyConvertComponent {
  private readonly toast = inject(ToastService);
  readonly state = inject(ConversionStateService);
  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly isDraggingOver = this.state.isDraggingOver;
  readonly isDraggingGlobal = signal(false);
  readonly stripMetadataGlobal = this.state.stripMetadataGlobal;
  readonly fileList = this.state.fileQueue;
  readonly activePreviewItem = this.state.activePreviewItem;
  readonly showHistoryModal = signal(false);
  readonly historyLogs = signal<ConversionHistoryRecord[]>([]);

  readonly completedCount = this.state.completedCount;
  readonly failedCount = this.state.failedCount;

  private activeConcurrency = 0;
  private readonly MAX_CONCURRENCY = 2;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.activePreviewItem()) {
        this.closePreviewModal();
        return;
      }
      if (this.showHistoryModal()) {
        this.closeHistoryModal();
        return;
      }
    }

    const isCmdOrCtrl = event.ctrlKey || event.metaKey;

    if (isCmdOrCtrl && (event.key.toLowerCase() === 'u' || event.key.toLowerCase() === 'o')) {
      event.preventDefault();
      this.triggerFileInput();
      return;
    }

    if (isCmdOrCtrl && event.key === 'Enter') {
      event.preventDefault();
      if (this.canConvertAll()) {
        this.convertAllReady();
      }
      return;
    }
  }

  handleFilesFromDropzone(files: File[]): void {
    this.processFiles(files);
  }

  toggleGlobalMetadata(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.stripMetadataGlobal.set(checked);
  }

  triggerFileInput(): void {
    const input = this.fileInputRef()?.nativeElement;
    if (input) input.click();
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.types?.includes('Files')) {
      this.isDraggingGlobal.set(true);
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (event.clientX === 0 || event.clientY === 0) {
      this.isDraggingGlobal.set(false);
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingGlobal.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
    }
  }

  private async processFiles(files: File[]): Promise<void> {
    for (const rawFile of files) {
      const sanitizedName = FilenameSanitizerService.sanitizeFilename(rawFile.name);
      const ext = sanitizedName.split('.').pop()?.toLowerCase() || '';
      const capabilities = this.getCapabilities(ext);
      const remembered = localStorage.getItem(`ec_preset_${ext}`);
      const target =
        remembered || (capabilities.length > 0 ? capabilities[0].outputFormat : undefined);

      const inspection = await FileInspectorService.inspectFile(rawFile);
      const sizeClass = ClientConverterEngine.getFileSizeClass(rawFile.size);
      const fileHash = await FilenameSanitizerService.calculateFileHash(rawFile);

      let status: FileItem['status'] = 'ready';
      let formattedError: UserFacingError | undefined;

      if (rawFile.size > DEFAULT_RESOURCE_LIMITS.maxInputSizeBytes) {
        status = 'failed';
        formattedError = ErrorTaxonomy.formatError('FILE_TOO_LARGE', sanitizedName);
      } else if (!inspection.isValid) {
        if (inspection.isEncrypted) {
          status = 'encrypted';
          formattedError = ErrorTaxonomy.formatError('PASSWORD_PROTECTED', sanitizedName);
        } else {
          status = 'mismatch';
          formattedError = ErrorTaxonomy.formatError(
            'MIME_MISMATCH',
            sanitizedName,
            inspection.errorMessage,
          );
        }
      }

      const item: FileItem = {
        id: `job_${fileHash.substring(0, 10)}_${Math.random().toString(36).substring(2, 7)}`,
        name: sanitizedName,
        size: rawFile.size,
        type: rawFile.type,
        extension: ext,
        jobState: status === 'ready' ? 'QUEUED' : 'FAILED',
        status,
        targetFormat: target,
        progress: 0,
        sizeClass,
        inspection,
        formattedError,
        stripMetadata: this.stripMetadataGlobal(),
        advancedOptions: { quality: 0.92, orientation: 'portrait' },
        errorMessage: inspection.errorMessage,
        rawFile,
      };

      this.state.addFile(item);
      this.toast.info(`Added file: ${sanitizedName}`);
    }
  }

  async downloadBatchZip(): Promise<void> {
    const completedItems = this.fileList().filter(
      (f) => f.status === 'completed' && f.conversionResult,
    );
    if (completedItems.length === 0) return;

    this.toast.info('Preparing ZIP archive download...');

    const entries: ZipFileEntry[] = completedItems.map((item) => ({
      name: item.conversionResult!.fileName,
      blob: item.conversionResult!.blob,
    }));

    const zipBlob = await ZipBuilderService.createZip(entries);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'easyconvert-results.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toast.success(`Downloaded ${entries.length} files as easyconvert-results.zip`);
  }

  retryAllFailed(): void {
    const failedItems = this.fileList().filter(
      (f) => f.status === 'failed' || f.status === 'cancelled',
    );
    for (const item of failedItems) {
      this.retrySingleConversion(item);
    }
  }

  removeFailedItems(): void {
    this.fileList.update((list) =>
      list.filter((f) => f.status !== 'failed' && f.status !== 'mismatch'),
    );
  }

  openPreviewModal(item: FileItem): void {
    this.state.setPreviewItem(item);
  }

  closePreviewModal(): void {
    this.state.setPreviewItem(null);
  }

  openHistoryModal(): void {
    this.historyLogs.set(ConversionHistoryService.getHistory());
    this.showHistoryModal.set(true);
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
  }

  clearHistoryLogs(): void {
    ConversionHistoryService.clearHistory();
    this.historyLogs.set([]);
    this.toast.info('Local conversion history cleared');
  }

  toggleOptionsDrawer(fileId: string): void {
    this.fileList.update((list) =>
      list.map((item) =>
        item.id === fileId ? { ...item, showOptionsDrawer: !item.showOptionsDrawer } : item,
      ),
    );
  }

  updateOption(fileId: string, optionKey: keyof AdvancedConversionOptions, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.fileList.update((list) =>
      list.map((item) => {
        if (item.id === fileId) {
          const updatedOptions = { ...item.advancedOptions };
          if (optionKey === 'quality') updatedOptions.quality = parseFloat(val);
          if (optionKey === 'orientation') updatedOptions.orientation = val as any;
          return { ...item, advancedOptions: updatedOptions };
        }
        return item;
      }),
    );
  }

  confirmSignatureWarning(fileId: string): void {
    this.updateItem(fileId, { signatureWarningConfirmed: true });
  }

  setTargetFormat(fileId: string, format: string): void {
    this.fileList.update((list) =>
      list.map((item) => {
        if (item.id === fileId) {
          localStorage.setItem(`ec_preset_${item.extension}`, format);
          return { ...item, targetFormat: format };
        }
        return item;
      }),
    );
  }

  removeFile(fileId: string): void {
    const item = this.fileList().find((f) => f.id === fileId);
    if (item?.conversionResult?.previewUrl) {
      MemoryCleanupService.revokeUrl(item.conversionResult.previewUrl);
    }
    this.cancelSingleConversion(fileId);
    this.fileList.update((list) => list.filter((item) => item.id !== fileId));
  }

  clearAllFiles(): void {
    this.cancelAllActive();
    MemoryCleanupService.revokeAll();
    this.fileList.set([]);
  }

  ngOnDestroy(): void {
    MemoryCleanupService.revokeAll();
  }

  canConvertAll(): boolean {
    return this.fileList().some(
      (f) =>
        f.status === 'ready' &&
        f.targetFormat &&
        (!f.inspection?.hasDigitalSignature || f.signatureWarningConfirmed),
    );
  }

  hasProcessingItems(): boolean {
    return this.fileList().some((f) => f.status === 'processing');
  }

  convertAllReady(): void {
    const readyItems = this.fileList().filter(
      (f) =>
        f.status === 'ready' &&
        f.targetFormat &&
        (!f.inspection?.hasDigitalSignature || f.signatureWarningConfirmed),
    );
    this.toast.info(`Starting batch conversion for ${readyItems.length} files...`);
    this.processNextInQueue();
  }

  private processNextInQueue(): void {
    while (this.activeConcurrency < this.MAX_CONCURRENCY) {
      const nextItem = this.fileList().find(
        (f) =>
          f.status === 'ready' &&
          f.targetFormat &&
          (!f.inspection?.hasDigitalSignature || f.signatureWarningConfirmed),
      );
      if (!nextItem) break;
      this.convertSingleFile(nextItem);
    }
  }

  async convertSingleFile(item: FileItem): Promise<void> {
    if (
      !item.targetFormat ||
      item.status === 'processing' ||
      this.activeConcurrency >= this.MAX_CONCURRENCY
    ) {
      return;
    }

    const controller = new AbortController();
    this.activeConcurrency++;

    this.updateItem(item.id, {
      status: 'processing',
      jobState: 'PROCESSING',
      progress: 5,
      stageMessage: 'Queued for conversion...',
      abortController: controller,
    });

    try {
      const result = await ClientConverterEngine.convert(
        item.rawFile,
        item.targetFormat,
        (prog) =>
          this.updateItem(item.id, { progress: prog.percent, stageMessage: prog.stageMessage }),
        item.advancedOptions,
        controller.signal,
      );

      this.updateItem(item.id, {
        status: 'completed',
        jobState: 'COMPLETED',
        progress: 100,
        stageMessage: 'Conversion Verified',
        conversionResult: result,
      });

      // SECTION 65: RECORD LOCAL CONVERSION HISTORY
      ConversionHistoryService.addRecord({
        inputFilename: item.name,
        outputFilename: result.fileName,
        inputSize: item.size,
        outputSize: result.outputSize,
        sourceFormat: item.extension,
        targetFormat: item.targetFormat,
        status: 'COMPLETED',
      });

      this.toast.success(`Conversion complete: ${result.fileName}`);
    } catch (e: any) {
      if (controller.signal.aborted) {
        const err = ErrorTaxonomy.formatError('CANCELLED', item.name);
        this.updateItem(item.id, {
          status: 'cancelled',
          jobState: 'CANCELLED',
          progress: 0,
          formattedError: err,
          stageMessage: 'Conversion Cancelled',
        });
        this.toast.info(`Conversion cancelled: ${item.name}`);
      } else {
        const err = ErrorTaxonomy.formatError('ENGINE_FAILURE', item.name, e.message);
        this.updateItem(item.id, {
          status: 'failed',
          jobState: 'FAILED',
          progress: 0,
          formattedError: err,
          errorMessage: e.message,
          stageMessage: 'Conversion Failed',
        });
        this.toast.error(`Conversion failed for ${item.name}: ${e.message}`);
      }
    } finally {
      this.activeConcurrency--;
      this.processNextInQueue();
    }
  }

  cancelSingleConversion(fileId: string): void {
    const item = this.fileList().find((f) => f.id === fileId);
    if (item && item.abortController) {
      this.updateItem(fileId, { stageMessage: 'Stopping conversion...' });
      item.abortController.abort();
    }
  }

  cancelAllActive(): void {
    for (const item of this.fileList()) {
      if (item.status === 'processing' && item.abortController) {
        this.updateItem(item.id, { stageMessage: 'Stopping conversion...' });
        item.abortController.abort();
      }
    }
  }

  retrySingleConversion(item: FileItem): void {
    const currentRetries = (item.retryCount || 0) + 1;
    if (currentRetries > 3) {
      this.toast.error(`Max retries exceeded for ${item.name} (3/3)`);
      return;
    }
    this.updateItem(item.id, {
      status: 'ready',
      jobState: 'QUEUED',
      progress: 0,
      formattedError: undefined,
      errorMessage: undefined,
      retryCount: currentRetries,
    });
    this.convertSingleFile(item);
  }

  private triggerNextInQueue(): void {
    if (this.activeConcurrency < this.MAX_CONCURRENCY) {
      const nextItem = this.fileList().find(
        (f) =>
          f.status === 'ready' &&
          f.targetFormat &&
          (!f.inspection?.hasDigitalSignature || f.signatureWarningConfirmed),
      );
      if (nextItem) {
        this.convertSingleFile(nextItem);
      }
    }
  }

  downloadOutput(item: FileItem): void {
    if (!item.conversionResult) return;
    const url = URL.createObjectURL(item.conversionResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.conversionResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast.success(`Download started: ${item.conversionResult.fileName}`);
  }

  private updateItem(id: string, partial: Partial<FileItem>): void {
    this.fileList.update((list) => list.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  }

  getCapabilities(extension: string): ConversionCapability[] {
    return ConversionRegistryService.getCapabilitiesForExtension(extension);
  }

  getPrivacyInfo(
    inputExt: string,
    outputExt?: string,
  ): { text: string; icon: string; isLocal: boolean } {
    return ConversionRegistryService.getPrivacyBadge(inputExt, outputExt);
  }

  getFileIcon(extension: string): string {
    const ext = extension.toLowerCase();
    if (['pdf'].includes(ext)) return 'file-text';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'scan-text';
    if (['doc', 'docx'].includes(ext)) return 'file-code';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table-2';
    return 'file';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
