import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-lens-privacy-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="privacy-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🔒 Client-Side Privacy Guarantee</h3>
            <button class="icon-nav-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <p class="privacy-main-text">
              <strong>Processed entirely in your browser.</strong> Your JSON is never uploaded to Acklet servers or third-party cloud services.
            </p>
            <div class="privacy-explanation-box">
              <strong>How it works:</strong>
              <ul>
                <li>Formatting, validation, AST tree parsing, analytics, and converters happen 100% locally on your device.</li>
                <li>Your payloads stay in your local browser memory and are lost when you close or clear your workspace.</li>
              </ul>
            </div>
            <div class="privacy-notice">
              Only features clearly labeled as cloud/AI operations use server API endpoints. JSONLens formatting and inspection operations are strictly local.
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn btn-primary" (click)="closeModal()">Got it</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensPrivacyModalComponent {
  isOpen = signal<boolean>(false);

  openModal() {
    this.isOpen.set(true);
  }

  closeModal() {
    this.isOpen.set(false);
  }
}
