// packages/tool-shell/src/components/theme/ts-theme-toggle.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolThemeService } from '../../services/tool-theme.service';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-theme-toggle',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <button 
      type="button" 
      class="ts-theme-btn" 
      (click)="themeService.toggleTheme()" 
      [attr.aria-label]="themeService.effectiveTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      title="Toggle theme"
    >
      @if (themeService.effectiveTheme() === 'dark') {
        <ts-icon name="sun" [size]="16" />
      } @else {
        <ts-icon name="moon" [size]="16" />
      }
    </button>
  `,
  styles: [`
    .ts-theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: 12px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .ts-theme-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
      border: none;
      outline: none;
    }
    .ts-theme-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }
  `]
})
export class TsThemeToggleComponent {
  readonly themeService = inject(ToolThemeService);
}
