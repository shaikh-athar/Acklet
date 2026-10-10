// packages/tool-shell/src/components/tabs/ts-tabs.component.ts
import { Component, input, output, effect, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolTab } from '../../models/tool-shell.models';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-tabs',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <nav 
      class="ts-tabs-nav" 
      role="tablist" 
      aria-label="Tool sections"
      (keydown)="onKeydown($event)"
    >
      <div class="ts-tabs-scroll-wrap" #scrollWrap>
        @for (tab of tabs(); track tab.id; let i = $index) {
          <button
            #tabBtn
            type="button"
            role="tab"
            class="ts-tab-item"
            [class.active]="activeTabId() === tab.id"
            [attr.aria-selected]="activeTabId() === tab.id"
            [attr.aria-controls]="'panel-' + tab.id"
            [attr.id]="'tab-' + tab.id"
            [tabIndex]="activeTabId() === tab.id ? 0 : -1"
            (click)="selectTab(tab.id)"
          >
            @if (tab.icon) {
              <ts-icon [name]="tab.icon" [size]="14" class="ts-tab-icon" />
            }
            <span class="ts-tab-label">{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span class="ts-tab-badge">{{ tab.badge }}</span>
            }
          </button>
        }
        <!-- Animated Sliding Active Indicator Underline -->
        <div class="ts-tab-indicator" #indicator></div>
      </div>
    </nav>
  `,
  styles: [`
    .ts-tabs-nav {
      display: flex;
      align-items: center;
      height: 100%;
      overflow: hidden;
      position: relative;
    }
    .ts-tabs-scroll-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      position: relative;
    }
    .ts-tabs-scroll-wrap::-webkit-scrollbar {
      display: none;
    }
    .ts-tab-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      font-family: var(--ts-font-sans);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-radius: 9999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
      outline: none;
      user-select: none;
    }
    .ts-tab-item:hover {
      color: var(--text);
      background: var(--surface-hover);
    }
    .ts-tab-item.active {
      color: var(--text);
      font-weight: 600;
    }
    .ts-tab-badge {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 9999px;
      background: var(--accent-soft);
      color: var(--text-muted);
    }
    .ts-tab-item.active .ts-tab-badge {
      background: var(--border);
      color: var(--text);
    }
    .ts-tab-indicator {
      position: absolute;
      bottom: 0;
      height: 2px;
      background: var(--text);
      border-radius: 9999px;
      transition: transform var(--ts-dur-base) var(--ts-ease),
                  width var(--ts-dur-base) var(--ts-ease),
                  opacity var(--ts-dur-base) var(--ts-ease);
      pointer-events: none;
      opacity: 0;
      transform: translateX(0);
    }
  `]
})
export class TsTabsComponent implements AfterViewInit {
  readonly tabs = input.required<ToolTab[]>();
  readonly activeTabId = input.required<string>();
  readonly tabChange = output<string>();

  @ViewChild('indicator') indicatorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollWrap') scrollWrapRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('tabBtn') tabBtnRefs!: QueryList<ElementRef<HTMLButtonElement>>;

  constructor() {
    effect(() => {
      const activeId = this.activeTabId();
      const tabList = this.tabs();
      if (activeId && tabList.length > 0) {
        setTimeout(() => this.updateIndicator(), 10);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateIndicator(), 20);
  }

  selectTab(id: string): void {
    this.tabChange.emit(id);
  }

  onKeydown(event: KeyboardEvent): void {
    const tabsList = this.tabs();
    if (!tabsList.length) return;
    const currentIndex = tabsList.findIndex(t => t.id === this.activeTabId());

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % tabsList.length;
      this.selectTab(tabsList[nextIndex].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + tabsList.length) % tabsList.length;
      this.selectTab(tabsList[prevIndex].id);
    }
  }

  private updateIndicator(): void {
    if (!this.indicatorRef || !this.tabBtnRefs || !this.scrollWrapRef) return;
    
    const buttons = this.tabBtnRefs.toArray();
    const activeIndex = this.tabs().findIndex(t => t.id === this.activeTabId());
    
    if (activeIndex >= 0 && buttons[activeIndex]) {
      const activeButton = buttons[activeIndex].nativeElement;
      const wrapRect = this.scrollWrapRef.nativeElement.getBoundingClientRect();
      const btnRect = activeButton.getBoundingClientRect();
      
      const left = btnRect.left - wrapRect.left + this.scrollWrapRef.nativeElement.scrollLeft;
      const width = btnRect.width;

      const ind = this.indicatorRef.nativeElement;
      ind.style.transform = `translateX(${left}px)`;
      ind.style.width = `${width}px`;
      ind.style.opacity = '1';
    } else if (this.indicatorRef) {
      this.indicatorRef.nativeElement.style.opacity = '0';
    }
  }
}
