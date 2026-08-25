import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-seo-footer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <footer class="json-lens-seo-footer">
      <div class="seo-container">
        <!-- Left: Quick Navigation Shortcuts (Cmd/Ctrl + K & History) replacing JSONLens WORKBENCH -->
        <div class="seo-footer-left">
          

          <!-- History Action -->
          <button class="footer-action-pill-btn" (click)="historyClick.emit()" data-tooltip="Open Local History (on left)">
            <app-icon name="clock" class="icon-xs"></app-icon>
            <span>History</span>
          </button>

          <!-- Command Palette Trigger -->
          <button class="footer-action-pill-btn" (click)="commandPaletteClick.emit()" data-tooltip="Open Command Palette (Cmd/Ctrl + K)">
            <app-icon name="command" class="icon-xs"></app-icon>
            <span>Cmd/Ctrl + K</span>
          </button>
        </div>

        <!-- Center: Theme Toggle & Expand Layout Action Icons in bottom center -->
        <div class="seo-footer-center">
          <div class="footer-center-controls">
            <!-- Theme Toggle Icon -->
            <button
              class="footer-icon-btn"
              (click)="toggleTheme.emit()"
              [attr.data-tooltip]="theme() === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'"
            >
              <app-icon [name]="theme() === 'light' ? 'moon' : 'sun'" class="icon-xs"></app-icon>
              <span>{{ theme() === 'light' ? 'Dark Mode' : 'Light Mode' }}</span>
            </button>

            <span class="footer-control-separator"></span>

            <!-- Expand Layout / Fullscreen Toggle Icon -->
            <button
              class="footer-icon-btn"
              (click)="toggleFullscreen.emit()"
              [attr.data-tooltip]="isFullscreen() ? 'Exit Fullscreen View (Esc / F11)' : 'Expand Layout (F11)'"
            >
              <app-icon [name]="isFullscreen() ? 'minimize-2' : 'maximize-2'" class="icon-xs"></app-icon>
              <span>{{ isFullscreen() ? 'Exit Fullscreen' : 'Expand Layout' }}</span>
            </button>
          </div>
        </div>

        <!-- Right: Feedback Option -->
        <div class="seo-footer-right">
          <button class="footer-feedback-btn" (click)="feedbackClick.emit()" data-tooltip="Send Feedback or Feature Request">
            <app-icon name="message-square" class="icon-xs text-emerald-400"></app-icon>
            <span>Feedback</span>
          </button>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensSeoFooterComponent {
  activeFormat = input<string>('json');
  theme = input<'light' | 'dark' | 'system'>('light');
  isFullscreen = input<boolean>(false);

  toggleTheme = output<void>();
  toggleFullscreen = output<void>();
  feedbackClick = output<void>();
  commandPaletteClick = output<void>();
  historyClick = output<void>();
}
