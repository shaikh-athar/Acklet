// src/app/core/services/github.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './tools.service';

// ── Existing tool-scoped integration ──────────────────────────────────────────
export interface GitHubIntegrationResponse {
  id: string;
  toolId?: string;
  toolSlug?: string;
  githubUser: string;
  githubRepo: string;
  githubRepoId: number;
  defaultBranch: string;
  lastSyncedAt?: string;
  createdAt: string;
}

// ── New user-scoped models ─────────────────────────────────────────────────────
export interface GitHubAccount {
  id: string;
  githubLogin: string;
  avatarUrl?: string;
  scopes?: string;
  connectedAt: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName?: string;
  full_name?: string;
  privateRepo?: boolean;
  private?: boolean;
  fork: boolean;
  archived: boolean;
  description?: string;
  htmlUrl?: string;
  html_url?: string;
  defaultBranch?: string;
  default_branch?: string;
  language?: string;
  stars: number;
  forks: number;
  sizeKb?: number;
  size?: number;
  updatedAt?: string;
  updated_at?: string;
  pushedAt?: string;
  pushed_at?: string;
  owner?: { login: string; avatarUrl: string; type: string };
}

export interface GitHubImportJob {
  jobId: string;
  repoFullName: string;
  status: 'PENDING' | 'CLONING' | 'ANALYZING' | 'AI_GENERATION' | 'DONE' | 'FAILED';
  currentStep?: string;
  errorMessage?: string;
  toolId?: string;
  repositoryId?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1/github';

  // ── OAuth / Connect ────────────────────────────────────────────────────────

  /** Returns the GitHub OAuth URL to redirect the user to. */
  getConnectUrl(): Observable<string> {
    return this.http.get<ApiResponse<{ url: string }>>(`${this.base}/connect-url`)
      .pipe(map(r => r.data.url));
  }

  /** Handles the OAuth callback from GitHub — exchanges code for token. */
  handleCallback(code: string, state: string): Observable<GitHubAccount> {
    const params = new HttpParams().set('code', code).set('state', state);
    return this.http.get<ApiResponse<GitHubAccount>>(`${this.base}/callback`, { params })
      .pipe(map(r => r.data));
  }

  // ── Account Management ─────────────────────────────────────────────────────

  listAccounts(): Observable<GitHubAccount[]> {
    return this.http.get<ApiResponse<GitHubAccount[]>>(`${this.base}/accounts`)
      .pipe(map(r => r.data));
  }

  disconnectAccount(accountId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/accounts/${accountId}`)
      .pipe(map(() => void 0));
  }

  // ── Repositories ───────────────────────────────────────────────────────────

  listRepos(accountId: string, page = 1, perPage = 30, search?: string): Observable<GitHubRepo[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('perPage', perPage);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<GitHubRepo[]>>(`${this.base}/accounts/${accountId}/repos`, { params })
      .pipe(map(r => r.data));
  }

  // ── Import (Phase 1 & Phase 2 Pipeline) ────────────────────────────────────

  importRepo(
    accountId: string,
    repoFullName: string,
    branch?: string,
    buildCommand?: string,
    startCommand?: string,
    installCommand?: string,
    envVars?: Record<string, string>
  ): Observable<GitHubImportJob> {
    let params = new HttpParams()
      .set('accountId', accountId)
      .set('repoFullName', repoFullName);
    if (branch) params = params.set('branch', branch);
    if (buildCommand) params = params.set('buildCommand', buildCommand);
    if (startCommand) params = params.set('startCommand', startCommand);
    if (installCommand) params = params.set('installCommand', installCommand);

    return this.http.post<ApiResponse<GitHubImportJob>>('http://localhost:8080/api/v1/projects/import', envVars || {}, { params })
      .pipe(map(r => r.data));
  }

  getImportStatus(jobId: string): Observable<GitHubImportJob> {
    return this.http.get<ApiResponse<GitHubImportJob>>(`http://localhost:8080/api/v1/projects/${jobId}/status`)
      .pipe(map(r => r.data));
  }

  cancelImport(jobId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`http://localhost:8080/api/v1/projects/${jobId}/cancel`, null)
      .pipe(map(() => void 0));
  }

  // ── Legacy: tool-scoped methods (kept for backward compat) ─────────────────

  connectRepository(code: string, toolId?: string, githubRepo?: string): Observable<GitHubIntegrationResponse> {
    return this.http.post<ApiResponse<GitHubIntegrationResponse>>(`${this.base}/connect`, { code, toolId, githubRepo })
      .pipe(map(r => r.data));
  }

  triggerSync(toolId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/sync/${toolId}`, {})
      .pipe(map(() => void 0));
  }
}
