import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';

interface AIJob {
  id: string;
  repo: string;
  type: 'Doc Generation' | 'Metadata Synthesis' | 'Framework Detection' | 'Screenshot Gen';
  status: 'Running' | 'Completed' | 'Queued' | 'Failed';
  startedAt: string;
  duration: string;
}

@Component({
  selector: 'app-ai-jobs',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="aj-wrapper">
      <div class="aj-header">
        <div class="aj-title-wrap">
          <h1 class="aj-title">AI Jobs & Pipeline</h1>
          <p class="aj-subtitle">Background AI tasks processing documentation, ASTs, screenshots, and metadata generation.</p>
        </div>
        <button class="aj-refresh-btn">
          Refresh Pipeline
        </button>
      </div>
 
      <!-- High Density Jobs Table -->
      <div class="aj-table-container">
        <table class="aj-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Repository</th>
              <th>Pipeline Type</th>
              <th>Status</th>
              <th>Started</th>
              <th class="text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            @for (job of jobs(); track job.id) {
              <tr>
                <td class="aj-id-cell">{{ job.id }}</td>
                <td class="aj-repo-cell">{{ job.repo }}</td>
                <td class="aj-type-cell">{{ job.type }}</td>
                <td>
                  <span class="aj-badge"
                    [ngClass]="{
                      'completed': job.status === 'Completed',
                      'running animate-pulse': job.status === 'Running',
                      'queued': job.status === 'Queued'
                    }">
                    {{ job.status }}
                  </span>
                </td>
                <td class="aj-time-cell">{{ job.startedAt }}</td>
                <td class="text-right aj-duration-cell">{{ job.duration }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .aj-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .aj-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .aj-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .aj-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    .aj-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }
 
    .aj-refresh-btn {
      padding: 8px 14px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
 
    .aj-refresh-btn:hover {
      background: var(--surface-hover);
      border-color: var(--vercel-text-muted);
    }
 
    .aj-table-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }
 
    .aj-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
 
    .aj-table th {
      background: var(--vercel-subtle-bg);
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .aj-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--vercel-border-subtle);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }
 
    .aj-table tr:hover td {
      background: var(--surface-hover);
    }
 
    .aj-table tr:last-child td {
      border-bottom: none;
    }
 
    .aj-id-cell {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: #06b6d4;
    }
 
    .aj-repo-cell {
      font-weight: 600;
    }
 
    .aj-type-cell {
      color: var(--vercel-text-secondary);
    }
 
    .aj-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid transparent;
    }
 
    .aj-badge.completed {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.2);
    }
 
    .aj-badge.running {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.2);
    }
 
    .aj-badge.queued {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-muted);
      border-color: var(--vercel-border);
    }
 
    .aj-time-cell {
      color: var(--vercel-text-muted);
      font-size: 11px;
    }
 
    .aj-duration-cell {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    .text-right {
      text-align: right;
    }
  `],
})
export class AIJobsComponent {
  readonly jobs = signal<AIJob[]>([
    { id: 'job-9841', repo: 'athar-taj/acklet-cli', type: 'Doc Generation', status: 'Completed', startedAt: '10m ago', duration: '4.2s' },
    { id: 'job-9842', repo: 'athar-taj/acklet-wasm-crypto', type: 'Metadata Synthesis', status: 'Running', startedAt: '1m ago', duration: 'in progress' },
    { id: 'job-9843', repo: 'athar-taj/acklet-python-sdk', type: 'Screenshot Gen', status: 'Queued', startedAt: 'Just now', duration: '-' },
  ]);
}
