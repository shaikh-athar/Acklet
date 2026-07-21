// src/app/core/services/github.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './tools.service';

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

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/github';

  getConnectUrl(): Observable<string> {
    return this.http.get<ApiResponse<{ url: string }>>(`${this.baseUrl}/connect-url`).pipe(
      map(res => res.data.url)
    );
  }

  connectRepository(code: string, toolId?: string, githubRepo?: string): Observable<GitHubIntegrationResponse> {
    return this.http.post<ApiResponse<GitHubIntegrationResponse>>(`${this.baseUrl}/connect`, {
      code,
      toolId,
      githubRepo
    }).pipe(
      map(res => res.data)
    );
  }

  triggerSync(toolId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/sync/${toolId}`, {}).pipe(
      map(() => void 0)
    );
  }
}
