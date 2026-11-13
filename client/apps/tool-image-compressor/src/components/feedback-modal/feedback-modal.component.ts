// apps/tool-image-compressor/src/components/feedback-modal/feedback-modal.component.ts
import { Component, ChangeDetectionStrategy, signal, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';

export interface FeedbackSubmission {
  rating: 'positive' | 'negative';
  category: 'feature' | 'bug' | 'quality' | 'general';
  comment: string;
}

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop animate-fade-in"
      (click)="cancelled.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Image Compressor Feedback"
    >
      <div class="modal-dialog animate-scale-up" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-bubble">
            <ts-icon name="message-square" [size]="18" />
          </div>
          <div class="header-text-group">
            <h3 class="modal-title">Share Feedback</h3>
            <span class="modal-subtitle">Help us improve the Acklet Image Compressor</span>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="cancelled.emit()"
            title="Close"
            aria-label="Close dialog"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Experience Rating -->
          <div class="form-group">
            <label class="form-label">How was your compression experience?</label>
            <div class="rating-buttons-row">
              <button
                type="button"
                class="rating-btn"
                [class.is-selected]="selectedRating() === 'positive'"
                (click)="selectedRating.set('positive')"
              >
                <ts-icon name="thumbs-up" [size]="16" />
                <span>Great</span>
              </button>
              <button
                type="button"
                class="rating-btn"
                [class.is-selected]="selectedRating() === 'negative'"
                (click)="selectedRating.set('negative')"
              >
                <ts-icon name="thumbs-down" [size]="16" />
                <span>Needs Work</span>
              </button>
            </div>
          </div>

          <!-- Category Selector -->
          <div class="form-group">
            <label class="form-label">What is this about?</label>
            <div class="category-pills-row">
              @for (cat of categories; track cat.id) {
                <button
                  type="button"
                  class="cat-pill-btn"
                  [class.is-selected]="selectedCategory() === cat.id"
                  (click)="selectedCategory.set(cat.id)"
                >
                  {{ cat.label }}
                </button>
              }
            </div>
          </div>

          <!-- Message Textarea -->
          <div class="form-group">
            <label class="form-label" for="feedback-message">Details or Suggestions</label>
            <textarea
              id="feedback-message"
              class="feedback-textarea"
              rows="3"
              placeholder="Tell us about image formats you need, issues with visual quality, or feature ideas..."
              [(ngModel)]="commentText"
              maxlength="1000"
            ></textarea>
            <div class="char-counter font-mono">{{ commentText.length }} / 1000</div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-cancel"
            (click)="cancelled.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn-submit"
            [disabled]="!canSubmit()"
            (click)="submit()"
          >
            <ts-icon name="send" [size]="14" />
            <span>Send Feedback</span>
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
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 480px;
      background: var(--ts-surface-card, #1E2028);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: var(--ts-radius-card, 16px);
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-icon-bubble {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-text-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-3, #6B7280);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #F9FAFB);
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
    }

    .rating-buttons-row {
      display: flex;
      gap: 10px;
    }

    .rating-btn {
      flex: 1;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      color: var(--text-2, #9CA3AF);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .rating-btn:hover {
      background: rgba(255, 255, 255, 0.09);
      color: var(--text, #F9FAFB);
    }

    .rating-btn.is-selected {
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent, #60A5FA);
    }

    .category-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .cat-pill-btn {
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #9CA3AF);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .cat-pill-btn:hover {
      background: rgba(255, 255, 255, 0.09);
      color: var(--text, #F9FAFB);
    }

    .cat-pill-btn.is-selected {
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent, #60A5FA);
    }

    .feedback-textarea {
      width: 100%;
      background: var(--ts-surface-base, #13151B);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      padding: 10px 12px;
      color: var(--text, #F9FAFB);
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
      transition: border-color 150ms ease;
    }

    .feedback-textarea:focus {
      border-color: var(--accent, #3B82F6);
    }

    .char-counter {
      font-size: 11px;
      color: var(--text-3, #6B7280);
      text-align: right;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.02));
    }

    .btn-cancel {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text, #F9FAFB);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .btn-submit {
      height: 36px;
      padding: 0 18px;
      border-radius: 8px;
      background: var(--accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 150ms ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: #2563EB;
    }

    .btn-submit:disabled {
      opacity: 0.45;
      cursor: not-allowed;
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

    :host-context([data-theme="light"]) .form-label,
    [data-theme="light"] .form-label {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .rating-btn,
    [data-theme="light"] .rating-btn,
    :host-context([data-theme="light"]) .cat-pill-btn,
    [data-theme="light"] .cat-pill-btn {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #475569;
    }

    :host-context([data-theme="light"]) .rating-btn:hover,
    [data-theme="light"] .rating-btn:hover,
    :host-context([data-theme="light"]) .cat-pill-btn:hover,
    [data-theme="light"] .cat-pill-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .feedback-textarea,
    [data-theme="light"] .feedback-textarea {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .btn-cancel,
    [data-theme="light"] .btn-cancel {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-cancel:hover,
    [data-theme="light"] .btn-cancel:hover {
      background: #F1F5F9;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-fade-in {
      animation: fadeIn 150ms var(--ts-ease-out, ease-out);
    }

    .animate-scale-up {
      animation: scaleUp 180ms var(--ts-ease-out, ease-out);
    }
  `]
})
export class FeedbackModalComponent {
  readonly submitted = output<FeedbackSubmission>();
  readonly cancelled = output<void>();

  readonly selectedRating = signal<'positive' | 'negative' | null>(null);
  readonly selectedCategory = signal<'feature' | 'bug' | 'quality' | 'general'>('feature');
  commentText = '';

  readonly categories = [
    { id: 'feature' as const, label: 'Feature Request' },
    { id: 'bug' as const, label: 'Bug Report' },
    { id: 'quality' as const, label: 'Quality Feedback' },
    { id: 'general' as const, label: 'General' }
  ];

  canSubmit(): boolean {
    return this.selectedRating() !== null && this.commentText.trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitted.emit({
      rating: this.selectedRating()!,
      category: this.selectedCategory(),
      comment: this.commentText.trim()
    });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.cancelled.emit();
  }
}

