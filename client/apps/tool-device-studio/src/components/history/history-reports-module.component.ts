// apps/tool-device-studio/src/components/history/history-reports-module.component.ts
import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { DiagnosticHistoryService } from '../../services/diagnostic-history.service';
import { DiagnosticReportService } from '../../services/diagnostic-report.service';
import { DeviceStudioStateService, resetDeviceStudioScroll } from '../../services/device-studio-state.service';
import { AckletDropdownComponent, DropdownOption } from '../shared/acklet-dropdown.component';
import {
  DiagnosticHistoryRecord,
  DiagnosticModuleType,
  DiagnosticResultStatus,
  ReportExportOptions,
  ReportTemplateType
} from '../../models/device.models';

type DashboardTab = 'history' | 'compare' | 'reports';

@Component({
  selector: 'app-history-reports-module',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, AckletDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-module-root">

      <!-- ======================================================== -->
      <!-- 1. PAGE HEADER                                           -->
      <!-- ======================================================== -->
      <header class="history-page-header">
        <!-- Row 1: History Icon, Title, Subtitle (No duplicate count badge) -->
        <div class="hdr-title-row">
          <div class="hdr-icon-badge">
            <ts-icon name="history" [size]="20" />
          </div>
          <div class="hdr-title-meta">
            <h1 class="hdr-title">History & Reports</h1>
            <p class="hdr-desc">Review past test results, compare performance, and export diagnostic reports.</p>
          </div>
        </div>

        <!-- Row 2 (All Sizes): Action row with 'All Tools' on left and 'Clear All' on right -->
        <div class="hdr-action-row">
          <button
            type="button"
            class="btn-back-tools"
            (click)="goBackToStudio()"
            title="All Tools"
            aria-label="All Tools"
          >
            <ts-icon name="arrow-left" [size]="15" />
            <span>All Tools</span>
          </button>

          @if (historyService.stats().totalCount > 0) {
            <button
              type="button"
              class="btn-hdr-clear"
              (click)="showClearConfirm.set(true)"
              title="Clear all recorded test history"
            >
              <ts-icon name="trash" [size]="14" />
              <span>Clear All</span>
            </button>
          }
        </div>

        <!-- Row 3: Dedicated Logging Settings Line (fixed container, reads as a setting) -->
        <div class="hdr-settings-row">
          <button
            type="button"
            role="switch"
            [attr.aria-checked]="historyService.isHistoryEnabled()"
            class="logging-toggle-btn"
            (click)="historyService.setHistoryEnabled(!historyService.isHistoryEnabled())"
            [title]="historyService.isHistoryEnabled() ? 'Disable local history recording' : 'Enable local history recording'"
          >
            <span class="switch-track" [class.on]="historyService.isHistoryEnabled()">
              <span class="switch-thumb"></span>
            </span>
            <span class="switch-text">Logging: <strong>{{ historyService.isHistoryEnabled() ? 'On' : 'Off' }}</strong></span>
          </button>
          <span class="logging-description">Diagnostic results are stored locally in your browser memory.</span>
        </div>
      </header>

      <!-- ======================================================== -->
      <!-- 2. SUMMARY CARDS (2x2 on mobile, 4 columns on desktop)   -->
      <!-- ======================================================== -->
      <div class="stats-overview-row">
        <div class="stat-box">
          <span class="stat-k">Total Tests Recorded</span>
          <span class="stat-v">{{ historyService.stats().totalCount }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-k">Passed Diagnostics</span>
          <span class="stat-v pass">{{ historyService.stats().passCount }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-k">Warnings / Flags</span>
          <span class="stat-v warn">{{ historyService.stats().warnCount + historyService.stats().failCount }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-k">Device Health Score</span>
          <span class="stat-v score">{{ state.deviceHealthScore() }} / 100</span>
        </div>
      </div>

      <!-- Separate Section Labeled "Reports" with its own spacing -->
      <section class="reports-section-card" aria-label="Reports">
        <div class="reports-sec-info">
          <div class="reports-sec-icon">
            <ts-icon name="file-text" [size]="18" />
          </div>
          <div class="reports-sec-meta">
            <h2 class="reports-sec-title">Diagnostic Reports</h2>
            <p class="reports-sec-desc">Export verified audit documents, print/save PDF reports, and download JSON.</p>
          </div>
        </div>

        <button
          type="button"
          class="btn-generate-reports"
          (click)="activeTab.set('reports')"
          title="Open Report Generator"
        >
          <ts-icon name="file-text" [size]="15" />
          <span>Generate Report</span>
        </button>
      </section>

      <!-- ======================================================== -->
      <!-- 3. TABS (Segmented Control: Test History & Compare)      -->
      <!-- ======================================================== -->
      <div class="nav-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activeTab() === 'history'"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'history'"
          (click)="activeTab.set('history')"
        >
          <ts-icon name="history" [size]="15" />
          <span>Test History</span>
          <span class="tab-pill">{{ historyService.stats().totalCount }}</span>
        </button>

        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activeTab() === 'compare'"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'compare'"
          (click)="activeTab.set('compare')"
          title="Performance Comparison"
        >
          <ts-icon name="git-compare" [size]="15" />
          <span class="tab-label-desktop">Performance Comparison</span>
          <span class="tab-label-mobile">Compare</span>
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 1: HISTORY LOG & CARDS                              -->
      <!-- ======================================================== -->
      @if (activeTab() === 'history') {
        <div class="tab-pane">

          <!-- 4. FILTER BAR -->
          <div class="filter-toolbar">
            <!-- Search input: full width on all sizes -->
            <div class="search-wrap">
              <ts-icon name="search" [size]="15" class="search-icon" />
              <input
                type="text"
                class="search-input"
                placeholder="Search history..."
                [ngModel]="historyService.searchQuery()"
                (ngModelChange)="historyService.searchQuery.set($event)"
                aria-label="Search history"
              />
              @if (historyService.searchQuery()) {
                <button
                  type="button"
                  class="btn-clear-search"
                  (click)="historyService.searchQuery.set('')"
                  title="Clear search"
                  aria-label="Clear search"
                >✕</button>
              }
            </div>

            <!-- Dropdown Filters: 2 equal columns on mobile + Sort full width, 3 columns on desktop -->
            <div class="filter-controls-grid">
              <div class="filter-dropdown-wrap">
                <app-acklet-dropdown
                  [options]="moduleFilterOptions"
                  [value]="historyService.selectedModuleFilter()"
                  (valueChange)="onModuleFilterChange($event)"
                  placeholder="All Modules"
                  icon="layers"
                />
              </div>

              <div class="filter-dropdown-wrap">
                <app-acklet-dropdown
                  [options]="statusFilterOptions"
                  [value]="historyService.selectedStatusFilter()"
                  (valueChange)="onStatusFilterChange($event)"
                  placeholder="All Statuses"
                  icon="filter"
                />
              </div>

              <div class="filter-dropdown-wrap sort-dropdown-wrap">
                <app-acklet-dropdown
                  [options]="sortOrderOptions"
                  [value]="historyService.sortOrder()"
                  (valueChange)="onSortOrderChange($event)"
                  placeholder="Sort Order"
                  icon="calendar"
                />
              </div>
            </div>
          </div>

          <!-- 5. HISTORY LIST CARDS -->
          @if (historyService.filteredRecords().length > 0) {
            <div class="history-records-list">
              @for (record of historyService.filteredRecords(); track record.id) {
                <article class="record-card">

                  <div class="card-body">
                    <!-- Row 1: Module Icon (40px) + Title (flex, 2 lines max) + Status Badge (right) -->
                    <div class="card-row-header">
                      <div class="module-icon-box" [attr.data-module]="record.moduleType">
                        <ts-icon [name]="getModuleIcon(record.moduleType)" [size]="20" />
                      </div>

                      <div class="card-title-wrap">
                        <h3 class="card-title" [title]="record.testTitle">{{ record.testTitle }}</h3>
                      </div>

                      <span class="status-badge-chip" [attr.data-status]="record.status">
                        {{ record.status === 'pass' ? 'PASS' : (record.status === 'warn' ? 'WARNING' : 'FAIL') }}
                      </span>
                    </div>

                    <!-- Row 2: Metadata line ("Earlier today · 17:16") -->
                    <div class="card-row-meta">
                      <span class="meta-time">{{ record.timestampFormatted }}</span>
                      <span class="meta-dot">·</span>
                      <span class="meta-tested-at">{{ formatTimeOnly(record.testedAt) }}</span>
                    </div>

                    <!-- Row 3: Key metrics wrapping chips -->
                    @if (record.primaryMetric || record.secondaryMetric) {
                      <div class="card-row-metrics">
                        @if (record.primaryMetric) {
                          <span class="metric-chip primary">{{ record.primaryMetric }}</span>
                        }
                        @if (record.secondaryMetric) {
                          <span class="metric-chip secondary">{{ record.secondaryMetric }}</span>
                        }
                      </div>
                    }
                  </div>

                  <!-- Row 4 on mobile / Right column on desktop: Actions -->
                  <div class="card-actions">
                    <button
                      type="button"
                      class="btn-card-action"
                      (click)="selectedDetailRecord.set(record)"
                      title="View full diagnostic parameters and details"
                    >
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      class="btn-card-action"
                      (click)="openComparisonWith(record)"
                      title="Compare with another test session"
                    >
                      <ts-icon name="git-compare" [size]="14" />
                      <span>Compare</span>
                    </button>

                    <button
                      type="button"
                      class="btn-card-delete"
                      (click)="recordToDelete.set(record)"
                      title="Delete this test result"
                      aria-label="Delete this test result"
                    >
                      <ts-icon name="trash" [size]="15" />
                    </button>
                  </div>

                </article>
              }
            </div>
          } @else {
            <!-- 7. EMPTY AND LOADING STATES -->
            @if (historyService.records().length === 0) {
              <div class="empty-state-card">
                <div class="empty-icon-badge">
                  <ts-icon name="history" [size]="28" />
                </div>
                <h3 class="empty-title">No tests recorded yet</h3>
                <p class="empty-desc">
                  Run any hardware or network test in Device Studio to start building your diagnostic history.
                </p>
                <button type="button" class="btn-empty-action" (click)="goBackToStudio()">
                  <ts-icon name="arrow-left" [size]="14" />
                  <span>Run a test</span>
                </button>
              </div>
            } @else {
              <div class="empty-state-card">
                <div class="empty-icon-badge">
                  <ts-icon name="filter" [size]="28" />
                </div>
                <h3 class="empty-title">No tests match these filters</h3>
                <p class="empty-desc">
                  Try adjusting or clearing your search term, module, or status filters.
                </p>
                <button type="button" class="btn-empty-action" (click)="clearFilters()">
                  <ts-icon name="rotate-ccw" [size]="14" />
                  <span>Clear filters</span>
                </button>
              </div>
            }
          }

        </div>
      }

      <!-- ======================================================== -->
      <!-- TAB 2: PERFORMANCE COMPARISON                            -->
      <!-- ======================================================== -->
      @if (activeTab() === 'compare') {
        <div class="tab-pane">

          <div class="compare-selector-card">
            <h3 class="card-heading">Select Diagnostic Sessions to Compare</h3>
            <p class="card-desc">
              Choose a baseline session and a subsequent session of the same module type to measure performance deltas and latency improvements.
            </p>

            <div class="selector-grid">
              <div class="selector-box">
                <label class="selector-label">Baseline Test (Session A)</label>
                <app-acklet-dropdown
                  [options]="compareRecordOptions()"
                  [value]="selectedBaseRecordId()"
                  (valueChange)="selectedBaseRecordId.set($event)"
                  placeholder="Select Baseline Session..."
                  icon="git-compare"
                  emptyText="No recorded tests found"
                />
              </div>

              <div class="selector-box">
                <label class="selector-label">Comparison Test (Session B)</label>
                <app-acklet-dropdown
                  [options]="compareRecordOptions()"
                  [value]="selectedTargetRecordId()"
                  (valueChange)="selectedTargetRecordId.set($event)"
                  placeholder="Select Comparison Session..."
                  icon="git-compare"
                  emptyText="No recorded tests found"
                />
              </div>
            </div>
          </div>

          <!-- Comparison Results View -->
          @if (comparisonResult()) {
            <div class="comparison-results-card">

              <div class="comparison-header">
                <div>
                  <div class="comp-title-row">
                    <h3 class="comp-title">Comparison Analysis: {{ comparisonResult()!.moduleType | uppercase }}</h3>
                    <span class="verdict-pill" [attr.data-verdict]="comparisonResult()!.overallVerdict">
                      {{ comparisonResult()!.overallVerdict | uppercase }}
                    </span>
                  </div>
                  <p class="comp-summary">{{ comparisonResult()!.summaryText }}</p>
                </div>
              </div>

              <div class="metrics-comparison-grid">
                @for (m of comparisonResult()!.metrics; track m.label) {
                  <div class="metric-comp-card">
                    <span class="metric-comp-label">{{ m.label }}</span>

                    <div class="values-flow">
                      <div class="val-block">
                        <span class="val-sub">Baseline (A)</span>
                        <span class="val-text">{{ m.baseValue }}</span>
                      </div>

                      <div class="flow-arrow">
                        <ts-icon name="arrow-right" [size]="16" />
                      </div>

                      <div class="val-block">
                        <span class="val-sub">Comparison (B)</span>
                        <span class="val-text strong">{{ m.targetValue }}</span>
                      </div>
                    </div>

                    @if (m.delta !== undefined || m.deltaPercent !== undefined) {
                      <div class="delta-badge" [attr.data-dir]="m.direction">
                        <span>
                          {{ (m.delta && m.delta > 0 ? '+' : '') + (m.delta !== undefined ? m.delta : '') }}
                          {{ m.unit || '' }}
                          {{ m.deltaPercent !== undefined ? '(' + (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent + '%)' : '' }}
                        </span>
                        <span class="dir-text">({{ m.direction | uppercase }})</span>
                      </div>
                    }
                  </div>
                }
              </div>

            </div>
          } @else {
            <div class="empty-state-card">
              <div class="empty-icon-badge">
                <ts-icon name="git-compare" [size]="28" />
              </div>
              <h3 class="empty-title">Select two test runs to compare</h3>
              <p class="empty-desc">
                Choose any two tests from the dropdowns above (for example, two Internet Speed Tests or two Webcam checks) to view side-by-side performance changes.
              </p>
            </div>
          }

        </div>
      }

      <!-- ======================================================== -->
      <!-- TAB 3: REPORT GENERATOR                                  -->
      <!-- ======================================================== -->
      @if (activeTab() === 'reports') {
        <div class="tab-pane reports-pane">

          <div class="reports-header-bar">
            <div>
              <h2 class="reports-title">Diagnostic Reports Generator</h2>
              <p class="reports-desc">Generate printable audit certificates, PDF diagnostics, and structured JSON logs.</p>
            </div>
            <button type="button" class="btn-back-history" (click)="activeTab.set('history')">
              <ts-icon name="arrow-left" [size]="14" />
              <span>Back to Test History</span>
            </button>
          </div>

          <div class="report-generator-grid">

            <!-- Left: Report Configuration Form -->
            <div class="config-card">
              <h3 class="card-heading">Report Configuration</h3>

              <!-- Template Selection -->
              <div class="form-group">
                <label class="form-label">Report Template</label>
                <app-acklet-dropdown
                  [options]="reportTemplateOptions"
                  [value]="reportOptions().template"
                  (valueChange)="updateReportTemplate($event)"
                  placeholder="Select Template..."
                  icon="file-text"
                />
              </div>

              <!-- Included Modules -->
              <div class="form-group">
                <label class="form-label">Included Modules</label>
                <div class="checkbox-grid">
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('speed')" (change)="toggleModuleInclusion('speed')" />
                    <span>Internet Speed Test</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('ip')" (change)="toggleModuleInclusion('ip')" />
                    <span>Public IP & Network</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('webcam')" (change)="toggleModuleInclusion('webcam')" />
                    <span>Webcam Video</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('microphone')" (change)="toggleModuleInclusion('microphone')" />
                    <span>Microphone Audio</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('speaker')" (change)="toggleModuleInclusion('speaker')" />
                    <span>Speaker & Headphones</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="isModuleIncluded('screen')" (change)="toggleModuleInclusion('screen')" />
                    <span>Screen Sharing</span>
                  </label>
                </div>
              </div>

              <!-- Privacy Controls -->
              <div class="form-group">
                <label class="form-label">Privacy & Data Redaction</label>
                <div class="checkbox-list">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="reportOptions().maskIp"
                      (change)="updateMaskIp($event)"
                    />
                    <span>Mask Public IP Address (e.g. 27.56.xxx.xxx)</span>
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="reportOptions().includeLocation"
                      (change)="updateIncludeLocation($event)"
                    />
                    <span>Include Approximate Geographic Point-of-Presence</span>
                  </label>
                </div>
              </div>

            </div>

            <!-- Right: Report Actions & Preview -->
            <div class="preview-card">
              <div class="preview-header">
                <div>
                  <span class="preview-tag">Official Audit</span>
                  <h3 class="preview-title">{{ resolveReportTitle() }}</h3>
                  <p class="preview-subtitle">Client-Side Diagnostic Verification Document</p>
                </div>
              </div>

              <div class="export-actions-list">
                <button type="button" class="btn-export primary" (click)="reportService.downloadReportPdf(reportOptions())">
                  <ts-icon name="printer" [size]="16" />
                  <span>Print / Save as PDF</span>
                </button>

                <button type="button" class="btn-export" (click)="reportService.copyReportSummary(reportOptions())">
                  <ts-icon name="copy" [size]="16" />
                  <span>Copy Markdown Summary</span>
                </button>

                <button type="button" class="btn-export" (click)="reportService.downloadReportText(reportOptions())">
                  <ts-icon name="download" [size]="16" />
                  <span>Download Text Report (.txt)</span>
                </button>

                <button type="button" class="btn-export" (click)="reportService.downloadReportJson(reportOptions())">
                  <ts-icon name="download" [size]="16" />
                  <span>Download Structured JSON</span>
                </button>

                <button type="button" class="btn-export" (click)="reportService.shareReport(reportOptions())">
                  <ts-icon name="share-2" [size]="16" />
                  <span>Share Audit Report</span>
                </button>
              </div>

              <div class="privacy-note">
                <ts-icon name="shield-check" [size]="14" />
                <span>Zero-Storage Guarantee: Diagnostic reports are generated on-demand in local browser memory. No telemetry or hardware identifiers are stored remotely.</span>
              </div>
            </div>

          </div>

        </div>
      }

      <!-- ======================================================== -->
      <!-- MODAL: RECORD DETAILS                                    -->
      <!-- ======================================================== -->
      @if (selectedDetailRecord()) {
        <div class="modal-backdrop" (click)="selectedDetailRecord.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-tag">Diagnostic Record</span>
                <h3 class="modal-title">{{ selectedDetailRecord()!.testTitle }}</h3>
                <span class="modal-time">{{ selectedDetailRecord()!.timestampFormatted }} ({{ selectedDetailRecord()!.testedAt }})</span>
              </div>
              <button type="button" class="btn-close-modal" (click)="selectedDetailRecord.set(null)">✕</button>
            </div>

            <div class="modal-body">
              <div class="detail-summary-bar">
                <span class="status-badge-chip" [attr.data-status]="selectedDetailRecord()!.status">
                  {{ selectedDetailRecord()!.status === 'pass' ? 'PASS' : (selectedDetailRecord()!.status === 'warn' ? 'WARNING' : 'FAIL') }}
                </span>
                <span class="detail-primary">{{ selectedDetailRecord()!.primaryMetric }}</span>
              </div>

              <h4 class="subhead">Recorded Parameters</h4>
              <div class="params-table">
                @for (entry of getDetailsEntries(selectedDetailRecord()!.details); track entry[0]) {
                  <div class="param-row">
                    <span class="param-k">{{ entry[0] }}</span>
                    <span class="param-v">{{ formatParamVal(entry[1]) }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- 6. CONFIRM DIALOG: SINGLE-ITEM DELETE                    -->
      <!-- ======================================================== -->
      @if (recordToDelete()) {
        <div class="modal-backdrop" (click)="recordToDelete.set(null)">
          <div class="confirm-dialog-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <div class="confirm-icon-box danger">
              <ts-icon name="trash" [size]="20" />
            </div>
            <h3 class="confirm-title">Delete this test?</h3>
            <p class="confirm-desc">
              Delete the <strong>{{ recordToDelete()!.testTitle }}</strong> result from {{ recordToDelete()!.timestampFormatted }}? This cannot be undone.
            </p>
            <div class="confirm-actions-row">
              <button type="button" class="btn-dialog-cancel" (click)="recordToDelete.set(null)">Cancel</button>
              <button type="button" class="btn-dialog-danger" (click)="executeDeleteRecord()">Delete</button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- 6. CONFIRM DIALOG: CLEAR ALL                             -->
      <!-- ======================================================== -->
      @if (showClearConfirm()) {
        <div class="modal-backdrop" (click)="showClearConfirm.set(false)">
          <div class="confirm-dialog-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <div class="confirm-icon-box danger">
              <ts-icon name="trash" [size]="20" />
            </div>
            <h3 class="confirm-title">Delete all {{ historyService.stats().totalCount }} tests?</h3>
            <p class="confirm-desc">
              This cannot be undone. All recorded hardware, network, and audio test history will be permanently removed from your browser.
            </p>
            <div class="confirm-actions-row">
              <button type="button" class="btn-dialog-cancel" (click)="showClearConfirm.set(false)">Cancel</button>
              <button type="button" class="btn-dialog-danger" (click)="executeClearAll()">Delete All</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) {
      color: #0F172A;
    }

    .history-module-root {
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    /* ══════════════════════════════════════════════════════════════
       1. PAGE HEADER
       ══════════════════════════════════════════════════════════════ */
    .history-page-header {
      width: 100%;
      min-width: 0;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="light"]) .history-page-header {
      border-bottom-color: #E2E8F0;
    }

    /* Row 1: Title & Icon */
    .hdr-title-row {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-width: 0;
    }

    .hdr-icon-badge {
      width: 44px;
      height: 44px;
      min-width: 44px;
      border-radius: 12px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .hdr-icon-badge {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .hdr-title-meta {
      flex: 1 1 0%;
      min-width: 0;
    }

    .hdr-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--text, #F4F4F5);
      line-height: 1.25;
    }

    :host-context([data-theme="light"]) .hdr-title {
      color: #0F172A;
    }

    .hdr-desc {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 4px 0 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .hdr-desc {
      color: #64748B;
    }

    /* Row 2: Fixed Action Row (All Sizes) */
    .hdr-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-width: 0;
    }

    .btn-back-tools {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      height: 38px;
      border-radius: 8px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }

    :host-context([data-theme="light"]) .btn-back-tools {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .btn-back-tools:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-back-tools:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    .hdr-actions-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-hdr-generate {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      height: 38px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      border: 1px solid var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-hdr-generate {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .btn-hdr-generate:hover {
      opacity: 0.9;
    }

    .btn-hdr-clear {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      height: 38px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--ds-fail, #F87171);
      color: var(--ds-fail, #F87171);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-hdr-clear {
      border-color: #EF4444;
      color: #DC2626;
    }

    .btn-hdr-clear:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Row 3: Dedicated Logging Settings Line */
    .hdr-settings-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-width: 0;
      padding-top: 12px;
      border-top: 1px dashed var(--border, rgba(255, 255, 255, 0.08));
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .hdr-settings-row {
      border-top-color: #E2E8F0;
    }

    .logging-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 140px;
      min-width: 140px;
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      cursor: pointer;
      flex-shrink: 0;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="light"]) .logging-toggle-btn {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .switch-track {
      width: 28px;
      height: 16px;
      min-width: 28px;
      border-radius: 9999px;
      background: #52525B;
      position: relative;
      transition: background 0.2s ease;
      display: inline-block;
    }

    .switch-track.on {
      background: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .switch-track.on {
      background: #2563EB;
    }

    .switch-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #FFFFFF;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.2s ease;
    }

    .switch-track.on .switch-thumb {
      transform: translateX(12px);
    }

    .switch-text {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .switch-text {
      color: #475569;
    }

    .switch-text strong {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .switch-text strong {
      color: #0F172A;
    }

    .logging-description {
      font-size: 12px;
      color: var(--text-3, #71717A);
      flex: 1 1 200px;
      min-width: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .logging-description {
      color: #64748B;
    }

    /* ══════════════════════════════════════════════════════════════
       2. SUMMARY CARDS
       ══════════════════════════════════════════════════════════════ */
    .stats-overview-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
      width: 100%;
    }

    @media (max-width: 1023px) {
      .stats-overview-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .stat-box {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="light"]) .stat-box {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .stat-k {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
      line-height: 1.35;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    :host-context([data-theme="light"]) .stat-k {
      color: #64748B;
    }

    .stat-v {
      font-size: 22px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .stat-v {
      color: #0F172A;
    }

    .stat-v.pass { color: #34D399; }
    :host-context([data-theme="light"]) .stat-v.pass { color: #059669; }

    .stat-v.warn { color: #FBBF24; }
    :host-context([data-theme="light"]) .stat-v.warn { color: #D97706; }

    .stat-v.score { color: var(--tool-accent, #3B82F6); }
    :host-context([data-theme="light"]) .stat-v.score { color: #2563EB; }

    /* Reports Section Banner */
    .reports-section-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .reports-section-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .reports-sec-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1 1 0%;
      min-width: 0;
    }

    .reports-sec-icon {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 10px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .reports-sec-icon {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .reports-sec-meta {
      flex: 1 1 0%;
      min-width: 0;
    }

    .reports-sec-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      line-height: 1.25;
    }

    :host-context([data-theme="light"]) .reports-sec-title {
      color: #0F172A;
    }

    .reports-sec-desc {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 3px 0 0;
      line-height: 1.35;
      overflow-wrap: break-word;
    }

    :host-context([data-theme="light"]) .reports-sec-desc {
      color: #64748B;
    }

    .btn-generate-reports {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 16px;
      height: 38px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      border: 1px solid var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: opacity 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-generate-reports {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .btn-generate-reports:hover {
      opacity: 0.9;
    }

    @media (max-width: 639px) {
      .reports-section-card {
        padding: 14px 16px;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .btn-generate-reports {
        width: 100%;
        height: 40px;
      }
    }

    /* ══════════════════════════════════════════════════════════════
       3. TABS (Segmented Control)
       ══════════════════════════════════════════════════════════════ */
    .nav-tabs-bar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      background: var(--surface-secondary, #27272A);
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .nav-tabs-bar {
      background: #F1F5F9;
    }

    .nav-tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      height: 38px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .nav-tab-btn {
      color: #64748B;
    }

    .nav-tab-btn:hover {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .nav-tab-btn:hover {
      color: #0F172A;
    }

    .nav-tab-btn.active {
      background: var(--surface, var(--bg-1, #18181B));
      color: var(--tool-accent, #3B82F6);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .nav-tab-btn.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .tab-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .tab-pill {
      background: #E2E8F0;
      color: #334155;
    }

    .tab-label-desktop {
      display: inline;
    }

    .tab-label-mobile {
      display: none;
    }

    @media (max-width: 639px) {
      .tab-label-desktop {
        display: none;
      }
      .tab-label-mobile {
        display: inline;
      }
    }

    /* ══════════════════════════════════════════════════════════════
       4. FILTER BAR
       ══════════════════════════════════════════════════════════════ */
    .filter-toolbar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      width: 100%;
    }

    .search-wrap {
      position: relative;
      width: 100%;
      height: 40px;
      display: flex;
      align-items: center;
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 0 12px;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    :host-context([data-theme="light"]) .search-wrap {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }

    .search-wrap:focus-within {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 0 2px var(--ds-accent-soft, rgba(59, 130, 246, 0.18));
    }

    :host-context([data-theme="light"]) .search-wrap:focus-within {
      border-color: #2563EB;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
    }

    .search-icon {
      color: var(--text-3, #71717A);
      margin-right: 8px;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1 1 0%;
      min-width: 0;
      height: 100%;
      border: none;
      background: transparent;
      color: var(--text, #F4F4F5);
      font-size: 13.5px;
      outline: none;
      padding: 0;
    }

    :host-context([data-theme="light"]) .search-input {
      color: #0F172A;
    }

    .search-input::placeholder {
      color: var(--text-3, #71717A);
    }

    .btn-clear-search {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-3, #71717A);
      font-size: 12px;
      cursor: pointer;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .btn-clear-search:hover {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-controls-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      width: 100%;
    }

    @media (max-width: 639px) {
      .filter-controls-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .sort-dropdown-wrap {
        grid-column: 1 / -1;
      }
    }

    .filter-dropdown-wrap {
      min-width: 0;
      width: 100%;
      height: 40px;
    }

    /* ══════════════════════════════════════════════════════════════
       5. HISTORY LIST CARDS
       ══════════════════════════════════════════════════════════════ */
    .history-records-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .record-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="light"]) .record-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .record-card:hover {
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .record-card:hover {
      border-color: #2563EB;
    }

    .card-body {
      flex: 1 1 0%;
      min-width: 160px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Row 1: Icon + Title + Status */
    .card-row-header {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-width: 0;
    }

    .module-icon-box {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 10px;
      background: var(--surface-secondary, #27272A);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .module-icon-box {
      background: #F1F5F9;
      color: #2563EB;
    }

    .card-title-wrap {
      flex: 1 1 0%;
      min-width: 0;
    }

    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    :host-context([data-theme="light"]) .card-title {
      color: #0F172A;
    }

    .status-badge-chip {
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.04em;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .status-badge-chip[data-status="pass"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    :host-context([data-theme="light"]) .status-badge-chip[data-status="pass"] {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .status-badge-chip[data-status="warn"] {
      background: rgba(251, 191, 36, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    :host-context([data-theme="light"]) .status-badge-chip[data-status="warn"] {
      background: #FFFBEB;
      color: #D97706;
      border-color: #FDE68A;
    }

    .status-badge-chip[data-status="fail"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
      border: 1px solid rgba(248, 113, 113, 0.3);
    }
    :host-context([data-theme="light"]) .status-badge-chip[data-status="fail"] {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #FECACA;
    }

    /* Row 2: Metadata */
    .card-row-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-3, #71717A);
      padding-left: 52px;
      min-width: 0;
      overflow-wrap: break-word;
    }

    :host-context([data-theme="light"]) .card-row-meta {
      color: #64748B;
    }

    .meta-dot {
      color: var(--text-3, #71717A);
    }

    /* Row 3: Key metrics */
    .card-row-metrics {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding-left: 52px;
      margin-top: 2px;
      min-width: 0;
    }

    .metric-chip {
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      line-height: 1.4;
      max-width: 100%;
      overflow-wrap: break-word;
    }

    :host-context([data-theme="light"]) .metric-chip {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #334155;
    }

    .metric-chip.primary {
      font-weight: 600;
      color: var(--text, #F4F4F5);
      border-color: var(--border, rgba(255, 255, 255, 0.16));
    }

    :host-context([data-theme="light"]) .metric-chip.primary {
      color: #0F172A;
      border-color: #CBD5E1;
    }

    /* Row 4 / Right Column: Actions */
    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-card-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-card-action {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-card-action:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-card-action:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    .btn-card-delete {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--ds-fail, #F87171);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-card-delete {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #DC2626;
    }

    .btn-card-delete:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: var(--ds-fail, #F87171);
    }

    /* Mobile Rules for History List Cards (< 640px) */
    @media (max-width: 639px) {
      .record-card {
        padding: 16px;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .card-body {
        width: 100%;
        min-width: 0;
      }

      .card-row-meta,
      .card-row-metrics {
        padding-left: 0;
      }

      .card-actions {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }

      .btn-card-action {
        flex: 1 1 0%;
        min-width: 0;
        height: 40px;
        font-size: 13px;
        padding: 0 10px;
      }

      .btn-card-delete {
        width: 40px;
        height: 40px;
        min-width: 40px;
      }
    }

    /* ══════════════════════════════════════════════════════════════
       7. EMPTY STATES
       ══════════════════════════════════════════════════════════════ */
    .empty-state-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.16));
      border-radius: 12px;
      padding: 40px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .empty-state-card {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }

    .empty-icon-badge {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--surface-secondary, #27272A);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-3, #71717A);
    }

    :host-context([data-theme="light"]) .empty-icon-badge {
      background: #F1F5F9;
      color: #64748B;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .empty-title {
      color: #0F172A;
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      max-width: 420px;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .empty-desc {
      color: #64748B;
    }

    .btn-empty-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      height: 38px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      border: 1px solid var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
      transition: opacity 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-empty-action {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .btn-empty-action:hover {
      opacity: 0.9;
    }

    /* ══════════════════════════════════════════════════════════════
       TAB 2: PERFORMANCE COMPARISON STYLES
       ══════════════════════════════════════════════════════════════ */
    .compare-selector-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .compare-selector-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .card-heading {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 6px;
    }

    :host-context([data-theme="light"]) .card-heading {
      color: #0F172A;
    }

    .card-desc {
      font-size: 13px;
      color: var(--text-2, #A1A1AA);
      margin: 0 0 16px;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .card-desc {
      color: #64748B;
    }

    .selector-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
    }

    @media (max-width: 639px) {
      .selector-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }

    .selector-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      width: 100%;
    }

    .selector-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .selector-label {
      color: #475569;
    }

    .comparison-results-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    :host-context([data-theme="light"]) .comparison-results-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .comp-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .comp-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .comp-title {
      color: #0F172A;
    }

    .verdict-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }

    .verdict-pill[data-verdict="improved"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .verdict-pill[data-verdict="regressed"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
      border: 1px solid rgba(248, 113, 113, 0.3);
    }

    .verdict-pill[data-verdict="stable"] {
      background: rgba(59, 130, 246, 0.15);
      color: var(--tool-accent, #3B82F6);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .comp-summary {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 6px 0 0;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .comp-summary {
      color: #64748B;
    }

    .metrics-comparison-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      width: 100%;
    }

    @media (max-width: 768px) {
      .metrics-comparison-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-comp-card {
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .metric-comp-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .metric-comp-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .metric-comp-label {
      color: #64748B;
    }

    .values-flow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .val-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1 1 0%;
    }

    .val-sub {
      font-size: 10.5px;
      color: var(--text-3, #71717A);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .val-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      overflow-wrap: break-word;
      word-break: break-word;
    }

    :host-context([data-theme="light"]) .val-text {
      color: #0F172A;
    }

    .val-text.strong {
      color: var(--tool-accent, #3B82F6);
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .val-text.strong {
      color: #2563EB;
    }

    .flow-arrow {
      color: var(--text-3, #71717A);
      flex-shrink: 0;
    }

    .delta-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      width: fit-content;
      max-width: 100%;
      overflow-wrap: break-word;
    }

    .delta-badge[data-dir="better"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
    }
    :host-context([data-theme="light"]) .delta-badge[data-dir="better"] {
      background: #ECFDF5;
      color: #059669;
    }

    .delta-badge[data-dir="worse"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
    }
    :host-context([data-theme="light"]) .delta-badge[data-dir="worse"] {
      background: #FEF2F2;
      color: #DC2626;
    }

    .delta-badge[data-dir="neutral"] {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, #A1A1AA);
    }

    /* ══════════════════════════════════════════════════════════════
       TAB 3: REPORT GENERATOR STYLES
       ══════════════════════════════════════════════════════════════ */
    .reports-pane {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    .reports-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .reports-header-bar {
      border-bottom-color: #E2E8F0;
    }

    .reports-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .reports-title {
      color: #0F172A;
    }

    .reports-desc {
      font-size: 13px;
      color: var(--text-2, #A1A1AA);
      margin: 3px 0 0;
    }

    :host-context([data-theme="light"]) .reports-desc {
      color: #64748B;
    }

    .btn-back-history {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      height: 36px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-back-history {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .report-generator-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 20px;
      width: 100%;
    }

    @media (max-width: 1023px) {
      .report-generator-grid {
        grid-template-columns: 1fr;
      }
    }

    .config-card,
    .preview-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .config-card,
    :host-context([data-theme="light"]) .preview-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      width: 100%;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .form-label {
      color: #0F172A;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      width: 100%;
    }

    @media (max-width: 639px) {
      .checkbox-grid {
        grid-template-columns: 1fr;
      }
    }

    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .checkbox-label {
      color: #334155;
    }

    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      accent-color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .preview-header {
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .preview-header {
      border-bottom-color: #E2E8F0;
    }

    .preview-tag {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .preview-tag {
      color: #2563EB;
    }

    .preview-title {
      font-size: 16px;
      font-weight: 700;
      margin: 4px 0 2px;
      color: var(--text, #F4F4F5);
      line-height: 1.35;
    }

    :host-context([data-theme="light"]) .preview-title {
      color: #0F172A;
    }

    .preview-subtitle {
      font-size: 12px;
      color: var(--text-3, #71717A);
      margin: 0;
    }

    .export-actions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .btn-export {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-export.primary {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .btn-export.primary {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      color: var(--text-3, #71717A);
      line-height: 1.4;
      padding: 10px 12px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .privacy-note {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* ══════════════════════════════════════════════════════════════
       MODALS & DIALOGS
       ══════════════════════════════════════════════════════════════ */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .modal-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 14px;
      width: min(100%, 540px);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .modal-card {
      background: #FFFFFF;
      border-color: #CBD5E1;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    :host-context([data-theme="light"]) .modal-header {
      border-bottom-color: #E2E8F0;
    }

    .modal-tag {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .modal-tag {
      color: #2563EB;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      margin: 4px 0 2px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .modal-title {
      color: #0F172A;
    }

    .modal-time {
      font-size: 11.5px;
      color: var(--text-3, #71717A);
    }

    .btn-close-modal {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      font-size: 14px;
    }

    :host-context([data-theme="light"]) .btn-close-modal {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-summary-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--surface-secondary, #27272A);
      border-radius: 8px;
    }

    :host-context([data-theme="light"]) .detail-summary-bar {
      background: #F8FAFC;
    }

    .detail-primary {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .detail-primary {
      color: #0F172A;
    }

    .subhead {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    .params-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .params-table {
      border-color: #E2E8F0;
    }

    .param-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 12px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      font-size: 12.5px;
    }

    :host-context([data-theme="light"]) .param-row {
      border-bottom-color: #F1F5F9;
    }

    .param-row:last-child {
      border-bottom: none;
    }

    .param-k {
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .param-k {
      color: #475569;
    }

    .param-v {
      color: var(--text, #F4F4F5);
      text-align: right;
      overflow-wrap: break-word;
      word-break: break-all;
    }

    :host-context([data-theme="light"]) .param-v {
      color: #0F172A;
    }

    /* Confirm Dialogs */
    .confirm-dialog-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 14px;
      width: min(100%, 420px);
      padding: 24px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    :host-context([data-theme="light"]) .confirm-dialog-card {
      background: #FFFFFF;
      border-color: #CBD5E1;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .confirm-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-icon-box.danger {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
    }

    :host-context([data-theme="light"]) .confirm-icon-box.danger {
      background: #FEE2E2;
      color: #DC2626;
    }

    .confirm-title {
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .confirm-title {
      color: #0F172A;
    }

    .confirm-desc {
      font-size: 13px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .confirm-desc {
      color: #64748B;
    }

    .confirm-actions-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      width: 100%;
      margin-top: 6px;
    }

    .btn-dialog-cancel {
      height: 40px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="light"]) .btn-dialog-cancel {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-dialog-danger {
      height: 40px;
      border-radius: 8px;
      background: var(--ds-fail, #F87171);
      border: 1px solid var(--ds-fail, #F87171);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="light"]) .btn-dialog-danger {
      background: #DC2626;
      border-color: #DC2626;
    }
  `]
})
export class HistoryReportsModuleComponent implements OnInit {
  public historyService = inject(DiagnosticHistoryService);
  public reportService = inject(DiagnosticReportService);
  public state = inject(DeviceStudioStateService);
  private router = inject(Router);

  public readonly activeTab = signal<DashboardTab>('history');
  public readonly selectedDetailRecord = signal<DiagnosticHistoryRecord | null>(null);
  public readonly recordToDelete = signal<DiagnosticHistoryRecord | null>(null);
  public readonly showClearConfirm = signal<boolean>(false);

  // Filter option items
  public readonly moduleFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Modules', icon: 'layers' },
    { value: 'speed', label: 'Speed Test', icon: 'speed' },
    { value: 'ip', label: 'Public IP', icon: 'globe' },
    { value: 'webcam', label: 'Webcam', icon: 'camera' },
    { value: 'microphone', label: 'Microphone', icon: 'mic' },
    { value: 'speaker', label: 'Speaker', icon: 'headphones' },
    { value: 'screen', label: 'Screen Share', icon: 'screen' }
  ];

  public readonly statusFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Statuses', icon: 'filter' },
    { value: 'pass', label: 'Passed Only', icon: 'check-circle' },
    { value: 'warn', label: 'Warnings Only', icon: 'circle-alert' },
    { value: 'fail', label: 'Failures Only', icon: 'alert-circle' }
  ];

  public readonly sortOrderOptions: DropdownOption[] = [
    { value: 'newest', label: 'Newest First', icon: 'calendar' },
    { value: 'oldest', label: 'Oldest First', icon: 'calendar' },
    { value: 'status', label: 'By Status', icon: 'award' }
  ];

  public readonly reportTemplateOptions: DropdownOption[] = [
    { value: 'full', label: 'Comprehensive Audit (Full)', description: 'Hardware & Network Audit' },
    { value: 'network', label: 'Network Performance & Security', description: 'Speed, Ping, Jitter & IP' },
    { value: 'audio', label: 'Audio Diagnostics & Acoustics', description: 'Microphone & Speaker tests' },
    { value: 'camera', label: 'Camera Video & Resolution', description: 'Webcam capabilities & FPS' },
    { value: 'readiness', label: 'Video Meeting Readiness', description: 'Work-from-home verification' }
  ];

  // Comparison selection
  public readonly selectedBaseRecordId = signal<string>('');
  public readonly selectedTargetRecordId = signal<string>('');

  public readonly compareRecordOptions = computed<DropdownOption[]>(() => {
    return this.historyService.records().map(r => ({
      value: r.id,
      label: `[${r.moduleType.toUpperCase()}] ${r.testTitle}`,
      description: `${r.timestampFormatted} • ${r.primaryMetric}`,
      icon: this.getModuleIcon(r.moduleType)
    }));
  });

  // Report configuration options
  public readonly reportOptions = signal<ReportExportOptions>({
    template: 'full',
    includeModules: ['webcam', 'microphone', 'speaker', 'speed', 'ip', 'screen'],
    maskIp: true,
    includeLocation: true,
    includeReadiness: true
  });

  public readonly comparisonResult = computed(() => {
    const baseId = this.selectedBaseRecordId();
    const targetId = this.selectedTargetRecordId();
    if (!baseId || !targetId) return null;
    return this.historyService.compareRecords(baseId, targetId);
  });

  public ngOnInit(): void {
    resetDeviceStudioScroll();
    this.state.setActiveTab('history');

    // Auto-select initial pair for comparison if available
    const records = this.historyService.records();
    if (records.length >= 2) {
      this.selectedBaseRecordId.set(records[1].id);
      this.selectedTargetRecordId.set(records[0].id);
    }
    resetDeviceStudioScroll();
  }

  public goBackToStudio(): void {
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }

  public getModuleIcon(moduleType: DiagnosticModuleType): string {
    switch (moduleType) {
      case 'webcam': return 'camera';
      case 'microphone': return 'mic';
      case 'speaker': return 'headphones';
      case 'speed': return 'speed';
      case 'ip': return 'globe';
      case 'screen': return 'screen';
      case 'readiness':
      case 'health':
      default:
        return 'activity';
    }
  }

  public openComparisonWith(record: DiagnosticHistoryRecord): void {
    const match = this.historyService.records().find(r => r.id !== record.id && r.moduleType === record.moduleType);
    if (match) {
      this.selectedBaseRecordId.set(match.id);
      this.selectedTargetRecordId.set(record.id);
    } else {
      this.selectedBaseRecordId.set(record.id);
      this.selectedTargetRecordId.set('');
    }
    this.activeTab.set('compare');
  }

  public executeClearAll(): void {
    this.historyService.clearHistory();
    this.state.showToast('Diagnostic history cleared.');
    this.showClearConfirm.set(false);
  }

  public executeDeleteRecord(): void {
    const r = this.recordToDelete();
    if (r) {
      this.historyService.deleteRecord(r.id);
      this.state.showToast('Test record deleted.');
      this.recordToDelete.set(null);
    }
  }

  public clearFilters(): void {
    this.historyService.searchQuery.set('');
    this.historyService.selectedModuleFilter.set('all');
    this.historyService.selectedStatusFilter.set('all');
  }

  public formatTimeOnly(isoStr: string): string {
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch {
      // fallback
    }
    return isoStr;
  }

  // Filter event handlers
  public onModuleFilterChange(val: string): void {
    this.historyService.selectedModuleFilter.set(val as DiagnosticModuleType | 'all');
  }

  public onStatusFilterChange(val: string): void {
    this.historyService.selectedStatusFilter.set(val as DiagnosticResultStatus | 'all');
  }

  public onSortOrderChange(val: string): void {
    this.historyService.sortOrder.set(val as 'newest' | 'oldest' | 'status');
  }

  // Report Options Helpers
  public updateReportTemplate(template: ReportTemplateType | string): void {
    const t = template as ReportTemplateType;
    let mods: DiagnosticModuleType[] = ['webcam', 'microphone', 'speaker', 'speed', 'ip', 'screen'];
    if (t === 'network') mods = ['speed', 'ip'];
    if (t === 'audio') mods = ['microphone', 'speaker'];
    if (t === 'camera') mods = ['webcam'];
    if (t === 'readiness') mods = ['webcam', 'microphone', 'speaker', 'speed', 'screen'];

    this.reportOptions.update(o => ({
      ...o,
      template: t,
      includeModules: mods,
      includeReadiness: t === 'full' || t === 'readiness'
    }));
  }

  public isModuleIncluded(mod: DiagnosticModuleType): boolean {
    return this.reportOptions().includeModules.includes(mod);
  }

  public toggleModuleInclusion(mod: DiagnosticModuleType): void {
    this.reportOptions.update(o => {
      const exists = o.includeModules.includes(mod);
      const updated = exists
        ? o.includeModules.filter(m => m !== mod)
        : [...o.includeModules, mod];
      return { ...o, includeModules: updated };
    });
  }

  public updateMaskIp(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.reportOptions.update(o => ({ ...o, maskIp: input.checked }));
  }

  public updateIncludeLocation(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.reportOptions.update(o => ({ ...o, includeLocation: input.checked }));
  }

  public resolveReportTitle(): string {
    const t = this.reportOptions().template;
    switch (t) {
      case 'network': return 'Network Performance & Security Audit';
      case 'audio': return 'Audio Diagnostics & Acoustic Calibration';
      case 'camera': return 'Camera Video & Resolution Audit';
      case 'readiness': return 'Video Conference Meeting Readiness Audit';
      case 'full':
      default:
        return 'Comprehensive Hardware & Network Audit';
    }
  }

  public getDetailsEntries(details: Record<string, unknown>): [string, unknown][] {
    return Object.entries(details || {});
  }

  public formatParamVal(val: unknown): string {
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return String(val ?? '--');
  }
}
