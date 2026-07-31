import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';
import { Tool } from '../models/tool.model';

export interface ProviderHealthResponse {
  [key: string]: any;
}

export interface AiJobResponse {
  id: string;
  toolId: string;
  taskType: string;
  providerName: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemHealthResponse {
  status: string;
  database: string;
  redis: string;
  rabbitmq: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/admin';

  getPendingTools(page = 0, size = 10): Observable<PageResponse<Tool>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<Tool>>>(`${this.baseUrl}/tools/pending`, { params }).pipe(
      map(res => res.data)
    );
  }

  approveTool(id: string): Observable<Tool> {
    return this.http.post<ApiResponse<Tool>>(`${this.baseUrl}/tools/${id}/approve`, {}).pipe(
      map(res => res.data)
    );
  }

  rejectTool(id: string): Observable<Tool> {
    return this.http.post<ApiResponse<Tool>>(`${this.baseUrl}/tools/${id}/reject`, {}).pipe(
      map(res => res.data)
    );
  }

  getSystemHealth(): Observable<SystemHealthResponse> {
    return this.http.get<ApiResponse<SystemHealthResponse>>(`${this.baseUrl}/health`).pipe(
      map(res => res.data)
    );
  }

  getProviderHealth(): Observable<ProviderHealthResponse> {
    return this.http.get<ApiResponse<ProviderHealthResponse>>(`${this.baseUrl}/ai/providers/health`).pipe(
      map(res => res.data)
    );
  }

  getAiJobs(status?: string, page = 0, size = 10): Observable<PageResponse<AiJobResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<PageResponse<AiJobResponse>>>(`${this.baseUrl}/ai/jobs`, { params }).pipe(
      map(res => res.data)
    );
  }

  triggerAiEnrichment(toolId: string): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/ai/tools/${toolId}/enrich`, {}).pipe(
      map(res => res.data)
    );
  }
}
