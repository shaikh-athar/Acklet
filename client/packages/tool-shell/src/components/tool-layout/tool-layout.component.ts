import { Component, input, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getToolsByCategory } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { ToolNavbarComponent } from '../tool-navbar/tool-navbar.component';
import { ExploreDrawerComponent } from '../explore-drawer/explore-drawer.component';
import { ToolAdSlotComponent } from '../ad-slot/tool-ad-slot.component';
import { ToolFooterComponent } from '../tool-footer/tool-footer.component';

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
      
      <!-- 1. Dedicated Tool Navbar (No Acklet Portal elements) -->
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
        
        <!-- Left Sidebar (Reserved for ad slot, hidden on mobile/tablet) -->
        <aside class="tool-side-rail tool-side-rail-left">
          <div class="sticky-rail-box">
            <lib-tool-ad-slot placement="sidebar-left" size="skyscraper" />
          </div>
        </aside>

        <!-- Center Workspace Column -->
        <main class="tool-center-column">
          
          <!-- Category Badge & Tool Heading -->
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

          <!-- Main Tool Card (Content-Projected Tool Component) -->
          <section class="tool-card-box">
            <ng-content />
          </section>

          <!-- Below Card Ad Space -->
          <lib-tool-ad-slot placement="below-card" size="leaderboard" />

          <!-- Below-the-fold On-Scroll Sections (Description, Features, How to use, FAQs, Suggested Tools) -->
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

        </main>

        <!-- Right Sidebar (Reserved for ad slot, hidden on mobile/tablet) -->
        <aside class="tool-side-rail tool-side-rail-right">
          <div class="sticky-rail-box">
            <lib-tool-ad-slot placement="sidebar-right" size="skyscraper" />
          </div>
        </aside>

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
      padding: 2rem 1.5rem 4rem;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex: 1;
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
      gap: 1.75rem;
    }

    /* Tool Heading */
    .tool-heading-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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
      font-size: clamp(1.75rem, 3.5vw, 2.35rem);
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--tool-text-primary, #f8fafc);
      margin: 0;
    }

    .tool-subheading-p {
      font-size: 1rem;
      line-height: 1.5;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
    }

    /* Main Tool Card Projection Slot */
    .tool-card-box {
      background: var(--tool-bg-surface, #111726);
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      border-radius: var(--tool-radius-lg, 16px);
      box-shadow: var(--tool-shadow-card, 0 10px 30px rgba(0, 0, 0, 0.4));
      padding: 1.5rem;
      position: relative;
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
      gap: 1rem;
    }

    .scroll-section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--tool-text-primary, #f8fafc);
      margin: 0;
    }

    .scroll-text {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
      white-space: pre-line;
    }

    /* Features Grid */
    .features-list-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: none;
      border: none;
      color: var(--tool-text-primary, #f8fafc);
      font-size: 0.925rem;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
    }

    .faq-arrow-icon {
      font-size: 1.2rem;
      color: var(--tool-brand-accent, #10b981);
    }

    .faq-body-panel {
      padding: 0 1.25rem 1rem;
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
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }

    .suggested-card-link {
      display: block;
      padding: 1rem;
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
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--tool-text-primary, #f8fafc);
    }

    .s-tool-desc {
      font-size: 0.8125rem;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0.35rem 0 0;
      line-height: 1.4;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .tool-side-rail {
        display: none !important;
      }
      .tool-shell-body {
        padding: 1.5rem 1rem 3rem;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit {
  readonly tool = input.required<ToolRegistryItem>();

  readonly isDrawerOpen = signal<boolean>(false);
  readonly openFaqIndex = signal<number | null>(null);

  readonly suggestedCategoryTools = computed(() => {
    const current = this.tool();
    return getToolsByCategory(current.category, current.slug);
  });

  ngOnInit(): void {
    // Set Document SEO title if browser
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
