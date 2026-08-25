import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryGroup, HistoryItem } from '../services/data-lens-history.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-history-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="history-drawer-overlay" (click)="closeDrawer.emit()">
        <div class="history-drawer" (click)="$event.stopPropagation()">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="drawer-title-group">
              <h3>Local History</h3>
              <span class="privacy-tag">
                <app-icon name="shield-check" class="icon-xs"></app-icon>
                Stored locally on this device
              </span>
            </div>
            @if (historyGroups().length > 0) {
              <button class="drawer-clear-btn" (click)="clearAllClick.emit()" data-tooltip="Clear all local history">
                <app-icon name="clock" class="icon-xs"></app-icon>
                Clear All
              </button>
            }
          </div>

          <!-- Drawer Content with Date Grouping -->
          <div class="drawer-content">
            @for (group of historyGroups(); track group.label) {
              <div class="history-date-group">
                <div class="group-label">{{ group.label }}</div>
                @for (item of group.items; track item.id) {
                  <div class="history-card" [class.is-pinned-card]="item.isPinned" (click)="restoreItem.emit(item)">
                    <div class="history-card-top-row">
                      <div class="history-filename-box" [attr.data-tooltip]="item.filename">
                        <app-icon name="file-json" class="icon-xs history-file-icon"></app-icon>
                        <span class="history-filename">{{ item.filename }}</span>
                      </div>
                      <span class="history-time">{{ item.timestamp | date:'shortTime' }}</span>
                    </div>

                    <div class="history-preview-wrapper" [class.is-expanded]="isCardExpanded(item.id)">
                      <div class="history-preview-box" [class.is-expanded]="isCardExpanded(item.id)">
                        <code class="history-preview" [class.is-expanded]="isCardExpanded(item.id)">{{ item.payload || item.preview }}</code>
                      </div>
                      <button
                        class="show-more-toggle-btn"
                        (click)="$event.stopPropagation(); toggleExpandCard(item.id)"
                        [attr.data-tooltip]="isCardExpanded(item.id) ? 'Collapse JSON snippet' : 'Show more JSON lines'"
                      >
                        <app-icon [name]="isCardExpanded(item.id) ? 'chevron-up' : 'chevron-down'" class="icon-xs"></app-icon>
                        <span>{{ isCardExpanded(item.id) ? 'Show Less' : 'Show More...' }}</span>
                      </button>
                    </div>

                    <div class="history-card-footer">
                      <span class="history-size-badge">{{ (item.sizeBytes / 1024).toFixed(1) }} KB</span>

                      <div class="history-card-actions">
                        <button
                          class="card-action-btn pin-btn"
                          [class.pinned]="item.isPinned"
                          (click)="$event.stopPropagation(); togglePinItem.emit(item.id)"
                          [attr.data-tooltip]="item.isPinned ? 'Unpin item' : 'Pin item to top'"
                        >
                          <app-icon [name]="item.isPinned ? 'pin-off' : 'pin'" class="icon-xs"></app-icon>
                        </button>
                        <button class="card-action-btn restore-btn" (click)="$event.stopPropagation(); restoreItem.emit(item)" data-tooltip="Restore into editor">
                          <app-icon name="corner-up-left" class="icon-xs"></app-icon>
                          Restore
                        </button>
                        <button class="card-action-btn delete-btn" (click)="$event.stopPropagation(); deleteItem.emit(item.id)" data-tooltip="Delete item">
                          <app-icon name="trash-2" class="icon-xs"></app-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-history-container">
                <app-icon name="shield" class="icon-lg opacity-40"></app-icon>
                <div class="empty-history-title">No Local History Found</div>
                <div class="empty-history-desc">Formatted payloads will be safely saved locally on this device.</div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensHistoryDrawerComponent {
  isOpen = input<boolean>(false);
  historyGroups = input<HistoryGroup[]>([]);

  closeDrawer = output<void>();
  restoreItem = output<HistoryItem>();
  deleteItem = output<string>();
  togglePinItem = output<string>();
  clearAllClick = output<void>();

  expandedCardIds = signal<Set<string>>(new Set());

  isCardExpanded(id: string): boolean {
    return this.expandedCardIds().has(id);
  }

  toggleExpandCard(id: string, event?: Event) {
    if (event) event.stopPropagation();
    const set = new Set(this.expandedCardIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.expandedCardIds.set(set);
  }
}
