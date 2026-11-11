// apps/tool-color-studio/src/components/palette/theme-card.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiTheme, SemanticToken } from '../../models/theme.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-theme-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="theme-card" 
      [class.dark-theme]="theme.mode === 'dark'" 
      [class.saved-card]="isSaved || theme.favorite"
      [class.just-saved]="justSaved()"
      (click)="onCardClick($event)"
      role="button"
      tabindex="0"
      (keydown.enter)="onCardClick($event)"
      (keydown.space)="$event.preventDefault(); onCardClick($event)"
      [attr.aria-label]="'View ' + theme.name + ' color palette'"
    >
      
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-info">
          <div class="name-row">
            <h3 class="theme-name" [title]="theme.name">{{ theme.name }}</h3>
          </div>
          <div class="meta-row">
            <span class="category-tag">{{ theme.category }}</span>
            <span class="style-dot">•</span>
            <span class="style-tag">{{ theme.style }}</span>
          </div>
        </div>

        <div class="header-badges-actions">
          <span *ngIf="isSaved || theme.favorite" class="saved-pill-badge" title="Saved to your library">
            <ts-icon name="bookmark" [size]="10" />
            <span>Saved</span>
          </span>
          <span class="mode-badge" [class.dark]="theme.mode === 'dark'">
            {{ theme.mode === 'dark' ? 'Dark' : 'Light' }}
          </span>
        </div>
      </div>

      <!-- Color Composition Swatches -->
      <div class="swatches-strip" title="Key semantic colors">
        <div 
          *ngFor="let swatch of keySwatches()" 
          class="swatch-dot"
          [style.background-color]="swatch.hex"
          [title]="swatch.name + ': ' + swatch.hex"
        ></div>
      </div>

      <!-- Realistic Micro-UI Preview -->
      <div class="micro-preview-container" [style]="previewCssVars()">
        <div class="micro-preview-window">
          <!-- Mini Topbar -->
          <div class="mini-topbar">
            <div class="mini-logo-dot"></div>
            <div class="mini-search-pill"></div>
            <div class="mini-avatar-dot"></div>
          </div>

          <!-- Mini Body (Sidebar + Content) -->
          <div class="mini-body">
            <!-- Mini Sidebar -->
            <div class="mini-sidebar">
              <div class="mini-nav-item active"></div>
              <div class="mini-nav-item"></div>
              <div class="mini-nav-item"></div>
            </div>

            <!-- Mini Dashboard Main -->
            <div class="mini-content">
              <!-- Metric Row -->
              <div class="mini-metric-card">
                <div class="mini-metric-title"></div>
                <div class="mini-metric-val"></div>
                <div class="mini-metric-chart">
                  <span class="chart-bar" style="height: 40%"></span>
                  <span class="chart-bar" style="height: 70%"></span>
                  <span class="chart-bar primary" style="height: 100%"></span>
                  <span class="chart-bar" style="height: 55%"></span>
                </div>
              </div>

              <!-- Mini Action Row -->
              <div class="mini-action-row">
                <div class="mini-btn-primary">
                  <span>Action</span>
                </div>
                <div class="mini-btn-secondary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="card-footer">
        <button 
          type="button" 
          class="action-btn view-btn"
          (click)="view.emit(theme)"
          title="Open complete color system & live playground"
        >
          <ts-icon name="eye" [size]="13" />
          <span>View Theme</span>
        </button>

        <div class="secondary-actions">
          <button 
            type="button" 
            class="action-btn icon-btn"
            [class.saved]="isSaved || theme.favorite"
            (click)="onSave($event)"
            [title]="(isSaved || theme.favorite) ? 'Saved in library (click to unsave)' : 'Save theme to library'"
            aria-label="Save theme"
          >
            <ts-icon name="bookmark" [size]="13" />
          </button>

          <button 
            type="button" 
            class="action-btn icon-btn"
            (click)="onExport($event)"
            title="Export theme tokens"
            aria-label="Export theme"
          >
            <ts-icon name="download" [size]="13" />
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .theme-card {
      display: flex;
      flex-direction: column;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      border-radius: 14px;
      padding: 16px;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  background 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      cursor: pointer;
      user-select: none;
    }

    .theme-card:hover {
      border-color: var(--border-strong, #cbd5e1);
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.1);
      transform: translateY(-3px);
    }

    .theme-card:active {
      transform: translateY(-1px) scale(0.992);
    }

    .theme-card:focus-visible {
      outline: 2px solid var(--tool-accent, #2563eb);
      outline-offset: 2px;
    }

    :host-context([data-theme="dark"]) .theme-card,
    :host-context(.dark) .theme-card {
      background: var(--bg-surface, #131722);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="dark"]) .theme-card:hover,
    :host-context(.dark) .theme-card:hover {
      border-color: var(--border-strong, rgba(255, 255, 255, 0.18));
      box-shadow: 0 8px 20px -3px rgba(0, 0, 0, 0.5);
    }

    .theme-card.saved-card {
      border-color: rgba(37, 99, 235, 0.45);
      background: linear-gradient(180deg, rgba(239, 246, 255, 0.6) 0%, var(--bg-surface, #ffffff) 45%);
      box-shadow: 0 0 0 1.5px rgba(37, 99, 235, 0.25), 0 6px 18px -2px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .theme-card.saved-card,
    :host-context(.dark) .theme-card.saved-card {
      border-color: rgba(96, 165, 250, 0.45);
      background: linear-gradient(180deg, rgba(30, 58, 138, 0.22) 0%, var(--bg-surface, #131722) 45%);
      box-shadow: 0 0 0 1.5px rgba(96, 165, 250, 0.3), 0 8px 22px -2px rgba(0, 0, 0, 0.45);
    }

    @keyframes saved-card-pulse {
      0% {
        transform: scale(0.98);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6);
      }
      50% {
        transform: scale(1.02);
        box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.25), 0 10px 25px -3px rgba(37, 99, 235, 0.2);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 1.5px rgba(37, 99, 235, 0.25), 0 6px 18px -2px rgba(37, 99, 235, 0.12);
      }
    }

    .theme-card.just-saved {
      animation: saved-card-pulse 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Header */
    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .header-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .name-row {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .theme-name {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    :host-context([data-theme="dark"]) .theme-name,
    :host-context(.dark) .theme-name {
      color: var(--text-primary, #f8fafc);
    }

    .header-badges-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .mode-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      background: rgba(148, 163, 184, 0.15);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      color: var(--text-secondary, #475569);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
    }

    :host-context([data-theme="dark"]) .mode-badge,
    :host-context(.dark) .mode-badge {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary, #94a3b8);
    }

    .mode-badge.dark {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.28);
      color: #818cf8;
    }

    @keyframes badge-pop-in {
      0% {
        transform: scale(0.65) translateY(-3px);
        opacity: 0;
      }
      60% {
        transform: scale(1.15) translateY(0);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .saved-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 3.5px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      background: rgba(37, 99, 235, 0.12);
      border: 1px solid rgba(37, 99, 235, 0.3);
      color: #2563eb;
      letter-spacing: 0.03em;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
      animation: badge-pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .saved-pill-badge,
    :host-context(.dark) .saved-pill-badge {
      background: rgba(37, 99, 235, 0.22);
      border-color: rgba(96, 165, 250, 0.4);
      color: #60a5fa;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .category-tag {
      color: var(--text-secondary, #475569);
    }

    :host-context([data-theme="dark"]) .category-tag,
    :host-context(.dark) .category-tag {
      color: var(--text-secondary, #94a3b8);
    }

    .style-dot {
      opacity: 0.5;
    }

    .style-tag {
      text-transform: capitalize;
    }

    .export-icon-btn {
      background: transparent;
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      padding: 5px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-muted, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .export-icon-btn,
    :host-context(.dark) .export-icon-btn {
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94a3b8);
    }

    .export-icon-btn:hover {
      color: var(--tool-accent, #2563eb);
      border-color: var(--tool-accent, #2563eb);
      background: rgba(37, 99, 235, 0.08);
    }

    /* Swatches Strip */
    .swatches-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      padding: 3px 0;
    }

    .swatch-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .swatch-dot:hover {
      transform: scale(1.25);
      z-index: 2;
    }

    /* Realistic Micro-UI Preview */
    .micro-preview-container {
      width: 100%;
      height: 130px;
      border-radius: 10px;
      border: 1px solid var(--theme-border, #e2e8f0);
      background: var(--theme-background, #f8fafc);
      overflow: hidden;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      position: relative;
      user-select: none;
    }

    .micro-preview-window {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .mini-topbar {
      height: 24px;
      background: var(--theme-surface, #ffffff);
      border-bottom: 1px solid var(--theme-border-subtle, #f1f5f9);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      flex-shrink: 0;
    }

    .mini-logo-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--theme-primary, #2563eb);
    }

    .mini-search-pill {
      width: 60px;
      height: 8px;
      border-radius: 999px;
      background: var(--theme-background-secondary, #f1f5f9);
    }

    .mini-avatar-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--theme-accent, #ec4899);
    }

    .mini-body {
      flex: 1;
      display: flex;
      min-height: 0;
    }

    .mini-sidebar {
      width: 32px;
      background: var(--theme-background-secondary, #f1f5f9);
      border-right: 1px solid var(--theme-border-subtle, #e2e8f0);
      padding: 8px 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .mini-nav-item {
      height: 6px;
      border-radius: 3px;
      background: var(--theme-border, #cbd5e1);
    }

    .mini-nav-item.active {
      background: var(--theme-primary, #2563eb);
    }

    .mini-content {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .mini-metric-card {
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border-subtle, #e2e8f0);
      border-radius: 6px;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .mini-metric-title {
      width: 36px;
      height: 5px;
      border-radius: 2px;
      background: var(--theme-text-muted, #94a3b8);
    }

    .mini-metric-val {
      width: 24px;
      height: 8px;
      border-radius: 2px;
      background: var(--theme-text-primary, #0f172a);
    }

    .mini-metric-chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 16px;
    }

    .chart-bar {
      width: 4px;
      border-radius: 1px 1px 0 0;
      background: var(--theme-border-strong, #94a3b8);
    }

    .chart-bar.primary {
      background: var(--theme-primary, #2563eb);
    }

    .mini-action-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mini-btn-primary {
      background: var(--theme-primary, #2563eb);
      color: var(--theme-text-inverse, #ffffff);
      height: 18px;
      padding: 0 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
    }

    .mini-btn-secondary {
      flex: 1;
      height: 18px;
      border-radius: 4px;
      border: 1px solid var(--theme-border, #cbd5e1);
      background: var(--theme-surface, #ffffff);
    }

    /* Footer */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.6));
    }

    :host-context([data-theme="dark"]) .card-footer,
    :host-context(.dark) .card-footer {
      border-top-color: var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 7px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: transparent;
      color: var(--text-primary, #0f172a);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .action-btn,
    :host-context(.dark) .action-btn {
      color: var(--text-primary, #f8fafc);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .action-btn:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));
      border-color: var(--border-strong, #cbd5e1);
    }

    :host-context([data-theme="dark"]) .action-btn:hover,
    :host-context(.dark) .action-btn:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .view-btn {
      flex: 1;
      justify-content: center;
      background: var(--btn-secondary-bg, rgba(241, 245, 249, 0.7));
      border-color: transparent;
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .view-btn,
    :host-context(.dark) .view-btn {
      background: rgba(255, 255, 255, 0.06);
    }

    .view-btn:focus-visible,
    .action-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563eb);
      outline-offset: 1px;
    }

    .secondary-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-btn {
      padding: 6px 8px;
    }

    @keyframes bookmark-pop {
      0% { transform: scale(0.8); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    .icon-btn.saved {
      color: #ffffff;
      background: #2563eb;
      border-color: #2563eb;
      animation: bookmark-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .icon-btn.saved,
    :host-context(.dark) .icon-btn.saved {
      color: #ffffff;
      background: #2563eb;
      border-color: #3b82f6;
    }
  `]
})
export class ThemeCardComponent {
  @Input({ required: true }) theme!: UiTheme;
  @Input() isSaved: boolean = false;

  @Output() view = new EventEmitter<UiTheme>();
  @Output() apply = new EventEmitter<UiTheme>();
  @Output() save = new EventEmitter<UiTheme>();
  @Output() export = new EventEmitter<UiTheme>();
  @Output() toggleFavorite = new EventEmitter<string>();

  public justSaved = signal<boolean>(false);

  public onCardClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target?.closest && target.closest('button')) {
      return;
    }
    this.view.emit(this.theme);
  }

  public keySwatches = computed(() => {
    if (!this.theme || !this.theme.tokens) return [];
    const keys = [
      '--color-primary',
      '--color-secondary',
      '--color-accent',
      '--color-background',
      '--color-surface',
      '--color-text-primary'
    ];
    return keys
      .map(k => this.theme.tokens.find(t => t.key === k))
      .filter((t): t is SemanticToken => !!t);
  });

  public previewCssVars = computed(() => {
    if (!this.theme || !this.theme.tokens) return '';
    const styleStrings = this.theme.tokens.map(t => {
      const varName = t.key.replace('--color-', '--theme-');
      return `${varName}: ${t.hex};`;
    });
    return styleStrings.join(' ');
  });

  public onExport(event: MouseEvent): void {
    event.stopPropagation();
    this.export.emit(this.theme);
  }

  public onSave(event: MouseEvent): void {
    event.stopPropagation();
    this.justSaved.set(true);
    setTimeout(() => this.justSaved.set(false), 600);
    this.save.emit(this.theme);
  }

  public onToggleFavorite(event: MouseEvent): void {
    event.stopPropagation();
    this.toggleFavorite.emit(this.theme.id);
  }
}

