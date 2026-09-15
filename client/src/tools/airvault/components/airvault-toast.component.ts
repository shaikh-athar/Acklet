import { Component, ChangeDetectionStrategy, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <!-- 1. Rich Disconnected Source Notification -->
    @if (disconnectedAlert(); as alert) {
      <div class="airvault-disconnected-alert" (click)="$event.stopPropagation()">
        <div class="alert-header">
          <div class="alert-device-identity">
            <span class="device-accent-dot" [style.background]="alert.sourceDeviceAccent || '#2196F3'"></span>
            <app-icon [name]="getDeviceIcon(alert.sourceDeviceType)" class="icon-xs device-icon"></app-icon>
            <span class="device-username">&#64;{{ alert.sourceDeviceUsername || alert.sourceDeviceName }}</span>
          </div>
          <button class="alert-close-btn" (click)="dismissAlert.emit()" data-tooltip="Dismiss">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <div class="alert-body">
          <div class="alert-title">Sent new clipboard data</div>
          <div class="alert-desc">You are currently disconnected from this device. Reconnect to receive live sync.</div>
          @if (alert.itemSnippet) {
            <div class="alert-snippet-preview">
              <app-icon [name]="getCategoryIcon(alert.itemCategory)" class="icon-xs snippet-icon"></app-icon>
              <span class="snippet-text">{{ alert.itemSnippet }}</span>
            </div>
          }
        </div>

        <div class="alert-actions">
          <button class="alert-reconnect-btn" [disabled]="isReconnecting()" (click)="onReconnectClick(alert.sourceDeviceId)">
            @if (isReconnecting()) {
              <app-icon name="loader-2" class="icon-xs spin-icon"></app-icon>
              <span>Connecting...</span>
            } @else {
              <app-icon name="rotate-cw" class="icon-xs"></app-icon>
              <span>Reconnect</span>
            }
          </button>
          <button class="alert-dismiss-text-btn" (click)="dismissAlert.emit()">
            Dismiss
          </button>
        </div>
      </div>
    }

    <!-- 2. Standard Quick Toast -->
    @if (message() && !disconnectedAlert()) {
      <div class="airvault-toast-banner" (click)="dismiss.emit()">
        @if (getToastIcon()) {
          <app-icon [name]="getToastIcon()" class="icon-xs text-cyan" [class.spin-icon]="isSyncingToast()"></app-icon>
        }
        <span class="toast-text">{{ cleanToastMessage() }}</span>
      </div>
    }
  `,
  styles: [`
    .airvault-toast-banner {
      position: fixed;
      bottom: 56px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--av-surface-elevated, #ffffff);
      border: 1px solid var(--av-accent, #2196F3);
      box-shadow: 0 10px 28px -4px rgba(0, 0, 0, 0.25), 0 0 10px var(--av-accent-soft, rgba(33, 150, 243, 0.15));
      border-radius: var(--av-radius-full, 9999px);
      padding: 7px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      animation: popUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .airvault-toast-banner,
    [data-theme="light"] .airvault-toast-banner {
      background: #ffffff;
      border-color: #2196F3;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(33, 150, 243, 0.2);
    }

    .toast-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--av-text-primary);
    }

    /* ── Disconnected Source Alert Card ── */
    .airvault-disconnected-alert {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 330px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-left: 4px solid var(--av-accent, #2196F3);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: var(--av-radius-md, 10px);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 1100;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }

    .alert-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .alert-device-identity {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .device-accent-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .device-icon {
      color: var(--av-text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .device-username {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--av-text-primary);
      letter-spacing: -0.01em;
    }

    .alert-close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--av-radius-sm, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .alert-close-btn:hover {
      color: var(--av-text-primary);
      background: var(--av-surface-secondary);
    }

    .alert-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .alert-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--av-text-primary);
      letter-spacing: -0.01em;
    }

    .alert-desc {
      font-size: 11.5px;
      color: var(--av-text-muted);
      line-height: 1.45;
    }

    .alert-snippet-preview {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 4px;
      padding: 6px 10px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-sm, 6px);
      font-size: 11px;
      color: var(--av-text-primary);
      font-family: var(--av-font-mono);
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .snippet-icon {
      color: var(--av-text-muted);
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .snippet-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .alert-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .alert-reconnect-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: var(--av-radius-sm, 6px);
      background: var(--av-accent, #2196F3);
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    .alert-reconnect-btn:hover {
      background: var(--av-accent-hover, #1976D2);
    }

    .alert-dismiss-text-btn {
      background: transparent;
      border: none;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--av-text-muted);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--av-radius-sm, 6px);
      transition: color 0.15s ease, background 0.15s ease;
    }
    .alert-dismiss-text-btn:hover {
      color: var(--av-text-primary);
      background: var(--av-surface-secondary);
    }

    @keyframes popUp {
      from { transform: translate(-50%, 16px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    @keyframes slideInRight {
      from { transform: translateX(30px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .text-cyan { color: var(--av-accent); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultToastComponent {
  message = input<string | null>(null);
  disconnectedAlert = input<any | null>(null);

  dismiss = output<void>();
  dismissAlert = output<void>();
  reconnect = output<string>();

  isReconnecting = signal<boolean>(false);

  onReconnectClick(deviceId: string) {
    this.isReconnecting.set(true);
    setTimeout(() => this.isReconnecting.set(false), 2000);
    this.reconnect.emit(deviceId);
  }

  getToastIcon(): string {
    const raw = this.message() || '';
    const msg = raw.toLowerCase();

    // Link / URL actions
    if (msg.includes('link') || msg.includes('url')) {
      return 'link';
    }
    // Copy / Clipboard
    if (msg.includes('copied') || msg.includes('clipboard') || raw.includes('📋')) {
      return 'copy';
    }
    // Download / vCard / Export
    if (msg.includes('download') || msg.includes('vcard') || msg.includes('export')) {
      return 'download';
    }
    // Phone / Calls / Messages
    if (msg.includes('calling') || msg.includes('dialing')) {
      return 'phone';
    }
    if (msg.includes('composing') || msg.includes('sms') || msg.includes('message to')) {
      return 'message-square';
    }
    // Maps / Directions / Location
    if (msg.includes('map') || msg.includes('direction') || msg.includes('address')) {
      return 'map-pin';
    }
    // Sync / Refresh
    if (raw.includes('🔄') || msg.includes('synchroniz') || msg.includes('refresh') || msg.includes('resending')) {
      return 'refresh-cw';
    }
    // Network / Offline / Warning / Error / Storage cap
    if (raw.includes('⚠️') || raw.includes('⛔') || raw.includes('🚫') || msg.includes('fail') || msg.includes('unreachable') || msg.includes('cap reached') || msg.includes('error')) {
      return 'alert-triangle';
    }
    // Info / Notice
    if (raw.includes('ℹ️') || msg.includes('already exists') || msg.includes('info')) {
      return 'info';
    }
    // Zap / Quick connect / Live beams
    if (raw.includes('⚡') || msg.includes('paired') || msg.includes('connected')) {
      return 'zap';
    }
    // Security / Revoke / Wipe
    if (raw.includes('🔒') || msg.includes('revoked') || msg.includes('wiped') || msg.includes('lock')) {
      return 'lock';
    }
    // Delete / Trash / Burn
    if (raw.includes('🗑️') || raw.includes('🔥') || msg.includes('deleted') || msg.includes('burned') || msg.includes('trash')) {
      return 'trash-2';
    }
    // Disconnect
    if (raw.includes('🔌') || msg.includes('disconnected') || msg.includes('unplug')) {
      return 'unplug';
    }
    // Package / Archive
    if (raw.includes('📦') || msg.includes('archive') || msg.includes('package')) {
      return 'package';
    }

    return 'check';
  }

  isSyncingToast(): boolean {
    const raw = this.message() || '';
    const msg = raw.toLowerCase();
    return raw.includes('🔄') || msg.includes('synchroniz') || msg.includes('refreshing') || msg.includes('resending');
  }

  cleanToastMessage(): string {
    const msg = this.message() || '';
    // Strip all leading raw emoji, symbols, bullets, or checkmarks so no extra gap remains before the message
    return msg.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✓✔︎✕✖️ℹ️⚠️⛔🚫⚡🔒🗑️🔌📋📦🔄🔥•\s]+/u, '').trim();
  }

  getDeviceIcon(type?: string): string {
    switch (type) {
      case 'smartphone': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'laptop': return 'laptop';
      case 'desktop': return 'monitor';
      default: return 'smartphone';
    }
  }

  getCategoryIcon(cat?: string): string {
    switch (cat) {
      case 'image': return 'image';
      case 'video': return 'video';
      case 'audio': return 'volume-2';
      case 'pdf': return 'file-text';
      case 'spreadsheet': return 'table';
      case 'archive': return 'archive';
      case 'code': return 'code';
      case 'url': return 'link';
      default: return 'file';
    }
  }
}
