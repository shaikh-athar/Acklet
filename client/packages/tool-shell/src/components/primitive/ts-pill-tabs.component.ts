// packages/tool-shell/src/components/primitive/ts-pill-tabs.component.ts
import { 
  Component, 
  input, 
  output, 
  signal, 
  ElementRef, 
  viewChild, 
  viewChildren, 
  AfterViewInit, 
  OnChanges, 
  SimpleChanges, 
  OnDestroy,
  NgZone,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PillTabItem {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'ts-pill-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-pill-tabs-wrapper">
      <div class="ts-pill-tabs-container" #scrollContainer (scroll)="onContainerScroll()">
        <nav class="ts-pill-tabs-nav" role="tablist" [attr.aria-label]="ariaLabel()" #navEl>
          <!-- Sliding Active Indicator -->
          <div 
            class="ts-pill-active-indicator"
            [class.is-ready]="isIndicatorReady()"
            [style.transform]="indicatorTransform()"
            [style.width.px]="indicatorWidth()"
            aria-hidden="true"
          ></div>

          @for (tab of tabs(); track tab.id; let idx = $index) {
            <button
              type="button"
              role="tab"
              #tabButtons
              class="ts-pill-tab-btn"
              [class.active]="activeTabId() === tab.id"
              [attr.aria-selected]="activeTabId() === tab.id"
              [attr.tabindex]="activeTabId() === tab.id ? 0 : -1"
              (click)="selectTab(tab.id)"
              (keydown)="onKeyDown($event, idx)"
            >
              <span class="ts-pill-label">{{ tab.label }}</span>
              @if (tab.count !== undefined) {
                <span class="ts-pill-count">({{ tab.count }})</span>
              }
            </button>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .ts-pill-tabs-wrapper {
      position: relative;
      width: 100%;
      display: flex;
    }
    .ts-pill-tabs-container {
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
      display: flex;
    }
    .ts-pill-tabs-container::-webkit-scrollbar {
      display: none;
    }
    .ts-pill-tabs-nav {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: transparent;
      user-select: none;
      isolation: isolate;
      white-space: nowrap;
      min-width: min-content;
    }
    
    /* Sliding Indicator matching reference pill button look */
    .ts-pill-active-indicator {
      position: absolute;
      top: 4px;
      left: 0;
      height: calc(100% - 8px);
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #EFEFEF);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
                  width 260ms cubic-bezier(0.22, 1, 0.36, 1),
                  opacity 150ms ease;
    }
    [data-theme="dark"] .ts-pill-active-indicator {
      background: #27272A;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }
    .ts-pill-active-indicator.is-ready {
      opacity: 1;
    }

    .ts-pill-tab-btn {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 8px 16px;
      min-height: 40px;
      font-family: var(--ts-font-sans, "DM Sans", sans-serif);
      font-size: 13.5px;
      font-weight: 500;
      border-radius: var(--ts-radius-full, 9999px);
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      scroll-snap-align: start;
      flex-shrink: 0;
      transition: color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .ts-pill-tab-btn:hover:not(.active) {
      color: var(--text, #09090B);
      background: var(--surface-hover, rgba(0, 0, 0, 0.04));
    }
    [data-theme="dark"] .ts-pill-tab-btn:hover:not(.active) {
      color: var(--text, #FCFCFC);
      background: rgba(255, 255, 255, 0.05);
    }
    .ts-pill-tab-btn.active {
      color: var(--text, #09090B);
      font-weight: 600;
    }
    [data-theme="dark"] .ts-pill-tab-btn.active {
      color: #FCFCFC;
    }
    .ts-pill-tab-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
      z-index: 3;
    }
    .ts-pill-count {
      opacity: 0.75;
      font-size: 11.5px;
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-pill-active-indicator {
        transition: none !important;
      }
    }
  `]
})
export class TsPillTabsComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly zone = inject(NgZone);

  readonly tabs = input.required<PillTabItem[]>();
  readonly activeTabId = input.required<string>();
  readonly ariaLabel = input<string>('Filter options');
  readonly tabChange = output<string>();

  readonly navEl = viewChild<ElementRef<HTMLElement>>('navEl');
  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButtons');

  readonly indicatorWidth = signal<number>(0);
  readonly indicatorTransform = signal<string>('translateX(0px)');
  readonly isIndicatorReady = signal<boolean>(false);

  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.updateIndicator(true);

    if (typeof window !== 'undefined' && 'ResizeObserver' in window && this.navEl()) {
      this.resizeObserver = new ResizeObserver(() => {
        this.zone.run(() => this.updateIndicator(false));
      });
      this.resizeObserver.observe(this.navEl()!.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeTabId'] || changes['tabs']) {
      setTimeout(() => this.updateIndicator(false), 0);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onContainerScroll(): void {
    this.updateIndicator(false);
  }

  selectTab(id: string): void {
    if (id !== this.activeTabId()) {
      this.tabChange.emit(id);
    }
  }

  onKeyDown(event: KeyboardEvent, currentIndex: number): void {
    const buttons = this.tabButtons();
    if (!buttons || buttons.length === 0) return;

    let targetIdx = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      targetIdx = (currentIndex + 1) % buttons.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      targetIdx = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      targetIdx = 0;
    } else if (event.key === 'End') {
      targetIdx = buttons.length - 1;
    }

    if (targetIdx !== -1) {
      event.preventDefault();
      const targetBtn = buttons[targetIdx].nativeElement;
      targetBtn.focus();
      const tab = this.tabs()[targetIdx];
      if (tab) {
        this.selectTab(tab.id);
      }
    }
  }

  private updateIndicator(instant = false): void {
    const nav = this.navEl()?.nativeElement;
    const buttons = this.tabButtons();
    if (!nav || !buttons) return;

    const currentId = this.activeTabId();
    const activeBtnIndex = this.tabs().findIndex(t => t.id === currentId);
    if (activeBtnIndex === -1 || !buttons[activeBtnIndex]) {
      this.isIndicatorReady.set(false);
      return;
    }

    const btn = buttons[activeBtnIndex].nativeElement;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const left = btnRect.left - navRect.left;
    const width = btnRect.width;

    this.indicatorWidth.set(width);
    this.indicatorTransform.set(`translateX(${left}px)`);
    this.isIndicatorReady.set(true);

    try {
      btn.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    } catch (e) {}
  }
}

