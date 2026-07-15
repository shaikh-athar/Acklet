// client/src/app/pages/workspace/history/history.ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

interface LogItem {
  id: string;
  tool: string;
  category: string;
  details: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

@Component({
  selector: 'app-workspace-history',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="history-root page-enter">
      <header class="header-row mb-8">
        <div>
          <h1 class="page-title">Run History Logs</h1>
          <p class="page-subtitle">Your local tool executions. All execution data is stored offline in browser memory.</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="clearAll()">Clear History</button>
      </header>

      <div class="history-table glass">
        <div class="table-header">
          <div class="col-status">Status</div>
          <div class="col-tool">Tool</div>
          <div class="col-desc">Execution Details</div>
          <div class="col-time">Time</div>
          <div class="col-action"></div>
        </div>

        <div class="table-body">
          @for (log of logs(); track log.id) {
            <div class="table-row">
              <div class="col-status">
                <span class="status-indicator" [ngClass]="log.status">
                  <app-icon [name]="log.status === 'success' ? 'check-circle' : 'alert-circle'" class="size-4" />
                </span>
              </div>
              <div class="col-tool">
                <div class="tool-name">{{ log.tool }}</div>
                <div class="tool-cat">{{ log.category }}</div>
              </div>
              <div class="col-desc">{{ log.details }}</div>
              <div class="col-time">{{ log.time }}</div>
              <div class="col-action">
                <button class="icon-btn btn-delete" (click)="deleteLog(log)" aria-label="Delete log">
                  <app-icon name="trash" class="size-4" />
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state p-8 text-center">
              <app-icon name="clock" class="size-8 text-neutral-500 mb-2" />
              <p class="empty-text">No run logs recorded yet.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-root { min-height: 100vh; }
    .header-row { display: flex; align-items: center; justify-content: space-between; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    /* Table */
    .history-table { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); overflow: hidden; display: flex; flex-direction: column; }
    .table-header { display: flex; align-items: center; padding: 0.875rem 1.5rem; background: var(--surface-hover); border-bottom: 1px solid var(--border-soft); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-neutral-400); }
    .table-row { display: flex; align-items: center; padding: 1.125rem 1.5rem; border-bottom: 1px solid var(--border-soft); font-size: 0.875rem; transition: background 0.2s; }
    .table-row:hover { background: var(--surface-hover); }
    .table-row:last-child { border-bottom: none; }

    .col-status { width: 80px; display: flex; align-items: center; }
    .col-tool { width: 180px; }
    .col-desc { flex: 1; color: var(--color-neutral-300); }
    .col-time { width: 120px; color: var(--color-neutral-400); }
    .col-action { width: 40px; display: flex; justify-content: flex-end; }

    .status-indicator.success { color: var(--color-feedback-success); }
    .status-indicator.warning { color: var(--color-feedback-warning); }
    .status-indicator.error { color: var(--color-feedback-error); }

    .tool-name { font-weight: 600; color: var(--color-neutral-100); }
    .tool-cat { font-size: 0.7rem; color: var(--color-neutral-500); }

    .btn-delete { background: none; border: none; color: var(--color-neutral-400); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; }
    .btn-delete:hover { color: var(--color-feedback-error); background: var(--color-feedback-error-muted); }

    .empty-state { text-align: center; }
    .empty-text { font-size: 0.875rem; color: var(--color-neutral-500); }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-8 { margin-bottom: 2rem; }
  `],
})
export class WorkspaceHistoryComponent {
  readonly logs = signal<LogItem[]>([
    { id: '1', tool: 'JWT Inspector', category: 'Developer', details: 'Parsed claims payload (HS256)', time: '10 mins ago', status: 'success' },
    { id: '2', tool: 'JSON Formatter', category: 'Formatters', details: 'Cleaned client.json structure (2.4 KB)', time: '1 hour ago', status: 'success' },
    { id: '3', tool: 'Base64 Decoder', category: 'Developer', details: 'Decoded configuration file buffer', time: '3 hours ago', status: 'success' },
    { id: '4', tool: 'SQL Formatter', category: 'Formatters', details: 'Identified invalid syntax line 4', time: '1 day ago', status: 'error' }
  ]);

  deleteLog(log: LogItem): void {
    this.logs.update(list => list.filter(item => item.id !== log.id));
  }

  clearAll(): void {
    if (confirm('Are you sure you want to clear all history?')) {
      this.logs.set([]);
    }
  }
}
