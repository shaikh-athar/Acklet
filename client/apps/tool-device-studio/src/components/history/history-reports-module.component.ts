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
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';
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
  imports: [CommonModule, FormsModule, TsIconComponent, DeviceModuleHeaderComponent, AckletDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-module-root">
      
      <!-- Module Header -->
      <app-device-module-header
        title="History & Reports"
        icon="history"
        description="Review past test results, compare performance, and export diagnostic reports."
        [badge]="historyService.stats().totalCount + ' Tests'"
        badgeType="active"
        (backClicked)="goBackToStudio()"
      >
        <button 
          type="button" 
          class="btn-hdr-action" 
          [class.paused]="!historyService.isHistoryEnabled()"
          (click)="historyService.setHistoryEnabled(!historyService.isHistoryEnabled())"
          [title]="historyService.isHistoryEnabled() ? 'History recording is enabled' : 'History recording is paused'"
        >
          <ts-icon [name]="historyService.isHistoryEnabled() ? 'check-circle' : 'circle-alert'" [size]="14" />
          <span>{{ historyService.isHistoryEnabled() ? 'Logging Active' : 'Logging Paused' }}</span>
        </button>

        @if (historyService.stats().totalCount > 0) {
          <button type="button" class="btn-hdr-danger" (click)="confirmClearHistory()">
            <ts-icon name="trash" [size]="14" />
            <span>Clear All</span>
          </button>
        }
      </app-device-module-header>

      <!-- Stats Overview Row -->
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

      <!-- Main Navigation Tabs -->
      <div class="nav-tabs-bar">
        <button 
          type="button" 
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
          class="nav-tab-btn" 
          [class.active]="activeTab() === 'compare'"
          (click)="activeTab.set('compare')"
        >
          <ts-icon name="git-compare" [size]="15" />
          <span>Performance Comparison</span>
        </button>

        <button 
          type="button" 
          class="nav-tab-btn" 
          [class.active]="activeTab() === 'reports'"
          (click)="activeTab.set('reports')"
        >
          <ts-icon name="file-text" [size]="15" />
          <span>Generate Reports</span>
        </button>
      </div>

      <!-- TAB 1: HISTORY LOG -->
      @if (activeTab() === 'history') {
        <div class="tab-pane">
          
          <!-- Filter & Search Toolbar -->
          <div class="filter-toolbar">
            <div class="search-wrap">
              <ts-icon name="search" [size]="14" class="search-icon" />
              <input 
                type="text" 
                class="search-input" 
                placeholder="Search history by module, metric, or status..." 
                [ngModel]="historyService.searchQuery()"
                (ngModelChange)="historyService.searchQuery.set($event)"
              />
              @if (historyService.searchQuery()) {
                <button type="button" class="btn-clear-search" (click)="historyService.searchQuery.set('')">✕</button>
              }
            </div>

            <div class="filter-controls">
              <!-- Module Filter -->
              <div class="filter-dropdown-wrap">
                <app-acklet-dropdown
                  [options]="moduleFilterOptions"
                  [value]="historyService.selectedModuleFilter()"
                  (valueChange)="onModuleFilterChange($event)"
                  placeholder="All Modules"
                  icon="layers"
                />
              </div>

              <!-- Status Filter -->
              <div class="filter-dropdown-wrap">
                <app-acklet-dropdown
                  [options]="statusFilterOptions"
                  [value]="historyService.selectedStatusFilter()"
                  (valueChange)="onStatusFilterChange($event)"
                  placeholder="All Statuses"
                  icon="filter"
                />
              </div>

              <!-- Sort Order -->
              <div class="filter-dropdown-wrap">
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

          <!-- History Records List -->
          @if (historyService.filteredRecords().length > 0) {
            <div class="history-records-list">
              @for (record of historyService.filteredRecords(); track record.id) {
                <article class="record-card">
                  <div class="record-main">
                    <div class="record-icon-box" [attr.data-module]="record.moduleType">
                      <ts-icon [name]="getModuleIcon(record.moduleType)" [size]="20" />
                    </div>

                    <div class="record-info">
                      <div class="record-title-row">
                        <h3 class="record-title">{{ record.testTitle }}</h3>
                        <span class="status-pill" [attr.data-status]="record.status">
                          {{ record.status | uppercase }}
                        </span>
                        <span class="record-timestamp">{{ record.timestampFormatted }}</span>
                      </div>

                      <div class="record-metrics-row">
                        <span class="metric-primary">{{ record.primaryMetric }}</span>
                        @if (record.secondaryMetric) {
                          <span class="metric-separator">•</span>
                          <span class="metric-secondary">{{ record.secondaryMetric }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="record-actions">
                    <button type="button" class="btn-card-action" (click)="openComparisonWith(record)" title="Compare with another session">
                      <ts-icon name="git-compare" [size]="13" />
                      <span>Compare</span>
                    </button>

                    <button type="button" class="btn-card-action" (click)="selectedDetailRecord.set(record)" title="View full details">
                      <span>Details</span>
                    </button>

                    <button type="button" class="btn-card-delete" (click)="historyService.deleteRecord(record.id)" title="Delete record">
                      <ts-icon name="trash" [size]="13" />
                    </button>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="empty-state-card">
              <ts-icon name="history" [size]="32" />
              <h3 class="empty-title">No matching diagnostic records</h3>
              <p class="empty-desc">
                {{ historyService.records().length === 0 ? 'No test history logged yet. Complete any module test in Device Studio to record diagnostic sessions.' : 'No records match your active search and filter criteria.' }}
              </p>
            </div>
          }

        </div>
      }

      <!-- TAB 2: PERFORMANCE COMPARISON -->
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
              <ts-icon name="git-compare" [size]="32" />
              <h3 class="empty-title">Select two test runs to compare</h3>
              <p class="empty-desc">
                Choose any two tests from the dropdowns above (for example, two Internet Speed Tests or two Webcam checks) to view side-by-side performance changes.
              </p>
            </div>
          }

        </div>
      }

      <!-- TAB 3: REPORT GENERATOR -->
      @if (activeTab() === 'reports') {
        <div class="tab-pane">
          
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
                <div class="health-chip">
                  <span>Health</span>
                  <strong>{{ state.deviceHealthScore() }}/100</strong>
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

      <!-- Record Details Modal -->
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
                <span class="status-pill" [attr.data-status]="selectedDetailRecord()!.status">
                  {{ selectedDetailRecord()!.status | uppercase }}
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

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .history-module-root {
      width: 100%;
    }

    .btn-hdr-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-hdr-action.paused {
      color: #FBBF24;
      border-color: rgba(251, 191, 36, 0.3);
    }

    :host-context([data-theme="light"]) .btn-hdr-action {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .btn-hdr-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #F87171;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-hdr-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Stats Overview */
    .stats-overview-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .stats-overview-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .stat-box {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    :host-context([data-theme="light"]) .stat-box {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .stat-k {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .stat-k {
      color: #64748B;
    }

    .stat-v {
      font-size: 22px;
      font-weight: 800;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .stat-v {
      color: #0F172A;
    }

    .stat-v.pass { color: #34D399; }
    .stat-v.warn { color: #FBBF24; }
    .stat-v.score { color: var(--tool-accent, #3B82F6); }
    :host-context([data-theme="light"]) .stat-v.score { color: #2563EB; }

    /* Nav Tabs Bar */
    .nav-tabs-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin-bottom: 24px;
      overflow-x: auto;
    }

    :host-context([data-theme="light"]) .nav-tabs-bar {
      border-bottom-color: #E2E8F0;
    }

    .nav-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 10px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted, #71717A);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .nav-tab-btn:hover {
      color: var(--text, #F4F4F5);
      background: var(--surface-secondary, rgba(255, 255, 255, 0.04));
    }

    :host-context([data-theme="light"]) .nav-tab-btn:hover {
      color: #0F172A;
      background: #F1F5F9;
    }

    .nav-tab-btn.active {
      background: var(--surface, var(--bg-1, #18181B));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      color: var(--tool-accent, #3B82F6);
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .nav-tab-btn.active {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #2563EB;
    }

    .tab-pill {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 9999px;
      background: var(--surface-secondary, #27272A);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .tab-pill {
      background: #E2E8F0;
      color: #334155;
    }

    /* Filter Toolbar */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted, #71717A);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 8px 32px 8px 34px;
      border-radius: 8px;
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12.5px;
      outline: none;
    }

    :host-context([data-theme="light"]) .search-input {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-clear-search {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      font-size: 12px;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .filter-dropdown-wrap {
      min-width: 150px;
      flex: 1 1 auto;
    }

    /* History Records List */
    .history-records-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .record-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="light"]) .record-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .record-card:hover {
      border-color: rgba(45, 212, 191, 0.3);
    }

    .record-main {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .record-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: var(--surface-secondary, #27272A);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .record-icon-box {
      background: #F1F5F9;
      color: #2563EB;
    }

    .record-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .record-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .record-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .record-title {
      color: #0F172A;
    }

    .status-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
    }

    .status-pill[data-status="pass"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .status-pill[data-status="warn"] {
      background: rgba(251, 191, 36, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .status-pill[data-status="fail"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
      border: 1px solid rgba(248, 113, 113, 0.3);
    }

    .record-timestamp {
      font-size: 11px;
      color: var(--text-muted, #71717A);
    }

    .record-metrics-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .record-metrics-row {
      color: #475569;
    }

    .metric-primary {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .metric-primary {
      color: #0F172A;
    }

    .metric-separator {
      color: var(--text-muted, #71717A);
    }

    .record-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-card-action {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-card-action {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-card-delete {
      padding: 6px 8px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #71717A);
      cursor: pointer;
    }

    .btn-card-delete:hover {
      color: #F87171;
      border-color: rgba(248, 113, 113, 0.4);
    }

    /* Compare Tab */
    .compare-selector-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    :host-context([data-theme="light"]) .compare-selector-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .card-heading {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 6px;
    }

    :host-context([data-theme="light"]) .card-heading {
      color: #0F172A;
    }

    .card-desc {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 0 0 16px;
    }

    :host-context([data-theme="light"]) .card-desc {
      color: #64748B;
    }

    .selector-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .selector-grid {
        grid-template-columns: 1fr;
      }
    }

    .selector-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .selector-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    .select-record {
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .select-record {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .comparison-results-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 24px;
    }

    :host-context([data-theme="light"]) .comparison-results-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .comparison-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .comparison-header {
      border-bottom-color: #F1F5F9;
    }

    .comp-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .comp-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .comp-title {
      color: #0F172A;
    }

    .verdict-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
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

    .verdict-pill[data-verdict="consistent"] {
      background: rgba(148, 163, 184, 0.15);
      color: #94A3B8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .comp-summary {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 4px 0 0;
    }

    :host-context([data-theme="light"]) .comp-summary {
      color: #64748B;
    }

    .metrics-comparison-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) {
      .metrics-comparison-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-comp-card {
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    :host-context([data-theme="light"]) .metric-comp-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .metric-comp-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .metric-comp-label {
      color: #0F172A;
    }

    .values-flow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .val-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .val-sub {
      font-size: 10.5px;
      color: var(--text-muted, #71717A);
    }

    .val-text {
      font-size: 15px;
      color: var(--text-2, #A1A1AA);
      font-variant-numeric: tabular-nums;
    }

    .val-text.strong {
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .val-text.strong {
      color: #0F172A;
    }

    .flow-arrow {
      color: var(--text-muted, #71717A);
    }

    .delta-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      align-self: flex-start;
    }

    .delta-badge[data-dir="improved"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
    }

    .delta-badge[data-dir="regressed"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
    }

    .delta-badge[data-dir="neutral"] {
      background: rgba(148, 163, 184, 0.12);
      color: #94A3B8;
    }

    .dir-text {
      font-size: 9.5px;
      opacity: 0.8;
    }

    /* Reports Tab */
    .report-generator-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(340px, 1fr);
      gap: 24px;
    }

    @media (max-width: 960px) {
      .report-generator-grid {
        grid-template-columns: 1fr;
      }
    }

    .config-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    :host-context([data-theme="light"]) .config-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .form-label {
      color: #0F172A;
    }

    .select-input {
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12.5px;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .select-input {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .checkbox-label {
      color: #475569;
    }

    .preview-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    :host-context([data-theme="light"]) .preview-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .preview-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .preview-header {
      border-bottom-color: #F1F5F9;
    }

    .preview-tag {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .preview-tag {
      color: #2563EB;
    }

    .preview-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 2px 0 2px;
    }

    :host-context([data-theme="light"]) .preview-title {
      color: #0F172A;
    }

    .preview-subtitle {
      font-size: 11.5px;
      color: var(--text-muted, #71717A);
      margin: 0;
    }

    .health-chip {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 11px;
      color: var(--text-muted, #71717A);
    }

    .health-chip strong {
      font-size: 15px;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .health-chip strong {
      color: #2563EB;
    }

    .export-actions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn-export:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--tool-accent, #3B82F6);
    }

    .btn-export.primary {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .btn-export {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-export.primary {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #71717A);
      font-size: 11px;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .privacy-note {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* Empty States */
    .empty-state-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 16px;
      padding: 36px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-muted, #71717A);
      gap: 8px;
    }

    :host-context([data-theme="light"]) .empty-state-card {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 4px 0 0;
    }

    :host-context([data-theme="light"]) .empty-title {
      color: #0F172A;
    }

    .empty-desc {
      font-size: 12px;
      max-width: 420px;
      margin: 0;
      line-height: 1.45;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: var(--surface, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }

    :host-context([data-theme="light"]) .modal-card {
      background: #FFFFFF;
      border-color: #CBD5E1;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .modal-tag {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .modal-tag {
      color: #2563EB;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 2px 0 2px;
    }

    :host-context([data-theme="light"]) .modal-title {
      color: #0F172A;
    }

    .modal-time {
      font-size: 11px;
      color: var(--text-muted, #71717A);
    }

    .btn-close-modal {
      background: none;
      border: none;
      color: var(--text-muted, #71717A);
      font-size: 16px;
      cursor: pointer;
    }

    .detail-summary-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .detail-summary-bar {
      background: #F1F5F9;
    }

    .detail-primary {
      font-size: 13px;
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
      letter-spacing: 0.06em;
      color: var(--text-muted, #71717A);
      margin: 16px 0 8px;
    }

    .params-table {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .param-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.02);
    }

    :host-context([data-theme="light"]) .param-row {
      background: #F8FAFC;
    }

    .param-k {
      color: var(--text-muted, #71717A);
      font-weight: 500;
    }

    .param-v {
      font-weight: 600;
      color: var(--text, #F4F4F5);
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    :host-context([data-theme="light"]) .param-v {
      color: #0F172A;
    }
  `]
})
export class HistoryReportsModuleComponent implements OnInit {
  private router = inject(Router);
  public historyService = inject(DiagnosticHistoryService);
  public reportService = inject(DiagnosticReportService);
  public state = inject(DeviceStudioStateService);

  public readonly activeTab = signal<DashboardTab>('history');
  public readonly selectedDetailRecord = signal<DiagnosticHistoryRecord | null>(null);

  // Filter dropdown options
  public readonly moduleFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Modules', icon: 'layers' },
    { value: 'speed', label: 'Internet Speed', icon: 'speed' },
    { value: 'ip', label: 'Public IP', icon: 'globe' },
    { value: 'webcam', label: 'Webcam', icon: 'camera' },
    { value: 'microphone', label: 'Microphone', icon: 'mic' },
    { value: 'speaker', label: 'Speaker & Audio', icon: 'speaker' },
    { value: 'screen', label: 'Screen Sharing', icon: 'screen' },
    { value: 'readiness', label: 'Meeting Readiness', icon: 'activity' }
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
    this.state.setActiveTab('history');
    
    // Auto-select initial pair for comparison if available
    const records = this.historyService.records();
    if (records.length >= 2) {
      this.selectedBaseRecordId.set(records[1].id);
      this.selectedTargetRecordId.set(records[0].id);
    }
  }

  public goBackToStudio(): void {
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }

  public getModuleIcon(moduleType: DiagnosticModuleType): string {
    switch (moduleType) {
      case 'webcam': return 'camera';
      case 'microphone': return 'mic';
      case 'speaker': return 'speaker';
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
    // Find another record with matching moduleType
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

  public confirmClearHistory(): void {
    if (confirm('Are you sure you want to clear your local diagnostic history? This cannot be undone.')) {
      this.historyService.clearHistory();
      this.state.showToast('Diagnostic history cleared.');
    }
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

