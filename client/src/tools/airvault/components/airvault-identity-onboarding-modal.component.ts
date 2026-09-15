import { Component, ChangeDetectionStrategy, signal, input, output, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultStorageService } from '../services/airvault-storage.service';

@Component({
  selector: 'app-airvault-identity-onboarding-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" [class.closing]="isClosing()" (click)="onClose()">
      <div class="onboarding-card" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Header badge & Close Button -->
        <div class="onboarding-header">
          <button class="onboarding-close-btn" (click)="onClose()" title="Close (Esc)">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
          <div class="brand-shield-glow">
            <app-icon name="shield-check" class="icon-md text-cyan"></app-icon>
          </div>
          <h2 class="onboarding-title">Welcome to AirVault</h2>
          <p class="onboarding-sub">End-to-end encrypted clipboard & file synchronization</p>
        </div>

        @if (view() === 'choose') {
          <div class="choices-container">
            <!-- Choice A: Continue as Guest -->
            <button class="choice-card guest-choice" (click)="continueAsGuest()">
              <div class="choice-icon-glow">
                <app-icon name="user" class="icon-sm text-cyan"></app-icon>
              </div>
              <div class="choice-meta">
                <span class="choice-headline">Continue as New Guest</span>
                <span class="choice-desc">Instantly generates a fresh, memorable handle & 4-digit PIN stored securely in the database.</span>
              </div>
              <app-icon name="arrow-right" class="icon-xs chevron-icon"></app-icon>
            </button>

            <!-- Choice B: Existing Identity Login -->
            <button class="choice-card existing-choice" (click)="view.set('login')">
              <div class="choice-icon-glow green">
                <app-icon name="user-check" class="icon-sm text-green"></app-icon>
              </div>
              <div class="choice-meta">
                <span class="choice-headline">I Already Have an Identity</span>
                <span class="choice-desc">Connect this device to your existing username and 4-digit PIN from another machine.</span>
              </div>
              <app-icon name="arrow-right" class="icon-xs chevron-icon"></app-icon>
            </button>
          </div>
        } @else if (view() === 'login') {
          <div class="login-form-container">
            <div class="form-title-row">
              <button class="back-btn" (click)="view.set('choose')">
                <app-icon name="arrow-left" class="icon-xs"></app-icon>
                <span>Back</span>
              </button>
              <span class="form-title">Sign In with Identity</span>
            </div>

            <!-- Username Field -->
            <div class="field-group">
              <label class="field-label">USERNAME</label>
              <div class="input-glow-wrapper">
                <span class="input-prefix">@</span>
                <input
                  type="text"
                  class="styled-text-input"
                  placeholder="e.g. swift-vault"
                  [(ngModel)]="usernameInput"
                  (keydown.enter)="isFormComplete() && submitLogin()"
                  autofocus
                />
              </div>
            </div>

              <!-- PIN Field -->
              <div class="field-group">
                <label class="field-label">4-DIGIT PIN</label>
                <div class="pin-grid">
                  @for (d of pinDigits; track $index) {
                    <input
                      type="password"
                      inputmode="numeric"
                      maxlength="1"
                      class="pin-box"
                      [(ngModel)]="pinDigits[$index]"
                      (input)="onPinInput($index, $event)"
                      (keydown)="onPinKeydown($index, $event)"
                    />
                  }
                </div>
              </div>

            @if (errorMessage()) {
              <div class="error-badge">
                <app-icon name="alert-circle" class="icon-xs"></app-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button
              class="login-submit-btn"
              [disabled]="!isFormComplete() || isSubmitting()"
              (click)="submitLogin()"
            >
              @if (isSubmitting()) {
                <span class="spinner"></span>
                <span>Verifying credentials...</span>
              } @else {
                <app-icon name="log-in" class="icon-xs"></app-icon>
                <span>Attach Device & Sign In</span>
              }
            </button>
          </div>
        } @else if (view() === 'merge-prompt') {
          <div class="merge-prompt-container">
            <div class="merge-icon-glow">
              <app-icon name="git-merge" class="icon-md text-amber"></app-icon>
            </div>
            <h3 class="merge-title">Existing Local Clipboard Found</h3>
            <p class="merge-desc">
              This browser contains <strong>{{ storageService.items().length }} clipboard items</strong> from an unclaimed guest session.
              Would you like to merge them into <strong>&#64;{{ usernameInput.trim() }}</strong> or discard them?
            </p>

            <div class="merge-actions-row">
              <button class="action-btn discard" (click)="confirmDiscardAndLogin()">
                <app-icon name="trash-2" class="icon-xs"></app-icon>
                <span>Discard & Switch</span>
              </button>
              <button class="action-btn merge" (click)="confirmMergeAndLogin()">
                <app-icon name="check" class="icon-xs"></app-icon>
                <span>Merge into &#64;{{ usernameInput.trim() }}</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 12, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
      animation: modalBdFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, backdrop-filter;
    }

    .modal-backdrop.closing {
      animation: modalBdFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    .onboarding-card {
      width: 100%;
      max-width: 460px;
      background: var(--av-surface-primary, #0B0E14);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(33, 150, 243, 0.15);
      display: flex;
      flex-direction: column;
      gap: 20px;
      animation: onboardScaleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .onboarding-card.closing {
      animation: onboardScaleOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }

    @keyframes modalBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes modalBdFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    @keyframes onboardScaleIn {
      0% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes onboardScaleOut {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
    }

    @keyframes tabPaneFadeIn {
      0% {
        opacity: 0;
        transform: translateY(8px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .choices-container,
    .login-form-container,
    .merge-prompt-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: tabPaneFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform;
    }

    .onboarding-header {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
    }

    .onboarding-close-btn {
      position: absolute;
      top: -4px;
      right: -4px;
      background: transparent;
      border: none;
      color: var(--av-text-muted, #8B949E);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .onboarding-close-btn:hover {
      background: var(--av-surface-secondary, #121822);
      color: var(--av-text-primary, #F0F3F6);
    }

    .brand-shield-glow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.3);
      margin-bottom: 6px;
      box-shadow: 0 0 20px rgba(33, 150, 243, 0.2);
    }

    .onboarding-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .onboarding-sub {
      font-size: 12px;
      color: var(--av-text-muted, #8B949E);
      margin: 0;
    }

    .choices-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .choice-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .choice-card:hover {
      border-color: rgba(33, 150, 243, 0.5);
      background: rgba(33, 150, 243, 0.05);
      transform: translateY(-1px);
    }

    .choice-icon-glow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(33, 150, 243, 0.12);
      border: 1px solid rgba(33, 150, 243, 0.25);
      flex-shrink: 0;
    }

    .choice-icon-glow.green {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.25);
    }

    .choice-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
    }

    .choice-headline {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
    }

    .choice-desc {
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.4;
    }

    .chevron-icon {
      color: var(--av-text-faint, #505A69);
      transition: transform 0.15s ease;
    }

    .choice-card:hover .chevron-icon {
      transform: translateX(3px);
      color: var(--av-text-primary, #F0F3F6);
    }

    .login-form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 2px;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: var(--av-text-muted, #8B949E);
      font-size: 11.5px;
      cursor: pointer;
      padding: 0;
    }
    .back-btn:hover { color: var(--av-text-primary, #F0F3F6); }

    .form-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--av-text-muted, #8B949E);
    }

    .input-glow-wrapper {
      display: flex;
      align-items: center;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 8px;
      padding: 0 12px;
      height: 38px;
      transition: border-color 0.15s ease;
    }

    .input-glow-wrapper:focus-within {
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.15);
    }

    .input-prefix {
      color: #2196F3;
      font-weight: 700;
      font-size: 14px;
      margin-right: 6px;
    }

    .styled-text-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--av-text-primary, #F0F3F6);
      font-size: 13px;
      font-family: inherit;
      outline: none;
    }

    .pin-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    .pin-box {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      height: 48px;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 8px;
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      color: #10B981;
      outline: none;
      -webkit-text-security: disc;
      transition: all 0.15s ease;
    }

    .pin-box:focus {
      border-color: #10B981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .error-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 6px;
      color: #EF4444;
      font-size: 11px;
    }

    .login-submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      background: #2196F3;
      color: #FFF;
      border: none;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: filter 0.15s ease;
    }

    .login-submit-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .login-submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .merge-prompt-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 10px 0;
    }

    .merge-icon-glow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .merge-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
    }

    .merge-desc {
      font-size: 12px;
      color: var(--av-text-muted, #8B949E);
      line-height: 1.5;
      margin: 0;
    }

    .merge-actions-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      width: 100%;
      margin-top: 6px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 38px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }

    .action-btn.discard {
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      color: #EF4444;
    }
    .action-btn.discard:hover {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .action-btn.merge {
      background: #10B981;
      color: #FFF;
    }
    .action-btn.merge:hover { filter: brightness(1.1); }

    .onboarding-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 9.5px;
      color: var(--av-text-muted, #8B949E);
      border-top: 1px solid var(--av-border-subtle, #161C26);
      padding-top: 12px;
    }

    .text-cyan { color: #2196F3; }
    .text-green { color: #10B981; }
    .text-amber { color: #F59E0B; }
    .text-muted { color: #8B949E; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultIdentityOnboardingModalComponent implements OnInit {
  initialView = input<'choose' | 'login'>('choose');
  close = output<void>();

  deviceService = inject(AirVaultDeviceService);
  uiStore = inject(AirVaultUIStore);
  storageService = inject(AirVaultStorageService);

  view = signal<'choose' | 'login' | 'merge-prompt'>('choose');
  isClosing = signal<boolean>(false);
  usernameInput = '';
  pinDigits: string[] = ['', '', '', ''];
  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (this.view() === 'login') {
      this.view.set('choose');
      return;
    }
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  ngOnInit() {
    if (this.initialView()) {
      this.view.set(this.initialView());
    }
  }

  onPinInput(index: number, event: any) {
    const val = event.target.value;
    if (val && val.length > 0) {
      this.pinDigits[index] = val.slice(-1);
      const nextInput = event.target.nextElementSibling as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      } else if (this.isFormComplete()) {
        this.submitLogin();
      }
    }
  }

  onPinKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.isFormComplete()) {
        this.submitLogin();
      }
    } else if (event.key === 'Backspace' && !this.pinDigits[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  isFormComplete(): boolean {
    return !!this.usernameInput.trim() && this.pinDigits.every(d => d.trim().length === 1);
  }

  continueAsGuest() {
    this.deviceService.completeGuestOnboarding();
    this.uiStore.showIdentityOnboardingModal.set(false);
    this.uiStore.triggerToast(`✓ Generated guest identity: @${this.deviceService.currentDevice().username}`);
  }

  submitLogin() {
    if (!this.isFormComplete()) return;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const user = this.usernameInput.trim().toLowerCase();
    const pin = this.pinDigits.join('');

    this.deviceService.loginWithExistingIdentity(user, pin).subscribe(res => {
      this.isSubmitting.set(false);
      if (res.success) {
        const localItemCount = this.storageService.items().length;
        if (localItemCount > 0) {
          // Has unclaimed data -> prompt user whether to merge or discard
          this.view.set('merge-prompt');
        } else {
          // No local data -> attach directly
          this.applyLoginIdentity(user, pin);
        }
      } else {
        this.errorMessage.set(res.message || 'Invalid username or PIN');
      }
    });
  }

  confirmMergeAndLogin() {
    const user = this.usernameInput.trim().toLowerCase();
    const pin = this.pinDigits.join('');
    this.applyLoginIdentity(user, pin);
    this.uiStore.triggerToast(`✓ Local clipboard items merged into @${user}`);
  }

  confirmDiscardAndLogin() {
    const user = this.usernameInput.trim().toLowerCase();
    const pin = this.pinDigits.join('');
    this.storageService.clearAllLocally();
    this.applyLoginIdentity(user, pin);
    this.uiStore.triggerToast(`✓ Switched to @${user}`);
  }

  private applyLoginIdentity(username: string, pin: string) {
    this.deviceService.setExistingIdentity(username, pin);
    this.uiStore.showIdentityOnboardingModal.set(false);
  }
}
