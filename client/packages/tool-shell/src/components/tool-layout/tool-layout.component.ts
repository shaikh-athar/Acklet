import { Component, input, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getToolsByCategory } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { ToolNavbarComponent } from '../tool-navbar/tool-navbar.component';
import { ExploreDrawerComponent } from '../explore-drawer/explore-drawer.component';
import { ToolAdSlotComponent } from '../ad-slot/tool-ad-slot.component';
import { ToolFooterComponent } from '../tool-footer/tool-footer.component';
import { ResponsiveService } from '../../services/responsive.service';

export type ToolViewTab = 'tool' | 'about' | 'how-it-works' | 'faq' | 'related';

@Component({
  selector: 'lib-tool-layout',
  standalone: true,
  imports: [
    CommonModule,
    ToolNavbarComponent,
    ExploreDrawerComponent,
    ToolAdSlotComponent,
    ToolFooterComponent
  ],
  template: `
    <div class="tool-shell-container">
      
      <!-- 1. Dedicated Tool Navbar -->
      <lib-tool-navbar 
        [tool]="tool()" 
        (exploreClick)="openDrawer()" 
      />

      <!-- 2. Explore More Drawer (Sidebar) -->
      <lib-explore-drawer 
        [isOpen]="isDrawerOpen()" 
        [currentSlug]="tool().slug"
        (close)="closeDrawer()" 
      />

      <!-- 3. Main Tool Workspace Area (Sidebars reserved for ads) -->
      <div class="tool-shell-body">
        
        <!-- Left Sidebar (Reserved for ad slot, desktop only) -->
        @if (responsive.isDesktop()) {
          <aside class="tool-side-rail tool-side-rail-left">
            <div class="sticky-rail-box">
              <lib-tool-ad-slot placement="sidebar-left" size="skyscraper" />
            </div>
          </aside>
        }

        <!-- Center Workspace Column -->
        <main class="tool-center-column">
          
          <!-- Category Badge & Tool Heading (compact on phone) -->
          <header class="tool-heading-header">
            <div class="badge-row">
              <span class="tool-category-badge">{{ tool().category }}</span>
              @if (tool().version) {
                <span class="tool-version-badge">v{{ tool().version }}</span>
              }
            </div>
            <h1 class="tool-main-h1">{{ tool().name }}</h1>
            <p class="tool-subheading-p">{{ tool().shortDescription }}</p>
          </header>

          <!-- Mobile & Tablet Segmented Tool Tabs (replaces 4000px vertical stack on phone) -->
          @if (responsive.isPhone() || responsive.isTabletPortrait()) {
            <nav class="tool-tabs-bar custom-scrollbar" role="tablist" aria-label="Tool sections">
              <button
                type="button"
                role="tab"
                class="tool-tab-btn"
                [class.active]="activeToolTab() === 'tool'"
                [attr.aria-selected]="activeToolTab() === 'tool'"
                (click)="activeToolTab.set('tool')"
              >
                Tool
              </button>
              <button
                type="button"
                role="tab"
                class="tool-tab-btn"
                [class.active]="activeToolTab() === 'about'"
                [attr.aria-selected]="activeToolTab() === 'about'"
                (click)="activeToolTab.set('about')"
              >
                About
              </button>
              <button
                type="button"
                role="tab"
                class="tool-tab-btn"
                [class.active]="activeToolTab() === 'how-it-works'"
                [attr.aria-selected]="activeToolTab() === 'how-it-works'"
                (click)="activeToolTab.set('how-it-works')"
              >
                How to use
              </button>
              <button
                type="button"
                role="tab"
                class="tool-tab-btn"
                [class.active]="activeToolTab() === 'faq'"
                [attr.aria-selected]="activeToolTab() === 'faq'"
                (click)="activeToolTab.set('faq')"
              >
                FAQ
              </button>
              <button
                type="button"
                role="tab"
                class="tool-tab-btn"
                [class.active]="activeToolTab() === 'related'"
                [attr.aria-selected]="activeToolTab() === 'related'"
                (click)="activeToolTab.set('related')"
              >
                Related
              </button>
            </nav>
          }

          <!-- View: Main Tool Card Projection -->
          @if (!responsive.isPhone() && !responsive.isTabletPortrait() || activeToolTab() === 'tool') {
            <section class="tool-card-box">
              <ng-content />
            </section>
          }

          <!-- View: Mobile Tab Panels (rendered conditionally when their tab is chosen) -->
          @if (responsive.isPhone() || responsive.isTabletPortrait()) {
            @if (activeToolTab() === 'about') {
              <div class="mobile-section-card slide-fade-up">
                @if (tool().description) {
                  <article class="scroll-article">
                    <h2 class="scroll-section-title">About {{ tool().name }}</h2>
                    <p class="scroll-text">{{ tool().description }}</p>
                  </article>
                }
                @if (tool().features && tool().features!.length > 0) {
                  <article class="scroll-article mt-4">
                    <h2 class="scroll-section-title">Features & Capabilities</h2>
                    <div class="features-list-grid">
                      @for (feat of tool().features; track feat) {
                        <div class="feature-chip">
                          <span class="feature-check">✓</span>
                          <span class="feature-label">{{ feat }}</span>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }

            @if (activeToolTab() === 'how-it-works') {
              <div class="mobile-section-card slide-fade-up">
                @if (tool().howItWorks && tool().howItWorks!.length > 0) {
                  <article class="scroll-article">
                    <h2 class="scroll-section-title">How To Use {{ tool().name }}</h2>
                    <ol class="how-to-steps">
                      @for (step of tool().howItWorks; track step; let idx = $index) {
                        <li class="step-card">
                          <span class="step-counter">{{ idx + 1 }}</span>
                          <span class="step-desc">{{ step }}</span>
                        </li>
                      }
                    </ol>
                  </article>
                }
              </div>
            }

            @if (activeToolTab() === 'faq') {
              <div class="mobile-section-card slide-fade-up">
                @if (tool().faqs && tool().faqs!.length > 0) {
                  <article class="scroll-article">
                    <h2 class="scroll-section-title">Frequently Asked Questions</h2>
                    <div class="faq-accordion-list">
                      @for (faq of tool().faqs; track faq.question; let fIdx = $index) {
                        <div class="faq-card" [class.open]="openFaqIndex() === fIdx">
                          <button 
                            type="button" 
                            class="faq-header-btn" 
                            (click)="toggleFaq(fIdx)" 
                            [attr.aria-expanded]="openFaqIndex() === fIdx"
                          >
                            <span class="faq-q-text">{{ faq.question }}</span>
                            <span class="faq-arrow-icon">{{ openFaqIndex() === fIdx ? '−' : '+' }}</span>
                          </button>
                          @if (openFaqIndex() === fIdx) {
                            <div class="faq-body-panel">
                              <p class="faq-a-text">{{ faq.answer }}</p>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }

            @if (activeToolTab() === 'related') {
              <div class="mobile-section-card slide-fade-up">
                @if (suggestedCategoryTools().length > 0) {
                  <article class="scroll-article">
                    <h2 class="scroll-section-title">Suggested Tools</h2>
                    <div class="suggested-cards-grid">
                      @for (sTool of suggestedCategoryTools(); track sTool.slug) {
                        <a [href]="getToolUrl(sTool)" class="suggested-card-link">
                          <span class="s-tool-name">{{ sTool.name }}</span>
                          <p class="s-tool-desc">{{ sTool.shortDescription }}</p>
                        </a>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          }

          <!-- Desktop Below-the-fold On-Scroll Sections -->
          @if (!responsive.isPhone() && !responsive.isTabletPortrait()) {
            <!-- Below Card Ad Space -->
            <lib-tool-ad-slot placement="below-card" size="leaderboard" />

            <div class="tool-scroll-sections">
              <!-- Description -->
              @if (tool().description) {
                <article class="scroll-article">
                  <h2 class="scroll-section-title">About {{ tool().name }}</h2>
                  <p class="scroll-text">{{ tool().description }}</p>
                </article>
              }

              <lib-tool-ad-slot placement="in-content-1" size="responsive" />

              <!-- Features -->
              @if (tool().features && tool().features!.length > 0) {
                <article class="scroll-article">
                  <h2 class="scroll-section-title">Features & Capabilities</h2>
                  <div class="features-list-grid">
                    @for (feat of tool().features; track feat) {
                      <div class="feature-chip">
                        <span class="feature-check">✓</span>
                        <span class="feature-label">{{ feat }}</span>
                      </div>
                    }
                  </div>
                </article>
              }

              <lib-tool-ad-slot placement="in-content-2" size="responsive" />

              <!-- How To Use -->
              @if (tool().howItWorks && tool().howItWorks!.length > 0) {
                <article class="scroll-article">
                  <h2 class="scroll-section-title">How To Use {{ tool().name }}</h2>
                  <ol class="how-to-steps">
                    @for (step of tool().howItWorks; track step; let idx = $index) {
                      <li class="step-card">
                        <span class="step-counter">{{ idx + 1 }}</span>
                        <span class="step-desc">{{ step }}</span>
                      </li>
                    }
                  </ol>
                </article>
              }

              <!-- FAQs Accordion -->
              @if (tool().faqs && tool().faqs!.length > 0) {
                <article class="scroll-article">
                  <h2 class="scroll-section-title">Frequently Asked Questions</h2>
                  <div class="faq-accordion-list">
                    @for (faq of tool().faqs; track faq.question; let fIdx = $index) {
                      <div class="faq-card" [class.open]="openFaqIndex() === fIdx">
                        <button 
                          type="button" 
                          class="faq-header-btn" 
                          (click)="toggleFaq(fIdx)" 
                          [attr.aria-expanded]="openFaqIndex() === fIdx"
                        >
                          <span class="faq-q-text">{{ faq.question }}</span>
                          <span class="faq-arrow-icon">{{ openFaqIndex() === fIdx ? '−' : '+' }}</span>
                        </button>
                        @if (openFaqIndex() === fIdx) {
                          <div class="faq-body-panel">
                            <p class="faq-a-text">{{ faq.answer }}</p>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </article>
              }

              <!-- Suggested Tools from Category -->
              @if (suggestedCategoryTools().length > 0) {
                <article class="scroll-article">
                  <h2 class="scroll-section-title">Suggested Tools</h2>
                  <div class="suggested-cards-grid">
                    @for (sTool of suggestedCategoryTools(); track sTool.slug) {
                      <a [href]="getToolUrl(sTool)" class="suggested-card-link">
                        <span class="s-tool-name">{{ sTool.name }}</span>
                        <p class="s-tool-desc">{{ sTool.shortDescription }}</p>
                      </a>
                    }
                  </div>
                </article>
              }
            </div>
          }

        </main>

        <!-- Right Sidebar (Reserved for ad slot, desktop only) -->
        @if (responsive.isDesktop()) {
          <aside class="tool-side-rail tool-side-rail-right">
            <div class="sticky-rail-box">
              <lib-tool-ad-slot placement="sidebar-right" size="skyscraper" />
            </div>
          </aside>
        }

      </div>

      <!-- 4. Tool Footer -->
      <lib-tool-footer [toolName]="tool().name" />

    </div>
  `,
  styles: [`
    @import "../../tokens/tool-theme.css";

    .tool-shell-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--tool-bg, #090d16);
      color: var(--tool-text-primary, #f8fafc);
      font-family: var(--tool-font-sans);
    }

    .tool-shell-body {
      max-width: 1560px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem 1rem calc(2rem + env(safe-area-inset-bottom, 0px));
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex: 1;
      box-sizing: border-box;
    }

    /* Reserved Side Rails for Ads */
    .tool-side-rail {
      width: 160px;
      flex-shrink: 0;
      display: block;
    }

    .sticky-rail-box {
      position: sticky;
      top: 5rem;
      height: 600px;
    }

    /* Main Workspace Column */
    .tool-center-column {
      flex: 1;
      max-width: 1080px;
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Tool Heading */
    .tool-heading-header {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tool-category-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tool-brand-accent, #10b981);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.12));
      padding: 0.2rem 0.6rem;
      border-radius: var(--tool-radius-sm, 6px);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .tool-version-badge {
      font-size: 0.75rem;
      color: var(--tool-text-muted, #64748b);
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.05));
      padding: 0.2rem 0.5rem;
      border-radius: var(--tool-radius-sm, 6px);
    }

    .tool-main-h1 {
      font-size: clamp(1.4rem, 3vw, 2.2rem);
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--tool-text-primary, #f8fafc);
      margin: 0;
    }

    .tool-subheading-p {
      font-size: 0.925rem;
      line-height: 1.5;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
    }

    /* Segmented Tool Tabs for Mobile/Tablet */
    .tool-tabs-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .tool-tabs-bar::-webkit-scrollbar {
      display: none;
    }

    .tool-tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      min-height: 44px; /* Touch target */
      padding: 0 14px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
      transition: background 150ms ease, color 150ms ease;
    }

    .tool-tab-btn.active {
      background: var(--surface-1, rgba(255, 255, 255, 0.12));
      color: var(--text, #ffffff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* Main Tool Card Projection Slot */
    .tool-card-box {
      background: var(--tool-bg-surface, #111726);
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      border-radius: var(--tool-radius-lg, 16px);
      box-shadow: var(--tool-shadow-card, 0 10px 30px rgba(0, 0, 0, 0.4));
      padding: 1.25rem;
      position: relative;
    }

    .mobile-section-card {
      background: var(--tool-bg-surface, #111726);
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Scroll Sections */
    .tool-scroll-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      margin-top: 1rem;
      padding-top: 2rem;
      border-top: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
    }

    .scroll-article {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .scroll-section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--tool-text-primary, #f8fafc);
      margin: 0;
    }

    .scroll-text {
      font-size: 0.925rem;
      line-height: 1.7;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
      white-space: pre-line;
    }

    /* Features Grid */
    .features-list-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem;
    }

    .feature-chip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
      border-radius: var(--tool-radius-md, 10px);
    }

    .feature-check {
      color: var(--tool-brand-accent, #10b981);
      font-weight: 700;
      font-size: 0.95rem;
    }

    .feature-label {
      font-size: 0.875rem;
      color: var(--tool-text-primary, #f8fafc);
    }

    /* How to use */
    .how-to-steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .step-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1.125rem;
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
      border-radius: var(--tool-radius-md, 10px);
    }

    .step-counter {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.2));
      color: var(--tool-brand-accent, #10b981);
      font-weight: 700;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-desc {
      font-size: 0.875rem;
      color: var(--tool-text-secondary, #94a3b8);
    }

    /* FAQs */
    .faq-accordion-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .faq-card {
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
      border-radius: var(--tool-radius-md, 10px);
      overflow: hidden;
    }

    .faq-header-btn {
      width: 100%;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.125rem;
      background: none;
      border: none;
      color: var(--tool-text-primary, #f8fafc);
      font-size: 0.925rem;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      touch-action: manipulation;
    }

    .faq-arrow-icon {
      font-size: 1.2rem;
      color: var(--tool-brand-accent, #10b981);
    }

    .faq-body-panel {
      padding: 0 1.125rem 1rem;
    }

    .faq-a-text {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
    }

    /* Suggested Cards */
    .suggested-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .suggested-card-link {
      display: block;
      padding: 0.875rem 1rem;
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
      border-radius: var(--tool-radius-md, 10px);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .suggested-card-link:hover {
      border-color: var(--tool-brand-accent, #10b981);
      transform: translateY(-2px);
    }

    .s-tool-name {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--tool-text-primary, #f8fafc);
    }

    .s-tool-desc {
      font-size: 0.8125rem;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0.35rem 0 0;
      line-height: 1.4;
    }

    .slide-fade-up {
      animation: tabSlideFadeUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes tabSlideFadeUp {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Phone specific layout: full-bleed main card with 12-16px gutters, no nested card borders */
    @media (max-width: 640px) {
      .tool-shell-body {
        padding: 0.5rem 0.75rem calc(2rem + env(safe-area-inset-bottom, 0px));
        gap: 0.75rem;
      }
      .tool-card-box {
        padding: 0.5rem;
        border: none;
        border-radius: 8px;
        box-shadow: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up {
        animation: none !important;
      }
      .tool-tab-btn,
      .suggested-card-link {
        transition: none !important;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit {
  readonly tool = input.required<ToolRegistryItem>();

  readonly responsive = inject(ResponsiveService);

  readonly isDrawerOpen = signal<boolean>(false);
  readonly openFaqIndex = signal<number | null>(null);
  readonly activeToolTab = signal<ToolViewTab>('tool');

  readonly suggestedCategoryTools = computed(() => {
    const current = this.tool();
    return getToolsByCategory(current.category, current.slug);
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      const seoTitle = this.tool().seo?.title || `${this.tool().name} — Free Online Tool`;
      document.title = seoTitle;
    }
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update(cur => cur === index ? null : index);
  }

  getToolUrl(tool: ToolRegistryItem): string {
    return getToolUrl(tool.subdomain || tool.slug);
  }
}
