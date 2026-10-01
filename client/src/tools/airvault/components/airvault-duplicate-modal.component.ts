import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-duplicate-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="duplicate-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="duplicate-header">
          <div class="info-icon-circle">
            <app-icon name="copy" class="icon-md" style="color: #3B82F6;"></app-icon>
          </div>
          <h2 class="duplicate-title">Duplicate resource found.</h2>
          <p class="duplicate-subtitle">
            An identical resource is already present on a connected paired device.
          </p>
        </div>

        <!-- Matched Paired User Info Card -->
        @if (matchedUsername()) {
          <div class="matched-user-card">
            <div class="user-pill">
              <span class="user-dot"></span>
              <span class="user-handle">{{ matchedUsername() }}</span>
            </div>
            <p class="user-note">
              This resource was previously synchronized or created by <strong>{{ matchedUsername() }}</strong>.
              Both copies are preserved in your vault without overwriting or data loss.
            </p>
          </div>
        }

        @if (resourceSnippet()) {
          <div class="resource-preview-box">
            <span class="preview-label">Resource Preview</span>
            <div class="preview-content">{{ resourceSnippet() }}</div>
          </div>
        }

        <!-- Informational Notice -->
        <div class="duplicate-info-notice">
          <app-icon name="shield-check" class="icon-xs text-accent"></app-icon>
          <span>Choose to keep both copies as-is, or override and make this copy a distinct unique resource.</span>
        </div>

        <!-- Actions: Dismiss (Keep Both) OR Override & Make Unique -->
        <div class="duplicate-modal-actions">
          <button type="button" class="duplicate-btn secondary-btn" (click)="close.emit()" autofocus>
            <app-icon name="check" class="icon-xs"></app-icon>
            <span>Dismiss (Keep Both)</span>
          </button>
          <button type="button" class="duplicate-btn override-btn" (click)="override.emit()">
            <app-icon name="blend" class="icon-xs"></app-icon>
            <span>Override & Make Unique</span>
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
      z-index: 99999;
      padding: 16px;
      animation: dupFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes dupFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .duplicate-modal-card {
      width: 100%;
      max-width: 460px;
      background: var(--av-surface-primary, #111419);
      border: 1px solid var(--av-border, #252B33);
      border-radius: var(--av-radius-lg, 14px);
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(59, 130, 246, 0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: dupPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes dupPop {
      from {
        transform: scale(0.92) translateY(8px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    :host-context([data-theme="light"]) .duplicate-modal-card,
    [data-theme="light"] .duplicate-modal-card {
      background: #ffffff;
      border-color: #E4E7EC;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.2);
    }

    .duplicate-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .info-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.14);
      border: 1px solid rgba(59, 130, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .duplicate-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--av-text-primary, #F3F4F6);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .duplicate-title,
    [data-theme="light"] .duplicate-title {
      color: #111827;
    }

    .duplicate-subtitle {
      font-size: 0.85rem;
      color: var(--av-text-muted, #9CA3AF);
      margin: 0;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .duplicate-subtitle,
    [data-theme="light"] .duplicate-subtitle {
      color: #6B7280;
    }

    .matched-user-card {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    :host-context([data-theme="light"]) .matched-user-card,
    [data-theme="light"] .matched-user-card {
      background: #EFF6FF;
      border-color: #BFDBFE;
    }

    .user-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #3B82F6;
    }

    .user-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3B82F6;
    }

    .user-note {
      font-size: 0.8rem;
      color: var(--av-text-secondary, #D1D5DB);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .user-note,
    [data-theme="light"] .user-note {
      color: #374151;
    }

    .resource-preview-box {
      background: var(--av-surface-secondary, #181C22);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    :host-context([data-theme="light"]) .resource-preview-box,
    [data-theme="light"] .resource-preview-box {
      background: #F9FAFB;
      border-color: #E5E7EB;
    }

    .preview-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      color: var(--av-text-muted, #9CA3AF);
    }

    .preview-content {
      font-family: var(--av-font-mono, monospace);
      font-size: 0.8rem;
      color: var(--av-text-primary, #E5E7EB);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .preview-content,
    [data-theme="light"] .preview-content {
      color: #1F2937;
    }

    .duplicate-info-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--av-text-muted, #9CA3AF);
      background: var(--av-surface-secondary, rgba(255, 255, 255, 0.03));
      border-radius: 8px;
      padding: 8px 12px;
    }

    :host-context([data-theme="light"]) .duplicate-info-notice,
    [data-theme="light"] .duplicate-info-notice {
      color: #6B7280;
      background: #F3F4F6;
    }

    .duplicate-modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }

    .duplicate-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .secondary-btn {
      background: var(--av-surface-secondary, rgba(255, 255, 255, 0.06));
      color: var(--av-text-secondary, #D1D5DB);
      border: 1px solid var(--av-border, #374151);
    }

    .secondary-btn:hover {
      background: var(--av-surface-tertiary, rgba(255, 255, 255, 0.1));
      color: var(--av-text-primary, #FFFFFF);
    }

    :host-context([data-theme="light"]) .secondary-btn,
    [data-theme="light"] .secondary-btn {
      background: #F3F4F6;
      color: #374151;
      border-color: #D1D5DB;
    }

    :host-context([data-theme="light"]) .secondary-btn:hover,
    [data-theme="light"] .secondary-btn:hover {
      background: #E5E7EB;
      color: #111827;
    }

    .override-btn {
      background: #2563EB;
      color: #ffffff;
      border: 1px solid #3B82F6;
    }

    .override-btn:hover {
      background: #1D4ED8;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultDuplicateModalComponent {
  matchedUsername = input<string>('');
  resourceSnippet = input<string>('');
  category = input<string>('');
  close = output<void>();
  override = output<void>();

  onBackdropClick(event: MouseEvent) {
    this.close.emit();
  }
}
