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
  description: string;
  lang: string;
  langColor: string;
  status: 'Published' | 'Draft' | 'In Review';
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

export const DEFAULT_WORKSPACE_TOOLS: WorkspaceTool[] = [
  {
    id: 'airvault',
    name: 'AirVault',
    description: 'Real-time, zero-knowledge cross-device clipboard and content sync.',
    lang: 'TypeScript',
    langColor: '#00D2B4',
    status: 'Published',
    downloads: 15000,
    stars: 342,
    lastUpdated: 'Just now'
  },
  {
    id: 'datalens',
    name: 'DataLens',
    description: 'Multi-format workspace for formatting, validating, diffing & querying data.',
    lang: 'TypeScript',
    langColor: '#2FA084',
    status: 'Published',
    downloads: 42000,
    stars: 890,
    lastUpdated: 'Just now'
  },
  {
    id: 'jwt-inspector',
    name: 'JWT Inspector',
    description: 'Decode, verify, and inspect JSON Web Tokens in real-time.',
    lang: 'TypeScript',
    langColor: '#6366f1',
    status: 'Published',
    downloads: 128400,
    stars: 512,
    lastUpdated: '1 day ago'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Beautify, minify, and validate JSON with syntax highlighting.',
    lang: 'TypeScript',
    langColor: '#f97316',
    status: 'Published',
    downloads: 452000,
    stars: 1248,
    lastUpdated: 'Just now'
  },
  {
    id: 'yaml-validator',
    name: 'YAML Validator & Converter',
    description: 'Validate syntax, detect errors, and convert YAML to JSON instantly.',
    lang: 'TypeScript',
    langColor: '#22c55e',
    status: 'Published',
    downloads: 89000,
    stars: 310,
    lastUpdated: '3 days ago'
  },
  {
    id: 'regex-tester',
    name: 'RegEx Tester',
    description: 'Real-time regular expression tester and debugger with capture groups.',
    lang: 'TypeScript',
    langColor: '#ec4899',
    status: 'Published',
    downloads: 210000,
    stars: 740,
    lastUpdated: '2 days ago'
  },
  {
    id: 'base64-codec',
    name: 'Base64 Encoder & Decoder',
    description: 'Encode and decode strings, URLs, images, and binary payloads.',
    lang: 'JavaScript',
    langColor: '#f59e0b',
    status: 'Published',
    downloads: 310000,
    stars: 890,
    lastUpdated: 'Just now'
  },
  {
    id: 'hash-generator',
    name: 'UUID & Hash Generator',
    description: 'Generate secure UUID v4, SHA-256, MD5, and HMAC hashes in-browser.',
    lang: 'Web Crypto',
    langColor: '#8b5cf6',
    status: 'Published',
    downloads: 164000,
    stars: 580,
    lastUpdated: '4 days ago'
  }
];

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  private readonly http = inject(HttpClient);

  readonly repos = signal<RepositoryItem[]>([]);
  readonly tools = signal<WorkspaceTool[]>(
    (() => {
      const stored = localStorage.getItem('acklet:workspace:tools');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 1) return parsed;
        } catch {
          // fallback
        }
      }
      return DEFAULT_WORKSPACE_TOOLS;
    })()
  );
  readonly collections = signal<CollectionFolder[]>(
    JSON.parse(localStorage.getItem('acklet:collections') ?? '[]')
  );
  readonly storeItems = signal<StoreItem[]>([]);
  readonly activeModal = signal<'add_tool' | 'connect_repo' | 'create_collection' | null>(null);

  constructor() {
    this.refreshRepos();
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
              toolStatus: repo.statusAiAnalyzed ? 'Published' : 'Not Generated'
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
  openModal(type: 'add_tool' | 'connect_repo' | 'create_collection'): void {
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
      },
      error: (err) => {
        console.error('Failed to disconnect repository:', err);
        // Fallback local update to keep UI responsive
        this.repos.update(list => list.filter(r => r.id !== id));
      }
    });
  }

  unlinkRepository(id: string): void {
    this.http.post<any>(`${API_BASE}/projects/${id}/unlink`, {}).subscribe({
      next: () => {
        this.repos.update(list => list.map(r => r.id === id ? { ...r, toolStatus: 'Not Generated' } : r));
      },
      error: (err) => {
        console.error('Failed to unlink repository:', err);
        this.repos.update(list => list.map(r => r.id === id ? { ...r, toolStatus: 'Not Generated' } : r));
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

  addTool(tool: Partial<WorkspaceTool> & { name: string; description: string }): void {
    const slug = tool.id || tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newTool: WorkspaceTool = {
      id: slug,
      name: tool.name,
      description: tool.description,
      lang: tool.lang || 'TypeScript',
      langColor: tool.langColor || '#3178c6',
      status: tool.status || 'Published',
      downloads: tool.downloads ?? 0,
      stars: tool.stars ?? 0,
      lastUpdated: tool.lastUpdated || 'Just now'
    };
    this.tools.update(list => [newTool, ...list.filter(t => t.id !== newTool.id)]);
    this._saveTools();
  }

  removeTool(id: string): void {
    this.tools.update(list => list.filter(t => t.id !== id));
    this._saveTools();
  }

  private _saveTools(): void {
    localStorage.setItem('acklet:workspace:tools', JSON.stringify(this.tools()));
  }

  // Stub methods to keep existing callers compiling
  openModal_alt = this.openModal;
  addRepository(_repo: any): void {}
  saveRepos(): void {}
  saveTools(): void { this._saveTools(); }
  saveStore(): void {}
  addStoreItem(_item: any): void {}
  removeStoreItem(_id: string): void {}
}
