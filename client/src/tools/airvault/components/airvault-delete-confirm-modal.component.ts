import { Component, ChangeDetectionStrategy, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultItem, AirVaultStorageService } from '../services/airvault-storage.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="delete-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="delete-header">
          <div class="danger-icon-circle">
            <app-icon name="trash-2" class="icon-md" style="color: #EF4444;"></app-icon>
          </div>
          <h2 class="delete-title">
            @if (isMultiSelect()) {
              {{ isAllOwner() && activePeerCount() > 0 ? 'Delete ' + resourceCount() + ' Shared Resources?' : isAllOwner() ? 'Delete ' + resourceCount() + ' Resources?' : 'Remove ' + resourceCount() + ' Resources?' }}
            } @else {
              {{ isOwner() && activePeerCount() > 0 ? 'Delete Shared Resource?' : isOwner() ? 'Delete Resource?' : 'Remove Resource?' }}
            }
          </h2>
          <p class="delete-subtitle">
            @if (isMultiSelect()) {
              @if (isAllOwner() && activePeerCount() > 0) {
                Choose whether to erase these {{ resourceCount() }} resources across all connected paired devices or remove them only from this device.
              } @else if (isAnyNonOwner()) {
                Remove {{ resourceCount() }} resources from your device. Non-owned resources will be persistently suppressed without affecting the authors' copies.
              } @else {
                Remove these {{ resourceCount() }} items from your active clipboard. They will remain in 30-day Restorable History.
              }
            } @else {
              @if (isOwner() && activePeerCount() > 0) {
                Choose whether to erase this resource across all connected paired devices or remove it only from this device.
              } @else if (!isOwner()) {
                Remove this shared resource from your device. It will remain active on the author's device.
              } @else {
                Remove this content from your active clipboard. It will remain in 30-day Restorable History.
              }
            }
          </p>
        </div>

        <!-- Resource Preview Snippet (Single) -->
        @if (!isMultiSelect() && item(); as it) {
          <div class="resource-preview-card">
            <div class="resource-pill">
              <app-icon [name]="getCategoryIcon(it.content?.category || 'text')" class="icon-xs text-accent"></app-icon>
              <span>{{ (it.content?.category || 'text') | uppercase }}</span>
            </div>
            <div class="resource-info">
              <span class="resource-title">{{ it.content?.filename || it.content?.raw || 'Resource item' }}</span>
              <span class="resource-meta">
                {{ formatBytes(it.content?.byteSize) }}
                @if (it.senderDeviceName) {
                  · Authored by &#64;{{ it.senderDeviceName.replace('@', '') }}
                }
              </span>
            </div>
          </div>
        }

        <!-- Resources Summary Snippet (Multi-Select) -->
        @if (isMultiSelect()) {
          <div class="resource-preview-card">
            <div class="resource-pill">
              <app-icon name="layers" class="icon-xs text-accent"></app-icon>
              <span>{{ resourceCount() }} ITEMS</span>
            </div>
            <div class="resource-info">
              <span class="resource-title">{{ multiSummaryTitle() }}</span>
              <span class="resource-meta">{{ formatBytes(totalMultiBytes()) }} total</span>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="delete-modal-actions">
          @if (isAllOwner() && activePeerCount() > 0) {
            <!-- Multi-choice for owner when paired peers exist -->
            <button class="delete-choice-btn danger-choice" (click)="deleteGlobal.emit(targetIdOrEmpty())">
              <div class="choice-icon-wrap danger-bg">
                <app-icon name="network" class="icon-sm" style="color: #EF4444;"></app-icon>
              </div>
              <div class="choice-text-col">
                <span class="choice-heading">Delete for Everyone (All Devices)</span>
                <span class="choice-desc">Erases from this device & broadcasts instant deletion to {{ activePeerCount() }} connected device(s).</span>
              </div>
            </button>

            <button class="delete-choice-btn neutral-choice" (click)="deleteLocal.emit(targetIdOrEmpty())">
              <div class="choice-icon-wrap neutral-bg">
                <app-icon name="laptop" class="icon-sm text-muted"></app-icon>
              </div>
              <div class="choice-text-col">
                <span class="choice-heading">Remove from my device</span>
                <span class="choice-desc">Keeps the resources active on other paired devices.</span>
              </div>
            </button>
          } @else if (isAnyNonOwner() || !isOwner()) {
            <!-- Non-owner or mixed resources: can remove from this device -->
            <button class="delete-choice-btn neutral-choice" (click)="deleteLocal.emit(targetIdOrEmpty())">
              <div class="choice-icon-wrap neutral-bg">
                <app-icon name="laptop" class="icon-sm text-muted"></app-icon>
              </div>
              <div class="choice-text-col">
                <span class="choice-heading">Remove from my device</span>
                <span class="choice-desc">Removes {{ isMultiSelect() ? 'these resources' : 'this resource' }} from your device only without affecting other copies.</span>
              </div>
            </button>
          } @else {
            <!-- Standard single or multi remove when owner but no other active peers -->
            <button class="delete-choice-btn danger-choice" (click)="deleteGlobal.emit(targetIdOrEmpty())">
              <div class="choice-icon-wrap danger-bg">
                <app-icon name="trash-2" class="icon-sm" style="color: #EF4444;"></app-icon>
              </div>
              <div class="choice-text-col">
                <span class="choice-heading">{{ isMultiSelect() ? 'Delete ' + resourceCount() + ' Resources' : 'Delete Resource' }}</span>
                <span class="choice-desc">Moves into 30-day Restorable History.</span>
              </div>
            </button>
          }

          <div class="footer-cancel-row">
            <button class="av-btn-secondary cancel-btn" (click)="cancel.emit()">
              <app-icon name="x" class="icon-xs"></app-icon>
              <span>Cancel</span>
            </button>
          </div>
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
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
      animation: delBdFade 0.18s ease-out both;
    }

    @keyframes delBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .delete-modal-card {
      width: 100%;
      max-width: 480px;
      background: var(--av-surface-primary, #111419);
      border: 1px solid var(--av-border, #252B33);
      border-radius: var(--av-radius-lg, 12px);
      padding: 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: modalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .delete-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
    }

    .danger-icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }

    .delete-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
      margin: 0;
    }

    .delete-subtitle {
      font-size: 12.5px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
      line-height: 1.45;
    }

    .resource-preview-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    .resource-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      background: rgba(33, 150, 243, 0.12);
      border: 1px solid rgba(33, 150, 243, 0.25);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
    }

    .resource-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
      gap: 2px;
    }

    .resource-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--av-text-primary, #FFFFFF);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .resource-meta {
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
    }

    .delete-modal-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .delete-choice-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      color: var(--av-text-primary, #FFFFFF);
    }

    .delete-choice-btn:hover {
      border-color: var(--av-border-strong, #363D47);
      background: rgba(255, 255, 255, 0.03);
    }

    .delete-choice-btn.danger-choice:hover {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.06);
    }

    .choice-icon-wrap {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .danger-bg {
      background: rgba(239, 68, 68, 0.12);
    }

    .neutral-bg {
      background: rgba(255, 255, 255, 0.06);
    }

    .choice-text-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .choice-heading {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
    }

    .danger-choice .choice-heading {
      color: #EF4444;
    }

    .choice-desc {
      font-size: 11.5px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.35;
    }

    .footer-cancel-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .cancel-btn {
      height: 30px;
      padding: 0 14px;
    }

    .text-red { color: #EF4444; }
    .text-accent { color: var(--av-accent, #2196F3); }
    .text-muted { color: var(--av-text-muted, #8B949E); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultDeleteConfirmModalComponent {
  item = input<AirVaultItem | null>(null);
  items = input<AirVaultItem[] | null>(null);

  deleteGlobal = output<string>();
  deleteLocal = output<string>();
  cancel = output<void>();

  private deviceService = inject(AirVaultDeviceService);

  isMultiSelect = computed(() => {
    const list = this.items();
    return !!(list && list.length > 1);
  });

  effectiveItems = computed<AirVaultItem[]>(() => {
    const list = this.items();
    if (list && list.length > 0) return list;
    const single = this.item();
    return single ? [single] : [];
  });

  resourceCount = computed(() => {
    return this.effectiveItems().length;
  });

  totalMultiBytes = computed(() => {
    return this.effectiveItems().reduce((acc, it) => acc + (it.content?.byteSize || 0), 0);
  });

  multiSummaryTitle = computed(() => {
    const list = this.effectiveItems();
    if (list.length === 0) return 'Selected resources';
    if (list.length === 1) return list[0].content?.filename || list[0].content?.raw || '1 resource';
    const firstTitle = list[0].content?.filename || list[0].content?.category || 'Item';
    return `${firstTitle} and ${list.length - 1} other resource${list.length > 2 ? 's' : ''}`;
  });

  targetIdOrEmpty = computed(() => {
    const single = this.item();
    if (single) return single.id;
    const list = this.items();
    if (list && list.length === 1) return list[0].id;
    return '';
  });

  private checkItemOwnership(it: AirVaultItem): boolean {
    const curDev = this.deviceService.currentDevice();
    const isSelf = !it.originDeviceId || it.originDeviceId === curDev.id || it.senderDeviceId === curDev.id;
    if (isSelf) return true;

    if (it.originOwnerId && curDev.username && it.originOwnerId.replace(/^@/, '').toLowerCase() === curDev.username.replace(/^@/, '').toLowerCase()) {
      return true;
    }
    if (it.senderDeviceName && curDev.username && it.senderDeviceName.replace(/^@/, '').toLowerCase() === curDev.username.replace(/^@/, '').toLowerCase()) {
      return true;
    }
    return false;
  }

  isOwner = computed(() => {
    const it = this.item();
    if (!it) return true;
    return this.checkItemOwnership(it);
  });

  isAllOwner = computed(() => {
    const list = this.effectiveItems();
    if (list.length === 0) return true;
    return list.every(i => this.checkItemOwnership(i));
  });

  isAnyNonOwner = computed(() => {
    const list = this.effectiveItems();
    if (list.length === 0) return false;
    return list.some(i => !this.checkItemOwnership(i));
  });

  activePeerCount = computed(() => {
    return this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked').length;
  });

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'url': return 'link';
      case 'code': return 'code-2';
      case 'json': return 'braces';
      case 'markdown': return 'file-text';
      case 'image': return 'image';
      case 'video': return 'film';
      case 'file': return 'file';
      default: return 'align-left';
    }
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
