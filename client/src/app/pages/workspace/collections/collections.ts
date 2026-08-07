import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';
import { DialogService } from '../../../core/services/dialog.service';

interface CollectionTool {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
}

interface CollectionFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  tools: CollectionTool[];
}

@Component({
  selector: 'app-workspace-collections',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent],
  template: `
    <div class="cl-root">
      <!-- Header -->
      <div class="cl-page-header">
        <div>
          <h1 class="cl-page-title">Custom Collections</h1>
          <p class="cl-page-subtitle">Group tools into custom workspace folders for specific projects or team workflows.</p>
        </div>
        <button (click)="openCreateModal()" class="cl-cta-btn" style="border: none; cursor: pointer;">
          <app-icon name="plus" class="cl-cta-icon" />
          <span>New Collection</span>
        </button>
      </div>

      <!-- Collections 2-Column Grid -->
      <div class="cl-grid">
        @for (folder of folders(); track folder.id) {
          <div class="st-stack-container">
            <div class="st-stack-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="st-stack-color-dot" [style.background]="folder.color"></span>
                <h3 class="st-stack-title">{{ folder.name }}</h3>
              </div>
              <button (click)="deleteFolder(folder)" class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete Collection" style="background: transparent; border: none; cursor: pointer; display: flex;">
                <app-icon name="trash" style="width: 16px; height: 16px;" />
              </button>
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

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <p class="st-stack-desc">{{ folder.description }}</p>
              <button (click)="openViewModal(folder)" style="background: transparent; border: none; font-size: 11px; font-weight: 700; color: #06b6d4; cursor: pointer; white-space: nowrap;">
                View All →
              </button>
            </div>
          </div>
        } @empty {
          <div class="cl-empty">
            <app-icon name="folder" class="cl-empty-icon" />
            <h3>No Custom Collections Yet</h3>
            <p>Organize your tools into folders to keep your daily tasks structured.</p>
            <button (click)="openCreateModal()" class="cl-cta-btn" style="border: none; margin: 16px auto 0;">Create First Collection</button>
          </div>
        }
      </div>

      <!-- Collection Tools View Modal -->
      @if (selectedFolder()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100;">
          <div style="width: 100%; max-width: 480px; border-radius: 12px; background: var(--vercel-card-bg); border: 1px solid var(--vercel-border); padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vercel-border); padding-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="st-stack-color-dot" [style.background]="selectedFolder()!.color"></span>
                <h3 style="font-size: 16px; font-weight: 700; color: var(--vercel-text-primary); margin: 0;">{{ selectedFolder()!.name }}</h3>
              </div>
              <button (click)="closeViewModal()" style="background: transparent; border: none; font-size: 18px; color: var(--vercel-text-muted); cursor: pointer;">&times;</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
              @for (tool of selectedFolder()!.tools; track tool.id) {
                <div style="padding: 10px; border-radius: 6px; border: 1px solid var(--vercel-border); background: var(--vercel-subtle-bg); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <h4 style="font-size: 13px; font-weight: 600; color: var(--vercel-text-primary); margin: 0;">{{ tool.name }}</h4>
                    <p style="font-size: 11px; color: var(--vercel-text-muted); margin: 2px 0 0;">{{ tool.tagline }}</p>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <a [routerLink]="['/workspace/tools/manage', tool.id]" (click)="closeViewModal()" style="font-size: 11px; font-weight: 700; color: #06b6d4; text-decoration: none;">Manage</a>
                    <button (click)="removeToolFromFolder(tool.id)" style="background: transparent; border: none; color: var(--vercel-text-muted); cursor: pointer; padding: 2px;">&times;</button>
                  </div>
                </div>
              } @empty {
                <p style="font-size: 12px; color: var(--vercel-text-muted); text-align: center; padding: 20px 0;">No tools inside this collection.</p>
              }
            </div>

            <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--vercel-border); padding-top: 12px;">
              <button (click)="closeViewModal()" class="cl-secondary-btn" style="cursor: pointer;">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cl-root {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Page Header */
    .cl-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .cl-page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
      margin: 0;
    }
    .cl-page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }
    .cl-cta-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .cl-cta-btn:hover { opacity: 0.85; }
    .cl-cta-icon { width: 14px; height: 14px; }

    /* 2-Column Grid Layout */
    .cl-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .cl-secondary-btn {
      padding: 6px 12px;
      background: transparent;
      color: var(--vercel-text-secondary);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .cl-secondary-btn:hover {
      background: var(--surface-hover);
    }

    .cl-empty {
      grid-column: 1 / -1;
      padding: 60px 24px;
      text-align: center;
      color: var(--vercel-text-muted);
    }

    .cl-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      display: block;
      opacity: 0.4;
    }

    .cl-empty h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0;
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

    @media (max-width: 960px) {
      .cl-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WorkspaceCollectionsComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);
  readonly folders = this.stateSvc.collections;
  readonly selectedFolder = signal<CollectionFolder | null>(null);

  openViewModal(folder: CollectionFolder): void {
    this.selectedFolder.set(folder);
  }

  closeViewModal(): void {
    this.selectedFolder.set(null);
  }

  removeToolFromFolder(toolId: string): void {
    if (!this.selectedFolder()) return;
    this.stateSvc.removeToolFromCollection(this.selectedFolder()!.id, toolId);
    this.selectedFolder.update(f => f ? { ...f, tools: f.tools.filter(t => t.id !== toolId) } : null);
  }

  openCreateModal(): void {
    this.stateSvc.openModal('create_collection');
  }

  deleteFolder(folder: CollectionFolder): void {
    this.dialogSvc.confirm(`Are you sure you want to delete collection "${folder.name}"?`, 'Delete Collection').then(confirmed => {
      if (confirmed) {
        this.stateSvc.removeCollection(folder.id);
      }
    });
  }
}
