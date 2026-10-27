// client/apps/tool-qr-generator/src/components/notes-viewer/notes-viewer.component.ts
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { QrNotesService } from '../../services/qr-notes.service';

@Component({
  selector: 'app-qr-notes-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notes-page-root">
      <!-- Minimalist Header -->
      <header class="notes-header">
        <a routerLink="/tools/qr-generator" class="notes-brand" title="Acklet QR Hub">
          <span class="brand-badge">Acklet</span>
          <span class="brand-divider">/</span>
          <span class="brand-title">Notes</span>
        </a>
      </header>

      <main class="notes-main">
        <!-- 1. LOADING STATE -->
        @if (isLoading()) {
          <div class="notes-card status-card">
            <div class="spinner" aria-hidden="true"></div>
            <h2 class="status-title">Loading Note...</h2>
            <p class="status-desc">Retrieving text content.</p>
          </div>
        }

        <!-- 2. ERROR STATE -->
        @else if (error()) {
          <div class="notes-card status-card error-state">
            <ts-icon name="alert-circle" class="status-icon error-icon" />
            <h2 class="status-title">Note Unavailable</h2>
            <p class="status-desc">{{ error() }}</p>
            <a routerLink="/tools/qr-generator" class="btn-action btn-primary">
              <ts-icon name="arrow-left" />
              <span>Generate a QR Code</span>
            </a>
          </div>
        }

        <!-- 3. SUCCESS / NOTE VIEW -->
        @else {
          <article class="notes-card note-display-card">
            <div class="note-card-meta">
              <div class="meta-left">
                <ts-icon name="file-text" class="meta-icon" />
                <span class="meta-label">Shared Text Note</span>
              </div>
              <span class="meta-stats">{{ noteCharCount() }} characters &bull; {{ noteWordCount() }} words</span>
            </div>

            <!-- Readable Text Block -->
            <div class="note-text-block custom-scrollbar" tabindex="0" role="region" aria-label="Note content">
              <pre class="note-content">{{ noteText() }}</pre>
            </div>

            <!-- Action Buttons Area -->
            <div class="note-actions">
              <!-- Primary Action: Save to Notes (only when navigator.share is available) -->
              @if (canShare()) {
                <button
                  type="button"
                  id="btn-save-to-notes"
                  class="btn-action btn-primary"
                  (click)="saveToNotes()"
                  title="Open system share sheet to save directly to Notes"
                >
                  <ts-icon name="share-2" />
                  <span>Save to Notes</span>
                </button>
              }

              <!-- Secondary Action: Copy -->
              <button
                type="button"
                id="btn-copy-note"
                class="btn-action btn-secondary"
                (click)="copyText()"
                [class.btn-copied]="isCopied()"
                title="Copy note text to clipboard"
              >
                <ts-icon [name]="isCopied() ? 'check' : 'copy'" />
                <span>{{ isCopied() ? 'Copied!' : 'Copy' }}</span>
              </button>

              <!-- Secondary Action: Download .txt -->
              <button
                type="button"
                id="btn-download-note"
                class="btn-action btn-secondary"
                (click)="downloadTxt()"
                title="Download note as a plain text file"
              >
                <ts-icon name="download" />
                <span>Download .txt</span>
              </button>
            </div>
          </article>
        }
      </main>

      <footer class="notes-footer">
        <p>Private &amp; Instant &bull; Powered by <a routerLink="/" class="footer-link">Acklet</a></p>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: var(--bg-surface-canvas, #09090b);
      color: var(--text-color-primary, #f4f4f5);
      font-family: var(--font-body, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      --accent: var(--accent-primary, #3b82f6);
      --accent-hover: #2563eb;
      --card-bg: var(--bg-surface-elevated, #18181b);
      --card-border: var(--border-color-default, rgba(255, 255, 255, 0.12));
      --text-muted: var(--text-color-secondary, #a1a1aa);
    }

    .notes-page-root {
      max-width: 640px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem 1rem;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      box-sizing: border-box;
    }

    .notes-header {
      padding-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notes-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: inherit;
      transition: opacity 0.15s ease;
    }

    .notes-brand:hover {
      opacity: 0.85;
    }

    .brand-badge {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -0.02em;
      color: var(--accent);
    }

    .brand-divider {
      color: var(--text-muted);
      opacity: 0.6;
    }

    .brand-title {
      font-size: 0.9375rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .notes-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .notes-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: cardFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .status-card {
      text-align: center;
      align-items: center;
      padding: 3rem 1.5rem;
      gap: 1rem;
    }

    .status-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-color-primary, #f4f4f5);
    }

    .status-desc {
      font-size: 0.9375rem;
      color: var(--text-muted);
      margin: 0;
      max-width: 360px;
      line-height: 1.5;
    }

    .status-icon {
      font-size: 2.75rem;
    }

    .error-icon {
      color: #ef4444;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .note-card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--card-border);
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent);
    }

    .meta-icon {
      font-size: 1.125rem;
    }

    .meta-stats {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .note-text-block {
      background: var(--bg-surface-canvas, #09090b);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      max-height: 55vh;
      overflow-y: auto;
      outline: none;
    }

    .note-text-block:focus-visible {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .note-content {
      margin: 0;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-color-primary, #f4f4f5);
      user-select: text;
    }

    .note-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 46px;
      text-decoration: none;
      box-sizing: border-box;
      border: none;
    }

    .btn-primary {
      background: var(--accent);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
    }

    .btn-primary:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-color-primary, #f4f4f5);
      border: 1px solid var(--card-border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .btn-copied {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #10b981;
    }

    .notes-footer {
      padding-top: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .footer-link {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    @media (min-width: 480px) {
      .note-actions {
        flex-direction: row;
      }
      .btn-primary {
        flex: 2;
      }
      .btn-secondary {
        flex: 1;
      }
    }
  `]
})
export class QrNotesViewerComponent implements OnInit {
  private readonly route: ActivatedRoute;
  private readonly notesService: QrNotesService;

  constructor(
    route?: ActivatedRoute,
    notesService?: QrNotesService
  ) {
    this.route = route ?? inject(ActivatedRoute);
    this.notesService = notesService ?? inject(QrNotesService);
  }

  readonly noteCode = signal<string>('');
  readonly noteText = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly isCopied = signal<boolean>(false);

  readonly canShare = computed(() => {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  });

  readonly noteCharCount = computed(() => {
    return this.noteText().length;
  });

  readonly noteWordCount = computed(() => {
    const text = this.noteText().trim();
    return text ? text.split(/\s+/).length : 0;
  });

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') || '';
    if (!code) {
      this.error.set('No note code was provided in the link.');
      this.isLoading.set(false);
      return;
    }
    this.noteCode.set(code);
    this.loadNote(code);
  }

  async loadNote(code: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const text = await this.notesService.fetchNote(code);
      this.noteText.set(text);
    } catch (err: any) {
      this.error.set(err.message || 'Note not found or has expired.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveToNotes(): Promise<void> {
    const text = this.noteText();
    if (!text) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Note',
          text
        });
      } catch {
        // Share sheet aborted or dismissed by user
      }
    } else {
      // Fallback: copy to clipboard
      await this.copyText();
    }
  }

  async copyText(): Promise<void> {
    const text = this.noteText();
    if (!text) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }
    } catch {
      // Clipboard write failed
    }
  }

  downloadTxt(): void {
    const text = this.noteText();
    if (!text) return;

    if (typeof document === 'undefined') return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `note-${this.noteCode() || 'shared'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
