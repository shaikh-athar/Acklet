import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ThemeService } from '../../../core/services/theme.service';
import { FeatureService } from '../../../core/services/feature.service';
import { SessionManagerComponent } from './session-manager';

@Component({
  selector: 'app-workspace-settings',
  standalone: true,
  imports: [CommonModule, IconComponent, SessionManagerComponent],
  template: `
    <div class="st-root">
      <!-- Page Header -->
      <div class="st-page-header">
        <div>
          <h1 class="st-page-title">Workspace Settings</h1>
          <p class="st-page-subtitle">Configure your default settings, keyboard bindings, and security settings.</p>
        </div>
      </div>

      <!-- Appearance Card -->
      <div class="st-card">
        <div class="st-card-head">
          <h2 class="st-card-title">Appearance</h2>
        </div>
        <div class="st-field">
          <div class="st-field-label">THEME</div>
          <div class="st-theme-row">
            <button
              type="button"
              class="st-theme-btn"
              [class.st-theme-active]="themeSvc.theme() === 'light'"
              (click)="themeSvc.setTheme('light')"
              id="theme-light-btn"
            >
              <app-icon name="sun" class="st-theme-icon" />
              <span>Light</span>
            </button>
            <button
              type="button"
              class="st-theme-btn"
              [class.st-theme-active]="themeSvc.theme() === 'dark'"
              (click)="themeSvc.setTheme('dark')"
              id="theme-dark-btn"
            >
              <app-icon name="moon" class="st-theme-icon" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preferences Card -->
      <div class="st-card">
        <div class="st-card-head">
          <h2 class="st-card-title">Preferences</h2>
        </div>
        <div class="st-pref-list">
          <label class="st-pref-row">
            <div class="st-pref-left">
              <div class="st-pref-name">Automatic history saving</div>
              <div class="st-pref-desc">Save your tool usage history automatically for future reference.</div>
            </div>
            <div class="st-toggle" [class.st-toggle-on]="autoSave()" (click)="autoSave.set(!autoSave())">
              <div class="st-toggle-knob"></div>
            </div>
          </label>
          <label class="st-pref-row">
            <div class="st-pref-left">
              <div class="st-pref-name">System update notifications</div>
              <div class="st-pref-desc">Receive notifications when new platform updates are available.</div>
            </div>
            <div class="st-toggle" [class.st-toggle-on]="notifications()" (click)="notifications.set(!notifications())">
              <div class="st-toggle-knob"></div>
            </div>
          </label>
        </div>
        <div class="st-card-footer">
          <button class="st-save-btn" (click)="onSave()">Save Settings</button>
        </div>
      </div>

      <!-- Security & Sessions -->
      @if (featureSvc.isEnabled('enterpriseSecurity')) {
        <app-session-manager />
      }

      <!-- Danger Zone -->
      <div class="st-card st-danger-card">
        <div class="st-card-head">
          <h2 class="st-card-title st-danger-title">Danger Zone</h2>
        </div>
        <div class="st-danger-row">
          <div class="st-pref-left">
            <div class="st-pref-name">Delete workspace</div>
            <div class="st-pref-desc">Permanently delete this workspace and all its data. This action cannot be undone.</div>
          </div>
          <button class="st-danger-btn" disabled>Delete Workspace</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .st-root {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 800px;
    }

    /* Header */
    .st-page-header {
      margin-bottom: 8px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .st-page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
      margin: 0;
    }
    .st-page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }

    /* Card */
    .st-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      overflow: hidden;
    }
    .st-card-head {
      padding: 18px 24px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .st-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    /* Field */
    .st-field {
      padding: 20px 24px;
    }
    .st-field-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--vercel-text-muted);
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    /* Theme switcher */
    .st-theme-row {
      display: flex;
      gap: 10px;
    }
    .st-theme-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: 8px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .st-theme-btn:hover {
      border-color: var(--vercel-text-muted);
      color: var(--vercel-text-primary);
    }
    .st-theme-active {
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      border-color: var(--vercel-text-primary);
    }
    .st-theme-icon {
      width: 14px;
      height: 14px;
    }

    /* Preferences */
    .st-pref-list {
      display: flex;
      flex-direction: column;
    }
    .st-pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid var(--vercel-border);
      gap: 24px;
      cursor: pointer;
    }
    .st-pref-left { flex: 1; }
    .st-pref-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin-bottom: 2px;
    }
    .st-pref-desc {
      font-size: 12px;
      color: var(--vercel-text-muted);
    }

    /* Toggle */
    .st-toggle {
      width: 40px;
      height: 22px;
      border-radius: 99px;
      background: var(--vercel-border);
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }
    .st-toggle-on { background: #7c3aed; }
    .st-toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .st-toggle-on .st-toggle-knob { transform: translateX(18px); }

    /* Card footer */
    .st-card-footer {
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
    }
    .st-save-btn {
      padding: 8px 20px;
      border-radius: 6px;
      background: #7c3aed;
      color: white;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .st-save-btn:hover { opacity: 0.88; }

    /* Danger */
    .st-danger-card { border-color: rgba(239,68,68,0.3); }
    .st-danger-title { color: #ef4444; }
    .st-danger-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      gap: 24px;
    }
    .st-danger-btn {
      padding: 8px 16px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid rgba(239,68,68,0.5);
      color: #ef4444;
      font-size: 12px;
      font-weight: 600;
      cursor: not-allowed;
      opacity: 0.6;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `]
})
export class WorkspaceSettingsComponent {
  readonly themeSvc = inject(ThemeService);
  readonly featureSvc = inject(FeatureService);
  readonly autoSave = signal(true);
  readonly notifications = signal(true);

  onSave(): void {
    console.log('[Acklet Settings] Saved preferences.');
  }
}
