import { Component, ChangeDetectionStrategy, input, output, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
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
                      class="chip-btn"
                      [class.active]="category() === cat.id"
                      (click)="category.set(cat.id)"
                    >
                      <span>{{ cat.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Message Textarea -->
              <div class="feedback-section">
                <label class="section-label">Your Feedback <span class="required-asterisk">*</span></label>
                <textarea
                  class="feedback-textarea"
                  rows="4"
                  [value]="message()"
                  (input)="message.set($any($event.target).value)"
                  placeholder="Tell us what you liked, what went wrong, or what feature you'd love to see..."
                ></textarea>
              </div>

              <!-- Optional Email Input -->
              <div class="feedback-section">
                <label class="section-label">Contact Email <span class="optional-badge">(Optional - if you'd like a response)</span></label>
                <input
                  type="email"
                  class="feedback-input"
                  [value]="email()"
                  (input)="email.set($any($event.target).value)"
                  placeholder="you@domain.com"
                />
              </div>

              <!-- Auto Metadata Badge -->
              <div class="metadata-badge">
                <app-icon name="info" class="icon-xs"></app-icon>
                <span>Auto-captured: <strong>{{ deviceType }}</strong> · <strong>{{ toolId() }}</strong></span>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          @if (!submittedSuccess()) {
            <div class="feedback-modal-footer">
              <button class="feedback-btn-secondary" (click)="onClose()">Cancel</button>
              <button
                class="feedback-btn-primary"
                [disabled]="!message().trim() || isSubmitting()"
                (click)="submit()"
              >
                <app-icon name="send" class="icon-xs"></app-icon>
                <span>{{ isSubmitting() ? 'Submitting...' : 'Submit Feedback' }}</span>
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./feedback-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackModalComponent {
  isOpen = input<boolean>(false);
  toolId = input<string>('datalens');
  toolName = input<string>('DataLens');

  closeModal = output<void>();

  private readonly feedbackService = inject(FeedbackService);

  isClosing = signal<boolean>(false);
  rating = signal<number>(5);
  category = signal<'general' | 'bug' | 'feature_request' | 'usability' | 'performance'>('general');
  message = signal<string>('');
  email = signal<string>('');
  isSubmitting = signal<boolean>(false);
  submittedSuccess = signal<boolean>(false);

  readonly deviceType = window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop';

  readonly categories = [
    { id: 'general', label: 'General' },
    { id: 'bug', label: 'Bug Report' },
    { id: 'feature_request', label: 'Feature Request' },
    { id: 'usability', label: 'Usability' },
    { id: 'performance', label: 'Performance' }
  ] as const;

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.closeModal.emit();
      this.isClosing.set(false);
      this.submittedSuccess.set(false);
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (!this.isOpen()) return;
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  getRatingLabel(r: number): string {
    switch (r) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent!';
      default: return '';
    }
  }

  submit() {
    if (!this.message().trim()) return;
    this.isSubmitting.set(true);

    this.feedbackService.submitFeedback({
      rating: this.rating(),
      category: this.category(),
      message: this.message().trim(),
      email: this.email().trim(),
      toolId: this.toolId()
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submittedSuccess.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submittedSuccess.set(true);
      }
    });
  }
}
