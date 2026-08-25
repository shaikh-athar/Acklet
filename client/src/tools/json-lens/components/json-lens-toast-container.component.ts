import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

@Component({
  selector: 'app-json-lens-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast-item" [class]="toast.type">
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensToastContainerComponent {
  toasts = signal<ToastMessage[]>([]);

  showToast(message: string, type: 'success' | 'info' | 'warning' = 'success') {
    const id = Date.now().toString() + Math.random().toString().substring(2, 5);
    const newToast: ToastMessage = { id, message, type };

    this.toasts.update(t => [...t, newToast]);

    setTimeout(() => {
      this.toasts.update(t => t.filter(item => item.id !== id));
    }, 2500);
  }
}
