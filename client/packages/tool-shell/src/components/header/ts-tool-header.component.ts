// packages/tool-shell/src/components/header/ts-tool-header.component.ts
import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';

@Component({
  selector: 'ts-tool-header',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsTooltipDirective],
  template: `
    @if (tool(); as currentTool) {
      <header class="ts-tool-header-root" role="region" [attr.aria-label]="currentTool.name + ' header'">
        <!-- Soft Accent-Tinted Ambient Strip -->
        <div class="ts-header-tint-strip" aria-hidden="true"></div>

        <div class="ts-header-inner">
          <!-- Left: 56px Icon Tile + Titles -->
          <div class="ts-header-left">
            <div class="ts-header-icon-tile" aria-hidden="true">
              <ts-icon [name]="currentTool.icon" [size]="28" class="ts-header-icon" />
            </div>

            <div class="ts-header-text">
              <div class="ts-header-title-row">
                <h1 class="ts-header-title">{{ currentTool.name }}</h1>
                @if (currentTool.badge) {
                  <span class="ts-header-badge">{{ currentTool.badge }}</span>
                }
              </div>
              @if (currentTool.shortDescription) {
                <p class="ts-header-description">{{ currentTool.shortDescription }}</p>
              }
            </div>
          </div>

          <!-- Right: Small Outline Actions (Copy Link, Favorite, About) -->
          <div class="ts-header-actions" role="toolbar" aria-label="Tool actions">
            <!-- Share / Copy Link -->
            <button 
              type="button" 
              class="ts-header-action-btn"
              (click)="copyShareLink()"
              [attr.aria-label]="copiedLink() ? 'Link copied to clipboard' : 'Copy link to tool'"
              [tsTooltip]="copiedLink() ? 'Copied!' : 'Copy link'"
            >
              <ts-icon [name]="copiedLink() ? 'check' : 'link'" [size]="16" />
              <span class="ts-action-btn-text">{{ copiedLink() ? 'Copied' : 'Share' }}</span>
            </button>

            <!-- Favorite / Bookmark -->
            <button 
              type="button" 
              class="ts-header-action-btn"
              [class.is-favorited]="isFavorited()"
              (click)="toggleFavorite()"
              [attr.aria-label]="isFavorited() ? 'Remove from favorites' : 'Add to favorites'"
              [tsTooltip]="isFavorited() ? 'Favorited' : 'Favorite'"
            >
              <ts-icon [name]="isFavorited() ? 'star' : 'star'" [size]="16" class="ts-star-icon" />
              <span class="ts-action-btn-text hide-sm">{{ isFavorited() ? 'Saved' : 'Save' }}</span>
            </button>

            <!-- About / Info Drawer Trigger -->
            <button 
              type="button" 
              class="ts-header-action-btn"
              (click)="openAbout.emit()"
              aria-label="About this tool"
              tsTooltip="About this tool"
            >
              <ts-icon name="info" [size]="16" />
              <span class="ts-action-btn-text hide-sm">About</span>
            </button>
          </div>
        </div>
      </header>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-tool-header-root {
      position: relative;
      width: 100%;
      border-radius: var(--ts-radius-card, 20px);
      user-select: none;
    }

    .ts-header-tint-strip {
      display: none;
    }

    .ts-header-inner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 16px 20px;
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-card, 20px);
      background: var(--ts-surface-raised, #FFFFFF);
      box-shadow: var(--ts-surface-raised-shadow);
    }

    .ts-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      flex: 1;
    }

    /* Icon Tile: 56px, radius 16, accent-soft background, accent-strong icon */
    .ts-header-icon-tile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      min-width: 56px;
      min-height: 56px;
      border-radius: var(--ts-radius-inner, 16px);
      background: var(--accent-soft);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: box-shadow 220ms ease;
    }

    .ts-header-card:hover .ts-header-icon-tile {
      box-shadow: 0 0 0 6px var(--accent-soft), 0 8px 24px -8px var(--accent-glow);
    }

    .ts-header-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .ts-header-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Page title: 28/34 weight 650; Letter-spacing -0.02em, color --text */
    .ts-header-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: var(--ts-type-page-title-size, 28px);
      line-height: var(--ts-type-page-title-lh, 34px);
      font-weight: var(--ts-type-page-title-weight, 650);
      letter-spacing: var(--ts-type-page-title-tracking, -0.02em);
      color: var(--text, #09090B);
      margin: 0;
    }

    .ts-header-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--ts-radius-full, 9999px);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--accent-soft);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
    }

    /* Description: 15/24, color --text-2 */
    .ts-header-description {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: var(--ts-type-description-size, 15px);
      line-height: var(--ts-type-description-lh, 24px);
      color: var(--text-2, #52525B);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Right: Small outline actions */
    .ts-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .ts-header-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 12px;
      border-radius: var(--ts-radius-control, 12px);
      background: transparent;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717A);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: background-color 150ms ease,
                  color 150ms ease,
                  transform 100ms ease;
    }

    :host-context([data-theme="dark"]) .ts-header-action-btn {
      border-color: var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #A1A1AA);
    }

    .ts-header-action-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
      border-color: transparent;
    }

    :host-context([data-theme="dark"]) .ts-header-action-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: var(--text, #FCFCFC);
      border-color: transparent;
    }

    .ts-header-action-btn:active {
      transform: scale(0.97);
    }

    .ts-header-action-btn:focus-visible {
      outline: 2px solid var(--accent, #0F766E) !important;
      outline-offset: 2px;
    }

    .ts-header-action-btn.is-favorited {
      color: #EAB308;
    }

    .ts-header-action-btn.is-favorited .ts-star-icon {
      fill: #EAB308;
    }

    @media (max-width: 640px) {
      .ts-header-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        padding: 14px;
      }
      .ts-header-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .ts-header-description {
        white-space: normal;
      }
    }
  `]
})
export class TsToolHeaderComponent {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly openAbout = output<void>();

  readonly copiedLink = signal<boolean>(false);
  readonly isFavorited = signal<boolean>(false);

  copyShareLink(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const url = window.location.href.split('#')[0];
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    }).catch(() => {});
  }

  toggleFavorite(): void {
    this.isFavorited.update(v => !v);
  }
}
