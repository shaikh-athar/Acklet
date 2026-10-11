// packages/tool-shell/src/components/topbar/ts-topbar.component.ts
import { 
  Component, 
  input, 
  output, 
  inject, 
  computed, 
  signal, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  viewChild, 
  viewChildren, 
  AfterViewInit, 
  NgZone 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsThemeToggleComponent } from '../theme/ts-theme-toggle.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';
import { HlmKbdImports } from '../../helm/kbd';

export interface SectionNavLink {
  id: string;
  label: string;
}

@Component({
  selector: 'ts-topbar',
  standalone: true,
  imports: [
    CommonModule, 
    TsIconComponent, 
    TsThemeToggleComponent, 
    TsTooltipDirective,
    HlmKbdImports
  ],
  template: `
    <header class="ts-topbar-card" role="banner">
      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Left Zone: Logo / Name + Current Tool Chip Breadcrumb   -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="ts-zone-left">
        @if (showSidebar()) {
          <button 
            type="button" 
            class="ts-mobile-menu-btn" 
            (click)="sidebarService.toggleMobileDrawer()"
            aria-label="Toggle navigation menu"
            tsTooltip="Toggle menu"
          >
            <ts-icon name="menu" [size]="18" />
          </button>
        }

        <!-- Acklet Tools Brand Link to Tools Hub -->
        <a [href]="hubUrl" class="ts-brand-link" title="Acklet Tools Hub">
          <ts-icon name="zap" [size]="18" class="ts-brand-mark" />
          <span class="ts-brand-wordmark">Acklet</span>
        </a>

        <!-- Current Tool Chip / Breadcrumb -->
        @if (tool(); as currentTool) {
          <div class="ts-breadcrumb-separator" aria-hidden="true">/</div>
          <div class="ts-tool-chip" [attr.aria-label]="'Current tool: ' + currentTool.name">
            <span class="ts-tool-chip-name">{{ currentTool.name }}</span>
          </div>
        }
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Center Zone: Tool Section Anchor Links + Scroll Spy   -->
      <!-- ══════════════════════════════════════════════════════ -->
      <nav class="ts-zone-center" aria-label="Tool sections">
        @if (sectionLinks().length > 0) {
          <div class="ts-nav-links-track" #navTrack>
            <!-- Sliding Active Pill Indicator -->
            <div 
              class="ts-nav-active-pill" 
              [class.is-ready]="isIndicatorReady()"
              [style.transform]="indicatorTransform()"
              [style.width.px]="indicatorWidth()"
              aria-hidden="true"
            ></div>

            @for (link of sectionLinks(); track link.id; let idx = $index) {
              <a 
                #navLinkBtns
                [href]="'#' + link.id" 
                class="ts-nav-link-btn"
                [class.active]="activeSection() === link.id"
                (click)="scrollToSection($event, link.id)"
              >
                {{ link.label }}
              </a>
            }
          </div>
        }
      </nav>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Right Zone: Command Palette Search + Theme Toggle     -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="ts-zone-right">
        <!-- Command Palette Trigger with Kbd Hint (Hidden by default / configurable) -->
        @if (showSearch()) {
          <button 
            type="button" 
            class="ts-search-btn" 
            (click)="openCommandPalette.emit()"
            aria-label="Search tools and commands (Ctrl+K or ⌘K)"
            tsTooltip="Search tools (⌘K)"
          >
            <ts-icon name="search" [size]="15" />
            <span class="ts-search-label hide-mobile">Search...</span>
            <kbd hlmKbd class="ts-kbd-hint hide-mobile">⌘K</kbd>
          </button>
        }

        <!-- ONE Single Theme Toggle -->
        <ts-theme-toggle />

        <!-- Optional Primary Action Button if configured -->
        @if (showPrimaryAction()) {
          <a 
            [href]="portalUrl + '/auth/login'" 
            class="ts-btn-primary-cta"
            title="Sign in or join Acklet"
          >
            <span>Get Started</span>
            <ts-icon name="arrow-right" [size]="13" class="hide-mobile" />
          </a>
        }
      </div>
    </header>
  `,
  styles: [`
    .ts-topbar-card {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      height: var(--header-height, 64px);
      padding: 0 16px;
      background: var(--shell-card, #FFFFFF);
      border: 1px solid var(--shell-card-border, rgba(0, 0, 0, 0.06));
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
      position: relative;
      z-index: var(--ts-z-chrome, 11);
      user-select: none;
      box-sizing: border-box;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .ts-topbar-card {
      background: var(--shell-card, #141414);
      border-color: var(--shell-card-border, #27272A);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    /* Left Zone */
    .ts-zone-left {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: start;
      min-width: 0;
    }

    .ts-mobile-menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-mobile-menu-btn:hover {
      background: var(--surface-hover);
    }

    .ts-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text, #18181B);
      outline: none;
      flex-shrink: 0;
      transition: opacity var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .ts-brand-link {
      color: var(--text, #FCFCFC);
    }

    .ts-brand-link:hover {
      opacity: 0.85;
    }

    .ts-brand-mark {
      color: var(--text);
      display: flex;
      align-items: center;
    }

    .ts-brand-wordmark {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .ts-breadcrumb-separator {
      color: var(--text-muted, #71717A);
      font-size: 13px;
      user-select: none;
    }

    /* Current Tool Chip */
    .ts-tool-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #18181B);
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    [data-theme="dark"] .ts-tool-chip {
      background: #1E1E22;
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--text, #FCFCFC);
    }

    /* Center Zone */
    .ts-zone-center {
      display: flex;
      align-items: center;
      justify-content: center;
      justify-self: center;
      height: 100%;
    }

    .ts-nav-links-track {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      background: transparent;
      border-radius: var(--ts-radius-full, 9999px);
    }

    .ts-nav-active-pill {
      position: absolute;
      top: 3px;
      left: 0;
      height: calc(100% - 6px);
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #F4F4F5);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      transition: transform 220ms ease-out,
                  width 220ms ease-out,
                  opacity 150ms ease;
    }

    [data-theme="dark"] .ts-nav-active-pill {
      background: #27272A;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .ts-nav-active-pill.is-ready {
      opacity: 1;
    }

    .ts-nav-link-btn {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      padding: 5px 14px;
      border-radius: var(--ts-radius-full, 9999px);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-muted, #71717A);
      text-decoration: none;
      background: transparent;
      outline: none;
      cursor: pointer;
      white-space: nowrap;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .ts-nav-link-btn:hover:not(.active) {
      color: var(--text, #18181B);
      background: var(--surface-hover, rgba(0, 0, 0, 0.04));
    }

    [data-theme="dark"] .ts-nav-link-btn:hover:not(.active) {
      color: var(--text, #FCFCFC);
      background: rgba(255, 255, 255, 0.05);
    }

    .ts-nav-link-btn.active {
      color: var(--text, #18181B);
      font-weight: 700;
    }

    [data-theme="dark"] .ts-nav-link-btn.active {
      color: var(--text, #FCFCFC);
    }

    .ts-nav-link-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 1px;
      z-index: 3;
    }

    /* Right Zone */
    .ts-zone-right {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: end;
    }

    .ts-search-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 12px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717A);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      user-select: none;
      transition: all 150ms ease, transform 150ms ease;
    }

    [data-theme="dark"] .ts-search-btn {
      background: var(--surface-hover, #1E1E22);
      border-color: var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #A1A1AA);
    }

    .ts-search-btn:hover {
      background: var(--surface-active, #E4E4E7);
      color: var(--text, #18181B);
    }

    [data-theme="dark"] .ts-search-btn:hover {
      background: #27272A;
      color: #FCFCFC;
    }

    .ts-search-btn:active {
      transform: scale(0.98);
    }

    .ts-search-btn:focus:not(:focus-visible) {
      outline: none;
    }

    .ts-search-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }

    .ts-kbd-hint {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717A);
      line-height: 1.2;
    }

    [data-theme="dark"] .ts-kbd-hint {
      background: #27272A;
      border-color: rgba(255, 255, 255, 0.1);
      color: #A1A1AA;
    }

    .ts-btn-primary-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--text, #18181B);
      color: var(--bg, #FFFFFF);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 150ms ease, transform 150ms ease;
      white-space: nowrap;
    }

    .ts-btn-primary-cta:hover {
      opacity: 0.92;
      transform: scale(0.98);
    }

    /* Responsive Breakpoints */
    @media (max-width: 1023px) {
      .ts-mobile-menu-btn {
        display: inline-flex;
        width: 40px;
        height: 40px;
        min-width: 40px;
        min-height: 40px;
      }
    }

    @media (max-width: 767px) {
      .ts-topbar-card {
        height: 56px;
        padding: 0 10px;
        border-radius: 16px;
      }
      .ts-zone-center {
        display: none;
      }
      .hide-mobile {
        display: none !important;
      }
      .ts-search-btn {
        padding: 0 10px;
        height: 40px;
        min-height: 40px;
        min-width: 40px;
      }
      .ts-btn-primary-cta {
        padding: 0 14px;
        font-size: 13px;
        height: 40px;
        min-height: 40px;
      }
    }
  `]
})
export class TsTopbarComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly currentCategory = input<string>('Utilities');
  readonly activeTabId = input<string>('');
  readonly showSidebar = input<boolean>(true);
  readonly showPrimaryAction = input<boolean>(false);
  readonly showSearch = input<boolean>(false);
  
  readonly tabChange = output<string>();
  readonly openCommandPalette = output<void>();
  readonly aboutClick = output<void>();

  readonly sidebarService = inject(ToolSidebarService);
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();
  private readonly zone = inject(NgZone);

  readonly navTrack = viewChild<ElementRef<HTMLElement>>('navTrack');
  readonly navLinkBtns = viewChildren<ElementRef<HTMLAnchorElement>>('navLinkBtns');

  readonly activeSection = signal<string>('tool');
  readonly indicatorWidth = signal<number>(0);
  readonly indicatorTransform = signal<string>('translateX(0px)');
  readonly isIndicatorReady = signal<boolean>(false);

  private intersectionObserver?: IntersectionObserver;

  // Build section links from tool definition
  readonly sectionLinks = computed<SectionNavLink[]>(() => {
    const t = this.tool();
    if (!t) return [];

    // Custom nav links from registry if provided
    if (t.navLinks && t.navLinks.length > 0) {
      return t.navLinks;
    }

    const links: SectionNavLink[] = [
      { id: 'tool', label: 'Tool' }
    ];

    if (t.about || t.description || t.shortDescription || (t.features && t.features.length > 0)) {
      links.push({ id: 'about', label: 'About' });
    }
    if ((t.howTo && t.howTo.length > 0) || (t.howItWorks && t.howItWorks.length > 0)) {
      links.push({ id: 'how-to-use', label: 'How to use' });
    }
    if (t.faqs && t.faqs.length > 0) {
      links.push({ id: 'faq', label: 'FAQ' });
    }
    if ((t.related && t.related.length > 0) || (t.suggestedTools && t.suggestedTools.length > 0)) {
      links.push({ id: 'related', label: 'Related' });
    }

    return links;
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => this.setupScrollSpy(), 100);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updatePillIndicator(), 150);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  scrollToSection(event: MouseEvent, sectionId: string): void {
    event.preventDefault();
    this.activeSection.set(sectionId);
    this.updatePillIndicator();

    if (typeof document === 'undefined') return;

    if (sectionId === 'tool') {
      const mainEl = document.getElementById('main-content');
      mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private setupScrollSpy(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const mainCard = document.getElementById('main-content');
    if (!mainCard) return;

    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.zone.run(() => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) {
              this.activeSection.set(id);
              this.updatePillIndicator();
            }
          }
        }
      });
    }, {
      root: mainCard,
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0
    });

    const sections = ['tool', 'about', 'how-to-use', 'faq', 'related'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        this.intersectionObserver?.observe(el);
      }
    });
  }

  private updatePillIndicator(): void {
    const track = this.navTrack()?.nativeElement;
    const btns = this.navLinkBtns();
    if (!track || !btns || btns.length === 0) return;

    const currentId = this.activeSection();
    const links = this.sectionLinks();
    const activeIdx = links.findIndex(l => l.id === currentId);

    if (activeIdx === -1 || !btns[activeIdx]) {
      this.isIndicatorReady.set(false);
      return;
    }

    const btnEl = btns[activeIdx].nativeElement;
    const trackRect = track.getBoundingClientRect();
    const btnRect = btnEl.getBoundingClientRect();

    const left = btnRect.left - trackRect.left;
    const width = btnRect.width;

    this.indicatorWidth.set(width);
    this.indicatorTransform.set(`translateX(${left}px)`);
    this.isIndicatorReady.set(true);
  }
}
