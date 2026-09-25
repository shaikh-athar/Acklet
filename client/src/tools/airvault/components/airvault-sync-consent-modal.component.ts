import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-sync-consent-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" (keydown.escape)="skip.emit(device())">
      <div class="consent-modal-card" (click)="$event.stopPropagation()">
        <!-- Header with Device Badge -->
        <div class="consent-header">
          <div class="device-icon-circle" [style.border-color]="device()?.accentColor || '#2196F3'" [style.color]="device()?.accentColor || '#2196F3'">
            <app-icon [name]="getDeviceIcon(device()?.type)" class="icon-md"></app-icon>
          </div>
          <h2 class="consent-title">Sync existing clipboard data from {{ getDeviceDisplayName() }}?</h2>
          <p class="consent-subtitle">
            Connected with <strong>{{ getDeviceDisplayName() }}</strong>. Would you like to pull and display their existing clipboard history on this device?
          </p>
        </div>

        <!-- Explanatory note -->
        <div class="consent-info-card">
          <div class="consent-info-icon">
            <app-icon name="shield-check" class="icon-xs text-accent"></app-icon>
          </div>
          <div class="consent-info-text">
            <span class="info-title">Independent & Safe Sync</span>
            <span class="info-desc">
              Selecting <strong>No</strong> keeps this device's existing data as-is with nothing pulled in. 
              The remote device evaluates your data independently.
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="consent-modal-actions">
          <button class="av-btn-secondary skip-btn" (click)="skip.emit(device())" data-tooltip="Keep current data as-is">
            <app-icon name="refresh-cw-off" class="icon-xs"></app-icon>
            <span>No, Skip</span>
          </button>
          <button class="consent-sync-btn" (click)="sync.emit(device())" data-tooltip="Pull existing clipboard items from this device">
            <app-icon name="rotate-cw" class="icon-xs"></app-icon>
            <span>Yes, Sync</span>
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
      animation: consentBdFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes consentBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .consent-modal-card {
      width: 100%;
      max-width: 460px;
      background: var(--av-surface-primary, #111419);
      border: 1px solid var(--av-border, #252B33);
      border-radius: var(--av-radius-lg, 12px);
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: consentModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes consentModalPop {
      from {
        transform: scale(0.92) translateY(8px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    :host-context([data-theme="light"]) .consent-modal-card,
    [data-theme="light"] .consent-modal-card {
      background: #ffffff;
      border-color: #E4E7EC;
      box-shadow: 0 16px 40px rgba(16, 24, 40, 0.16);
    }

    .consent-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .device-icon-circle {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 2px solid;
      background: var(--av-surface-secondary, #171B21);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      animation: consentPulse 2s infinite ease-in-out;
    }

    :host-context([data-theme="light"]) .device-icon-circle,
    [data-theme="light"] .device-icon-circle {
      background: #F8FAFC;
    }

    @keyframes consentPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.25); }
      50%      { box-shadow: 0 0 0 6px rgba(33, 150, 243, 0); }
    }

    .consent-title {
      font-size: 16.5px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .consent-subtitle {
      font-size: 13px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
      line-height: 1.45;
    }

    .consent-subtitle strong {
      color: var(--av-text-primary, #FFFFFF);
    }

    :host-context([data-theme="light"]) .consent-title,
    [data-theme="light"] .consent-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .consent-subtitle,
    [data-theme="light"] .consent-subtitle {
      color: #475569;
    }

    :host-context([data-theme="light"]) .consent-subtitle strong,
    [data-theme="light"] .consent-subtitle strong {
      color: #0F172A;
    }

    .consent-info-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    :host-context([data-theme="light"]) .consent-info-card,
    [data-theme="light"] .consent-info-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .consent-info-icon {
      margin-top: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--av-accent, #2196F3);
    }

    .consent-info-text {
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

    :host-context([data-theme="light"]) .info-title,
    [data-theme="light"] .info-title {
      color: #0F172A;
    }

    .info-desc {
      font-size: 11.5px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .info-desc,
    [data-theme="light"] .info-desc {
      color: #64748B;
    }

    .info-desc strong {
      color: var(--av-text-primary, #FFFFFF);
    }

    :host-context([data-theme="light"]) .info-desc strong,
    [data-theme="light"] .info-desc strong {
      color: #0F172A;
    }

    .consent-modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .skip-btn {
      height: 36px;
      padding: 0 16px;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--av-surface-secondary, #171B21);
      color: var(--av-text-muted, #8B949E);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .skip-btn:hover {
      background: var(--av-surface-elevated, #1A1F26);
      color: var(--av-text-primary, #FFFFFF);
    }

    :host-context([data-theme="light"]) .skip-btn,
    [data-theme="light"] .skip-btn {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #475569;
    }

    :host-context([data-theme="light"]) .skip-btn:hover,
    [data-theme="light"] .skip-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .consent-sync-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      padding: 0 18px;
      background: var(--av-accent, #2196F3);
      color: #FFFFFF;
      border: 1px solid var(--av-accent, #2196F3);
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .consent-sync-btn:hover {
      background: #1976D2;
      border-color: #1976D2;
      box-shadow: 0 2px 10px rgba(33, 150, 243, 0.35);
    }

    .text-accent { color: var(--av-accent, #2196F3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultSyncConsentModalComponent {
  device = input<AirVaultDevice | null>(null);

  sync = output<AirVaultDevice | null>();
  skip = output<AirVaultDevice | null>();

  onBackdropClick(e: MouseEvent) {
    this.skip.emit(this.device());
  }

  getDeviceDisplayName(): string {
    const d = this.device();
    if (!d) return 'Remote Device';
    if (d.username) return `@${d.username.replace(/^@/, '')}`;
    return d.name || 'Remote Device';
  }

  getDeviceIcon(type?: string): string {
    switch (type) {
      case 'smartphone': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'laptop': return 'laptop';
      case 'desktop': return 'monitor';
      default: return 'hard-drive';
    }
  }
}
