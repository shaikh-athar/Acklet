import { Component, ChangeDetectionStrategy, signal, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { VirtualListComponent } from '../../../app/shared/components/virtual-list/virtual-list.component';
import { AirVaultCardComponent } from './airvault-card.component';
import { AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultMotionService } from '../services/airvault-motion.service';

export type FilterTab = 'all' | 'pinned' | 'code' | 'url' | 'image' | 'file' | 'text';

@Component({
  selector: 'app-airvault-stream',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AirVaultCardComponent, VirtualListComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="stream-wrap">

      <!-- Hero: Current Clipboard Item -->
      @if (activeTab() === 'all' && !searchQuery.trim() && latestItem(); as item) {
        <div class="hero-card">
          <div class="hero-header">
            <div class="hero-meta">
              <span class="live-dot"></span>
              <span class="hero-label">SYNCHRONIZED CLIPBOARD</span>
              <span class="source-chip">
                <app-icon name="user" class="icon-xs"></app-icon>
                <span>{{ item.originOwnerId ? ('@' + item.originOwnerId) : (item.senderDeviceName?.startsWith('@') ? item.senderDeviceName : ('@' + item.senderDeviceName)) }}</span>
              </span>
            </div>
            <button class="av-btn-icon" (click)="onCopyHero(item.content.raw, $event)" aria-label="Copy to clipboard">
              <app-icon name="copy" class="icon-xs"></app-icon>
            </button>
          </div>

          <div class="hero-preview">
            @if (item.content.isSensitive && !item.isRevealed) {
              <div class="hero-masked" (click)="toggleReveal.emit(item.id)">
                <app-icon name="lock" class="icon-xs"></app-icon>
                <span>{{ item.content.sensitiveType || 'PROTECTED CREDENTIAL' }} · Click to reveal</span>
              </div>
            } @else {
              <code class="hero-code">{{ item.content.raw | slice:0:360 }}{{ item.content.raw.length > 360 ? '…' : '' }}</code>
            }
          </div>

          <!-- 4-step lifecycle tracker -->
          <div class="lifecycle">
            <div class="stage done">
              <span class="stage-pip"><app-icon name="check" class="icon-xs"></app-icon></span>
              <span>Captured</span>
            </div>
            <div class="stage-line done"></div>
            <div class="stage done">
              <span class="stage-pip"><app-icon name="lock" class="icon-xs"></app-icon></span>
              <span>Secured</span>
            </div>
            <div class="stage-line done"></div>
            <div class="stage done">
              <span class="stage-pip"><app-icon name="zap" class="icon-xs"></app-icon></span>
              <span>Beamed</span>
            </div>
            <div class="stage-line" [class.done]="item.deliveryStatus === 'delivered'"></div>
            <div class="stage" [class.done]="item.deliveryStatus === 'delivered'">
              <span class="stage-pip"><app-icon name="check-check" class="icon-xs"></app-icon></span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      }

      <!-- Filter Toolbar -->
      <div class="stream-bar">
        <div class="seg-group" role="tablist">
          @for (tab of filterTabs; track tab.id) {
            <button
              class="seg-tab"
              role="tab"
              [class.seg-tab-active]="activeTab() === tab.id"
              (click)="setTab(tab.id)"
              [attr.data-tooltip]="tab.label"
            >
              <app-icon [name]="tab.icon" class="icon-xs"></app-icon>
              <span>{{ tab.label }}</span>
              <span class="seg-count">{{ countTab(tab.id) }}</span>
            </button>
          }
        </div>

        <div class="search-box">
          <app-icon name="search" class="icon-xs search-icon"></app-icon>
          <input
            type="text"
            class="search-input"
            [(ngModel)]="searchQuery"
            placeholder="Search…"
          />
          @if (searchQuery.trim()) {
            <button class="search-clear" (click)="searchQuery = ''" data-tooltip="Clear">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          }
        </div>
      </div>

        <!-- Stream List -->
        <div class="stream-list">
          @if (filteredItems().length === 0) {
            <div class="stream-empty">
              <div class="empty-icon">
                <app-icon name="inbox" class="icon-sm"></app-icon>
              </div>
              <h4 class="empty-title">No items</h4>
              <p class="empty-sub">Beamed or captured items appear here automatically.</p>
            </div>
          } @else if (filteredItems().length > 25) {
            <!-- Virtualized Windowed Stream for large history -->
            <div class="stream-virtual-container">
              <app-virtual-list
                [items]="filteredItems()"
                [itemHeight]="88"
                [buffer]="5">
                <ng-template let-item>
                  <app-airvault-card
                    [item]="item"
                    (togglePin)="togglePin.emit($event)"
                    (toggleReveal)="toggleReveal.emit($event)"
                    (deleteItem)="deleteItem.emit($event)"
                    (resendItem)="resendItem.emit($event)"
                    (triggerToast)="triggerToast.emit($event)"
                  ></app-airvault-card>
                </ng-template>
              </app-virtual-list>
            </div>
          } @else {
            @for (item of filteredItems(); track item.id) {
              <app-airvault-card
                [item]="item"
                (togglePin)="togglePin.emit($event)"
                (toggleReveal)="toggleReveal.emit($event)"
                (deleteItem)="deleteItem.emit($event)"
                (resendItem)="resendItem.emit($event)"
                (triggerToast)="triggerToast.emit($event)"
              ></app-airvault-card>
            }
          }
        </div>
      </div>
  `,
  styles: [`
    .stream-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Hero card */
    .hero-card {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md);
      padding: 12px 14px;
      box-shadow: var(--av-shadow-sm);
    }

    .hero-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .hero-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2196F3;
      flex-shrink: 0;
    }
    .hero-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--av-text-muted);
    }
    .source-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--av-text-muted);
      background: var(--av-surface-secondary);
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid var(--av-border);
    }
    .source-chip app-icon { color: var(--av-text-muted); }

    .hero-preview { margin-bottom: 10px; }
    .hero-code {
      display: block;
      font-family: var(--av-clipboard-font-family, var(--av-font-mono));
      font-size: var(--av-clipboard-font-size, 12px);
      color: var(--av-text-primary);
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 6px;
      padding: 8px 12px;
      max-height: 80px;
      overflow-y: auto;
      word-break: break-all;
      line-height: 1.55;
    }
    .hero-masked {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--av-surface-secondary);
      border: 1px dashed var(--av-border);
      border-radius: 6px;
      color: var(--av-text-muted);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .hero-masked app-icon { color: var(--av-text-muted); }

    /* Lifecycle tracker */
    .lifecycle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--av-border-subtle);
    }
    .stage {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-faint);
      white-space: nowrap;
    }
    .stage.done { color: var(--av-text-primary); }
    .stage-pip {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--av-text-faint);
    }
    .stage.done .stage-pip { background: #2196F3; border-color: #2196F3; color: #fff; }
    .stage-line { flex: 1; height: 1px; background: var(--av-border); min-width: 8px; }
    .stage-line.done { background: #2196F3; }

    /* Filter bar */
    .stream-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .seg-group {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 6px;
      padding: 2px;
    }
    .seg-tab {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 24px;
      padding: 0 8px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--av-text-muted);
      font-family: var(--av-font-ui);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      box-sizing: border-box;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .seg-tab app-icon { color: inherit; }
    .seg-tab:hover { background: var(--av-surface-secondary); color: var(--av-text-primary); }
    .seg-tab.seg-tab-active { background: rgba(33,150,243,0.10); color: #2196F3; }
    .seg-count { font-size: 10px; font-weight: 700; opacity: 0.7; }

    .search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 6px;
      padding: 0 10px;
      flex: 1;
      max-width: 220px;
      box-sizing: border-box;
    }
    .search-icon {
      color: var(--av-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      line-height: 1;
      margin: 0;
    }
    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--av-text-primary);
      font-family: var(--av-font-ui);
      font-size: 12px;
      width: 100%;
    }
    .search-input::placeholder { color: var(--av-text-faint); }
    .search-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
    }
    .search-clear:hover { color: var(--av-text-primary); }

    /* Stream list */
    .stream-list { display: flex; flex-direction: column; gap: 8px; }
    .stream-virtual-container { height: 420px; width: 100%; position: relative; }

    /* Empty state */
    .stream-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 36px 16px;
      text-align: center;
      border: 1px dashed var(--av-border);
      border-radius: var(--av-radius-md);
      background: var(--av-surface-primary);
    }
    .empty-icon {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--av-text-muted);
      margin-bottom: 10px;
    }
    .empty-title { font-size: 13.5px; font-weight: 600; color: var(--av-text-primary); margin: 0 0 4px; opacity: 0.85; }
    .empty-sub   { font-size: 11.5px; color: var(--av-text-muted); margin: 0; opacity: 0.75; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultStreamComponent {
  motion = inject(AirVaultMotionService);

  items = input.required<AirVaultItem[]>();
  togglePin = output<string>();
  toggleReveal = output<string>();
  deleteItem = output<string>();
  resendItem = output<AirVaultItem>();
  clearAllItems = output<void>();
  triggerToast = output<string>();

  searchQuery = '';
  activeTab = signal<FilterTab>('all');

  readonly filterTabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'layers' },
    { id: 'pinned', label: 'Pinned', icon: 'pin' },
    { id: 'code', label: 'Code', icon: 'code' },
    { id: 'url', label: 'Links', icon: 'link' },
    { id: 'image', label: 'Images', icon: 'file' },
    { id: 'file', label: 'Files', icon: 'file-text' },
    { id: 'text', label: 'Text', icon: 'type' },
  ];

  filteredItems = computed(() => {
    let list = this.items();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) list = list.filter(i =>
      i.content.raw.toLowerCase().includes(q) ||
      i.senderDeviceName.toLowerCase().includes(q) ||
      (i.content.language?.toLowerCase().includes(q))
    );
    const tab = this.activeTab();
    if (tab === 'pinned') return list.filter(i => i.isPinned);
    if (tab !== 'all') return list.filter(i => i.content.category === tab);
    return list;
  });

  latestItem = computed(() => this.items()[0] ?? null);

  setTab(tab: FilterTab) { this.activeTab.set(tab); }

  async onCopyHero(text: string, e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      await navigator.clipboard.writeText(text);
      this.triggerToast.emit('Copied to clipboard');
    } catch { }
  }

  countTab(tab: FilterTab): number {
    if (tab === 'all') return this.items().length;
    if (tab === 'pinned') return this.items().filter(i => i.isPinned).length;
    return this.items().filter(i => i.content.category === tab).length;
  }
}
