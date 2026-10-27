// client/apps/tool-qr-generator/src/components/social-link-input/social-link-input.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { QrBrandIconComponent } from '../qr-brand-icon/qr-brand-icon.component';
import {
  ALL_SOCIAL_PLATFORMS,
  SocialPlatformConfig,
  detectPlatformFromUrl,
  getSocialPlatform
} from '../../utils/social-platforms.data';

export interface SocialLinkInputValue {
  platform: string;
  handleOrUrl: string;
  canonicalUrl: string;
  isValid: boolean;
  error?: string;
}

export interface AddCenterIconEvent {
  iconId: string;
  platformName: string;
}

@Component({
  selector: 'app-social-link-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, QrBrandIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="social-input-container">
      <!-- Platform Dropdown / Selector -->
      <div class="field-row">
        <label for="social-platform-select" class="field-label">Social Platform</label>
        <div class="select-wrapper">
          <select
            id="social-platform-select"
            class="platform-native-select"
            [ngModel]="selectedPlatform().id"
            (ngModelChange)="onPlatformSelect($event)"
          >
            @for (p of allPlatforms; track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
          <ts-icon name="chevron-down" class="select-chevron" />
        </div>
      </div>

      <!-- Handle or URL Input -->
      <div class="field-row">
        <div class="field-header">
          <label for="social-handle-input" class="field-label">Profile Handle or URL</label>
          @if (undoSwitchState()) {
            <div class="undo-pill slide-fade-in">
              <span>Switched to {{ selectedPlatform().name }}</span>
              <button type="button" class="undo-btn" (click)="undoPlatformSwitch()">Undo</button>
            </div>
          }
        </div>

        <div class="input-with-icon">
          @if (selectedPlatform().iconName) {
            <div class="platform-icon-badge">
              <app-qr-brand-icon [name]="selectedPlatform().iconName!" />
            </div>
          } @else {
            <ts-icon name="globe" class="default-platform-icon" />
          }

          <input
            id="social-handle-input"
            type="text"
            class="field-input with-leading-icon"
            [placeholder]="selectedPlatform().placeholder"
            [ngModel]="handleOrUrl()"
            (ngModelChange)="onInputChange($event)"
            (paste)="onPaste($event)"
          />

          @if (handleOrUrl()) {
            <button type="button" class="clear-field-btn" (click)="clearInput()">
              <ts-icon name="x" />
            </button>
          }
        </div>
      </div>

      <!-- Center Brand Icon Prompt (Auto-suggestion) -->
      <!-- Center Brand Icon Prompt (Auto-suggestion or Active Removal) -->
      @if (hasCenterIconActive() && selectedPlatform().iconName) {
        <div class="center-icon-prompt is-active slide-fade-up">
          <div class="prompt-icon-badge">
            <app-qr-brand-icon [name]="selectedPlatform().iconName!" />
          </div>
          <div class="prompt-text-block">
            <span class="prompt-title">{{ selectedPlatform().name }} logo placed in center</span>
            <span class="prompt-desc">Logo shield is active with error correction boost.</span>
          </div>
          <div class="prompt-actions">
            <button type="button" class="remove-icon-btn" (click)="triggerRemoveCenterIcon()">
              <ts-icon name="trash-2" />
              <span>Remove logo</span>
            </button>
          </div>
        </div>
      } @else if (showCenterIconPrompt()) {
        <div class="center-icon-prompt slide-fade-up">
          <div class="prompt-icon-badge">
            <app-qr-brand-icon [name]="selectedPlatform().iconName!" />
          </div>
          <div class="prompt-text-block">
            <span class="prompt-title">Add {{ selectedPlatform().name }} logo in center?</span>
            <span class="prompt-desc">Places official artwork with a protective shield and high scan contrast.</span>
          </div>
          <div class="prompt-actions">
            <button type="button" class="add-icon-btn" (click)="triggerAddCenterIcon()">
              <ts-icon name="plus" />
              <span>Add logo</span>
            </button>
            <button
              type="button"
              class="dismiss-prompt-btn"
              (click)="dismissIconPrompt()"
              title="Dismiss"
            >
              <ts-icon name="x" />
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .social-input-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
    }

    /* Native Styled Select */
    .select-wrapper {
      position: relative;
      width: 100%;
    }

    .platform-native-select {
      width: 100%;
      height: 38px;
      padding: 0 32px 0 12px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      color: var(--text, #ffffff);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .platform-native-select:focus,
    .platform-native-select:focus-visible {
      outline: none;
      border-color: var(--accent, #10b981);
      box-shadow: 0 0 0 2px var(--accent-glow, rgba(16, 185, 129, 0.2));
    }

    .select-chevron {
      position: absolute;
      right: 11px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      pointer-events: none;
    }

    /* Undo Pill */
    .undo-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 7px;
      border-radius: 12px;
      background: var(--accent-soft, rgba(16, 185, 129, 0.12));
      border: 1px solid var(--accent-soft, rgba(16, 185, 129, 0.25));
      color: var(--accent, #10b981);
      font-size: 11px;
    }

    .undo-btn {
      border: none;
      background: transparent;
      color: var(--text, #ffffff);
      font-size: 11px;
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }

    .undo-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 1px;
    }

    /* Input With Icon */
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .platform-icon-badge {
      position: absolute;
      left: 10px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
    }

    .default-platform-icon {
      position: absolute;
      left: 10px;
      width: 16px;
      height: 16px;
      color: var(--text-3, rgba(255, 255, 255, 0.4));
      pointer-events: none;
    }

    .field-input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      color: var(--text, #ffffff);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .field-input::placeholder {
      color: var(--text-3, rgba(255, 255, 255, 0.4));
    }

    .field-input.with-leading-icon {
      padding-left: 36px;
      padding-right: 32px;
    }

    .field-input:focus,
    .field-input:focus-visible {
      outline: none;
      border-color: var(--accent, #10b981);
      box-shadow: 0 0 0 2px var(--accent-glow, rgba(16, 185, 129, 0.2));
    }

    .clear-field-btn {
      position: absolute;
      right: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      cursor: pointer;
    }

    .clear-field-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
    }

    .clear-field-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 1px;
    }

    .clear-field-btn ts-icon {
      width: 13px;
      height: 13px;
    }

    /* Inline Center Brand Icon Prompt */
    .center-icon-prompt {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .prompt-icon-badge {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      color: var(--accent, #10b981);
    }

    .prompt-text-block {
      flex: 1 1 0%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .prompt-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #ffffff);
    }

    .prompt-desc {
      font-size: 11px;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
    }

    .prompt-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .add-icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border: none;
      border-radius: 6px;
      background: var(--accent, #10b981);
      color: var(--on-accent, #ffffff);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 120ms ease;
    }

    .add-icon-btn:hover {
      opacity: 0.92;
    }

    .add-icon-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 2px;
    }

    .add-icon-btn ts-icon {
      width: 12px;
      height: 12px;
    }

    .center-icon-prompt.is-active {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.16));
    }

    .remove-icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.18));
      border-radius: 6px;
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #ffffff);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
    }

    .remove-icon-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }

    .remove-icon-btn:focus-visible {
      outline: 2px solid #ef4444;
      outline-offset: 2px;
    }

    .remove-icon-btn ts-icon {
      width: 12px;
      height: 12px;
    }

    .dismiss-prompt-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.4));
      cursor: pointer;
    }

    .dismiss-prompt-btn:hover {
      color: var(--text, #ffffff);
    }

    .dismiss-prompt-btn:focus-visible {
      outline: 2px solid var(--text-3, rgba(255, 255, 255, 0.5));
      outline-offset: 1px;
    }

    .dismiss-prompt-btn ts-icon {
      width: 13px;
      height: 13px;
    }

    .slide-fade-up {
      animation: slideFadeUp 160ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-fade-in {
      animation: fadeIn 140ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .platform-native-select,
      .field-input,
      .add-icon-btn,
      .slide-fade-up,
      .slide-fade-in {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class SocialLinkInputComponent implements OnInit {
  readonly initialPlatform = input<string>('instagram');
  readonly initialValue = input<string>('');
  readonly hasCenterIconActive = input<boolean>(false);

  readonly valueChange = output<SocialLinkInputValue>();
  readonly addCenterIcon = output<AddCenterIconEvent>();
  readonly removeCenterIcon = output<void>();

  readonly allPlatforms = ALL_SOCIAL_PLATFORMS;
  readonly selectedPlatform = signal<SocialPlatformConfig>(getSocialPlatform('instagram'));
  readonly handleOrUrl = signal<string>('');
  readonly dismissedPromptFor = signal<string>('');
  readonly undoSwitchState = signal<{ previousPlatform: SocialPlatformConfig; previousText: string } | null>(null);

  readonly canonicalUrl = computed<string>(() => {
    const raw = this.handleOrUrl().trim();
    if (!raw) return '';
    return this.selectedPlatform().buildUrl(raw);
  });

  readonly validation = computed<{ isValid: boolean; error?: string }>(() => {
    const raw = this.handleOrUrl().trim();
    if (!raw) {
      return { isValid: false };
    }
    return { isValid: true };
  });

  readonly showCenterIconPrompt = computed<boolean>(() => {
    const platform = this.selectedPlatform();
    if (!platform.iconName) return false;
    if (!this.validation().isValid) return false;
    if (this.hasCenterIconActive()) return false;
    if (this.dismissedPromptFor() === platform.id) return false;
    return true;
  });

  ngOnInit(): void {
    if (this.initialPlatform()) {
      this.selectedPlatform.set(getSocialPlatform(this.initialPlatform()));
    }
    if (this.initialValue()) {
      this.handleOrUrl.set(this.initialValue());
    }
    this.emitChange();
  }

  onPlatformSelect(id: string): void {
    this.undoSwitchState.set(null);
    this.selectedPlatform.set(getSocialPlatform(id));
    this.emitChange();
  }

  onInputChange(val: string): void {
    this.handleOrUrl.set(val);
    this.checkAndAutoDetect(val);
    this.emitChange();
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') || '';
    if (!text) return;

    const detected = detectPlatformFromUrl(text);
    if (detected && detected.id !== this.selectedPlatform().id) {
      event.preventDefault();
      const prevPlatform = this.selectedPlatform();
      const prevText = this.handleOrUrl();

      this.selectedPlatform.set(detected);
      this.handleOrUrl.set(text.trim());
      this.undoSwitchState.set({
        previousPlatform: prevPlatform,
        previousText: prevText
      });
      this.emitChange();
    }
  }

  undoPlatformSwitch(): void {
    const state = this.undoSwitchState();
    if (state) {
      this.selectedPlatform.set(state.previousPlatform);
      this.handleOrUrl.set(state.previousText || this.handleOrUrl());
      this.undoSwitchState.set(null);
      this.emitChange();
    }
  }

  clearInput(): void {
    this.handleOrUrl.set('');
    this.undoSwitchState.set(null);
    this.emitChange();
  }

  triggerAddCenterIcon(): void {
    const platform = this.selectedPlatform();
    if (platform.iconName) {
      this.dismissedPromptFor.set(platform.id);
      this.addCenterIcon.emit({
        iconId: platform.iconName,
        platformName: platform.name
      });
    }
  }

  triggerRemoveCenterIcon(): void {
    this.dismissedPromptFor.set('');
    this.removeCenterIcon.emit();
  }

  dismissIconPrompt(): void {
    this.dismissedPromptFor.set(this.selectedPlatform().id);
  }

  private checkAndAutoDetect(val: string): void {
    const trimmed = val.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('.com') || trimmed.includes('.net') || trimmed.includes('.gg')) {
      const detected = detectPlatformFromUrl(trimmed);
      if (detected && detected.id !== this.selectedPlatform().id) {
        const prevPlatform = this.selectedPlatform();
        const prevText = this.handleOrUrl();

        this.selectedPlatform.set(detected);
        this.undoSwitchState.set({
          previousPlatform: prevPlatform,
          previousText: prevText
        });
      }
    }
  }

  private emitChange(): void {
    const v = this.validation();
    this.valueChange.emit({
      platform: this.selectedPlatform().id,
      handleOrUrl: this.handleOrUrl(),
      canonicalUrl: this.canonicalUrl(),
      isValid: v.isValid,
      error: v.error
    });
  }
}
