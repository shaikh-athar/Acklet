import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ShieldAlert, Share2, Copy, Check, X } from 'lucide-angular';

@Component({
  selector: 'app-json-lens-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="closeModal.emit()">
        <div class="share-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <lucide-icon [img]="ShareIcon" class="icon-sm share-title-icon"></lucide-icon>
              <h3>Share Payload Architecture</h3>
            </div>
            <button class="icon-nav-btn" (click)="closeModal.emit()">
              <lucide-icon [img]="CloseIcon" class="icon-xs"></lucide-icon>
            </button>
          </div>

          <div class="modal-body">
            <!-- Warning Banner -->
            <div class="share-warning-banner">
              <lucide-icon [img]="WarningIcon" class="icon-md warning-icon"></lucide-icon>
              <div class="warning-text">
                <strong>⚠ Privacy & Secrets Warning</strong>
                <span>JSON payloads frequently contain API keys, credentials, or personal data. Never share unredacted payloads publicly.</span>
              </div>
            </div>

            <!-- Expiration Options -->
            <div class="form-group">
              <label class="form-label">Link Expiration:</label>
              <select class="expiration-select" [(ngModel)]="expiration">
                <option value="1h">Private link · Expires in 1 hour</option>
                <option value="24h">Private link · Expires in 24 hours</option>
                <option value="7d">Private link · Expires in 7 days</option>
              </select>
            </div>

            <!-- Generated Link Preview -->
            @if (generatedLink()) {
              <div class="link-result-box">
                <input type="text" readonly [value]="generatedLink()" class="link-input" />
                <button class="action-btn btn-primary" (click)="copyShareLink()">
                  @if (copied()) {
                    <lucide-icon [img]="CheckIcon" class="icon-xs"></lucide-icon>
                    Copied
                  } @else {
                    <lucide-icon [img]="CopyIcon" class="icon-xs"></lucide-icon>
                    Copy Link
                  }
                </button>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button class="action-btn btn-secondary" (click)="closeModal.emit()">Cancel</button>
            <button class="action-btn btn-primary" (click)="generateLink()">Create Share Link</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensShareModalComponent {
  isOpen = input<boolean>(false);
  closeModal = output<void>();
  triggerToast = output<string>();

  expiration: string = '24h';
  generatedLink = signal<string>('');
  copied = signal<boolean>(false);

  readonly ShareIcon = Share2;
  readonly WarningIcon = ShieldAlert;
  readonly CopyIcon = Copy;
  readonly CheckIcon = Check;
  readonly CloseIcon = X;

  generateLink() {
    const dummyHash = Math.random().toString(36).substring(2, 12);
    const link = `https://acklet.dev/share/jsonlens#${dummyHash}?exp=${this.expiration}`;
    this.generatedLink.set(link);
    this.triggerToast.emit('✓ Shareable private link generated');
  }

  copyShareLink() {
    const link = this.generatedLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      this.triggerToast.emit('✓ Share link copied to clipboard');
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
