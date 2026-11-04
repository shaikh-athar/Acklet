// apps/tool-barcode-generator/src/components/verification-page/verification-page.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { TempCodeService } from '../../services/temp-code.service';
import { TempCodeVerifyResult } from '../../models/temp-code.models';

@Component({
  selector: 'app-temp-code-verification-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="verify-page-container">
      <div class="verify-card animate-fade-in">
        <!-- Logo / Brand Header -->
        <div class="brand-row">
          <div class="brand-pill">
            <ts-icon name="shield-check" [size]="16" />
            <span>Acklet Verified Barcode</span>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-wrap">
            <div class="spinner-circle"></div>
            <span>Checking code status...</span>
          </div>
        } @else {
          <!-- STATE 1: VALID -->
          @if (result()?.status === 'VALID') {
            <div class="status-block valid-state">
              <div class="state-icon-circle bg-emerald">
                <ts-icon name="check-circle" [size]="32" class="text-emerald" />
              </div>

              <h1 class="state-headline">Valid</h1>

              <div class="countdown-chip">
                <ts-icon name="clock" [size]="14" />
                <span>Expires in {{ formattedCountdown() }}</span>
              </div>

              @if (result()?.name; as name) {
                <div class="code-title-text">{{ name }}</div>
              }

              <!-- Content Display: MESSAGE -->
              @if (result()?.contentType === 'MESSAGE' && result()?.content) {
                <div class="message-content-box">
                  <div class="message-box-header">
                    <ts-icon name="message-square" [size]="14" />
                    <span>Message from creator</span>
                  </div>
                  <p class="message-text">{{ result()?.content }}</p>
                </div>
              }

              <!-- Content Display: LINK (Confirmation Page Only, NEVER auto redirect) -->
              @if (result()?.contentType === 'LINK' && result()?.content) {
                <div class="link-confirmation-box">
                  <div class="link-box-header">
                    <ts-icon name="external-link" [size]="14" />
                    <span>External destination</span>
                  </div>
                  <p class="link-dest-text">
                    This code points to <strong>{{ getDomainFromUrl(result()?.content) }}</strong>
                  </p>
                  <p class="link-full-url" [title]="result()?.content">{{ result()?.content }}</p>
                  <a
                    [href]="result()?.content"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="continue-btn"
                  >
                    <span>Continue to link</span>
                    <ts-icon name="arrow-right" [size]="16" />
                  </a>
                </div>
              }

              <!-- Content Display: REFERENCE ONLY -->
              @if (result()?.contentType === 'REFERENCE_ONLY') {
                <div class="reference-box">
                  <div class="ref-badge">
                    <ts-icon name="check" [size]="14" />
                    <span>Verified Authenticity</span>
                  </div>
                  @if (result()?.reference) {
                    <p class="reference-val">Ref: <strong>{{ result()?.reference }}</strong></p>
                  }
                </div>
              }
            </div>
          }

          <!-- STATE 2: EXPIRED -->
          @if (result()?.status === 'EXPIRED') {
            <div class="status-block expired-state">
              <div class="state-icon-circle bg-gray">
                <ts-icon name="clock" [size]="32" class="text-gray" />
              </div>
              <h1 class="state-headline">This code has expired.</h1>
              <p class="state-subline">
                @if (result()?.expiresAt) {
                  Expired on {{ formatExpiryDate(result()?.expiresAt) }}
                } @else {
                  The validity period for this code has ended.
                }
              </p>
            </div>
          }

          <!-- STATE 3: DEACTIVATED -->
          @if (result()?.status === 'DEACTIVATED') {
            <div class="status-block deactivated-state">
              <div class="state-icon-circle bg-amber">
                <ts-icon name="slash" [size]="32" class="text-amber" />
              </div>
              <h1 class="state-headline">This code was deactivated by its owner.</h1>
              <p class="state-subline">The creator has disabled access to this temporary barcode.</p>
            </div>
          }

          <!-- STATE 4: NOT FOUND -->
          @if (result()?.status === 'NOT_FOUND') {
            <div class="status-block notfound-state">
              <div class="state-icon-circle bg-red">
                <ts-icon name="help-circle" [size]="32" class="text-red" />
              </div>
              <h1 class="state-headline">This code was not found.</h1>
              <p class="state-subline">The token does not exist or was deleted.</p>
            </div>
          }

          <!-- STATE 5: RATE LIMITED -->
          @if (result()?.status === 'RATE_LIMITED') {
            <div class="status-block ratelimited-state">
              <div class="state-icon-circle bg-amber">
                <ts-icon name="alert-triangle" [size]="32" class="text-amber" />
              </div>
              <h1 class="state-headline">Too many checks. Try again in a minute.</h1>
              <p class="state-subline">Rate limit exceeded for verification requests.</p>
            </div>
          }

          <!-- STATE 6: ERROR -->
          @if (result()?.status === 'ERROR') {
            <div class="status-block error-state">
              <div class="state-icon-circle bg-red">
                <ts-icon name="alert-circle" [size]="32" class="text-red" />
              </div>
              <h1 class="state-headline">Something went wrong. Try again later.</h1>
              <p class="state-subline">We could not verify the status of this code right now.</p>
            </div>
          }
        }

        <!-- Footer: Report link & Generator link -->
        <div class="verify-footer-row">
          <button
            type="button"
            class="report-code-btn"
            (click)="openReportModal.set(true)"
          >
            <ts-icon name="flag" [size]="13" />
            <span>Report this code</span>
          </button>

          <button
            type="button"
            class="create-own-btn"
            (click)="navigateToGenerator.emit()"
          >
            <span>Create your own barcode</span>
            <ts-icon name="arrow-right" [size]="13" />
          </button>
        </div>
      </div>

      <!-- Report Modal Dialog -->
      @if (openReportModal()) {
        <div class="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Report code abuse">
          <div class="dialog-card">
            <h3 class="dialog-title">Report this code</h3>
            <p class="dialog-desc">Select a reason for reporting this temporary barcode:</p>

            <select class="ts-select-field" [(ngModel)]="reportReason">
              <option value="Malware or Phishing">Malware or Phishing</option>
              <option value="Spam or Unwanted Ads">Spam or Unwanted</option>
              <option value="Illegal or Dangerous Content">Illegal content</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              class="ts-textarea-field"
              rows="3"
              placeholder="Optional comment (max 500 characters)"
              [(ngModel)]="reportComment"
              maxlength="500"
            ></textarea>

            @if (reportMessage()) {
              <p class="report-status-msg">{{ reportMessage() }}</p>
            }

            <div class="dialog-actions-row">
              <button
                type="button"
                class="dialog-cancel-btn"
                [disabled]="isSubmittingReport()"
                (click)="openReportModal.set(false)"
              >
                Cancel
              </button>
              <button
                type="button"
                class="dialog-confirm-btn"
                [disabled]="isSubmittingReport()"
                (click)="submitReport()"
              >
                {{ isSubmittingReport() ? 'Submitting...' : 'Submit report' }}
              </button>
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .verify-page-container {
      min-height: calc(100dvh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      box-sizing: border-box;
    }

    .verify-card {
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 16px;
      padding: 32px 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 24px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .verify-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    }

    .brand-row {
      display: flex;
      justify-content: center;
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .brand-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
    }

    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 0;
      color: var(--text-muted, #94a3b8);
      font-size: 14px;
    }

    :host-context([data-theme="light"]) .loading-wrap {
      color: #64748B;
    }

    .spinner-circle {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--tool-accent, #2563EB);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    :host-context([data-theme="light"]) .spinner-circle {
      border-color: #E2E8F0;
      border-top-color: var(--tool-accent, #2563EB);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .status-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .state-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .bg-emerald { background: rgba(16, 185, 129, 0.15); }
    .text-emerald { color: #34D399; }

    :host-context([data-theme="light"]) .bg-emerald { background: #ECFDF5; }
    :host-context([data-theme="light"]) .text-emerald { color: #10B981; }

    .bg-gray { background: rgba(255, 255, 255, 0.08); }
    .text-gray { color: #94A3B8; }

    :host-context([data-theme="light"]) .bg-gray { background: #F3F4F6; }
    :host-context([data-theme="light"]) .text-gray { color: #6B7280; }

    .bg-amber { background: rgba(245, 158, 11, 0.15); }
    .text-amber { color: #FBBF24; }

    :host-context([data-theme="light"]) .bg-amber { background: #FFFBEB; }
    :host-context([data-theme="light"]) .text-amber { color: #F59E0B; }

    .bg-red { background: rgba(239, 68, 68, 0.15); }
    .text-red { color: #F87171; }

    :host-context([data-theme="light"]) .bg-red { background: #FEF2F2; }
    :host-context([data-theme="light"]) .text-red { color: #EF4444; }

    .state-headline {
      font-size: 22px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .state-headline {
      color: #0F172A;
    }

    .state-subline {
      font-size: 14px;
      color: var(--text-muted, #94a3b8);
      margin: 0;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .state-subline {
      color: #64748B;
    }

    .countdown-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .countdown-chip {
      background: #ECFDF5;
      color: #065F46;
    }

    .code-title-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .code-title-text {
      color: #64748B;
    }

    .message-content-box, .link-confirmation-box, .reference-box {
      width: 100%;
      background: var(--bg-base, #121216);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme="light"]) .message-content-box,
    :host-context([data-theme="light"]) .link-confirmation-box,
    :host-context([data-theme="light"]) .reference-box {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .message-box-header, .link-box-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    :host-context([data-theme="light"]) .message-box-header,
    :host-context([data-theme="light"]) .link-box-header {
      color: #64748B;
    }

    .message-text {
      font-size: 15px;
      color: var(--text, #fcfcfc);
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    :host-context([data-theme="light"]) .message-text {
      color: #1E293B;
    }

    .link-dest-text {
      font-size: 14px;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .link-dest-text {
      color: #1E293B;
    }

    .link-full-url {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .link-full-url {
      color: #64748B;
    }

    .continue-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--tool-accent, #2563EB);
      color: #ffffff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      margin-top: 6px;
      transition: background 0.15s ease;
    }

    .continue-btn:hover {
      background: #1d4ed8;
    }

    .reference-box {
      align-items: center;
      text-align: center;
    }

    .ref-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #34D399;
    }

    :host-context([data-theme="light"]) .ref-badge {
      color: #059669;
    }

    .reference-val {
      font-size: 14px;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .reference-val {
      color: #0F172A;
    }

    .verify-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 13px;
    }

    :host-context([data-theme="light"]) .verify-footer-row {
      border-top-color: rgba(0, 0, 0, 0.08);
    }

    .report-code-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      transition: color 150ms ease;
    }

    :host-context([data-theme="light"]) .report-code-btn {
      color: #64748B;
    }

    .report-code-btn:hover {
      color: #f87171;
      text-decoration: underline;
    }

    :host-context([data-theme="light"]) .report-code-btn:hover {
      color: #dc2626;
    }

    .create-own-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: var(--tool-accent, #2563EB);
      cursor: pointer;
      font-weight: 600;
    }

    .create-own-btn:hover {
      text-decoration: underline;
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 16px;
    }

    .dialog-card {
      background: #18191E;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 14px;
      text-align: left;
    }

    :host-context([data-theme="light"]) .dialog-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .dialog-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .dialog-title {
      color: #0F172A;
    }

    .dialog-desc {
      font-size: 13px;
      color: var(--text-muted, #94a3b8);
      margin: 0;
    }

    :host-context([data-theme="light"]) .dialog-desc {
      color: #64748B;
    }

    .ts-select-field, .ts-textarea-field {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      background: var(--bg-base, #121216);
      font-size: 14px;
      color: var(--text, #fcfcfc);
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .ts-select-field,
    :host-context([data-theme="light"]) .ts-textarea-field {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .report-status-msg {
      font-size: 12px;
      color: var(--tool-accent, #2563EB);
      margin: 0;
    }

    .dialog-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .dialog-cancel-btn {
      padding: 8px 14px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      font-size: 13px;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .dialog-cancel-btn {
      border-color: #E2E8F0;
      color: #374151;
    }

    .dialog-confirm-btn {
      padding: 8px 16px;
      background: var(--tool-accent, #2563EB);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class TempCodeVerificationPageComponent implements OnInit, OnDestroy {
  private tempCodeService = inject(TempCodeService);

  readonly token = input.required<string>();
  readonly navigateToGenerator = output<void>();

  readonly isLoading = signal<boolean>(true);
  readonly result = signal<TempCodeVerifyResult | null>(null);
  readonly secondsLeft = signal<number>(0);

  readonly openReportModal = signal<boolean>(false);
  readonly isSubmittingReport = signal<boolean>(false);
  readonly reportMessage = signal<string | null>(null);

  reportReason = 'Malware or Phishing';
  reportComment = '';

  private countdownInterval: any = null;

  ngOnInit(): void {
    this.checkCode();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  checkCode(): void {
    this.isLoading.set(true);
    this.tempCodeService.verifyCode(this.token()).subscribe({
      next: res => {
        this.result.set(res);
        this.isLoading.set(false);
        if (res.status === 'VALID' && res.remainingSeconds && res.remainingSeconds > 0) {
          this.secondsLeft.set(res.remainingSeconds);
          this.startCountdown();
        } else {
          this.secondsLeft.set(0);
        }
      },
      error: () => {
        this.result.set({ status: 'ERROR' });
        this.isLoading.set(false);
      }
    });
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownInterval = setInterval(() => {
      const cur = this.secondsLeft();
      if (cur <= 1) {
        this.stopCountdown();
        this.secondsLeft.set(0);
        // Live switch to Expired without reload: re-verify with server
        this.checkCode();
      } else {
        this.secondsLeft.set(cur - 1);
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  readonly formattedCountdown = computed<string>(() => {
    const sec = this.secondsLeft();
    if (sec <= 0) return '0s';
    const hrs = Math.floor(sec / 3600);
    const min = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (hrs > 0) {
      return `${hrs} h ${min} min`;
    }
    if (min > 0) {
      return `${min} min ${s} s`;
    }
    return `${s} s`;
  });

  getDomainFromUrl(url?: string): string {
    if (!url) return '';
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  formatExpiryDate(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  submitReport(): void {
    this.isSubmittingReport.set(true);
    this.reportMessage.set(null);
    this.tempCodeService.reportCode(this.token(), this.reportReason, this.reportComment).subscribe({
      next: () => {
        this.isSubmittingReport.set(false);
        this.reportMessage.set('Report received. Thank you for helping keep Acklet safe.');
        setTimeout(() => this.openReportModal.set(false), 2000);
      },
      error: err => {
        this.isSubmittingReport.set(false);
        this.reportMessage.set(err.message || 'Could not submit report right now.');
      }
    });
  }
}

