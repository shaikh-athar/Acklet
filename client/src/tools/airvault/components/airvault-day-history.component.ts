import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultColorService } from '../services/airvault-color.service';

export interface DayGroup {
  dateLabel: string;
  dateStr: string;
  isToday: boolean;
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  items: any[];
  visibleCount: number;
  isLoadingMore?: boolean;
}

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
  matchGlobalIndex: number;
  isActive: boolean;
}

export interface SearchMatchLocation {
  matchGlobalIndex: number;
  groupDateStr: string;
  itemId: string;
  field: string;
  matchText: string;
}

@Component({
  selector: 'app-airvault-day-history',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="day-history-wrapper">
      <!-- ── Scrollable Day-Groups Accordion Stack ──────────────── -->
      <div class="day-history-scroll-area" (scroll)="onScrollArea($event)">
        <div class="day-group-stack">
          @for (group of filteredDayGroups(); track group.dateStr) {
            <div class="day-group-card" [class.day-expanded]="group.expanded">
              <!-- Day Group Header / Accordion Trigger -->
              <button
                class="day-group-header"
                (click)="toggleGroup(group)"
                [attr.aria-expanded]="group.expanded">
                <div class="day-header-left">
                  <app-icon
                    [name]="group.expanded ? 'chevron-down' : 'chevron-right'"
                    class="icon-xs accordion-arrow">
                  </app-icon>
                  <div class="day-title-box">
                    <span class="day-label" [class.text-today]="group.isToday">{{ group.dateLabel }}</span>
                  </div>
                </div>

                <div class="day-header-right">
                  @if (group.loading) {
                    <span class="day-loading-spinner">
                      <app-icon name="loader" class="icon-xs spin-icon text-accent"></app-icon>
                    </span>
                  } @else {
                    <span class="day-count-badge" [class.has-items]="getFilteredTotalCount(group) > 0">
                      {{ getFilteredTotalCount(group) }} {{ getFilteredTotalCount(group) === 1 ? 'item' : 'items' }}
                    </span>
                  }
                </div>
              </button>

              <!-- Day Group Expanded Content -->
              @if (group.expanded) {
                <div class="day-group-body">
                  @if (group.loading) {
                    <div class="day-loading-state">
                      <app-icon name="loader" class="icon-sm spin-icon text-accent"></app-icon>
                      <span>Fetching {{ group.dateLabel }} records...</span>
                    </div>
                  } @else if (getFilteredTotalCount(group) === 0) {
                    <div class="day-empty-state">
                      <app-icon name="inbox" class="icon-sm text-muted"></app-icon>
                      <span>{{ searchQuery() ? 'No items match your search.' : 'No entries recorded on this day.' }}</span>
                    </div>
                  } @else {
                    <div class="day-entries-list" (scroll)="onGroupScroll($event, group)">
                      @for (item of getDisplayItems(group); track getItemId(item)) {
                        <!-- Audit Log Entry -->
                        @if (type() === 'audit') {
                          <div class="history-entry-row audit-row" [id]="'entry-row-' + getItemId(item)">
                            <div class="history-gutter-bar" [style.background]="getItemAuthorColor(item)" [title]="'Actor: ' + formatActor(item)"></div>
                            <div class="entry-badge" [ngClass]="getAuditBadgeClass(item)">
                              <app-icon [name]="getAuditIcon(item)" class="icon-xs"></app-icon>
                              <span class="badge-text">{{ (item.event_type || item.action || 'EVENT') | uppercase }}</span>
                            </div>
                            <div class="entry-content">
                              <div class="entry-title-line">
                                <span class="entry-main-text">
                                  @for (seg of getHighlightSegments(getAuditDescription(item), getItemId(item), 'title'); track $index) {
                                    @if (seg.isMatch) {
                                      <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                    } @else {
                                      <span>{{ seg.text }}</span>
                                    }
                                  }
                                </span>
                                @if (item.target_resource_id) {
                                  <span class="entry-chip font-mono">
                                    @for (seg of getHighlightSegments(item.target_resource_id.slice(0, 16), getItemId(item), 'resourceId'); track $index) {
                                      @if (seg.isMatch) {
                                        <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                      } @else {
                                        <span>{{ seg.text }}</span>
                                      }
                                    }
                                  </span>
                                }
                                @if (item.result === 'FAILURE') {
                                  <span class="entry-chip chip-danger">FAILED</span>
                                }
                              </div>
                              <div class="entry-meta-line">
                                <span class="entry-actor">
                                  <span class="device-dot" [style.background]="getItemAuthorColor(item)"></span>
                                  <span>
                                    @for (seg of getHighlightSegments(formatActor(item), getItemId(item), 'actor'); track $index) {
                                      @if (seg.isMatch) {
                                        <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                      } @else {
                                        <span>{{ seg.text }}</span>
                                      }
                                    }
                                  </span>
                                </span>
                                <span class="meta-sep">·</span>
                                <span class="entry-time">{{ formatTime(item.timestamp_utc || item.timestamp) }}</span>
                                @if (item.ip_address) {
                                  <span class="meta-sep">·</span>
                                  <span class="entry-ip">{{ item.ip_address }}</span>
                                }
                              </div>
                              @if (item.before_value || item.after_value) {
                                <div class="entry-mutation-box">
                                  @if (item.before_value) {
                                    <span class="mutation-item prev">Before: <code>{{ item.before_value }}</code></span>
                                  }
                                  @if (item.after_value) {
                                    <span class="mutation-item curr">After: <code>
                                      @for (seg of getHighlightSegments(item.after_value, getItemId(item), 'snippet'); track $index) {
                                        @if (seg.isMatch) {
                                          <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                        } @else {
                                          <span>{{ seg.text }}</span>
                                        }
                                      }
                                    </code></span>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }

                        <!-- Resource History Entry -->
                        @else if (type() === 'resource') {
                          <div class="history-entry-row resource-row" [id]="'entry-row-' + getItemId(item)">
                            <div class="history-gutter-bar" [style.background]="getItemAuthorColor(item)" [title]="'Author: ' + (item.sender_device_name || formatActor(item))"></div>
                            <!-- Thumbnail preview for images or icon for generic files -->
                            <div [ngClass]="'entry-cat-icon ' + getResourceBgClass(item)">
                              @if (isImageItem(item) && getItemThumbnail(item) && !failedThumbnails.has(getItemId(item))) {
                                <img
                                  [src]="getItemThumbnail(item)"
                                  class="entry-thumb-img"
                                  alt="Thumbnail"
                                  (error)="onThumbnailError(getItemId(item))"
                                />
                              } @else {
                                <app-icon [name]="getResourceIcon(item)" [class]="'icon-sm ' + getResourceIconClass(item)"></app-icon>
                              }
                            </div>
                            <div class="entry-content">
                              <div class="entry-title-line">
                                <span class="entry-main-text">
                                  @for (seg of getHighlightSegments(getItemDisplayTitle(item), getItemId(item), 'title'); track $index) {
                                    @if (seg.isMatch) {
                                      <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                    } @else {
                                      <span>{{ seg.text }}</span>
                                    }
                                  }
                                </span>
                                <span class="entry-size">{{ formatBytes(item.byte_size || item.content?.byteSize || 0) }}</span>
                              </div>
                              <div class="entry-meta-line">
                                <span class="entry-actor">
                                  <span class="device-dot" [style.background]="getItemAuthorColor(item)"></span>
                                  <span>
                                    @for (seg of getHighlightSegments(item.sender_device_name || formatActor(item), getItemId(item), 'actor'); track $index) {
                                      @if (seg.isMatch) {
                                        <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                      } @else {
                                        <span>{{ seg.text }}</span>
                                      }
                                    }
                                  </span>
                                </span>
                                <span class="meta-sep">·</span>
                                <span class="entry-time">{{ formatTime(item.timestamp_utc || item.deletedAt || item.timestamp) }}</span>
                              </div>
                            </div>
                            <div class="entry-actions">
                              <button class="av-btn-primary av-btn-readd" (click)="restoreItem.emit(item)">
                                <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                                <span>Restore</span>
                              </button>
                              <button class="av-btn-icon av-btn-danger" (click)="purgeItem.emit(item)">
                                <app-icon name="trash-2" class="icon-xs"></app-icon>
                              </button>
                            </div>
                          </div>
                        }

                        <!-- Active Clipboard Entry (Text, URL, Code, JSON, Image, File, Archive) -->
                        @else if (type() === 'clipboard') {
                          <div class="history-entry-row clipboard-row" [id]="'entry-row-' + getItemId(item)">
                            <div class="history-gutter-bar" [style.background]="getItemAuthorColor(item)" [title]="'Author: ' + (item.senderDeviceName || formatActor(item))"></div>
                            
                            <!-- Thumbnail preview for images or icon for generic category -->
                            <div [ngClass]="'entry-cat-icon ' + getResourceBgClass(item)">
                              @if (isImageItem(item) && getItemThumbnail(item) && !failedThumbnails.has(getItemId(item))) {
                                <img
                                  [src]="getItemThumbnail(item)"
                                  class="entry-thumb-img"
                                  alt="Thumbnail"
                                  (error)="onThumbnailError(getItemId(item))"
                                />
                              } @else {
                                <app-icon [name]="getResourceIcon(item)" [class]="'icon-sm ' + getResourceIconClass(item)"></app-icon>
                              }
                            </div>

                            <div class="entry-content">
                              <div class="entry-title-line">
                                <span class="entry-main-text" [title]="getItemDisplayTitle(item)">
                                  @for (seg of getHighlightSegments(getItemDisplayTitle(item), getItemId(item), 'title'); track $index) {
                                    @if (seg.isMatch) {
                                      <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                    } @else {
                                      <span>{{ seg.text }}</span>
                                    }
                                  }
                                </span>
                                @if (item.content?.byteSize) {
                                  <span class="entry-size">{{ formatBytes(item.content.byteSize) }}</span>
                                }
                                @if (item.isPinned) {
                                  <span class="entry-chip chip-pinned">📌 Pinned</span>
                                }
                              </div>
                              @if (item.content?.raw && !isImageItem(item) && !item.file_name) {
                                <div class="entry-snippet">
                                  @for (seg of getHighlightSegments(item.content.raw, getItemId(item), 'snippet'); track $index) {
                                    @if (seg.isMatch) {
                                      <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                    } @else {
                                      <span>{{ seg.text }}</span>
                                    }
                                  }
                                </div>
                              }
                              <div class="entry-meta-line">
                                <span class="entry-actor">
                                  <span class="device-dot" [style.background]="getItemAuthorColor(item)"></span>
                                  <span>
                                    @for (seg of getHighlightSegments(item.senderDeviceName || formatActor(item), getItemId(item), 'actor'); track $index) {
                                      @if (seg.isMatch) {
                                        <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                      } @else {
                                        <span>{{ seg.text }}</span>
                                      }
                                    }
                                  </span>
                                </span>
                                <span class="meta-sep">·</span>
                                <span class="entry-time">{{ formatTime(item.timestamp) }}</span>
                                <span class="meta-sep">·</span>
                                <span class="entry-type-tag">{{ (item.content?.category || 'text') | uppercase }}</span>
                              </div>
                            </div>

                            <div class="entry-actions">
                              @if (item.content?.raw) {
                                <button class="av-btn-secondary" (click)="copyItemContent(item)" title="Copy content to system clipboard">
                                  <app-icon name="copy" class="icon-xs"></app-icon>
                                  <span>Copy</span>
                                </button>
                              } @else if (item.content?.dataUrl) {
                                <button class="av-btn-secondary" (click)="downloadItem(item)" title="Download file">
                                  <app-icon name="download" class="icon-xs"></app-icon>
                                  <span>Download</span>
                                </button>
                              }
                            </div>
                          </div>
                        }

                        <!-- Text History Entry -->
                        @else if (type() === 'text') {
                          <div class="history-entry-row text-row" [id]="'entry-row-' + getItemId(item)">
                            <div class="history-gutter-bar" [style.background]="getItemAuthorColor(item)" [title]="'Author: ' + (item.actor_username || 'Local Device')"></div>
                            <div class="entry-cat-icon cat-bg-indigo">
                              <app-icon name="file-text" class="icon-sm text-indigo"></app-icon>
                            </div>
                            <div class="entry-content">
                              <div class="entry-snippet">
                                @for (seg of getHighlightSegments(item.snippet || item.after_value || item.content?.raw || '', getItemId(item), 'snippet'); track $index) {
                                  @if (seg.isMatch) {
                                    <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                  } @else {
                                    <span>{{ seg.text }}</span>
                                  }
                                }
                              </div>
                              <div class="entry-meta-line">
                                <span class="entry-actor">
                                  <span class="device-dot" [style.background]="getItemAuthorColor(item)"></span>
                                  <span>
                                    @for (seg of getHighlightSegments(item.actor_username || 'Local Device', getItemId(item), 'actor'); track $index) {
                                      @if (seg.isMatch) {
                                        <mark class="av-search-match" [class.av-search-match-active]="seg.isActive" [id]="'av-match-' + seg.matchGlobalIndex">{{ seg.text }}</mark>
                                      } @else {
                                        <span>{{ seg.text }}</span>
                                      }
                                    }
                                  </span>
                                </span>
                                <span class="meta-sep">·</span>
                                <span class="entry-time">{{ formatTime(item.timestamp_utc || item.timestamp) }}</span>
                              </div>
                            </div>
                            <div class="entry-actions">
                              <button class="av-btn-secondary" (click)="copyText(item.snippet || item.after_value || item.content?.raw)">
                                <app-icon name="copy" class="icon-xs"></app-icon>
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        }
                      }

                      <!-- Progressive Loading Indicator / Load More -->
                      @if (hasMoreItems(group)) {
                        <div class="day-load-more-row">
                          @if (group.isLoadingMore) {
                            <span class="day-load-more-spinner">
                              <app-icon name="loader" class="icon-xs spin-icon text-accent"></app-icon>
                              <span>Loading more entries ({{ getDisplayItems(group).length }} of {{ getFilteredTotalCount(group) }})...</span>
                            </span>
                          } @else {
                            <button class="day-load-more-btn" (click)="loadMoreForGroup(group)">
                              <app-icon name="chevron-down" class="icon-xs"></app-icon>
                              <span>Show more ({{ getDisplayItems(group).length }} of {{ getFilteredTotalCount(group) }})</span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- ── Fixed Bottom Toolbar: Live Search & Match Navigation & Filter ── -->
      <div class="history-fixed-bottom-bar">
        <!-- Live Search Bar -->
        <div class="bottom-search-wrapper" [class.focused]="isSearchActive()">
          <app-icon name="search" class="icon-xs search-icon"></app-icon>
          <input
            type="text"
            class="bottom-search-input"
            placeholder="Search clipboard text, URLs, code, files, or usernames..."
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchInput($event)"
            (keydown)="onSearchKeydown($event)"
            (focus)="isSearchActive.set(true)"
            (blur)="isSearchActive.set(!!searchQuery())"
          />

          <!-- Live Debounced Server Search Indicator -->
          @if (isSearchingServer()) {
            <span class="search-spinner-box">
              <app-icon name="loader" class="icon-xxs spin-icon text-accent"></app-icon>
            </span>
          }

          <!-- Match Navigation Controls & Counter -->
          @if (searchQuery().trim()) {
            <div class="search-nav-controls">
              <span class="search-match-pill" [class.has-matches]="totalMatchesCount() > 0">
                @if (totalMatchesCount() > 0) {
                  {{ activeMatchDisplay() }} of {{ totalMatchesCount() }}
                } @else {
                  No matches
                }
              </span>

              <button
                class="search-nav-btn"
                [disabled]="totalMatchesCount() === 0"
                (click)="prevMatch()"
                title="Previous match (Shift+Enter)">
                <app-icon name="chevron-up" class="icon-xxs"></app-icon>
              </button>

              <button
                class="search-nav-btn"
                [disabled]="totalMatchesCount() === 0"
                (click)="nextMatch()"
                title="Next match (Enter)">
                <app-icon name="chevron-down" class="icon-xxs"></app-icon>
              </button>

              <button class="clear-search-btn" (click)="clearSearch()" title="Clear search (Esc)">
                <app-icon name="x" class="icon-xxs"></app-icon>
              </button>
            </div>
          }
        </div>

        <!-- Filter Action Icon Button & Popover Dropdown -->
        <div class="filter-dropdown-wrapper">
          <button
            class="filter-icon-btn"
            [class.active]="selectedCategoryFilter() !== 'all' || isFilterMenuOpen()"
            (click)="isFilterMenuOpen.set(!isFilterMenuOpen())"
            data-tooltip="Filter">
            <app-icon name="filter" class="icon-xs"></app-icon>
            @if (selectedCategoryFilter() !== 'all') {
              <span class="filter-active-dot"></span>
            }
          </button>

          @if (isFilterMenuOpen()) {
            <div class="filter-popover-menu" (click)="$event.stopPropagation()">
              <div class="popover-title">Filter by Category</div>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'all'"
                (click)="setCategoryFilter('all')">
                <app-icon name="layers" class="icon-xs"></app-icon>
                <span>All Entries</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'link'"
                (click)="setCategoryFilter('link')">
                <app-icon name="link" class="icon-xs text-blue"></app-icon>
                <span>URLs & Links</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'text'"
                (click)="setCategoryFilter('text')">
                <app-icon name="file-text" class="icon-xs text-indigo"></app-icon>
                <span>Text & Notes</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'code'"
                (click)="setCategoryFilter('code')">
                <app-icon name="code" class="icon-xs text-purple"></app-icon>
                <span>Code Snippets</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'json'"
                (click)="setCategoryFilter('json')">
                <app-icon name="file-json" class="icon-xs text-emerald"></app-icon>
                <span>JSON Payloads</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'image'"
                (click)="setCategoryFilter('image')">
                <app-icon name="image" class="icon-xs text-amber"></app-icon>
                <span>Images & Photos</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'file'"
                (click)="setCategoryFilter('file')">
                <app-icon name="file" class="icon-xs text-blue"></app-icon>
                <span>Documents & Files</span>
              </button>
              <button
                class="popover-item"
                [class.active]="selectedCategoryFilter() === 'archive'"
                (click)="setCategoryFilter('archive')">
                <app-icon name="archive" class="icon-xs text-cyan"></app-icon>
                <span>Archives (.zip)</span>
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }

    .day-history-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }

    .day-history-scroll-area {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      min-height: 0;
    }

    .day-group-stack {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .day-group-card {
      border: 1px solid var(--av-border, #E4E7EC);
      border-radius: var(--av-radius-md, 8px);
      background: var(--av-surface-primary, #FFFFFF);
      overflow: hidden;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .day-group-card.day-expanded {
      border-color: var(--av-border-strong, #D0D5DD);
      box-shadow: 0 2px 6px rgba(16, 24, 40, 0.06);
    }

    .day-group-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 16px;
      background: var(--av-surface-primary, #FFFFFF);
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease;
      user-select: none;
    }

    .day-group-header:hover {
      background: var(--av-surface-secondary, #F1F3F6);
    }

    .day-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .accordion-arrow {
      color: var(--av-text-muted, #667085);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .day-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary, #101828);
      letter-spacing: -0.01em;
    }

    .day-label.text-today {
      color: var(--av-accent, #2196F3);
    }

    .day-count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      color: var(--av-text-muted, #667085);
      transition: all 0.15s ease;
    }

    .day-count-badge.has-items {
      background: rgba(33, 150, 243, 0.09);
      border-color: rgba(33, 150, 243, 0.3);
      color: var(--av-accent, #2196F3);
    }

    .day-group-body {
      padding: 10px 14px 14px;
      background: var(--av-surface-secondary, #F1F3F6);
      border-top: 1px solid var(--av-border, #E4E7EC);
      animation: dayAccordionSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: top center;
    }

    @keyframes dayAccordionSlideDown {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .day-empty-state, .day-loading-state {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 20px 0;
      font-size: 12px;
      color: var(--av-text-muted, #667085);
      justify-content: center;
    }

    .day-entries-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .history-entry-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px 8px 14px;
      border-radius: var(--av-radius-sm, 6px);
      background: var(--av-surface-primary, #FFFFFF);
      border: 1px solid var(--av-border, #E4E7EC);
      position: relative;
      overflow: hidden;
      transition: all 0.12s ease;
    }

    .history-gutter-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 3.5px;
      border-top-left-radius: var(--av-radius-sm, 6px);
      border-bottom-left-radius: var(--av-radius-sm, 6px);
      cursor: help;
      transition: width 0.12s ease;
    }

    .history-entry-row:hover .history-gutter-bar {
      width: 5px;
    }

    .history-entry-row:hover {
      border-color: var(--av-border-strong, #94A3B8);
      box-shadow: 0 1px 4px rgba(16, 24, 40, 0.06);
    }

    .entry-cat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: var(--av-surface-secondary, #F1F3F6);
      color: var(--av-text-primary, #101828);
      border: 1px solid var(--av-border, #E4E7EC);
      overflow: hidden;
      flex-shrink: 0;
    }

    .entry-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .entry-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid transparent;
      flex-shrink: 0;
    }

    .badge-info {
      background: rgba(33, 150, 243, 0.09);
      border-color: rgba(33, 150, 243, 0.25);
      color: #2196F3;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.09);
      border-color: rgba(16, 185, 129, 0.25);
      color: #10B981;
    }
    .badge-danger {
      background: rgba(229, 72, 77, 0.09);
      border-color: rgba(229, 72, 77, 0.25);
      color: #E5484D;
    }
    .badge-warn {
      background: rgba(245, 158, 11, 0.09);
      border-color: rgba(245, 158, 11, 0.25);
      color: #D97706;
    }

    .entry-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .entry-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--av-text-primary, #101828);
    }

    .entry-main-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entry-size {
      font-size: 11px;
      color: var(--av-text-muted, #667085);
      font-family: var(--av-font-mono, monospace);
      font-weight: 500;
    }

    .entry-chip {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      color: var(--av-text-muted, #667085);
    }

    .chip-danger {
      background: rgba(229, 72, 77, 0.1);
      border-color: rgba(229, 72, 77, 0.25);
      color: #E5484D;
      font-weight: 600;
    }

    .entry-meta-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--av-text-muted, #667085);
    }

    .entry-actor {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      color: var(--av-accent, #2196F3);
    }

    .device-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--av-accent, #2196F3);
    }

    .meta-sep { opacity: 0.5; }

    .entry-mutation-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      font-size: 11px;
      font-family: var(--av-font-mono, monospace);
    }

    .entry-snippet {
      font-size: 12px;
      color: var(--av-text-primary, #101828);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .entry-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .av-btn-readd {
      height: 28px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 600;
      background: #2196F3;
      color: #FFFFFF;
      border: 1px solid #2196F3;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.12s ease;
    }

    .av-btn-readd:hover {
      background: #1976D2;
      border-color: #1976D2;
    }

    /* ── Search Highlighting Tokens & Classes ── */
    .av-search-match {
      background: var(--av-highlight-match, rgba(245, 158, 11, 0.28));
      color: var(--av-highlight-match-text, #92400E);
      border-radius: 2px;
      padding: 0 2px;
      margin: 0;
      transition: all 0.12s ease;
      font-weight: 600;
    }

    .av-search-match.av-search-match-active {
      background: var(--av-highlight-active, #F59E0B) !important;
      color: var(--av-highlight-active-text, #FFFFFF) !important;
      outline: 2px solid var(--av-highlight-active-border, #D97706);
      border-radius: 3px;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
      font-weight: 700;
      z-index: 2;
    }

    .search-nav-controls {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-left: auto;
    }

    .search-match-pill {
      font-size: 10.5px;
      font-weight: 600;
      font-family: var(--av-font-mono, monospace);
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--av-surface-primary, #FFFFFF);
      border: 1px solid var(--av-border, #E4E7EC);
      color: var(--av-text-muted, #667085);
      white-space: nowrap;
    }

    .search-match-pill.has-matches {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.35);
      color: #D97706;
    }

    .search-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid var(--av-border, #E4E7EC);
      background: var(--av-surface-primary, #FFFFFF);
      color: var(--av-text-muted, #667085);
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .search-nav-btn:hover:not(:disabled) {
      background: var(--av-surface-secondary, #F1F3F6);
      color: var(--av-text-primary, #101828);
      border-color: var(--av-border-strong, #D0D5DD);
    }

    .search-nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .search-spinner-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    /* ── Fixed Bottom Toolbar (Never Scrolls) ── */
    .history-fixed-bottom-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--av-surface-primary, #FFFFFF);
      border-top: 1px solid var(--av-border, #E4E7EC);
      flex-shrink: 0;
      box-shadow: 0 -2px 8px rgba(16, 24, 40, 0.03);
      position: relative;
      z-index: 50;
    }

    .bottom-search-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 32px;
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      border-radius: var(--av-radius-sm, 6px);
      transition: all 0.12s ease;
    }

    .bottom-search-wrapper.focused {
      border-color: var(--av-accent, #2196F3);
      background: var(--av-surface-primary, #FFFFFF);
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.15);
    }

    .search-icon {
      color: var(--av-text-muted, #667085);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      line-height: 1;
      margin: 0;
    }

    .bottom-search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 12px;
      color: var(--av-text-primary, #101828);
      min-width: 80px;
    }

    .bottom-search-input::placeholder {
      color: var(--av-text-faint, #98A2B3);
    }

    .clear-search-btn {
      background: transparent;
      border: none;
      padding: 2px;
      color: var(--av-text-muted, #667085);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .filter-dropdown-wrapper {
      position: relative;
    }

    .filter-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: var(--av-radius-sm, 6px);
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      color: var(--av-text-muted, #667085);
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .filter-icon-btn:hover {
      background: var(--av-surface-primary, #FFFFFF);
      color: var(--av-text-primary, #101828);
      border-color: var(--av-border-strong, #D0D5DD);
    }

    .filter-icon-btn.active {
      border-color: var(--av-accent, #2196F3);
      color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.09);
    }

    .filter-active-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--av-accent, #2196F3);
    }

    .filter-popover-menu {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      width: 175px;
      padding: 4px;
      background: var(--av-surface-primary, #FFFFFF);
      border: 1px solid var(--av-border, #E4E7EC);
      border-radius: var(--av-radius-md, 8px);
      box-shadow: 0 8px 24px rgba(16, 24, 40, 0.16);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: popoverFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: bottom right;
    }

    .popover-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--av-text-muted, #667085);
      padding: 6px 8px 4px;
      letter-spacing: 0.04em;
    }

    .popover-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      font-size: 12px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: var(--av-text-primary, #101828);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
    }

    .popover-item:hover {
      background: var(--av-surface-secondary, #F1F3F6);
    }

    .popover-item.active {
      background: rgba(33, 150, 243, 0.09);
      color: var(--av-accent, #2196F3);
      font-weight: 600;
    }

    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Direct soft background and matching icon colors */
    .cat-bg-amber { background: #FEF3C7 !important; border-color: #FDE68A !important; color: #e98717ff !important; }
    .cat-bg-blue { background: #DBEAFE !important; border-color: #BFDBFE !important; color: #336eedff !important; }
    .cat-bg-purple { background: #EDE9FE !important; border-color: #DDD6FE !important; color: #8649f1ff !important; }
    .cat-bg-cyan { background: #CFFAFE !important; border-color: #A5F3FC !important; color: #0eb2dbff !important; }
    .cat-bg-red { background: #FEE2E2 !important; border-color: #FECACA !important; color: #f14141ff !important; }
    .cat-bg-emerald { background: #D1FAE5 !important; border-color: #A7F3D0 !important; color: #1bb786ff !important; }
    .cat-bg-indigo { background: #E0E7FF !important; border-color: #C7D2FE !important; color: #5c54f3ff !important; }

    .text-amber { color: #D97706 !important; }
    .text-blue { color: #2563EB !important; }
    .text-purple { color: #7C3AED !important; }
    .text-cyan { color: #0891B2 !important; }
    .text-red { color: #DC2626 !important; }
    .text-emerald { color: #059669 !important; }
    .text-indigo { color: #4F46E5 !important; }
    .text-muted { color: var(--av-text-muted, #667085) !important; }

    .text-accent {
      color: var(--av-accent, #2196F3);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .day-load-more-row {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      margin-top: 6px;
      border-top: 1px dashed var(--av-border, #E4E7EC);
    }

    .day-load-more-spinner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--av-text-muted, #667085);
    }

    .day-load-more-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--av-accent, #2196F3);
      background: var(--av-surface-secondary, #F1F3F6);
      border: 1px solid var(--av-border, #E4E7EC);
      border-radius: var(--av-radius-sm, 6px);
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .day-load-more-btn:hover {
      background: rgba(33, 150, 243, 0.1);
      border-color: var(--av-accent, #2196F3);
    }

    :host-context([data-theme="dark"]) {
      --av-highlight-match: rgba(245, 158, 11, 0.35);
      --av-highlight-match-text: #FDE68A;
      --av-highlight-active: #F59E0B;
      --av-highlight-active-text: #111419;
      --av-highlight-active-border: #FBBF24;

      .day-group-card {
        background: #111419;
        border-color: #252B33;
      }
      .day-group-card.day-expanded {
        border-color: #363D47;
      }
      .day-group-header {
        background: #111419;
      }
      .day-group-header:hover {
        background: #171B21;
      }
      .day-group-body {
        background: #0B0D10;
        border-color: #252B33;
      }
      .history-entry-row {
        background: #111419;
        border-color: #252B33;
      }
      .history-entry-row:hover {
        border-color: #363D47;
      }
      .cat-bg-amber { background: rgba(245, 158, 11, 0.16) !important; border-color: rgba(245, 158, 11, 0.35) !important; color: #FBBF24 !important; }
      .cat-bg-blue { background: rgba(59, 130, 246, 0.16) !important; border-color: rgba(59, 130, 246, 0.35) !important; color: #60A5FA !important; }
      .cat-bg-purple { background: rgba(139, 92, 246, 0.16) !important; border-color: rgba(139, 92, 246, 0.35) !important; color: #A78BFA !important; }
      .cat-bg-cyan { background: rgba(6, 182, 212, 0.16) !important; border-color: rgba(6, 182, 212, 0.35) !important; color: #22D3EE !important; }
      .cat-bg-red { background: rgba(239, 68, 68, 0.16) !important; border-color: rgba(239, 68, 68, 0.35) !important; color: #F87171 !important; }
      .cat-bg-emerald { background: rgba(16, 185, 129, 0.16) !important; border-color: rgba(16, 185, 129, 0.35) !important; color: #34D399 !important; }
      .cat-bg-indigo { background: rgba(99, 102, 241, 0.16) !important; border-color: rgba(99, 102, 241, 0.35) !important; color: #818CF8 !important; }
      .entry-chip, .entry-mutation-box {
        background: #171B21;
        border-color: #252B33;
      }
      .day-count-badge {
        background: #171B21;
        border-color: #252B33;
      }
      .day-label, .entry-title-line, .entry-snippet, .popover-item {
        color: #F0F3F6;
      }
      .history-fixed-bottom-bar {
        background: #111419;
        border-color: #252B33;
      }
      .bottom-search-wrapper, .filter-icon-btn, .filter-popover-menu {
        background: #171B21;
        border-color: #252B33;
      }
      .bottom-search-wrapper.focused {
        background: #111419;
      }
      .bottom-search-input {
        color: #F0F3F6;
      }
      .search-match-pill {
        background: #111419;
        border-color: #252B33;
      }
      .search-match-pill.has-matches {
        background: rgba(245, 158, 11, 0.2);
        border-color: rgba(245, 158, 11, 0.45);
        color: #FBBF24;
      }
      .search-nav-btn {
        background: #111419;
        border-color: #252B33;
        color: #98A2B3;
      }
      .search-nav-btn:hover:not(:disabled) {
        background: #171B21;
        color: #F0F3F6;
        border-color: #363D47;
      }
      .popover-item:hover {
        background: #111419;
      }
      .day-load-more-btn {
        background: #171B21;
        border-color: #252B33;
      }
    }

    :host-context([data-theme="light"]) {
      --av-highlight-match: rgba(245, 158, 11, 0.2);
      --av-highlight-match-text: #92400E;
      --av-highlight-active: #D97706;
      --av-highlight-active-text: #FFFFFF;
      --av-highlight-active-border: #F59E0B;

      .day-group-card {
        background: #FFFFFF;
        border-color: #E4E7EC;
      }
      .day-group-card.day-expanded {
        border-color: #D0D5DD;
      }
      .day-group-header {
        background: #FFFFFF;
      }
      .day-group-header:hover {
        background: #F7F8FA;
      }
      .day-group-body {
        background: #F7F8FA;
        border-color: #E4E7EC;
      }
      .history-entry-row {
        background: #FFFFFF;
        border-color: #E4E7EC;
      }
      .history-entry-row:hover {
        border-color: #D0D5DD;
      }
      .entry-chip, .entry-mutation-box {
        background: #F1F3F6;
        border-color: #E4E7EC;
      }
      .day-count-badge {
        background: #F1F3F6;
        border-color: #E4E7EC;
      }
      .day-label, .entry-title-line, .entry-snippet, .popover-item {
        color: #101828;
      }
      .history-fixed-bottom-bar {
        background: #FFFFFF;
        border-color: #E4E7EC;
      }
      .bottom-search-wrapper, .filter-icon-btn, .filter-popover-menu {
        background: #F1F3F6;
        border-color: #E4E7EC;
      }
      .bottom-search-wrapper.focused {
        background: #FFFFFF;
      }
      .bottom-search-input {
        color: #101828;
      }
      .search-match-pill {
        background: #FFFFFF;
        border-color: #E4E7EC;
      }
      .search-nav-btn {
        background: #FFFFFF;
        border-color: #E4E7EC;
        color: #667085;
      }
      .search-nav-btn:hover:not(:disabled) {
        background: #F1F3F6;
        color: #101828;
        border-color: #D0D5DD;
      }
      .popover-item:hover {
        background: #F7F8FA;
      }
      .day-load-more-btn {
        background: #F1F3F6;
        border-color: #E4E7EC;
      }
    }

    .entry-type-tag {
      font-size: 9.5px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.1);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: var(--av-font-ui);
    }

    .chip-pinned {
      background: rgba(8, 145, 178, 0.12) !important;
      color: #0891B2 !important;
      border-color: rgba(8, 145, 178, 0.3) !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirVaultDayHistoryComponent implements OnInit, OnDestroy {
  type = input.required<'audit' | 'resource' | 'text' | 'clipboard'>();
  localItems = input<any[]>([]);

  restoreItem = output<any>();
  purgeItem = output<any>();
  triggerToast = output<string>();

  private http = inject(HttpClient);
  private deviceService = inject(AirVaultDeviceService);
  private colorService = inject(AirVaultColorService);

  dayGroups = signal<DayGroup[]>([]);
  searchQuery = signal<string>('');
  isSearchActive = signal<boolean>(false);
  selectedCategoryFilter = signal<string>('all');
  isFilterMenuOpen = signal<boolean>(false);
  isSearchingServer = signal<boolean>(false);
  activeMatchIndex = signal<number>(0);
  failedThumbnails = new Set<string>();

  private searchSubject$ = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor() {
    effect(() => {
      const items = this.localItems();
      const currentType = this.type();
      if (currentType === 'resource' || currentType === 'clipboard') {
        this.dayGroups.update(groups => {
          return groups.map(g => {
            if (g.isToday) {
              return { ...g, items: items || [], loaded: true, loading: false };
            } else {
              const dateMidnight = new Date(g.dateStr).setHours(0, 0, 0, 0);
              const nextMidnight = dateMidnight + 86400000;
              const matching = (items || []).filter(item => {
                const ts = item.deletedAt || item.timestamp || 0;
                return ts >= dateMidnight && ts < nextMidnight;
              });
              return { ...g, items: matching, loaded: true, loading: false };
            }
          });
        });
      }
    });
  }

  getItemAuthorColor(item: any): string {
    const candidate = item.authorColor || item.author_color || item.sender_device_accent || item.senderDeviceAccent;
    const actor = item.actor_username || item.sender_device_name || item.senderDeviceName || 'User';
    return this.colorService.getColorForIdentity(actor, candidate);
  }

  onThumbnailError(id: string) {
    this.failedThumbnails.add(id);
  }

  filteredDayGroups = computed(() => {
    return this.dayGroups();
  });

  /**
   * Computed list of all match occurrences across all currently visible day groups and items.
   * Enables Next/Previous navigation and match counts across multi-entry feeds.
   */
  allMatches = computed<SearchMatchLocation[]>(() => {
    const query = this.searchQuery().trim();
    if (!query) return [];

    let pattern: RegExp;
    if (query.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(query), 'gi');
    }

    const matches: SearchMatchLocation[] = [];
    let globalCounter = 0;

    const groups = this.dayGroups();
    for (const group of groups) {
      const displayItems = this.getDisplayItems(group);
      for (const item of displayItems) {
        const itemId = this.getItemId(item);

        // Fields to scan based on item type
        const fieldsToCheck: { field: string; text: string }[] = [];

        if (this.type() === 'audit') {
          fieldsToCheck.push({ field: 'title', text: this.getAuditDescription(item) });
          if (item.target_resource_id) {
            fieldsToCheck.push({ field: 'resourceId', text: item.target_resource_id.slice(0, 16) });
          }
          fieldsToCheck.push({ field: 'actor', text: this.formatActor(item) });
          if (item.after_value) {
            fieldsToCheck.push({ field: 'snippet', text: item.after_value });
          }
        } else if (this.type() === 'resource' || this.type() === 'clipboard') {
          fieldsToCheck.push({ field: 'title', text: this.getItemDisplayTitle(item) });
          fieldsToCheck.push({ field: 'actor', text: item.sender_device_name || item.senderDeviceName || this.formatActor(item) });
          if (item.content?.raw && !this.isImageItem(item)) {
            fieldsToCheck.push({ field: 'snippet', text: item.content.raw });
          }
        } else if (this.type() === 'text') {
          fieldsToCheck.push({ field: 'snippet', text: item.snippet || item.after_value || item.content?.raw || '' });
          fieldsToCheck.push({ field: 'actor', text: item.actor_username || 'Local Device' });
        }

        for (const f of fieldsToCheck) {
          if (!f.text) continue;
          let m: RegExpExecArray | null;
          pattern.lastIndex = 0;
          while ((m = pattern.exec(f.text)) !== null) {
            matches.push({
              matchGlobalIndex: globalCounter++,
              groupDateStr: group.dateStr,
              itemId: itemId,
              field: f.field,
              matchText: m[0]
            });
            if (m.index === pattern.lastIndex) {
              pattern.lastIndex++;
            }
          }
        }
      }
    }

    return matches;
  });

  totalMatchesCount = computed(() => this.allMatches().length);

  activeMatchDisplay = computed(() => {
    const total = this.totalMatchesCount();
    if (total === 0) return 0;
    const current = this.activeMatchIndex();
    return Math.min(current + 1, total);
  });

  ngOnInit() {
    this.build7DayGroups();
    this.setupDebouncedSearch();
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  private setupDebouncedSearch() {
    this.searchSubscription = this.searchSubject$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(query => {
        const trimmed = query.trim();
        if (!trimmed || this.type() === 'clipboard') {
          this.isSearchingServer.set(false);
          return of(null);
        }

        this.isSearchingServer.set(true);
        const cur = this.deviceService.currentDevice();
        const username = cur.username || cur.name || '';
        const clientDeviceId = cur.id || '';
        const url = `/api/v1/airvault/history/search?query=${encodeURIComponent(trimmed)}&windowDays=7&clientDeviceId=${encodeURIComponent(clientDeviceId)}&username=${encodeURIComponent(username)}`;

        return this.http.get<any>(url).pipe(
          catchError(() => {
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (res) => {
        this.isSearchingServer.set(false);
        if (res?.data?.results) {
          this.mergeServerSearchResults(res.data.results);
        }
      },
      error: () => {
        this.isSearchingServer.set(false);
      }
    });
  }

  onSearchInput(val: string) {
    this.searchQuery.set(val);
    this.activeMatchIndex.set(0);
    this.searchSubject$.next(val);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.activeMatchIndex.set(0);
    this.searchSubject$.next('');
  }

  onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this.prevMatch();
      } else {
        this.nextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.clearSearch();
    }
  }

  nextMatch() {
    const total = this.totalMatchesCount();
    if (total === 0) return;
    const nextIdx = (this.activeMatchIndex() + 1) % total;
    this.activeMatchIndex.set(nextIdx);
    this.scrollToActiveMatch(nextIdx);
  }

  prevMatch() {
    const total = this.totalMatchesCount();
    if (total === 0) return;
    const prevIdx = (this.activeMatchIndex() - 1 + total) % total;
    this.activeMatchIndex.set(prevIdx);
    this.scrollToActiveMatch(prevIdx);
  }

  private scrollToActiveMatch(index: number) {
    const matches = this.allMatches();
    if (!matches || index < 0 || index >= matches.length) return;
    const targetMatch = matches[index];

    // Ensure the containing day group is expanded
    const group = this.dayGroups().find(g => g.dateStr === targetMatch.groupDateStr);
    if (group && !group.expanded) {
      group.expanded = true;
      this.dayGroups.set([...this.dayGroups()]);
    }

    // Ensure the item is visible inside the group
    if (group) {
      const itemIdx = group.items.findIndex(it => this.getItemId(it) === targetMatch.itemId);
      if (itemIdx >= (group.visibleCount || 15)) {
        group.visibleCount = itemIdx + 10;
        this.dayGroups.set([...this.dayGroups()]);
      }
    }

    setTimeout(() => {
      const matchEl = document.getElementById(`av-match-${index}`);
      if (matchEl) {
        matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const row = document.getElementById(`entry-row-${targetMatch.itemId}`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 40);
  }

  getHighlightSegments(text: string, itemId: string, field: string): HighlightSegment[] {
    if (!text) return [];
    const query = this.searchQuery().trim();
    if (!query) return [{ text, isMatch: false, matchGlobalIndex: -1, isActive: false }];

    let pattern: RegExp;
    if (query.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(query), 'gi');
    }

    const segments: HighlightSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const currentActive = this.activeMatchIndex();
    const itemMatches = this.allMatches().filter(m => m.itemId === itemId && m.field === field);
    let matchOccurIdx = 0;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, match.index),
          isMatch: false,
          matchGlobalIndex: -1,
          isActive: false
        });
      }

      const globalMatch = itemMatches[matchOccurIdx];
      const globalIdx = globalMatch ? globalMatch.matchGlobalIndex : -1;
      const isActive = globalIdx === currentActive;

      segments.push({
        text: match[0],
        isMatch: true,
        matchGlobalIndex: globalIdx,
        isActive
      });

      matchOccurIdx++;
      lastIndex = pattern.lastIndex;
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isMatch: false,
        matchGlobalIndex: -1,
        isActive: false
      });
    }

    return segments;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private mergeServerSearchResults(backendMatches: any[]) {
    if (!backendMatches || backendMatches.length === 0) return;
    this.dayGroups.update(groups => {
      return groups.map(g => {
        const dateMidnight = new Date(g.dateStr).setHours(0, 0, 0, 0);
        const nextMidnight = dateMidnight + 86400000;

        const matchingFromBackend = backendMatches.filter(item => {
          const ts = new Date(item.timestampUtc || item.timestamp || 0).getTime();
          return ts >= dateMidnight && ts < nextMidnight;
        });

        if (matchingFromBackend.length > 0) {
          const combined = [...g.items];
          for (const s of matchingFromBackend) {
            const sid = s.entryId || s.id;
            if (!combined.some(c => this.getItemId(c) === sid)) {
              combined.push(s);
            }
          }
          return { ...g, items: combined, loaded: true };
        }
        return g;
      });
    });
  }

  private build7DayGroups() {
    const groups: DayGroup[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const itemYear = d.getFullYear();

      let dateLabel = '';
      if (i === 0) {
        dateLabel = 'Today';
      } else if (i === 1) {
        dateLabel = 'Yesterday';
      } else {
        const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
        const dayNum = d.getDate();
        const monthStr = d.toLocaleDateString(undefined, { month: 'short' });
        
        if (itemYear !== currentYear) {
          dateLabel = `${weekday}, ${dayNum} ${monthStr} ${itemYear}`;
        } else {
          dateLabel = `${weekday}, ${dayNum} ${monthStr}`;
        }
      }

      groups.push({
        dateLabel,
        dateStr,
        isToday: i === 0,
        expanded: i === 0,
        loading: false,
        loaded: false,
        items: [],
        visibleCount: 15,
        isLoadingMore: false
      });
    }

    this.dayGroups.set(groups);

    // Automatically load the active first day (Today)
    if (groups.length > 0) {
      this.fetchDay(groups[0]);
    }
  }

  toggleGroup(group: DayGroup) {
    group.expanded = !group.expanded;
    if (group.expanded && !group.loaded && !group.loading) {
      this.fetchDay(group);
    }
    this.dayGroups.set([...this.dayGroups()]);
  }

  fetchDay(group: DayGroup) {
    group.loading = true;
    group.visibleCount = 15;
    this.dayGroups.set([...this.dayGroups()]);

    // For resource & clipboard history in 100% client-side mode, localItems is the authoritative source
    if (this.type() === 'clipboard' || this.type() === 'resource') {
      group.loading = false;
      group.loaded = true;
      if (group.isToday) {
        group.items = this.localItems() || [];
      } else {
        const dateMidnight = new Date(group.dateStr).setHours(0, 0, 0, 0);
        const nextMidnight = dateMidnight + 86400000;
        group.items = (this.localItems() || []).filter(item => {
          const ts = item.deletedAt || item.timestamp || 0;
          return ts >= dateMidnight && ts < nextMidnight;
        });
      }
      this.dayGroups.set([...this.dayGroups()]);
      return;
    }

    const cur = this.deviceService.currentDevice();
    const username = cur.username || cur.name || '';
    const clientDeviceId = cur.id || '';
    const dateParam = group.isToday ? 'today' : group.dateStr;

    const url = `/api/v1/airvault/history/${this.type()}?date=${dateParam}&clientDeviceId=${encodeURIComponent(clientDeviceId)}&username=${encodeURIComponent(username)}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        group.loading = false;
        group.loaded = true;
        let backendItems = res?.data || [];

        if (group.isToday && this.localItems() && this.localItems().length > 0) {
          const combined = [...this.localItems()];
          for (const item of backendItems) {
            const id = this.getItemId(item);
            if (!combined.some(c => this.getItemId(c) === id)) {
              combined.push(item);
            }
          }
          group.items = combined;
        } else {
          group.items = backendItems;
        }

        this.dayGroups.set([...this.dayGroups()]);
      },
      error: () => {
        group.loading = false;
        group.loaded = true;
        if (group.isToday && this.localItems()) {
          group.items = this.localItems();
        }
        this.dayGroups.set([...this.dayGroups()]);
      }
    });
  }

  setCategoryFilter(cat: string) {
    this.selectedCategoryFilter.set(cat);
    this.isFilterMenuOpen.set(false);
  }

  getFilteredItems(group: DayGroup): any[] {
    let items = group.items || [];
    const query = this.searchQuery().trim().toLowerCase();
    const catFilter = this.selectedCategoryFilter();

    if (catFilter !== 'all') {
      items = items.filter(item => {
        const cat = (item.category || item.content?.category || '').toLowerCase();
        const name = (item.file_name || item.content?.filename || '').toLowerCase();
        const raw = (item.content?.raw || item.itemSnippet || '').toLowerCase();
        if (catFilter === 'image') {
          return cat === 'image' || name.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp)$/);
        }
        if (catFilter === 'archive') {
          return cat === 'archive' || name.match(/\.(zip|tar|gz|rar|7z)$/);
        }
        if (catFilter === 'code') {
          return cat === 'code' || name.match(/\.(ts|js|jsx|tsx|html|css|py|java|cpp|go|rs|sql|sh)$/);
        }
        if (catFilter === 'json') {
          return cat === 'json' || name.endsWith('.json') || (raw.startsWith('{') && raw.endsWith('}'));
        }
        if (catFilter === 'link' || catFilter === 'url') {
          return cat === 'link' || cat === 'url' || raw.startsWith('http://') || raw.startsWith('https://');
        }
        if (catFilter === 'text') {
          return cat === 'text' || (!item.file_name && !item.content?.filename && !raw.startsWith('http://') && !raw.startsWith('https://'));
        }
        if (catFilter === 'file') {
          return cat === 'file' || cat === 'pdf' || name.match(/\.(pdf|docx|txt|csv|xlsx)$/);
        }
        return cat === catFilter;
      });
    }

    if (query) {
      let pattern: RegExp;
      if (query.length <= 2) {
        pattern = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
      } else {
        pattern = new RegExp(this.escapeRegex(query), 'i');
      }

      items = items.filter(item => {
        const title = item.file_name || item.content?.filename || item.content?.raw || item.itemSnippet || item.event_type || '';
        const rawContent = item.content?.raw || item.snippet || item.after_value || '';
        const actor = item.actor_username || item.deviceName || item.senderDeviceName || item.sender_device_name || '';
        const cat = item.category || item.content?.category || '';
        const id = item.target_resource_id || item.event_id || item.id || '';
        return pattern.test(title) || pattern.test(rawContent) || pattern.test(actor) || pattern.test(cat) || pattern.test(id);
      });
    }

    return items;
  }

  getFilteredTotalCount(group: DayGroup): number {
    return this.getFilteredItems(group).length;
  }

  getDisplayItems(group: DayGroup): any[] {
    const all = this.getFilteredItems(group);
    const limit = group.visibleCount || 15;
    return all.slice(0, limit);
  }

  hasMoreItems(group: DayGroup): boolean {
    return this.getFilteredTotalCount(group) > (group.visibleCount || 15);
  }

  loadMoreForGroup(group: DayGroup) {
    if (group.isLoadingMore || !this.hasMoreItems(group)) return;
    group.isLoadingMore = true;
    this.dayGroups.set([...this.dayGroups()]);
    setTimeout(() => {
      group.visibleCount = (group.visibleCount || 15) + 15;
      group.isLoadingMore = false;
      this.dayGroups.set([...this.dayGroups()]);
    }, 120);
  }

  private lastScrollTriggerTime = 0;

  onGroupScroll(e: Event, group: DayGroup) {
    const el = e.target as HTMLElement;
    if (!el) return;
    const now = Date.now();
    if (now - this.lastScrollTriggerTime < 200) return; // 200ms throttle
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      this.lastScrollTriggerTime = now;
      this.loadMoreForGroup(group);
    }
  }

  onScrollArea(e: Event) {
    const el = e.target as HTMLElement;
    if (!el) return;
    const now = Date.now();
    if (now - this.lastScrollTriggerTime < 200) return; // 200ms throttle
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      const expandedGroupWithMore = this.dayGroups().find(g => g.expanded && this.hasMoreItems(g) && !g.isLoadingMore);
      if (expandedGroupWithMore) {
        this.lastScrollTriggerTime = now;
        this.loadMoreForGroup(expandedGroupWithMore);
      }
    }
  }

  getItemId(item: any): string {
    return item?.event_id || item?.file_id || item?.id || item?.item_id || item?.entryId || Math.random().toString();
  }

  getItemDisplayTitle(item: any): string {
    if (item.file_name) return item.file_name;
    if (item.content?.filename) return item.content.filename;
    if (item.content?.category === 'url' || item.content?.category === 'link') {
      return item.content.raw || 'URL Link';
    }
    if (item.content?.raw) {
      const firstLine = item.content.raw.split('\n')[0].trim();
      return firstLine.length > 70 ? firstLine.slice(0, 70) + '…' : firstLine;
    }
    return item.title || item.itemSnippet || 'Clipboard Item';
  }

  isImageItem(item: any): boolean {
    const cat = (item.category || item.content?.category || '').toLowerCase();
    const name = (item.file_name || item.content?.filename || '').toLowerCase();
    return cat === 'image' || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.gif');
  }

  getItemThumbnail(item: any): string | null {
    if (item.thumbnail_url || item.thumbnailUrl) {
      return item.thumbnail_url || item.thumbnailUrl;
    }
    if (item.content?.dataUrl) {
      return item.content.dataUrl;
    }
    if (item.content?.raw && item.content.raw.startsWith('data:image')) {
      return item.content.raw;
    }
    return null;
  }

  getAuditBadgeClass(item: any): string {
    const action = (item.event_type || item.action || '').toLowerCase();
    if (action.includes('delete') || action.includes('fail') || action.includes('lockout')) return 'badge-danger';
    if (action.includes('create') || action.includes('success') || action.includes('restore')) return 'badge-success';
    if (action.includes('rename') || action.includes('pin')) return 'badge-warn';
    return 'badge-info';
  }

  getAuditIcon(item: any): string {
    const action = (item.event_type || item.action || '').toLowerCase();
    if (action.includes('delete')) return 'trash-2';
    if (action.includes('restore')) return 'rotate-ccw';
    if (action.includes('pin') || action.includes('lockout')) return 'shield';
    if (action.includes('rename')) return 'edit-3';
    if (action.includes('upload')) return 'upload-cloud';
    return 'activity';
  }

  getAuditDescription(item: any): string {
    if (item.event_type) {
      const type = item.event_type.replace(/_/g, ' ');
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    return item.title || item.itemSnippet || item.action || 'Audit event';
  }

  formatActor(item: any): string {
    if (item.actor_username) return `@${item.actor_username}`;
    if (item.deviceName) return `@${item.deviceName}`;
    const cur = this.deviceService.currentDevice();
    return `@${cur.username || cur.name || 'anonymous'}`;
  }

  getResourceIcon(item: any): string {
    const cat = (item.category || item.content?.category || '').toLowerCase();
    const name = (item.file_name || item.content?.filename || '').toLowerCase();
    const raw = (item.content?.raw || '').trim().toLowerCase();

    // 1. Images & Photos
    if (cat === 'image' || name.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|tiff|heic)$/)) return 'image';

    // 2. Video Media
    if (cat === 'video' || name.match(/\.(mp4|mov|mkv|webm|avi|flv|wmv|m4v)$/)) return 'video';

    // 3. Audio & Music
    if (cat === 'audio' || name.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)) return 'music';

    // 4. PDF Documents
    if (cat === 'pdf' || name.endsWith('.pdf')) return 'file-text';

    // 5. Spreadsheets / Tables
    if (cat === 'spreadsheet' || name.match(/\.(xlsx|xls|csv|tsv|numbers)$/)) return 'table';

    // 6. Archives & Zip
    if (cat === 'archive' || name.match(/\.(zip|tar|gz|rar|7z|bz2|xz)$/)) return 'archive';

    // 7. Code & Scripts
    if (cat === 'code' || name.match(/\.(ts|js|jsx|tsx|html|css|scss|py|java|cpp|c|go|rs|php|rb|sql|sh|swift|kt)$/)) return 'code';

    // 8. JSON Data
    if (cat === 'json' || name.endsWith('.json')) return 'file-json';

    // 9. Links & URLs
    if (cat === 'link' || cat === 'url' || raw.startsWith('http://') || raw.startsWith('https://')) return 'link';

    // 10. Generic document fallback
    if (name.match(/\.(docx|doc|txt|md|rtf|odt|pages)$/)) return 'file-text';

    return 'file';
  }

  getResourceIconClass(item: any): string {
    const icon = this.getResourceIcon(item);
    switch (icon) {
      case 'image': return 'text-amber';
      case 'video': return 'text-red';
      case 'music': return 'text-purple';
      case 'file-text': return 'text-blue';
      case 'table': return 'text-emerald';
      case 'archive': return 'text-cyan';
      case 'code': return 'text-indigo';
      case 'file-json': return 'text-emerald';
      case 'link': return 'text-blue';
      default: return 'text-muted';
    }
  }

  getResourceBgClass(item: any): string {
    const icon = this.getResourceIcon(item);
    switch (icon) {
      case 'image': return 'cat-bg-amber';
      case 'video': return 'cat-bg-red';
      case 'music': return 'cat-bg-purple';
      case 'file-text': return 'cat-bg-blue';
      case 'table': return 'cat-bg-emerald';
      case 'archive': return 'cat-bg-cyan';
      case 'code': return 'cat-bg-indigo';
      case 'file-json': return 'cat-bg-emerald';
      case 'link': return 'cat-bg-blue';
      default: return '';
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatTime(iso: string | number): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  copyText(text: string) {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }

  copyItemContent(item: any) {
    const raw = item.content?.raw || item.snippet || item.after_value || item.file_name || '';
    if (raw) {
      this.copyText(raw);
      this.triggerToast.emit(`📋 Copied to clipboard`);
    }
  }

  downloadItem(item: any) {
    if (!item.content?.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.content.dataUrl;
    a.download = item.content.filename || item.file_name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.triggerToast.emit(`⚡ Downloading ${a.download}`);
  }
}
