import { Component, ChangeDetectionStrategy, signal, input, output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultDayHistoryComponent } from './airvault-day-history.component';

@Component({
  selector: 'app-airvault-history-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AirVaultDayHistoryComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" [class.closing]="isClosing()" (click)="onClose()">
      <div class="modal-card" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="icon-circle">
              <app-icon name="search" class="icon-xs text-cyan"></app-icon>
            </div>
            <div class="header-title-box">
              <h3 class="modal-title">Search Clipboard & Vault History</h3>
              <p class="modal-subtitle">Search across text snippets, URLs, code, files, media & recovery records</p>
            </div>
          </div>

          <div class="header-right">
            @if (restorableItems().length > 0 || auditLogs().length > 0) {
              <button
                class="av-btn-secondary danger purge-all-btn"
                (click)="onConfirmClearAll()"
                title="Clear entire restorable history & audit records">
                <app-icon name="trash-2" class="icon-xs"></app-icon>
                <span>Clear History Cache</span>
              </button>
            }
            <button class="av-btn-icon" (click)="onClose()" title="Close (Esc)">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>

        <!-- 1. Navigation Tabs Sub-Header Bar (First Row Under Header) -->
        <div class="body-tabs-bar">
          <div class="body-center-tabs">
            <button class="tab-chip" [class.active]="activeTab() === 'clipboard'" (click)="activeTab.set('clipboard')">
              <app-icon name="clipboard" class="icon-xs"></app-icon>
              <span>Clipboard ({{ activeItems().length }})</span>
            </button>
            <button class="tab-chip" [class.active]="activeTab() === 'restorable'" (click)="activeTab.set('restorable')">
              <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
              <span>Restorable ({{ restorableItems().length }})</span>
            </button>
            <button class="tab-chip" [class.active]="activeTab() === 'text'" (click)="activeTab.set('text')">
              <app-icon name="file-text" class="icon-xs"></app-icon>
              <span>Text History</span>
            </button>
            <button class="tab-chip" [class.active]="activeTab() === 'audit'" (click)="activeTab.set('audit')">
              <app-icon name="shield" class="icon-xs"></app-icon>
              <span>Audit Log ({{ auditLogs().length }})</span>
            </button>
          </div>
        </div>

        <!-- 2. Storage Shared Quota Indicator Banner (Second Row, Matching Surface Background) -->
        <div class="history-storage-banner">
          <div class="storage-info-left">
            <app-icon name="hard-drive" class="icon-xs text-cyan"></app-icon>
            <span class="storage-title">Shared Storage Quota:</span>
            <span class="storage-metric"><strong>{{ formatBytes(totalBytes()) }}</strong> / {{ formatBytes(totalStorageCapBytes()) }} ({{ storageUsedPercent() }}% used)</span>
          </div>
          <div class="storage-breakdown-chips">
            <span class="breakdown-chip active-chip">Active: {{ formatBytes(activeBytes()) }}</span>
            <span class="breakdown-chip history-chip">History: {{ formatBytes(historyBytes()) }}</span>
          </div>
        </div>

        <!-- 3. Modal Body: Shared 7-Day Grouped History Stack with Fixed Bottom Search & Filter -->
        <div class="modal-body">
          @if (activeTab() === 'clipboard') {
            <div class="tab-pane-content">
              <app-airvault-day-history
                type="clipboard"
                [localItems]="activeItems()"
                (purgeItem)="onPurge($event)"
                (triggerToast)="onToast($event)">
              </app-airvault-day-history>
            </div>
          } @else if (activeTab() === 'restorable') {
            <div class="tab-pane-content">
              <app-airvault-day-history
                type="resource"
                [localItems]="restorableItems()"
                (restoreItem)="onRestore($event)"
                (purgeItem)="onPurge($event)"
                (triggerToast)="onToast($event)">
              </app-airvault-day-history>
            </div>
          } @else if (activeTab() === 'audit') {
            <div class="tab-pane-content">
              <app-airvault-day-history
                type="audit"
                [localItems]="auditLogs()"
                (triggerToast)="onToast($event)">
              </app-airvault-day-history>
            </div>
          } @else if (activeTab() === 'text') {
            <div class="tab-pane-content">
              <app-airvault-day-history
                type="text"
                (triggerToast)="onToast($event)">
              </app-airvault-day-history>
            </div>
          }
        </div>

        <!-- Confirm Clear Entire History Overlay Modal -->
        @if (showClearConfirm) {
          <div class="clear-confirm-overlay" (click)="showClearConfirm = false">
            <div class="clear-confirm-card" (click)="$event.stopPropagation()">
              <div class="confirm-icon-box">
                <app-icon name="alert-triangle" class="icon-md text-red"></app-icon>
              </div>
              <div class="confirm-content">
                <h4 class="confirm-title">Clear Entire History?</h4>
                <p class="confirm-desc">
                  This will permanently wipe all restorable history items from your local device cache. Active clipboard items and audit logs will remain unaffected.
                </p>
                <div class="confirm-actions">
                  <button class="av-btn-secondary" (click)="showClearConfirm = false">Cancel</button>
                  <button class="av-btn-primary confirm-danger-btn" (click)="executeClearAll()">
                    <app-icon name="trash-2" class="icon-xs"></app-icon>
                    <span>Yes, Clear All History</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(16, 24, 40, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--av-space-4, 16px);
      animation: modalBdFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, backdrop-filter;
    }

    .modal-backdrop.closing {
      animation: modalBdFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    .modal-card {
      position: relative;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg, 12px);
      width: 100%;
      max-width: 860px;
      height: 640px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
      animation: modalCardPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
      overflow: hidden;
    }

    .modal-card.closing {
      animation: modalCardPopOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--av-border);
      background: var(--av-surface-primary);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--av-radius-sm, 6px);
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-muted);
    }

    .modal-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--av-text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .modal-subtitle {
      font-size: 11.5px;
      color: var(--av-text-muted);
      margin: 2px 0 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .purge-all-btn {
      color: #EF4444 !important;
      border-color: rgba(239, 68, 68, 0.35) !important;
      background: rgba(239, 68, 68, 0.08) !important;
      height: 26px;
      font-size: 11.5px;
      padding: 0 10px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }

    .purge-all-btn:hover {
      background: #EF4444 !important;
      color: #FFFFFF !important;
      border-color: #DC2626 !important;
    }

    .purge-all-btn:hover app-icon {
      color: #FFFFFF !important;
    }

    /* Sub-header Tab Bar (First Row) */
    .body-tabs-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 18px;
      background: var(--av-surface-primary);
      border-bottom: 1px solid var(--av-border);
      flex-shrink: 0;
    }

    .body-center-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--av-surface-secondary);
      padding: 3px 4px;
      border-radius: var(--av-radius-sm, 6px);
      border: 1px solid var(--av-border);
    }

    .tab-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--av-text-muted);
      border: 1px solid transparent;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }

    .tab-chip:hover {
      color: var(--av-text-primary);
      background: rgba(255, 255, 255, 0.04);
    }

    .tab-chip:active {
      transform: scale(0.96);
    }

    .tab-chip.active {
      background: var(--av-surface-primary);
      color: var(--av-accent, #2196F3);
      font-weight: 600;
      border-color: var(--av-border);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    /* Storage Shared Quota Indicator Banner (Row 2, Matching Background) */
    .history-storage-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 18px;
      background: var(--av-surface-primary);
      border-bottom: 1px solid var(--av-border);
      font-size: 11px;
      color: var(--av-text-muted);
      flex-wrap: wrap;
      gap: 8px;
      flex-shrink: 0;
    }

    .storage-info-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .storage-title { font-weight: 600; color: var(--av-text-primary); }
    .storage-metric strong { color: var(--av-text-primary); }
    .storage-breakdown-chips {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .breakdown-chip {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      font-family: var(--av-font-mono, monospace);
      border: 1px solid;
    }

    .breakdown-chip.active-chip {
      background: rgba(33, 150, 243, 0.08);
      border-color: rgba(33, 150, 243, 0.25);
      color: var(--av-accent, #2196F3);
    }

    .breakdown-chip.history-chip {
      background: rgba(139, 92, 246, 0.08);
      border-color: rgba(139, 92, 246, 0.25);
      color: #8B5CF6;
    }

    .modal-body {
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--av-bg-canvas);
    }

    .tab-pane-content {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      flex: 1;
      min-height: 0;
      animation: tabPaneFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform;
    }

    /* Clear All History Confirmation Overlay */
    .clear-confirm-overlay {
      position: absolute;
      inset: 0;
      background: rgba(16, 24, 40, 0.65);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: modalBdFade 0.15s ease-out;
    }

    .clear-confirm-card {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md, 8px);
      padding: 20px;
      max-width: 420px;
      width: 100%;
      box-shadow: var(--av-shadow-lg);
      display: flex;
      gap: 14px;
      animation: modalCardPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .confirm-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .text-red {
      color: #EF4444;
    }

    .confirm-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .confirm-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0;
    }

    .confirm-desc {
      font-size: 12px;
      color: var(--av-text-muted);
      line-height: 1.45;
      margin: 0;
    }

    .confirm-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .confirm-danger-btn {
      background: #EF4444 !important;
      border-color: #DC2626 !important;
      color: #FFFFFF !important;
    }

    .confirm-danger-btn:hover {
      background: #DC2626 !important;
      border-color: #B91C1C !important;
    }

    @keyframes modalBdFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalBdFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modalCardPopIn {
      0% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes modalCardPopOut {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
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
export class AirVaultHistoryModalComponent {
  activeItems = input<AirVaultItem[]>([]);
  restorableItems = input<AirVaultItem[]>([]);
  auditLogs = input<any[]>([]);
  totalBytes = input<number>(0);
  activeBytes = input<number>(0);
  historyBytes = input<number>(0);
  totalStorageCapBytes = input<number>(1024 * 1024 * 1024);
  storageUsedPercent = input<number>(0);

  deviceService = inject(AirVaultDeviceService);

  activeTab = signal<'clipboard' | 'restorable' | 'audit' | 'text'>('clipboard');
  isClosing = signal<boolean>(false);
  showClearConfirm = false;

  close = output<void>();
  restoreItem = output<string>();
  purgeItem = output<string>();
  clearEntireHistory = output<void>();
  triggerToast = output<string>();

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (this.showClearConfirm) {
      this.showClearConfirm = false;
      return;
    }
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  onToast(msg: string) {
    if (msg) {
      this.triggerToast.emit(msg);
    }
  }

  onRestore(item: any) {
    const id = item?.id || item?.file_id || item?.target_resource_id;
    if (id) {
      this.restoreItem.emit(id);
    }
  }

  onPurge(item: any) {
    const id = typeof item === 'string' ? item : (item?.id || item?.file_id || item?.target_resource_id);
    if (id) {
      this.purgeItem.emit(id);
    }
  }

  onConfirmClearAll() {
    this.showClearConfirm = true;
  }

  executeClearAll() {
    this.showClearConfirm = false;
    this.clearEntireHistory.emit();
  }

  formatBytes(bytes: number = 0): string {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }
}
