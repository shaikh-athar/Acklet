// packages/tool-shell/src/components/primitive/ts-spotlight-card.component.ts
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsSpotlightDirective } from '../../directives/ts-spotlight.directive';
import { TsRevealDirective } from '../../directives/ts-reveal.directive';

@Component({
  selector: 'ts-spotlight-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsSpotlightDirective, TsRevealDirective],
  template: `
    @if (isComingSoon()) {
      <div 
        class="ts-card-link is-disabled" 
        [attr.aria-disabled]="true"
        tsReveal
        [revealIndex]="revealIndex()"
        [attr.title]="tool().name + ' (Coming Soon)'"
      >
        <!-- 48px Icon Tile -->
        <div class="ts-card-icon-tile">
          @if (tool().icon) {
            <ts-icon [name]="tool().icon!" [size]="24" class="ts-tile-icon" />
          } @else {
            <span class="ts-tile-fallback">{{ fallbackChar() }}</span>
          }
        </div>

        <!-- Text Stack: Title + Description -->
        <div class="ts-card-text-stack">
          <h3 class="ts-card-title">{{ tool().name }}</h3>
          <p class="ts-card-description">{{ tool().shortDescription }}</p>
        </div>
      </div>
    } @else {
      <a 
        #cardLink
        [href]="toolUrl()" 
        class="ts-card-link"
        tsSpotlight
        tsReveal
        [revealIndex]="revealIndex()"
        [attr.data-tool-slug]="tool().slug"
        (click)="onCardClick($event, cardLink)"
      >
        <!-- 48px Icon Tile -->
        <div class="ts-card-icon-tile">
          @if (tool().icon) {
            <ts-icon [name]="tool().icon!" [size]="24" class="ts-tile-icon" />
          } @else {
            <span class="ts-tile-fallback">{{ fallbackChar() }}</span>
          }
        </div>

        <!-- Text Stack: Title (Nunito 18px semibold) + Description (Nunito 14-15px, up to 3 lines) -->
        <div class="ts-card-text-stack">
          <h3 class="ts-card-title">{{ tool().name }}</h3>
          <p class="ts-card-description">{{ tool().shortDescription }}</p>
        </div>
      </a>
    }
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .ts-card-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 100%;
      height: 100%;
      padding: 28px 24px;
      border-radius: 16px;
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      text-decoration: none;
      color: var(--text, #0D0D0D);
      position: relative;
      overflow: hidden;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      outline: none;
      transition: transform var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  box-shadow var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  border-color var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  background-color var(--ts-dur-hover, 220ms) var(--ts-ease-out);
    }

    .ts-card-link.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* 48px rounded-square (12px radius) icon tile with 24px icon */
    .ts-card-icon-tile {
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
      border-radius: 12px;
      background: var(--accent-soft, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text, #0D0D0D);
      margin-bottom: 16px;
      transition: background-color var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  border-color var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  color var(--ts-dur-hover, 220ms) var(--ts-ease-out);
      position: relative;
      z-index: 2;
    }

    /* Exact hover rule: SOLID black/white fill with inverted icon */
    @media (hover: hover) and (pointer: fine) {
      .ts-card-link:hover .ts-card-icon-tile {
        background: var(--text, #0D0D0D) !important;
        border-color: var(--text, #0D0D0D) !important;
        color: var(--bg, #FFFFFF) !important;
      }
    }

    .ts-card-link:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }

    .ts-tile-fallback {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      color: inherit;
    }

    /* Text Stack */
    .ts-card-text-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
      flex: 1;
      position: relative;
      z-index: 2;
    }

    .ts-card-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #0D0D0D);
      line-height: 1.3;
      margin: 0;
      letter-spacing: var(--ts-tracking-tight);
    }

    .ts-card-description {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14.5px;
      line-height: 1.5;
      color: var(--text-muted, #6B6B6B);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-height: 4.5em;
    }
  `]
})
export class TsSpotlightCardComponent {
  readonly tool = input.required<ToolRegistryItem>();
  readonly revealIndex = input<number>(0);
  readonly rowClick = output<{ tool: ToolRegistryItem; rect: DOMRect; mouseEvent: MouseEvent }>();

  readonly isComingSoon = computed(() => this.tool().status === 'coming-soon');
  readonly toolUrl = computed(() => getToolUrl(this.tool().slug));
  readonly fallbackChar = computed(() => (this.tool().name ? this.tool().name.charAt(0) : 'T'));

  onCardClick(event: MouseEvent, cardEl: HTMLElement): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const rect = cardEl.getBoundingClientRect();
    this.rowClick.emit({
      tool: this.tool(),
      rect,
      mouseEvent: event
    });
  }
}
