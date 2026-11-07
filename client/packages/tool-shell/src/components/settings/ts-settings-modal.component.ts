// packages/tool-shell/src/components/settings/ts-settings-modal.component.ts
import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSettingsService } from '../../services/tool-settings.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent],
  template: `
    @if (settingsService.isOpen()) {
      <div 
        class="ts-settings-backdrop" 
        (click)="onBackdropClick($event)"
        aria-modal="true"
        role="dialog"
        aria-labelledby="ts-settings-title"
      >
        <div class="ts-settings-card" (click)="$event.stopPropagation()">
          <!-- Header (ChatGPT Style Clean) -->
          <div class="ts-settings-header">
            <h2 id="ts-settings-title" class="ts-settings-title">Settings</h2>
            <button 
              type="button" 
              class="ts-settings-close-btn" 
              (click)="settingsService.close()"
              aria-label="Close settings"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Body: Clean rows without redundant descriptions -->
          <div class="ts-settings-body">
            <!-- Theme Mode Row -->
            <div class="ts-settings-row">
              <span class="ts-row-label">Theme</span>
              <div class="ts-theme-segmented">
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'light'"
                  (click)="themeService.setTheme('light')"
                >
                  <ts-icon name="sun" [size]="14" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'dark'"
                  (click)="themeService.setTheme('dark')"
                >
                  <ts-icon name="moon" [size]="14" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'system'"
                  (click)="themeService.setTheme('system')"
                >
                  <ts-icon name="monitor" [size]="14" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div class="ts-row-divider" role="separator"></div>

            <!-- Reduce Transparency Row -->
            <div class="ts-settings-row">
              <span class="ts-row-label">Reduce transparency</span>
              <button
                type="button"
                class="ts-toggle-switch"
                [class.is-checked]="themeService.reduceTransparency()"
                (click)="themeService.toggleReduceTransparency()"
                role="switch"
                [attr.aria-checked]="themeService.reduceTransparency()"
                aria-label="Reduce transparency"
              >
                <span class="ts-toggle-thumb"></span>
              </button>
            </div>

            <div class="ts-row-divider" role="separator"></div>

            <!-- Reduce Motion Row -->
            <div class="ts-settings-row">
              <span class="ts-row-label">Reduce motion</span>
              <button
                type="button"
                class="ts-toggle-switch"
                [class.is-checked]="themeService.reduceMotion()"
                (click)="themeService.toggleReduceMotion()"
                role="switch"
                [attr.aria-checked]="themeService.reduceMotion()"
                aria-label="Reduce motion"
              >
                <span class="ts-toggle-thumb"></span>
              </button>
            </div>
          </div>

          <!-- Footer (ChatGPT Style Clean & Minimal) -->
          <div class="ts-settings-footer">
            <button 
              type="button" 
              class="ts-settings-done-btn" 
              (click)="settingsService.close()"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-settings-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: tsFadeIn 150ms ease-out;
    }

    .ts-settings-card {
      width: 100%;
      max-width: 420px;
      background: var(--surface-card, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      border-radius: var(--ts-radius-lg, 16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);
      color: var(--text, #18181B);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: tsSlideUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .ts-settings-card {
      background: var(--surface-card, #1A1D24);
      border-color: var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #FCFCFC);
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.45);
    }

    .ts-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-settings-header {
      border-bottom-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .ts-settings-title {
      font-size: 15px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.01em;
      color: inherit;
    }

    .ts-settings-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-3, #71717A);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .ts-settings-close-btn:hover {
      background: var(--surface-hover, rgba(0, 0, 0, 0.05));
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-settings-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .ts-settings-body {
      padding: 8px 18px;
      display: flex;
      flex-direction: column;
    }

    .ts-settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 48px;
      gap: 16px;
    }

    .ts-row-label {
      font-size: 13.5px;
      font-weight: 500;
      color: inherit;
      white-space: nowrap;
    }

    .ts-row-divider {
      height: 1px;
      background: var(--border-subtle, rgba(0, 0, 0, 0.05));
      width: 100%;
    }

    :host-context([data-theme="dark"]) .ts-row-divider {
      background: var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    /* Segmented Controls (Light/Dark/System) */
    .ts-theme-segmented {
      display: inline-flex;
      align-items: center;
      padding: 3px;
      border-radius: 9px;
      background: var(--surface-2, rgba(0, 0, 0, 0.05));
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .ts-theme-segmented {
      background: rgba(255, 255, 255, 0.06);
    }

    .ts-segmented-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-3, #71717A);
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 130ms ease;
    }

    .ts-segmented-btn:hover {
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-segmented-btn:hover {
      color: #FFFFFF;
    }

    .ts-segmented-btn.is-active {
      background: var(--surface-card, #FFFFFF);
      color: var(--tool-accent, var(--accent, #2563EB));
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    :host-context([data-theme="dark"]) .ts-segmented-btn.is-active {
      background: var(--surface-card, #262A32);
      color: var(--tool-accent, var(--accent, #60A5FA));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* Switch Component */
    .ts-toggle-switch {
      position: relative;
      width: 38px;
      height: 20px;
      border-radius: 999px;
      border: none;
      background: var(--surface-3, rgba(0, 0, 0, 0.15));
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      transition: background 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-toggle-switch {
      background: var(--surface-3, rgba(255, 255, 255, 0.18));
    }

    .ts-toggle-switch.is-checked {
      background: var(--tool-accent, var(--accent, #2563EB));
    }

    :host-context([data-theme="dark"]) .ts-toggle-switch.is-checked {
      background: var(--tool-accent, var(--accent, #3B82F6));
    }

    .ts-toggle-thumb {
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-toggle-switch.is-checked .ts-toggle-thumb {
      transform: translateX(18px);
    }

    /* Footer */
    .ts-settings-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 18px;
      border-top: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-settings-footer {
      border-top-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .ts-settings-done-btn {
      padding: 6px 18px;
      border-radius: 7px;
      border: 1px solid var(--tool-accent, var(--accent, #2563EB)) !important;
      background: var(--tool-accent, var(--accent, #2563EB)) !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 6px color-mix(in srgb, var(--tool-accent, #2563EB) 24%, transparent) !important;
      transition: filter 120ms ease, transform 120ms ease;
    }

    .ts-settings-done-btn:hover {
      background: var(--tool-accent-hover, var(--accent-hover, #1D4ED8)) !important;
      border-color: var(--tool-accent-hover, var(--accent-hover, #1D4ED8)) !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
      filter: brightness(1.06);
      transform: translateY(-0.5px);
    }

    .ts-settings-done-btn:active {
      transform: translateY(0.5px);
    }

    @keyframes tsFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes tsSlideUp {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class TsSettingsModalComponent {
  readonly settingsService = inject(ToolSettingsService);
  readonly themeService = inject(ToolThemeService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.settingsService.isOpen()) {
      this.settingsService.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('ts-settings-backdrop')) {
      this.settingsService.close();
    }
  }
}
