import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultSharedClipboardService, SharedClipboardData } from '../services/airvault-shared-clipboard.service';
import { AirVaultLimitsService } from '../services/airvault-limits.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';

@Component({
  selector: 'app-airvault-create-clipboard-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="create-modal-backdrop" [class.is-closing]="isClosing()" (click)="onDismiss()" (keydown.escape)="onDismiss()">
      <div class="create-modal-container" [class.is-closing]="isClosing()" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="create-modal-header">
          <div class="create-header-title-group">
            <div class="create-icon-badge">
              <app-icon name="plus-circle" class="icon-sm text-cyan"></app-icon>
            </div>
            <div>
              <h2 class="create-modal-title">Create Standalone Clipboard</h2>
              <p class="create-modal-subtitle">Dedicated space with custom shareable link and access rules</p>
            </div>
          </div>
          <button class="create-close-btn" (click)="onDismiss()" aria-label="Close">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Limits Quota & Size Limit Banner -->
        <div class="quota-banner" [class.quota-exhausted]="isLimitReached()">
          <div class="quota-stat-item">
            <app-icon name="layers" class="icon-xs quota-icon"></app-icon>
            <div class="quota-stat-info">
              <span class="quota-label">Clipboard Quota</span>
              <span class="quota-val">
                <strong>{{ activeCreatedCount() }}</strong> / {{ maxClipboards() }} Created
              </span>
            </div>
          </div>
          <div class="quota-divider"></div>
          <div class="quota-stat-item">
            <app-icon name="hard-drive" class="icon-xs quota-icon"></app-icon>
            <div class="quota-stat-info">
              <span class="quota-label">Storage Limit</span>
              <span class="quota-val">{{ limitsService.maxClipboardFormatted() }} Storage Cap</span>
            </div>
          </div>
        </div>

        @if (isLimitReached()) {
          <div class="limit-warning-banner">
            <app-icon name="alert-triangle" class="icon-sm text-amber"></app-icon>
            <div class="warning-text">
              <strong>Clipboard Limit Reached ({{ maxClipboards() }}/{{ maxClipboards() }})</strong>
              <p>Each user can create up to {{ maxClipboards() }} clipboards. Delete an existing clipboard from the dropdown menu to free up a slot.</p>
            </div>
          </div>
        }

        <!-- Form Body -->
        <div class="create-form-body">
          
          <!-- Board Title -->
          <div class="form-group">
            <label class="form-label" for="clipboardTitle">BOARD TITLE</label>
            <div class="input-wrap">
              <app-icon name="edit-3" class="icon-xs input-icon"></app-icon>
              <input
                id="clipboardTitle"
                type="text"
                class="form-input"
                [(ngModel)]="boardTitle"
                placeholder="e.g. Design Assets, Meeting Notes, Project Delta"
                maxlength="64"
                autocomplete="off"
              />
            </div>
          </div>

          <!-- Custom Slug / ID -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label" for="customSlug">CUSTOM CLIPBOARD ID (OPTIONAL)</label>
              <span class="label-hint">Leave blank for auto-generated memorable ID</span>
            </div>
            <div class="input-wrap slug-wrap">
              <span class="slug-prefix">c/</span>
              <input
                id="customSlug"
                type="text"
                class="form-input slug-input"
                [ngModel]="customSlug()"
                (ngModelChange)="onSlugChanged($event)"
                placeholder="my-custom-board"
                maxlength="32"
                autocomplete="off"
                spellcheck="false"
              />
              <div class="slug-status">
                @if (isCheckingSlug()) {
                  <app-icon name="loader" class="icon-xxs spin-icon text-accent"></app-icon>
                } @else if (slugCheckResult()?.available && customSlug().length >= 3) {
                  <app-icon name="check-circle" class="icon-xxs text-green" title="Available!"></app-icon>
                } @else if (slugCheckResult() && !slugCheckResult()?.available) {
                  <app-icon name="alert-circle" class="icon-xxs text-rose" [title]="slugCheckResult()?.message || 'Unavailable'"></app-icon>
                }
              </div>
            </div>
            @if (slugCheckResult()?.message && customSlug().length >= 3) {
              <p class="slug-feedback-msg" [class.is-error]="!slugCheckResult()?.available" [class.is-ok]="slugCheckResult()?.available">
                {{ slugCheckResult()?.message }}
              </p>
            }
          </div>

          <!-- Access Mode Permissions -->
          <div class="form-group">
            <label class="form-label">ACCESS PERMISSIONS</label>
            <div class="permission-grid">
              
              <!-- Read-Write -->
              <button
                type="button"
                class="perm-card"
                [class.is-active]="accessMode() === 'read-write'"
                (click)="accessMode.set('read-write')">
                <div class="perm-radio"><div class="perm-dot"></div></div>
                <div class="perm-info">
                  <div class="perm-head">
                    <app-icon name="edit-2" class="icon-xs text-cyan"></app-icon>
                    <span class="perm-title">Read & Write</span>
                  </div>
                  <p class="perm-desc">Collaborators and visitors with link can post and view clipboard items.</p>
                </div>
              </button>

              <!-- Read-Only -->
              <button
                type="button"
                class="perm-card"
                [class.is-active]="accessMode() === 'read-only'"
                (click)="accessMode.set('read-only')">
                <div class="perm-radio"><div class="perm-dot"></div></div>
                <div class="perm-info">
                  <div class="perm-head">
                    <app-icon name="lock" class="icon-xs text-muted"></app-icon>
                    <span class="perm-title">Read-Only</span>
                  </div>
                  <p class="perm-desc">Visitors can view and copy items, but cannot modify or upload content.</p>
                </div>
              </button>

            </div>
          </div>

          <!-- Retention Period -->
          <div class="form-group">
            <label class="form-label">AUTO-EXPIRY RETENTION</label>
            <div class="retention-pills">
              @for (days of retentionOptions; track days) {
                <button
                  type="button"
                  class="retention-pill"
                  [class.is-active]="retentionDays() === days"
                  (click)="retentionDays.set(days)">
                  {{ days }} Days
                </button>
              }
            </div>
          </div>

          <!-- Error Feedback -->
          @if (errorMessage()) {
            <div class="form-error-banner">
              <app-icon name="alert-circle" class="icon-xs text-rose"></app-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

        </div>

        <!-- Footer Actions -->
        <div class="create-modal-footer">
          <button type="button" class="btn-cancel" (click)="onDismiss()" [disabled]="isSubmitting()">
            Cancel
          </button>
          <button
            type="button"
            class="btn-create"
            [disabled]="isSubmitting() || isLimitReached() || (slugCheckResult() && !slugCheckResult()?.available)"
            (click)="submitCreate()">
            @if (isSubmitting()) {
              <app-icon name="loader" class="icon-xs spin-icon"></app-icon>
              <span>Creating Board...</span>
            } @else {
              <app-icon name="check" class="icon-xs"></app-icon>
              <span>Create Clipboard</span>
            }
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .create-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: backdropFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .create-modal-backdrop.is-closing {
      animation: backdropFadeOut 0.15s forwards;
    }

    .create-modal-container {
      width: 100%;
      max-width: 520px;
      background: var(--jl-surface-primary, #111827);
      border: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .create-modal-container.is-closing {
      animation: modalSlideDown 0.15s forwards;
    }

    .create-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.08));
    }
    .create-header-title-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .create-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .create-modal-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--jl-text-main, #f3f4f6);
      margin: 0;
    }
    .create-modal-subtitle {
      font-size: 0.75rem;
      color: var(--jl-text-muted, #9ca3af);
      margin: 0.15rem 0 0 0;
    }
    .create-close-btn {
      background: transparent;
      border: none;
      color: var(--jl-text-muted, #9ca3af);
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 8px;
      transition: background 0.15s, color 0.15s;
    }
    .create-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--jl-text-main, #fff);
    }

    /* Quota Banner */
    .quota-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.06));
      padding: 0.75rem 1.5rem;
    }
    .quota-stat-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .quota-icon {
      color: #38bdf8;
    }
    .quota-stat-info {
      display: flex;
      flex-direction: column;
    }
    .quota-label {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--jl-text-muted, #9ca3af);
    }
    .quota-val {
      font-size: 0.8rem;
      color: var(--jl-text-main, #e5e7eb);
    }
    .quota-divider {
      width: 1px;
      height: 24px;
      background: var(--jl-border-subtle, rgba(255, 255, 255, 0.1));
    }
    .quota-banner.quota-exhausted {
      background: rgba(245, 158, 11, 0.08);
    }

    /* Warning Banner */
    .limit-warning-banner {
      margin: 1rem 1.5rem 0;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .warning-text strong {
      display: block;
      font-size: 0.8rem;
      color: #fbbf24;
    }
    .warning-text p {
      font-size: 0.72rem;
      color: #d1d5db;
      margin: 0.2rem 0 0 0;
      line-height: 1.35;
    }

    /* Form Body */
    .create-form-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .form-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--jl-text-muted, #9ca3af);
    }
    .label-hint {
      font-size: 0.68rem;
      color: var(--jl-text-muted, #6b7280);
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--jl-surface-secondary, rgba(0, 0, 0, 0.35));
      border: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input-wrap:focus-within {
      border-color: #06b6d4;
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
    }
    .input-icon {
      margin-left: 0.85rem;
      color: var(--jl-text-muted, #9ca3af);
    }
    .form-input {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0.7rem 0.85rem;
      font-size: 0.85rem;
      color: var(--jl-text-main, #f3f4f6);
      outline: none;
    }
    .form-input::placeholder {
      color: rgba(156, 163, 175, 0.6);
    }

    /* Slug input */
    .slug-wrap {
      padding-left: 0.85rem;
    }
    .slug-prefix {
      font-size: 0.85rem;
      font-weight: 600;
      color: #06b6d4;
    }
    .slug-input {
      padding-left: 0.3rem;
      font-family: monospace;
    }
    .slug-status {
      margin-right: 0.85rem;
      display: flex;
      align-items: center;
    }
    .slug-feedback-msg {
      font-size: 0.72rem;
      margin: 0.25rem 0 0 0;
    }
    .slug-feedback-msg.is-ok {
      color: #34d399;
    }
    .slug-feedback-msg.is-error {
      color: #f87171;
    }

    /* Permission Grid */
    .permission-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .perm-card {
      background: var(--jl-surface-secondary, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      padding: 0.75rem;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      transition: all 0.15s ease;
    }
    .perm-card:hover {
      border-color: rgba(6, 182, 212, 0.35);
      background: rgba(6, 182, 212, 0.04);
    }
    .perm-card.is-active {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
    }
    .perm-radio {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.3));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.15rem;
      flex-shrink: 0;
    }
    .perm-card.is-active .perm-radio {
      border-color: #06b6d4;
    }
    .perm-card.is-active .perm-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #06b6d4;
    }
    .perm-head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .perm-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--jl-text-main, #f3f4f6);
    }
    .perm-desc {
      font-size: 0.68rem;
      color: var(--jl-text-muted, #9ca3af);
      margin: 0.2rem 0 0 0;
      line-height: 1.3;
    }

    /* Retention Pills */
    .retention-pills {
      display: flex;
      gap: 0.5rem;
    }
    .retention-pill {
      flex: 1;
      background: var(--jl-surface-secondary, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 0.5rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--jl-text-muted, #9ca3af);
      cursor: pointer;
      transition: all 0.15s;
    }
    .retention-pill:hover {
      border-color: rgba(255, 255, 255, 0.2);
      color: var(--jl-text-main, #fff);
    }
    .retention-pill.is-active {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.15);
      color: #38bdf8;
      font-weight: 600;
    }

    /* Error Banner */
    .form-error-banner {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #fda4af;
    }

    /* Footer */
    .create-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.15rem 1.5rem;
      border-top: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.08));
      background: rgba(0, 0, 0, 0.2);
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--jl-border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      padding: 0.6rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--jl-text-muted, #d1d5db);
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }
    .btn-create {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.35rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
      transition: all 0.15s;
    }
    .btn-create:hover:not(:disabled) {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
    }
    .btn-create:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes backdropFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes modalSlideDown {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(12px) scale(0.97); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultCreateClipboardModalComponent {
  readonly sharedService = inject(AirVaultSharedClipboardService);
  readonly limitsService = inject(AirVaultLimitsService);
  private uiStore = inject(AirVaultUIStore);

  readonly close = output<void>();
  readonly created = output<SharedClipboardData>();

  readonly isClosing = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Form Fields
  boardTitle = 'My Shared Vault';
  readonly customSlug = signal<string>('');
  readonly accessMode = signal<'read-only' | 'read-write'>('read-write');
  readonly retentionDays = signal<number>(7);
  readonly retentionOptions = [1, 7, 30];

  // Slug check
  readonly isCheckingSlug = signal<boolean>(false);
  readonly slugCheckResult = signal<{ available: boolean; message: string } | null>(null);
  private slugDebounceTimer: any = null;

  // Limits
  readonly maxClipboards = computed(() => this.limitsService.limits().maxClipboardsPerUser || 5);
  readonly activeCreatedCount = computed(() => this.sharedService.myCreatedClipboards().length);
  readonly isLimitReached = computed(() => this.activeCreatedCount() >= this.maxClipboards());

  constructor() {
    // Initial fetch of user's clipboards to ensure accurate count
    this.sharedService.fetchMyClipboards();
  }

  onSlugChanged(val: string) {
    const clean = (val || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    this.customSlug.set(clean);
    this.slugCheckResult.set(null);

    if (this.slugDebounceTimer) {
      clearTimeout(this.slugDebounceTimer);
    }

    if (clean.length >= 3) {
      this.isCheckingSlug.set(true);
      this.slugDebounceTimer = setTimeout(async () => {
        const res = await this.sharedService.checkSlugAvailability(clean);
        this.slugCheckResult.set(res);
        this.isCheckingSlug.set(false);
      }, 350);
    }
  }

  async submitCreate() {
    if (this.isLimitReached()) {
      this.errorMessage.set(`Maximum limit of ${this.maxClipboards()} clipboards reached.`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      title: this.boardTitle.trim() || undefined,
      id: this.customSlug().trim() || undefined,
      accessMode: this.accessMode(),
      retentionDays: this.retentionDays()
    };

    const res = await this.sharedService.createClipboard(payload);

    this.isSubmitting.set(false);

    if (res.success && res.data) {
      this.uiStore.triggerToast(`✨ Created clipboard #${res.data.id}!`);
      this.created.emit(res.data);
      this.onDismiss();
    } else {
      this.errorMessage.set(res.error || 'Failed to create clipboard');
    }
  }

  onDismiss() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 150);
  }
}
