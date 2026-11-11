// apps/tool-temp-email/src/components/email-viewer/email-viewer.component.ts
import { Component, input, output, signal, computed, effect, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent, EmptyDropStateComponent } from '@acklet/tool-shell';
import { MessageDetail, EmailScanResults, MessageAttachment } from '../../models/temp-email.models';
import { TempEmailService } from '../../services/temp-email.service';

@Component({
  selector: 'app-email-viewer',
  standalone: true,
  imports: [CommonModule, TsIconComponent, EmptyDropStateComponent],
  template: `
    <div class="email-viewer-container" role="region" aria-label="Email Message Content">
      
      @if (!message()) {
        <!-- Empty Selection State (Image 2 Style) -->
        <shared-empty-drop-state
          leftIcon="mail"
          centerIcon="file-text"
          rightIcon="inbox"
          heading="Add anything"
          subtext="Drop files, folders or text to get started."
        />
      } @else {
        <!-- Active Email View -->
        <div class="email-content-view animate-fade-in">
          
          <!-- Top Back Navigation Button (Always visible on all screens) -->
          <div class="viewer-nav-strip">
            <button
              type="button"
              class="back-to-inbox-btn"
              (click)="backToList.emit()"
              aria-label="Back to inbox list"
            >
              <ts-icon name="arrow-left" [size]="16" />
              <span>Back to Inbox</span>
            </button>
          </div>

          <!-- Email Top Header Card -->
          <div class="email-header-card">
            <!-- Title & Actions Row -->
            <div class="header-top-row">
              <h2 class="email-subject-title">{{ message()?.subject || '(No subject)' }}</h2>

              <!-- Action Toolbar (ALWAYS VISIBLE) -->
              <div class="viewer-action-bar">
                <button
                  type="button"
                  class="viewer-btn"
                  (click)="copyRawText()"
                  title="Copy plain text body"
                  aria-label="Copy plain text"
                >
                  <ts-icon [name]="copiedBody() ? 'check' : 'copy'" [size]="14" />
                  <span class="btn-text hide-on-mobile">{{ copiedBody() ? 'Copied' : 'Copy Text' }}</span>
                </button>

                <button
                  type="button"
                  class="viewer-btn"
                  (click)="downloadEmail()"
                  title="Download raw email message (.eml)"
                  aria-label="Download raw message"
                >
                  <ts-icon name="download" [size]="14" />
                  <span class="btn-text hide-on-mobile">Export</span>
                </button>

                <button
                  type="button"
                  class="viewer-btn delete-action-btn"
                  (click)="deleteMessage.emit(message()!.id)"
                  title="Delete this message"
                  aria-label="Delete message"
                >
                  <ts-icon name="trash" [size]="14" />
                  <span class="btn-text hide-on-mobile">Delete</span>
                </button>
              </div>
            </div>

            <!-- Subtle OTP Quick-Copy Strip (Non-intrusive header pill) -->
            @if (scanResults()?.otp; as otp) {
              <div class="subtle-otp-strip animate-fade-in" role="region" aria-label="Detected verification code">
                <div class="subtle-otp-left">
                  <ts-icon name="zap" [size]="15" class="subtle-otp-icon" />
                  <span class="subtle-otp-label">Verification Code:</span>
                  <span class="subtle-otp-code font-mono">{{ otp.code }}</span>
                  @if (otp.contextPhrase) {
                    <span class="subtle-otp-context">({{ otp.contextPhrase }})</span>
                  }
                </div>
                <button
                  type="button"
                  class="subtle-otp-copy-btn"
                  (click)="copyOtpCode(otp.code)"
                  [class.is-copied]="copiedOtp()"
                  [title]="copiedOtp() ? 'Code Copied' : 'Copy verification code'"
                  aria-label="Copy verification code"
                >
                  <ts-icon [name]="copiedOtp() ? 'check' : 'copy'" [size]="13" />
                  <span>{{ copiedOtp() ? 'Copied' : 'Copy Code' }}</span>
                </button>
              </div>
            }

            <!-- Sender & Recipient Meta Details -->
            <div class="sender-meta-row">
              <div class="sender-details-cluster">
                <div class="sender-avatar-lg">
                  {{ getInitials(message()!.from.name || message()!.from.address) }}
                </div>
                <div class="sender-info-text">
                  <span class="sender-name-text">
                    {{ message()!.from.name || message()!.from.address }}
                  </span>
                  <span class="sender-addr-text font-mono">
                    &lt;{{ message()!.from.address }}&gt;
                  </span>
                  <span class="to-recipient-text">
                    to {{ getToAddresses() }}
                  </span>
                </div>
              </div>

              <div class="date-timestamp-cluster">
                <span class="exact-timestamp">
                  {{ formatFullDate(message()!.createdAt) }}
                </span>
                <span class="relative-timestamp">
                  ({{ formatRelativeTime(message()!.createdAt) }})
                </span>
              </div>
            </div>
          </div>

          <!-- Attachments Bar (if any) -->
          @if (message()!.attachments && message()!.attachments.length > 0) {
            <div class="attachments-container">
              <span class="attachments-label">
                <ts-icon name="folder" [size]="14" />
                <span>{{ message()!.attachments.length }} Attachment(s):</span>
              </span>
              <div class="attachments-pills-row">
                @for (att of message()!.attachments; track att.id) {
                  <button
                    type="button"
                    class="attachment-pill"
                    (click)="downloadAttachment(att)"
                    [title]="'Download ' + att.filename"
                  >
                    <ts-icon name="download" [size]="12" />
                    <span class="att-name text-truncate">{{ att.filename }}</span>
                    <span class="att-size">{{ formatBytes(att.size) }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Authentic HTML Email Body Container -->
          <div class="email-body-box">
            <iframe
              #htmlFrame
              class="email-html-frame"
              [srcdoc]="sanitizedHtmlDoc()"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              referrerpolicy="no-referrer"
              title="Email message body"
            ></iframe>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      flex: 1 1 0% !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    .email-viewer-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-inner, 16px);
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .email-viewer-container,
    [data-theme="light"] .email-viewer-container {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    /* Empty Viewer State */
    .viewer-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(32px, 6vh, 60px) 24px;
      text-align: center;
      margin: auto;
      width: 100%;
      height: 100%;
      flex: 1 1 0%;
      min-height: 300px;
      box-sizing: border-box;
    }

    @media (max-width: 860px) {
      .viewer-empty-state {
        padding: 32px 16px;
        min-height: 220px;
      }
    }

    @media (max-width: 480px) {
      .viewer-empty-state {
        padding: 24px 14px;
        min-height: 180px;
      }
      .empty-envelope-icon {
        width: 56px;
        height: 56px;
        margin-bottom: 14px;
        border-radius: 16px;
      }
      .empty-header {
        font-size: 16px;
      }
      .empty-subtext {
        font-size: 12px;
      }
    }

    @media (max-height: 700px) {
      .viewer-empty-state {
        padding: 16px 14px;
        min-height: 160px;
      }
      .empty-envelope-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
      .empty-header {
        font-size: 16px;
        margin-bottom: 4px;
      }
    }

    .empty-envelope-icon {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 10%, transparent));
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    :host-context([data-theme="light"]) .empty-envelope-icon,
    [data-theme="light"] .empty-envelope-icon {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      color: #2563EB;
    }

    .empty-header {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0 0 8px;
    }

    :host-context([data-theme="light"]) .empty-header,
    [data-theme="light"] .empty-header {
      color: #0F172A;
      font-weight: 700;
    }

    .empty-subtext {
      font-size: 13px;
      color: var(--text-muted, #94A3B8);
      line-height: 1.5;
      max-width: 320px;
      margin: 0;
    }

    :host-context([data-theme="light"]) .empty-subtext,
    [data-theme="light"] .empty-subtext {
      color: #334155;
      font-weight: 500;
    }

    /* Active View */
    .email-content-view {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 20px;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* Back Navigation Strip (Desktop & Mobile) */
    .viewer-nav-strip {
      display: flex;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .viewer-nav-strip,
    [data-theme="light"] .viewer-nav-strip {
      border-bottom-color: #F1F5F9;
    }

    .back-to-inbox-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 12%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 25%, transparent));
      color: var(--accent-strong, #60A5FA);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .back-to-inbox-btn:hover {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 22%, transparent));
      border-color: var(--accent, #3B82F6);
      transform: translateX(-2px);
    }

    :host-context([data-theme="light"]) .back-to-inbox-btn,
    [data-theme="light"] .back-to-inbox-btn {
      background: var(--tool-accent-soft, color-mix(in srgb, var(--tool-accent, #2563EB) 10%, transparent));
      border-color: var(--tool-accent-border, color-mix(in srgb, var(--tool-accent, #2563EB) 25%, transparent));
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .back-to-inbox-btn:hover,
    [data-theme="light"] .back-to-inbox-btn:hover {
      background: #EFF6FF;
      border-color: #2563EB;
    }

    /* Header Card */
    .email-header-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .email-header-card,
    [data-theme="light"] .email-header-card {
      border-bottom-color: #F1F5F9;
    }

    .header-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .email-subject-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0;
      line-height: 1.3;
      word-break: break-word;
      flex: 1;
    }

    :host-context([data-theme="light"]) .email-subject-title,
    [data-theme="light"] .email-subject-title {
      color: #0F172A;
      font-weight: 800;
    }

    /* Viewer Action Bar */
    .viewer-action-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .viewer-btn {
      height: 30px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      background: var(--ts-surface-inset, #1A1B1E);
      color: var(--text-muted, #94A3B8);
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .viewer-btn,
    [data-theme="light"] .viewer-btn {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #1E293B;
      font-weight: 600;
    }

    .viewer-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .viewer-btn:hover,
    [data-theme="light"] .viewer-btn:hover {
      background: #EDF2F7;
      color: #000000;
    }

    .delete-action-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #EF4444;
    }

    :host-context([data-theme="light"]) .delete-action-btn:hover,
    [data-theme="light"] .delete-action-btn:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    /* Subtle Non-Intrusive OTP Quick-Copy Strip */
    .subtle-otp-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 12%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 30%, transparent));
    }

    :host-context([data-theme="light"]) .subtle-otp-strip,
    [data-theme="light"] .subtle-otp-strip {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 25%, transparent);
    }

    .subtle-otp-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .subtle-otp-icon {
      color: var(--accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .subtle-otp-icon,
    [data-theme="light"] .subtle-otp-icon {
      color: #2563EB;
    }

    .subtle-otp-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .subtle-otp-label,
    [data-theme="light"] .subtle-otp-label {
      color: #475569;
    }

    .subtle-otp-code {
      font-size: 15px;
      font-weight: 800;
      color: var(--text, #FFFFFF);
      letter-spacing: 2px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .subtle-otp-code,
    [data-theme="light"] .subtle-otp-code {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .subtle-otp-context {
      font-size: 11px;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .subtle-otp-context,
    [data-theme="light"] .subtle-otp-context {
      color: #64748B;
    }

    .subtle-otp-copy-btn {
      height: 26px;
      padding: 0 10px;
      border-radius: 6px;
      background: #3B82F6 !important;
      color: #FFFFFF !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      opacity: 1 !important;
      box-shadow: 0 1px 3px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 25%, transparent);
    }

    .subtle-otp-copy-btn span,
    .subtle-otp-copy-btn ts-icon {
      color: #FFFFFF !important;
      opacity: 1 !important;
      display: inline-flex;
      align-items: center;
    }

    .subtle-otp-copy-btn:hover {
      background: #2563EB !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      color: #FFFFFF !important;
      filter: none !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 40%, transparent);
    }

    :host-context([data-theme="light"]) .subtle-otp-copy-btn,
    [data-theme="light"] .subtle-otp-copy-btn {
      background: #2563EB !important;
      color: #FFFFFF !important;
      border: 1px solid #1D4ED8 !important;
    }

    :host-context([data-theme="light"]) .subtle-otp-copy-btn:hover,
    [data-theme="light"] .subtle-otp-copy-btn:hover {
      background: #1E40AF !important;
      border-color: #1E3A8A !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .subtle-otp-copy-btn span,
    :host-context([data-theme="light"]) .subtle-otp-copy-btn ts-icon,
    [data-theme="light"] .subtle-otp-copy-btn span,
    [data-theme="light"] .subtle-otp-copy-btn ts-icon {
      color: #FFFFFF !important;
      opacity: 1 !important;
    }

    .subtle-otp-copy-btn.is-copied {
      background: #059669 !important;
      border-color: #047857 !important;
      color: #FFFFFF !important;
    }

    /* Sender Meta */
    .sender-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .sender-details-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sender-avatar-lg {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 15%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 30%, transparent));
      color: var(--accent-strong, #60A5FA);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .sender-avatar-lg,
    [data-theme="light"] .sender-avatar-lg {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 10%, transparent);
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent);
      color: #2563EB;
    }

    .sender-info-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sender-name-text {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .sender-name-text,
    [data-theme="light"] .sender-name-text {
      color: #0F172A;
      font-weight: 700;
    }

    .sender-addr-text {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .sender-addr-text,
    [data-theme="light"] .sender-addr-text {
      color: #334155;
    }

    .to-recipient-text {
      font-size: 11px;
      color: var(--text-muted, #64748B);
    }

    .date-timestamp-cluster {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .exact-timestamp {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #E2E8F0);
    }

    :host-context([data-theme="light"]) .exact-timestamp,
    [data-theme="light"] .exact-timestamp {
      color: #0F172A;
      font-weight: 600;
    }

    .relative-timestamp {
      font-size: 11px;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .relative-timestamp,
    [data-theme="light"] .relative-timestamp {
      color: #64748B;
    }

    /* Attachments Bar */
    .attachments-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .attachments-container,
    [data-theme="light"] .attachments-container {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .attachments-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .attachments-label,
    [data-theme="light"] .attachments-label {
      color: #334155;
    }

    .attachments-pills-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .attachment-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text, #FFFFFF);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .attachment-pill,
    [data-theme="light"] .attachment-pill {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .attachment-pill:hover {
      border-color: var(--accent, #3B82F6);
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .attachment-pill:hover,
    [data-theme="light"] .attachment-pill:hover {
      background: #EDF2F7;
    }

    .att-size {
      font-size: 10px;
      color: var(--text-muted, #94A3B8);
    }

    /* Authentic Full Email Body Box */
    .email-body-box {
      flex: 1 1 0%;
      min-height: 0;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: #FFFFFF;
      color: #0F172A;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .email-body-box,
    [data-theme="light"] .email-body-box {
      border-color: #E2E8F0;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    }

    .email-html-frame {
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      border: none;
      background: #FFFFFF;
      display: block;
    }

    .text-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hide-on-mobile {
      display: inline;
    }

    @media (max-width: 640px) {
      .email-content-view {
        padding: 12px;
        gap: 10px;
      }

      .hide-on-mobile {
        display: none;
      }

      .subtle-otp-strip {
        flex-direction: column;
        align-items: stretch;
      }

      .subtle-otp-copy-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class EmailViewerComponent {
  private readonly emailService = inject(TempEmailService);

  readonly message = input<MessageDetail | null>(null);
  readonly scanResults = input<EmailScanResults | null>(null);
  readonly blockImages = input<boolean>(false);

  readonly deleteMessage = output<string>();
  readonly backToList = output<void>();

  readonly copiedOtp = signal<boolean>(false);
  readonly copiedBody = signal<boolean>(false);

  /**
   * Resolved inline CID images map: { [cidKey: string]: dataUrl }
   */
  readonly cidImageMap = signal<Record<string, string>>({});

  constructor() {
    // Watch message changes to automatically resolve inline CID images from MIME attachments
    effect(() => {
      const msg = this.message();
      if (!msg) {
        this.cidImageMap.set({});
        return;
      }
      this.resolveInlineCidImages(msg);
    });
  }

  /**
   * Resolves inline images referenced via cid: URLs by fetching their attachment blobs
   * and converting them into high-speed inline data URLs.
   */
  private resolveInlineCidImages(msg: MessageDetail): void {
    if (!msg.html || msg.html.length === 0 || !msg.attachments || msg.attachments.length === 0) {
      return;
    }

    const rawHtml = msg.html.join('\n');
    const matches = Array.from(rawHtml.matchAll(/cid:([^"'>\s\),]+)/gi)).map(m => m[1]);
    if (matches.length === 0) return;

    const currentMap = { ...this.cidImageMap() };

    for (const cidKey of matches) {
      const cleanKey = cidKey.replace(/^<|>$/g, '');
      if (currentMap[cidKey] || currentMap[cleanKey]) continue;

      const match = msg.attachments.find(att => {
        const attId = (att.id || '').toLowerCase();
        const filename = (att.filename || '').toLowerCase();
        const cleanLower = cleanKey.toLowerCase();
        return (
          attId === cleanLower ||
          filename === cleanLower ||
          cleanLower.includes(filename) ||
          filename.includes(cleanLower) ||
          cleanLower.startsWith(filename.split('.')[0])
        );
      });

      if (match && match.downloadUrl) {
        this.emailService.getAttachmentBlob(match.downloadUrl).then(blob => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            this.cidImageMap.update(map => ({
              ...map,
              [cidKey]: dataUrl,
              [cleanKey]: dataUrl
            }));
          };
          reader.readAsDataURL(blob);
        }).catch(err => {
          console.warn(`Could not resolve cid image "${cidKey}":`, err);
        });
      }
    }
  }

  /**
   * Sanitizes email HTML: removes executable scripts, iframes, forms,
   * resolves CID inline images, neutralizes invisible 1x1 tracking beacons,
   * and wraps in an authentic, responsive email canvas.
   */
  readonly sanitizedHtmlDoc = computed(() => {
    const msg = this.message();
    if (!msg) return '';

    const hasHtml = !!(msg.html && msg.html.length > 0 && msg.html.some(h => h.trim().length > 0));

    let bodyContent: string;
    if (hasHtml) {
      bodyContent = this.sanitizeEmailHtml(msg.html.join('\n'));
    } else {
      bodyContent = this.formatPlainTextFallback(msg.text || msg.intro || '');
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <base target="_blank">
          <style>
            html, body {
              margin: 0;
              padding: 16px;
              word-wrap: break-word;
              overflow-x: auto;
              -webkit-text-size-adjust: 100%;
              text-size-adjust: 100%;
              background-color: #FFFFFF;
              color: #0F172A;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            /* Responsive image scaling */
            img {
              max-width: 100%;
              height: auto;
            }
            /* Hide broken images gracefully */
            img:not([src]), img[src=""] {
              display: none !important;
            }
            /* Prevent horizontal blowout in legacy tables */
            table {
              max-width: 100%;
            }
            a {
              cursor: pointer;
            }
          </style>
          <script>
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:')) {
                e.preventDefault();
                window.parent.postMessage({
                  type: 'ACKLET_LINK_CLICK',
                  url: a.href,
                  text: (a.innerText || a.textContent || '').trim()
                }, '*');
              }
            });
          </script>
        </head>
        <body>
          ${bodyContent}
        </body>
      </html>
    `;
  });

  private sanitizeEmailHtml(html: string): string {
    if (!html) return '';

    let s = html;

    // 1. Remove dangerous executable scripts
    s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Remove nested iframes, objects, embeds, applets, forms
    s = s.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    s = s.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    s = s.replace(/<embed\b[^>]*>/gi, '');
    s = s.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');
    s = s.replace(/<\/?form\b[^>]*>/gi, '');

    // 3. Remove meta refresh redirects
    s = s.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

    // 4. Remove base tags (we control base target="_blank")
    s = s.replace(/<base\b[^>]*>/gi, '');

    // 5. Remove inline JavaScript event handlers
    s = s.replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

    // 6. Neutralize dangerous URL schemes
    s = s.replace(/href\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html):[^"']*\1/gi, 'href="#"');
    s = s.replace(/src\s*=\s*(["'])\s*(javascript|vbscript):[^"']*\1/gi, 'src=""');

    // 7. Replace cid: inline images with resolved base64 data URLs
    const cidMap = this.cidImageMap();
    s = s.replace(/src=(["'])cid:([^"'>\s\)]+)\1/gi, (match, quote, cidKey) => {
      const cleanKey = cidKey.replace(/^<|>$/g, '');
      const resolved = cidMap[cidKey] || cidMap[cleanKey];
      if (resolved) {
        return `src=${quote}${resolved}${quote}`;
      }
      for (const [k, v] of Object.entries(cidMap)) {
        if (k.toLowerCase() === cleanKey.toLowerCase() || cleanKey.toLowerCase().includes(k.toLowerCase())) {
          return `src=${quote}${v}${quote}`;
        }
      }
      return match;
    });

    s = s.replace(/url\(\s*["']?cid:([^"'\)]+)["']?\s*\)/gi, (match, cidKey) => {
      const cleanKey = cidKey.replace(/^<|>$/g, '');
      const resolved = cidMap[cidKey] || cidMap[cleanKey];
      return resolved ? `url("${resolved}")` : match;
    });

    // 8. Filter invisible 1x1 / 0x0 tracking beacons while allowing legitimate visible images
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    s = s.replace(/<img\s+([^>]*?)>/gi, (imgTag, attributes) => {
      const isTinyWidth = /\bwidth\s*=\s*["']?(0|1)(px)?["']?/i.test(attributes);
      const isTinyHeight = /\bheight\s*=\s*["']?(0|1)(px)?["']?/i.test(attributes);
      const isHiddenStyle = /style\s*=\s*["'][^"']*\b(display\s*:\s*none|visibility\s*:\s*hidden|width\s*:\s*[01]px|height\s*:\s*[01]px)/i.test(attributes);

      if ((isTinyWidth && isTinyHeight) || isHiddenStyle) {
        return `<img ${attributes.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src="${transparentPixel}"`)} style="display:none !important;" alt="" />`;
      }
      return imgTag;
    });

    return s;
  }

  private formatPlainTextFallback(text: string): string {
    if (!text || text.trim().length === 0) {
      return '<p style="color:#64748B;font-style:italic;">No text content in this email.</p>';
    }

    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Linkify URLs
    const linkified = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563EB;text-decoration:underline;">$1</a>'
    );

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0F172A; white-space: pre-wrap; word-break: break-word;">
        ${linkified}
      </div>
    `;
  }

  getInitials(nameOrEmail: string): string {
    if (!nameOrEmail) return '?';
    const clean = nameOrEmail.replace(/['"<>[\]]/g, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }

  getToAddresses(): string {
    const to = this.message()?.to;
    if (!to || to.length === 0) return 'me';
    return to.map(t => t.name || t.address).join(', ');
  }

  formatFullDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoDate;
    }
  }

  formatRelativeTime(isoDate: string): string {
    if (!isoDate) return '';
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async copyOtpCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copiedOtp.set(true);
      setTimeout(() => this.copiedOtp.set(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }

  async copyRawText(): Promise<void> {
    const text = this.message()?.text || this.message()?.intro || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copiedBody.set(true);
      setTimeout(() => this.copiedBody.set(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }

  async downloadAttachment(att: MessageAttachment): Promise<void> {
    try {
      const blob = await this.emailService.getAttachmentBlob(att.downloadUrl);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to download attachment:', e);
    }
  }

  async downloadEmail(): Promise<void> {
    const msg = this.message();
    if (!msg) return;

    try {
      // If authentic RFC-822 message download URL is available, download the real .eml file
      if (msg.downloadUrl) {
        const blob = await this.emailService.getAttachmentBlob(msg.downloadUrl);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `email-${msg.id}.eml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }
    } catch {
      // Fallback to text export
    }

    const content = `Subject: ${msg.subject}\nFrom: ${msg.from.name} <${msg.from.address}>\nDate: ${msg.createdAt}\n\n${msg.text || msg.intro}`;
    const blob = new Blob([content], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-${msg.id}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  @HostListener('window:message', ['$event'])
  onWindowMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'ACKLET_LINK_CLICK' && event.data.url) {
      this.emailService.inspectLink(event.data.url, event.data.text);
    }
  }
}
