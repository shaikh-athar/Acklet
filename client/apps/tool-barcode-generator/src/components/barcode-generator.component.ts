// apps/tool-barcode-generator/src/components/barcode-generator.component.ts
import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TsIconComponent, ResponsiveService } from '@acklet/tool-shell';

import {
  BarcodeFormat,
  BarcodeDesignOptions,
  FormatPerOptions,
  DEFAULT_DESIGN_OPTIONS,
  BarcodeValidationResult,
  BarcodeVerificationResult,
  BarcodeHistoryItem
} from '../models/barcode.models';
import { BARCODE_REGISTRY } from '../config/barcode-registry';
import { ValidatorService } from '../services/validator.service';
import { RenderService } from '../services/render.service';
import { VerifyService } from '../services/verify.service';
import { BarcodeExportService } from '../services/barcode-export.service';
import { BarcodeHistoryService } from '../services/barcode-history.service';
import { ShareService } from '../services/share.service';
import { AnalyticsService } from '../services/analytics.service';
import { FormatRegistryService } from '../services/format-registry.service';
import { BulkStateService } from '../services/bulk-state.service';

import { BarcodeContentPanelComponent } from './content-panel/content-panel.component';
import { BarcodeCustomizePanelComponent } from './customize-panel/customize-panel.component';
import { BarcodeBulkPanelComponent } from './bulk-panel/bulk-panel.component';
import { BarcodeBulkPreviewComponent } from './bulk-preview/bulk-preview.component';
import { BarcodePreviewPanelComponent } from './preview-panel/preview-panel.component';
import { BarcodeHistoryModalComponent } from './history-modal/history-modal.component';
import { BarcodeSettingsModalComponent } from './settings-modal/settings-modal.component';

export type GeneratorTab = 'content' | 'customize' | 'bulk' | 'preview';

@Component({
  selector: 'app-barcode-generator',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    BarcodeContentPanelComponent,
    BarcodeCustomizePanelComponent,
    BarcodeBulkPanelComponent,
    BarcodeBulkPreviewComponent,
    BarcodePreviewPanelComponent,
    BarcodeHistoryModalComponent,
    BarcodeSettingsModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barcode-tool-workspace" [attr.data-view]="currentTab()">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- DRAG AND DROP FILE GATHER SCREEN OVERLAY                     -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (isDragOverScreen()) {
        <div class="screen-file-gather-overlay" aria-modal="true" role="dialog" aria-label="Drop file to gather barcodes">
          <div class="gather-drop-card animate-gather-pop">
            <div class="gather-icon-wrapper">
              <div class="gather-sonar-ring ring-1"></div>
              <div class="gather-sonar-ring ring-2"></div>
              <div class="gather-icon-circle">
                <ts-icon name="upload-cloud" [size]="44" class="gather-icon" />
              </div>
            </div>

            <div class="gather-text-col">
              <h2 class="gather-headline">Drop file to gather barcodes</h2>
              <p class="gather-subline">
                Release your CSV, TSV, or text file anywhere to parse and generate barcodes in bulk
              </p>
            </div>

            <div class="gather-specs-row">
              <span class="gather-chip">.csv</span>
              <span class="gather-chip">.tsv</span>
              <span class="gather-chip">.txt</span>
              <span class="gather-chip-sep">•</span>
              <span class="gather-meta-text">Max 2 MB</span>
              <span class="gather-chip-sep">•</span>
              <span class="gather-meta-text">Up to 500 records</span>
            </div>
          </div>
        </div>
      }

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- Workspace Container (Two-column Desktop / Compact Mobile)   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- Workspace Container (Two-column Desktop / Stacked Tablet & Phone) -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="workspace-layout-grid">
        
        <!-- Small screens (sm: <=639px): Preview is rendered on dedicated Preview tab -->
        @if (responsive.isSm() && currentTab() === 'preview') {
          <section
            class="workspace-card mobile-preview-card slide-fade-in"
            [attr.aria-label]="lastFormTab() === 'bulk' ? 'Bulk live preview' : 'Barcode live preview'"
          >
            <!-- Card Tab Navigation Strip (allows switching back to form tabs) -->
            <div class="card-tabs-header" role="tablist">
              <button
                type="button"
                role="tab"
                id="tab-content-m"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'content'"
                [attr.aria-selected]="currentTab() === 'content'"
                aria-controls="panel-content"
                (click)="setTab('content')"
              >
                <ts-icon name="file-text" [size]="16" class="tab-icon" />
                <span class="tab-label">Content</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-customize-m"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'customize'"
                [attr.aria-selected]="currentTab() === 'customize'"
                aria-controls="panel-customize"
                (click)="setTab('customize')"
              >
                <ts-icon name="sliders" [size]="16" class="tab-icon" />
                <span class="tab-label">Customize</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-bulk-m"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'bulk'"
                [attr.aria-selected]="currentTab() === 'bulk'"
                aria-controls="panel-bulk"
                (click)="setTab('bulk')"
              >
                <ts-icon name="layers" [size]="16" class="tab-icon" />
                <span class="tab-label">Bulk</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-preview-m"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'preview'"
                [attr.aria-selected]="currentTab() === 'preview'"
                aria-controls="panel-preview"
                (click)="setTab('preview')"
              >
                <ts-icon name="eye" [size]="16" class="tab-icon" />
                <span class="tab-label">Preview</span>
              </button>
            </div>

            <!-- Preview Card Content -->
            <div class="card-content-area custom-scrollbar">
              @if (lastFormTab() === 'bulk') {
                <app-barcode-bulk-preview />
              } @else {
                <app-barcode-preview-panel
                  [barcodeName]="barcodeName()"
                  [format]="format()"
                  [isValid]="validation().valid && !!svgResult()?.svg"
                  [hasValue]="!!value().trim()"
                  [validationError]="validation().errorMessage || null"
                  [isGenerating]="isGenerating()"
                  [shouldAnimate]="shouldAnimateScan()"
                  [svgContent]="svgResult()?.svg || ''"
                  [renderError]="renderError()"
                  [verification]="verificationResult()"
                  [historyCount]="historyService.items().length"
                  [rawValue]="value()"
                  [encodedValue]="svgResult()?.encodedValue || validation().cleanValue"
                  [canSaveSeparate]="canSaveSeparate()"
                  (saveSeparate)="onSaveSeparate()"
                  (download)="onDownload($event)"
                  (copyImageClick)="onCopyImage()"
                  (shareClick)="onShare()"
                  (saveClick)="onSave()"
                  (openHistory)="isHistoryModalOpen.set(true)"
                  (openSettings)="isSettingsModalOpen.set(true)"
                />
              }
            </div>
          </section>
        } @else {
          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- FORM CARD: Tabs (Content, Customize, Bulk, Preview on sm)  -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <section
            class="workspace-card left-card"
            aria-label="Barcode configuration"
          >
            <!-- Card Tab Navigation Strip -->
            <div class="card-tabs-header" role="tablist">
              <button
                type="button"
                role="tab"
                id="tab-content"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'content'"
                [attr.aria-selected]="currentTab() === 'content'"
                aria-controls="panel-content"
                (click)="setTab('content')"
              >
                <ts-icon name="file-text" [size]="16" class="tab-icon" />
                <span class="tab-label">Content</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-customize"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'customize'"
                [attr.aria-selected]="currentTab() === 'customize'"
                aria-controls="panel-customize"
                (click)="setTab('customize')"
              >
                <ts-icon name="sliders" [size]="16" class="tab-icon" />
                <span class="tab-label">Customize</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-bulk"
                class="tab-strip-btn"
                [class.active]="currentTab() === 'bulk'"
                [attr.aria-selected]="currentTab() === 'bulk'"
                aria-controls="panel-bulk"
                (click)="setTab('bulk')"
              >
                <ts-icon name="layers" [size]="16" class="tab-icon" />
                <span class="tab-label">Bulk</span>
              </button>

              <!-- Dedicated Preview Tab on small screens (<640px) -->
              @if (responsive.isSm()) {
                <button
                  type="button"
                  role="tab"
                  id="tab-preview-strip"
                  class="tab-strip-btn"
                  [class.active]="currentTab() === 'preview'"
                  [attr.aria-selected]="currentTab() === 'preview'"
                  aria-controls="panel-preview"
                  (click)="setTab('preview')"
                >
                  <ts-icon name="eye" [size]="16" class="tab-icon" />
                  <span class="tab-label">Preview</span>
                </button>
              }
            </div>

            <!-- Card Scrollable Content Area -->
            <div class="card-content-area custom-scrollbar">
              <!-- 1. Content Tab -->
              @if (currentTab() === 'content') {
                <div id="panel-content" role="tabpanel" aria-labelledby="tab-content" class="tab-panel slide-fade-in">
                  <app-barcode-content-panel
                    [(barcodeName)]="barcodeName"
                    [format]="format()"
                    [(value)]="value"
                    [(formatOptions)]="formatOptions"
                    [validation]="validation()"
                    [canSaveSeparate]="canSaveSeparate()"
                    (saveSeparate)="onSaveSeparate()"
                    (formatChangeRequest)="handleFormatChangeRequest($event)"
                    (customizeClick)="setTab('customize')"
                  />
                </div>
              }

              <!-- 2. Customize Tab -->
              @if (currentTab() === 'customize') {
                <div id="panel-customize" role="tabpanel" aria-labelledby="tab-customize" class="tab-panel slide-fade-in">
                  <app-barcode-customize-panel
                    [(options)]="designOptions"
                    [format]="format()"
                  />
                </div>
              }

              <!-- 3. Bulk Tab -->
              @if (currentTab() === 'bulk') {
                <div id="panel-bulk" role="tabpanel" aria-labelledby="tab-bulk" class="tab-panel slide-fade-in">
                  <app-barcode-bulk-panel
                    [format]="format()"
                    [formatOptions]="formatOptions()"
                    [designOptions]="designOptions()"
                    [barcodeName]="barcodeName()"
                    (formatChangeRequest)="handleFormatChangeRequest($event)"
                    (switchToCustomize)="setTab('customize')"
                  />
                </div>
              }
            </div>

            <!-- Compact Mobile Sticky Bottom Bar: Case 1 (Show preview) vs Case 2 (Generate) -->
            @if (responsive.isSm() && currentTab() !== 'bulk') {
              <div class="mobile-sticky-action-bar">
                @if (!hasContentToGenerate()) {
                  <!-- Case 1: When nothing generated with the content: Show Preview button with collapse and expand -->
                  <button
                    type="button"
                    class="mobile-show-preview-btn"
                    (click)="setTab('preview')"
                    aria-label="Show barcode preview"
                  >
                    <span class="preview-btn-label-group">
                      <ts-icon name="eye" [size]="16" />
                      <span>Show Preview</span>
                    </span>
                    <ts-icon name="chevron-right" [size]="14" />
                  </button>
                } @else {
                  <!-- Case 2: Something is added in input or customized: Show Generate button -->
                  <button
                    type="button"
                    class="mobile-generate-btn"
                    [disabled]="!validation().valid || !value().trim()"
                    (click)="onMobileGenerate()"
                    aria-label="Generate barcode and view preview"
                  >
                    <ts-icon name="barcode" [size]="18" />
                    <span>Generate</span>
                  </button>
                }
              </div>
            }
          </section>
        }

        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- TABLET (md: 640px-1023px): Collapsible Preview Below Form  -->
        <!-- ══════════════════════════════════════════════════════════ -->
        @if (responsive.isMd()) {
          <div class="md-preview-collapsible-section">
            <div class="md-preview-header-bar">
              <div class="md-preview-title-row">
                <ts-icon name="eye" [size]="16" />
                <span class="md-preview-title">{{ currentTab() === 'bulk' ? 'Bulk Preview' : 'Barcode Preview' }}</span>
              </div>
              <div class="md-preview-actions-row">
                @if (!hasContentToGenerate() || !isMdPreviewCollapsed()) {
                  <!-- Case 1: Nothing generated OR preview is already open: Show collapse/expand toggle -->
                  <button
                    type="button"
                    class="md-preview-toggle-btn"
                    (click)="toggleMdPreview()"
                    [attr.aria-expanded]="!isMdPreviewCollapsed()"
                  >
                    <ts-icon [name]="isMdPreviewCollapsed() ? 'chevron-down' : 'chevron-up'" [size]="14" />
                    <span>{{ isMdPreviewCollapsed() ? 'Show preview' : 'Hide preview' }}</span>
                  </button>
                } @else {
                  <!-- Case 2: Input or customization added and preview collapsed: Show Generate button -->
                  <button
                    type="button"
                    class="md-generate-btn"
                    [disabled]="!validation().valid || !value().trim()"
                    (click)="onMdGenerate()"
                    aria-label="Generate barcode and open preview"
                  >
                    <ts-icon name="barcode" [size]="15" />
                    <span>Generate</span>
                  </button>
                }
              </div>
            </div>

            @if (!isMdPreviewCollapsed()) {
              <section
                class="workspace-card right-card md-preview-card slide-fade-in"
                [attr.aria-label]="currentTab() === 'bulk' ? 'Bulk live preview' : 'Barcode live preview'"
              >
                @if (currentTab() === 'bulk') {
                  <app-barcode-bulk-preview />
                } @else {
                  <app-barcode-preview-panel
                    [barcodeName]="barcodeName()"
                    [format]="format()"
                    [isValid]="validation().valid && !!svgResult()?.svg"
                    [hasValue]="!!value().trim()"
                    [validationError]="validation().errorMessage || null"
                    [isGenerating]="isGenerating()"
                    [shouldAnimate]="shouldAnimateScan()"
                    [svgContent]="svgResult()?.svg || ''"
                    [renderError]="renderError()"
                    [verification]="verificationResult()"
                    [historyCount]="historyService.items().length"
                    [rawValue]="value()"
                    [encodedValue]="svgResult()?.encodedValue || validation().cleanValue"
                    [canSaveSeparate]="canSaveSeparate()"
                    (saveSeparate)="onSaveSeparate()"
                    (download)="onDownload($event)"
                    (copyImageClick)="onCopyImage()"
                    (shareClick)="onShare()"
                    (saveClick)="onSave()"
                    (openHistory)="isHistoryModalOpen.set(true)"
                    (openSettings)="isSettingsModalOpen.set(true)"
                  />
                }
              </section>
            }
          </div>
        }

        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- DESKTOP & LARGE (lg, xl: >=1024px): Sticky Right Preview   -->
        <!-- ══════════════════════════════════════════════════════════ -->
        @if (!responsive.isSm() && !responsive.isMd()) {
          <section
            class="workspace-card right-card"
            [attr.aria-label]="currentTab() === 'bulk' ? 'Bulk live preview' : 'Barcode live preview'"
          >
            @if (currentTab() === 'bulk') {
              <app-barcode-bulk-preview />
            } @else {
              <app-barcode-preview-panel
                [barcodeName]="barcodeName()"
                [format]="format()"
                [isValid]="validation().valid && !!svgResult()?.svg"
                [hasValue]="!!value().trim()"
                [validationError]="validation().errorMessage || null"
                [isGenerating]="isGenerating()"
                [shouldAnimate]="shouldAnimateScan()"
                [svgContent]="svgResult()?.svg || ''"
                [renderError]="renderError()"
                [verification]="verificationResult()"
                [historyCount]="historyService.items().length"
                [rawValue]="value()"
                [encodedValue]="svgResult()?.encodedValue || validation().cleanValue"
                [canSaveSeparate]="canSaveSeparate()"
                (saveSeparate)="onSaveSeparate()"
                (download)="onDownload($event)"
                (copyImageClick)="onCopyImage()"
                (shareClick)="onShare()"
                (saveClick)="onSave()"
                (openHistory)="isHistoryModalOpen.set(true)"
                (openSettings)="isSettingsModalOpen.set(true)"
              />
            }
          </section>
        }
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- Modals: History & Settings                                   -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <app-barcode-history-modal
        [isOpen]="isHistoryModalOpen()"
        [items]="historyService.items()"
        [dontSaveHistory]="historyService.dontSaveHistory()"
        [totalGenerated]="historyService.totalGeneratedCount()"
        (close)="isHistoryModalOpen.set(false)"
        (restore)="restoreHistoryItem($event)"
        (deleteItem)="historyService.deleteItem($event)"
        (clearAll)="historyService.clearAll()"
        (toggleDontSaveHistory)="historyService.setDontSaveHistory($event)"
        (renameItem)="onRenameHistoryItem($event)"
      />

      <app-barcode-settings-modal
        [isOpen]="isSettingsModalOpen()"
        (close)="isSettingsModalOpen.set(false)"
        (resetAll)="resetAllSettings()"
      />
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      width: 100%;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      overflow: hidden;
    }

    .barcode-tool-workspace {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      width: 100%;
      max-width: 1600px;
      margin: 0 auto;
      height: 100%;
      min-height: 0;
      padding: 16px;
      box-sizing: border-box;
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* Breakpoint 1: Desktop & Large (lg, xl: >= 1024px)              */
    /* Two-column shell: left 36-40% (min 380px, max 520px), sticky right */
    /* ══════════════════════════════════════════════════════════════ */
    @media (min-width: 1024px) {
      .workspace-layout-grid {
        display: grid;
        grid-template-columns: clamp(380px, 38%, 520px) minmax(0, 1fr);
        gap: 16px;
        width: 100%;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
      }

      .right-card {
        position: sticky;
        top: 0;
        height: 100%;
        min-height: 0;
      }
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* Breakpoint 2: Medium (md: 640px to 1023px)                      */
    /* Single column stacked: tabs on top, preview below with collapse toggle */
    /* ══════════════════════════════════════════════════════════════ */
    @media (min-width: 640px) and (max-width: 1023px) {
      .barcode-tool-workspace {
        padding: 16px;
        height: auto;
        min-height: 100%;
        overflow-y: auto;
      }

      .workspace-layout-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        height: auto;
        min-height: 100%;
      }

      .left-card {
        width: 100%;
        min-height: 0;
      }

      .md-preview-collapsible-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .md-preview-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        border-radius: 12px;
        background: var(--bg-surface, #1e1e24);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      }

      :host-context([data-theme="light"]) .md-preview-header-bar {
        background: #FFFFFF;
        border-color: rgba(0, 0, 0, 0.08);
      }

      .md-preview-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        font-weight: 600;
        color: var(--text, #fcfcfc);
      }

      :host-context([data-theme="light"]) .md-preview-title-row {
        color: #0F172A;
      }

      .md-preview-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        min-height: 36px;
        border-radius: 8px;
        background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
        border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
        color: var(--text, #fcfcfc);
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--ts-dur-fast, 150ms) ease;
      }

      :host-context([data-theme="light"]) .md-preview-toggle-btn {
        background: #F1F5F9;
        border-color: rgba(0, 0, 0, 0.1);
        color: #0F172A;
      }

      .md-preview-toggle-btn:hover {
        background: var(--bg-surface-hover, rgba(255, 255, 255, 0.1));
      }

      :host-context([data-theme="light"]) .md-preview-toggle-btn:hover {
        background: #E2E8F0;
      }

      .md-preview-actions-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .md-generate-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        min-height: 36px;
        border-radius: 8px;
        background: var(--tool-accent, #2563EB);
        color: #FFFFFF;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        touch-action: manipulation;
        box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
        transition: all 0.05s ease-in-out;
      }

      .md-generate-btn:hover:not(:disabled) {
        background: var(--accent-blue-hover, #1D4ED8);
      }

      .md-generate-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .md-preview-card {
        width: 100%;
        min-height: 480px;
        height: auto;
        transition: all 0.05s ease-in-out;
      }
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* Breakpoint 3: Small (sm: 0 to 639px)                            */
    /* Single column, 16px side padding, dedicated preview tab         */
    /* ══════════════════════════════════════════════════════════════ */
    @media (max-width: 639px) {
      .barcode-tool-workspace {
        padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
        height: 100dvh;
        overflow-y: auto;
      }

      .workspace-layout-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        height: auto;
        min-height: 100%;
      }

      .left-card,
      .mobile-preview-card {
        width: 100%;
        border-radius: 14px;
        height: auto;
        min-height: calc(100vh - 140px);
      }

      .card-tabs-header {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 4px !important;
        padding: 4px 6px !important;
        height: auto !important;
        min-height: 48px !important;
        box-sizing: border-box;
      }

      .tab-strip-btn {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px !important;
        min-width: 0 !important;
        width: 100% !important;
        padding: 4px 2px !important;
        min-height: 44px !important;
        border-radius: 8px !important;
        white-space: nowrap !important;
      }

      .tab-strip-btn .tab-icon {
        width: 16px !important;
        height: 16px !important;
        flex-shrink: 0;
      }

      .tab-strip-btn .tab-label,
      .tab-strip-btn span {
        font-size: 11px !important;
        line-height: 1.1 !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        max-width: 100% !important;
        text-align: center;
        display: block !important;
      }

      .mobile-sticky-action-bar {
        position: sticky;
        bottom: 0;
        padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)) 14px;
        border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        background: var(--bg-surface, #1e1e24);
        z-index: 20;
      }

      :host-context([data-theme="light"]) .mobile-sticky-action-bar {
        background: #FFFFFF;
        border-top-color: rgba(0, 0, 0, 0.08);
      }

      .mobile-generate-btn {
        width: 100%;
        min-height: 44px;
        padding: 12px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 10px;
        background: var(--tool-accent, #2563EB);
        color: #FFFFFF;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.05s ease-in-out;
      }

      .mobile-show-preview-btn {
        width: 100%;
        min-height: 44px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 10px;
        background: var(--bg-surface-raised, rgba(255, 255, 255, 0.08));
        color: var(--text, #fcfcfc);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        touch-action: manipulation;
        transition: all 0.05s ease-in-out;
      }

      :host-context([data-theme="light"]) .mobile-show-preview-btn {
        background: #F1F5F9;
        color: #0F172A;
        border-color: #CBD5E1;
      }

      .mobile-show-preview-btn:hover {
        background: var(--bg-surface, rgba(255, 255, 255, 0.12));
      }

      :host-context([data-theme="light"]) .mobile-show-preview-btn:hover {
        background: #E2E8F0;
      }

      .preview-btn-label-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
    }

    /* ══════════════════════════════════════════════════════════════ */
    /* Breakpoint Tier: Extra Small (xs: under 400px, e.g. 360x800)     */
    /* ══════════════════════════════════════════════════════════════ */
    @media (max-width: 399px) {
      .barcode-tool-workspace {
        padding: 4px 6px calc(12px + env(safe-area-inset-bottom, 0px)) 6px;
      }

      .workspace-layout-grid {
        gap: 8px;
      }

      .left-card,
      .mobile-preview-card {
        border-radius: 12px;
      }

      .card-tabs-header {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 3px !important;
        padding: 4px 6px !important;
        height: 52px !important;
        border-radius: 12px 12px 0 0;
      }

      .tab-strip-btn {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px !important;
        min-width: 0 !important;
        padding: 4px 2px !important;
        min-height: 44px !important;
        border-radius: 8px !important;
      }

      .tab-strip-btn .tab-icon {
        width: 16px !important;
        height: 16px !important;
        flex-shrink: 0;
      }

      .tab-strip-btn .tab-label,
      .tab-strip-btn span {
        font-size: 11px !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        max-width: 100% !important;
        text-align: center;
      }

      .mobile-sticky-action-bar {
        padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px;
      }

      .mobile-generate-btn,
      .mobile-show-preview-btn {
        width: 100%;
        min-height: 44px;
        padding: 10px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 10px;
      }
    }

    /* Workspace Cards: Structured Glass Cards with Container Queries */
    .workspace-card {
      container-type: inline-size;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      border-radius: var(--shell-card-radius, 16px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }

    :host-context([data-theme="light"]) .workspace-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    /* Left Card: Tab Navigation Strip */
    .card-tabs-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .card-tabs-header {
      border-bottom-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .tab-strip-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      min-height: 44px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .tab-strip-btn span,
    .tab-strip-btn .tab-label {
      white-space: nowrap;
    }

    .tab-strip-btn:hover:not(.active) {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .tab-strip-btn:hover:not(.active) {
      color: #0F172A;
      background: #F1F5F9;
    }

    .tab-strip-btn.active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .tab-strip-btn.active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    .tab-strip-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    .tab-icon {
      flex-shrink: 0;
    }

    /* Scrollable Content Area */
    .card-content-area {
      flex: 1;
      overflow-y: auto;
      padding: 18px 20px;
      min-height: 0;
    }

    .tab-panel {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    /* Mobile Sticky Action Bar */
    .mobile-sticky-action-bar {
      position: sticky;
      bottom: 0;
      padding: 12px 14px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-surface, #1e1e24);
      z-index: 10;
    }

    :host-context([data-theme="light"]) .mobile-sticky-action-bar {
      background: #FFFFFF;
      border-top-color: rgba(0, 0, 0, 0.08);
    }

    .mobile-generate-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      min-height: 44px;
      padding: 12px;
      border-radius: 10px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
    }

    .mobile-generate-btn:hover {
      background: var(--tool-accent-hover, #2563EB);
    }

    .mobile-generate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .slide-fade-in {
      animation: tabFadeIn 0.05s ease-in-out;
    }

    @keyframes tabFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ═══════════════════════════════════════════════════════════════ */
    /* Full-Screen Drag and Drop File Gather Screen Overlay            */
    /* ═══════════════════════════════════════════════════════════════ */
    .screen-file-gather-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
      animation: gatherFadeIn 0.18s ease-out;
    }

    :host-context([data-theme="light"]) .screen-file-gather-overlay {
      background: rgba(241, 245, 249, 0.88);
    }

    .gather-drop-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 18px;
      padding: 44px 36px;
      width: 100%;
      max-width: 520px;
      border-radius: 20px;
      background: #1E293B;
      border: 2.5px dashed var(--tool-accent, #3B82F6);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(59, 130, 246, 0.3);
      box-sizing: border-box;
      pointer-events: none;
    }

    :host-context([data-theme="light"]) .gather-drop-card {
      background: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12), 0 0 35px rgba(37, 99, 235, 0.22);
    }

    @keyframes gatherFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes gatherPop {
      0% { transform: scale(0.94); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .animate-gather-pop {
      animation: gatherPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .gather-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
    }

    .gather-sonar-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(59, 130, 246, 0.45);
      animation: sonarPulse 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }

    :host-context([data-theme="light"]) .gather-sonar-ring {
      border-color: rgba(37, 99, 235, 0.4);
    }

    .ring-2 {
      animation-delay: 0.7s;
    }

    @keyframes sonarPulse {
      0% { transform: scale(0.85); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .gather-icon-circle {
      position: relative;
      z-index: 2;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: gatherFloat 2.5s ease-in-out infinite;
    }

    :host-context([data-theme="light"]) .gather-icon-circle {
      background: #EFF6FF;
    }

    @keyframes gatherFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    .gather-icon {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .gather-icon {
      color: #2563EB;
    }

    .gather-text-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .gather-headline {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #F8FAFC;
    }

    :host-context([data-theme="light"]) .gather-headline {
      color: #0F172A;
    }

    .gather-subline {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.5;
      color: #94A3B8;
      max-width: 400px;
    }

    :host-context([data-theme="light"]) .gather-subline {
      color: #475569;
    }

    .gather-specs-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 4px;
    }

    .gather-chip {
      padding: 3px 8px;
      font-size: 11.5px;
      font-family: monospace;
      font-weight: 600;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.16);
      color: #93C5FD;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    :host-context([data-theme="light"]) .gather-chip {
      background: #EFF6FF;
      color: #1D4ED8;
      border-color: rgba(37, 99, 235, 0.25);
    }

    .gather-chip-sep {
      color: #64748B;
      font-size: 12px;
    }

    .gather-meta-text {
      font-size: 12px;
      color: #94A3B8;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .gather-meta-text {
      color: #64748B;
    }
  `]
})
export class BarcodeGeneratorComponent implements OnInit, OnDestroy {
  readonly responsive = inject(ResponsiveService);
  private validator = inject(ValidatorService);
  private renderer = inject(RenderService);
  private verifier = inject(VerifyService);
  private exportService = inject(BarcodeExportService);
  readonly historyService = inject(BarcodeHistoryService);
  private shareService = inject(ShareService);
  private analyticsService = inject(AnalyticsService);
  private formatRegistry = inject(FormatRegistryService);
  readonly bulkState = inject(BulkStateService);

  // Drag-and-Drop Screen File Gather State
  readonly isDragOverScreen = signal<boolean>(false);
  private dragCounter = 0;

  // Active Tab & Tablet Preview Collapse
  readonly currentTab = signal<GeneratorTab>('content');
  readonly lastFormTab = signal<GeneratorTab>('content');
  readonly isMdPreviewCollapsed = signal<boolean>(false);

  toggleMdPreview(): void {
    this.isMdPreviewCollapsed.update(v => !v);
  }

  // Input & Design State
  readonly barcodeName = signal<string>('Barcode 1');
  readonly format = signal<BarcodeFormat>('code128');
  readonly value = signal<string>(''); // Starts empty
  readonly formatOptions = signal<FormatPerOptions>({});
  readonly designOptions = signal<BarcodeDesignOptions>({ ...DEFAULT_DESIGN_OPTIONS });

  // Output & Runtime State
  readonly isGenerating = signal<boolean>(false);
  readonly svgResult = signal<{ svg: string; width: number; height: number; displayValue: string; encodedValue?: string } | null>(null);
  readonly verificationResult = signal<BarcodeVerificationResult | null>(null);
  readonly hasGeneratedOnce = signal<boolean>(false);
  readonly shouldAnimateScan = signal<boolean>(false);
  readonly isPhoneGenerated = signal<boolean>(false);
  readonly renderError = signal<string | null>(null);

  // Active Barcode Tracking
  readonly activeBarcodeId = signal<string | null>(null);
  readonly savedBarcodeState = signal<{ id: string; name: string; format: string; value: string } | null>(null);

  readonly canSaveSeparate = computed<boolean>(() => {
    const saved = this.savedBarcodeState();
    if (!saved || !saved.value) return false;
    const currentVal = this.value().trim();
    return currentVal.length > 0 && currentVal !== saved.value && this.validation().valid;
  });

  readonly hasContentToGenerate = computed<boolean>(() => {
    const hasVal = this.value().trim().length > 0;
    const hasBulkRecords = this.bulkState.activeValidRecords().length > 0;
    return hasVal || hasBulkRecords;
  });

  // Modals State
  readonly isHistoryModalOpen = signal<boolean>(false);
  readonly isSettingsModalOpen = signal<boolean>(false);

  // Debouncing Stream & Pipeline
  private generateSubject = new Subject<void>();
  private sub = new Subscription();
  private latestRequestId = 0;
  private renderCache = new Map<string, { svg: string; width: number; height: number; displayValue: string; encodedValue?: string }>();
  private lastRenderedBarcodeContent = '';
  private scanAnimationTimeout: any = null;

  readonly validation = computed<BarcodeValidationResult>(() => {
    const item = this.formatRegistry.getFormat(this.format());
    if (!item) {
      return {
        valid: false,
        cleanValue: '',
        displayValue: '',
        errorMessage: 'Unknown format.'
      };
    }
    return this.validator.validate(item, this.value(), this.formatOptions());
  });

  constructor() {
    effect(() => {
      const fmt = this.format();
      const val = this.value();
      const fo = this.formatOptions();
      const d = this.designOptions();

      untracked(() => {
        this.analyticsService.recordFormatSelection(fmt);
        this.triggerDebouncedGeneration();
      });
    });

    // Seamlessly restore form tab if user rotates or resizes away from small screen while on preview tab
    effect(() => {
      const isSm = this.responsive.isSm();
      if (!isSm && this.currentTab() === 'preview') {
        untracked(() => {
          this.currentTab.set(this.lastFormTab());
        });
      }
    });
  }

  ngOnInit(): void {
    this.barcodeName.set(this.historyService.getNextFreeBarcodeName());

    // 120 ms debounce as specified in requirements
    this.sub.add(
      this.generateSubject.pipe(debounceTime(120)).subscribe(() => {
        this.renderBarcode();
      })
    );

    this.readUrlParams();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.scanAnimationTimeout) {
      clearTimeout(this.scanAnimationTimeout);
    }
  }

  private triggerScanAnimation(): void {
    if (this.scanAnimationTimeout) {
      clearTimeout(this.scanAnimationTimeout);
      this.scanAnimationTimeout = null;
    }
    // Briefly reset to false so CSS animation re-mounts/re-triggers cleanly
    this.shouldAnimateScan.set(false);
    requestAnimationFrame(() => {
      this.shouldAnimateScan.set(true);
      this.scanAnimationTimeout = setTimeout(() => {
        this.shouldAnimateScan.set(false);
        this.scanAnimationTimeout = null;
      }, 700);
    });
  }

  setTab(tab: GeneratorTab): void {
    if (tab !== 'preview') {
      this.lastFormTab.set(tab);
    }
    this.currentTab.set(tab);
  }

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter++;
      this.isDragOverScreen.set(true);
    }
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
      if (!this.isDragOverScreen()) {
        this.isDragOverScreen.set(true);
      }
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter = Math.max(0, this.dragCounter - 1);
      if (this.dragCounter === 0) {
        this.isDragOverScreen.set(false);
      }
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.dragCounter = 0;
      this.isDragOverScreen.set(false);

      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleDroppedFile(files[0]);
      }
    }
  }

  private hasFilesBeingDragged(event: DragEvent): boolean {
    if (!event.dataTransfer) return false;
    const types = event.dataTransfer.types;
    return types ? Array.from(types).includes('Files') : false;
  }

  handleDroppedFile(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      this.bulkState.loadCsvFile(file.name, text);
      this.setTab('bulk');
    };
    reader.readAsText(file);
  }

  triggerDebouncedGeneration(): void {
    this.generateSubject.next();
  }

  async onMobileGenerate(): Promise<void> {
    await this.renderBarcode();
    this.isPhoneGenerated.set(true);
    this.triggerScanAnimation();
    if (this.responsive.isSm()) {
      this.setTab('preview');
    }
  }

  async onMdGenerate(): Promise<void> {
    await this.renderBarcode();
    this.isMdPreviewCollapsed.set(false);
    this.triggerScanAnimation();
  }

  private async renderBarcode(): Promise<void> {
    const val = this.validation();
    const item = this.formatRegistry.getFormat(this.format());
    if (!val.valid || !val.cleanValue || !item) {
      this.svgResult.set(null);
      this.verificationResult.set(null);
      this.renderError.set(null);
      return;
    }

    const currentReqId = ++this.latestRequestId;
    const cacheKey = JSON.stringify({
      format: this.format(),
      variant: this.formatOptions().variant,
      cleanValue: val.cleanValue,
      formatOptions: this.formatOptions(),
      designOptions: this.designOptions()
    });

    if (this.renderCache.has(cacheKey)) {
      const cached = this.renderCache.get(cacheKey)!;
      this.svgResult.set(cached);
      this.renderError.set(null);
      this.isGenerating.set(false);
      return;
    }

    this.isGenerating.set(true);
    this.renderError.set(null);

    try {
      const result = await this.renderer.render(
        item,
        val.cleanValue,
        val.displayValue,
        this.designOptions(),
        this.formatOptions()
      );

      if (currentReqId !== this.latestRequestId) {
        // Obsolete request discarded
        return;
      }

      if (!result || !result.svg || !result.svg.trim()) {
        throw new Error('Render output is empty');
      }

      // Bound cache to 20 entries (LRU-style FIFO delete)
      if (this.renderCache.size >= 20) {
        const firstKey = this.renderCache.keys().next().value;
        if (firstKey) this.renderCache.delete(firstKey);
      }
      this.renderCache.set(cacheKey, result);

      // Trigger laser scan animation whenever the barcode output content changes
      // Excludes purely layout/size changes (sizePreset, quietZone, frame)
      const currentBarcodeContent = `${this.format()}:${this.formatOptions().variant || ''}:${val.cleanValue}:${JSON.stringify(this.formatOptions())}`;
      const isBarcodeOutputChanged = !this.lastRenderedBarcodeContent || this.lastRenderedBarcodeContent !== currentBarcodeContent;

      if (isBarcodeOutputChanged) {
        this.lastRenderedBarcodeContent = currentBarcodeContent;
        this.triggerScanAnimation();
      }

      this.svgResult.set(result);

      // Save initial render to history and establish tracking
      if (!this.savedBarcodeState()) {
        const saved = this.historyService.addItem({
          name: this.barcodeName() || 'Barcode 1',
          format: this.format(),
          formatLabel: item.label,
          value: this.value(),
          displayValue: result.displayValue,
          options: this.designOptions(),
          formatOptions: this.formatOptions(),
          svg: result.svg
        });
        if (saved) {
          this.activeBarcodeId.set(saved.id);
          this.savedBarcodeState.set({
            id: saved.id,
            name: saved.name,
            format: this.format(),
            value: this.value()
          });
        }
      }

      // Silent verification in background - never hides or blocks a rendered barcode
      // Compares against the actual encodedValue from render result (e.g. 977 EAN-13 for ISSN, (01) GTIN for DataBar)
      const verifyTarget = result.encodedValue || val.cleanValue;
      this.verifier
        .verify(result.svg, verifyTarget, this.format(), this.formatOptions())
        .then((vRes: BarcodeVerificationResult) => {
          if (currentReqId === this.latestRequestId) {
            this.verificationResult.set(vRes);
          }
        })
        .catch((err) => {
          console.warn('[BarcodeGenerator] Silent verification failed:', err);
        });
    } catch (err) {
      if (currentReqId !== this.latestRequestId) return;
      console.error('[BarcodeGenerator] Render failed:', err);
      this.svgResult.set(null);
      this.renderError.set('The barcode could not be drawn. Change the value or format and try again.');
    } finally {
      if (currentReqId === this.latestRequestId) {
        this.isGenerating.set(false);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Export & Share Handlers
  // ══════════════════════════════════════════════════════════════════

  async onDownload(format: 'png' | 'svg' | 'pdf'): Promise<void> {
    const res = this.svgResult();
    if (!res) return;

    const name = this.barcodeName() || 'My Barcode';
    const fmt = this.format();

    this.analyticsService.recordExport(fmt, format);

    if (format === 'svg') {
      this.exportService.downloadSvg(res.svg, name, fmt);
    } else if (format === 'png') {
      await this.exportService.downloadPng(res.svg, name, fmt, this.designOptions());
    } else if (format === 'pdf') {
      await this.exportService.downloadPdf(res.svg, name, fmt, this.designOptions());
    }
  }

  async onCopyImage(): Promise<void> {
    const res = this.svgResult();
    if (!res) return;
    this.analyticsService.recordExport(this.format(), 'png');
    await this.exportService.copyImageToClipboard(res.svg, this.designOptions());
  }

  onSave(): void {
    this.saveCurrentBarcodeToHistory();
  }

  saveCurrentBarcodeToHistory(): void {
    const res = this.svgResult();
    const val = this.validation();
    const item = this.formatRegistry.getFormat(this.format());
    if (!val.valid || !res || !res.svg || !item || !this.value().trim()) return;

    const existing = this.savedBarcodeState();
    if (existing && existing.id && existing.value === this.value() && existing.format === this.format()) {
      return;
    }

    if (existing && existing.id && this.historyService.items().some(it => it.id === existing.id)) {
      this.historyService.updateItem(existing.id, {
        name: this.barcodeName() || 'Barcode 1',
        value: this.value(),
        displayValue: res.displayValue,
        options: this.designOptions(),
        formatOptions: this.formatOptions(),
        svg: res.svg
      });
      this.savedBarcodeState.set({
        id: existing.id,
        name: this.barcodeName(),
        format: this.format(),
        value: this.value()
      });
    } else {
      const saved = this.historyService.addItem({
        name: this.barcodeName() || 'Barcode 1',
        format: this.format(),
        formatLabel: item.label,
        value: this.value(),
        displayValue: res.displayValue,
        options: this.designOptions(),
        formatOptions: this.formatOptions(),
        svg: res.svg
      });
      if (saved) {
        this.activeBarcodeId.set(saved.id);
        this.savedBarcodeState.set({
          id: saved.id,
          name: saved.name,
          format: this.format(),
          value: this.value()
        });
      }
    }
  }

  onSaveSeparate(): void {
    const res = this.svgResult();
    const item = this.formatRegistry.getFormat(this.format());
    if (!res || !item || !this.validation().valid) return;

    // 1. Advance to the next free barcode name
    const nextName = this.historyService.getNextFreeBarcodeName();
    this.barcodeName.set(nextName);

    // 2. Save as new separate history item
    const saved = this.historyService.addItem({
      name: nextName,
      format: this.format(),
      formatLabel: item.label,
      value: this.value(),
      displayValue: res.displayValue,
      options: this.designOptions(),
      formatOptions: this.formatOptions(),
      svg: res.svg
    });

    // 3. Update saved tracking to this new barcode
    if (saved) {
      this.activeBarcodeId.set(saved.id);
      this.savedBarcodeState.set({
        id: saved.id,
        name: saved.name,
        format: this.format(),
        value: this.value()
      });
    }
  }

  handleFormatChangeRequest(newFormat: BarcodeFormat): void {
    if (this.format() === newFormat) return;

    // 1. Save previous valid barcode to history if not yet saved
    this.saveCurrentBarcodeToHistory();

    // 2. Advance to the next free barcode name
    const nextName = this.historyService.getNextFreeBarcodeName();
    this.barcodeName.set(nextName);

    // 3. Update format & default options
    this.format.set(newFormat);
    const newItem = BARCODE_REGISTRY[newFormat];
    this.formatOptions.set({ ...(newItem?.defaultOptions || {}) });

    // 4. Reset tracking for the new format
    this.activeBarcodeId.set(null);
    this.savedBarcodeState.set(null);
  }

  onRenameHistoryItem(event: { id: string; newName: string }): void {
    const unique = this.historyService.renameItem(event.id, event.newName);
    if (this.activeBarcodeId() === event.id) {
      this.barcodeName.set(unique);
    }
  }

  async onShare(): Promise<void> {
    await this.shareService.copyShareLink({
      format: this.format(),
      value: this.value(),
      name: this.barcodeName(),
      design: this.designOptions(),
      options: this.formatOptions()
    });
  }

  restoreHistoryItem(item: BarcodeHistoryItem): void {
    this.activeBarcodeId.set(item.id);
    this.barcodeName.set(item.name);
    this.format.set(item.format as BarcodeFormat);
    this.value.set(item.value);
    if (item.options) {
      this.designOptions.set({ ...item.options });
    }
    if (item.formatOptions) {
      this.formatOptions.set({ ...item.formatOptions });
    }
    this.savedBarcodeState.set({
      id: item.id,
      name: item.name,
      format: item.format,
      value: item.value
    });
    this.triggerDebouncedGeneration();
  }

  resetAllSettings(): void {
    this.designOptions.set({ ...DEFAULT_DESIGN_OPTIONS });
    this.formatOptions.set({});
    this.barcodeName.set(this.historyService.getNextFreeBarcodeName());
  }

  // ══════════════════════════════════════════════════════════════════
  // Keyboard Shortcuts & URL Parsing
  // ══════════════════════════════════════════════════════════════════

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      if (this.validation().valid && this.svgResult()) {
        this.onDownload('png');
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.isHistoryModalOpen.set(true);
    }
  }

  private readUrlParams(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fmt = params.get('format');
    const val = params.get('value');
    const name = params.get('name');

    if (fmt && this.formatRegistry.getFormat(fmt)) {
      this.format.set(fmt);
    }
    if (val) {
      this.value.set(val);
    }
    if (name) {
      this.barcodeName.set(name);
    }
  }
}
