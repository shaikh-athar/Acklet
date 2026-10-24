// packages/tool-shell/src/components/settings/ts-settings-modal.component.ts
import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSettingsService } from '../../services/tool-settings.service';
import { ToolThemeService, ThemeMode } from '../../services/tool-theme.service';
import { SidebarStateService } from '../../services/sidebar-state.service';
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
          <!-- Header -->
          <div class="ts-settings-header">
            <div class="ts-settings-title-group">
              <ts-icon name="settings" [size]="18" class="ts-settings-title-icon" />
              <h2 id="ts-settings-title" class="ts-settings-title">Workspace Settings</h2>
            </div>
            <button 
              type="button" 
              class="ts-settings-close-btn" 
              (click)="settingsService.close()"
              aria-label="Close settings"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Body -->
          <div class="ts-settings-body">
            <!-- Theme Mode -->
            <div class="ts-settings-section">
              <label class="ts-settings-section-label">Interface Theme</label>
              <div class="ts-theme-segmented">
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'light'"
                  (click)="themeService.setTheme('light')"
                >
                  <ts-icon name="sun" [size]="15" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'dark'"
                  (click)="themeService.setTheme('dark')"
                >
                  <ts-icon name="moon" [size]="15" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  class="ts-segmented-btn"
                  [class.is-active]="themeService.currentTheme() === 'system'"
                  (click)="themeService.setTheme('system')"
                >
                  <ts-icon name="monitor" [size]="15" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <!-- Accessibility Controls -->
            <div class="ts-settings-section">
              <label class="ts-settings-section-label">Accessibility & Display</label>
              
              <!-- Reduce Transparency -->
              <div class="ts-settings-row">
                <div class="ts-row-info">
                  <span class="ts-row-title">Reduce Transparency</span>
                  <span class="ts-row-desc">Use solid opaque card surfaces for higher contrast</span>
                </div>
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

              <!-- Reduce Motion -->
              <div class="ts-settings-row">
                <div class="ts-row-info">
                  <span class="ts-row-title">Reduce Motion</span>
                  <span class="ts-row-desc">Disable sliding animations and UI micro-interactions</span>
                </div>
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

            <!-- Sidebar Navigation Behavior -->
            <div class="ts-settings-section">
              <label class="ts-settings-section-label">Navigation & Sidebar</label>
              
              <div class="ts-settings-row">
                <div class="ts-row-info">
                  <span class="ts-row-title">Left-Edge Hover Reveal</span>
                  <span class="ts-row-desc">Slide sidebar open when cursor touches the left edge</span>
                </div>
                <button
                  type="button"
                  class="ts-toggle-switch"
                  [class.is-checked]="sidebarState.isHoverEnabled()"
                  (click)="sidebarState.toggleHoverEnabled()"
                  role="switch"
                  [attr.aria-checked]="sidebarState.isHoverEnabled()"
                  aria-label="Toggle hover reveal"
                >
                  <span class="ts-toggle-thumb"></span>
                </button>
              </div>

              <div class="ts-settings-hint-box">
                <ts-icon name="info" [size]="14" class="ts-hint-icon" />
                <span>Tip: Press <strong>⌘B</strong> (or <strong>Ctrl+B</strong>) at any time to toggle the sidebar directly.</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
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
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: tsFadeIn 150ms ease-out;
    }

    .ts-settings-card {
      width: 100%;
      max-width: 440px;
      background: var(--surface-card, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: var(--ts-radius-lg, 16px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      color: var(--text, #18181B);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: tsSlideUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .ts-settings-card {
      background: var(--surface-card, #18181B);
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #FCFCFC);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    }

    .ts-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-settings-header {
      border-bottom-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .ts-settings-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ts-settings-title-icon {
      color: var(--tool-accent, var(--accent, #3B82F6));
    }

    .ts-settings-title {
      font-size: 15px;
      font-weight: 650;
      margin: 0;
      letter-spacing: -0.01em;
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

    .ts-settings-body {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .ts-settings-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ts-settings-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-3, #71717A);
    }

    /* Segmented Theme Buttons */
    .ts-theme-segmented {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      background: var(--surface-2, rgba(0, 0, 0, 0.04));
      border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
      border-radius: 9px;
      padding: 3px;
    }

    :host-context([data-theme="dark"]) .ts-theme-segmented {
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .ts-segmented-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--text-2, #52525B);
      font-size: 12.5px;
      font-weight: 550;
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="dark"]) .ts-segmented-btn {
      color: var(--text-2, #A1A1AA);
    }

    .ts-segmented-btn:hover {
      color: var(--text, #18181B);
    }

    .ts-segmented-btn.is-active {
      background: var(--surface-card, #FFFFFF);
      color: var(--tool-accent, var(--accent, #3B82F6));
      font-weight: 650;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    :host-context([data-theme="dark"]) .ts-segmented-btn.is-active {
      background: var(--surface-card, #27272A);
      color: var(--tool-accent, var(--accent, #60A5FA));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* Row Toggles */
    .ts-settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
    }

    .ts-row-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ts-row-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #18181B);
    }

    .ts-row-desc {
      font-size: 11.5px;
      color: var(--text-3, #71717A);
      line-height: 1.35;
    }

    /* Switch Component */
    .ts-toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
      border-radius: 999px;
      border: none;
      background: var(--surface-3, rgba(0, 0, 0, 0.15));
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      transition: background 160ms ease;
    }

    :host-context([data-theme="dark"]) .ts-toggle-switch {
      background: var(--surface-3, rgba(255, 255, 255, 0.18));
    }

    .ts-toggle-switch.is-checked {
      background: var(--tool-accent, var(--accent, #3B82F6));
    }

    .ts-toggle-thumb {
      display: block;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-toggle-switch.is-checked .ts-toggle-thumb {
      transform: translateX(18px);
    }

    .ts-settings-hint-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--surface-2, rgba(0, 0, 0, 0.03));
      border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.05));
      font-size: 11px;
      color: var(--text-3, #71717A);
      line-height: 1.4;
    }

    .ts-hint-icon {
      color: var(--tool-accent, var(--accent, #3B82F6));
      flex-shrink: 0;
    }

    /* Footer */
    .ts-settings-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 20px;
      border-top: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-settings-footer {
      border-top-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .ts-settings-done-btn {
      padding: 6px 16px;
      border-radius: 7px;
      border: none;
      background: var(--tool-accent, var(--accent, #3B82F6));
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 120ms ease;
    }

    .ts-settings-done-btn:hover {
      filter: brightness(1.08);
    }

    @keyframes tsFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes tsSlideUp {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class TsSettingsModalComponent {
  readonly settingsService = inject(ToolSettingsService);
  readonly themeService = inject(ToolThemeService);
  readonly sidebarState = inject(SidebarStateService);

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
