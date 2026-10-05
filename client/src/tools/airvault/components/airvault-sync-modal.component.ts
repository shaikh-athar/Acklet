import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice } from '../services/airvault-device.service';

export interface SyncModalProgressData {
  status: 'connecting' | 'authenticating' | 'syncing' | 'synced' | 'error';
  syncedCount: number;
  totalCount: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-airvault-sync-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
      <div class="sync-modal-box" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="sync-modal-header">
          <div class="header-left-badge">
            <app-icon name="rotate-cw" class="icon-xs spin-anim" [style.color]="device()?.accentColor || '#2196F3'"></app-icon>
            <span class="header-title">Multi-Device Synchronization</span>
          </div>
          <button class="av-btn-icon" (click)="close.emit()" aria-label="Close modal">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="sync-modal-body">
          <!-- Device Profile Avatar Box -->
          <div class="device-sync-avatar-wrap">
            <div class="device-sync-avatar" [style.border-color]="device()?.accentColor || '#2196F3'" [style.color]="device()?.accentColor || '#2196F3'">
              <app-icon [name]="getDeviceIcon(device()?.type)" class="icon-lg"></app-icon>
            </div>
            <div class="device-sync-meta">
              <span class="device-sync-name">{{ device()?.name || 'Remote Device' }}</span>
              <span class="device-sync-status-line">
                <span class="live-dot" [style.background]="device()?.accentColor || '#2196F3'"></span>
                <span>{{ getStatusSubtitle() }}</span>
              </span>
            </div>
          </div>

          <!-- Progress Bar & State Display -->
          <div class="sync-progress-container">
            <div class="sync-progress-header">
              <span class="sync-stage-label">
                @switch (progress().status) {
                  @case ('connecting') { Connecting via secure P2P… }
                  @case ('authenticating') { Verifying Zero-Knowledge ECDH key… }
                  @case ('syncing') { Syncing your clipboard… }
                  @case ('synced') { ✓ Clipboard fully synchronized }
                  @case ('error') { ⚠️ Sync interrupted }
                }
              </span>
              <span class="sync-count-label">
                {{ progress().syncedCount }} / {{ progress().totalCount }} items
              </span>
            </div>

            <!-- Progress Track -->
            <div class="sync-progress-track">
              <div class="sync-progress-fill" 
                   [style.width.%]="progressPercent()"
                   [style.background]="progress().status === 'synced' ? '#10B981' : (progress().status === 'error' ? '#EF4444' : (device()?.accentColor || '#2196F3'))">
              </div>
            </div>
          </div>

          <!-- Informational Notes -->
          <div class="sync-info-box">
            <app-icon name="shield-check" class="icon-xs text-cyan"></app-icon>
            <p>100% Client-Side End-to-End Encrypted. Existing history merged append-only without overwriting data.</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="sync-modal-footer">
          @if (progress().status === 'error') {
            <button class="av-btn-secondary" (click)="retry.emit()">
              <app-icon name="rotate-cw" class="icon-xs"></app-icon>
              <span>Retry Sync</span>
            </button>
          }
          <button class="av-btn-primary" (click)="close.emit()">
            <app-icon [name]="progress().status === 'synced' ? 'check' : 'check'" class="icon-xs"></app-icon>
            <span>{{ progress().status === 'synced' ? 'Done' : 'Continue in Background' }}</span>
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
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      animation: fadeIn 0.16s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .sync-modal-box {
      width: 100%;
      max-width: 480px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      border-radius: var(--av-radius-lg);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .sync-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--av-border);
      background: var(--av-surface-secondary);
    }

    .header-left-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary);
    }

    .sync-modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: var(--av-surface-primary);
    }

    .device-sync-avatar-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md);
    }

    .device-sync-avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 2px solid;
      background: var(--av-surface-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .device-sync-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }

    .device-sync-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--av-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .device-sync-status-line {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--av-text-muted);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .sync-progress-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sync-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
    }

    .sync-stage-label {
      font-weight: 600;
      color: var(--av-text-primary);
    }

    .sync-count-label {
      font-family: var(--av-font-mono);
      font-weight: 600;
      color: var(--av-text-muted);
      font-size: 12px;
    }

    .sync-progress-track {
      width: 100%;
      height: 8px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .sync-progress-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.25s ease, background 0.2s ease;
    }

    .sync-info-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(33, 150, 243, 0.06);
      border: 1px solid rgba(33, 150, 243, 0.15);
      border-radius: var(--av-radius-sm);
    }

    .sync-info-box p {
      margin: 0;
      font-size: 11.5px;
      line-height: 1.45;
      color: var(--av-text-secondary);
    }

    .sync-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px;
      background: var(--av-surface-secondary);
      border-top: 1px solid var(--av-border);
    }

    .spin-anim {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultSyncModalComponent {
  device = input<AirVaultDevice | null>(null);
  progress = input.required<SyncModalProgressData>();

  close = output<void>();
  retry = output<void>();

  progressPercent = computed(() => {
    const p = this.progress();
    if (p.totalCount === 0) return p.status === 'synced' ? 100 : 30;
    return Math.min(100, Math.round((p.syncedCount / p.totalCount) * 100));
  });

  getStatusSubtitle(): string {
    const p = this.progress();
    const d = this.device();
    if (p.status === 'synced') return `${d?.name || 'Device'} Synced`;
    if (p.status === 'error') return 'Sync Failed';
    return `${d?.os || 'Connected Device'} · Syncing`;
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
