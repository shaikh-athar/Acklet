// client/apps/tool-docs/src/app/services/docs-toast.service.ts

import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class DocsToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: 'success' | 'info' | 'error' = 'success', durationMs = 3000, action?: ToastAction): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, message, type, action };
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  showWithAction(message: string, action: ToastAction, durationMs = 6000, type: 'info' | 'success' | 'error' = 'info'): void {
    this.show(message, type, durationMs, action);
  }

  success(title: string, message?: string): void {
    this.show(message ? `${title}: ${message}` : title, 'success');
  }

  error(title: string, message?: string): void {
    this.show(message ? `${title}: ${message}` : title, 'error');
  }

  info(title: string, message?: string): void {
    this.show(message ? `${title}: ${message}` : title, 'info');
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
