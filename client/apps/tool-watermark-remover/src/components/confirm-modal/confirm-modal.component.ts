// apps/tool-watermark-remover/src/components/confirm-modal/confirm-modal.component.ts
import { Component, input, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="modal-backdrop animate-fade-in" 
      (click)="cancel.emit()"
      role="presentation"
    >
      <div 
        class="modal-dialog animate-scale-up" 
        (click)="$event.stopPropagation()" 
        role="alertdialog" 
        aria-modal="true"
        [attr.aria-labelledby]="'dialog-title'"
        [attr.aria-describedby]="'dialog-desc'"
      >
        <div class="modal-header">
          <div class="header-icon" [class.danger]="danger()">
            <ts-icon [name]="danger() ? 'circle-alert' : 'info'" [size]="20" />
          </div>
          <h3 id="dialog-title" class="dialog-title">{{ title() }}</h3>
          <button 
            type="button" 
            class="close-btn" 
            (click)="cancel.emit()" 
            aria-label="Close dialog"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <div class="modal-body">
          <p id="dialog-desc" class="dialog-message">{{ message() }}</p>
        </div>

        <div class="modal-footer">
          <button 
            type="button" 
            class="btn-secondary" 
            (click)="cancel.emit()"
          >
            {{ cancelText() }}
          </button>

          <button 
            type="button" 
            class="btn-action" 
            [class.btn-danger]="danger()"
            [class.btn-primary]="!danger()"
            (click)="confirm.emit()"
          >
            {{ confirmText() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    .modal-dialog {
      width: 100%;
      max-width: 420px;
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: var(--ts-radius-card, 16px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--accent, #3B82F6);
      flex-shrink: 0;
    }

    .header-icon.danger {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #F3F4F6);
      margin: 0;
      flex: 1;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-2, #94A3B8);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .close-btn:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #F3F4F6);
    }

    .modal-body {
      padding: 16px 20px;
    }

    .dialog-message {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-2, #94A3B8);
      margin: 0;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      background: var(--ts-surface-inset, rgba(0, 0, 0, 0.15));
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .btn-secondary {
      height: 34px;
      padding: 0 14px;
      border-radius: var(--ts-radius-control, 8px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: transparent;
      color: var(--text, #F3F4F6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .btn-secondary:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
    }

    .btn-action {
      height: 34px;
      padding: 0 16px;
      border-radius: var(--ts-radius-control, 8px);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .btn-primary {
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
      border: 1px solid var(--accent, #3B82F6);
      box-shadow: 0 2px 8px var(--accent-glow, rgba(59, 130, 246, 0.35));
    }

    .btn-danger {
      background: #EF4444;
      color: #FFFFFF;
      border: 1px solid #EF4444;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
    }

    .btn-action:hover {
      filter: brightness(1.1);
    }
  `]
})
export class ConfirmModalComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');
  readonly danger = input<boolean>(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }
}

