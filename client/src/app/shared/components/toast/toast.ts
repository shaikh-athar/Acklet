// src/app/shared/components/toast/toast.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('toastAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%) scale(0.95)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateX(0) scale(1)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%) scale(0.95)' })),
      ]),
    ]),
  ],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast-item" [@toastAnim] [class]="'toast-' + toast.type">
          <div class="toast-status-bar"></div>
          <div class="toast-icon-wrap">
            <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          </div>
          <div class="toast-body">
            <div class="toast-title">{{ toast.title }}</div>
            @if (toast.message) { <div class="toast-msg">{{ toast.message }}</div> }
          </div>
          <button class="toast-close" (click)="toastSvc.remove(toast.id)" aria-label="Close notification">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { 
      position: fixed; 
      bottom: 1.5rem; 
      right: 1.5rem; 
      z-index: 99999; 
      display: flex; 
      flex-direction: column; 
      gap: 0.75rem; 
      pointer-events: none;
    }
    .toast-item { 
      pointer-events: auto;
      position: relative;
      display: flex; 
      align-items: flex-start; 
      gap: 0.875rem; 
      padding: 1rem 1.125rem 1rem 1rem; 
      border-radius: var(--radius-xl, 1rem); 
      min-width: 300px; 
      max-width: 420px; 
      background: var(--color-surface-900, #ffffff);
      border: 1px solid var(--border-soft, rgba(0, 0, 0, 0.1));
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast-status-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    /* Type specific status bar and icon colors */
    .toast-success .toast-status-bar { background: #10b981; }
    .toast-success .toast-icon { color: #10b981; }
    
    .toast-error .toast-status-bar { background: #ef4444; }
    .toast-error .toast-icon { color: #ef4444; }
    
    .toast-warning .toast-status-bar { background: #f59e0b; }
    .toast-warning .toast-icon { color: #f59e0b; }
    
    .toast-info .toast-status-bar { background: #6366f1; }
    .toast-info .toast-icon { color: #6366f1; }

    .toast-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      background: rgba(0, 0, 0, 0.04);
      flex-shrink: 0;
    }
    html[data-theme="dark"] .toast-icon-wrap {
      background: rgba(255, 255, 255, 0.06);
    }

    .toast-icon { 
      font-size: 0.95rem; 
      font-weight: 800; 
      line-height: 1;
    }

    .toast-body { flex: 1; min-width: 0; }
    
    /* Dual theme high contrast text rules */
    .toast-title { 
      font-size: 0.875rem; 
      font-weight: 700; 
      color: var(--color-neutral-50, #09090b); 
      line-height: 1.3;
    }
    
    .toast-msg { 
      font-size: 0.8rem; 
      color: var(--color-neutral-400, #52525b); 
      margin-top: 0.2rem;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close { 
      background: none; 
      border: none; 
      color: var(--color-neutral-400, #71717a); 
      cursor: pointer; 
      font-size: 0.85rem; 
      padding: 0.25rem; 
      line-height: 1;
      border-radius: var(--radius-sm, 0.375rem);
      transition: all 0.2s; 
      flex-shrink: 0; 
      margin-left: 0.25rem;
    }
    .toast-close:hover { 
      color: var(--color-neutral-50, #09090b); 
      background: rgba(0, 0, 0, 0.05);
    }
    html[data-theme="dark"] .toast-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `],
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);
  getIcon(type: string): string {
    const m: Record<string, string> = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    return m[type] ?? 'ℹ';
  }
}
