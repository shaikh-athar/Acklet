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
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('250ms ease', style({ opacity: 0, transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast-item" [@toastAnim] [class]="'toast-' + toast.type">
          <div class="toast-icon">{{ getIcon(toast.type) }}</div>
          <div class="toast-body">
            <div class="toast-title">{{ toast.title }}</div>
            @if (toast.message) { <div class="toast-msg">{{ toast.message }}</div> }
          </div>
          <button class="toast-close" (click)="toastSvc.remove(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.625rem; }
    .toast-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; border-radius: 0.75rem; min-width: 280px; max-width: 380px; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .toast-success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); }
    .toast-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); }
    .toast-warning { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); }
    .toast-info { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); }
    .toast-icon { font-size: 1rem; flex-shrink: 0; }
    .toast-body { flex: 1; }
    .toast-title { font-size: 0.85rem; font-weight: 600; color: #f4f4f5; }
    .toast-msg { font-size: 0.78rem; color: #a1a1aa; margin-top: 0.125rem; }
    .toast-close { background: none; border: none; color: #71717a; cursor: pointer; font-size: 0.75rem; padding: 0.125rem; transition: color 0.2s; flex-shrink: 0; }
    .toast-close:hover { color: #f4f4f5; }
  `],
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);
  getIcon(type: string): string {
    const m: Record<string,string> = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    return m[type] ?? 'ℹ';
  }
}
