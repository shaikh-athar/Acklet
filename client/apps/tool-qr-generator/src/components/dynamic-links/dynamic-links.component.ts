// client/apps/tool-qr-generator/src/components/dynamic-links/dynamic-links.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  OnInit,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { SmartLinkService, LiveSmartLink } from '../../services/smart-link.service';
import { QrDynamicService } from '../../services/qr-dynamic.service';
import { QrSelectComponent, QrSelectOption } from '../qr-select/qr-select.component';

@Component({
  selector: 'app-dynamic-links',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, QrSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dynamic-links-container" aria-label="Dynamic QR Links Studio">
      <!-- Section Header (Pinned at top of card) -->
      <header class="dynamic-header">
        <div class="header-titles">
          <div class="header-badge-row">
            <span class="header-icon-badge">
              <ts-icon name="graph-star" [size]="16" />
            </span>
            <h2 class="header-title">Dynamic QR Links</h2>
            <span class="count-pill">{{ filteredLinks().length }}</span>
          </div>
          <p class="header-subtitle">
            Update destination content anytime without re-printing. Track real-time scan analytics.
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="refresh-btn"
            [disabled]="smartLinkService.isFetchingSummaries()"
            (click)="refreshSummaries()"
            title="Refresh scan counts and status"
            aria-label="Refresh scan counts"
          >
            <ts-icon name="refresh-cw" [size]="14" [class.spinning]="smartLinkService.isFetchingSummaries()" />
            <span class="refresh-text">Refresh</span>
          </button>
          <button
            type="button"
            class="btn-new-dynamic"
            (click)="toggleCreatePanel()"
            title="Create a new dynamic QR code directly"
          >
            <ts-icon name="plus" [size]="14" />
            <span>New Dynamic QR</span>
          </button>
        </div>
      </header>

      <!-- Scrollable Studio Body -->
      <div class="dynamic-body custom-scrollbar">
        <!-- Offline Notice Banner -->
        @if (smartLinkService.isOffline()) {
          <div class="offline-alert" role="alert">
            <ts-icon name="circle-alert" [size]="16" class="alert-icon" />
            <div class="alert-body">
              <strong>Offline Mode</strong>: Displaying cached links from this device. Live scan stats will sync once connected.
            </div>
          </div>
        }

        <!-- Toast Feedback Message -->
        @if (toastMessage()) {
          <div class="toast-banner slide-fade-up" [class.toast-error]="toastType() === 'error'" role="status">
            <ts-icon [name]="toastType() === 'error' ? 'alert-triangle' : 'check-circle'" [size]="16" class="toast-icon" />
            <span>{{ toastMessage() }}</span>
          </div>
        }

        <!-- Inline Create Dynamic QR Card (Third Image Layout) -->
        @if (isCreateOpen()) {
          <div class="create-inline-box slide-fade-down">
            <div class="dynamic-box-header">
              <div class="dynamic-box-title">
                <ts-icon name="graph-star" [size]="18" class="dyn-icon" />
                <div>
                  <h4 class="dyn-heading">Convert to Hosted Dynamic QR</h4>
                  <p class="dyn-desc">Edit destination anytime without reprinting + privacy-friendly scan analytics.</p>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-inline-create"
                (click)="isCreateOpen.set(false)"
                aria-label="Close form"
              >
                <ts-icon name="x" [size]="16" />
              </button>
            </div>

            <div class="dynamic-fields-grid">
              <div class="qr-form-row full-width">
                <label for="create-dest-url" class="qr-sub-label">Destination URL <span class="req">*</span></label>
                <input
                  id="create-dest-url"
                  type="url"
                  class="qr-input"
                  placeholder="https://example.com/promo"
                  [value]="createUrl()"
                  (input)="createUrl.set($any($event.target).value)"
                  (keydown.enter)="handleInlineCreate()"
                />
              </div>
            </div>

            <div class="dynamic-fields-grid">
              <div class="qr-form-row">
                <label for="create-title" class="qr-sub-label">Campaign Title (optional)</label>
                <input
                  id="create-title"
                  type="text"
                  class="qr-input"
                  placeholder="e.g. Summer Promo 2026"
                  [value]="createTitle()"
                  (input)="createTitle.set($any($event.target).value)"
                  (keydown.enter)="handleInlineCreate()"
                />
              </div>
              <div class="qr-form-row">
                <label for="create-slug" class="qr-sub-label">Custom Slug (optional)</label>
                <input
                  id="create-slug"
                  type="text"
                  class="qr-input"
                  placeholder="e.g. summer-promo"
                  [value]="createSlug()"
                  (input)="createSlug.set($any($event.target).value)"
                  (keydown.enter)="handleInlineCreate()"
                />
              </div>
            </div>

            <div class="dynamic-fields-grid">
              <div class="qr-form-row">
                <label for="create-pass" class="qr-sub-label">PIN / Password Protection (optional)</label>
                <input
                  id="create-pass"
                  type="password"
                  class="qr-input"
                  placeholder="Leave blank for public redirect"
                  [value]="createPassword()"
                  (input)="createPassword.set($any($event.target).value)"
                  (keydown.enter)="handleInlineCreate()"
                />
              </div>
            </div>

            @if (createError()) {
              <p class="dyn-error">{{ createError() }}</p>
            }

            <div class="dynamic-action-row">
              <button
                type="button"
                class="btn-create-dynamic"
                [disabled]="!createUrl().trim() || isSubmittingCreate()"
                (click)="handleInlineCreate()"
              >
                <ts-icon name="plus" />
                <span>{{ isSubmittingCreate() ? 'Creating Shortlink...' : 'Create Dynamic QR Shortlink' }}</span>
              </button>
              <button
                type="button"
                class="btn-cancel-create"
                (click)="isCreateOpen.set(false)"
              >
                Cancel
              </button>
            </div>
          </div>
        }

        <!-- Search & Filter Toolbar -->
        <div class="toolbar-card">
          <!-- Search Field -->
          <div class="search-box">
            <ts-icon name="search" class="search-icon" [size]="16" />
            <input
              type="text"
              class="search-input"
              placeholder="Search by code, URL, or content..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              aria-label="Search dynamic links"
            />
            @if (searchQuery()) {
              <button
                type="button"
                class="clear-search-btn"
                (click)="searchQuery.set('')"
                aria-label="Clear search input"
              >
                <ts-icon name="x" [size]="14" />
              </button>
            }
          </div>

          <!-- Filter Controls -->
          <div class="filter-controls">
            <!-- Type Filter -->
            <div class="filter-group">
              <label for="typeFilterSelect" class="filter-label">Type:</label>
              <div class="filter-select-wrapper type-filter-select">
                <app-qr-select
                  id="typeFilterSelect"
                  [options]="typeFilterOptions"
                  [value]="typeFilter()"
                  (valueChange)="typeFilter.set($event)"
                  ariaLabel="Filter by content type"
                />
              </div>
            </div>

            <!-- Status Filter -->
            <div class="filter-group">
              <label for="statusFilterSelect" class="filter-label">Status:</label>
              <div class="filter-select-wrapper status-filter-select">
                <app-qr-select
                  id="statusFilterSelect"
                  [options]="statusFilterOptions"
                  [value]="statusFilter()"
                  (valueChange)="statusFilter.set($event)"
                  ariaLabel="Filter by link status"
                />
              </div>
            </div>

            <!-- Sort Select -->
            <div class="filter-group">
              <label for="sortBySelect" class="filter-label">Sort:</label>
              <div class="filter-select-wrapper sort-filter-select">
                <app-qr-select
                  id="sortBySelect"
                  [options]="sortByOptions"
                  [value]="sortBy()"
                  (valueChange)="sortBy.set($event)"
                  ariaLabel="Sort dynamic links"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <!-- Skeletons State during initial load -->
        @if (smartLinkService.isFetchingSummaries() && smartLinkService.managedLinks().length === 0) {
          <div class="skeletons-wrapper" aria-busy="true" aria-label="Loading dynamic links">
            @for (item of [1, 2, 3]; track item) {
              <div class="skeleton-card">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-subtitle"></div>
              <div class="skeleton-line skeleton-meta"></div>
            </div>
          }
        </div>
      } @else if (filteredLinks().length === 0) {
        <!-- Empty State -->
        <div class="empty-state-card slide-fade-up">
          <div class="empty-icon-wrap">
            <ts-icon name="qr-code" [size]="32" class="empty-icon" />
          </div>
          @if (searchQuery() || typeFilter() !== 'ALL' || statusFilter() !== 'ALL') {
            <h3 class="empty-title">No matching dynamic links</h3>
            <p class="empty-desc">No dynamic links matched your active filters or search terms.</p>
            <button type="button" class="empty-btn secondary" (click)="resetFilters()">
              <ts-icon name="refresh-cw" [size]="14" />
              <span>Clear Filters</span>
            </button>
          } @else {
            <h3 class="empty-title">No dynamic QR links yet</h3>
            <p class="empty-desc">
              Dynamic links allow you to change your QR destination anytime after printing, and track scan counts automatically.
            </p>
            <button type="button" class="empty-btn primary" (click)="isCreateOpen.set(true)">
              <ts-icon name="plus" [size]="14" />
              <span>Create Your First Dynamic QR</span>
            </button>
          }
        </div>
      } @else {
        <!-- Desktop Table View (>= 768px) -->
        <div class="table-responsive-container desktop-table-view">
          <table class="dynamic-table" role="table" aria-label="Dynamic QR links list">
            <thead>
              <tr>
                <th scope="col" class="th-link">Short Link</th>
                <th scope="col" class="th-content">Destination Content</th>
                <th scope="col" class="th-metrics">Scans</th>
                <th scope="col" class="th-status">Status & Retention</th>
                <th scope="col" class="th-actions text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (link of filteredLinks(); track link.code) {
                <tr class="table-row" [class.disabled-row]="link.status === 'DISABLED'">
                  <!-- Short Link Column -->
                  <td class="td-link">
                    <div class="short-link-cell">
                      <span class="code-pill">{{ link.code }}</span>
                      <a
                        [href]="link.shortUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="short-url-link"
                        title="Open destination in new tab"
                      >
                        <span>{{ link.shortUrl }}</span>
                        <ts-icon name="external-link" [size]="12" class="ext-icon" />
                      </a>
                      <button
                        type="button"
                        class="copy-chip-btn"
                        [class.copied]="copiedCode() === link.code"
                        (click)="copyShortUrl(link.shortUrl, link.code)"
                        [title]="copiedCode() === link.code ? 'Copied to clipboard!' : 'Copy short link'"
                      >
                        <ts-icon [name]="copiedCode() === link.code ? 'check' : 'copy'" [size]="13" />
                        <span>{{ copiedCode() === link.code ? 'Copied' : 'Copy' }}</span>
                      </button>
                    </div>
                  </td>

                  <!-- Type & Preview Column -->
                  <td class="td-content">
                    <div class="content-cell">
                      <div class="content-header-row">
                        <span class="type-pill" [attr.data-type]="link.type.toLowerCase()">
                          <ts-icon [name]="getTypeIcon(link.type)" [size]="12" />
                          <span>{{ formatTypeLabel(link.type) }}</span>
                        </span>
                        @if (link.contentBytes) {
                          <span class="bytes-tag">{{ link.contentBytes }} bytes</span>
                        }
                      </div>
                      <p class="preview-text" [title]="link.preview || 'No preview available'">
                        {{ link.preview || '(empty)' }}
                      </p>
                    </div>
                  </td>

                  <!-- Scans & Metrics Column -->
                  <td class="td-metrics">
                    <div class="metrics-cell">
                      <div class="scan-count-badge" title="Total scans tracked">
                        <ts-icon name="zap" [size]="13" class="zap-icon" />
                        <strong>{{ link.scanCount }}</strong>
                        <span class="scans-label">{{ link.scanCount === 1 ? 'scan' : 'scans' }}</span>
                      </div>
                      <div class="timestamp-subtext">
                        @if (link.lastScanAt) {
                          <span>Last: {{ formatDate(link.lastScanAt) }}</span>
                        } @else {
                          <span class="no-scans-text">Never scanned</span>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Status & Expiry Column -->
                  <td class="td-status">
                    <div class="status-cell">
                      <span class="status-pill" [attr.data-status]="link.status">
                        <span class="status-dot"></span>
                        <span>{{ link.status }}</span>
                      </span>
                      <div class="expiry-subtext" [title]="link.expiresAt ? 'Expires ' + formatDate(link.expiresAt) : ''">
                        {{ formatExpiry(link.expiresAt) }}
                      </div>
                    </div>
                  </td>

                  <!-- Actions Column -->
                  <td class="td-actions text-right">
                    <div class="actions-cell">
                      @if (deletingCode() === link.code) {
                        <div class="inline-confirm-delete">
                          <button
                            type="button"
                            class="confirm-del-btn"
                            (click)="executeDelete(link.code)"
                            title="Confirm permanent deletion"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            class="cancel-del-btn"
                            (click)="deletingCode.set(null)"
                            title="Cancel deletion"
                          >
                            Cancel
                          </button>
                        </div>
                      } @else {
                        <!-- Open in Studio Button -->
                        <button
                          type="button"
                          class="action-icon-btn highlight"
                          (click)="onOpenInGenerator(link)"
                          title="Load into Studio to customize design or edit content"
                          aria-label="Load into studio"
                        >
                          <ts-icon name="palette" [size]="14" />
                          <span class="action-btn-text">Studio</span>
                        </button>

                        <!-- More Actions Dropdown -->
                        <div class="more-actions-wrapper">
                          <button
                            type="button"
                            class="action-icon-btn more-actions-trigger"
                            [class.active]="activeDropdownCode() === link.code"
                            (click)="toggleMoreMenu(link.code, $event)"
                            title="More actions"
                            aria-label="More actions"
                            [attr.aria-expanded]="activeDropdownCode() === link.code"
                          >
                            <ts-icon name="more-horizontal" [size]="15" />
                          </button>

                          @if (activeDropdownCode() === link.code) {
                            <div
                              class="more-dropdown-menu slide-fade-up"
                              [class.drop-up]="isDropdownUp()"
                              (click)="$event.stopPropagation()"
                            >
                              <!-- Quick Edit Destination -->
                              <button
                                type="button"
                                class="dropdown-item"
                                (click)="startEdit(link); closeMoreMenu()"
                                role="menuitem"
                              >
                                <ts-icon name="pencil" [size]="14" />
                                <span>Edit Destination</span>
                              </button>

                              <!-- Preview QR -->
                              <button
                                type="button"
                                class="dropdown-item"
                                (click)="previewQr.emit(link.shortUrl); closeMoreMenu()"
                                role="menuitem"
                              >
                                <ts-icon name="eye" [size]="14" />
                                <span>Preview QR Code</span>
                              </button>

                              <!-- Extend Expiry (+1 yr) -->
                              <button
                                type="button"
                                class="dropdown-item"
                                [disabled]="link.isExtending"
                                (click)="extendLink(link); closeMoreMenu()"
                                role="menuitem"
                              >
                                <ts-icon
                                  [name]="link.isExtending ? 'refresh-cw' : 'clock'"
                                  [size]="14"
                                  [class.spinning]="link.isExtending"
                                />
                                <span>Extend Retention (+1 yr)</span>
                              </button>

                              <!-- Pause / Resume -->
                              <button
                                type="button"
                                class="dropdown-item"
                                [disabled]="link.isToggling"
                                (click)="toggleStatus(link); closeMoreMenu()"
                                role="menuitem"
                              >
                                <ts-icon
                                  [name]="link.status === 'ACTIVE' ? 'unlink' : 'link'"
                                  [size]="14"
                                />
                                <span>{{ link.status === 'ACTIVE' ? 'Pause Link (410)' : 'Resume Link (Active)' }}</span>
                              </button>

                              <div class="dropdown-divider"></div>

                              <!-- Delete Link -->
                              <button
                                type="button"
                                class="dropdown-item danger"
                                (click)="deletingCode.set(link.code); closeMoreMenu()"
                                role="menuitem"
                              >
                                <ts-icon name="trash-2" [size]="14" />
                                <span>Delete Dynamic QR</span>
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Stacked Card View (< 768px) -->
        <div class="mobile-cards-view">
          @for (link of filteredLinks(); track link.code) {
            <article class="mobile-link-card" [class.disabled-card]="link.status === 'DISABLED'">
              <!-- Top Row: Type & Status Badges -->
              <div class="mcard-header">
                <div class="mcard-type">
                  <span class="type-pill" [attr.data-type]="link.type.toLowerCase()">
                    <ts-icon [name]="getTypeIcon(link.type)" [size]="12" />
                    <span>{{ formatTypeLabel(link.type) }}</span>
                  </span>
                  <span class="code-pill">{{ link.code }}</span>
                </div>
                <div class="mcard-status">
                  <span class="status-pill" [attr.data-status]="link.status">
                    <span class="status-dot"></span>
                    <span>{{ link.status }}</span>
                  </span>
                </div>
              </div>

              <!-- Short URL Row -->
              <div class="mcard-url-row">
                <a [href]="link.shortUrl" target="_blank" rel="noopener noreferrer" class="mcard-short-url">
                  <span>{{ link.shortUrl }}</span>
                  <ts-icon name="external-link" [size]="12" />
                </a>
                <button
                  type="button"
                  class="copy-chip-btn"
                  [class.copied]="copiedCode() === link.code"
                  (click)="copyShortUrl(link.shortUrl, link.code)"
                >
                  <ts-icon [name]="copiedCode() === link.code ? 'check' : 'copy'" [size]="13" />
                  <span>{{ copiedCode() === link.code ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>

              <!-- Destination Preview -->
              <div class="mcard-preview-box">
                <span class="preview-label">Target:</span>
                <span class="preview-val">{{ link.preview || '(empty)' }}</span>
              </div>

              <!-- Metrics & Expiry Row -->
              <div class="mcard-meta-row">
                <div class="scan-count-badge">
                  <ts-icon name="zap" [size]="13" class="zap-icon" />
                  <strong>{{ link.scanCount }}</strong>
                  <span class="scans-label">{{ link.scanCount === 1 ? 'scan' : 'scans' }}</span>
                </div>
                <div class="mcard-expiry">{{ formatExpiry(link.expiresAt) }}</div>
              </div>

              <!-- Action Buttons Row -->
              <div class="mcard-actions">
                @if (deletingCode() === link.code) {
                  <button type="button" class="mcard-action-btn danger-confirm" (click)="executeDelete(link.code)">
                    Confirm Delete
                  </button>
                  <button type="button" class="mcard-action-btn" (click)="deletingCode.set(null)">
                    Cancel
                  </button>
                } @else {
                  <button
                    type="button"
                    class="mcard-action-btn primary"
                    (click)="onOpenInGenerator(link)"
                  >
                    <ts-icon name="palette" [size]="14" />
                    <span>Studio</span>
                  </button>

                  <div class="more-actions-wrapper">
                    <button
                      type="button"
                      class="mcard-action-btn"
                      [class.active]="activeDropdownCode() === link.code"
                      (click)="toggleMoreMenu(link.code, $event)"
                      title="More actions"
                      aria-label="More actions"
                    >
                      <ts-icon name="more-horizontal" [size]="14" />
                      <span>More</span>
                    </button>

                    @if (activeDropdownCode() === link.code) {
                      <div
                        class="more-dropdown-menu slide-fade-up"
                        [class.drop-up]="isDropdownUp()"
                        (click)="$event.stopPropagation()"
                      >
                        <button
                          type="button"
                          class="dropdown-item"
                          (click)="startEdit(link); closeMoreMenu()"
                        >
                          <ts-icon name="pencil" [size]="14" />
                          <span>Edit Destination</span>
                        </button>
                        <button
                          type="button"
                          class="dropdown-item"
                          (click)="previewQr.emit(link.shortUrl); closeMoreMenu()"
                        >
                          <ts-icon name="eye" [size]="14" />
                          <span>Preview QR Code</span>
                        </button>
                        <button
                          type="button"
                          class="dropdown-item"
                          [disabled]="link.isExtending"
                          (click)="extendLink(link); closeMoreMenu()"
                        >
                          <ts-icon
                            [name]="link.isExtending ? 'refresh-cw' : 'clock'"
                            [size]="14"
                            [class.spinning]="link.isExtending"
                          />
                          <span>Extend Retention (+1 yr)</span>
                        </button>
                        <button
                          type="button"
                          class="dropdown-item"
                          (click)="toggleStatus(link); closeMoreMenu()"
                        >
                          <ts-icon [name]="link.status === 'ACTIVE' ? 'unlink' : 'link'" [size]="14" />
                          <span>{{ link.status === 'ACTIVE' ? 'Pause Link (410)' : 'Resume Link (Active)' }}</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <button
                          type="button"
                          class="dropdown-item danger"
                          (click)="deletingCode.set(link.code); closeMoreMenu()"
                        >
                          <ts-icon name="trash-2" [size]="14" />
                          <span>Delete Dynamic QR</span>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </article>
          }
        </div>
      }
      </div>

      <!-- Inline Destination Edit Modal -->
      @if (editingLink()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="edit-modal-card slide-fade-up" (click)="$event.stopPropagation()" role="dialog" aria-label="Edit destination content">
            <header class="edit-modal-header">
              <div class="edit-modal-title-row">
                <ts-icon name="pencil" [size]="18" class="edit-header-icon" />
                <div>
                  <h3 class="edit-modal-title">Edit Dynamic Destination</h3>
                  <p class="edit-modal-subtitle">
                    The QR code image stays identical. Changing this payload updates what scanners see.
                  </p>
                </div>
              </div>
              <button type="button" class="close-modal-btn" (click)="closeEditModal()" aria-label="Close edit dialog">
                <ts-icon name="x" [size]="18" />
              </button>
            </header>

            <div class="edit-modal-body">
              <div class="immutable-link-row">
                <span class="immutable-label">Short Link (Locked):</span>
                <span class="immutable-url">{{ editingLink()?.shortUrl }}</span>
              </div>

              <div class="form-group">
                <label for="editPayloadInput" class="input-label">
                  Destination Payload ({{ formatTypeLabel(editingLink()?.type || 'URL') }}):
                </label>
                <textarea
                  id="editPayloadInput"
                  class="payload-textarea"
                  dir="auto"
                  rows="5"
                  [ngModel]="editPayload()"
                  (ngModelChange)="editPayload.set($event)"
                  placeholder="Enter new destination URL or text..."
                  autofocus
                ></textarea>

                <div class="textarea-footer">
                  <span class="char-counter">{{ editPayload().length }} characters</span>
                  @if (editError()) {
                    <span class="edit-error">{{ editError() }}</span>
                  }
                </div>
              </div>
            </div>

            <footer class="edit-modal-footer">
              <button type="button" class="btn-cancel" (click)="closeEditModal()" [disabled]="isSavingEdit()">
                Cancel
              </button>
              <button
                type="button"
                class="btn-save-edit"
                (click)="saveEdit()"
                [disabled]="isSavingEdit() || !editPayload().trim()"
              >
                @if (isSavingEdit()) {
                  <ts-icon name="refresh-cw" [size]="14" class="spinning" />
                  <span>Saving...</span>
                } @else {
                  <ts-icon name="check" [size]="14" />
                  <span>Save Changes</span>
                }
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
    }

    .dynamic-links-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      overflow: hidden;
      background: transparent;
    }

    /* Pinned Card Header */
    .dynamic-header {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--surface-base, #0B1120);
      z-index: 10;
    }

    :host-context([data-theme="light"]) .dynamic-header,
    [data-theme="light"] .dynamic-header {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    .dynamic-body {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--tool-accent-soft, color-mix(in srgb, var(--accent, #3b82f6) 12%, transparent));
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .header-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--ts-text, #0f172a);
      letter-spacing: -0.01em;
    }

    .count-pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--ts-border, #e2e8f0);
      color: var(--ts-text-muted, #64748b);
    }

    .header-subtitle {
      margin: 0;
      font-size: 0.84rem;
      color: var(--ts-text-muted, #64748b);
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-raised, #ffffff);
      color: var(--ts-text, #1e293b);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: var(--ts-border, #f1f5f9);
      border-color: var(--ts-text-muted, #94a3b8);
    }

    .refresh-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-new-dynamic {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid #2563eb;
      background: #2563eb;
      color: #ffffff !important;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .btn-new-dynamic:hover {
      background: #1d4ed8 !important;
      border-color: #1d4ed8 !important;
      color: #ffffff !important;
      opacity: 1 !important;
      visibility: visible !important;
      filter: none;
      transform: translateY(-0.5px);
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
    }

    /* Offline Alert */
    .offline-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--warning-soft, color-mix(in srgb, #f59e0b 14%, transparent));
      border: 1px solid var(--warning-border, color-mix(in srgb, #f59e0b 35%, transparent));
      color: var(--ts-text, #1e293b);
      font-size: 0.84rem;
    }

    .alert-icon {
      color: var(--warning, #d97706);
      flex-shrink: 0;
    }

    /* Toast Banner */
    .toast-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: 8px;
      background: var(--success-soft, color-mix(in srgb, #10b981 12%, transparent));
      border: 1px solid var(--success-border, color-mix(in srgb, #10b981 30%, transparent));
      color: var(--ts-text, #065f46);
      font-size: 0.84rem;
      font-weight: 500;
    }

    .toast-banner.toast-error {
      background: var(--error-soft, color-mix(in srgb, #ef4444 12%, transparent));
      border-color: var(--error-border, color-mix(in srgb, #ef4444 30%, transparent));
      color: var(--error-text, #991b1b);
    }

    .toast-icon {
      color: var(--success, #059669);
    }

    .toast-banner.toast-error .toast-icon {
      color: var(--error, #ef4444);
    }

    /* Toolbar Card */
    .toolbar-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .toolbar-card,
    [data-theme="light"] .toolbar-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 11px;
      color: var(--ts-text-muted, #94a3b8);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 2.375rem;
      padding: 0 32px 0 34px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      background: var(--surface-1, #16233D);
      color: var(--text-primary, #fcfcfc);
      font-size: 0.84rem;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .search-input,
    [data-theme="light"] .search-input {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .search-input:focus {
      border-color: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #3b82f6) 20%, transparent);
    }

    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--ts-text-muted, #94a3b8);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .clear-search-btn:hover {
      color: var(--ts-text, #0f172a);
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 180px;
      min-width: 160px;
    }

    .filter-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ts-text-muted, #64748b);
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .filter-label,
    [data-theme="light"] .filter-label {
      color: #64748B;
    }

    .filter-select-wrapper {
      position: relative;
      flex: 1;
      width: 100%;
    }

    .type-filter-select,
    .status-filter-select,
    .sort-filter-select {
      flex: 1;
      width: 100%;
      min-width: 150px;
    }

    /* Skeleton Loading Rows */
    .skeletons-wrapper {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-card {
      padding: 16px;
      border-radius: 10px;
      background: var(--ts-surface-raised, #ffffff);
      border: 1px solid var(--ts-border, #e2e8f0);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      border-radius: 4px;
      background: linear-gradient(90deg, var(--ts-border, #e2e8f0) 25%, var(--ts-bg, #f1f5f9) 50%, var(--ts-border, #e2e8f0) 75%);
      background-size: 200% 100%;
      animation: skeleton-pulse 1.5s infinite;
    }

    .skeleton-title {
      width: 40%;
      height: 16px;
    }

    .skeleton-subtitle {
      width: 75%;
      height: 12px;
    }

    .skeleton-meta {
      width: 25%;
      height: 10px;
    }

    @keyframes skeleton-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Empty State */
    .empty-state-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.02));
      border: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.12));
      gap: 14px;
      margin: auto 0;
    }

    :host-context([data-theme="light"]) .empty-state-card,
    [data-theme="light"] .empty-state-card {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: color-mix(in srgb, var(--accent, #3b82f6) 10%, transparent);
      color: var(--accent, #3b82f6);
    }

    .empty-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ts-text, #0f172a);
    }

    .empty-desc {
      margin: 0;
      max-width: 420px;
      font-size: 0.85rem;
      color: var(--ts-text-muted, #64748b);
      line-height: 1.45;
    }

    .empty-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .empty-btn.primary {
      background: var(--tool-accent, #2563eb);
      color: #ffffff !important;
      border: 1px solid var(--tool-accent, #2563eb);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .empty-btn.primary:hover {
      background: color-mix(in srgb, var(--tool-accent, #2563eb) 85%, #000) !important;
      border-color: color-mix(in srgb, var(--tool-accent, #2563eb) 85%, #000) !important;
      color: #ffffff !important;
    }

    .empty-btn.secondary {
      background: var(--ts-surface-raised, #ffffff);
      border: 1px solid var(--ts-border, #cbd5e1);
      color: var(--ts-text, #1e293b);
    }

    .empty-btn.secondary:hover {
      background: var(--ts-border, #f1f5f9);
    }

    /* Desktop Table Layout */
    .table-responsive-container {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      border-radius: 10px;
      background: var(--surface-1, #ffffff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      box-sizing: border-box;
      flex: 1 1 0%;
      min-height: 280px;
      display: flex;
      flex-direction: column;
    }

    :host-context([data-theme="dark"]) .table-responsive-container,
    [data-theme="dark"] .table-responsive-container {
      background: var(--surface-base, #0b1120);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .dynamic-table {
      width: 100%;
      min-width: 540px;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.82rem;
    }

    .dynamic-table thead th {
      padding: 9px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ts-text-muted, #64748b);
      border-bottom: 1px solid var(--ts-border, #e2e8f0);
      background: var(--surface-1, #ffffff);
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    :host-context([data-theme="dark"]) .dynamic-table thead th,
    [data-theme="dark"] .dynamic-table thead th {
      background: var(--surface-base, #0b1120);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #94A3B8;
    }

    .dynamic-table tbody tr.table-row {
      border-bottom: 1px solid var(--ts-border, #f1f5f9);
      transition: background-color 0.1s ease;
    }

    :host-context([data-theme="dark"]) .dynamic-table tbody tr.table-row,
    [data-theme="dark"] .dynamic-table tbody tr.table-row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .dynamic-table tbody tr.table-row:hover {
      background-color: color-mix(in srgb, var(--accent, #3b82f6) 4%, transparent);
    }

    :host-context([data-theme="dark"]) .dynamic-table tbody tr.table-row:hover,
    [data-theme="dark"] .dynamic-table tbody tr.table-row:hover {
      background-color: rgba(255, 255, 255, 0.04);
    }

    .dynamic-table tbody tr.disabled-row {
      opacity: 0.72;
      background-color: color-mix(in srgb, #94a3b8 6%, transparent);
    }

    .dynamic-table td {
      padding: 10px 10px;
      vertical-align: middle;
    }

    /* Column Cell Styles */
    .short-link-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;
    }

    .code-pill {
      display: inline-block;
      width: fit-content;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.74rem;
      font-weight: 700;
      background: var(--tool-accent-soft, color-mix(in srgb, var(--accent, #3b82f6) 12%, transparent));
      color: var(--tool-accent, var(--accent, #2563eb));
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .code-pill,
    [data-theme="dark"] .code-pill {
      background: rgba(37, 99, 235, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93C5FD;
    }

    .short-url-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ts-text, #0f172a);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    :host-context([data-theme="dark"]) .short-url-link,
    [data-theme="dark"] .short-url-link {
      color: #F1F5F9;
    }

    .short-url-link:hover {
      color: var(--accent, #2563eb);
      text-decoration: underline;
    }

    :host-context([data-theme="dark"]) .short-url-link:hover,
    [data-theme="dark"] .short-url-link:hover {
      color: #60A5FA;
    }

    .ext-icon {
      color: var(--ts-text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .copy-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      width: fit-content;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-bg, #f8fafc);
      color: var(--ts-text-muted, #475569);
      font-size: 0.74rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .copy-chip-btn,
    [data-theme="dark"] .copy-chip-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
    }

    .copy-chip-btn:hover {
      background: var(--ts-border, #e2e8f0);
      color: var(--ts-text, #0f172a);
    }

    :host-context([data-theme="dark"]) .copy-chip-btn:hover,
    [data-theme="dark"] .copy-chip-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    .copy-chip-btn.copied {
      background: var(--success-soft, #ecfdf5);
      border-color: var(--success-border, #a7f3d0);
      color: var(--success, #065f46);
    }

    :host-context([data-theme="dark"]) .copy-chip-btn.copied,
    [data-theme="dark"] .copy-chip-btn.copied {
      background: rgba(16, 185, 129, 0.18);
      border-color: rgba(16, 185, 129, 0.4);
      color: #6EE7B7;
    }

    .content-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 280px;
      min-width: 160px;
    }

    .content-header-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--ts-border, #e2e8f0);
      color: var(--ts-text, #334155);
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .type-pill,
    [data-theme="dark"] .type-pill {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
    }

    .type-pill[data-type="url"] {
      background: var(--info-soft, #eff6ff);
      border: 1px solid var(--info-border, #bfdbfe);
      color: var(--info, #1e40af);
    }

    :host-context([data-theme="dark"]) .type-pill[data-type="url"],
    [data-theme="dark"] .type-pill[data-type="url"] {
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(59, 130, 246, 0.35);
      color: #93C5FD;
    }

    .type-pill[data-type="text"] {
      background: color-mix(in srgb, var(--accent, #6366f1) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent, #6366f1) 25%, transparent);
      color: var(--accent, #6366f1);
    }

    :host-context([data-theme="dark"]) .type-pill[data-type="text"],
    [data-theme="dark"] .type-pill[data-type="text"] {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.35);
      color: #A5B4FC;
    }

    .type-pill[data-type="vcard"] {
      background: var(--success-soft, #ecfdf5);
      border: 1px solid var(--success-border, #a7f3d0);
      color: var(--success, #065f46);
    }

    :host-context([data-theme="dark"]) .type-pill[data-type="vcard"],
    [data-theme="dark"] .type-pill[data-type="vcard"] {
      background: rgba(16, 185, 129, 0.16);
      border-color: rgba(16, 185, 129, 0.35);
      color: #6EE7B7;
    }

    .bytes-tag {
      font-size: 0.7rem;
      color: var(--ts-text-muted, #94a3b8);
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .bytes-tag,
    [data-theme="dark"] .bytes-tag {
      color: #64748B;
    }

    .preview-text {
      margin: 0;
      font-size: 0.8rem;
      color: var(--ts-text-muted, #475569);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    :host-context([data-theme="dark"]) .preview-text,
    [data-theme="dark"] .preview-text {
      color: #94A3B8;
    }

    .td-metrics {
      min-width: 90px;
      white-space: nowrap;
    }

    .metrics-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 90px;
      white-space: nowrap;
    }

    .scan-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      color: var(--ts-text, #0f172a);
      white-space: nowrap;
    }

    .zap-icon {
      color: #eab308;
    }

    .scans-label {
      font-size: 0.75rem;
      color: var(--ts-text-muted, #64748b);
      font-weight: 500;
      white-space: nowrap;
    }

    .timestamp-subtext,
    .expiry-subtext {
      font-size: 0.72rem;
      color: var(--ts-text-muted, #94a3b8);
      white-space: nowrap;
    }

    .td-status {
      min-width: 110px;
      white-space: nowrap;
    }

    .status-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 110px;
      white-space: nowrap;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: fit-content;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-pill[data-status="ACTIVE"] {
      background: var(--success-soft, #ecfdf5);
      border: 1px solid var(--success-border, #a7f3d0);
      color: var(--success, #065f46);
    }

    .status-pill[data-status="ACTIVE"] .status-dot {
      background: var(--success, #10b981);
    }

    .status-pill[data-status="DISABLED"] {
      background: var(--warning-soft, #fef3c7);
      border: 1px solid var(--warning-border, #fde68a);
      color: var(--warning, #92400e);
    }

    .status-pill[data-status="DISABLED"] .status-dot {
      background: var(--warning, #f59e0b);
    }

    .status-pill[data-status="EXPIRED"] {
      background: var(--danger-soft, #fee2e2);
      border: 1px solid var(--danger-border, #fecaca);
      color: var(--danger, #991b1b);
    }

    .status-pill[data-status="EXPIRED"] .status-dot {
      background: var(--danger, #ef4444);
    }

    .td-actions {
      min-width: 120px;
      white-space: nowrap;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      white-space: nowrap;
    }

    .action-icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-raised, #ffffff);
      color: var(--ts-text, #334155);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .action-icon-btn,
    [data-theme="dark"] .action-icon-btn {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
    }

    .action-icon-btn:hover:not(:disabled) {
      background: var(--ts-border, #f1f5f9);
      border-color: var(--ts-text-muted, #94a3b8);
      color: var(--ts-text, #0f172a);
    }

    :host-context([data-theme="dark"]) .action-icon-btn:hover:not(:disabled),
    [data-theme="dark"] .action-icon-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }

    .action-icon-btn.highlight {
      background: color-mix(in srgb, var(--accent, #3b82f6) 10%, transparent);
      border-color: color-mix(in srgb, var(--accent, #3b82f6) 35%, transparent);
      color: var(--accent, #1d4ed8);
    }

    :host-context([data-theme="dark"]) .action-icon-btn.highlight,
    [data-theme="dark"] .action-icon-btn.highlight {
      background: rgba(37, 99, 235, 0.2);
      border-color: rgba(59, 130, 246, 0.4);
      color: #60A5FA;
    }

    .action-icon-btn.highlight:hover {
      background: color-mix(in srgb, var(--accent, #3b82f6) 18%, transparent);
    }

    :host-context([data-theme="dark"]) .action-icon-btn.highlight:hover,
    [data-theme="dark"] .action-icon-btn.highlight:hover {
      background: rgba(37, 99, 235, 0.35);
      color: #93C5FD;
    }

    .action-icon-btn.danger {
      color: var(--danger, #dc2626);
      border-color: var(--danger-border, #fca5a5);
    }

    .action-icon-btn.danger:hover {
      background: var(--danger-soft, #fee2e2);
    }

    .action-icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .more-actions-wrapper {
      position: relative;
      display: inline-flex;
    }

    .more-actions-trigger.active {
      background: var(--ts-border, #e2e8f0);
      border-color: var(--ts-text-muted, #94a3b8);
      color: var(--ts-text, #0f172a);
    }

    :host-context([data-theme="dark"]) .more-actions-trigger.active,
    [data-theme="dark"] .more-actions-trigger.active {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    .more-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 50;
      min-width: 190px;
      max-height: 260px;
      overflow-y: auto;
      padding: 6px;
      border-radius: 10px;
      background: var(--ts-surface-raised, #ffffff);
      border: 1px solid var(--ts-border, #e2e8f0);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .more-dropdown-menu.drop-up {
      top: auto;
      bottom: calc(100% + 4px);
      transform-origin: bottom right;
      box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.15), 0 -8px 10px -6px rgba(0, 0, 0, 0.1);
      animation: dropdownDropUp 160ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes dropdownDropUp {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    :host-context([data-theme="light"]) .more-dropdown-menu,
    [data-theme="light"] .more-dropdown-menu {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .more-dropdown-menu.drop-up,
    [data-theme="light"] .more-dropdown-menu.drop-up {
      box-shadow: 0 -10px 25px -5px rgba(15, 23, 42, 0.12), 0 -8px 10px -6px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="dark"]) .more-dropdown-menu,
    [data-theme="dark"] .more-dropdown-menu {
      background: #16233D;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }

    :host-context([data-theme="dark"]) .more-dropdown-menu.drop-up,
    [data-theme="dark"] .more-dropdown-menu.drop-up {
      box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--ts-text, #1e293b);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    :host-context([data-theme="light"]) .dropdown-item,
    [data-theme="light"] .dropdown-item {
      color: #1E293B;
    }

    :host-context([data-theme="dark"]) .dropdown-item,
    [data-theme="dark"] .dropdown-item {
      color: #F8FAFC;
    }

    .dropdown-item:hover:not(:disabled) {
      background: var(--ts-border, #f1f5f9);
      color: var(--ts-text, #0f172a);
    }

    :host-context([data-theme="dark"]) .dropdown-item:hover:not(:disabled),
    [data-theme="dark"] .dropdown-item:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .dropdown-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dropdown-item.danger {
      color: var(--danger, #dc2626);
    }

    .dropdown-item.danger:hover:not(:disabled) {
      background: var(--danger-soft, #fee2e2);
      color: var(--danger, #dc2626);
    }

    :host-context([data-theme="dark"]) .dropdown-item.danger:hover:not(:disabled),
    [data-theme="dark"] .dropdown-item.danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
    }

    .dropdown-divider {
      height: 1px;
      margin: 4px 0;
      background: var(--ts-border, #e2e8f0);
    }

    :host-context([data-theme="dark"]) .dropdown-divider,
    [data-theme="dark"] .dropdown-divider {
      background: rgba(255, 255, 255, 0.1);
    }

    .inline-confirm-delete {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .confirm-del-btn {
      padding: 4px 8px;
      border-radius: 5px;
      border: none;
      background: var(--danger, #dc2626);
      color: var(--danger-ink, #ffffff);
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
    }

    .confirm-del-btn:hover {
      filter: brightness(0.9);
    }

    .cancel-del-btn {
      padding: 4px 6px;
      border-radius: 5px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-raised, #ffffff);
      color: var(--ts-text, #334155);
      font-size: 0.72rem;
      cursor: pointer;
    }

    /* Mobile Cards View */
    .mobile-cards-view {
      display: none;
      flex-direction: column;
      gap: 12px;
    }

    .mobile-link-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: 10px;
      background: var(--ts-surface-raised, #ffffff);
      border: 1px solid var(--ts-border, #e2e8f0);
    }

    .mobile-link-card.disabled-card {
      opacity: 0.75;
      background: color-mix(in srgb, #94a3b8 6%, transparent);
    }

    .mcard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mcard-type {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mcard-url-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .mcard-short-url {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ts-text, #0f172a);
      text-decoration: none;
      word-break: break-all;
    }

    .mcard-preview-box {
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--ts-surface-inset, var(--surface-2, #f8fafc));
      font-size: 0.78rem;
      color: var(--ts-text-muted, #475569);
      display: flex;
      gap: 4px;
    }

    .preview-label {
      font-weight: 600;
      color: var(--ts-text-muted, #64748b);
    }

    .preview-val {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mcard-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.78rem;
      padding-top: 4px;
      border-top: 1px solid var(--ts-border, #f1f5f9);
    }

    .mcard-expiry {
      font-size: 0.74rem;
      color: var(--ts-text-muted, #94a3b8);
    }

    .mcard-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding-top: 4px;
    }

    .mcard-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 9px;
      border-radius: 6px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-raised, #ffffff);
      color: var(--ts-text, #1e293b);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
    }

    .mcard-action-btn.primary {
      background: color-mix(in srgb, var(--accent, #3b82f6) 12%, transparent);
      border-color: color-mix(in srgb, var(--accent, #3b82f6) 35%, transparent);
      color: var(--accent, #2563eb);
    }

    .mcard-action-btn.danger {
      color: var(--danger, #dc2626);
      border-color: var(--danger-border, #fca5a5);
    }

    .mcard-action-btn.danger-confirm {
      background: var(--danger, #dc2626);
      border-color: var(--danger, #dc2626);
      color: var(--danger-ink, #ffffff);
    }

    /* Inline Destination Edit Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .edit-modal-card {
      width: 100%;
      max-width: 520px;
      border-radius: 14px;
      background: var(--ts-surface-raised, #ffffff);
      border: 1px solid var(--ts-border, #e2e8f0);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .edit-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--ts-border, #e2e8f0);
      background: color-mix(in srgb, var(--ts-bg, #f8fafc) 50%, transparent);
    }

    .edit-modal-title-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .edit-header-icon {
      color: var(--accent, #2563eb);
      margin-top: 2px;
    }

    .edit-modal-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ts-text, #0f172a);
    }

    .edit-modal-subtitle {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--ts-text-muted, #64748b);
      line-height: 1.35;
    }

    .close-modal-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--ts-text-muted, #94a3b8);
      border-radius: 6px;
    }

    .close-modal-btn:hover {
      color: var(--ts-text, #0f172a);
      background: var(--ts-border, #f1f5f9);
    }

    .edit-modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .immutable-link-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--ts-surface-inset, var(--surface-2, #f8fafc));
      border: 1px solid var(--ts-border, #e2e8f0);
      font-size: 0.78rem;
    }

    .immutable-label {
      font-weight: 600;
      color: var(--ts-text-muted, #64748b);
    }

    .immutable-url {
      font-family: monospace;
      font-weight: 700;
      color: var(--accent, #2563eb);
      word-break: break-all;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--ts-text, #1e293b);
    }

    .payload-textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-inset, var(--surface-2, #ffffff));
      color: var(--ts-text, #0f172a);
      font-size: 0.86rem;
      font-family: inherit;
      line-height: 1.45;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }

    .payload-textarea:focus {
      border-color: var(--accent, #3b82f6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #3b82f6) 18%, transparent);
    }

    .textarea-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.74rem;
      color: var(--ts-text-muted, #64748b);
    }

    .edit-error {
      color: var(--danger, #dc2626);
      font-weight: 600;
    }

    .edit-modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--ts-border, #e2e8f0);
      background: color-mix(in srgb, var(--ts-bg, #f8fafc) 50%, transparent);
    }

    .btn-cancel {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--ts-border, #cbd5e1);
      background: var(--ts-surface-raised, #ffffff);
      color: var(--ts-text, #334155);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel:hover:not(:disabled) {
      background: var(--ts-border, #f1f5f9);
    }

    .btn-save-edit {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 8px;
      border: 1px solid var(--tool-accent, #2563eb);
      background: var(--tool-accent, #2563eb);
      color: #ffffff !important;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
    }

    .btn-save-edit:hover:not(:disabled) {
      background: color-mix(in srgb, var(--tool-accent, #2563eb) 85%, #000) !important;
      border-color: color-mix(in srgb, var(--tool-accent, #2563eb) 85%, #000) !important;
      color: #ffffff !important;
    }

    .btn-save-edit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(0.5);
    }

    .spinning {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transform-origin: center center;
      animation: spin-kf 1s linear infinite;
    }

    .refresh-btn {
      transform: none !important;
      animation: none !important;
    }

    @keyframes spin-kf {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Responsive Breakpoints */
    @media (max-width: 768px) {
      .desktop-table-view {
        display: none;
      }

      .mobile-cards-view {
        display: flex;
      }

      .dynamic-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .refresh-btn, .btn-new-dynamic {
        flex: 1;
        justify-content: center;
      }

      .toolbar-card {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .filter-group {
        width: 100%;
        justify-content: space-between;
      }

      .filter-select-wrapper {
        flex: 1;
      }

      .type-filter-select,
      .status-filter-select,
      .sort-filter-select {
        width: auto;
      }
    }

    /* Inline Create Dynamic QR Box (matching Image 3) */
    .create-inline-box {
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--accent-border, rgba(59, 130, 246, 0.3));
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="light"]) .create-inline-box {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .dynamic-box-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .dynamic-box-title {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .dyn-icon {
      width: 18px;
      height: 18px;
      color: var(--accent, #3b82f6);
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .dyn-heading {
      font-size: 0.925rem;
      font-weight: 650;
      color: var(--text, #f8fafc);
      margin: 0 0 0.125rem 0;
    }

    :host-context([data-theme="light"]) .dyn-heading {
      color: #0f172a;
    }

    .dyn-desc {
      font-size: 0.775rem;
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      margin: 0;
    }

    :host-context([data-theme="light"]) .dyn-desc {
      color: #64748b;
    }

    .btn-close-inline-create {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dynamic-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 640px) {
      .dynamic-fields-grid {
        grid-template-columns: 1fr;
      }
    }

    .qr-form-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .qr-form-row.full-width {
      grid-column: 1 / -1;
    }

    .qr-sub-label {
      font-size: 0.775rem;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .qr-sub-label {
      color: #475569;
    }

    .req {
      color: #ef4444;
    }

    .create-inline-box .qr-input {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-default, rgba(255, 255, 255, 0.12));
      background: var(--surface-1, rgba(255, 255, 255, 0.05));
      color: var(--text, #f8fafc);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 150ms ease;
    }

    :host-context([data-theme="light"]) .create-inline-box .qr-input {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .create-inline-box .qr-input:focus {
      border-color: var(--accent, #3b82f6);
    }

    .dynamic-action-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }

    .btn-create-dynamic {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 16px;
      border-radius: 7px;
      background: #2563eb;
      color: #ffffff;
      font-size: 0.825rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
      transition: background 150ms ease;
    }

    .btn-create-dynamic:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-create-dynamic:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel-create {
      padding: 8px 14px;
      border-radius: 7px;
      background: transparent;
      border: 1px solid var(--border-default, rgba(255, 255, 255, 0.12));
      color: var(--text-muted, #94a3b8);
      font-size: 0.825rem;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-cancel-create {
      border-color: #cbd5e1;
      color: #475569;
    }

    .dyn-error {
      color: #ef4444;
      font-size: 0.775rem;
      margin: 0;
      font-weight: 500;
    }
  `]
})
export class DynamicLinksComponent implements OnInit {
  readonly smartLinkService = inject(SmartLinkService);
  readonly dynamicService = inject(QrDynamicService);

  readonly isCreateOpen = signal<boolean>(false);
  readonly createUrl = signal<string>('');
  readonly createTitle = signal<string>('');
  readonly createSlug = signal<string>('');
  readonly createPassword = signal<string>('');
  readonly isSubmittingCreate = signal<boolean>(false);
  readonly createError = signal<string | null>(null);

  readonly openInGenerator = output<{
    code: string;
    type: string;
    payload?: string;
    shortUrl: string;
  }>();

  readonly previewQr = output<string>();
  readonly downloadQr = output<LiveSmartLink>();
  readonly backToContent = output<void>();

  readonly searchQuery = signal<string>('');
  readonly typeFilter = signal<string>('ALL');
  readonly statusFilter = signal<string>('ALL');
  readonly sortBy = signal<'recent' | 'scans'>('recent');

  readonly typeFilterOptions: QrSelectOption<string>[] = [
    { value: 'ALL', label: 'All Types', icon: 'layers' },
    { value: 'URL', label: 'Website (URL)', icon: 'globe' },
    { value: 'TEXT', label: 'Plain Text', icon: 'type' },
    { value: 'VCARD', label: 'Contact (vCard)', icon: 'user' },
    { value: 'OTHER', label: 'Other', icon: 'more-horizontal' }
  ];

  readonly statusFilterOptions: QrSelectOption<string>[] = [
    { value: 'ALL', label: 'All Status', icon: 'gallery-vertical-end' },
    { value: 'ACTIVE', label: 'Active', icon: 'check-circle' },
    { value: 'DISABLED', label: 'Disabled', icon: 'link-2-off' },
    { value: 'EXPIRED', label: 'Expired', icon: 'clock' }
  ];

  readonly sortByOptions: QrSelectOption<'recent' | 'scans'>[] = [
    { value: 'recent', label: 'Most Recent', icon: 'calendar' },
    { value: 'scans', label: 'Most Scanned', icon: 'scan-eye' }
  ];

  readonly copiedCode = signal<string | null>(null);
  readonly deletingCode = signal<string | null>(null);
  readonly activeDropdownCode = signal<string | null>(null);
  readonly isDropdownUp = signal<boolean>(false);
  readonly editingLink = signal<LiveSmartLink | null>(null);
  readonly editPayload = signal<string>('');
  readonly isSavingEdit = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error'>('success');

  readonly filteredLinks = computed(() => {
    const list = this.smartLinkService.managedLinks();
    const query = this.searchQuery().trim().toLowerCase();
    const typeF = this.typeFilter();
    const statusF = this.statusFilter();
    const sort = this.sortBy();

    const filtered = list.filter(item => {
      // Search filter
      if (query) {
        const matchCode = item.code?.toLowerCase().includes(query);
        const matchUrl = item.shortUrl?.toLowerCase().includes(query);
        const matchPreview = item.preview?.toLowerCase().includes(query);
        const matchType = item.type?.toLowerCase().includes(query);
        const matchPayload = item.payload?.toLowerCase().includes(query);
        if (!matchCode && !matchUrl && !matchPreview && !matchType && !matchPayload) {
          return false;
        }
      }

      // Type filter
      if (typeF !== 'ALL') {
        if (item.type.toUpperCase() !== typeF.toUpperCase()) {
          return false;
        }
      }

      // Status filter
      if (statusF !== 'ALL') {
        if (item.status.toUpperCase() !== statusF.toUpperCase()) {
          return false;
        }
      }

      return true;
    });

    // Sort order
    return [...filtered].sort((a, b) => {
      if (sort === 'scans') {
        const diff = (b.scanCount ?? 0) - (a.scanCount ?? 0);
        if (diff !== 0) return diff;
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  });

  ngOnInit(): void {
    this.refreshSummaries();
  }

  refreshSummaries(): void {
    this.smartLinkService.fetchLiveSummaries().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  toggleCreatePanel(): void {
    this.isCreateOpen.set(!this.isCreateOpen());
    if (this.isCreateOpen()) {
      this.createError.set(null);
    }
  }

  async handleInlineCreate(): Promise<void> {
    const url = this.createUrl().trim();
    if (!url) {
      this.createError.set('Please provide a destination URL.');
      return;
    }

    this.isSubmittingCreate.set(true);
    this.createError.set(null);

    try {
      const created = await this.dynamicService.createDynamicQr({
        type: 'DYNAMIC_URL',
        title: this.createTitle().trim() || undefined,
        targetUrl: url,
        password: this.createPassword().trim() || undefined,
        customSlug: this.createSlug().trim() || undefined
      });

      this.smartLinkService.saveStoredLink({
        code: created.code,
        manageToken: created.manageKey || '',
        type: 'URL',
        shortUrl: created.shortUrl,
        createdAt: new Date().toISOString(),
        preview: url.slice(0, 60),
        payload: url,
        status: created.status || 'ACTIVE',
        explicit: true,
        title: this.createTitle().trim() || undefined
      });

      this.refreshSummaries();
      this.showToast(`Dynamic link ${created.code} created successfully!`);

      // Reset form
      this.createUrl.set('');
      this.createTitle.set('');
      this.createSlug.set('');
      this.createPassword.set('');
      this.isCreateOpen.set(false);
    } catch (err: unknown) {
      this.createError.set(err instanceof Error ? err.message : 'Failed to create dynamic QR link');
    } finally {
      this.isSubmittingCreate.set(false);
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('ALL');
    this.statusFilter.set('ALL');
    this.sortBy.set('recent');
  }

  toggleMoreMenu(code: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeDropdownCode() === code) {
      this.closeMoreMenu();
      return;
    }

    const triggerBtn = event.currentTarget as HTMLElement | null;
    if (triggerBtn && typeof window !== 'undefined') {
      const rect = triggerBtn.getBoundingClientRect();
      const container = triggerBtn.closest('.table-responsive-container') || triggerBtn.closest('.dynamic-body');
      const containerBottom = container ? container.getBoundingClientRect().bottom : window.innerHeight;
      const containerTop = container ? container.getBoundingClientRect().top : 0;
      const spaceBelow = containerBottom - rect.bottom;
      const spaceAbove = rect.top - containerTop;
      // Dropdown menu is ~200px tall; flip upwards if space below inside container is tight and there is more room above
      this.isDropdownUp.set(spaceBelow < 210 && spaceAbove > spaceBelow);
    } else {
      this.isDropdownUp.set(false);
    }

    this.activeDropdownCode.set(code);
  }

  closeMoreMenu(): void {
    this.activeDropdownCode.set(null);
    this.isDropdownUp.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeDropdownCode()) {
      this.closeMoreMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activeDropdownCode()) {
      this.closeMoreMenu();
    }
  }

  copyShortUrl(url: string, code: string): void {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copiedCode.set(code);
        setTimeout(() => {
          if (this.copiedCode() === code) {
            this.copiedCode.set(null);
          }
        }, 2000);
      });
    }
  }

  toggleStatus(link: LiveSmartLink): void {
    this.smartLinkService.toggleLinkStatus(link.code).subscribe({
      next: () => {
        const nextStatus = link.status === 'ACTIVE' ? 'Paused' : 'Active';
        this.showToast(`Link ${link.code} marked as ${nextStatus}`, 'success');
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to toggle status', 'error');
      }
    });
  }

  extendLink(link: LiveSmartLink): void {
    this.smartLinkService.extendLink(link.code).subscribe({
      next: () => {
        this.showToast(`Link ${link.code} retention extended by 1 year`, 'success');
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to extend link', 'error');
      }
    });
  }

  executeDelete(code: string): void {
    this.smartLinkService.deleteLink(code).subscribe({
      next: () => {
        this.deletingCode.set(null);
        this.showToast(`Dynamic link ${code} deleted`, 'success');
      },
      error: (err) => {
        this.deletingCode.set(null);
        this.showToast(err?.error?.message || 'Failed to delete link', 'error');
      }
    });
  }

  startEdit(link: LiveSmartLink): void {
    this.editError.set(null);
    this.editingLink.set(link);
    if (link.payload) {
      this.editPayload.set(link.payload);
    } else {
      this.editPayload.set(link.preview || '');
      // Try to fetch full details asynchronously
      this.smartLinkService.getLinkDetails(link.code).subscribe({
        next: (details) => {
          if (details && details.payload) {
            this.editPayload.set(details.payload);
          }
        },
        error: () => {}
      });
    }
  }

  closeEditModal(): void {
    if (this.isSavingEdit()) return;
    this.editingLink.set(null);
    this.editPayload.set('');
    this.editError.set(null);
  }

  saveEdit(): void {
    const link = this.editingLink();
    if (!link) return;

    const payload = this.editPayload().trim();
    if (!payload) {
      this.editError.set('Payload cannot be empty');
      return;
    }

    this.isSavingEdit.set(true);
    this.editError.set(null);

    this.smartLinkService.updateLinkPayload(link.code, payload, link.type).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.closeEditModal();
        this.showToast('Destination updated! Your QR code remains unchanged.');
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        this.editError.set(err?.error?.message || 'Failed to update destination');
      }
    });
  }

  onOpenInGenerator(link: LiveSmartLink): void {
    if (link.payload) {
      this.smartLinkService.loadLinkIntoStudio(link.code, link.manageToken, link.shortUrl);
      this.openInGenerator.emit({
        code: link.code,
        type: link.type,
        payload: link.payload,
        shortUrl: link.shortUrl
      });
    } else {
      this.smartLinkService.getLinkDetails(link.code).subscribe({
        next: (details) => {
          const payload = details?.payload || link.preview || '';
          this.smartLinkService.loadLinkIntoStudio(link.code, link.manageToken, link.shortUrl);
          this.openInGenerator.emit({
            code: link.code,
            type: link.type,
            payload,
            shortUrl: link.shortUrl
          });
        },
        error: () => {
          this.smartLinkService.loadLinkIntoStudio(link.code, link.manageToken, link.shortUrl);
          this.openInGenerator.emit({
            code: link.code,
            type: link.type,
            payload: link.preview || '',
            shortUrl: link.shortUrl
          });
        }
      });
    }
  }

  getTypeIcon(type: string): string {
    switch (type?.toUpperCase()) {
      case 'URL':
        return 'globe';
      case 'TEXT':
        return 'type';
      case 'VCARD':
        return 'user';
      case 'WIFI':
        return 'wifi';
      default:
        return 'link';
    }
  }

  formatTypeLabel(type: string): string {
    switch (type?.toUpperCase()) {
      case 'URL':
        return 'Website';
      case 'TEXT':
        return 'Plain Text';
      case 'VCARD':
        return 'vCard';
      default:
        return type || 'Other';
    }
  }

  formatDate(isoDate?: string): string {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  }

  formatExpiry(isoDate?: string): string {
    if (!isoDate) return 'No expiration set';
    try {
      const exp = new Date(isoDate).getTime();
      const now = Date.now();
      const diffMs = exp - now;
      if (diffMs <= 0) return 'Expired';
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (days < 30) return `Expires in ${days} days`;
      const months = Math.round(days / 30);
      return `Expires in ~${months} mos`;
    } catch {
      return '';
    }
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
