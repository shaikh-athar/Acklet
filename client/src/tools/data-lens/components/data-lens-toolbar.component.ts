import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-toolbar',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <header class="app-shell-nav">
      <!-- Left side: Clean Brand Breadcrumb with DataLens Motif -->
      <div class="header-left-group">
        <div class="brand-breadcrumb">
          <span class="brand-root">Acklet</span>
          <span class="breadcrumb-separator">/</span>
          <app-icon name="search" class="icon-xs text-brand-400 brand-lens-icon"></app-icon>
          <span class="tool-name">DataLens</span>
        </div>
      </div>

      <!-- Center: Feature Tabs Navigation (Format & Compare) -->
      <div class="header-center-nav">
        <div class="nav-tabs-pill-group">
          <button class="nav-tab-btn" [class.active]="!isDiffMode()" (click)="tabSelect.emit('formatted')">
            <app-icon name="file-code" class="icon-xs"></app-icon>
            <span>Format</span>
          </button>
          <button class="nav-tab-btn diff-highlight-tab-btn" [class.active]="isDiffMode()" (click)="diffToggle.emit()">
            <app-icon name="git-diff" class="icon-xs"></app-icon>
            <span>Compare</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensToolbarComponent {
  hasRepairedJson = input<boolean>(false);
  wordWrap = input<boolean>(true);
  sortKeys = input<boolean>(false);
  theme = input<'light' | 'dark' | 'system'>('light');
  isFullscreen = input<boolean>(false);
  activeTab = input<string>('formatted');
  activeFormat = input<string>('json');
  isDiffMode = input<boolean>(false);

  toggleTheme = output<void>();
  historyClick = output<void>();
  commandPaletteClick = output<void>();
  toggleFullscreen = output<void>();
  tabSelect = output<string>();
  diffToggle = output<void>();

  showMoreMenu = signal<boolean>(false);

  readonly isSecondaryActive = computed(() => {
    const tab = this.activeTab();
    return tab === 'graph' || tab === 'stats' || tab === 'codegen';
  });
}
