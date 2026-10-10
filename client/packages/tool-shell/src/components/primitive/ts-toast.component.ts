// packages/tool-shell/src/components/primitive/ts-toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolContextService, ToastMessage } from '../../services/tool-context.service';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-toast-container',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="ts-toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of contextService.toasts(); track t.id) {
        <div class="ts-toast-item" [class]="'type-' + t.type" role="status">
          <div class="ts-toast-icon">
            @if (t.type === 'success') {
              <ts-icon name="check" [size]="14" />
            } @else if (t.type === 'error') {
              <ts-icon name="x" [size]="14" />
            } @else {
              <ts-icon name="info" [size]="14" />
            }
          </div>
          <div class="ts-toast-body">
            @if (t.title) {
              <span class="ts-toast-title">{{ t.title }}</span>
            }
            <span class="ts-toast-msg">{{ t.message }}</span>
          </div>
          <button type="button" class="ts-toast-close" (click)="contextService.removeToast(t.id)" aria-label="Close notification">
            <ts-icon name="x" [size]="12" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ts-toast-stack {
      position: fixed;
      bottom: var(--ts-space-4, 16px);
      right: var(--ts-space-4, 16px);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 2000;
      pointer-events: none;
      max-width: 360px;
      width: 100%;
    }
    .ts-toast-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-md, 12px);
      box-shadow: var(--ts-shadow-lg);
      pointer-events: auto;
      animation: tsFadeInUp var(--ts-dur-base) var(--ts-ease) both;
    }
    .ts-toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--ts-radius-full);
      background: var(--ts-raised);
      color: var(--ts-text);
      flex-shrink: 0;
    }
    .ts-toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .ts-toast-title {
      font-size: var(--ts-text-xs, 12px);
      font-weight: 600;
      color: var(--ts-text);
    }
    .ts-toast-msg {
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-muted);
      line-height: 1.4;
    }
    .ts-toast-close {
      background: transparent;
      border: none;
      color: var(--ts-text-subtle);
      cursor: pointer;
      padding: 2px;
      border-radius: var(--ts-radius-sm);
    }
    .ts-toast-close:hover {
      color: var(--ts-text);
    }
  `]
})
export class TsToastContainerComponent {
  readonly contextService = inject(ToolContextService);
}
