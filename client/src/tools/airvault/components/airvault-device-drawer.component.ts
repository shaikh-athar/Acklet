import { Component, ChangeDetectionStrategy, signal, computed, input, output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice, AirVaultDeviceService } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-device-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="drawer-backdrop" [class.closing]="isClosing()" (click)="onClose()">
      <div class="drawer-panel" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-badge">
            <app-icon name="hard-drive" class="icon-sm text-cyan"></app-icon>
            <h2>Connected Devices</h2>
          </div>
          <button class="close-btn" (click)="onClose()" title="Close (Esc)">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Devices List -->
        <div class="drawer-body">
          <!-- 1. THIS DEVICE -->
          <div class="section-title">THIS DEVICE</div>
          <div class="device-item current">
            <div class="device-icon-box">
              <app-icon [name]="getDeviceIcon(currentDevice().type)" class="icon-sm text-cyan"></app-icon>
            </div>
            <div class="device-details">
              <div class="device-title-row">
                <span class="device-name">{{ currentDevice().name }}</span>
                <span class="self-tag">THIS DEVICE</span>
              </div>
              <div class="device-identity-row">
                @if (isEditingUsername()) {
                  <div class="drawer-inline-user-edit-wrapper">
                    <div class="drawer-inline-user-edit" [class.valid]="userCheckStatus() === 'available'" [class.invalid]="userCheckStatus() === 'taken' || userCheckStatus() === 'invalid'">
                      <span class="input-at-prefix">&#64;</span>
                      <input
                        type="text"
                        class="inline-username-input"
                        [(ngModel)]="editUsernameValue"
                        (input)="onUsernameInput($event)"
                        (keydown.enter)="userCheckStatus() === 'available' && saveUsername()"
                        (keydown.escape)="cancelUsernameEdit()"
                        placeholder="new_username"
                        autoFocus
                      />
                      @if (userCheckStatus() === 'checking') {
                        <span class="user-status-spinner"></span>
                      } @else if (userCheckStatus() === 'available') {
                        <app-icon name="check" class="icon-xs status-icon text-green"></app-icon>
                      } @else if (userCheckStatus() === 'taken' || userCheckStatus() === 'invalid') {
                        <app-icon name="x" class="icon-xs status-icon text-red"></app-icon>
                      }
                      <button class="save-user-btn" [disabled]="userCheckStatus() !== 'available'" (click)="saveUsername()" data-tooltip="Save Username">
                        <app-icon name="check" class="icon-xs"></app-icon>
                      </button>
                      <button class="cancel-user-btn" (click)="cancelUsernameEdit()" data-tooltip="Cancel">
                        <app-icon name="x" class="icon-xs"></app-icon>
                      </button>
                    </div>
                    @if (userCheckMessage()) {
                      <span class="drawer-user-hint" [class.hint-green]="userCheckStatus() === 'available'" [class.hint-red]="userCheckStatus() === 'taken' || userCheckStatus() === 'invalid'">
                        {{ userCheckMessage() }}
                      </span>
                    }
                  </div>
                } @else {
                  <span class="device-handle" (click)="startEditUsername()" data-tooltip="Click to edit username">
                    &#64;{{ currentDevice().username || 'local' }}
                    <app-icon name="edit-2" class="edit-icon-inline"></app-icon>
                  </span>
                }
                <span class="meta-sep">·</span>
                <span class="device-keyword-badge clickable-pin-badge" (click)="toggleShowPin($event)" [attr.data-tooltip]="showPin() ? 'Click to Hide PIN' : 'Click to Reveal PIN'">
                  <span>PIN: </span>
                  <span class="pin-badge-digits" [class.is-revealed]="showPin()">
                    {{ showPin() ? (currentDevice().deviceKeyword || '----') : (currentDevice().deviceKeyword ? '••••' : '----') }}
                  </span>
                  <app-icon [name]="showPin() ? 'eye-off' : 'eye'" class="badge-eye-icon"></app-icon>
                </span>
              </div>
              <span class="device-info-text">{{ currentDevice().os }} · {{ currentDevice().browser }}</span>
              <div class="device-meta-sub">
                <span class="status-indicator-dot online"></span>
                <span class="status-text">Online</span>
                <span class="meta-sep">·</span>
                <span class="device-thumb-code">ECDH: {{ currentDevice().thumbprint }}</span>
              </div>
            </div>
          </div>

          <!-- 2. MY REGISTERED INSTANCES / SESSIONS -->
          <div class="section-title paired-title">
            <span>MY REGISTERED SESSIONS ({{ otherRegisteredSessions().length }})</span>
          </div>

          @if (otherRegisteredSessions().length === 0) {
            <div class="no-paired-devices">
              <p>No other active AirVault device sessions registered on your account.</p>
            </div>
          } @else {
            <div class="paired-devices-list">
              @for (session of otherRegisteredSessions(); track session.id) {
                <div class="device-item" [class.device-offline]="session.status === 'offline'">
                  <div class="device-icon-box" [style.borderColor]="session.accentColor || '#2196F3'">
                    <app-icon [name]="getDeviceIcon(session.type)" class="icon-sm" [style.color]="session.accentColor || '#2196F3'"></app-icon>
                  </div>
                  <div class="device-details">
                    <div class="device-title-row">
                      <span class="device-name">{{ session.name }}</span>
                      <span class="session-badge" [class.online]="session.status === 'active'" [class.offline]="session.status !== 'active'">
                        {{ session.status === 'active' ? '● Online' : '○ Offline' }}
                      </span>
                    </div>
                    <div class="device-identity-row">
                      @if (session.username) {
                        <span class="device-handle">&#64;{{ session.username }}</span>
                        <span class="meta-sep">·</span>
                      }
                      <span class="device-keyword-badge">{{ session.deviceKeyword || 'AirVault-Node' }}</span>
                    </div>
                    <span class="device-info-text">{{ session.os }} · {{ session.browser }}</span>
                    <span class="device-last-seen">Last active: {{ formatLastSeen(session.lastActive) }}</span>
                  </div>
                  <button class="logout-instance-btn" (click)="promptRemoteLogout(session)" data-tooltip="Remove my session from this device">
                    <app-icon name="log-out" class="icon-xs"></app-icon>
                    <span>Log Out</span>
                  </button>
                </div>
              }
            </div>
          }

          <!-- 3. PAIRED DEVICES -->
          <div class="section-title paired-title">
            <span>DIRECT PAIRED DEVICES ({{ pairedDevices().length }})</span>
            <button class="pair-more-btn" (click)="openPairingModal.emit()">
              <app-icon name="plus" class="icon-xs"></app-icon>
              <span>Pair More</span>
            </button>
          </div>

          @if (pairedDevices().length === 0) {
            <div class="no-paired-devices">
              <p>No external devices connected. Click "Pair More" to connect your mobile phone or laptop.</p>
            </div>
          } @else {
            <div class="paired-devices-list">
              @for (device of pairedDevices(); track device.id) {
                <div class="device-item" [class.device-item-disabled]="device.syncEnabled === false">
                  <div class="device-icon-box" [style.borderColor]="device.accentColor || '#10B981'">
                    <app-icon [name]="getDeviceIcon(device.type)" class="icon-sm" [style.color]="device.accentColor || '#10B981'"></app-icon>
                  </div>
                  <div class="device-details">
                    <div class="device-title-row">
                      @if (editingDeviceId() === device.id) {
                        <input
                          type="text"
                          class="inline-rename-input"
                          [(ngModel)]="editNameValue"
                          (keydown.enter)="saveRename(device.id)"
                          (keydown.escape)="cancelRename()"
                        />
                        <button class="icon-save-btn" (click)="saveRename(device.id)">
                          <app-icon name="check" class="icon-xs"></app-icon>
                        </button>
                        <button class="icon-cancel-btn" (click)="cancelRename()">
                          <app-icon name="x" class="icon-xs"></app-icon>
                        </button>
                      } @else {
                        <span class="device-name">&#64;{{ device.username || device.name }}</span>
                        <button class="icon-edit-btn" (click)="startRename(device.id, device.name)" data-tooltip="Rename device">
                          <app-icon name="edit-2" class="icon-xs"></app-icon>
                        </button>
                        <span class="device-status-badge" [ngClass]="device.status">{{ device.status }}</span>
                      }
                    </div>
                    <div class="device-identity-row">
                      <span class="device-type-badge">{{ device.type | titlecase }}</span>
                      <span class="meta-sep">·</span>
                      <span class="device-info-text">{{ device.os || 'Unknown OS' }} · {{ device.ipHint || 'Direct P2P' }}</span>
                    </div>
                    
                    <!-- Sync Toggle Switch Row -->
                    <div class="sync-switch-row">
                      <button class="sync-toggle-chip" 
                              [class.sync-on]="device.syncEnabled !== false" 
                              [class.sync-off]="device.syncEnabled === false"
                              (click)="toggleSync.emit(device.id)">
                        <app-icon [name]="device.syncEnabled !== false ? 'check' : 'slash'" class="icon-xs"></app-icon>
                        <span>{{ device.syncEnabled !== false ? 'Sync ON' : 'Sync OFF' }}</span>
                      </button>
                      <span class="sync-caption-text">
                        {{ device.syncEnabled !== false ? 'Auto-sync active' : 'Clipboard sync disabled' }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="device-item-actions">
                    @if (device.status === 'connecting' || deviceService.isReconnecting(device.id)) {
                      <button class="reconnect-btn is-connecting" disabled>
                        <app-icon name="loader-2" class="icon-xs spin-anim"></app-icon>
                        <span>Connecting...</span>
                      </button>
                    } @else if (device.status === 'offline') {
                      <button class="reconnect-btn" (click)="reconnectDevice.emit(device.id)" data-tooltip="Reconnect to this device">
                        <app-icon name="rotate-cw" class="icon-xs"></app-icon>
                        <span>Reconnect</span>
                      </button>
                    } @else {
                      <button class="disconnect-btn" (click)="disconnectDevice.emit(device.id)" data-tooltip="Temporarily disconnect sync">
                        <app-icon name="unplug" class="icon-xs"></app-icon>
                        <span>Disconnect</span>
                      </button>
                    }
                    <button class="revoke-btn" (click)="revokeDevice.emit(device.id)" data-tooltip="Forget & unpair device">
                      <app-icon name="trash-2" class="icon-xs"></app-icon>
                      <span>Forget</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Remote Logout Confirmation Modal Overlay -->
        @if (confirmLogoutDevice(); as target) {
          <div class="logout-confirm-overlay" (click)="confirmLogoutDevice.set(null)">
            <div class="logout-confirm-card" (click)="$event.stopPropagation()">
              <div class="confirm-card-icon">
                <app-icon name="shield-alert" class="icon-md text-red"></app-icon>
              </div>
              <h4 class="confirm-card-title">Log out {{ target.name }}?</h4>
              <p class="confirm-card-desc">
                This will remove your AirVault session and credentials from <strong>{{ target.name }}</strong> ({{ target.os }}).
              </p>

              <!-- Data Retention / Erase Option -->
              <div class="erase-option-box">
                <label class="erase-option-item" [class.selected]="!eraseDataOnLogout()">
                  <input type="radio" name="eraseData" [checked]="!eraseDataOnLogout()" (change)="eraseDataOnLogout.set(false)" />
                  <div class="erase-option-text">
                    <span class="erase-title">Keep local data on device</span>
                    <span class="erase-sub">Leave existing clipboard history intact on the remote device</span>
                  </div>
                </label>

                <label class="erase-option-item danger-border" [class.selected]="eraseDataOnLogout()">
                  <input type="radio" name="eraseData" [checked]="eraseDataOnLogout()" (change)="eraseDataOnLogout.set(true)" />
                  <div class="erase-option-text">
                    <span class="erase-title text-red">Erase all data from device</span>
                    <span class="erase-sub">Wipe all synced clipboard items and cached files on remote device</span>
                  </div>
                </label>
              </div>

              <div class="confirm-actions-row">
                <button class="av-btn-secondary" (click)="confirmLogoutDevice.set(null)">Cancel</button>
                <button class="av-btn-danger" (click)="executeRemoteLogout(target.id)">
                  <app-icon name="log-out" class="icon-xs"></app-icon>
                  <span>{{ eraseDataOnLogout() ? 'Erase & Log Out' : 'Log Out Device' }}</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      justify-content: flex-end;
      animation: drawerBdFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, backdrop-filter;
    }

    .drawer-backdrop.closing {
      animation: drawerBdFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    .drawer-panel {
      width: 380px;
      max-width: 90vw;
      height: 100%;
      background: var(--av-surface-primary);
      border-left: 1px solid var(--av-border);
      box-shadow: -12px 0 36px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .drawer-panel.closing {
      animation: slideOutRight 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }

    @keyframes drawerBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes drawerBdFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0.7;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0.7;
      }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--av-border-subtle);
    }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-badge h2 {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
    }

    .drawer-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--av-text-muted);
      margin-bottom: 8px;
    }

    .section-title.paired-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 24px;
    }

    .pair-more-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      color: var(--av-accent);
      background: transparent;
      border: none;
      cursor: pointer;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .device-item.current {
      border-color: var(--av-accent);
      background: var(--av-surface-elevated);
    }

    .device-icon-box {
      width: 36px;
      height: 36px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .device-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .device-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .device-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main);
    }

    .self-tag {
      font-size: 8px;
      font-weight: 700;
      background: var(--av-accent-subtle);
      color: var(--av-accent);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .device-status-badge {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .device-status-badge.active { background: rgba(63, 185, 80, 0.15); color: var(--av-success); }
    .device-status-badge.idle { background: rgba(210, 153, 34, 0.15); color: var(--av-warning); }
    .device-status-badge.offline { background: rgba(248, 81, 73, 0.15); color: var(--av-error); }

    .device-info-text {
      font-size: 10px;
      color: var(--av-text-muted);
    }

    .device-thumb-code {
      font-family: monospace;
      font-size: 9px;
      color: var(--av-text-muted);
    }

    .reconnect-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid var(--av-accent);
      border-radius: 4px;
      color: var(--av-accent);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .reconnect-btn:hover {
      background: var(--av-accent);
      color: #000000;
    }

    .disconnect-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 4px;
      color: #F59E0B;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .disconnect-btn:hover {
      background: rgba(245, 158, 11, 0.2);
      border-color: #F59E0B;
    }

    .revoke-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: transparent;
      border: 1px solid var(--av-border);
      border-radius: 4px;
      color: var(--av-text-muted);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .revoke-btn:hover {
      color: var(--av-error);
      border-color: var(--av-error);
    }

    .no-paired-devices p {
      font-size: 11px;
      color: var(--av-text-muted);
      line-height: 1.4;
    }

    .inline-rename-input {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-accent);
      border-radius: 4px;
      color: var(--av-text-main);
      font-size: 11px;
      padding: 2px 6px;
      outline: none;
      width: 140px;
    }

    .icon-edit-btn, .icon-save-btn, .icon-cancel-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 4px;
    }
    .icon-edit-btn:hover { color: var(--av-accent); }
    .icon-save-btn { color: var(--av-success); }
    .icon-cancel-btn { color: var(--av-error); }

    .sync-switch-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }

    .sync-toggle-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.15s ease;
    }

    .sync-toggle-chip.sync-on {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10B981;
      color: #10B981;
    }

    .sync-toggle-chip.sync-off {
      background: var(--av-surface-primary);
      border-color: var(--av-border);
      color: var(--av-text-muted);
    }

    .sync-caption-text {
      font-size: 9.5px;
      color: var(--av-text-muted);
    }

    .status-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-indicator-dot.online {
      background: #10B981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }
    .status-text {
      font-size: 10px;
      font-weight: 600;
      color: #10B981;
    }
    .device-meta-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }
    .meta-sep { opacity: 0.4; font-size: 10px; }

    .session-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .session-badge.online {
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
    }
    .session-badge.offline {
      color: var(--av-text-muted);
      background: var(--av-surface-secondary);
    }

    .device-last-seen {
      font-size: 10px;
      color: var(--av-text-muted);
      margin-top: 2px;
    }

    .logout-instance-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.08);
      color: #EF4444;
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .logout-instance-btn:hover {
      background: rgba(239, 68, 68, 0.18);
      border-color: #EF4444;
    }

    /* Modal Overlay for Remote Logout Confirmation */
    .logout-confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.15s ease-out;
    }
    .logout-confirm-card {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md, 10px);
      padding: 20px;
      max-width: 380px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: var(--av-shadow-lg);
    }
    .confirm-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .text-red { color: #EF4444; }
    .confirm-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0 0 6px;
    }
    .confirm-card-desc {
      font-size: 11.5px;
      color: var(--av-text-muted);
      line-height: 1.4;
      margin: 0 0 18px;
    }
    .confirm-actions-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .confirm-actions-row button {
      flex: 1;
      justify-content: center;
    }
    .av-btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      background: #EF4444;
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }
    .av-btn-danger:hover { filter: brightness(1.1); }
    .av-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-primary);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .erase-option-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-bottom: 18px;
      text-align: left;
    }
    .erase-option-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .erase-option-item:hover {
      border-color: var(--av-border-hover, #64748B);
    }
    .erase-option-item.selected {
      border-color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.05);
    }
    .erase-option-item.danger-border.selected {
      border-color: #EF4444;
      background: rgba(239, 68, 68, 0.06);
    }
    .erase-option-item input[type="radio"] {
      margin-top: 3px;
      cursor: pointer;
    }
    .erase-option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .erase-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--av-text-primary);
    }
    .erase-sub {
      font-size: 10px;
      color: var(--av-text-muted);
      line-height: 1.3;
    }

    .device-identity-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 2px 0 3px;
    }
    .device-handle {
      font-size: 11px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .device-handle:hover { text-decoration: underline; }
    .edit-icon-inline {
      width: 10px;
      height: 10px;
      opacity: 0.6;
    }
    .drawer-inline-user-edit-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
    }
    .drawer-inline-user-edit {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      transition: all 0.2s ease;
    }
    .drawer-inline-user-edit.valid {
      border-color: #10B981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }
    .drawer-inline-user-edit.invalid {
      border-color: #EF4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
    }
    .inline-username-input {
      padding: 2px 4px;
      border: none;
      background: transparent;
      color: var(--av-text-primary);
      font-size: 11px;
      font-weight: 600;
      width: 90px;
      outline: none;
    }
    .input-at-prefix {
      font-size: 11px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
    }
    .user-status-spinner {
      width: 11px;
      height: 11px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--av-accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .status-icon {
      width: 11px;
      height: 11px;
    }
    .text-green { color: #10B981; }
    .text-red { color: #EF4444; }
    .drawer-user-hint {
      font-size: 9.5px;
      font-weight: 600;
    }
    .hint-green { color: #10B981; }
    .hint-red { color: #EF4444; }
    .save-user-btn, .cancel-user-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
    }
    .save-user-btn { background: #10B981; color: #FFFFFF; }
    .save-user-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .cancel-user-btn { background: var(--av-surface-secondary); color: var(--av-text-muted); border: 1px solid var(--av-border); }
    .device-keyword-badge {
      font-size: 9.5px;
      font-weight: 600;
      font-family: monospace;
      color: var(--av-text-muted);
      background: var(--av-surface-secondary);
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid var(--av-border-subtle);
    }
    .clickable-pin-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .clickable-pin-badge:hover {
      background: var(--av-surface-elevated, rgba(255, 255, 255, 0.08));
      border-color: #10B981;
      color: var(--av-text-primary, #FFFFFF);
    }
    .pin-badge-digits {
      display: inline-block;
      transition: all 0.2s ease;
    }
    .pin-badge-digits.is-revealed {
      color: #10B981;
      font-weight: 700;
      text-shadow: 0 0 6px rgba(16, 185, 129, 0.35);
      animation: pinPopReveal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .badge-eye-icon {
      width: 11px;
      height: 11px;
      opacity: 0.6;
      transition: all 0.15s ease;
    }
    .clickable-pin-badge:hover .badge-eye-icon {
      opacity: 1;
      color: #10B981;
    }
    @keyframes pinPopReveal {
      0% { opacity: 0; transform: translateY(3px) scale(0.8); filter: blur(2px); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    .device-item-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }

    .reconnect-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(33, 150, 243, 0.3);
      background: rgba(33, 150, 243, 0.08);
      color: var(--av-accent, #2196F3);
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .reconnect-btn:hover {
      background: rgba(33, 150, 243, 0.18);
      border-color: var(--av-accent, #2196F3);
    }
    .reconnect-btn.is-connecting {
      opacity: 0.7;
      cursor: wait;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spin-anim {
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .device-item-disabled {
      opacity: 0.75;
    }

    .text-cyan { color: var(--av-accent); }

    @keyframes slideLeft {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultDeviceDrawerComponent {
  currentDevice = input.required<AirVaultDevice>();
  pairedDevices = input.required<AirVaultDevice[]>();
  registeredSessions = input<AirVaultDevice[]>([]);

  close = output<void>();
  revokeDevice = output<string>();
  disconnectDevice = output<string>();
  reconnectDevice = output<string>();
  remoteLogout = output<{ deviceId: string; eraseData: boolean }>();
  renameDevice = output<{ deviceId: string; newName: string }>();
  openPairingModal = output<void>();
  toggleSync = output<string>();

  public deviceService = inject(AirVaultDeviceService);

  isClosing = signal<boolean>(false);
  editingDeviceId = signal<string | null>(null);
  confirmLogoutDevice = signal<AirVaultDevice | null>(null);
  eraseDataOnLogout = signal<boolean>(false);
  editNameValue = '';
  showPin = signal<boolean>(false);

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (this.confirmLogoutDevice()) {
      this.confirmLogoutDevice.set(null);
      return;
    }
    if (this.isEditingUsername()) {
      this.cancelUsernameEdit();
      return;
    }
    if (this.editingDeviceId()) {
      this.cancelRename();
      return;
    }
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  toggleShowPin(event?: Event) {
    if (event) event.stopPropagation();
    this.showPin.update(v => !v);
  }

  isEditingUsername = signal<boolean>(false);
  editUsernameValue = '';
  userCheckStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  userCheckMessage = signal<string>('');
  private usernameDebounceTimer: any = null;

  startEditUsername() {
    this.editUsernameValue = this.currentDevice().username || '';
    this.userCheckStatus.set('available');
    this.userCheckMessage.set('');
    this.isEditingUsername.set(true);
  }

  onUsernameInput(event: any) {
    const val = event.target.value.trim().toLowerCase();
    this.editUsernameValue = val;

    if (!val) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Username cannot be empty');
      return;
    }

    if (val.length < 3) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Too short (min 3 characters)');
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(val)) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Only letters, numbers, _, -, . allowed');
      return;
    }

    if (val === (this.currentDevice().username || '').toLowerCase()) {
      this.userCheckStatus.set('available');
      this.userCheckMessage.set('Current username');
      return;
    }

    this.userCheckStatus.set('checking');
    this.userCheckMessage.set('Checking availability...');

    if (this.usernameDebounceTimer) {
      clearTimeout(this.usernameDebounceTimer);
    }

    this.usernameDebounceTimer = setTimeout(() => {
      this.deviceService.checkUsernameAvailability(val).subscribe((res: any) => {
        if (res.available) {
          this.userCheckStatus.set('available');
          this.userCheckMessage.set('✓ Username is available');
        } else {
          this.userCheckStatus.set('taken');
          this.userCheckMessage.set(`✕ ${res.message || 'Username already taken'}`);
        }
      });
    }, 350);
  }

  saveUsername() {
    const val = this.editUsernameValue.trim().toLowerCase();
    if (val && this.userCheckStatus() === 'available') {
      this.deviceService.updateUsername(val);
      this.isEditingUsername.set(false);
    }
  }

  cancelUsernameEdit() {
    this.isEditingUsername.set(false);
    if (this.usernameDebounceTimer) {
      clearTimeout(this.usernameDebounceTimer);
    }
  }

  otherRegisteredSessions = computed(() => {
    const curId = this.currentDevice().id;
    return (this.registeredSessions() || []).filter(d => d.id !== curId && !d.isCurrent);
  });

  promptRemoteLogout(device: AirVaultDevice) {
    this.eraseDataOnLogout.set(false);
    this.confirmLogoutDevice.set(device);
  }

  executeRemoteLogout(deviceId: string) {
    this.remoteLogout.emit({ deviceId, eraseData: this.eraseDataOnLogout() });
    this.confirmLogoutDevice.set(null);
  }

  startRename(id: string, currentName: string) {
    this.editingDeviceId.set(id);
    this.editNameValue = currentName;
  }

  saveRename(id: string) {
    if (this.editNameValue.trim()) {
      this.renameDevice.emit({ deviceId: id, newName: this.editNameValue.trim() });
    }
    this.editingDeviceId.set(null);
  }

  cancelRename() {
    this.editingDeviceId.set(null);
  }

  formatLastSeen(ts: number): string {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'smartphone': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'laptop': return 'laptop';
      case 'desktop': return 'monitor';
      default: return 'hard-drive';
    }
  }
}
