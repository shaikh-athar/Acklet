import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';

export interface JsonLensSettings {
  indent: number | string;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoValidate: boolean;
  formatOnPaste: boolean;
  theme: 'dark' | 'light' | 'system';
  enableHistory: boolean;
}

@Component({
  selector: 'app-json-lens-settings-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="settings-drawer-overlay" (click)="closeDrawer.emit()">
        <div class="settings-drawer" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="drawer-header">
            <div class="drawer-title-group">
              <h3>Workspace Settings</h3>
              <span class="settings-subtitle">Configure editor behavior & preferences</span>
            </div>
            <button class="icon-nav-btn" (click)="closeDrawer.emit()">
              <app-icon name="close" class="icon-xs"></app-icon>
            </button>
          </div>

          <!-- Body -->
          <div class="drawer-content">
            <!-- Theme Section (Section 42) -->
            <div class="settings-section">
              <div class="section-title">
                <app-icon name="palette" class="icon-xs"></app-icon>
                Theme
              </div>
              <div class="theme-options-grid">
                <button
                  class="theme-option-btn"
                  [class.active]="settings().theme === 'system'"
                  (click)="updateTheme('system')"
                >
                  System
                </button>
                <button
                  class="theme-option-btn"
                  [class.active]="settings().theme === 'dark'"
                  (click)="updateTheme('dark')"
                >
                  Dark
                </button>
                <button
                  class="theme-option-btn"
                  [class.active]="settings().theme === 'light'"
                  (click)="updateTheme('light')"
                >
                  Light
                </button>
              </div>
            </div>

            <!-- Editor Options (Section 43) -->
            <div class="settings-section">
              <div class="section-title">
                <app-icon name="ruler" class="icon-xs"></app-icon>
                Editor Settings
              </div>

              <!-- Indentation -->
              <div class="setting-row">
                <label class="setting-label">Default Indentation</label>
                <select class="setting-select" [ngModel]="settings().indent" (ngModelChange)="updateIndent($event)">
                  <option [ngValue]="1">1 space</option>
                  <option [ngValue]="2">2 spaces</option>
                  <option [ngValue]="3">3 spaces</option>
                  <option [ngValue]="4">4 spaces</option>
                  <option [ngValue]="'\t'">Tabs</option>
                </select>
              </div>

              <!-- Word Wrap -->
              <div class="setting-row">
                <div class="setting-text">
                  <span class="setting-label">Word Wrap</span>
                  <span class="setting-desc">Wrap long JSON lines in the input editor</span>
                </div>
                <input type="checkbox" [ngModel]="settings().wordWrap" (ngModelChange)="updateWordWrap($event)" />
              </div>

              <!-- Line Numbers -->
              <div class="setting-row">
                <div class="setting-text">
                  <span class="setting-label">Line Numbers</span>
                  <span class="setting-desc">Show gutter line numbers</span>
                </div>
                <input type="checkbox" [ngModel]="settings().lineNumbers" (ngModelChange)="updateLineNumbers($event)" />
              </div>

              <!-- Auto Validate -->
              <div class="setting-row">
                <div class="setting-text">
                  <span class="setting-label">Auto Validate</span>
                  <span class="setting-desc">Validate payload on typing with 300ms debounce</span>
                </div>
                <input type="checkbox" [ngModel]="settings().autoValidate" (ngModelChange)="updateAutoValidate($event)" />
              </div>

              <!-- Format on Paste -->
              <div class="setting-row">
                <div class="setting-text">
                  <span class="setting-label">Format on Paste</span>
                  <span class="setting-desc">Automatically format JSON when pasted</span>
                </div>
                <input type="checkbox" [ngModel]="settings().formatOnPaste" (ngModelChange)="updateFormatOnPaste($event)" />
              </div>

              <!-- Enable Local History -->
              <div class="setting-row">
                <div class="setting-text">
                  <span class="setting-label">Enable Local History</span>
                  <span class="setting-desc">Save recent payloads in IndexedDB</span>
                </div>
                <input type="checkbox" [ngModel]="settings().enableHistory" (ngModelChange)="updateEnableHistory($event)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensSettingsDrawerComponent {
  isOpen = input<boolean>(false);
  settings = input<JsonLensSettings>({
    indent: 2,
    wordWrap: true,
    lineNumbers: true,
    autoValidate: true,
    formatOnPaste: true,
    theme: 'dark',
    enableHistory: true
  });

  closeDrawer = output<void>();
  settingsChange = output<Partial<JsonLensSettings>>();

  updateTheme(theme: 'dark' | 'light' | 'system') {
    this.settingsChange.emit({ theme });
  }

  updateIndent(indent: number | string) {
    this.settingsChange.emit({ indent });
  }

  updateWordWrap(wordWrap: boolean) {
    this.settingsChange.emit({ wordWrap });
  }

  updateLineNumbers(lineNumbers: boolean) {
    this.settingsChange.emit({ lineNumbers });
  }

  updateAutoValidate(autoValidate: boolean) {
    this.settingsChange.emit({ autoValidate });
  }

  updateFormatOnPaste(formatOnPaste: boolean) {
    this.settingsChange.emit({ formatOnPaste });
  }

  updateEnableHistory(enableHistory: boolean) {
    this.settingsChange.emit({ enableHistory });
  }
}
