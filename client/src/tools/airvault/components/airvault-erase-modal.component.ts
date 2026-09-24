import { Component, ChangeDetectionStrategy, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultStorageService } from '../services/airvault-storage.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultPortabilityService } from '../services/airvault-portability.service';
import { HttpClient } from '@angular/common/http';
import { getAirVaultApiUrl } from '../services/airvault-api.util';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-airvault-erase-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" (click)="!isErasing() && step() !== 'backup' && close.emit()">
      <div class="erase-modal-card" (click)="$event.stopPropagation()">

        @if (step() === 'confirm') {
          <div class="erase-header">
            <div class="danger-icon-circle">
              <app-icon name="eraser" class="icon-md text-red"></app-icon>
            </div>
            <h2 class="erase-title">Erase Everything?</h2>
            <p class="erase-subtitle">This permanently destroys your entire AirVault identity and data across all devices.</p>
          </div>

          <div class="destruction-list">
            <div class="destruction-item">
              <app-icon name="check-circle-2" class="icon-xs text-red"></app-icon>
              <span>Clipboard history, saved clips, and staged content</span>
            </div>
            <div class="destruction-item">
              <app-icon name="check-circle-2" class="icon-xs text-red"></app-icon>
              <span>Uploaded files, folders, and cached resources</span>
            </div>
            <div class="destruction-item">
              <app-icon name="check-circle-2" class="icon-xs text-red"></app-icon>
              <span>All paired devices and trusted device relationships</span>
            </div>
            <div class="destruction-item">
              <app-icon name="check-circle-2" class="icon-xs text-red"></app-icon>
              <span>Identity <strong>&#64;{{ currentUsername() }}</strong>, PIN, and security keys</span>
            </div>
          </div>

          <div class="trust-loss-warning">
            <app-icon name="alert-triangle" class="icon-xs text-amber"></app-icon>
            <span>Connected paired devices will automatically revoke trust with this identity.</span>
          </div>

          <div class="confirmation-prompt">
            <label class="confirm-input-label">Type <strong>ERASE</strong> to continue:</label>
            <input
              type="text"
              class="confirm-input"
              [(ngModel)]="confirmText"
              placeholder="ERASE"
              [disabled]="isErasing()"
              autocomplete="off"
              autofocus
            />
          </div>

          @if (errorMessage()) {
            <div class="erase-error-banner">
              <app-icon name="alert-circle" class="icon-xs"></app-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <div class="erase-modal-actions">
            <button class="av-btn-secondary" (click)="close.emit()" [disabled]="isErasing()">
              <app-icon name="x" class="icon-xs"></app-icon>
              <span>Cancel</span>
            </button>
            <button
              class="av-btn-danger"
              [disabled]="confirmText.trim().toUpperCase() !== 'ERASE' || isErasing()"
              (click)="initiateBackupAndErase()"
            >
              @if (isErasing()) {
                <span class="erase-spinner"></span>
                <span>Preparing…</span>
              } @else {
                <app-icon name="eraser" class="icon-xs"></app-icon>
                <span>Erase Everything</span>
              }
            </button>
          </div>
        }

        @if (step() === 'backup') {
          <div class="backup-step">
            <div class="backup-icon-circle">
              @if (backupState() === 'pending') {
                <span class="erase-spinner backup-spinner"></span>
              } @else if (backupState() === 'success') {
                <app-icon name="download" class="icon-md text-cyan"></app-icon>
              } @else {
                <app-icon name="alert-triangle" class="icon-md text-amber"></app-icon>
              }
            </div>

            <h2 class="erase-title">
              @if (backupState() === 'pending') { Creating Backup… }
              @else if (backupState() === 'success') { Backup Downloaded }
              @else { Backup Failed }
            </h2>

            <p class="erase-subtitle">
              @if (backupState() === 'pending') {
                Generating a complete JSON backup of your clipboard history before erasing.
              } @else if (backupState() === 'success') {
                Your backup has been saved. Proceeding with erase now…
              } @else {
                We could not create a backup. Your data has <strong>not</strong> been erased.
              }
            </p>

            @if (backupState() === 'success') {
              <div class="backup-success-notice">
                <app-icon name="check-circle-2" class="icon-xs text-green"></app-icon>
                <span>Backup file downloaded — you can restore it via <strong>Import</strong> anytime.</span>
              </div>
            }

            @if (backupState() === 'failed') {
              <div class="erase-error-banner">
                <app-icon name="alert-circle" class="icon-xs"></app-icon>
                <span>{{ errorMessage() }}</span>
              </div>
              <div class="erase-modal-actions">
                <button class="av-btn-secondary" (click)="resetToConfirm()">
                  <app-icon name="arrow-left" class="icon-xs"></app-icon>
                  <span>Go Back</span>
                </button>
                <button class="av-btn-danger" (click)="executeEraseEverything()">
                  <app-icon name="trash-2" class="icon-xs"></app-icon>
                  <span>Erase Without Backup</span>
                </button>
              </div>
            }
          </div>
        }

        @if (step() === 'done') {
          <div class="erase-done-view">
            <div class="done-icon-circle">
              <app-icon name="check" class="icon-lg text-cyan"></app-icon>
            </div>
            <h2 class="done-title">Identity Permanently Erased</h2>
            <p class="done-desc">
              All clipboard history, paired relationships, and server records have been purged.
            </p>

            <div class="post-erase-choices">
              <button class="post-choice-btn primary" (click)="createNewUser()">
                <app-icon name="user-plus" class="icon-sm text-cyan"></app-icon>
                <div class="choice-text">
                  <span class="btn-headline">Create New User</span>
                  <span class="btn-sub">Generate a fresh cryptographic identity & username</span>
                </div>
              </button>

              <button class="post-choice-btn" (click)="continueAsGuest()">
                <app-icon name="user" class="icon-sm"></app-icon>
                <div class="choice-text">
                  <span class="btn-headline">Continue as Guest</span>
                  <span class="btn-sub">Start with anonymous guest credentials</span>
                </div>
              </button>
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
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
      animation: eraseBdFade 0.18s ease-out both;
    }

    @keyframes eraseBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .erase-modal-card {
      width: 100%;
      max-width: 460px;
      background: var(--av-surface-primary, #111419);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .erase-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
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
      margin-bottom: 4px;
    }

    .erase-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
      margin: 0;
    }

    .erase-subtitle {
      font-size: 12.5px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
      line-height: 1.45;
    }

    .destruction-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    .destruction-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 12px;
      color: var(--av-text-primary, #F0F3F6);
    }

    .trust-loss-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 6px;
      font-size: 11.5px;
      color: #F59E0B;
    }

    .confirmation-prompt {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .confirm-input-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-muted, #8B949E);
    }

    .confirm-input {
      width: 100%;
      height: 38px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 6px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #EF4444;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }

    .confirm-input:focus {
      border-color: #EF4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    .erase-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      font-size: 12px;
      color: #EF4444;
    }

    .erase-modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }

    .av-btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      padding: 0 16px;
      background: transparent;
      color: var(--av-text-primary, #FFFFFF);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 6px;
      font-size: 12.5px;
      cursor: pointer;
    }

    .av-btn-danger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      padding: 0 16px;
      background: #EF4444;
      color: #FFFFFF;
      border: 1px solid #DC2626;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .av-btn-danger:hover:not(:disabled) {
      background: #DC2626;
    }

    .av-btn-danger:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .erase-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Backup step ── */
    .backup-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      padding: 8px 0;
    }

    .backup-icon-circle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .backup-spinner {
      border-color: rgba(33, 150, 243, 0.25);
      border-top-color: #2196F3;
    }

    .backup-success-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 6px;
      font-size: 11.5px;
      color: #22C55E;
      text-align: left;
      width: 100%;
    }

    /* Done view */
    .erase-done-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 10px 0;
    }

    .done-icon-circle {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(33, 150, 243, 0.12);
      border: 1px solid rgba(33, 150, 243, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .done-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
      margin: 0;
    }

    .done-desc {
      font-size: 12.5px;
      color: var(--av-text-muted, #8B949E);
      margin: 0 0 10px;
      line-height: 1.5;
    }

    .post-erase-choices {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .post-choice-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      color: var(--av-text-primary, #FFFFFF);
    }

    .post-choice-btn:hover {
      border-color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.06);
    }

    .post-choice-btn.primary {
      border-color: rgba(33, 150, 243, 0.4);
    }

    .choice-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .btn-headline {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
    }

    .btn-sub {
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
    }

    .text-red { color: #EF4444; }
    .text-amber { color: #F59E0B; }
    .text-cyan { color: var(--av-accent, #2196F3); }
    .text-green { color: #22C55E; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultEraseModalComponent {
  close = output<void>();

  private deviceService = inject(AirVaultDeviceService);
  private storageService = inject(AirVaultStorageService);
  private syncService = inject(AirVaultSyncService);
  private uiStore = inject(AirVaultUIStore);
  private portability = inject(AirVaultPortabilityService);
  private http = inject(HttpClient);

  step = signal<'confirm' | 'backup' | 'done'>('confirm');
  confirmText = '';
  isErasing = signal<boolean>(false);
  errorMessage = signal<string>('');
  backupState = signal<'pending' | 'success' | 'failed'>('pending');

  currentUsername = () => this.deviceService.currentDevice().username || 'user';

  initiateBackupAndErase() {
    if (this.confirmText.trim().toUpperCase() !== 'ERASE') return;

    this.isErasing.set(true);
    this.errorMessage.set('');
    this.backupState.set('pending');
    this.step.set('backup');

    setTimeout(() => {
      try {
        const uname = this.currentUsername();
        this.portability.exportVault(false, uname);
        this.backupState.set('success');

        setTimeout(() => this.executeEraseEverything(), 1400);
      } catch (err: any) {
        console.error('[AirVault Erase] Backup creation error:', err);
        this.backupState.set('failed');
        this.isErasing.set(false);
        this.errorMessage.set(
          'Backup could not be created. You can erase without a backup or go back.'
        );
      }
    }, 100);
  }

  executeEraseEverything() {
    this.isErasing.set(true);
    this.errorMessage.set('');

    const cur = this.deviceService.currentDevice();

    try {
      for (const peer of this.deviceService.pairedDevices()) {
        this.syncService.sendSignalMessageDirect('DEVICE_DISCONNECT', JSON.stringify({
          targetDeviceId: peer.id,
          senderDevice: cur,
          timestamp: Date.now()
        }), peer.id);
      }
    } catch {}

    const url = getAirVaultApiUrl(`/api/v1/airvault/auth/erase-everything?clientDeviceId=${encodeURIComponent(cur.id)}&username=${encodeURIComponent(cur.username || '')}`);
    this.http.post<any>(url, {}).pipe(
      catchError(err => {
        console.warn('[AirVault Erase] Backend erase warning:', err);
        return of({ success: true });
      })
    ).subscribe({
      next: () => {
        this.storageService.clearAllLocally();

        try {
          const keysToRemove = [
            'acklet_airvault_device_id',
            'acklet_airvault_username',
            'acklet_airvault_keyword',
            'acklet_airvault_identity_chosen',
            'acklet_airvault_peers',
            'acklet_airvault_items',
            'acklet_airvault_audit_logs',
            'acklet_airvault_staged_text',
            'acklet_airvault_self_custom',
            'airvault_auto_capture',
            'airvault_user_prefs'
          ];
          if (cur.username) {
            keysToRemove.push(`acklet_airvault_disconnected_peer_ids_${cur.username}`);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch {}

        this.isErasing.set(false);
        this.close.emit();
        window.location.reload();
      },
      error: () => {
        this.isErasing.set(false);
        this.errorMessage.set('AirVault could not complete the full erase. Please retry.');
        this.step.set('backup');
        this.backupState.set('failed');
      }
    });
  }

  resetToConfirm() {
    this.step.set('confirm');
    this.confirmText = '';
    this.isErasing.set(false);
    this.errorMessage.set('');
    this.backupState.set('pending');
  }

  createNewUser() {
    this.close.emit();
    this.uiStore.showIdentityOnboardingModal.set(true);
    window.location.reload();
  }

  continueAsGuest() {
    this.close.emit();
    this.deviceService.completeGuestOnboarding();
    window.location.reload();
  }
}
