import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryGroup, HistoryItem } from '../services/json-lens-history.service';
import { LucideAngularModule, Trash2, RotateCcw, ShieldCheck, X } from 'lucide-angular';

@Component({
  selector: 'app-json-lens-history-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div class="history-drawer-overlay" (click)="closeDrawer.emit()">
        <div class="history-drawer" (click)="$event.stopPropagation()">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="drawer-title-group">
              <h3>Local History</h3>
              <span class="privacy-tag">
                <lucide-icon [img]="ShieldIcon" class="icon-xs"></lucide-icon>
                Stored locally on this device
              </span>
            </div>
            <div class="drawer-header-actions">
              @if (historyGroups().length > 0) {
                <button class="drawer-clear-btn" (click)="clearAllClick.emit()" title="Clear all local history">
                  <lucide-icon [img]="ClearIcon" class="icon-xs"></lucide-icon>
                  Clear All
                </button>
              }
              <button class="icon-nav-btn" (click)="closeDrawer.emit()">
                <lucide-icon [img]="CloseIcon" class="icon-xs"></lucide-icon>
              </button>
            </div>
          </div>

          <!-- Drawer Content with Date Grouping -->
          <div class="drawer-content">
            @for (group of historyGroups(); track group.label) {
              <div class="history-date-group">
                <div class="group-label">{{ group.label }}</div>
                @for (item of group.items; track item.id) {
                  <div class="history-card" (click)="restoreItem.emit(item)">
                    <div class="card-header">
                      <span class="history-filename">{{ item.filename }}</span>
                      <span class="history-time">{{ item.timestamp | date:'shortTime' }}</span>
                    </div>
                    <div class="history-preview">{{ item.preview }}</div>
                    <div class="card-footer">
                      <span class="history-size">{{ (item.sizeBytes / 1024).toFixed(1) }} KB</span>
                      <div class="card-actions">
                        <button class="card-action-btn restore-btn" (click)="$event.stopPropagation(); restoreItem.emit(item)">
                          Restore
                        </button>
                        <button class="card-action-btn delete-btn" (click)="$event.stopPropagation(); deleteItem.emit(item.id)" title="Delete item">
                          <lucide-icon [img]="TrashIcon" class="icon-xs"></lucide-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-history-container">
                <lucide-icon [img]="ShieldIcon" class="icon-lg opacity-40"></lucide-icon>
                <div class="empty-history-title">No Local History Found</div>
                <div class="empty-history-desc">Formatted payloads will be safely saved locally on this device.</div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensHistoryDrawerComponent {
  isOpen = input<boolean>(false);
  historyGroups = input<HistoryGroup[]>([]);

  closeDrawer = output<void>();
  restoreItem = output<HistoryItem>();
  deleteItem = output<string>();
  clearAllClick = output<void>();

  readonly ShieldIcon = ShieldCheck;
  readonly TrashIcon = Trash2;
  readonly ClearIcon = RotateCcw;
  readonly CloseIcon = X;
}
