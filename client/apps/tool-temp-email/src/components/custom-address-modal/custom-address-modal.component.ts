// apps/tool-temp-email/src/components/custom-address-modal/custom-address-modal.component.ts
import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { MailDomain } from '../../models/temp-email.models';
import { TempEmailService } from '../../services/temp-email.service';

@Component({
  selector: 'app-custom-address-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-card animate-scale-in" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-cluster">
            <span class="modal-icon-badge">
              <ts-icon name="mail" [size]="18" />
            </span>
            <div>
              <h3 id="modal-title" class="modal-title">Create Custom Address</h3>
              <p class="modal-subtitle">Choose a custom username on an active domain</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" (click)="close.emit()" aria-label="Close modal">
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <label class="input-label" for="username-input">Custom Username</label>
          <div class="address-input-group">
            <input
              id="username-input"
              type="text"
              class="custom-username-field"
              [class.has-error]="validationError()"
              [(ngModel)]="username"
              (ngModelChange)="onUsernameChange()"
              (keyup.enter)="onSubmit()"
              placeholder="e.g. testing.app"
              maxlength="32"
              autofocus
            />
            <span class="at-separator">&#64;</span>
            <select class="domain-select" [(ngModel)]="selectedDomain" (ngModelChange)="onDomainChange()">
              @for (d of domains(); track d.id) {
                <option [value]="d.domain">{{ d.domain }}</option>
              }
            </select>
          </div>

          <!-- Live Preview Box -->
          <div class="preview-box" [class.is-taken]="isAlreadyTaken()">
            <div class="preview-text-cluster">
              <span class="preview-label">Full Address:</span>
              <span class="preview-address font-mono">{{ fullAddress() }}</span>
            </div>
          </div>

          <!-- Standard Validation Error (Format, Length, etc.) -->
          @if (validationError() && !isAlreadyTaken()) {
            <div class="error-notice animate-fade-in" role="alert">
              <ts-icon name="alert-circle" [size]="14" />
              <span>{{ validationError() }}</span>
            </div>
          }

          <!-- Address Already Taken Alert Card with Suggestions -->
          @if (isAlreadyTaken()) {
            <div class="taken-alert-card animate-fade-in" role="alert">
              <div class="taken-alert-header">
                <ts-icon name="alert-triangle" [size]="15" class="taken-alert-icon" />
                <span class="taken-alert-title">Address Already Registered</span>
              </div>
              <p class="taken-alert-desc">
                <strong>{{ fullAddress() }}</strong> is already in use. Please pick another name or click one of these suggestions:
              </p>
              @if (suggestions().length > 0) {
                <div class="suggestions-cluster">
                  @for (sug of suggestions(); track sug) {
                    <button
                      type="button"
                      class="suggestion-pill-btn btn-accent-chip"
                      (click)="applySuggestion(sug)"
                      title="Use {{ sug }} as your username"
                    >
                      <ts-icon name="plus" [size]="12" class="sug-icon" />
                      <span class="sug-text font-mono">{{ sug }}</span>
                    </button>
                  }
                </div>
              }
            </div>
          }

          <p class="disclaimer-text">
            Disposable addresses are publicly accessible and will automatically expire. Never use for permanent accounts or sensitive banking.
          </p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="cancel-btn" (click)="close.emit()" [disabled]="isSubmitting()">
            Cancel
          </button>
          <button
            type="button"
            class="submit-btn btn-accent-chip"
            [disabled]="!isValid() || isSubmitting()"
            (click)="onSubmit()"
          >
            @if (isSubmitting()) {
              <span class="spinner-circle-xs" aria-hidden="true"></span>
              <span>Creating Inbox...</span>
            } @else {
              <ts-icon name="check" [size]="15" />
              <span>Create Inbox</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      width: 100%;
      max-width: 480px;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    :host-context([data-theme="light"]) .modal-card,
    [data-theme="light"] .modal-card {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    .header-icon-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--accent-soft, rgba(139, 92, 246, 0.15));
      border: 1px solid var(--accent-border, rgba(139, 92, 246, 0.3));
      color: var(--accent, #8B5CF6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="light"]) .modal-icon-badge,
    [data-theme="light"] .modal-icon-badge {
      background: rgba(124, 58, 237, 0.1);
      border-color: rgba(124, 58, 237, 0.3);
      color: #7C3AED;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      margin: 2px 0 0;
    }

    :host-context([data-theme="light"]) .modal-subtitle,
    [data-theme="light"] .modal-subtitle {
      color: #64748B;
    }

    .modal-close-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .modal-close-btn,
    [data-theme="light"] .modal-close-btn {
      color: #64748B;
    }

    .modal-close-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .modal-close-btn:hover,
    [data-theme="light"] .modal-close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .input-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #E2E8F0);
    }

    :host-context([data-theme="light"]) .input-label,
    [data-theme="light"] .input-label {
      color: #1E293B;
      font-weight: 700;
    }

    .address-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .custom-username-field {
      flex: 1;
      height: 42px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text, #FFFFFF);
      border-radius: 10px;
      padding: 0 12px;
      font-size: 14px;
      outline: none;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .custom-username-field,
    [data-theme="light"] .custom-username-field {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .custom-username-field:focus {
      border-color: var(--accent, #8B5CF6);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }

    :host-context([data-theme="light"]) .custom-username-field:focus,
    [data-theme="light"] .custom-username-field:focus {
      border-color: #7C3AED;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    }

    .custom-username-field.has-error {
      border-color: #EF4444 !important;
    }

    :host-context([data-theme="light"]) .custom-username-field.has-error,
    [data-theme="light"] .custom-username-field.has-error {
      border-color: #DC2626 !important;
    }

    .at-separator {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .at-separator,
    [data-theme="light"] .at-separator {
      color: #475569;
    }

    .domain-select {
      height: 42px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text, #FFFFFF);
      border-radius: 10px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .domain-select,
    [data-theme="light"] .domain-select {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
      font-weight: 600;
    }

    .preview-box {
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--accent-soft, rgba(139, 92, 246, 0.08));
      border: 1px solid var(--accent-border, rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    :host-context([data-theme="light"]) .preview-box,
    [data-theme="light"] .preview-box {
      background: rgba(124, 58, 237, 0.06);
      border-color: rgba(124, 58, 237, 0.25);
    }

    .preview-box.is-taken {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.3);
    }

    :host-context([data-theme="light"]) .preview-box.is-taken,
    [data-theme="light"] .preview-box.is-taken {
      background: #FEF2F2;
      border-color: #FCA5A5;
    }

    .preview-label {
      color: var(--text-muted, #94A3B8);
      font-size: 12px;
    }

    :host-context([data-theme="light"]) .preview-label,
    [data-theme="light"] .preview-label {
      color: #475569;
    }

    .preview-address {
      color: var(--accent-strong, #A78BFA);
      font-weight: 600;
      word-break: break-all;
    }

    :host-context([data-theme="light"]) .preview-address,
    [data-theme="light"] .preview-address {
      color: #6D28D9;
      font-weight: 700;
    }

    .error-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #EF4444;
      font-size: 12px;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .error-notice,
    [data-theme="light"] .error-notice {
      color: #DC2626;
    }

    /* Taken Alert Card */
    .taken-alert-card {
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.28);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    :host-context([data-theme="light"]) .taken-alert-card,
    [data-theme="light"] .taken-alert-card {
      background: #FEF2F2;
      border-color: #FECACA;
    }

    .taken-alert-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #EF4444;
      font-size: 12px;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .taken-alert-header,
    [data-theme="light"] .taken-alert-header {
      color: #DC2626;
    }

    .taken-alert-desc {
      font-size: 12px;
      color: var(--text-muted, #CBD5E1);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .taken-alert-desc,
    [data-theme="light"] .taken-alert-desc {
      color: #334155;
    }

    .suggestions-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .suggestion-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid var(--accent-border, rgba(139, 92, 246, 0.45));
      background: var(--accent-soft, rgba(139, 92, 246, 0.16)) !important;
      color: var(--accent-strong, #DDD6FE) !important;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .suggestion-pill-btn:hover {
      background: var(--accent, #8B5CF6) !important;
      color: #FFFFFF !important;
      border-color: #A78BFA !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4) !important;
    }

    .suggestion-pill-btn .sug-icon {
      color: var(--accent-strong, #C4B5FD);
      transition: color 0.15s ease;
    }

    .suggestion-pill-btn:hover .sug-icon {
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .suggestion-pill-btn,
    [data-theme="light"] .suggestion-pill-btn {
      background: #FFFFFF !important;
      border: 1.5px solid #7C3AED !important;
      color: #6D28D9 !important;
      box-shadow: 0 1px 3px rgba(124, 58, 237, 0.12) !important;
    }

    :host-context([data-theme="light"]) .suggestion-pill-btn .sug-icon,
    [data-theme="light"] .suggestion-pill-btn .sug-icon {
      color: #7C3AED;
    }

    :host-context([data-theme="light"]) .suggestion-pill-btn:hover,
    [data-theme="light"] .suggestion-pill-btn:hover {
      background: #7C3AED !important;
      border-color: #6D28D9 !important;
      color: #FFFFFF !important;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35) !important;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .suggestion-pill-btn:hover .sug-icon,
    [data-theme="light"] .suggestion-pill-btn:hover .sug-icon {
      color: #FFFFFF !important;
    }

    .suggestion-pill-btn:active {
      transform: translateY(0);
    }

    .disclaimer-text {
      font-size: 11px;
      color: var(--text-muted, #64748B);
      line-height: 1.4;
      margin: 4px 0 0;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    .cancel-btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 10px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      background: transparent;
      color: var(--text-muted, #94A3B8);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .cancel-btn,
    [data-theme="light"] .cancel-btn {
      border-color: #CBD5E1;
      color: #334155;
    }

    .cancel-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.06));
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .cancel-btn:hover,
    [data-theme="light"] .cancel-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    /* ALL BUTTON HOVER VISIBILITY GUARANTEED VIA !important AND HIGH-CONTRAST DUAL-THEME */
    .submit-btn {
      height: 38px;
      padding: 0 18px;
      border-radius: 10px;
      background: var(--accent, #8B5CF6) !important;
      color: #FFFFFF !important;
      border: 1px solid var(--accent, #8B5CF6) !important;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
      transition: all 0.15s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background: #7C3AED !important;
      border-color: #6D28D9 !important;
      color: #FFFFFF !important;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .submit-btn,
    [data-theme="light"] .submit-btn {
      background: #7C3AED !important;
      border-color: #6D28D9 !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .submit-btn:hover:not(:disabled),
    [data-theme="light"] .submit-btn:hover:not(:disabled) {
      background: #5B21B6 !important;
      border-color: #4C1D95 !important;
      color: #FFFFFF !important;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
    }

    .submit-btn:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      transform: none !important;
      box-shadow: none !important;
    }

    .spinner-circle-xs {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
      animation: fadeIn 0.15s ease-out;
    }
  `]
})
export class CustomAddressModalComponent implements OnInit {
  private readonly emailService = inject(TempEmailService);

  readonly domains = input.required<MailDomain[]>();
  readonly create = output<{ username: string; domain: string }>();
  readonly close = output<void>();

  readonly username = signal<string>('');
  readonly selectedDomain = signal<string>('');
  readonly validationError = signal<string | null>(null);
  readonly isAlreadyTaken = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly suggestions = signal<string[]>([]);

  readonly fullAddress = computed(() => {
    const user = this.username().trim() || 'username';
    const dom = this.selectedDomain() || (this.domains()[0]?.domain ?? 'example.com');
    return `${user}@${dom}`;
  });

  readonly isValid = computed(() => {
    const u = this.username().trim();
    if (u.length < 3) return false;
    if (!/^[a-z0-9._-]+$/i.test(u)) return false;
    return true;
  });

  ngOnInit(): void {
    if (this.domains().length > 0) {
      this.selectedDomain.set(this.domains()[0].domain);
    }
  }

  onDomainChange(): void {
    this.checkIfLocalInboxExists();
  }

  onUsernameChange(): void {
    const u = this.username().trim();
    this.isAlreadyTaken.set(false);
    this.suggestions.set([]);

    if (!u) {
      this.validationError.set(null);
      return;
    }
    if (u.length < 3) {
      this.validationError.set('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(u)) {
      this.validationError.set('Only letters, numbers, dots, hyphens and underscores allowed.');
      return;
    }

    this.validationError.set(null);
    this.checkIfLocalInboxExists();
  }

  private checkIfLocalInboxExists(): boolean {
    const cleanUser = this.username().trim().toLowerCase();
    const domain = this.selectedDomain() || this.domains()[0]?.domain;
    if (!cleanUser || cleanUser.length < 3) return false;

    const full = `${cleanUser}@${domain}`;
    const exists = this.emailService.inboxes().some(a => a.address.toLowerCase() === full.toLowerCase());
    if (exists) {
      this.isAlreadyTaken.set(true);
      this.validationError.set(`"${full}" is already in your active inboxes list.`);
      this.suggestions.set(this.generateSuggestions(cleanUser));
      return true;
    }
    return false;
  }

  private generateSuggestions(baseUser: string): string[] {
    const clean = baseUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'inbox';
    const randNum = Math.floor(100 + Math.random() * 900);
    const yr = new Date().getFullYear().toString().slice(-2);
    return [
      `${clean}-${randNum}`,
      `${clean}.${yr}`,
      `${clean}-box`
    ];
  }

  applySuggestion(sug: string): void {
    this.username.set(sug);
    this.validationError.set(null);
    this.isAlreadyTaken.set(false);
    this.suggestions.set([]);
  }

  onBackdropClick(e: MouseEvent): void {
    this.close.emit();
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.validationError.set(null);
    this.isAlreadyTaken.set(false);
    this.suggestions.set([]);

    const cleanUser = this.username().trim().toLowerCase();
    const domain = this.selectedDomain() || this.domains()[0]?.domain;

    if (this.checkIfLocalInboxExists()) {
      this.isSubmitting.set(false);
      return;
    }

    const res = await this.emailService.createCustomAccount(cleanUser, domain);
    this.isSubmitting.set(false);

    if (res.success) {
      this.create.emit({ username: cleanUser, domain });
      this.close.emit();
    } else {
      this.isAlreadyTaken.set(true);
      this.validationError.set(res.error || `The address "${cleanUser}@${domain}" is already registered.`);
      this.suggestions.set(this.generateSuggestions(cleanUser));
    }
  }
}
