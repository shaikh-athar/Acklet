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
    <div class="settings-root page-enter">
      <header class="mb-8">
        <h1 class="page-title">Workspace Settings</h1>
        <p class="page-subtitle">Configure your default settings, keyboard bindings, and security settings.</p>
      </header>

      <div class="settings-layout space-y-8">
        <!-- Settings Panel -->
        <div class="settings-pane p-6">
          <form (submit)="onSubmit($event)" class="settings-form">
            
            <!-- Appearance Section -->
            <div class="section-block">
              <h2 class="section-title">Appearance</h2>
              <div class="form-group mt-4">
                <label class="form-label">Theme</label>
                <div class="theme-selector">
                  <button
                    type="button"
                    class="theme-option"
                    [class.active]="themeSvc.theme() === 'light'"
                    (click)="themeSvc.setTheme('light')"
                    id="theme-light-btn"
                  >
                    <app-icon name="sun" class="size-4" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    class="theme-option"
                    [class.active]="themeSvc.theme() === 'dark'"
                    (click)="themeSvc.setTheme('dark')"
                    id="theme-dark-btn"
                  >
                    <app-icon name="moon" class="size-4" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Preferences Section -->
            <div class="section-block mt-8">
              <h2 class="section-title">Preferences</h2>
              <div class="form-group mt-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [checked]="autoSave()" (change)="autoSave.set(!autoSave())" class="checkbox-input" />
                  <span class="text-sm font-medium text-neutral-300">Enable automatic history saving</span>
                </label>
              </div>
              <div class="form-group mt-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [checked]="notifications()" (change)="notifications.set(!notifications())" class="checkbox-input" />
                  <span class="text-sm font-medium text-neutral-300">Receive system update notifications</span>
                </label>
              </div>
            </div>

            <!-- Submit -->
            <div class="form-actions mt-8 flex justify-end">
              <button type="submit" class="btn btn-primary">Save Settings</button>
            </div>
          </form>
        </div>

        <!-- Enterprise Security & Active Sessions Section -->
        @if (featureSvc.isEnabled('enterpriseSecurity')) {
          <div class="mt-8">
            <app-session-manager></app-session-manager>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .settings-root { max-width: 900px; margin: 0 auto; padding: 1.5rem 0; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: var(--color-neutral-50); }
    .page-subtitle { font-size: 0.875rem; color: var(--color-neutral-400); margin-top: 0.25rem; }
    .settings-pane {
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
    }
    .section-title { font-size: 1.1rem; font-weight: 600; color: var(--color-neutral-100); border-bottom: 1px solid var(--border-soft); padding-bottom: 0.75rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-neutral-300); margin-bottom: 0.5rem; }
    .theme-selector { display: flex; gap: 0.75rem; }
    .theme-option {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.6rem 1.25rem; border-radius: var(--radius-lg);
      background: var(--color-surface-800); border: 1px solid var(--border-soft);
      color: var(--color-neutral-300); font-weight: 500; cursor: pointer;
      transition: all 0.2s ease;
    }
    .theme-option.active {
      background: var(--color-brand-600); border-color: var(--color-brand-500); color: white;
    }
    .checkbox-input { width: 1.1rem; height: 1.1rem; accent-color: var(--color-brand-500); cursor: pointer; }
    .mt-4 { margin-top: 1rem; }
    .mt-8 { margin-top: 2rem; }
    .mb-8 { margin-bottom: 2rem; }
    .p-6 { padding: 1.5rem; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-end { justify-content: flex-end; }
    .gap-3 { gap: 0.75rem; }
  `]
})
export class WorkspaceSettingsComponent {
  readonly themeSvc = inject(ThemeService);
  readonly featureSvc = inject(FeatureService);
  readonly autoSave = signal(true);
  readonly notifications = signal(true);

  onSubmit(e: Event): void {
    e.preventDefault();
    console.log('[Acklet Settings] Saved preferences.');
  }
}
