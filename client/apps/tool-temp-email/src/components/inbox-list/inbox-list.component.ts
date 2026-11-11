// apps/tool-temp-email/src/components/inbox-list/inbox-list.component.ts
import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent, EmptyDropStateComponent } from '@acklet/tool-shell';
import { MessageSummary, InboxFilter, AutoRefreshInterval, ProviderStatus } from '../../models/temp-email.models';

@Component({
  selector: 'app-inbox-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, EmptyDropStateComponent],
  template: `
    <div class="inbox-list-container" role="region" aria-label="Incoming Email List">
      
      <!-- List Controls Toolbar -->
      <div class="list-controls-bar">
        <!-- Search Field -->
        <div class="search-wrap">
          <ts-icon name="search" [size]="14" class="search-icon" />
          <input
            type="text"
            class="search-input"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchChange.emit($event)"
            placeholder="Search sender, subject, or code..."
            aria-label="Search incoming messages"
          />
          @if (searchQuery()) {
            <button
              type="button"
              class="clear-search-btn"
              (click)="searchChange.emit('')"
              aria-label="Clear search"
            >
              <ts-icon name="x" [size]="12" />
            </button>
          }
        </div>

        <!-- Auto-Refresh Selector -->
        <div class="interval-select-wrap" title="Auto-refresh interval">
          <ts-icon name="clock" [size]="13" class="interval-icon" />
          <select
            class="interval-select"
            [ngModel]="refreshInterval()"
            (ngModelChange)="intervalChange.emit($event)"
            aria-label="Set auto-refresh frequency"
          >
            <option [value]="5">5s auto-refresh</option>
            <option [value]="10">10s auto-refresh</option>
            <option [value]="15">15s auto-refresh</option>
            <option [value]="30">30s auto-refresh</option>
            <option [value]="0">Manual refresh</option>
          </select>
        </div>
      </div>

      <!-- Filter Pills Row with Dynamic Counts -->
      <div class="filter-pills-row" role="tablist" aria-label="Filter emails">
        <button
          type="button"
          class="filter-pill"
          [class.is-active]="activeFilter() === 'all'"
          (click)="filterChange.emit('all')"
        >
          <span>All</span>
          <span class="count-tag">{{ allCount() || totalCount() }}</span>
        </button>

        <button
          type="button"
          class="filter-pill"
          [class.is-active]="activeFilter() === 'unread'"
          (click)="filterChange.emit('unread')"
        >
          <span>Unread</span>
          <span class="count-tag" [class.unread-tag]="unreadCount() > 0">{{ unreadCount() }}</span>
        </button>

        <button
          type="button"
          class="filter-pill"
          [class.is-active]="activeFilter() === 'otp'"
          (click)="filterChange.emit('otp')"
        >
          <ts-icon name="zap" [size]="12" />
          <span>With OTP</span>
          <span class="count-tag">{{ otpCount() }}</span>
        </button>

        <button
          type="button"
          class="filter-pill"
          [class.is-active]="activeFilter() === 'links'"
          (click)="filterChange.emit('links')"
        >
          <ts-icon name="link" [size]="12" />
          <span>Has Link</span>
          <span class="count-tag">{{ linkCount() }}</span>
        </button>

        <button
          type="button"
          class="filter-pill"
          [class.is-active]="activeFilter() === 'attachments'"
          (click)="filterChange.emit('attachments')"
        >
          <ts-icon name="folder" [size]="12" />
          <span>Attachments</span>
          <span class="count-tag">{{ attachmentCount() }}</span>
        </button>
      </div>

      <!-- Non-blocking Provider Status Banner -->
      @if (providerStatus(); as status) {
        @if (status.type !== 'healthy') {
          <div
            class="provider-status-banner"
            [class.is-slow]="status.type === 'slow'"
            [class.is-retrying]="status.type === 'rate-limited'"
            [class.is-error]="status.type === 'unavailable'"
            role="status"
          >
            <ts-icon [name]="status.type === 'slow' ? 'clock' : 'alert-circle'" [size]="13" />
            <span class="provider-status-text">{{ status.message }}</span>
          </div>
        }
      }

      <!-- Messages Scroll Area -->
      <div class="messages-scroll-area">
        @if (isLoading()) {
          <!-- Skeleton Loading -->
          <div class="skeleton-list" aria-busy="true">
            @for (item of [1, 2, 3]; track item) {
              <div class="skeleton-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-lines">
                  <div class="skeleton-line title"></div>
                  <div class="skeleton-line subtitle"></div>
                </div>
              </div>
            }
          </div>
        } @else if (messages().length === 0) {
          @if (searchQuery() || activeFilter() !== 'all') {
            <!-- No Search Matches -->
            <div class="inbox-empty-card" role="status">
              <div class="empty-icon-wrap">
                <ts-icon name="inbox" [size]="36" />
              </div>
              <h4 class="empty-title">No matching messages</h4>
              <p class="empty-desc">Try clearing your search query or switching filters.</p>
            </div>
          } @else {
            <!-- Shared Empty Drop State (Image 2 Style) -->
            <shared-empty-drop-state
              leftIcon="mail"
              centerIcon="inbox"
              rightIcon="file-text"
              heading="Add anything"
              subtext="Drop files, folders or text to get started."
            />
          }
        } @else {
          <!-- Message Cards List -->
          <div class="messages-list-wrap" role="list">
            @for (msg of messages(); track msg.id) {
              <div
                class="message-card"
                role="listitem"
                [class.is-selected]="msg.id === selectedId()"
                [class.is-unread]="!msg.seen"
                (click)="selectMessage.emit(msg.id)"
                tabindex="0"
                [attr.aria-label]="'Email from ' + msg.from.name + ', subject: ' + msg.subject"
              >
                <!-- Avatar -->
                <div class="sender-avatar" [attr.data-initials]="getInitials(msg.from.name || msg.from.address)">
                  {{ getInitials(msg.from.name || msg.from.address) }}
                </div>

                <!-- Main Content -->
                <div class="card-content-area">
                  <div class="card-top-row">
                    <span class="sender-name text-truncate">
                      {{ msg.from.name || msg.from.address }}
                    </span>
                    <span class="received-time" [title]="msg.createdAt">
                      {{ formatRelativeTime(msg.createdAt) }}
                    </span>
                  </div>

                  <div class="card-subject-row text-truncate">
                    @if (!msg.seen) {
                      <span class="unread-dot" title="Unread email"></span>
                    }
                    <span class="subject-text" [class.is-bold]="!msg.seen">
                      {{ msg.subject || '(No subject)' }}
                    </span>
                  </div>

                  <p class="intro-preview-text text-truncate">
                    {{ msg.intro || 'No preview available' }}
                  </p>

                  <!-- Standout VIP OTP Badge on Card -->
                  @if (msg.extractedOtp) {
                    <div class="card-otp-banner" (click)="$event.stopPropagation()">
                      <span class="otp-banner-icon">
                        <ts-icon name="zap" [size]="12" />
                      </span>
                      <span class="otp-code-text font-mono">{{ msg.extractedOtp.code }}</span>
                      <button
                        type="button"
                        class="copy-otp-chip-btn"
                        [class.is-copied]="copiedOtp() === msg.extractedOtp.code"
                        (click)="copyCode(msg.extractedOtp.code, $event)"
                        title="Copy OTP verification code"
                        aria-label="Copy OTP"
                      >
                        <ts-icon [name]="copiedOtp() === msg.extractedOtp.code ? 'check' : 'copy'" [size]="12" />
                        <span>{{ copiedOtp() === msg.extractedOtp.code ? 'Copied' : 'Copy Code' }}</span>
                      </button>
                    </div>
                  }
                </div>

                <!-- Delete Message Action (ALWAYS VISIBLE, not hidden on hover!) -->
                <div class="card-actions-col" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="card-delete-btn"
                    (click)="deleteMessage.emit(msg.id)"
                    title="Delete this message"
                    aria-label="Delete message"
                  >
                    <ts-icon name="trash" [size]="14" />
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
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

    .inbox-list-container {
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
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .inbox-list-container,
    [data-theme="light"] .inbox-list-container {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    /* Controls Bar */
    .list-controls-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .list-controls-bar,
    [data-theme="light"] .list-controls-bar {
      border-bottom-color: #F1F5F9;
    }

    .search-wrap {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted, #94A3B8);
      pointer-events: none;
    }

    :host-context([data-theme="light"]) .search-icon,
    [data-theme="light"] .search-icon {
      color: #64748B;
    }

    .search-input {
      width: 100%;
      height: 36px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 0 28px 0 32px;
      color: var(--text, #FCFCFC);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }

    :host-context([data-theme="light"]) .search-input,
    [data-theme="light"] .search-input {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .search-input::placeholder,
    [data-theme="light"] .search-input::placeholder {
      color: #64748B;
      opacity: 1;
    }

    .search-input:focus {
      border-color: var(--accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .search-input:focus,
    [data-theme="light"] .search-input:focus {
      border-color: #2563EB;
      background: #FFFFFF;
    }

    .clear-search-btn {
      position: absolute;
      right: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }

    :host-context([data-theme="light"]) .clear-search-btn,
    [data-theme="light"] .clear-search-btn {
      color: #64748B;
    }

    .interval-select-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 0 8px;
      height: 36px;
    }

    :host-context([data-theme="light"]) .interval-select-wrap,
    [data-theme="light"] .interval-select-wrap {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }

    .interval-icon {
      color: var(--accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .interval-icon,
    [data-theme="light"] .interval-icon {
      color: #2563EB;
    }

    .interval-select {
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      font-size: 12px;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .interval-select,
    [data-theme="light"] .interval-select {
      color: #0F172A;
      font-weight: 600;
    }

    /* Filter Pills */
    .filter-pills-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      overflow-x: auto;
      scrollbar-width: none;
    }

    :host-context([data-theme="light"]) .filter-pills-row,
    [data-theme="light"] .filter-pills-row {
      border-bottom-color: #F1F5F9;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .filter-pill,
    [data-theme="light"] .filter-pill {
      color: #334155;
      font-weight: 600;
    }

    .filter-pill:hover:not(.is-active) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    :host-context([data-theme="light"]) .filter-pill:hover:not(.is-active),
    [data-theme="light"] .filter-pill:hover:not(.is-active) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    .filter-pill.is-active {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
      font-weight: 700;
    }

    .filter-pill.is-active:hover {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    :host-context([data-theme="light"]) .filter-pill.is-active,
    [data-theme="light"] .filter-pill.is-active {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .filter-pill.is-active:hover,
    [data-theme="light"] .filter-pill.is-active:hover {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    .count-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .count-tag,
    [data-theme="light"] .count-tag {
      background: #E2E8F0;
      color: #1E293B;
    }

    .unread-tag {
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
    }

    :host-context([data-theme="light"]) .unread-tag,
    [data-theme="light"] .unread-tag {
      background: #2563EB;
      color: #FFFFFF;
    }

    /* Contextual Provider Status Banner */
    .provider-status-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      margin: 8px 16px 0 16px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      animation: fadeIn 0.15s ease-out;
    }

    .provider-status-banner.is-slow {
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.3);
      color: #FACC15;
    }

    :host-context([data-theme="light"]) .provider-status-banner.is-slow,
    [data-theme="light"] .provider-status-banner.is-slow {
      background: #FEFCE8;
      border-color: #FDE047;
      color: #A16207;
    }

    .provider-status-banner.is-retrying,
    .provider-status-banner.is-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #F87171;
    }

    :host-context([data-theme="light"]) .provider-status-banner.is-retrying,
    :host-context([data-theme="light"]) .provider-status-banner.is-error,
    [data-theme="light"] .provider-status-banner.is-retrying,
    [data-theme="light"] .provider-status-banner.is-error {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .provider-status-text {
      flex: 1;
    }

    /* Scroll Area */
    .messages-scroll-area {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    /* Message Card */
    .messages-list-wrap {
      display: flex;
      flex-direction: column;
    }

    .message-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      cursor: pointer;
      transition: background 0.15s ease;
      position: relative;
    }

    :host-context([data-theme="light"]) .message-card,
    [data-theme="light"] .message-card {
      border-bottom-color: #F1F5F9;
    }

    .message-card:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.04));
    }

    :host-context([data-theme="light"]) .message-card:hover,
    [data-theme="light"] .message-card:hover {
      background: #F8FAFC;
    }

    .message-card.is-selected {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 10%, transparent));
      border-left: 3px solid var(--accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .message-card.is-selected,
    [data-theme="light"] .message-card.is-selected {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      border-left: 3px solid #2563EB;
    }

    .message-card.is-unread {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 3%, transparent);
    }

    :host-context([data-theme="light"]) .message-card.is-unread,
    [data-theme="light"] .message-card.is-unread {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 3%, transparent);
    }

    .sender-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--accent-strong, #60A5FA);
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .sender-avatar,
    [data-theme="light"] .sender-avatar {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #2563EB;
    }

    .card-content-area {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .sender-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .sender-name,
    [data-theme="light"] .sender-name {
      color: #0F172A;
      font-weight: 700;
    }

    .received-time {
      font-size: 11px;
      color: var(--text-muted, #94A3B8);
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .received-time,
    [data-theme="light"] .received-time {
      color: #64748B;
    }

    .card-subject-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .unread-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent, #3B82F6);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .unread-dot,
    [data-theme="light"] .unread-dot {
      background: #2563EB;
    }

    .subject-text {
      font-size: 13px;
      color: var(--text, #E2E8F0);
    }

    :host-context([data-theme="light"]) .subject-text,
    [data-theme="light"] .subject-text {
      color: #1E293B;
    }

    .subject-text.is-bold {
      font-weight: 700;
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .subject-text.is-bold,
    [data-theme="light"] .subject-text.is-bold {
      color: #0F172A;
      font-weight: 700;
    }

    .intro-preview-text {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      line-height: 1.4;
      margin: 0;
    }

    :host-context([data-theme="light"]) .intro-preview-text,
    [data-theme="light"] .intro-preview-text {
      color: #475569;
    }

    /* Card Standout OTP Banner */
    .card-otp-banner {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 18%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent));
      width: fit-content;
    }

    :host-context([data-theme="light"]) .card-otp-banner,
    [data-theme="light"] .card-otp-banner {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent);
    }

    .otp-banner-icon {
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
    }

    :host-context([data-theme="light"]) .otp-banner-icon,
    [data-theme="light"] .otp-banner-icon {
      color: #2563EB;
    }

    .otp-code-text {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-strong, #60A5FA);
      letter-spacing: 1px;
    }

    :host-context([data-theme="light"]) .otp-code-text,
    [data-theme="light"] .otp-code-text {
      color: #1D4ED8;
      font-weight: 800;
    }

    .copy-otp-chip-btn {
      height: 24px;
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
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      opacity: 1 !important;
      box-shadow: 0 1px 3px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 25%, transparent);
    }

    .copy-otp-chip-btn span,
    .copy-otp-chip-btn ts-icon {
      color: #FFFFFF !important;
      opacity: 1 !important;
      display: inline-flex;
      align-items: center;
    }

    .copy-otp-chip-btn:hover {
      background: #2563EB !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      color: #FFFFFF !important;
      filter: none !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 40%, transparent);
    }

    :host-context([data-theme="light"]) .copy-otp-chip-btn,
    [data-theme="light"] .copy-otp-chip-btn {
      background: #2563EB !important;
      color: #FFFFFF !important;
      border: 1px solid #1D4ED8 !important;
    }

    :host-context([data-theme="light"]) .copy-otp-chip-btn:hover,
    [data-theme="light"] .copy-otp-chip-btn:hover {
      background: #1E40AF !important;
      border-color: #1E3A8A !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .copy-otp-chip-btn span,
    :host-context([data-theme="light"]) .copy-otp-chip-btn ts-icon,
    [data-theme="light"] .copy-otp-chip-btn span,
    [data-theme="light"] .copy-otp-chip-btn ts-icon {
      color: #FFFFFF !important;
      opacity: 1 !important;
    }

    .copy-otp-chip-btn.is-copied {
      background: #059669 !important;
      border-color: #047857 !important;
      color: #FFFFFF !important;
    }

    /* Actions Column: ALWAYS VISIBLE (not hidden on hover!) */
    .card-actions-col {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .card-delete-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-inset, #1A1B1E);
      color: var(--text-muted, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .card-delete-btn,
    [data-theme="light"] .card-delete-btn {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #475569;
    }

    .card-delete-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #EF4444;
    }

    :host-context([data-theme="light"]) .card-delete-btn:hover,
    [data-theme="light"] .card-delete-btn:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    /* Empty State */
    .inbox-empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(24px, 5vh, 48px) 24px;
      text-align: center;
      margin: auto;
      width: 100%;
      height: 100%;
      flex: 1 1 0%;
      min-height: 260px;
      box-sizing: border-box;
    }

    @media (max-width: 860px) {
      .inbox-empty-card {
        padding: 32px 16px;
        min-height: 220px;
      }
    }

    @media (max-width: 480px) {
      .inbox-empty-card {
        padding: 24px 14px;
        min-height: 180px;
      }
      .empty-icon-wrap {
        width: 52px;
        height: 52px;
        margin-bottom: 12px;
        border-radius: 14px;
      }
      .empty-title {
        font-size: 15px;
      }
      .empty-desc {
        font-size: 12px;
        margin-bottom: 12px;
      }
    }

    @media (max-height: 700px) {
      .inbox-empty-card {
        padding: 16px 14px;
        min-height: 160px;
      }
      .empty-icon-wrap {
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
      .empty-desc {
        margin-bottom: 10px;
      }
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 10%, transparent));
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .empty-icon-wrap,
    [data-theme="light"] .empty-icon-wrap {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      color: #2563EB;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0 0 6px;
    }

    :host-context([data-theme="light"]) .empty-title,
    [data-theme="light"] .empty-title {
      color: #0F172A;
      font-weight: 700;
    }

    .empty-desc {
      font-size: 13px;
      color: var(--text-muted, #94A3B8);
      line-height: 1.5;
      max-width: 280px;
      margin: 0 0 16px;
    }

    :host-context([data-theme="light"]) .empty-desc,
    [data-theme="light"] .empty-desc {
      color: #334155;
      font-weight: 500;
    }

    .empty-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      padding: 4px 12px;
      border-radius: 20px;
    }

    :host-context([data-theme="light"]) .empty-meta-chip,
    [data-theme="light"] .empty-meta-chip {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #1E293B;
      font-weight: 600;
    }

    .status-indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      animation: pulse 1.8s infinite;
    }

    /* Skeleton Loading */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .skeleton-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .skeleton-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      animation: skeleton-pulse 1.4s infinite;
    }

    .skeleton-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skeleton-line {
      height: 10px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      animation: skeleton-pulse 1.4s infinite;
    }

    .skeleton-line.title {
      width: 60%;
    }

    .skeleton-line.subtitle {
      width: 85%;
    }

    .text-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.2; }
    }
  `]
})
export class InboxListComponent {
  readonly messages = input<MessageSummary[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly totalCount = input<number>(0);
  readonly unreadCount = input<number>(0);
  readonly allCount = input<number>(0);
  readonly otpCount = input<number>(0);
  readonly linkCount = input<number>(0);
  readonly attachmentCount = input<number>(0);
  readonly providerStatus = input<ProviderStatus | null>(null);
  readonly searchQuery = input<string>('');
  readonly activeFilter = input<InboxFilter>('all');
  readonly refreshInterval = input<AutoRefreshInterval>(10);

  readonly selectMessage = output<string>();
  readonly deleteMessage = output<string>();
  readonly searchChange = output<string>();
  readonly filterChange = output<InboxFilter>();
  readonly intervalChange = output<AutoRefreshInterval>();

  readonly copiedOtp = signal<string | null>(null);

  getInitials(nameOrEmail: string): string {
    if (!nameOrEmail) return '?';
    const clean = nameOrEmail.replace(/['"<>[\]]/g, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
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

  async copyCode(code: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      this.copiedOtp.set(code);
      setTimeout(() => {
        if (this.copiedOtp() === code) {
          this.copiedOtp.set(null);
        }
      }, 2000);
    } catch (e) {
      console.warn('Could not copy OTP:', e);
    }
  }
}
