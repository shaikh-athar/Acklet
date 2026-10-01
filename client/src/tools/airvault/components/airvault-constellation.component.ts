import { Component, ChangeDetectionStrategy, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice, AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';

@Component({
  selector: 'app-airvault-constellation',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <aside class="device-rail">
      <!-- Self node: always accent (always "live/active") -->
      <div class="rail-node-wrapper">
        <button
          class="device-node self"
          [class.selected]="selectedTargetId() === undefined"
          (click)="selectTarget.emit(undefined)"
          [style.borderColor]="currentDevice().accentColor || '#2196F3'"
          [style.color]="currentDevice().accentColor || '#2196F3'"
          [attr.data-tooltip]="getDisplayLabel(currentDevice()) + ' (You)'"
        >
          <app-icon name="user" class="icon-sm"></app-icon>
          <span class="dot live" [style.background]="currentDevice().accentColor || '#2196F3'"></span>
        </button>
      </div>

      <!-- Paired devices: highlighted border when syncEnabled with device accentColor, dimmed when disabled -->
      @for (device of pairedDevices(); track device.id) {
        <div class="rail-node-wrapper" (mouseleave)="activeMenuDeviceId.set(null)">
          <button
            class="device-node"
            [class.sync-enabled]="device.syncEnabled !== false"
            [class.sync-disabled]="device.syncEnabled === false"
            [class.selected]="selectedTargetId() === device.id"
            [class.offline]="device.status === 'offline' && !deviceService.isReconnecting(device.id)"
            [class.connecting]="device.status === 'connecting' || deviceService.isReconnecting(device.id)"
            [style.borderColor]="device.syncEnabled !== false ? (device.accentColor || '#10B981') : 'var(--av-border)'"
            [style.color]="device.syncEnabled !== false ? (device.accentColor || '#10B981') : 'var(--av-text-muted)'"
            (click)="toggleSync.emit(device.id)"
            (contextmenu)="$event.preventDefault(); toggleMenu(device.id)"
            [attr.data-tour]="$index === 0 ? 'paired-device-icon' : null"
          >
            @if (device.status === 'connecting' || deviceService.isReconnecting(device.id)) {
              <app-icon name="loader-2" class="icon-sm spin-anim text-cyan"></app-icon>
            } @else {
              <app-icon [name]="getDeviceIcon(device.type)" class="icon-sm"></app-icon>
            }
            <span class="dot" [class.live]="device.status === 'active' && device.syncEnabled !== false" [class.connecting]="device.status === 'connecting' || deviceService.isReconnecting(device.id)" [style.background]="device.accentColor || '#10B981'"></span>
          </button>
          <!-- Hover Context Menu Card -->
          <div class="device-hover-card">
            <div class="hover-card-header">
              <div class="hover-dev-info">
                <app-icon [name]="getDeviceIcon(device.type)" class="icon-xs" [style.color]="device.accentColor || '#10B981'"></app-icon>
                @if (editingDeviceId() === device.id) {
                  <input
                    type="text"
                    class="inline-name-input"
                    [value]="editingNameValue()"
                    (input)="editingNameValue.set($any($event.target).value)"
                    (keydown.enter)="saveInlineRename(device, $any($event.target).value)"
                    (keydown.escape)="cancelInlineRename()"
                    (blur)="saveInlineRename(device, $any($event.target).value)"
                    (click)="$event.stopPropagation()"
                    autofocus
                  />
                } @else {
                  <span
                    class="hover-dev-name clickable"
                    (click)="startInlineRename(device, $event)"
                    title="Click to rename"
                  >
                    {{ getDisplayLabel(device) }}
                  </span>
                }
              </div>
              @if (editingDeviceId() !== device.id) {
                <span class="hover-status-pill"
                  [class.online]="device.status === 'active'"
                  [class.connecting]="device.status === 'connecting'">
                  {{ device.status === 'active' ? 'Connected' : device.status === 'connecting' ? 'Connecting...' : 'Offline' }}
                </span>
              }
            </div>

            <div class="hover-meta-row">
              <span>{{ device.os }}</span>
              <span>·</span>
              <span>Last active: {{ formatTime(device.lastActive) }}</span>
            </div>

            <div class="hover-card-actions">
              <!-- Manual Sync Now -->
              @if (device.status === 'active') {
                <button class="hover-act-btn" (click)="syncNow.emit(device); $event.stopPropagation()">
                  <app-icon name="cloud-sync" class="icon-xs text-cyan"></app-icon>
                  <span>Sync</span>
                </button>
              }

              <!-- Copy Actual Username / Handle -->
              <button class="hover-act-btn" (click)="copyHandle(device, $event); $event.stopPropagation()">
                <app-icon name="copy" class="icon-xs text-muted"></app-icon>
                <span>Copy &#64;{{ getActualUsername(device) }}</span>
              </button>

              <!-- Reconnect / Disconnect -->
              @if (device.status === 'active') {
                <button class="hover-act-btn" (click)="disconnect.emit(device.id); $event.stopPropagation()">
                  <app-icon name="unplug" class="icon-xs text-amber"></app-icon>
                  <span>Disconnect</span>
                </button>
              } @else if (device.status === 'connecting' || deviceService.isReconnecting(device.id)) {
                <button class="hover-act-btn" disabled>
                  <app-icon name="loader-2" class="icon-xs text-cyan spin-anim"></app-icon>
                  <span>Reconnecting...</span>
                </button>
              } @else {
                <button class="hover-act-btn" (click)="reconnect.emit(device.id); $event.stopPropagation()">
                  <app-icon name="rotate-cw" class="icon-xs text-cyan"></app-icon>
                  <span>Reconnect</span>
                </button>
              }

              <!-- Remove / Forget -->
              <button class="hover-act-btn danger" (click)="confirmRemove(device); $event.stopPropagation()">
                <app-icon name="trash-2" class="icon-xs"></app-icon>
                <span>Remove Device</span>
              </button>
            </div>
          </div>
        </div>
      }

      <div class="rail-sep"></div>

      <!-- Add device -->
      <button class="rail-util-btn" (click)="openPairingModal.emit()" data-tooltip="Pair a new device" data-tour="pair-device-btn">
        <app-icon name="plus" class="icon-xs"></app-icon>
      </button>

      <!-- Manage -->
      <button class="rail-util-btn" (click)="openDeviceManager.emit()" data-tooltip="Manage devices">
        <app-icon name="sliders" class="icon-xs"></app-icon>
      </button>
    </aside>

    <!-- Custom Confirmation Modal for Device Removal -->
    @if (uiStore.deviceToConfirmRemove(); as targetDev) {
      <div class="confirm-modal-backdrop" (click)="uiStore.deviceToConfirmRemove.set(null)">
        <div class="confirm-modal-card" (click)="$event.stopPropagation()">
          <div class="confirm-modal-header">
            <div class="confirm-icon-circle danger">
              <app-icon name="trash-2" class="icon-sm"></app-icon>
            </div>
            <div class="confirm-header-text">
              <h3 class="confirm-title">Forget Device?</h3>
              <p class="confirm-subtitle">Permanently unpair and remove from constellation</p>
            </div>
          </div>

          <div class="confirm-modal-body">
            <p class="confirm-msg">
              Are you sure you want to forget <strong>"{{ targetDev.name }}"</strong>?
              This will terminate encrypted synchronization with this device.
            </p>
          </div>

          <div class="confirm-modal-footer">
            <button class="av-btn-secondary" (click)="uiStore.deviceToConfirmRemove.set(null)">
              Cancel
            </button>
            <button class="av-btn-danger" (click)="executeRemoval(targetDev.id)">
              <app-icon name="trash-2" class="icon-xs"></app-icon>
              <span>Forget Device</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .device-rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0;
      gap: 6px;
      width: 50px;
      height: 100%;
      border-right: 1px solid var(--av-border);
      background: var(--av-surface-primary);
      box-sizing: border-box;
      flex-shrink: 0;
      overflow: visible;
      z-index: 20;
    }

    /* Rail tooltips point rightwards so they don't clip */
    .device-rail [data-tooltip]::after {
      bottom: auto;
      top: 50%;
      left: calc(100% + 8px);
      transform: translateY(-50%) translateX(-4px);
    }
    .device-rail [data-tooltip]:hover::after {
      transform: translateY(-50%) translateX(0);
    }

    /* Device node: 34×34, icon centered with padding:0 */
    .device-node {
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: var(--av-radius-md);
      background: var(--av-surface-secondary);
      color: var(--av-text-muted);
      border: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      cursor: pointer;
      box-sizing: border-box;
      flex-shrink: 0;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }
    .device-node:hover { background: var(--av-border); color: var(--av-text-primary); border-color: var(--av-border-strong); }
    /* Self node: always accent ring */
    .device-node.self {
      background: rgba(33, 150, 243, 0.08);
    }
    /* Sync-enabled peer: active bright border showing it is part of automatic sync with device-specific accent */
    .device-node.sync-enabled:not(.self) {
      background: rgba(16, 185, 129, 0.08);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    /* Sync-disabled peer: dimmed/inactive border showing sync is stopped */
    .device-node.sync-disabled:not(.self) {
      border-color: var(--av-border) !important;
      background: var(--av-surface-secondary);
      color: var(--av-text-muted) !important;
      opacity: 0.45;
    }
    .device-node.sync-disabled:hover {
      opacity: 0.85;
      border-color: var(--av-border-strong) !important;
    }
    /* Selected peer focus */
    .device-node.selected:not(.self) {
      background: rgba(33, 150, 243, 0.14);
    }

    /* Owner badge pip on root device */
    .owner-badge-pip {
      position: absolute;
      top: -4px;
      left: -4px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #2196F3;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--av-surface-primary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }
    .icon-tiny {
      width: 8px;
      height: 8px;
    }

    /* Status dot */
    .dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--av-border-strong);
      border: 1.5px solid var(--av-surface-primary);
    }
    .dot.live { background: #2196F3; }

    .rail-sep {
      width: 20px;
      height: 1px;
      background: var(--av-border);
      margin: 2px 0;
      flex-shrink: 0;
    }

    /* ── Node Wrapper & Hover Menu ── */
    .rail-node-wrapper {
      position: relative;
    }

    .device-node.offline {
      opacity: 0.55;
      border-style: dashed;
    }

    .device-hover-card {
      position: absolute;
      left: calc(100% + 8px);
      top: 0;
      width: 230px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      border-radius: var(--av-radius-md);
      padding: 12px;
      box-shadow: var(--av-shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 9px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
      transform: translateX(-4px);
      z-index: 9999;
    }

    /* Invisible hover bridge to eliminate the gap between button and card */
    .device-hover-card::before {
      content: '';
      position: absolute;
      top: -8px;
      left: -16px;
      bottom: -8px;
      width: 20px;
      background: transparent;
    }

    .rail-node-wrapper:hover .device-hover-card {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateX(0);
    }

    .hover-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 24px;
    }

    .hover-dev-info {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .hover-dev-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }

    .hover-status-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--av-radius-sm);
      background: var(--av-surface-secondary);
      color: var(--av-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .hover-status-pill.online {
      background: var(--av-accent-soft);
      color: var(--av-accent);
    }
    .hover-status-pill.connecting {
      background: color-mix(in srgb, var(--av-text-muted) 12%, transparent);
      color: var(--av-text-muted);
      animation: pulse-connecting 1.2s ease-in-out infinite;
    }
    @keyframes pulse-connecting {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    .spin {
      animation: spin-icon 0.9s linear infinite;
    }
    @keyframes spin-icon {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .hover-meta-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      color: var(--av-text-muted);
    }

    .hover-card-actions {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding-top: 6px;
      border-top: 1px solid var(--av-border);
    }

    .hover-act-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 8px;
      border-radius: var(--av-radius-sm);
      background: transparent;
      border: none;
      color: var(--av-text-primary);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .hover-act-btn:hover {
      background: var(--av-surface-secondary);
    }
    .hover-act-btn.danger {
      color: var(--av-danger);
    }
    .hover-act-btn.danger:hover {
      background: var(--av-danger-soft);
      color: var(--av-danger);
    }

    .text-amber { color: #F59E0B; }
    .text-cyan { color: #2196F3; }

    .hover-dev-name.clickable {
      cursor: pointer;
      border-bottom: 1px dashed var(--av-border-strong);
      transition: color 0.12s ease, border-color 0.12s ease;
    }
    .hover-dev-name.clickable:hover {
      color: var(--av-accent);
      border-bottom-color: var(--av-accent);
    }

    .inline-name-input {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-primary);
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-accent);
      border-radius: var(--av-radius-sm);
      padding: 2px 6px;
      width: 100%;
      height: 22px;
      outline: none;
      box-sizing: border-box;
      box-shadow: 0 0 0 1px var(--av-accent-soft);
    }

    /* ── Custom Confirmation Modal ── */
    .confirm-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(16, 24, 40, 0.7);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    .confirm-modal-card {
      width: 100%;
      max-width: 420px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: confirmModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes confirmModalIn {
      from { opacity: 0; transform: scale(0.96) translateY(4px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }

    .confirm-modal-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .confirm-icon-circle.danger {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(229, 72, 77, 0.15);
      color: #E5484D;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .confirm-header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .confirm-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
    }

    .confirm-subtitle {
      font-size: 12px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
    }

    .confirm-modal-body {
      font-size: 13px;
      color: var(--av-text-primary, #F0F3F6);
      line-height: 1.5;
    }

    .confirm-msg {
      margin: 0;
    }

    .confirm-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--av-border, #252B33);
    }

    .av-btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #E5484D;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.12s ease;
    }
    .av-btn-danger:hover {
      opacity: 0.9;
    }

    /* Utility buttons: 28×28, dashed, neutral until hovered */
    .rail-util-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--av-radius-sm);
      border: 1px dashed var(--av-border-strong);
      color: var(--av-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      cursor: pointer;
      padding: 0;
      box-sizing: border-box;
      flex-shrink: 0;
      transition: border-color 0.12s ease, color 0.12s ease, background 0.12s ease;
    }
    .rail-util-btn:hover { border-color: #2196F3; color: #2196F3; background: rgba(33,150,243,0.08); border-style: solid; }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spin-anim {
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .device-node.connecting {
      border-color: var(--av-accent, #2196F3) !important;
      background: rgba(33, 150, 243, 0.12) !important;
      color: var(--av-accent, #2196F3) !important;
    }
    .dot.connecting {
      background: var(--av-accent, #2196F3) !important;
      box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
      animation: radar-pulse 1.5s infinite;
    }
    @keyframes radar-pulse {
      0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
      70% { box-shadow: 0 0 0 5px rgba(33, 150, 243, 0); }
      100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultConstellationComponent {
  public deviceService = inject(AirVaultDeviceService);
  public syncService = inject(AirVaultSyncService);
  public uiStore = inject(AirVaultUIStore);

  currentDevice = input.required<AirVaultDevice>();
  pairedDevices = input.required<AirVaultDevice[]>();
  selectedTargetId = input<string | undefined>(undefined);

  selectTarget = output<string | undefined>();
  toggleSync = output<string>();
  openPairingModal = output<void>();
  openDeviceManager = output<void>();
  syncNow = output<AirVaultDevice>();
  disconnect = output<string>();
  reconnect = output<string>();
  rename = output<{ deviceId: string; newName: string }>();
  remove = output<string>();

  activeMenuDeviceId = signal<string | null>(null);
  editingDeviceId = signal<string | null>(null);
  editingNameValue = signal<string>('');

  getDisplayLabel(device?: AirVaultDevice | null): string {
    return this.deviceService.getDisplayLabel(device);
  }

  getActualUsername(device?: AirVaultDevice | null): string {
    return this.deviceService.getActualUsername(device);
  }

  toggleMenu(deviceId: string) {
    this.activeMenuDeviceId.set(this.activeMenuDeviceId() === deviceId ? null : deviceId);
  }

  startInlineRename(device: AirVaultDevice, event: Event) {
    event.stopPropagation();
    this.editingDeviceId.set(device.id);
    this.editingNameValue.set(this.getDisplayLabel(device));
  }

  saveInlineRename(device: AirVaultDevice, val: string) {
    const trimmed = (val || '').trim();
    if (trimmed && trimmed !== this.getDisplayLabel(device)) {
      this.rename.emit({ deviceId: device.id, newName: trimmed });
    }
    // If empty or unchanged, reverts back naturally to device label
    this.editingDeviceId.set(null);
  }

  cancelInlineRename() {
    this.editingDeviceId.set(null);
  }

  confirmRemove(device: AirVaultDevice) {
    this.uiStore.deviceToConfirmRemove.set(device);
  }

  executeRemoval(deviceId: string) {
    this.remove.emit(deviceId);
    this.uiStore.deviceToConfirmRemove.set(null);
  }

  copyHandle(device: AirVaultDevice, event: Event) {
    const actual = this.getActualUsername(device);
    const handle = `@${actual}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(handle);
    }
  }

  copyId(id: string, event: Event) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(id);
    }
  }

  formatTime(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'smartphone': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'laptop': return 'laptop';
      case 'desktop': return 'monitor';
      default: return 'laptop';
    }
  }
}
