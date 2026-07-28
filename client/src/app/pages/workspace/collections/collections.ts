import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

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
  imports: [RouterLink, CommonModule, FormsModule, IconComponent, SpotlightDirective],
  template: `
    <div class="collections-root page-enter space-y-8 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Custom Collections</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Group tools into custom workspace folders for specific projects or team workflows.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary px-5 py-2.5 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-2 cursor-pointer transition-all">
          <app-icon name="plus" class="size-4"></app-icon>
          New Collection
        </button>
      </div>

      <!-- Collections Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (folder of folders(); track folder.id) {
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="size-11 rounded-xl flex items-center justify-center border" [style.backgroundColor]="folder.color + '15'" [style.borderColor]="folder.color + '40'">
                  <app-icon name="folder" class="size-6" [style.color]="folder.color" />
                </div>
                <button (click)="deleteFolder(folder)" class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete Collection">
                  <app-icon name="trash" class="size-4" />
                </button>
              </div>

              <div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ folder.name }}</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{{ folder.description }}</p>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ folder.tools.length }} tools inside</span>
              <button (click)="openViewModal(folder)" class="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1">
                View Tools <app-icon name="arrow-right" class="size-3.5" />
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 space-y-3">
            <app-icon name="folder" class="size-10 text-slate-400 mx-auto" />
            <h3 class="text-base font-bold text-slate-900 dark:text-white">No Custom Collections Yet</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Organize your tools into folders to keep your daily development tasks structured.</p>
            <button (click)="openCreateModal()" class="btn px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 text-white">Create First Collection</button>
          </div>
        }
      </div>

      <!-- Collection Tools View Modal -->
      @if (selectedFolder()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div class="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-6 text-slate-900 dark:text-white">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div class="flex items-center gap-3">
                <div class="size-9 rounded-xl flex items-center justify-center border" [style.backgroundColor]="selectedFolder()!.color + '15'" [style.borderColor]="selectedFolder()!.color + '40'">
                  <app-icon name="folder" class="size-5" [style.color]="selectedFolder()!.color" />
                </div>
                <div>
                  <h3 class="text-lg font-bold">{{ selectedFolder()!.name }}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ selectedFolder()!.tools.length }} solutions contained</p>
                </div>
              </div>
              <button (click)="closeViewModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <app-icon name="x" class="size-5" />
              </button>
            </div>

            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
              @for (tool of selectedFolder()!.tools; track tool.id) {
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 dark:text-white">{{ tool.name }}</h4>
                    <p class="text-xxs text-slate-500 dark:text-slate-400">{{ tool.tagline }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <a [routerLink]="['/tools', tool.slug]" (click)="closeViewModal()" class="px-3 py-1 text-xxs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">
                      Launch
                    </a>
                    <button (click)="removeToolFromFolder(tool.id)" class="p-1 text-slate-400 hover:text-rose-500" title="Remove from collection">
                      <app-icon name="x" class="size-3.5" />
                    </button>
                  </div>
                </div>
              } @empty {
                <p class="text-center text-xs text-slate-500 dark:text-slate-400 py-6">No tools in this collection. Add tools from any solution page.</p>
              }
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <button (click)="closeViewModal()" class="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- Create New Collection Modal -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div class="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-6 text-slate-900 dark:text-white">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <h3 class="text-lg font-bold">New Collection Folder</h3>
              <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <app-icon name="x" class="size-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Collection Name *</label>
                <input [(ngModel)]="newFolderName" type="text" placeholder="e.g. API Security Suite" class="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea [(ngModel)]="newFolderDesc" rows="2" placeholder="Brief summary of tools grouped here" class="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"></textarea>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Folder Tag Color</label>
                <div class="flex items-center gap-3">
                  @for (c of availableColors; track c) {
                    <button (click)="newFolderColor = c" type="button" class="size-7 rounded-full border-2 transition-transform" [style.backgroundColor]="c" [class.scale-125]="newFolderColor === c" [class.border-white]="newFolderColor === c" [class.border-transparent]="newFolderColor !== c"></button>
                  }
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button (click)="closeCreateModal()" class="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">Cancel</button>
              <button (click)="saveFolder()" [disabled]="!newFolderName.trim()" class="px-5 py-2.5 text-xs font-bold rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-md cursor-pointer disabled:opacity-50">Create Folder</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .text-xxs { font-size: 0.65rem; }
  `]
})
export class WorkspaceCollectionsComponent {
  readonly folders = signal<CollectionFolder[]>([
    {
      id: '1',
      name: 'Identity & JWT Toolkit',
      description: 'Tools relating to authorization payload checks, RS256 signature matching, and claim validation.',
      color: '#06b6d4',
      tools: [
        { id: '1', name: 'JWT Inspector', slug: 'jwt-inspector', tagline: 'Parse and validate RS256/HS256 claims payload', category: 'Security' },
        { id: '3', name: 'Base64 Decoder', slug: 'base64-tool', tagline: 'Decode base64 encoded token strings', category: 'Developer Tools' }
      ]
    },
    {
      id: '2',
      name: 'JSON & SQL Formatters',
      description: 'Beautifiers and query syntax formatters used for cleaning database responses.',
      color: '#8b5cf6',
      tools: [
        { id: '2', name: 'JSON Formatter', slug: 'json-formatter', tagline: 'Clean, format, and validate JSON data structures', category: 'Formatters' },
        { id: '4', name: 'SQL Query Formatter', slug: 'sql-formatter', tagline: 'Format PostgreSQL and MySQL queries', category: 'Formatters' }
      ]
    }
  ]);

  readonly selectedFolder = signal<CollectionFolder | null>(null);
  readonly showCreateModal = signal<boolean>(false);

  newFolderName = '';
  newFolderDesc = '';
  newFolderColor = '#06b6d4';
  readonly availableColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

  openViewModal(folder: CollectionFolder): void {
    this.selectedFolder.set(folder);
  }

  closeViewModal(): void {
    this.selectedFolder.set(null);
  }

  removeToolFromFolder(toolId: string): void {
    if (!this.selectedFolder()) return;
    const folderId = this.selectedFolder()!.id;
    this.folders.update(list => list.map(f => {
      if (f.id === folderId) {
        return { ...f, tools: f.tools.filter(t => t.id !== toolId) };
      }
      return f;
    }));
    this.selectedFolder.update(f => f ? { ...f, tools: f.tools.filter(t => t.id !== toolId) } : null);
  }

  openCreateModal(): void {
    this.newFolderName = '';
    this.newFolderDesc = '';
    this.newFolderColor = '#06b6d4';
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveFolder(): void {
    if (!this.newFolderName.trim()) return;
    const newFolder: CollectionFolder = {
      id: crypto.randomUUID(),
      name: this.newFolderName.trim(),
      description: this.newFolderDesc.trim() || 'Custom created developer collection folder.',
      color: this.newFolderColor,
      tools: []
    };
    this.folders.update(list => [...list, newFolder]);
    this.closeCreateModal();
  }

  deleteFolder(folder: CollectionFolder): void {
    if (confirm(`Are you sure you want to delete collection "${folder.name}"?`)) {
      this.folders.update(list => list.filter(f => f.id !== folder.id));
    }
  }
}
