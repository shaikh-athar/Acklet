import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-clear-confirm-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="clear-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="clear-header">
          <div class="danger-icon-circle">
            <app-icon name="trash-2" class="icon-md" style="color: #EF4444;"></app-icon>
          </div>
          <h2 class="clear-title">Clear Active Clipboard?</h2>
          <p class="clear-subtitle">
            Are you sure you want to clear <strong>{{ itemCount() }}</strong> active item{{ itemCount() > 1 ? 's' : '' }} 
            @if (totalBytes() > 0) {
              ({{ formatBytes(totalBytes()) }})
            }
            from this device?
          </p>
        </div>

        <!-- Explanatory note -->
        <div class="clear-info-card">
          <div class="clear-info-icon">
            <app-icon name="shield-check" class="icon-xs text-accent"></app-icon>
          </div>
          <div class="clear-info-text">
            <span class="info-title">Zero Data Loss Guarantee</span>
            <span class="info-desc">Items will be removed from your operational workspace on this device but remain recoverable in your <strong>30-day Restorable History</strong>.</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="clear-modal-actions">
          <button class="av-btn-secondary cancel-btn" (click)="cancel.emit()">
            <app-icon name="x" class="icon-xs"></app-icon>
            <span>Cancel</span>
          </button>
          <button class="clear-confirm-btn" (click)="confirm.emit()">
            <app-icon name="trash-2" class="icon-xs"></app-icon>
            <span>Clear {{ itemCount() }} Item{{ itemCount() > 1 ? 's' : '' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
      animation: clearBdFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes clearBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .clear-modal-card {
      width: 100%;
      max-width: 440px;
      background: var(--av-surface-primary, #111419);
      border: 1px solid var(--av-border, #252B33);
      border-radius: var(--av-radius-lg, 12px);
      padding: 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: clearModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes clearModalPop {
      from {
        transform: scale(0.92) translateY(8px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    :host-context([data-theme="light"]) .clear-modal-card,
    [data-theme="light"] .clear-modal-card {
      background: #ffffff;
      border-color: #E4E7EC;
      box-shadow: 0 16px 40px rgba(16, 24, 40, 0.16);
    }

    .clear-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .danger-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
      animation: dangerPulse 2s infinite ease-in-out;
    }

    @keyframes dangerPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
      50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    }

    .clear-title {
      font-size: 16.5px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .clear-subtitle {
      font-size: 12.5px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
      line-height: 1.45;
    }

    .clear-subtitle strong {
      color: var(--av-text-primary, #FFFFFF);
    }

    .clear-info-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    :host-context([data-theme="light"]) .clear-info-card,
    [data-theme="light"] .clear-info-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .clear-info-icon {
      margin-top: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--av-accent, #2196F3);
    }

    .clear-info-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .info-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--av-text-primary, #FFFFFF);
    }

    .info-desc {
      font-size: 11.5px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.4;
    }

    .info-desc strong {
      color: var(--av-text-primary, #FFFFFF);
    }

    .clear-modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
    }

    .cancel-btn {
      height: 32px;
      padding: 0 14px;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--av-surface-secondary, #171B21);
      color: var(--av-text-muted, #8B949E);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .cancel-btn:hover {
      background: var(--av-surface-elevated, #1A1F26);
      color: var(--av-text-primary, #FFFFFF);
    }

    .clear-confirm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      background: #EF4444;
      color: #FFFFFF;
      border: 1px solid #EF4444;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .clear-confirm-btn:hover {
      background: #DC2626;
      border-color: #DC2626;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
    }

    .text-accent { color: var(--av-accent, #2196F3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultClearConfirmModalComponent {
  itemCount = input<number>(0);
  totalBytes = input<number>(0);

  confirm = output<void>();
  cancel = output<void>();

  onBackdropClick(e: MouseEvent) {
    this.cancel.emit();
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
