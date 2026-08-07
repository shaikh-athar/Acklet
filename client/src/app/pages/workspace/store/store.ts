import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService, StoreItem } from '../../../core/services/workspace-state.service';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-workspace-store',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="st-wrapper">
      <!-- Header -->
      <div class="st-header">
        <div class="st-title-wrap">
          <h1 class="st-title">Workspace Store</h1>
          <p class="st-subtitle">All tools you've interacted with, downloaded assets, collections, and currently active files.</p>
        </div>
        <div class="st-actions">
          <button (click)="toggleSimulationPanel()" class="st-sim-btn">
            <app-icon name="sparkles" class="st-icon-sm" />
            <span>Simulate Action</span>
          </button>
        </div>
      </div>

      <!-- Simulation Modal Panel -->
      <div *ngIf="showSimPanel()" class="st-sim-panel">
        <div class="st-sim-header">
          <h3>Simulation Control Panel</h3>
          <button (click)="showSimPanel.set(false)"><app-icon name="x" /></button>
        </div>
        <div class="st-sim-body">
          <div class="st-form-group">
            <label>Item Name</label>
            <input type="text" [(ngModel)]="newItemName" placeholder="e.g. users-list.csv, package.json" />
          </div>
          <div class="st-form-group">
            <label>Type</label>
            <select [(ngModel)]="newItemType">
              <option value="tool_used">Tool Used</option>
              <option value="file_downloaded">File Downloaded</option>
              <option value="file_edited">File Edited</option>
              <option value="working_on">Working On (Active File)</option>
            </select>
          </div>
          <div class="st-form-group" *ngIf="newItemType !== 'tool_used'">
            <label>File Size</label>
            <input type="text" [(ngModel)]="newItemSize" placeholder="e.g. 15 KB, 2.4 MB" />
          </div>
          <div class="st-form-group" *ngIf="newItemType === 'tool_used'">
            <label>Category</label>
            <input type="text" [(ngModel)]="newItemCategory" placeholder="e.g. Security, Database" />
          </div>
          <button (click)="createSimulatedItem()" class="st-create-btn">Add to Store</button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="st-filter-row">
        <div class="st-search-box">
          <app-icon name="search" class="st-search-icon" />
          <input type="text" [(ngModel)]="searchQuery" placeholder="Search by name or category..." />
        </div>
        <div class="st-tabs">
          <button 
            [class.active]="activeTab() === 'all'" 
            (click)="activeTab.set('all')"
          >
            All Items
          </button>
          <button 
            [class.active]="activeTab() === 'collections'" 
            (click)="activeTab.set('collections')"
          >
            Collections
          </button>
          <button 
            [class.active]="activeTab() === 'tool_used'" 
            (click)="activeTab.set('tool_used')"
          >
            Tools Used
          </button>
          <button 
            [class.active]="activeTab() === 'file_downloaded'" 
            (click)="activeTab.set('file_downloaded')"
          >
            Downloaded Files
          </button>
          <button 
            [class.active]="activeTab() === 'file_edited'" 
            (click)="activeTab.set('file_edited')"
          >
            Edited Files
          </button>
          <button 
            [class.active]="activeTab() === 'working_on'" 
            (click)="activeTab.set('working_on')"
          >
            Working On
          </button>
        </div>
      </div>

      <!-- Normal Items Grid -->
      <div class="st-grid" *ngIf="activeTab() !== 'collections'">
        @for (item of filteredItems(); track item.id) {
          <div class="st-card" [ngClass]="item.type">
            <div class="st-card-top">
              <div class="st-badge-icon" [ngClass]="item.type">
                <app-icon [name]="getIconName(item.type)" />
              </div>
              <span class="st-item-type">{{ getFriendlyType(item.type) }}</span>
              <button (click)="removeItem(item.id)" class="st-delete-btn" title="Delete from store">
                <app-icon name="trash" />
              </button>
            </div>
            
            <div class="st-card-content">
              <h3 class="st-item-name">{{ item.name }}</h3>
              <p class="st-item-meta" *ngIf="item.size">Size: {{ item.size }}</p>
              <p class="st-item-meta" *ngIf="item.category">Category: {{ item.category }}</p>
            </div>

            <div class="st-card-footer">
              <span class="st-activity">{{ item.lastActivity }}</span>
              <div class="st-card-actions">
                @if (item.type === 'tool_used') {
                  <a routerLink="/workspace/tools" class="st-action-btn primary">Launch Tool</a>
                } @else if (item.type === 'file_downloaded') {
                  <button (click)="simulateDownload(item)" class="st-action-btn">Redownload</button>
                } @else {
                  <button (click)="simulateEdit(item)" class="st-action-btn">Open Editor</button>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="st-empty">
            <app-icon name="store" class="st-empty-icon" />
            <h3>No items match your filter</h3>
            <p>Try searching for a different keyword or simulate adding items above.</p>
          </div>
        }
      </div>

      <!-- Collections Stacked Grid -->
      <div class="st-grid" *ngIf="activeTab() === 'collections'">
        @for (folder of collections(); track folder.id) {
          <div class="st-stack-container">
            <div class="st-stack-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="st-stack-color-dot" [style.background]="folder.color"></span>
                <h3 class="st-stack-title">{{ folder.name }}</h3>
              </div>
              <span class="st-stack-count">{{ folder.tools.length }} Tools</span>
            </div>

            <!-- The Card Stack -->
            <div class="st-card-deck">
              @if (folder.tools.length === 0) {
                <div class="st-deck-card empty-deck-card">
                  <app-icon name="folder" class="st-deck-icon" [style.color]="folder.color" />
                  <p>Empty Collection</p>
                </div>
              } @else {
                @for (tool of folder.tools; track tool.id; let idx = $index) {
                  <div 
                    class="st-deck-card"
                    [style.z-index]="10 - idx"
                    [ngStyle]="{
                      'transform': 'translateY(' + (idx * 10) + 'px) scale(' + (1 - idx * 0.04) + ')',
                      'opacity': 1 - (idx * 0.15)
                    }"
                  >
                    <div class="st-deck-card-top">
                      <app-icon name="box" class="st-deck-tool-icon" />
                      <span class="st-deck-tool-cat">{{ tool.category }}</span>
                    </div>
                    <h4 class="st-deck-tool-name">{{ tool.name }}</h4>
                    <p class="st-deck-tool-desc">{{ tool.tagline }}</p>
                    <div class="st-deck-footer">
                      <a [routerLink]="['/workspace/tools/manage', tool.id]" class="st-deck-launch-btn">Manage</a>
                    </div>
                  </div>
                }
              }
            </div>

            <p class="st-stack-desc">{{ folder.description }}</p>
          </div>
        } @empty {
          <div class="st-empty">
            <app-icon name="folder" class="st-empty-icon" />
            <h3>No custom collections found</h3>
            <p>Create a collection from the Navbar to group your tools.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .st-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .st-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }

    .st-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .st-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    .st-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }

    .st-actions {
      display: flex;
      gap: 12px;
    }

    .st-sim-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 6px;
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    .st-sim-btn:hover {
      opacity: 0.9;
    }

    .st-icon-sm {
      width: 14px;
      height: 14px;
    }

    /* Sim panel */
    .st-sim-panel {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      animation: slideDown 0.2s ease-out;
    }

    .st-sim-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .st-sim-header h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }

    .st-sim-header button {
      background: transparent;
      border: none;
      color: var(--vercel-text-muted);
      cursor: pointer;
    }

    .st-sim-body {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) 120px;
      gap: 12px;
      align-items: flex-end;
    }

    .st-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .st-form-group label {
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-muted);
    }

    .st-form-group input, .st-form-group select {
      padding: 8px 10px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      color: var(--vercel-text-primary);
      font-size: 13px;
      outline: none;
    }

    .st-create-btn {
      padding: 8px 14px;
      border-radius: 6px;
      background: #06b6d4;
      color: #fff;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Filter Row */
    .st-filter-row {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .st-search-box {
      position: relative;
      width: 100%;
      max-width: 400px;
    }

    .st-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }

    .st-search-box input {
      width: 100%;
      padding: 8px 12px 8px 32px;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      color: var(--vercel-text-primary);
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }

    .st-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--vercel-border);
      padding-bottom: 1px;
    }

    .st-tabs button {
      background: transparent;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vercel-text-secondary);
      cursor: pointer;
      position: relative;
    }

    .st-tabs button:hover {
      color: var(--vercel-text-primary);
    }

    .st-tabs button.active {
      color: var(--vercel-text-primary);
      font-weight: 600;
    }

    .st-tabs button.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--vercel-text-primary);
    }

    /* Grid layout */
    .st-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .st-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }

    .st-card:hover {
      transform: translateY(-2px);
      border-color: #06b6d4;
    }

    .st-card-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .st-badge-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .st-badge-icon.tool_used {
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
    }

    .st-badge-icon.file_downloaded {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .st-badge-icon.file_edited {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .st-badge-icon.working_on {
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }

    .st-item-type {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vercel-text-muted);
      flex: 1;
    }

    .st-delete-btn {
      background: transparent;
      border: none;
      color: var(--vercel-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .st-delete-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .st-card-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .st-item-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    .st-item-meta {
      font-size: 12px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }

    .st-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--vercel-border-subtle);
    }

    .st-activity {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }

    .st-card-actions {
      display: flex;
      gap: 8px;
    }

    .st-action-btn {
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      border: 1px solid var(--vercel-border);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .st-action-btn:hover {
      background: var(--surface-hover);
    }

    .st-action-btn.primary {
      background: #06b6d4;
      color: #fff;
      border-color: #06b6d4;
    }

    .st-action-btn.primary:hover {
      opacity: 0.9;
    }

    /* Stacked Collection Styles */
    .st-stack-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      transition: border-color 0.2s;
    }

    .st-stack-container:hover {
      border-color: var(--vercel-border-active);
    }

    .st-stack-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .st-stack-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .st-stack-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    .st-stack-count {
      font-size: 11px;
      font-weight: 700;
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-secondary);
      padding: 2px 8px;
      border-radius: 99px;
    }

    .st-card-deck {
      position: relative;
      height: 190px;
      margin-top: 8px;
      cursor: pointer;
    }

    .st-deck-card {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 160px;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), 
                  z-index 0.3s ease, 
                  opacity 0.3s ease,
                  box-shadow 0.3s ease;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }

    .st-deck-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .st-deck-tool-icon {
      width: 16px;
      height: 16px;
      color: var(--vercel-text-muted);
    }

    .st-deck-tool-cat {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vercel-text-muted);
    }

    .st-deck-tool-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 6px 0 2px;
    }

    .st-deck-tool-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 0 0 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .st-deck-footer {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 8px;
    }

    .st-deck-launch-btn {
      font-size: 11px;
      font-weight: 700;
      color: #06b6d4;
      text-decoration: none;
    }

    .st-deck-launch-btn:hover {
      text-decoration: underline;
    }

    .empty-deck-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--vercel-text-muted);
      font-size: 12px;
      text-align: center;
    }

    .st-deck-icon {
      width: 24px;
      height: 24px;
    }

    .st-stack-desc {
      font-size: 12px;
      color: var(--vercel-text-secondary);
      margin: 0;
      line-clamp: 2;
    }

    /* Deck hover states - fanning out */
    .st-card-deck:hover .st-deck-card:nth-child(1) {
      transform: translateY(-12px) rotate(-2deg) scale(1) !important;
      opacity: 1 !important;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }

    .st-card-deck:hover .st-deck-card:nth-child(2) {
      transform: translateY(6px) rotate(1deg) scale(0.98) !important;
      opacity: 0.95 !important;
      box-shadow: 0 6px 15px rgba(0,0,0,0.06);
    }

    .st-card-deck:hover .st-deck-card:nth-child(3) {
      transform: translateY(24px) rotate(3deg) scale(0.95) !important;
      opacity: 0.85 !important;
    }

    .st-card-deck:hover .st-deck-card:nth-child(4) {
      transform: translateY(42px) rotate(-1deg) scale(0.92) !important;
      opacity: 0.75 !important;
    }

    /* Bring hovered card to very top */
    .st-deck-card:hover {
      z-index: 50 !important;
      transform: translateY(-20px) scale(1.03) !important;
      border-color: #06b6d4 !important;
      opacity: 1 !important;
      box-shadow: 0 12px 28px rgba(6, 182, 212, 0.2) !important;
    }

    /* Empty state */
    .st-empty {
      grid-column: 1 / -1;
      padding: 60px 24px;
      text-align: center;
      color: var(--vercel-text-muted);
    }

    .st-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      display: block;
      opacity: 0.4;
    }

    .st-empty h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0 0 8px;
    }

    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class WorkspaceStoreComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);

  readonly searchQuery = signal('');
  readonly activeTab = signal<'all' | 'tool_used' | 'file_downloaded' | 'file_edited' | 'working_on' | 'collections'>('all');
  readonly showSimPanel = signal(false);
  readonly collections = this.stateSvc.collections;

  // Form values for simulation
  newItemName = '';
  newItemType = 'file_downloaded';
  newItemSize = '10 KB';
  newItemCategory = 'Security';

  readonly filteredItems = computed(() => {
    let list = this.stateSvc.storeItems();

    // Filter by type tab
    if (this.activeTab() !== 'all' && this.activeTab() !== 'collections') {
      list = list.filter(item => item.type === this.activeTab());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  toggleSimulationPanel(): void {
    this.showSimPanel.update(v => !v);
  }

  createSimulatedItem(): void {
    if (!this.newItemName.trim()) return;

    this.stateSvc.addStoreItem({
      name: this.newItemName.trim(),
      type: this.newItemType as any,
      size: this.newItemType !== 'tool_used' ? this.newItemSize.trim() : undefined,
      category: this.newItemType === 'tool_used' ? this.newItemCategory.trim() : undefined
    });

    this.newItemName = '';
    this.showSimPanel.set(false);
  }

  removeItem(id: string): void {
    this.stateSvc.removeStoreItem(id);
  }

  getIconName(type: string): string {
    switch (type) {
      case 'tool_used': return 'box';
      case 'file_downloaded': return 'download';
      case 'file_edited': return 'edit';
      case 'working_on': return 'file-text';
      default: return 'file';
    }
  }

  getFriendlyType(type: string): string {
    switch (type) {
      case 'tool_used': return 'Tool Used';
      case 'file_downloaded': return 'Downloaded';
      case 'file_edited': return 'Edited File';
      case 'working_on': return 'Working On';
      default: return 'Item';
    }
  }

  simulateDownload(item: StoreItem): void {
    this.dialogSvc.alert(`Simulating redownload of "${item.name}"...`, 'Store Simulation');
    this.stateSvc.addStoreItem({
      name: item.name,
      type: 'file_downloaded',
      size: item.size
    });
  }

  simulateEdit(item: StoreItem): void {
    this.dialogSvc.alert(`Opening inline simulator editor for "${item.name}"...`, 'Store Simulation');
    this.stateSvc.addStoreItem({
      name: item.name,
      type: 'file_edited',
      size: item.size
    });
  }
}
