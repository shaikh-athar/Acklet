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
      <span class="ts-theme-icon-stage" aria-hidden="true">
        <ts-icon 
          name="sun" 
          [size]="16" 
          class="ts-theme-icon sun-icon"
          [class.active]="themeService.effectiveTheme() === 'dark'"
        />
        <ts-icon 
          name="moon" 
          [size]="16" 
          class="ts-theme-icon moon-icon"
          [class.active]="themeService.effectiveTheme() === 'light'"
        />
      </span>
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
      position: relative;
      transition: background-color 200ms var(--ts-ease, cubic-bezier(0.22, 1, 0.36, 1)),
                  color 200ms var(--ts-ease, cubic-bezier(0.22, 1, 0.36, 1));
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

    .ts-theme-icon-stage {
      position: relative;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ts-theme-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: rotate(-90deg) scale(0.7);
      transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1),
                  transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
    }

    .ts-theme-icon.active {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-theme-icon {
        transform: none !important;
        transition: opacity 150ms ease !important;
      }
    }
  `]
})
export class TsThemeToggleComponent {
  readonly themeService = inject(ToolThemeService);
}
