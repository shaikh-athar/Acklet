// apps/tool-image-compressor/src/components/profile-modal/profile-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ProfileManagerService } from '../../services/profile-manager.service';
import { OptimizationProfile, CompressionSettings } from '../../models/compressor.models';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop animate-fade-in"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Optimization Profiles Manager"
    >
      <div class="modal-dialog animate-scale-up" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-wrap">
            <ts-icon name="bookmark" [size]="20" />
          </div>
          <div class="header-text-group">
            <h3 class="modal-title">Optimization Profiles</h3>
            <span class="modal-subtitle">Reusable compression presets & custom workflows</span>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="close.emit()"
            title="Close dialog (Escape)"
            aria-label="Close dialog"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Profile Creation Form (if open) -->
          @if (isCreating()) {
            <div class="create-profile-box">
              <div class="create-box-header">
                <span class="create-box-title">Save Current Settings as New Profile</span>
                <button type="button" class="btn-text-subtle" (click)="isCreating.set(false)">Cancel</button>
              </div>

              <div class="form-group">
                <label for="prof-name">Profile Name</label>
                <input
                  id="prof-name"
                  type="text"
                  class="text-input"
                  [(ngModel)]="newProfileName"
                  placeholder="e.g., Marketing Hero Banners"
                  maxlength="40"
                />
              </div>

              <div class="form-group">
                <label for="prof-desc">Description</label>
                <input
                  id="prof-desc"
                  type="text"
                  class="text-input"
                  [(ngModel)]="newProfileDesc"
                  placeholder="e.g., WebP 85% quality with GPS stripped"
                  maxlength="100"
                />
              </div>

              <div class="create-box-footer">
                <button
                  type="button"
                  class="btn-save-profile"
                  [disabled]="!newProfileName.trim()"
                  (click)="saveNewProfile()"
                >
                  <ts-icon name="check" [size]="14" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          } @else {
            <div class="modal-top-bar">
              <span class="profile-count-pill font-mono">
                {{ profileManager.profiles().length }} Profiles ({{ profileManager.customProfiles().length }} Custom)
              </span>
              <button
                type="button"
                class="btn-add-profile"
                (click)="isCreating.set(true)"
              >
                <ts-icon name="plus" [size]="14" />
                <span>Save Current as Profile</span>
              </button>
            </div>
          }

          <!-- Profiles List -->
          <div class="profiles-list">
            @for (profile of profileManager.profiles(); track profile.id) {
              <div class="profile-card" [class.is-custom]="profile.isCustom">
                <div class="profile-card-header">
                  <div class="profile-title-row">
                    <span class="profile-name">{{ profile.name }}</span>
                    @if (profile.isCustom) {
                      <span class="badge-custom font-mono">Custom</span>
                    } @else {
                      <span class="badge-system font-mono">System</span>
                    }
                  </div>
                  <p class="profile-desc">{{ profile.description }}</p>
                </div>

                <!-- Settings Summary Pills -->
                <div class="profile-spec-chips font-mono">
                  <span class="spec-chip">
                    <ts-icon name="image" [size]="10" />
                    <span>{{ profile.settings.outputFormat | uppercase }}</span>
                  </span>
                  @if (profile.settings.targetFileSize?.enabled) {
                    <span class="spec-chip chip-target">
                      <ts-icon name="target" [size]="10" />
                      <span>≤ {{ profile.settings.targetFileSize?.targetValue }} {{ profile.settings.targetFileSize?.targetUnit }}</span>
                    </span>
                  } @else {
                    <span class="spec-chip">
                      <ts-icon name="sliders" [size]="10" />
                      <span>Q{{ profile.settings.quality }}%</span>
                    </span>
                  }
                  <span class="spec-chip">
                    <ts-icon name="shield" [size]="10" />
                    <span>{{ profile.settings.metadataPolicy === 'remove' ? 'Strip All' : (profile.settings.metadataPolicy === 'strip-gps' ? 'Strip GPS' : 'Preserve') }}</span>
                  </span>
                  @if (profile.settings.advancedOptimization?.chromaSubsampling === '4:4:4') {
                    <span class="spec-chip chip-pro">4:4:4 Chroma</span>
                  }
                </div>

                <!-- Actions Bar -->
                <div class="profile-actions-bar">
                  <div class="primary-apply-actions">
                    <button
                      type="button"
                      class="btn-apply-all"
                      (click)="applyAll.emit(profile.id)"
                      title="Apply profile to all images in workspace"
                    >
                      <ts-icon name="layers" [size]="12" />
                      <span>Apply to All</span>
                    </button>
                    @if (selectedCount() > 0) {
                      <button
                        type="button"
                        class="btn-apply-selected"
                        (click)="applySelected.emit(profile.id)"
                        title="Apply profile to selected images"
                      >
                        <ts-icon name="check-square" [size]="12" />
                        <span>Apply ({{ selectedCount() }})</span>
                      </button>
                    }
                  </div>

                  <div class="secondary-actions">
                    <button
                      type="button"
                      class="btn-icon-action"
                      (click)="duplicateProfile(profile.id)"
                      title="Duplicate profile"
                      aria-label="Duplicate profile"
                    >
                      <ts-icon name="copy" [size]="13" />
                    </button>
                    @if (profile.isCustom) {
                      <button
                        type="button"
                        class="btn-icon-action danger-hover"
                        (click)="deleteProfile(profile.id)"
                        title="Delete custom profile"
                        aria-label="Delete profile"
                      >
                        <ts-icon name="trash-2" [size]="13" />
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-done"
            (click)="close.emit()"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1050;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-dialog {
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: var(--ts-radius-inner, 16px);
      width: 100%;
      max-width: 640px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--ts-radius-md, 10px);
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent, #60A5FA);
      flex-shrink: 0;
    }

    .header-text-group {
      flex: 1;
      min-width: 0;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted, #9CA3AF);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: var(--ts-radius-sm, 8px);
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .profile-count-pill {
      font-size: 11px;
      color: var(--text-muted, #9CA3AF);
      background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.05));
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .btn-add-profile {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #FFFFFF;
      background: var(--accent, #2563EB);
      border: none;
      border-radius: var(--ts-radius-sm, 8px);
      cursor: pointer;
      transition: opacity 150ms ease;
    }

    .btn-add-profile:hover {
      opacity: 0.9;
    }

    /* Create Profile Box */
    .create-profile-box {
      background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--accent, #3B82F6);
      border-radius: var(--ts-radius-md, 12px);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .create-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .create-box-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
    }

    .btn-text-subtle {
      background: none;
      border: none;
      color: var(--text-muted, #9CA3AF);
      font-size: 11px;
      cursor: pointer;
    }

    .btn-text-subtle:hover {
      color: var(--text, #FFFFFF);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #9CA3AF);
    }

    .text-input {
      background: var(--bg-surface, #111827);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text, #FFFFFF);
      padding: 8px 12px;
      border-radius: var(--ts-radius-sm, 8px);
      font-size: 13px;
      outline: none;
    }

    .text-input:focus {
      border-color: var(--accent, #3B82F6);
    }

    .create-box-footer {
      display: flex;
      justify-content: flex-end;
    }

    .btn-save-profile {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #FFFFFF;
      background: var(--accent, #2563EB);
      border: none;
      border-radius: var(--ts-radius-sm, 8px);
      cursor: pointer;
    }

    .btn-save-profile:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Profiles List */
    .profiles-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .profile-card {
      background: var(--bg-surface, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-md, 12px);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 150ms ease;
    }

    .profile-card:hover {
      border-color: rgba(255, 255, 255, 0.16);
    }

    .profile-card.is-custom {
      border-left: 3px solid var(--accent, #3B82F6);
    }

    .profile-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .profile-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
    }

    .badge-system {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted, #9CA3AF);
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 6px;
      border-radius: 9999px;
    }

    .badge-custom {
      font-size: 10px;
      font-weight: 600;
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 1px 6px;
      border-radius: 9999px;
    }

    .profile-desc {
      font-size: 12px;
      color: var(--text-muted, #9CA3AF);
      margin: 3px 0 0;
      line-height: 1.4;
    }

    .profile-spec-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .spec-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--text-muted, #D1D5DB);
      background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      padding: 2px 7px;
      border-radius: 6px;
    }

    .chip-target {
      color: #FBBF24;
      border-color: rgba(245, 158, 11, 0.25);
    }

    .chip-pro {
      color: #A78BFA;
      border-color: rgba(167, 139, 250, 0.25);
    }

    .profile-actions-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
    }

    .primary-apply-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-apply-all, .btn-apply-selected {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: var(--ts-radius-sm, 6px);
      cursor: pointer;
      transition: background 150ms ease;
    }

    .btn-apply-all {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      border: none;
    }

    .btn-apply-all:hover {
      opacity: 0.9;
    }

    .btn-apply-selected {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
    }

    .btn-apply-selected:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .secondary-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-icon-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted, #9CA3AF);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-icon-action:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.12);
    }

    .btn-icon-action.danger-hover:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .btn-done {
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #FFFFFF;
      background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: var(--ts-radius-sm, 8px);
      cursor: pointer;
    }

    .btn-done:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    /* ── Light Theme Dual-Theme Overrides ── */
    :host-context([data-theme="light"]) .modal-backdrop,
    [data-theme="light"] .modal-backdrop {
      background: rgba(15, 23, 42, 0.45);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .modal-subtitle,
    [data-theme="light"] .modal-subtitle {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .profile-card,
    [data-theme="light"] .profile-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .profile-title,
    [data-theme="light"] .profile-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .profile-desc,
    [data-theme="light"] .profile-desc {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .spec-chip,
    [data-theme="light"] .spec-chip {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #334155;
    }

    :host-context([data-theme="light"]) .profile-actions-bar,
    [data-theme="light"] .profile-actions-bar {
      border-top-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .btn-apply-selected,
    [data-theme="light"] .btn-apply-selected {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .btn-done,
    [data-theme="light"] .btn-done {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-done:hover,
    [data-theme="light"] .btn-done:hover {
      background: #F1F5F9;
    }
  `]
})
export class ProfileModalComponent {
  readonly profileManager: ProfileManagerService;

  constructor() {
    try {
      this.profileManager = inject(ProfileManagerService);
    } catch {
      this.profileManager = new ProfileManagerService();
    }
  }

  readonly currentSettings = input.required<CompressionSettings>();
  readonly selectedCount = input<number>(0);

  readonly close = output<void>();
  readonly applyAll = output<string>();
  readonly applySelected = output<string>();

  readonly isCreating = signal<boolean>(false);
  newProfileName = '';
  newProfileDesc = '';

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  saveNewProfile(): void {
    if (!this.newProfileName.trim()) return;

    this.profileManager.createProfile(
      this.newProfileName,
      this.newProfileDesc || 'Custom profile created from current workspace settings.',
      this.currentSettings()
    );

    this.newProfileName = '';
    this.newProfileDesc = '';
    this.isCreating.set(false);
  }

  duplicateProfile(id: string): void {
    this.profileManager.duplicateProfile(id);
  }

  deleteProfile(id: string): void {
    this.profileManager.deleteProfile(id);
  }
}
