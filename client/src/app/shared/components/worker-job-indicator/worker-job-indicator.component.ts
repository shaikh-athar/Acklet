import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-worker-job-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isActive()) {
      <div class="worker-badge" role="status" aria-live="polite">
        <div class="spinner-ring"></div>
        <span class="job-label">{{ label() || 'Processing in worker…' }}</span>
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
    }
    .worker-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 9999px;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.3);
      color: #2196F3;
      font-size: 11px;
      font-weight: 600;
      animation: fadeIn 0.2s ease;
    }
    :host-context([data-theme="dark"]) .worker-badge {
      background: rgba(33, 150, 243, 0.15);
      border-color: rgba(33, 150, 243, 0.4);
      color: #60A5FA;
    }
    .spinner-ring {
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(33, 150, 243, 0.3);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkerJobIndicatorComponent {
  isActive = input.required<boolean>();
  label = input<string>('Processing in background…');
}
