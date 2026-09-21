import { Component, ChangeDetectionStrategy, signal, computed, input, output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultPreferencesService, BURN_AFTER_READ_TTL } from '../services/airvault-preferences.service';
import { AirVaultPortabilityService } from '../services/airvault-portability.service';
import { AirVaultStorageService } from '../services/airvault-storage.service';
import { AirVaultNotificationService } from '../services/airvault-notification.service';

type SettingsTab = 'general' | 'retention' | 'backup' | 'shortcuts';

@Component({
  selector: 'app-airvault-settings-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="drawer-backdrop" [class.closing]="isClosing()" (click)="onClose()">
      <div class="drawer-panel" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-badge">
            <app-icon name="settings" class="icon-sm text-cyan"></app-icon>
            <h2>Vault Settings & Preferences</h2>
          </div>
          <button class="close-btn" (click)="onClose()" title="Close Settings (Esc)">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Tab Bar Navigation -->
        <div class="settings-tabs">
          <button class="tab-btn" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">
            <app-icon name="sliders" class="icon-xs"></app-icon>
            <span>General</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'retention'" (click)="activeTab.set('retention')">
            <app-icon name="hourglass" class="icon-xs"></app-icon>
            <span>Retention</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'backup'" (click)="activeTab.set('backup')">
            <app-icon name="download" class="icon-xs"></app-icon>
            <span>Backup</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'shortcuts'" (click)="activeTab.set('shortcuts')">
            <app-icon name="command" class="icon-xs"></app-icon>
            <span>Keys</span>
          </button>
        </div>

        <div class="drawer-body">
          <!-- 1. GENERAL TAB -->
          @if (activeTab() === 'general') {
            <div class="tab-pane-content">
              <div class="settings-section">
                <div class="section-title">CROSS-DEVICE AUTO-COPY TIERING</div>

                <div class="toggle-row">
                  <div class="toggle-info">
                    <span class="toggle-label">Auto-Copy Incoming Items</span>
                    <span class="toggle-desc">When receiving items from connected peers, automatically copy them to your local OS system clipboard if the app is focused.</span>
                  </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().autoCopyIncoming"
                  (change)="onToggle('autoCopyIncoming', $event)"
                />
              </div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">Auto-Capture on Focus</span>
                  <span class="toggle-desc">Automatically detect newly copied text/files from your OS clipboard and stage them when this window gains focus.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().autoCaptureOnFocus"
                  (change)="onToggle('autoCaptureOnFocus', $event)"
                />
              </div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">Instant Beam on Paste</span>
                  <span class="toggle-desc">Immediately beam pasted content directly to paired devices without waiting in the local staging area.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().instantBeamOnPaste"
                  (change)="onToggle('instantBeamOnPaste', $event)"
                />
              </div>
            </div>

            <div class="settings-section">
              <div class="section-title">SECURITY & PRIVACY</div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">Sync Author Text Deletions Everywhere</span>
                  <span class="toggle-desc">When enabled, lines removed by their author are removed from all connected peer devices. When disabled, local peer devices retain those lines.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().syncTextDeletions"
                  (change)="onToggle('syncTextDeletions', $event)"
                />
              </div>
            </div>

            <div class="settings-section">
              <div class="section-title">MULTI-CHANNEL NOTIFICATIONS</div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">OS Push Notifications</span>
                  <span class="toggle-desc">Receive OS-level alerts when items arrive while this app is in the background or closed.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().pushNotificationsEnabled"
                  (change)="onTogglePushNotifications($event)"
                />
              </div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">Notification Audio Chime</span>
                  <span class="toggle-desc">Play a distinct, subtle sound effect when items are received or auto-copied.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().notificationSoundEnabled"
                  (change)="onToggle('notificationSoundEnabled', $event)"
                />
              </div>

              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-label">Ambient Toast Alerts</span>
                  <span class="toggle-desc">Show bottom feedback banners when content is received or copied in foreground.</span>
                </div>
                <input
                  type="checkbox"
                  class="toggle-switch"
                  [checked]="prefService.prefs().toastNotifications"
                  (change)="onToggle('toastNotifications', $event)"
                />
              </div>
            </div>
          </div>
          }

          <!-- 2. RETENTION TAB -->
          @if (activeTab() === 'retention') {
            <div class="tab-pane-content">
              <!-- Storage Metrics Section -->
              <div class="settings-section">
                <div class="section-title">STORAGE & RETENTION METRICS</div>
                <div class="metrics-grid">
                  <div class="metric-card">
                    <span class="metric-label">Cached Items</span>
                    <span class="metric-value">{{ totalItems() }} / 500</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Total Vault Storage</span>
                    <span class="metric-value">{{ formatBytes(totalBytes()) }}</span>
                  </div>
                  <div class="metric-card metric-card-wide">
                    <span class="metric-label">Active vs History</span>
                    <span class="metric-value text-cyan">{{ formatBytes(storageService.activeBytes()) }} (Active) + {{ formatBytes(storageService.historyBytes()) }} (History)</span>
                  </div>
                </div>
              </div>

              <!-- Retention Section -->
              <div class="settings-section">
                <div class="section-title">CLIPBOARD RETENTION POLICY</div>
                <p class="section-desc">Active resources expire according to your selected policy. Pinned resources remain permanently in AirHold.</p>
                <div class="retention-options">
                  @for (opt of availableTtlOptions(); track opt.value) {
                    <label class="radio-card" [class.selected]="currentTtlMs() === opt.value">
                      <input
                        type="radio"
                        name="ttl"
                        [value]="opt.value"
                        [checked]="currentTtlMs() === opt.value"
                        (change)="ttlChange.emit(opt.value)"
                      />
                      <div class="radio-content">
                        <span class="radio-label">{{ opt.label }}</span>
                        <span class="radio-sub">{{ opt.desc }}</span>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <!-- Purge History & Erase Everything -->
              <div class="settings-section">
                <div class="section-title">DATA MANAGEMENT & IDENTITY</div>
                <p class="section-desc">Permanently wipe locally cached clipboard history or completely destroy your AirVault identity and linked paired devices.</p>
                
                <div class="data-mgmt-actions">
                  <button class="purge-history-btn" (click)="onPurgeAllHistory()">
                    <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                    <span>Purge All Vault History</span>
                  </button>

                  <button class="danger-erase-btn" (click)="onOpenEraseModal()">
                    <app-icon name="eraser" class="icon-xs"></app-icon>
                    <span>Erase Everything (Full Reset)</span>
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- 3. BACKUP & PORTABILITY TAB -->
          @if (activeTab() === 'backup') {
            <div class="tab-pane-content">
              <div class="settings-section">
                <div class="section-title">DATA PORTABILITY & BACKUP</div>
                <p class="section-desc">Export your entire clipboard vault or selective pinned clips as a portable JSON file.</p>

                <div class="backup-actions-grid">
                  <button class="backup-btn" (click)="onExportAll()">
                    <app-icon name="download" class="icon-xs text-cyan"></app-icon>
                    <span>Export Full Vault (JSON)</span>
                  </button>
                  <button class="backup-btn" (click)="onExportPinned()">
                    <app-icon name="pin" class="icon-xs text-cyan"></app-icon>
                    <span>Export Pinned Only</span>
                  </button>
                </div>
              </div>

              <div class="settings-section">
                <div class="section-title">RESTORE VAULT ARCHIVE</div>
                <p class="section-desc">Upload a previously exported JSON backup to merge into your local history.</p>

                <label class="file-upload-box">
                  <input type="file" accept=".json" (change)="onFileSelected($event)" class="file-input-hidden" />
                  <app-icon name="upload-cloud" class="icon-sm text-cyan"></app-icon>
                  <span class="upload-title">Choose Backup JSON File</span>
                  <span class="upload-sub">Validates schema before restoring</span>
                </label>

                @if (importStatus()) {
                  <div class="import-status-box" [class.success]="importStatus()!.success" [class.error]="!importStatus()!.success">
                    {{ importStatus()!.message }}
                  </div>
                }
              </div>
            </div>
          }

          <!-- 4. SHORTCUTS TAB -->
          @if (activeTab() === 'shortcuts') {
            <div class="tab-pane-content">
              <div class="settings-section">
                <div class="section-title">KEYBOARD COMMAND PALETTE</div>
                <div class="shortcuts-table">
                  <div class="shortcut-row">
                    <span class="shortcut-desc">Beam Staged Payload</span>
                    <div class="shortcut-keys"><kbd>⌘</kbd><kbd>Enter</kbd></div>
                  </div>
                  <div class="shortcut-row">
                    <span class="shortcut-desc">Paste from Clipboard</span>
                    <div class="shortcut-keys"><kbd>⌘</kbd><kbd>V</kbd></div>
                  </div>
                  <div class="shortcut-row">
                    <span class="shortcut-desc">Search Vault Feed</span>
                    <div class="shortcut-keys"><kbd>⌘</kbd><kbd>F</kbd></div>
                  </div>
                  <div class="shortcut-row">
                    <span class="shortcut-desc">Close Drawers & Modals</span>
                    <div class="shortcut-keys"><kbd>Esc</kbd></div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
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
    }

    .drawer-backdrop.closing {
      animation: drawerBdFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    .drawer-panel {
      width: 400px;
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
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .close-btn:hover {
      color: var(--av-text-main);
      background: rgba(255, 255, 255, 0.06);
    }

    .settings-tabs {
      display: flex;
      padding: 8px 16px;
      gap: 6px;
      border-bottom: 1px solid var(--av-border-subtle);
      background: var(--av-surface-secondary);
      position: relative;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--av-text-muted);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .tab-btn:hover {
      color: var(--av-text-main);
      background: rgba(255, 255, 255, 0.04);
    }
    .tab-btn:active {
      transform: scale(0.96);
    }
    .tab-btn.active {
      background: var(--av-surface-primary);
      color: var(--av-accent);
      border-color: var(--av-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .drawer-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .tab-pane-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      animation: tabPaneFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--av-text-muted);
      margin-bottom: 8px;
    }

    .section-desc {
      font-size: 11px;
      color: var(--av-text-muted);
      margin: 0 0 12px;
      line-height: 1.4;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--av-border-subtle);
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main);
    }

    .toggle-desc {
      font-size: 10px;
      color: var(--av-text-muted);
      line-height: 1.3;
    }

    .toggle-switch {
      accent-color: var(--av-accent);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
    }

    .metric-card-wide {
      grid-column: 1 / -1;
    }

    .metric-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--av-text-muted);
    }

    .metric-value {
      font-size: 13px;
      font-weight: 800;
      color: var(--av-text-main);
      font-family: var(--font-mono, monospace);
    }

    .capacity-bar-track {
      width: 100%;
      height: 6px;
      background: var(--av-surface-secondary);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid var(--av-border);
    }

    .capacity-bar-fill {
      height: 100%;
      background: var(--av-accent);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .retention-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .radio-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .radio-card:hover {
      border-color: var(--av-accent);
    }
    .radio-card.selected {
      border-color: var(--av-accent);
      background: var(--av-surface-elevated);
    }

    .radio-card input {
      margin-top: 2px;
      accent-color: var(--av-accent);
    }

    .radio-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .radio-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main);
    }

    .radio-sub {
      font-size: 10px;
      color: var(--av-text-muted);
    }

    .data-mgmt-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .purge-history-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 6px;
      color: #D97706;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s ease;
    }
    .purge-history-btn:hover {
      background: #D97706;
      color: #FFFFFF !important;
      border-color: #B45309;
    }
    .purge-history-btn:hover app-icon {
      color: #FFFFFF !important;
    }

    .danger-erase-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 6px;
      color: #EF4444;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s ease;
    }
    .danger-erase-btn:hover {
      background: #EF4444;
      color: #FFFFFF;
      border-color: #DC2626;
    }

    .backup-actions-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .backup-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      color: var(--av-text-main);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .backup-btn:hover {
      border-color: var(--av-accent);
      color: var(--av-accent);
    }

    .file-upload-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: var(--av-surface-secondary);
      border: 1px dashed var(--av-border);
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .file-upload-box:hover {
      border-color: var(--av-accent);
    }

    .file-input-hidden {
      display: none;
    }

    .upload-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main);
    }

    .upload-sub {
      font-size: 10px;
      color: var(--av-text-muted);
    }

    .import-status-box {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .import-status-box.success {
      background: rgba(63, 185, 80, 0.15);
      border: 1px solid rgba(63, 185, 80, 0.3);
      color: var(--av-success);
    }
    .import-status-box.error {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid rgba(248, 81, 73, 0.3);
      color: var(--av-error);
    }

    .shortcuts-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 6px;
    }

    .shortcut-desc {
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-main);
    }

    .shortcut-keys {
      display: flex;
      gap: 4px;
    }

    kbd {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-family: var(--font-mono, monospace);
      color: var(--av-accent);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .text-cyan { color: var(--av-accent); }

    /* ── Settings tab pane enter animation ────────────────────── */
    .settings-section {
      animation: settingsTabIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes settingsTabIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Drawer backdrop fade ──────────────────────────────────── */
    .drawer-backdrop {
      animation: drawerBdFade 0.18s ease-out both;
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

    @keyframes tabPaneFadeIn {
      0% {
        opacity: 0;
        transform: translateY(8px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultSettingsDrawerComponent {
  prefService = inject(AirVaultPreferencesService);
  portabilityService = inject(AirVaultPortabilityService);
  storageService = inject(AirVaultStorageService);
  notificationService = inject(AirVaultNotificationService);

  currentTtlMs = input.required<number>();
  totalItems = input<number>(0);
  totalBytes = input<number>(0);
  targetItemCategory = input<string | undefined>(undefined);

  close = output<void>();
  ttlChange = output<number>();
  purgeAllHistory = output<void>();
  openEraseModal = output<void>();

  activeTab = signal<SettingsTab>('general');
  isClosing = signal<boolean>(false);
  importStatus = signal<{ success: boolean; message: string } | null>(null);

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 220);
  }

  onPurgeAllHistory() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.purgeAllHistory.emit();
    }, 220);
  }

  onOpenEraseModal() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.openEraseModal.emit();
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  ttlOptions = [
    { value: BURN_AFTER_READ_TTL, label: '🔥 Burn After Read (After Seen)', desc: 'Permanently destroys item everywhere immediately after first view (Resources only)' },
    { value: 24 * 60 * 60 * 1000, label: '1 Day (24 Hours)', desc: 'Standard single-day developer memory' },
    { value: 7 * 24 * 60 * 60 * 1000, label: '7 Days (Default)', desc: 'Standard 7-day retention policy for clipboard & uploads' },
    { value: 30 * 24 * 60 * 60 * 1000, label: '1 Month (30 Days)', desc: 'Extended 30-day vault retention' },
    { value: 0, label: 'Never Expire', desc: 'Keep history until manually cleared' }
  ];

  /**
   * Computed list of available TTL options.
   * If a targetItemCategory is provided and is plain text or code, "Burn after read"
   * is removed entirely from the options list.
   */
  availableTtlOptions = computed(() => {
    const cat = this.targetItemCategory();
    if (cat === 'text' || cat === 'code' || cat === 'json' || cat === 'url') {
      return this.ttlOptions.filter(opt => opt.value !== BURN_AFTER_READ_TTL);
    }
    return this.ttlOptions;
  });

  onToggle(key: any, event: any) {
    this.prefService.updatePref(key, event.target.checked);
  }

  async onTogglePushNotifications(event: any) {
    const checked = event.target.checked;
    if (checked) {
      const granted = await this.notificationService.requestPermission();
      if (!granted) {
        event.target.checked = false;
        this.prefService.updatePref('pushNotificationsEnabled', false);
      }
    } else {
      this.prefService.updatePref('pushNotificationsEnabled', false);
    }
  }

  onExportAll() {
    this.portabilityService.exportVault(false);
  }

  onExportPinned() {
    this.portabilityService.exportVault(true);
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const res = await this.portabilityService.importVault(file);
      this.importStatus.set(res);
      setTimeout(() => this.importStatus.set(null), 5000);
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
  }
}
