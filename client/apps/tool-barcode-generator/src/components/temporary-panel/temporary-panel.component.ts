// apps/tool-barcode-generator/src/components/temporary-panel/temporary-panel.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  computed,
  inject,
  output,
  input,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent, ResponsiveService } from '@acklet/tool-shell';
import JSZip from 'jszip';
import { TempCodeService } from '../../services/temp-code.service';
import {
  TempCodeRecord,
  TempCodeStatus,
  UpdateTempCodePayload
} from '../../models/temp-code.models';
import { TEMP_CODE_CONFIG } from '../../config/temp-code.config';
import { RenderService } from '../../services/render.service';
import { BarcodeExportService } from '../../services/barcode-export.service';
import { BARCODE_CATALOG } from '../../config/barcode-catalog.config';
import { DEFAULT_DESIGN_OPTIONS } from '../../models/barcode.models';
import { isLaunchableContent } from '../../utils/launchable.util';

export interface BatchGroup {
  batchId: string;
  name: string;
  count: number;
  items: TempCodeRecord[];
  status: TempCodeStatus;
  expiresAt: string;
  remainingSeconds: number;
  isExpanded: boolean;
}

export type DashboardEntry =
  | { kind: 'single'; item: TempCodeRecord }
  | { kind: 'batch'; batch: BatchGroup };

@Component({
  selector: 'app-barcode-temporary-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="temporary-dashboard-container">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- HEADER: Title + Summary Chips + New Temporary Code Button    -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <header class="dashboard-header-row">
        <div class="header-left-col">
          <div class="title-with-badge">
            <h2 class="dashboard-title">Temporary codes</h2>
            <span class="total-count-badge">{{ totalCodesCount() }}</span>
          </div>

          <!-- Summary Chips with live status counts -->
          <div class="summary-chips-row" role="group" aria-label="Status counts">
            <button
              type="button"
              class="summary-chip active-chip"
              [class.is-selected]="statusFilter() === 'ACTIVE'"
              (click)="onStatusSelect('ACTIVE')"
            >
              <span class="chip-dot live-dot"></span>
              <span>Active</span>
              <span class="chip-count">{{ activeCount() }}</span>
            </button>

            <button
              type="button"
              class="summary-chip expiring-chip"
              [class.is-selected]="statusFilter() === 'EXPIRING_SOON'"
              (click)="onStatusSelect('EXPIRING_SOON')"
            >
              <span class="chip-dot expiring-dot"></span>
              <span>Expiring soon</span>
              <span class="chip-count">{{ expiringSoonCount() }}</span>
            </button>

            <button
              type="button"
              class="summary-chip expired-chip"
              [class.is-selected]="statusFilter() === 'EXPIRED'"
              (click)="onStatusSelect('EXPIRED')"
            >
              <span class="chip-dot expired-dot"></span>
              <span>Expired</span>
              <span class="chip-count">{{ expiredCount() }}</span>
            </button>
          </div>
        </div>

        <div class="header-right-col">
          <button
            type="button"
            class="primary-new-code-btn"
            (click)="newTemporaryCode.emit()"
            aria-label="New temporary code"
          >
            <ts-icon name="plus" [size]="15" />
            <span>New temporary code</span>
          </button>
        </div>
      </header>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- TOOLBAR: Search by name + Status filter + Sort filter       -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="dashboard-toolbar-card">
        <div class="search-input-wrap">
          <ts-icon name="search" [size]="15" class="search-leading-icon" />
          <input
            type="text"
            class="ts-input-field search-field"
            placeholder="Search by name..."
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
          />
          @if (searchTerm()) {
            <button
              type="button"
              class="clear-search-btn"
              (click)="onSearchChange('')"
              aria-label="Clear search"
            >
              <ts-icon name="x" [size]="13" />
            </button>
          }
        </div>

        <div class="filter-controls-cluster">
          @if (isStatusDropdownOpen() || isSortDropdownOpen()) {
            <div
              class="filter-dropdown-backdrop"
              (click)="closeDropdowns()"
              aria-hidden="true"
            ></div>
          }

          <!-- Status Dropdown -->
          <div class="filter-dropdown status-dropdown-wrap" [class.is-open]="isStatusDropdownOpen()">
            <label class="filter-label">Status:</label>
            <button
              type="button"
              class="filter-trigger-btn"
              (click)="toggleStatusDropdown($event)"
              [attr.aria-expanded]="isStatusDropdownOpen()"
              aria-label="Status filter"
            >
              <span class="filter-active-val">{{ getStatusLabel(statusFilter()) }}</span>
              <ts-icon name="chevron-down" [size]="13" class="filter-chevron" [class.rotated]="isStatusDropdownOpen()" />
            </button>

            <div class="filter-menu-popover" [class.is-open]="isStatusDropdownOpen()" role="menu" aria-label="Status filter options">
              <button type="button" class="filter-menu-item" [class.selected]="statusFilter() === 'ALL'" (click)="onStatusSelect('ALL'); isStatusDropdownOpen.set(false)">All</button>
              <button type="button" class="filter-menu-item" [class.selected]="statusFilter() === 'ACTIVE'" (click)="onStatusSelect('ACTIVE'); isStatusDropdownOpen.set(false)">Active</button>
              <button type="button" class="filter-menu-item" [class.selected]="statusFilter() === 'EXPIRING_SOON'" (click)="onStatusSelect('EXPIRING_SOON'); isStatusDropdownOpen.set(false)">Expiring soon</button>
              <button type="button" class="filter-menu-item" [class.selected]="statusFilter() === 'EXPIRED'" (click)="onStatusSelect('EXPIRED'); isStatusDropdownOpen.set(false)">Expired</button>
              <button type="button" class="filter-menu-item" [class.selected]="statusFilter() === 'DEACTIVATED'" (click)="onStatusSelect('DEACTIVATED'); isStatusDropdownOpen.set(false)">Deactivated</button>
            </div>
          </div>

          <!-- Sort Dropdown -->
          <div class="filter-dropdown sort-dropdown-wrap" [class.is-open]="isSortDropdownOpen()">
            <label class="filter-label">Sort:</label>
            <button
              type="button"
              class="filter-trigger-btn"
              (click)="toggleSortDropdown($event)"
              [attr.aria-expanded]="isSortDropdownOpen()"
              aria-label="Sort order"
            >
              <span class="filter-active-val">{{ getSortLabel(sortFilter()) }}</span>
              <ts-icon name="chevron-down" [size]="13" class="filter-chevron" [class.rotated]="isSortDropdownOpen()" />
            </button>

            <div class="filter-menu-popover" [class.is-open]="isSortDropdownOpen()" role="menu" aria-label="Sort options">
              <button type="button" class="filter-menu-item" [class.selected]="sortFilter() === 'NEWEST'" (click)="onSortChange('NEWEST'); isSortDropdownOpen.set(false)">Newest first</button>
              <button type="button" class="filter-menu-item" [class.selected]="sortFilter() === 'EXPIRING_SOON'" (click)="onSortChange('EXPIRING_SOON'); isSortDropdownOpen.set(false)">Expiring soon</button>
            </div>
          </div>

          <!-- Refresh Button -->
          <button
            type="button"
            class="refresh-icon-btn"
            [disabled]="isLoading()"
            (click)="loadCodes()"
            title="Refresh codes"
            aria-label="Refresh"
          >
            <ts-icon name="refresh-cw" [size]="14" [class.spin-animation]="isLoading()" />
          </button>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- MAIN CONTENT: Loading / Empty / Entries (Table or Cards)     -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (isLoading()) {
        <div class="dashboard-state-card" role="status">
          <div class="spinner-dot"></div>
          <span class="state-text">Loading temporary codes...</span>
        </div>
      } @else if (entries().length === 0) {
        <div class="dashboard-empty-card" role="status">
          <div class="empty-icon-wrap">
            <ts-icon name="clock" [size]="32" />
          </div>
          <h3 class="empty-title">No temporary codes found</h3>
          <p class="empty-desc">
            @if (searchTerm() || statusFilter() !== 'ALL') {
              No codes match your active filters. Try clearing search or status.
            } @else {
              Temporary expiring barcodes created on this device will be listed here.
            }
          </p>
          @if (!searchTerm() && statusFilter() === 'ALL') {
            <button
              type="button"
              class="empty-cta-btn primary-empty-cta-btn"
              (click)="newTemporaryCode.emit()"
            >
              <ts-icon name="plus" [size]="14" />
              <span>Create temporary code</span>
            </button>
          }
        </div>
      } @else {
        <!-- VIEW: Table on Wide Screens / Cards on Small Screens -->
        @if (!responsive.isSm()) {
          <!-- ── Desktop / Tablet Table View ────────────────────────────── -->
          <div class="table-container-card">
            <table class="dashboard-table" aria-label="Temporary codes list">
              <thead>
                <tr>
                  <th class="col-expand"></th>
                  <th class="col-name">Name</th>
                  <th class="col-format">Format</th>
                  <th class="col-payload">Content</th>
                  <th class="col-expiry">Expires</th>
                  <th class="col-status">Status</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entryKey(entry)) {
                  @if (entry.kind === 'batch') {
                    <!-- BATCH HEADER ROW -->
                    <tr class="batch-header-row" [class.is-expanded]="entry.batch.isExpanded">
                      <td class="col-expand">
                        <button
                          type="button"
                          class="expand-toggle-btn"
                          (click)="toggleBatchExpand(entry.batch.batchId)"
                          [attr.aria-expanded]="entry.batch.isExpanded"
                          aria-label="Toggle batch items"
                        >
                          <ts-icon
                            [name]="entry.batch.isExpanded ? 'chevron-down' : 'chevron-right'"
                            [size]="15"
                          />
                        </button>
                      </td>
                      <td class="col-name">
                        <div class="batch-name-wrap">
                          <ts-icon name="layers" [size]="15" class="batch-folder-icon" />
                          <span class="batch-name-text">{{ entry.batch.name }}</span>
                          <span class="batch-count-pill">{{ entry.batch.count }} codes</span>
                        </div>
                      </td>
                      <td class="col-format">
                        <span class="format-cell-pill">
                          <span>{{ getFormatLabel(entry.batch.items[0]?.barcodeFormat || '') }}</span>
                          @if (entry.batch.items.length > 0 && isBarcodeLaunchable(entry.batch.items[0])) {
                            <ts-icon name="arrow-up-right" [size]="11" class="format-launch-icon" />
                          }
                        </span>
                      </td>
                      <td class="col-payload">
                        <span class="cell-subtext">Bulk batch</span>
                      </td>
                      <td class="col-expiry">
                        <div class="expiry-cell-col">
                          <span class="expiry-relative-text">{{ formatCountdown(entry.batch.remainingSeconds) }}</span>
                          <span class="expiry-date-text">{{ formatExpiryDate(entry.batch.expiresAt) }}</span>
                        </div>
                      </td>
                      <td class="col-status">
                        <span class="status-cell-badge" [attr.data-status]="entry.batch.status">
                          <span class="badge-dot"></span>
                          <span>{{ formatStatusLabel(entry.batch.status) }}</span>
                        </span>
                      </td>
                      <td class="col-actions">
                        <div class="table-actions-row">
                          <button
                            type="button"
                            class="action-subtle-btn"
                            (click)="openBatchExtendModal(entry.batch)"
                            title="Extend all codes in batch"
                          >
                            Extend all
                          </button>
                          <button
                            type="button"
                            class="action-subtle-btn"
                            (click)="onBatchDownload(entry.batch)"
                            title="Download batch ZIP"
                          >
                            Download all
                          </button>
                          <button
                            type="button"
                            class="action-subtle-btn text-danger"
                            (click)="onBatchExpireNow(entry.batch)"
                            title="Expire all codes in batch immediately"
                          >
                            Expire all
                          </button>
                          <button
                            type="button"
                            class="action-icon-danger-btn"
                            (click)="onBatchDelete(entry.batch)"
                            title="Delete batch"
                            aria-label="Delete batch"
                          >
                            <ts-icon name="trash-2" [size]="14" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <!-- EXPANDED BATCH SUB-ROWS -->
                    @if (entry.batch.isExpanded) {
                      @for (item of entry.batch.items; track item.id; let idx = $index) {
                        <tr class="batch-item-sub-row">
                          <td class="col-expand sub-indented">
                            <span class="sub-row-num">{{ idx + 1 }}</span>
                          </td>
                          <td class="col-name">
                            <span class="item-name-text">{{ item.name }}</span>
                          </td>
                          <td class="col-format">
                            <span class="format-cell-pill subtle">
                              <span>{{ getFormatLabel(item.barcodeFormat) }}</span>
                              @if (isBarcodeLaunchable(item)) {
                                <ts-icon name="arrow-up-right" [size]="11" class="format-launch-icon" />
                              }
                            </span>
                          </td>
                          <td class="col-payload">
                            <span class="payload-cell-text mono-font" [title]="item.content || item.payload">
                              {{ item.content || item.payload }}
                            </span>
                          </td>
                          <td class="col-expiry">
                            <span class="cell-subtext">{{ formatCountdown(item.remainingSeconds) }}</span>
                          </td>
                          <td class="col-status">
                            <span class="status-cell-badge mini" [attr.data-status]="item.status">
                              <span class="badge-dot"></span>
                              <span>{{ formatStatusLabel(item.status) }}</span>
                            </span>
                          </td>
                          <td class="col-actions">
                            <div class="table-actions-row">
                              <button
                                type="button"
                                class="action-icon-btn"
                                (click)="onCopyLink(item)"
                                [title]="copiedId() === item.id ? 'Copied' : 'Copy link'"
                              >
                                <ts-icon [name]="copiedId() === item.id ? 'check' : 'copy'" [size]="13" />
                              </button>
                              @if (isBarcodeLaunchable(item)) {
                                <button
                                  type="button"
                                  class="action-icon-btn"
                                  (click)="onOpenCheckPage(item)"
                                  title="Open check page"
                                >
                                  <ts-icon name="external-link" [size]="13" />
                                </button>
                              }
                              <button
                                type="button"
                                class="action-icon-btn"
                                (click)="onDownloadBarcode(item)"
                                title="Download barcode"
                              >
                                <ts-icon name="download" [size]="13" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    }
                  } @else {
                    <!-- SINGLE ITEM ROW -->
                    <tr class="single-item-row">
                      <td class="col-expand"></td>
                      <td class="col-name">
                        <div class="single-name-wrap">
                          <ts-icon name="barcode" [size]="14" class="single-barcode-icon" />
                          <span class="item-name-text font-bold">{{ entry.item.name }}</span>
                        </div>
                      </td>
                      <td class="col-format">
                        <span class="format-cell-pill">
                          <span>{{ getFormatLabel(entry.item.barcodeFormat) }}</span>
                          @if (isBarcodeLaunchable(entry.item)) {
                            <ts-icon name="arrow-up-right" [size]="11" class="format-launch-icon" />
                          }
                        </span>
                      </td>
                      <td class="col-payload">
                        <span class="payload-cell-text mono-font" [title]="entry.item.content || entry.item.payload">
                          {{ entry.item.content || entry.item.payload }}
                        </span>
                      </td>
                      <td class="col-expiry">
                        <div class="expiry-cell-col">
                          <span class="expiry-relative-text">{{ formatCountdown(entry.item.remainingSeconds) }}</span>
                          <span class="expiry-date-text">{{ formatExpiryDate(entry.item.expiresAt) }}</span>
                        </div>
                      </td>
                      <td class="col-status">
                        <span class="status-cell-badge" [attr.data-status]="entry.item.status">
                          <span class="badge-dot"></span>
                          <span>{{ formatStatusLabel(entry.item.status) }}</span>
                        </span>
                      </td>
                      <td class="col-actions">
                        <div class="table-actions-row">
                          <button
                            type="button"
                            class="action-subtle-btn"
                            (click)="openExtendModal(entry.item)"
                            title="Extend code"
                          >
                            Extend
                          </button>
                          <button
                            type="button"
                            class="action-icon-btn"
                            (click)="onCopyLink(entry.item)"
                            [title]="copiedId() === entry.item.id ? 'Copied' : 'Copy link'"
                          >
                            <ts-icon [name]="copiedId() === entry.item.id ? 'check' : 'copy'" [size]="14" />
                          </button>
                          @if (isBarcodeLaunchable(entry.item)) {
                            <button
                              type="button"
                              class="action-icon-btn"
                              (click)="onOpenCheckPage(entry.item)"
                              title="Open check page"
                            >
                              <ts-icon name="external-link" [size]="14" />
                            </button>
                          }
                          <button
                            type="button"
                            class="action-icon-btn"
                            (click)="onDownloadBarcode(entry.item)"
                            title="Download SVG"
                          >
                            <ts-icon name="download" [size]="14" />
                          </button>
                          <button
                            type="button"
                            class="action-icon-btn"
                            (click)="openRenameModal(entry.item)"
                            title="Rename"
                          >
                            <ts-icon name="edit-2" [size]="14" />
                          </button>
                          <button
                            type="button"
                            class="action-icon-danger-btn"
                            (click)="onDelete(entry.item)"
                            title="Delete"
                          >
                            <ts-icon name="trash-2" [size]="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- ── Mobile Cards View (Compact with Actions Popover) ────────── -->
          <div class="cards-list-wrap">
            @for (entry of entries(); track entryKey(entry)) {
              @if (entry.kind === 'batch') {
                <!-- COMPACT BATCH CARD -->
                <div class="mobile-batch-card" [class.is-expanded]="entry.batch.isExpanded">
                  <div class="card-main-row">
                    <div class="card-info-col" (click)="toggleBatchExpand(entry.batch.batchId)">
                      <div class="card-title-line">
                        <ts-icon name="layers" [size]="15" class="batch-folder-icon" />
                        <span class="card-name font-bold">{{ entry.batch.name }}</span>
                        <span class="batch-count-pill">{{ entry.batch.count }} codes</span>
                        <span class="status-cell-badge mini" [attr.data-status]="entry.batch.status">
                          <span class="badge-dot"></span>
                          <span>{{ formatStatusLabel(entry.batch.status) }}</span>
                        </span>
                      </div>
                      <div class="card-meta-line">
                        <span class="meta-label">Expires</span>
                        <span class="expiry-date-text">{{ formatExpiryDate(entry.batch.expiresAt) }}</span>
                      </div>
                    </div>

                    <div class="card-right-col">
                      <span class="expiry-relative-text countdown-pill">{{ formatCountdown(entry.batch.remainingSeconds) }}</span>

                      <button
                        type="button"
                        class="mobile-expand-btn"
                        (click)="toggleBatchExpand(entry.batch.batchId)"
                        [attr.aria-expanded]="entry.batch.isExpanded"
                        aria-label="Toggle batch codes"
                      >
                        <ts-icon [name]="entry.batch.isExpanded ? 'chevron-up' : 'chevron-down'" [size]="16" />
                      </button>

                      <div class="mobile-actions-anchor">
                        <button
                          type="button"
                          class="mobile-more-btn"
                          (click)="toggleMobileMenu('batch-' + entry.batch.batchId, $event)"
                          [attr.aria-expanded]="activeMobileMenuId() === 'batch-' + entry.batch.batchId"
                          aria-label="Batch actions"
                        >
                          <ts-icon name="more-vertical" [size]="16" />
                        </button>

                        @if (activeMobileMenuId() === 'batch-' + entry.batch.batchId) {
                          <div class="mobile-menu-backdrop" (click)="closeMobileMenu()" aria-hidden="true"></div>
                          <div class="mobile-action-menu-popover is-open" role="menu">
                            <button type="button" class="mobile-menu-item" (click)="openBatchExtendModal(entry.batch); closeMobileMenu()">
                              <ts-icon name="clock" [size]="14" />
                              <span>Extend all</span>
                            </button>
                            <button type="button" class="mobile-menu-item" (click)="onBatchDownload(entry.batch); closeMobileMenu()">
                              <ts-icon name="download" [size]="14" />
                              <span>Download all</span>
                            </button>
                            <button type="button" class="mobile-menu-item" (click)="onBatchExpireNow(entry.batch); closeMobileMenu()">
                              <ts-icon name="slash" [size]="14" />
                              <span>Expire all</span>
                            </button>
                            <div class="mobile-menu-divider"></div>
                            <button type="button" class="mobile-menu-item text-danger" (click)="onBatchDelete(entry.batch); closeMobileMenu()">
                              <ts-icon name="trash-2" [size]="14" />
                              <span>Delete batch</span>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Expanded items inside batch -->
                  @if (entry.batch.isExpanded) {
                    <div class="mobile-sub-items-list slide-fade-in">
                      @for (sub of entry.batch.items; track sub.id; let sIdx = $index) {
                        <div class="mobile-sub-item-compact-card">
                          <div class="sub-compact-left">
                            <span class="sub-idx">#{{ sIdx + 1 }}</span>
                            <span class="sub-name">{{ sub.name }}</span>
                            <span class="status-cell-badge mini" [attr.data-status]="sub.status">
                              <span>{{ formatStatusLabel(sub.status) }}</span>
                            </span>
                          </div>
                          <div class="sub-compact-right">
                            <button
                              type="button"
                              class="mini-icon-btn"
                              (click)="onCopyLink(sub)"
                              [title]="copiedId() === sub.id ? 'Copied' : 'Copy link'"
                            >
                              <ts-icon [name]="copiedId() === sub.id ? 'check' : 'copy'" [size]="13" />
                            </button>
                            @if (isBarcodeLaunchable(sub)) {
                              <button
                                type="button"
                                class="mini-icon-btn"
                                (click)="onOpenCheckPage(sub)"
                                title="Open check page"
                              >
                                <ts-icon name="external-link" [size]="13" />
                              </button>
                            }
                            <button
                              type="button"
                              class="mini-icon-btn"
                              (click)="onDownloadBarcode(sub)"
                              title="Download"
                            >
                              <ts-icon name="download" [size]="13" />
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <!-- COMPACT SINGLE CARD -->
                <div class="mobile-single-card">
                  <div class="card-main-row">
                    <div class="card-info-col">
                      <div class="card-title-line">
                        <span class="card-name font-bold">{{ entry.item.name }}</span>
                        <span class="format-cell-pill mini">
                          <span>{{ getFormatLabel(entry.item.barcodeFormat) }}</span>
                          @if (isBarcodeLaunchable(entry.item)) {
                            <ts-icon name="arrow-up-right" [size]="10" class="format-launch-icon" />
                          }
                        </span>
                        <span class="status-cell-badge mini" [attr.data-status]="entry.item.status">
                          <span class="badge-dot"></span>
                          <span>{{ formatStatusLabel(entry.item.status) }}</span>
                        </span>
                      </div>
                      @if (entry.item.content || entry.item.reference) {
                        <p class="card-content-line mono-font" [title]="entry.item.content || entry.item.reference">
                          {{ entry.item.content || entry.item.reference }}
                        </p>
                      }
                      <div class="card-meta-line">
                        <span class="meta-label">Expires</span>
                        <span class="expiry-date-text">{{ formatExpiryDate(entry.item.expiresAt) }}</span>
                      </div>
                    </div>

                    <div class="card-right-col">
                      <span class="expiry-relative-text countdown-pill">{{ formatCountdown(entry.item.remainingSeconds) }}</span>

                      <div class="mobile-actions-anchor">
                        <button
                          type="button"
                          class="mobile-more-btn"
                          (click)="toggleMobileMenu(entry.item.id, $event)"
                          [attr.aria-expanded]="activeMobileMenuId() === entry.item.id"
                          aria-label="More actions"
                        >
                          <ts-icon name="more-vertical" [size]="16" />
                        </button>

                        @if (activeMobileMenuId() === entry.item.id) {
                          <div class="mobile-menu-backdrop" (click)="closeMobileMenu()" aria-hidden="true"></div>
                          <div class="mobile-action-menu-popover is-open" role="menu">
                            <button type="button" class="mobile-menu-item" (click)="onCopyLink(entry.item); closeMobileMenu()">
                              <ts-icon [name]="copiedId() === entry.item.id ? 'check' : 'copy'" [size]="14" />
                              <span>{{ copiedId() === entry.item.id ? 'Copied link' : 'Copy link' }}</span>
                            </button>
                            @if (isBarcodeLaunchable(entry.item)) {
                              <button type="button" class="mobile-menu-item" (click)="onOpenCheckPage(entry.item); closeMobileMenu()">
                                <ts-icon name="external-link" [size]="14" />
                                <span>Check page</span>
                              </button>
                            }
                            <button type="button" class="mobile-menu-item" (click)="onDownloadBarcode(entry.item); closeMobileMenu()">
                              <ts-icon name="download" [size]="14" />
                              <span>Download</span>
                            </button>
                            <button type="button" class="mobile-menu-item" (click)="openExtendModal(entry.item); closeMobileMenu()">
                              <ts-icon name="clock" [size]="14" />
                              <span>Extend</span>
                            </button>
                            <button type="button" class="mobile-menu-item" (click)="openRenameModal(entry.item); closeMobileMenu()">
                              <ts-icon name="edit-2" [size]="14" />
                              <span>Rename</span>
                            </button>
                            <button type="button" class="mobile-menu-item" (click)="onExpireNow(entry.item); closeMobileMenu()">
                              <ts-icon name="slash" [size]="14" />
                              <span>Expire now</span>
                            </button>
                            <div class="mobile-menu-divider"></div>
                            <button type="button" class="mobile-menu-item text-danger" (click)="onDelete(entry.item); closeMobileMenu()">
                              <ts-icon name="trash-2" [size]="14" />
                              <span>Delete</span>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        }
      }

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- EXTEND MODAL (Single Item or Batch)                          -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (extendingTarget()) {
        <div class="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Extend expiration">
          <div class="dialog-card">
            <h3 class="dialog-title">
              {{ extendingBatch() ? 'Extend ' + extendingBatch()!.name : 'Extend ' + extendingTarget()!.name }}
            </h3>
            <p class="dialog-desc">Choose how much additional time to add:</p>

            <div class="presets-grid-dialog">
              <button type="button" class="preset-dialog-btn" (click)="submitExtend(3600)">+1 hour</button>
              <button type="button" class="preset-dialog-btn" (click)="submitExtend(6 * 3600)">+6 hours</button>
              <button type="button" class="preset-dialog-btn" (click)="submitExtend(86400)">+24 hours</button>
              <button type="button" class="preset-dialog-btn" (click)="submitExtend(7 * 86400)">+7 days</button>
              <button type="button" class="preset-dialog-btn" (click)="submitExtend(30 * 86400)">+30 days</button>
            </div>

            <div class="dialog-actions-row">
              <button type="button" class="dialog-cancel-btn" (click)="extendingTarget.set(null); extendingBatch.set(null)">
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- RENAME MODAL                                                 -->
      <!-- ════════════════════════════════════════════════════════════ -->
      @if (renamingItem(); as target) {
        <div class="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Rename code">
          <div class="dialog-card">
            <h3 class="dialog-title">Rename barcode</h3>
            <input
              type="text"
              class="ts-input-field rename-input"
              [ngModel]="renameValue()"
              (ngModelChange)="renameValue.set($event)"
              maxlength="100"
              placeholder="Barcode name"
            />
            <div class="dialog-actions-row">
              <button type="button" class="dialog-cancel-btn" (click)="renamingItem.set(null)">
                Cancel
              </button>
              <button type="button" class="dialog-confirm-btn" (click)="submitRename(target)">
                Save
              </button>
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

    .temporary-dashboard-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 4px 0 24px;
    }

    /* ── Header Row ─────────────────────────────────────────────── */
    .dashboard-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .header-left-col {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dashboard-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
      line-height: 1.2;
    }
    :host-context([data-theme="light"]) .dashboard-title {
      color: #0F172A;
    }

    .total-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #94a3b8);
      font-size: 11.5px;
      font-weight: 600;
    }
    :host-context([data-theme="light"]) .total-count-badge {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.1);
      color: #475569;
    }

    .summary-chips-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="light"]) .summary-chip {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .summary-chip.is-selected {
      border-color: var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.12);
      color: var(--tool-accent, #3B82F6);
      font-weight: 600;
    }

    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .chip-dot.live-dot {
      background: #10B981;
    }
    .chip-dot.expiring-dot {
      background: #F59E0B;
    }
    .chip-dot.expired-dot {
      background: #EF4444;
    }

    .chip-count {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.85;
    }

    .primary-new-code-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      min-height: 38px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .primary-new-code-btn:hover {
      background: var(--tool-accent-hover, #2563EB);
    }

    /* ── Toolbar Card ───────────────────────────────────────────── */
    .dashboard-toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-wrap: wrap;
    }
    :host-context([data-theme="light"]) .dashboard-toolbar-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1 1 240px;
      min-width: 180px;
    }
    .search-leading-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted, #94a3b8);
      pointer-events: none;
    }
    .search-field {
      width: 100%;
      padding-left: 32px;
      padding-right: 28px;
      height: 36px;
      font-size: 13px;
    }
    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      padding: 2px;
    }

    .filter-controls-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      flex-wrap: wrap;
    }

    .filter-dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 140;
      background: transparent;
    }

    .filter-dropdown {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      z-index: 50;
    }

    .filter-dropdown.is-open {
      z-index: 200;
    }

    .filter-label {
      font-size: 12.5px;
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .filter-label {
      color: #475569;
    }

    .filter-trigger-btn {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      height: 36px;
      padding: 0 10px;
      border-radius: 7px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .filter-trigger-btn {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.14);
      color: #0F172A;
    }

    .filter-trigger-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
    }

    :host-context([data-theme="light"]) .filter-trigger-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
      background: rgba(37, 99, 235, 0.06);
    }

    .filter-active-val {
      font-weight: 600;
    }

    .filter-chevron {
      color: var(--text-muted, #94a3b8);
      transition: transform 0.18s ease;
    }

    .filter-chevron.rotated {
      transform: rotate(180deg);
    }

    .filter-menu-popover {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 210;
      min-width: 145px;
      background: #18181B;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.25);
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-6px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
    }

    .filter-menu-popover.is-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    :host-context([data-theme="light"]) .filter-menu-popover {
      background: #FFFFFF;
      border: 1px solid rgba(15, 23, 42, 0.14);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06);
    }

    .filter-menu-item {
      padding: 7px 10px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      font-weight: 500;
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;
      width: 100%;
      box-sizing: border-box;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .filter-menu-item {
      color: #0F172A;
    }

    .filter-menu-item:hover {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.1)) !important;
      color: var(--tool-accent, #3B82F6) !important;
    }

    :host-context([data-theme="light"]) .filter-menu-item:hover {
      background: rgba(37, 99, 235, 0.08) !important;
      color: #2563EB !important;
    }

    .filter-menu-item.selected {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.14));
      color: var(--tool-accent, #3B82F6);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .filter-menu-item.selected {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
      font-weight: 600;
    }

    .refresh-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="light"]) .refresh-icon-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    /* ── States (Loading / Empty) ────────────────────────────────── */
    .dashboard-state-card,
    .dashboard-empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px 24px;
      border-radius: 12px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      text-align: center;
    }
    :host-context([data-theme="light"]) .dashboard-state-card,
    :host-context([data-theme="light"]) .dashboard-empty-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.1);
      color: var(--tool-accent, #3B82F6);
      margin-bottom: 4px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
    }
    :host-context([data-theme="light"]) .empty-title {
      color: #0F172A;
    }

    .empty-desc {
      font-size: 13px;
      color: var(--text-muted, #94a3b8);
      max-width: 400px;
      margin: 0;
      line-height: 1.4;
    }
    :host-context([data-theme="light"]) .empty-desc {
      color: #64748B;
    }

    .empty-cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF !important;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
    }

    :host-context([data-theme="light"]) .empty-cta-btn {
      background: #2563EB;
      color: #FFFFFF !important;
    }

    .empty-cta-btn:hover {
      background: var(--tool-accent-hover, #2563EB) !important;
      color: #FFFFFF !important;
      opacity: 0.95;
    }

    :host-context([data-theme="light"]) .empty-cta-btn:hover {
      background: #1D4ED8 !important;
      color: #FFFFFF !important;
      opacity: 0.95;
    }

    .empty-cta-btn:active {
      transform: scale(0.98);
    }

    /* ── Table Layout ────────────────────────────────────────────── */
    .table-container-card {
      width: 100%;
      overflow-x: auto;
      border-radius: 12px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }
    :host-context([data-theme="light"]) .table-container-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .dashboard-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .dashboard-table th {
      padding: 10px 14px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      white-space: nowrap;
    }
    :host-context([data-theme="light"]) .dashboard-table th {
      color: #64748B;
      border-bottom-color: rgba(0, 0, 0, 0.08);
      background: #F8FAFC;
    }

    .dashboard-table td {
      padding: 12px 14px;
      font-size: 13px;
      color: var(--text, #fcfcfc);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.04));
      vertical-align: middle;
    }
    :host-context([data-theme="light"]) .dashboard-table td {
      color: #0F172A;
      border-bottom-color: rgba(0, 0, 0, 0.04);
    }

    .dashboard-table th.col-actions {
      text-align: right !important;
      padding-right: 14px;
    }
    .dashboard-table td.col-actions {
      text-align: right !important;
      padding-right: 14px;
    }

    .col-expand { width: 36px; text-align: center; padding-right: 0 !important; }
    .col-name { min-width: 140px; width: 22%; }
    .col-format { width: 100px; }
    .col-payload { max-width: 260px; width: 28%; }
    .col-expiry { width: 140px; }
    .col-status { width: 120px; }
    .col-actions { width: 240px; min-width: 230px; text-align: right; }
    .expand-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .expand-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    :host-context([data-theme="light"]) .expand-toggle-btn:hover {
      background: #F1F5F9;
    }

    .batch-header-row {
      background: rgba(59, 130, 246, 0.03);
    }
    :host-context([data-theme="light"]) .batch-header-row {
      background: rgba(59, 130, 246, 0.02);
    }
    .batch-header-row.is-expanded {
      background: rgba(59, 130, 246, 0.06);
    }

    .batch-name-wrap,
    .single-name-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .batch-folder-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }
    .single-barcode-icon {
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }
    .batch-name-text {
      font-weight: 600;
    }
    .batch-count-pill {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--tool-accent, #3B82F6);
      font-weight: 600;
    }

    .format-cell-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
    }
    .format-launch-icon {
      color: var(--text-muted, #94a3b8);
      opacity: 0.8;
      flex-shrink: 0;
    }
    :host-context([data-theme="light"]) .format-cell-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #334155;
    }
    .format-cell-pill.subtle {
      opacity: 0.8;
      font-size: 10.5px;
    }

    .payload-cell-text {
      display: inline-block;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
    }
    :host-context([data-theme="light"]) .payload-cell-text {
      color: #64748B;
    }

    .expiry-cell-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .expiry-relative-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
    }
    :host-context([data-theme="light"]) .expiry-relative-text {
      color: #0F172A;
    }
    .expiry-date-text,
    .cell-subtext {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
    }
    :host-context([data-theme="light"]) .expiry-date-text,
    :host-context([data-theme="light"]) .cell-subtext {
      color: #64748B;
    }

    .status-cell-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.3s ease, color 0.3s ease;
    }
    .status-cell-badge.mini {
      padding: 1px 6px;
      font-size: 10px;
      border-radius: 6px;
    }
    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    .status-cell-badge[data-status="ACTIVE"] {
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
    }
    .status-cell-badge[data-status="ACTIVE"] .badge-dot {
      background: #10B981;
    }

    .status-cell-badge[data-status="EXPIRING_SOON"] {
      background: rgba(245, 158, 11, 0.12);
      color: #F59E0B;
    }
    .status-cell-badge[data-status="EXPIRING_SOON"] .badge-dot {
      background: #F59E0B;
    }

    .status-cell-badge[data-status="EXPIRED"] {
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
    }
    .status-cell-badge[data-status="EXPIRED"] .badge-dot {
      background: #EF4444;
    }

    .status-cell-badge[data-status="DEACTIVATED"] {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }
    .status-cell-badge[data-status="DEACTIVATED"] .badge-dot {
      background: var(--text-muted, #94a3b8);
    }

    .table-actions-row {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
      flex-wrap: nowrap;
    }

    .action-subtle-btn {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    :host-context([data-theme="light"]) .action-subtle-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #334155;
    }
    .action-subtle-btn:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
    }
    :host-context([data-theme="light"]) .action-subtle-btn:hover {
      background: #F1F5F9;
    }
    .action-subtle-btn.text-danger {
      color: #EF4444;
    }

    .action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .action-icon-btn:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      color: var(--text, #fcfcfc);
    }
    :host-context([data-theme="light"]) .action-icon-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .action-icon-danger-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #ef4444;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    :host-context([data-theme="light"]) .action-icon-danger-btn {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.35);
      color: #dc2626;
    }
    .action-icon-danger-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.6);
      color: #ef4444;
    }
    :host-context([data-theme="light"]) .action-icon-danger-btn:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.65);
      color: #b91c1c;
    }

    .batch-item-sub-row {
      background: var(--bg-base, rgba(0, 0, 0, 0.15));
    }
    :host-context([data-theme="light"]) .batch-item-sub-row {
      background: #FAFAFA;
    }
    .sub-row-num {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    /* ── Mobile Cards Layout (Compact with popovers) ───────────────── */
    .cards-list-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-batch-card,
    .mobile-single-card {
      position: relative;
      border-radius: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 10px 12px;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    :host-context([data-theme="light"]) .mobile-batch-card,
    :host-context([data-theme="light"]) .mobile-single-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .card-main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .card-info-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .card-title-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .card-name {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 170px;
    }
    :host-context([data-theme="light"]) .card-name {
      color: #0F172A;
    }

    .format-cell-pill.mini {
      padding: 1px 5px;
      font-size: 10px;
      line-height: 1.2;
    }

    .card-content-line {
      margin: 0;
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 240px;
    }
    :host-context([data-theme="light"]) .card-content-line {
      color: #64748B;
    }

    .card-meta-line {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      color: var(--text-muted, #94a3b8);
    }
    :host-context([data-theme="light"]) .card-meta-line {
      color: #64748B;
    }

    .meta-label {
      opacity: 0.75;
    }

    .card-right-col {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .countdown-pill {
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 2px 7px;
      border-radius: 6px;
      white-space: nowrap;
    }
    :host-context([data-theme="light"]) .countdown-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .mobile-expand-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    :host-context([data-theme="light"]) .mobile-expand-btn {
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .mobile-actions-anchor {
      position: relative;
    }

    .mobile-more-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="light"]) .mobile-more-btn {
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }
    .mobile-more-btn:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }
    :host-context([data-theme="light"]) .mobile-more-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .mobile-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 250;
      background: transparent;
    }

    .mobile-action-menu-popover {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 260;
      min-width: 155px;
      background: #18181B;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.25);
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: menuPopIn 0.15s ease;
    }
    :host-context([data-theme="light"]) .mobile-action-menu-popover {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.14);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06);
    }

    @keyframes menuPopIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .mobile-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      font-weight: 500;
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.12s ease;
    }
    :host-context([data-theme="light"]) .mobile-menu-item {
      color: #0F172A;
    }
    .mobile-menu-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    :host-context([data-theme="light"]) .mobile-menu-item:hover {
      background: #F1F5F9;
    }
    .mobile-menu-item.text-danger {
      color: #ef4444;
    }
    :host-context([data-theme="light"]) .mobile-menu-item.text-danger {
      color: #dc2626;
    }
    .mobile-menu-item.text-danger:hover {
      background: rgba(239, 68, 68, 0.12);
    }

    .mobile-menu-divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 3px 0;
    }
    :host-context([data-theme="light"]) .mobile-menu-divider {
      background: rgba(0, 0, 0, 0.08);
    }

    .mobile-sub-items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }
    :host-context([data-theme="light"]) .mobile-sub-items-list {
      border-top-color: rgba(0, 0, 0, 0.06);
    }

    .mobile-sub-item-compact-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: var(--bg-surface, #1e1e24);
      border-radius: 6px;
    }
    :host-context([data-theme="light"]) .mobile-sub-item-compact-card {
      background: #F8FAFC;
    }

    .sub-compact-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .sub-idx {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      font-weight: 600;
    }
    .sub-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text, #fcfcfc);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 140px;
    }
    :host-context([data-theme="light"]) .sub-name {
      color: #0F172A;
    }
    .sub-compact-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .mini-icon-btn {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    :host-context([data-theme="light"]) .mini-icon-btn {
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    /* ── Dialog Modals ───────────────────────────────────────────── */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 16px;
    }

    .dialog-card {
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    :host-context([data-theme="light"]) .dialog-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 20px 30px rgba(0, 0, 0, 0.1);
    }

    .dialog-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
    }
    :host-context([data-theme="light"]) .dialog-title {
      color: #0F172A;
    }

    .dialog-desc {
      font-size: 13px;
      color: var(--text-muted, #94a3b8);
      margin: 0;
    }

    .presets-grid-dialog {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .preset-dialog-btn {
      padding: 10px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      background: var(--bg-base, #121216);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    :host-context([data-theme="light"]) .preset-dialog-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.1);
      color: #334155;
    }
    .preset-dialog-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .dialog-actions-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .dialog-cancel-btn {
      padding: 8px 14px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      font-size: 13px;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }
    :host-context([data-theme="light"]) .dialog-cancel-btn {
      border-color: rgba(0, 0, 0, 0.15);
      color: #374151;
    }

    .dialog-confirm-btn {
      padding: 8px 16px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .rename-input {
      padding: 8px 12px;
      font-size: 13.5px;
    }

    .spin-animation {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class BarcodeTemporaryPanelComponent implements OnInit, OnDestroy {
  readonly responsive = inject(ResponsiveService);
  private tempCodeService = inject(TempCodeService);
  private renderService = inject(RenderService);
  private exportService = inject(BarcodeExportService);

  isBarcodeLaunchable(item?: TempCodeRecord | null): boolean {
    if (!item) return false;
    return isLaunchableContent(item.content || item.payload);
  }

  readonly filterBatchId = input<string | null>(null);

  readonly newTemporaryCode = output<void>();

  readonly rawCodes = signal<TempCodeRecord[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly sortFilter = signal<string>('NEWEST');
  readonly copiedId = signal<string | null>(null);

  readonly isStatusDropdownOpen = signal<boolean>(false);
  readonly isSortDropdownOpen = signal<boolean>(false);
  readonly activeMobileMenuId = signal<string | null>(null);

  toggleMobileMenu(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isStatusDropdownOpen.set(false);
    this.isSortDropdownOpen.set(false);
    if (this.activeMobileMenuId() === id) {
      this.activeMobileMenuId.set(null);
    } else {
      this.activeMobileMenuId.set(id);
    }
  }

  closeMobileMenu(): void {
    this.activeMobileMenuId.set(null);
  }

  toggleStatusDropdown(event: Event): void {
    event.stopPropagation();
    this.isSortDropdownOpen.set(false);
    this.activeMobileMenuId.set(null);
    this.isStatusDropdownOpen.update(v => !v);
  }

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.isStatusDropdownOpen.set(false);
    this.activeMobileMenuId.set(null);
    this.isSortDropdownOpen.update(v => !v);
  }

  closeDropdowns(): void {
    this.isStatusDropdownOpen.set(false);
    this.isSortDropdownOpen.set(false);
    this.activeMobileMenuId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdowns();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'EXPIRING_SOON': return 'Expiring soon';
      case 'EXPIRED': return 'Expired';
      case 'DEACTIVATED': return 'Deactivated';
      default: return 'All';
    }
  }

  getSortLabel(sort: string): string {
    switch (sort) {
      case 'EXPIRING_SOON': return 'Expiring soon';
      default: return 'Newest first';
    }
  }

  readonly expandedBatches = signal<Set<string>>(new Set<string>());

  readonly extendingTarget = signal<TempCodeRecord | null>(null);
  readonly extendingBatch = signal<BatchGroup | null>(null);
  readonly renamingItem = signal<TempCodeRecord | null>(null);
  readonly renameValue = signal<string>('');

  private countdownTimer: any;

  ngOnInit(): void {
    if (this.filterBatchId()) {
      this.expandedBatches.update(set => {
        const next = new Set(set);
        next.add(this.filterBatchId()!);
        return next;
      });
    }
    this.loadCodes();

    // 1-second interval to update remaining countdowns and auto-flip expired items
    this.countdownTimer = setInterval(() => {
      this.tickCountdowns();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  loadCodes(): void {
    this.isLoading.set(true);
    this.tempCodeService.listCodes(
      this.searchTerm(),
      this.statusFilter() === 'ALL' ? undefined : this.statusFilter(),
      this.sortFilter()
    ).subscribe({
      next: res => {
        this.rawCodes.set(res.items);
        this.isLoading.set(false);
      },
      error: () => {
        this.rawCodes.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private tickCountdowns(): void {
    const list = this.rawCodes();
    if (!list.length) return;

    let changed = false;
    const now = Date.now();

    const updated = list.map(item => {
      const expMs = new Date(item.expiresAt).getTime();
      const remSec = Math.max(0, Math.floor((expMs - now) / 1000));

      if (remSec === 0 && item.status === 'ACTIVE') {
        changed = true;
        return { ...item, remainingSeconds: 0, status: 'EXPIRED' as TempCodeStatus };
      }
      if (remSec !== item.remainingSeconds) {
        changed = true;
        return { ...item, remainingSeconds: remSec };
      }
      return item;
    });

    if (changed) {
      this.rawCodes.set(updated);
    }
  }

  readonly totalCodesCount = computed<number>(() => this.rawCodes().length);

  readonly activeCount = computed<number>(() => {
    return this.rawCodes().filter(c => c.status === 'ACTIVE').length;
  });

  readonly expiringSoonCount = computed<number>(() => {
    return this.rawCodes().filter(c => c.status === 'EXPIRING_SOON').length;
  });

  readonly expiredCount = computed<number>(() => {
    return this.rawCodes().filter(c => c.status === 'EXPIRED').length;
  });

  readonly entries = computed<DashboardEntry[]>(() => {
    const items = this.rawCodes();
    const batchMap = new Map<string, TempCodeRecord[]>();
    const singles: TempCodeRecord[] = [];

    for (const it of items) {
      if (it.batchId) {
        if (!batchMap.has(it.batchId)) {
          batchMap.set(it.batchId, []);
        }
        batchMap.get(it.batchId)!.push(it);
      } else {
        singles.push(it);
      }
    }

    const result: DashboardEntry[] = [];

    // Add batch groups
    for (const [batchId, bItems] of batchMap.entries()) {
      const first = bItems[0];
      const baseName = first?.name ? first.name.replace(/\s*\d+$/, '') : 'Batch';
      const hasActive = bItems.some(i => i.status === 'ACTIVE');
      const hasExpSoon = bItems.some(i => i.status === 'EXPIRING_SOON');
      const allDeactivated = bItems.every(i => i.status === 'DEACTIVATED');

      let batchStatus: TempCodeStatus = 'EXPIRED';
      if (hasActive) batchStatus = 'ACTIVE';
      else if (hasExpSoon) batchStatus = 'EXPIRING_SOON';
      else if (allDeactivated) batchStatus = 'DEACTIVATED';

      const minRem = Math.min(...bItems.map(i => i.remainingSeconds));

      result.push({
        kind: 'batch',
        batch: {
          batchId,
          name: `${baseName}`,
          count: bItems.length,
          items: bItems,
          status: batchStatus,
          expiresAt: first?.expiresAt || new Date().toISOString(),
          remainingSeconds: minRem >= 0 ? minRem : 0,
          isExpanded: this.expandedBatches().has(batchId)
        }
      });
    }

    // Add single items
    for (const single of singles) {
      result.push({
        kind: 'single',
        item: single
      });
    }

    return result;
  });

  entryKey(entry: DashboardEntry): string {
    return entry.kind === 'batch' ? `batch-${entry.batch.batchId}` : `single-${entry.item.id}`;
  }

  toggleBatchExpand(batchId: string): void {
    this.expandedBatches.update(set => {
      const next = new Set(set);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.loadCodes();
  }

  onStatusSelect(status: string): void {
    this.statusFilter.set(status);
    this.loadCodes();
  }

  onSortChange(sort: string): void {
    this.sortFilter.set(sort);
    this.loadCodes();
  }

  resolveVerifyUrl(rawUrl?: string): string {
    if (!rawUrl) return '';
    try {
      if (typeof window !== 'undefined' && rawUrl.includes('/v/')) {
        const token = rawUrl.substring(rawUrl.indexOf('/v/'));
        return `${window.location.origin}${token}`;
      }
    } catch {}
    return rawUrl;
  }

  onCopyLink(item: TempCodeRecord): void {
    const rawVerify = item.verifyUrl ? this.resolveVerifyUrl(item.verifyUrl) : '';
    const textToCopy = item.payloadMode === 'LINK' ? rawVerify : item.token;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      this.copiedId.set(item.id);
      setTimeout(() => this.copiedId.set(null), 1500);
    }
  }

  onOpenCheckPage(item: TempCodeRecord): void {
    if (typeof window !== 'undefined') {
      const url = this.resolveVerifyUrl(item.verifyUrl);
      window.open(url, '_blank');
    }
  }

  async onDownloadBarcode(item: TempCodeRecord): Promise<void> {
    const catItem = BARCODE_CATALOG[item.barcodeFormat] || BARCODE_CATALOG['qrcode'];
    try {
      const renderRes = await this.renderService.render(
        catItem,
        item.payload,
        item.payload,
        DEFAULT_DESIGN_OPTIONS
      );
      if (renderRes.svg) {
        this.exportService.downloadSvg(renderRes.svg, item.name || 'temporary-barcode', item.barcodeFormat as any);
      }
    } catch (e) {
      console.error('Failed to render barcode for download', e);
    }
  }

  openExtendModal(item: TempCodeRecord): void {
    this.extendingBatch.set(null);
    this.extendingTarget.set(item);
  }

  openBatchExtendModal(batch: BatchGroup): void {
    this.extendingBatch.set(batch);
    this.extendingTarget.set(batch.items[0]);
  }

  submitExtend(seconds: number): void {
    const batch = this.extendingBatch();
    const item = this.extendingTarget();

    if (batch) {
      this.tempCodeService.updateBatch(batch.batchId, {
        action: 'extend',
        extensionSeconds: seconds
      }).subscribe({
        next: () => {
          this.extendingTarget.set(null);
          this.extendingBatch.set(null);
          this.loadCodes();
        }
      });
    } else if (item) {
      this.tempCodeService.updateCode(item.id, {
        action: 'extend',
        extensionSeconds: seconds
      }).subscribe({
        next: () => {
          this.extendingTarget.set(null);
          this.loadCodes();
        }
      });
    }
  }

  onExpireNow(item: TempCodeRecord): void {
    this.tempCodeService.updateCode(item.id, {
      action: 'expireNow'
    }).subscribe({
      next: () => this.loadCodes()
    });
  }

  onBatchExpireNow(batch: BatchGroup): void {
    this.tempCodeService.updateBatch(batch.batchId, {
      action: 'expireNow'
    }).subscribe({
      next: () => this.loadCodes()
    });
  }

  openRenameModal(item: TempCodeRecord): void {
    this.renameValue.set(item.name);
    this.renamingItem.set(item);
  }

  submitRename(item: TempCodeRecord): void {
    const newName = this.renameValue().trim();
    if (!newName) return;
    this.tempCodeService.updateCode(item.id, {
      action: 'rename',
      name: newName
    }).subscribe({
      next: () => {
        this.renamingItem.set(null);
        this.loadCodes();
      }
    });
  }

  onDelete(item: TempCodeRecord): void {
    this.tempCodeService.deleteCode(item.id).subscribe({
      next: () => this.loadCodes()
    });
  }

  onBatchDelete(batch: BatchGroup): void {
    this.tempCodeService.deleteBatch(batch.batchId).subscribe({
      next: () => this.loadCodes()
    });
  }

  async onBatchDownload(batch: BatchGroup): Promise<void> {
    const zip = new JSZip();
    for (const it of batch.items) {
      try {
        const catItem = BARCODE_CATALOG[it.barcodeFormat] || BARCODE_CATALOG['qrcode'];
        const renderRes = await this.renderService.render(catItem, it.payload, it.payload, DEFAULT_DESIGN_OPTIONS);
        if (renderRes.svg) {
          zip.file(`${it.name || it.token}.svg`, renderRes.svg);
        }
      } catch {
        // Continue with other items
      }
    }

    // Include manifest.csv
    const header = 'Index,Name,Value,Token,Check Link,Expires At (UTC),File Name,Status\n';
    const lines = batch.items
      .map((it, i) => `${i + 1},"${it.name}","${it.content || ''}","${it.token}","${it.verifyUrl}","${it.expiresAt}","${it.name}.svg","${it.status}"`)
      .join('\n');
    zip.file('manifest.csv', header + lines);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.name || 'batch'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getFormatLabel(formatId: string): string {
    const map: Record<string, string> = {
      qrcode: 'QR Code',
      datamatrix: 'Data Matrix',
      aztec: 'Aztec',
      pdf417: 'PDF417',
      code128: 'Code 128'
    };
    return map[formatId] || (formatId ? formatId.toUpperCase() : 'Barcode');
  }

  formatStatusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'EXPIRING_SOON') return 'Expiring soon';
    if (status === 'EXPIRED') return 'Expired';
    if (status === 'DEACTIVATED') return 'Deactivated';
    return status;
  }

  formatCountdown(seconds: number): string {
    if (seconds <= 0) return 'Expired';
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    const remMin = min % 60;
    if (hrs < 24) return remMin > 0 ? `${hrs}h ${remMin}m` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  formatExpiryDate(isoDate: string): string {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }
}
