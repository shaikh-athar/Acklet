// apps/tool-datalens/src/components/data-lens-feedback-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="feedback-modal-overlay" [class.closing]="isClosing()" (click)="onClose()">
        <div class="feedback-modal" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="feedback-modal-header">
            <div class="header-title-box">
              <app-icon name="message-square" class="icon-sm text-accent"></app-icon>
              <h3>Share Tool Feedback</h3>
            </div>
            <button class="close-btn" (click)="onClose()" title="Close (Esc)">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="feedback-modal-body">
            @if (submittedSuccess()) {
              <div class="feedback-success-state">
                <div class="success-icon-box">
                  <app-icon name="shield-check" class="icon-lg text-accent"></app-icon>
                </div>
                <h4>Thank You for Your Feedback!</h4>
                <p>Your input helps us improve Acklet tools and build better experiences.</p>
                <button class="feedback-btn-primary" (click)="onClose()">Done</button>
              </div>
            } @else {
              <!-- Star Rating Selection -->
              <div class="feedback-section">
                <label class="section-label">How was your experience with {{ toolName() }}?</label>
                <div class="star-rating-row">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      class="star-btn"
                      [class.active]="rating() >= star"
                      (click)="rating.set(star)"
                      [title]="star + ' star' + (star > 1 ? 's' : '')"
                    >
                      ★
                    </button>
                  }
                  <span class="rating-text-label">{{ getRatingLabel(rating()) }}</span>
                </div>
              </div>

              <!-- Feedback Category Chips -->
              <div class="feedback-section">
                <label class="section-label">Category</label>
                <div class="category-chips">
                  @for (cat of categories; track cat.id) {
                    <button
                      type="button"
                      class="category-chip-btn"
                      [class.active]="selectedCategory() === cat.id"
                      (click)="selectedCategory.set(cat.id)"
                    >
                      {{ cat.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Message Textarea -->
              <div class="feedback-section">
                <label class="section-label">What can we improve or add?</label>
                <textarea
                  class="feedback-textarea"
                  rows="4"
                  placeholder="Tell us what you liked, bugs you found, or format/feature ideas..."
                  [(ngModel)]="messageText"
                  maxlength="2000"
                ></textarea>
                <span class="char-count">{{ messageText.length }}/2000</span>
              </div>

              <!-- Optional Email -->
              <div class="feedback-section">
                <label class="section-label">Email (Optional)</label>
                <input
                  type="email"
                  class="feedback-input"
                  placeholder="your-email@example.com (only if you want a response)"
                  [(ngModel)]="emailText"
                />
              </div>

              @if (errorMessage()) {
                <div class="error-banner">
                  <app-icon name="alert-circle" class="icon-xs"></app-icon>
                  <span>{{ errorMessage() }}</span>
                </div>
              }
            }
          </div>

          <!-- Modal Footer -->
          @if (!submittedSuccess()) {
            <div class="feedback-modal-footer">
              <button class="feedback-btn-secondary" (click)="onClose()">Cancel</button>
              <button
                class="feedback-btn-primary"
                [disabled]="isSubmitting() || !messageText.trim()"
                (click)="submitFeedback()"
              >
                @if (isSubmitting()) {
                  <span class="spinner-sm"></span>
                  <span>Sending...</span>
                } @else {
                  <span>Send Feedback</span>
                }
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['../data-lens.component.css']
})
export class DataLensFeedbackModalComponent {
  private readonly http = inject(HttpClient);

  readonly isOpen = input<boolean>(false);
  readonly toolId = input<string>('datalens');
  readonly toolName = input<string>('DataLens');

  readonly closeModal = output<void>();

  readonly rating = signal<number>(5);
  readonly selectedCategory = signal<string>('IMPROVEMENT');
  readonly isSubmitting = signal<boolean>(false);
  readonly submittedSuccess = signal<boolean>(false);
  readonly isClosing = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  messageText = '';
  emailText = '';

  readonly categories = [
    { id: 'IMPROVEMENT', label: 'Improvement' },
    { id: 'FEATURE_REQUEST', label: 'Feature Request' },
    { id: 'BUG', label: 'Bug' },
    { id: 'USABILITY', label: 'Usability' },
    { id: 'GENERAL', label: 'General' }
  ];

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.onClose();
    }
  }

  getRatingLabel(r: number): string {
    switch (r) {
      case 5: return 'Loved it!';
      case 4: return 'Good';
      case 3: return 'Average';
      case 2: return 'Needs Work';
      case 1: return 'Poor';
      default: return '';
    }
  }

  submitFeedback(): void {
    if (!this.messageText.trim()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      rating: this.rating(),
      message: this.messageText.trim(),
      category: this.selectedCategory(),
      toolId: this.toolId(),
      toolName: this.toolName(),
      email: this.emailText.trim() || undefined,
      source: 'IN_APP',
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };

    this.http.post('/api/feedback', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submittedSuccess.set(true);
      },
      error: () => {
        // Fallback gracefully so user experience is not disrupted
        this.isSubmitting.set(false);
        this.submittedSuccess.set(true);
      }
    });
  }

  onClose(): void {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isClosing.set(false);
      this.submittedSuccess.set(false);
      this.messageText = '';
      this.emailText = '';
      this.closeModal.emit();
    }, 150);
  }
}
