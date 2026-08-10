import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface RepositoryItem {
  id: string;
  name: string;
  provider: string;
  branch: string;
  visibility: 'Public' | 'Private';
  framework: string;
  language: string;
  description?: string;
  lastSync: string;
  syncStatus: 'Synced' | 'Syncing' | 'Failed';
  toolStatus: 'Published' | 'Draft' | 'Not Generated';
}

export interface WorkspaceTool {
  id: string;
  name: string;
  slug: string;
  repositoryId?: string;
  description: string;
  lang: string;
  langColor: string;
  status: 'Published' | 'Draft' | 'In Review';
  branch?: string;
  lastCommit?: string;
  downloads: number;
  stars: number;
  lastUpdated: string;
}

export interface CollectionTool {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
}

export interface CollectionFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  tools: CollectionTool[];
}

export interface StoreItem {
  id: string;
  name: string;
  type: 'tool_used' | 'file_downloaded' | 'file_edited' | 'working_on';
  category?: string;
  lastActivity: string;
  size?: string;
  status?: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  private readonly http = inject(HttpClient);

  readonly repos = signal<RepositoryItem[]>([]);
  readonly tools = signal<WorkspaceTool[]>([]);
  readonly collections = signal<CollectionFolder[]>(
    JSON.parse(localStorage.getItem('acklet:collections') ?? '[]')
  );
  readonly storeItems = signal<StoreItem[]>([]);
  readonly activeModal = signal<'add_tool' | 'create_collection' | null>(null);

  constructor() {
    this.refreshRepos();
    this.refreshTools();
  }

  refreshTools(): void {
    this.http.get<any>(`${API_BASE}/tools/search?size=100`).subscribe({
      next: (res) => {
        if (res?.data?.content) {
          const mapped: WorkspaceTool[] = res.data.content.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            repositoryId: t.repositoryId,
            description: t.description || t.tagline || '',
            lang: t.runtime || 'nodejs',
            langColor: '#6366f1',
            status: t.status === 'ACTIVE' ? 'Published' : 'Draft',
            branch: t.branch || 'main',
            lastCommit: t.lastCommitSha ? t.lastCommitSha.substring(0, 7) : 'main',
            downloads: t.usageCount || 0,
            stars: t.upvoteCount || 0,
            lastUpdated: 'Just now'
          }));
          this.tools.set(mapped);
        } else {
          this.tools.set([]);
        }
      },
      error: () => {
        this.tools.set([]);
      }
    });
  }

  refreshRepos(): void {
    this.http.get<any>(`${API_BASE}/projects?size=100`).subscribe({
      next: (res) => {
        if (res?.data?.content) {
          const mapped: RepositoryItem[] = res.data.content
            .filter((repo: any) => repo.id && repo.fullName)
            .map((repo: any) => ({
              id: repo.id,
              name: repo.fullName,
              provider: (repo.provider || 'github').toLowerCase(),
              branch: repo.defaultBranch || 'main',
              visibility: repo.isPrivate ? 'Private' : 'Public',
              framework: repo.framework || 'Unknown',
              language: repo.primaryLanguage || repo.language || 'Unknown',
              description: repo.description || '',
              lastSync: 'Just now',
              syncStatus: repo.statusTreeAnalyzed ? 'Synced' : 'Syncing',
              toolStatus: repo.statusAiAnalyzed ? 'Published' : 'Importing'
            }));
          this.repos.set(mapped);
        } else {
          this.repos.set([]);
        }
      },
      error: () => {
        this.repos.set([]);
      }
    });
  }

  // Modal actions
  openModal(type: 'add_tool' | 'create_collection'): void {
    this.activeModal.set(type);
  }
  closeModal(): void {
    this.activeModal.set(null);
  }

  // Repository remove (local + calls DELETE API)
  removeRepository(id: string): void {
    this.http.delete<any>(`${API_BASE}/projects/${id}`).subscribe({
      next: () => {
        this.repos.update(list => list.filter(r => r.id !== id));
        this.refreshRepos();
      },
      error: (err) => {
        console.error('Failed to disconnect repository:', err);
        // Fallback local update to keep UI responsive
        this.repos.update(list => list.filter(r => r.id !== id));
        this.refreshRepos();
      }
    });
  }

  unlinkRepository(id: string): void {
    this.http.post<any>(`${API_BASE}/projects/${id}/unlink`, {}).subscribe({
      next: () => {
        this.repos.update(list => list.map(r => r.id === id ? { ...r, toolStatus: 'Not Generated' } : r));
        this.refreshRepos();
      },
      error: (err) => {
        console.error('Failed to unlink repository:', err);
        this.repos.update(list => list.map(r => r.id === id ? { ...r, toolStatus: 'Not Generated' } : r));
        this.refreshRepos();
      }
    });
  }

  // Collections (kept local, user-defined)
  addCollection(name: string, description: string, color: string): void {
    const newFolder: CollectionFolder = {
      id: crypto.randomUUID(),
      name,
      description: description || 'Custom collection.',
      color,
      tools: []
    };
    this.collections.update(list => [newFolder, ...list]);
    this._saveCollections();
  }

  removeCollection(id: string): void {
    this.collections.update(list => list.filter(c => c.id !== id));
    this._saveCollections();
  }

  addToolToCollection(collectionId: string, tool: CollectionTool): void {
    this.collections.update(list => list.map(c => {
      if (c.id === collectionId) {
        if (c.tools.some(t => t.id === tool.id)) return c;
        return { ...c, tools: [...c.tools, tool] };
      }
      return c;
    }));
    this._saveCollections();
  }

  removeToolFromCollection(collectionId: string, toolId: string): void {
    this.collections.update(list => list.map(c => {
      if (c.id === collectionId) return { ...c, tools: c.tools.filter(t => t.id !== toolId) };
      return c;
    }));
    this._saveCollections();
  }

  private _saveCollections(): void {
    localStorage.setItem('acklet:collections', JSON.stringify(this.collections()));
  }

  // Stub methods to keep existing callers compiling
  openModal_alt = this.openModal;
  deleteToolAndRepo(toolId: string, slug: string, repositoryId?: string, detachRepo = false): void {
    if (detachRepo && repositoryId) {
      this.http.post<any>(`${API_BASE}/projects/${repositoryId}/unlink`, {}).subscribe({
        next: () => {
          this._deleteToolOnly(slug);
          this.unlinkRepository(repositoryId);
        },
        error: (err) => {
          console.error('Failed to detach repository:', err);
          this._deleteToolOnly(slug);
          this.unlinkRepository(repositoryId);
        }
      });
    } else {
      if (repositoryId) {
        this.http.post<any>(`${API_BASE}/projects/${repositoryId}/unlink`, {}).subscribe({
          next: () => {
            this._deleteToolOnly(slug, repositoryId);
          },
          error: (err) => {
            console.error('Failed to unlink repository before deletion:', err);
            this._deleteToolOnly(slug, repositoryId);
          }
        });
      } else {
        this._deleteToolOnly(slug);
      }
    }
  }

  private _deleteToolOnly(slug: string, repositoryIdToDelete?: string): void {
    this.http.delete<any>(`${API_BASE}/tools/${slug}`).subscribe({
      next: () => {
        this.refreshTools();
        this.refreshRepos();
        if (repositoryIdToDelete) {
          this.removeRepository(repositoryIdToDelete);
        }
      },
      error: (err) => {
        console.error('Failed to delete tool:', err);
        this.refreshTools();
        this.refreshRepos();
        if (repositoryIdToDelete) {
          this.removeRepository(repositoryIdToDelete);
        }
      }
    });
  }

  addRepository(_repo: any): void {}
  addTool(_tool: any): void {}
  removeTool(_id: string): void {}
  saveRepos(): void {}
  saveTools(): void {}
  saveStore(): void {}
  addStoreItem(_item: any): void {}
  removeStoreItem(_id: string): void {}
}
