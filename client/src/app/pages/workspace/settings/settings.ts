// client/src/app/pages/workspace/settings/settings.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

@Component({
  selector: 'app-workspace-settings',
  standalone: true,
  imports: [CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="settings-root page-enter">
      <header class="mb-8">
        <h1 class="page-title">Workspace Settings</h1>
        <p class="page-subtitle">Configure your default settings, keyboard bindings, and security settings.</p>
      </header>

      <div class="settings-layout">
        <!-- Settings Panel -->
        <div class="settings-pane p-6">
          <form (submit)="onSubmit($event)" class="settings-form">
            
            <!-- Preferences Section -->
            <div class="section-block">
              <h2 class="section-title">Editor Preferences</h2>
              <div class="form-group mt-4">
                <label class="form-label" for="tab-size">Default Tab Size</label>
                <select id="tab-size" class="input">
                  <option value="2">2 Spaces</option>
                  <option value="4">4 Spaces</option>
                  <option value="tab">Tabs</option>
                </select>
              </div>
              <div class="form-group mt-4">
                <label class="checkbox-label">
                  <input type="checkbox" checked />
                  <span>Auto-close Brackets and Quotes</span>
                </label>
              </div>
            </div>

            <!-- Security Section -->
            <div class="section-block mt-8">
              <h2 class="section-title">Security & Storage</h2>
              <div class="form-group mt-4">
                <label class="form-label" for="clear-timer">Auto-clear run history</label>
                <select id="clear-timer" class="input">
                  <option value="1">After 1 minute</option>
                  <option value="5">After 5 minutes</option>
                  <option value="never">Never (keep history logs locally)</option>
                </select>
              </div>
              <div class="form-group mt-4">
                <label class="checkbox-label">
                  <input type="checkbox" checked />
                  <span>Disable analytics tracking (Always active in Acklet)</span>
                </label>
              </div>
            </div>

            <button type="submit" class="btn btn-primary mt-8">Save Settings</button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-root { min-height: 100vh; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .settings-layout { max-width: 650px; }
    .settings-pane { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    
    .section-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); border-bottom: 1px solid var(--border-soft); padding-bottom: 0.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.78rem; font-weight: 600; color: var(--color-neutral-400); }
    
    .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--color-neutral-300); cursor: pointer; }
    
    .mt-4 { margin-top: 1rem; }
    .mt-8 { margin-top: 2rem; }
    .mb-8 { margin-bottom: 2rem; }
  `],
})
export class WorkspaceSettingsComponent {
  onSubmit(e: Event): void {
    e.preventDefault();
    alert('Settings preferences updated successfully.');
  }
}
