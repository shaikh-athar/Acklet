// client/src/app/layout/tool-shell/tool-shell.component.ts
import { Component, input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar';
import { FooterComponent } from '../../shared/components/footer/footer';
import { AdSlotComponent } from '../../shared/components/ad-slot/ad-slot.component';
import { IconComponent } from '../../shared/components/icon/icon';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card';
import { ToolManifest, TOOL_REGISTRY } from '../../core/tool-registry';
import { SeoService } from '../../core/services/seo.service';
import { Tool } from '../../core/models/tool.model';

@Component({
  selector: 'app-tool-shell',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    FooterComponent,
    AdSlotComponent,
    IconComponent,
    ToolCardComponent
  ],
  template: `
    <div class="tool-shell-root">
      <!-- 1. Top Navbar (Same as main site) -->
      <app-navbar />

      <!-- Main Layout Body with Reserved Left & Right Sidebars -->
      <div class="tool-shell-body">
        
        <!-- 5. Left Sidebar (Reserved for ad slot, hidden on tablet/mobile) -->
        <aside class="tool-sidebar tool-sidebar-left">
          <div class="sticky-sidebar-content">
            <app-ad-slot placement="sidebar-left" size="skyscraper" />
          </div>
        </aside>

        <!-- Center Workspace Column -->
        <main class="tool-main-content">
          <div class="tool-content-inner">
            
            <!-- 2. Tool Heading (H1) + One-line Subtitle -->
            <header class="tool-header">
              <div class="tool-badge-row">
                <span class="badge badge-brand">{{ config().category }}</span>
                @if (config().version) {
                  <span class="badge badge-neutral">v{{ config().version }}</span>
                }
              </div>
              <h1 class="tool-title">{{ config().name }}</h1>
              <p class="tool-subtitle">{{ config().shortDescription }}</p>
            </header>

            <!-- 3. Main Tool Card (Content-projection slot) -->
            <section class="tool-card-container">
              <ng-content />
            </section>

            <!-- 4. Ad Slot directly below the tool card (only if space permits) -->
            <div class="tool-below-card-ad">
              <app-ad-slot placement="bottom" size="leaderboard" />
            </div>

            <!-- 6. Below the Fold (On Scroll) Content Sections -->
            <section class="tool-seo-content">
              
              <!-- Description Section -->
              @if (config().description) {
                <article class="tool-section">
                  <h2 class="section-title">About {{ config().name }}</h2>
                  <div class="section-body">
                    <p class="section-text">{{ config().description }}</p>
                  </div>
                </article>
              }

              <!-- In-content Ad Slot Between Sections -->
              <app-ad-slot placement="in-content" size="responsive" />

              <!-- Features Section -->
              @if (config().features && config().features!.length > 0) {
                <article class="tool-section">
                  <h2 class="section-title">Key Features</h2>
                  <div class="features-grid">
                    @for (feature of config().features; track $index) {
                      <div class="feature-item">
                        <div class="feature-icon-box">
                          <app-icon name="check" class="size-4 text-emerald-400" />
                        </div>
                        <span class="feature-text">{{ feature }}</span>
                      </div>
                    }
                  </div>
                </article>
              }

              <!-- In-content Ad Slot Between Sections -->
              <app-ad-slot placement="in-content" size="responsive" />

              <!-- How It Works (Brief) -->
              @if (config().howItWorks && config().howItWorks!.length > 0) {
                <article class="tool-section">
                  <h2 class="section-title">How It Works</h2>
                  <ol class="how-it-works-list">
                    @for (step of config().howItWorks; track $index) {
                      <li class="step-item">
                        <div class="step-num">{{ $index + 1 }}</div>
                        <div class="step-text">{{ step }}</div>
                      </li>
                    }
                  </ol>
                </article>
              }

              <!-- FAQs (Accordion) -->
              @if (config().faqs && config().faqs!.length > 0) {
                <article class="tool-section">
                  <h2 class="section-title">Frequently Asked Questions</h2>
                  <div class="faq-accordion">
                    @for (faq of config().faqs; track $index) {
                      <div class="faq-item" [class.open]="openFaqIndex() === $index">
                        <button class="faq-trigger" (click)="toggleFaq($index)" [attr.aria-expanded]="openFaqIndex() === $index">
                          <span class="faq-question">{{ faq.question }}</span>
                          <app-icon name="chevron-down" class="faq-chevron size-4" />
                        </button>
                        @if (openFaqIndex() === $index) {
                          <div class="faq-answer">
                            <p>{{ faq.answer }}</p>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </article>
              }

              <!-- Suggested Tools -->
              @if (suggestedToolItems().length > 0) {
                <article class="tool-section suggested-section">
                  <h2 class="section-title">Related Solutions</h2>
                  <div class="suggested-grid">
                    @for (tool of suggestedToolItems(); track tool.slug) {
                      <app-tool-card [tool]="tool" />
                    }
                  </div>
                </article>
              }

            </section>

          </div>
        </main>

        <!-- 5. Right Sidebar (Reserved for ad slot, hidden on tablet/mobile) -->
        <aside class="tool-sidebar tool-sidebar-right">
          <div class="sticky-sidebar-content">
            <app-ad-slot placement="sidebar-right" size="skyscraper" />
          </div>
        </aside>

      </div>

      <!-- Main Footer -->
      <app-footer />
    </div>
  `,
  styles: [`
    .tool-shell-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--color-surface-950, #09090b);
      color: var(--color-neutral-100, #f4f4f5);
      position: relative;
    }

    .tool-shell-body {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 1600px;
      margin: 0 auto;
      padding-top: 5rem;
      padding-bottom: 4rem;
      flex: 1;
      gap: 1.5rem;
    }

    /* Left & Right empty reserved sidebars */
    .tool-sidebar {
      width: 160px;
      flex-shrink: 0;
      display: block;
    }

    .sticky-sidebar-content {
      position: sticky;
      top: 5.5rem;
      height: 600px;
    }

    /* Center Main Workspace Column */
    .tool-main-content {
      flex: 1;
      max-width: 1080px;
      width: 100%;
      min-width: 0;
      padding: 0 1rem;
    }

    .tool-content-inner {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Tool Header */
    .tool-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 1rem;
    }

    .tool-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tool-title {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--color-neutral-50, #ffffff);
      margin: 0;
    }

    .tool-subtitle {
      font-size: 1.05rem;
      color: var(--color-neutral-400, #a1a1aa);
      margin: 0;
      line-height: 1.5;
    }

    /* Main Tool Card Projection Container */
    .tool-card-container {
      width: 100%;
      background: var(--color-surface-900, #121215);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-2xl, 20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
      min-height: 380px;
      display: flex;
      flex-direction: column;
    }

    /* Ad slot below the card */
    .tool-below-card-ad {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    /* Below the fold SEO sections */
    .tool-seo-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      margin-top: 1.5rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .tool-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--color-neutral-100, #f4f4f5);
      margin: 0;
    }

    .section-text {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--color-neutral-400, #a1a1aa);
      margin: 0;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.875rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.125rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-xl, 14px);
    }

    .feature-icon-box {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .feature-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-300, #d4d4d8);
    }

    /* How It Works Steps */
    .how-it-works-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-xl, 14px);
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-text {
      font-size: 0.9rem;
      color: var(--color-neutral-300, #d4d4d8);
      line-height: 1.5;
    }

    /* FAQ Accordion */
    .faq-accordion {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .faq-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-xl, 14px);
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .faq-item.open {
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(255, 255, 255, 0.03);
    }

    .faq-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.125rem 1.25rem;
      background: none;
      border: none;
      color: var(--color-neutral-200, #e4e4e7);
      font-family: inherit;
      font-size: 0.925rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }

    .faq-chevron {
      color: var(--color-neutral-400, #a1a1aa);
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .faq-item.open .faq-chevron {
      transform: rotate(180deg);
      color: #818cf8;
    }

    .faq-answer {
      padding: 0 1.25rem 1.25rem;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--color-neutral-400, #a1a1aa);
    }

    .faq-answer p {
      margin: 0;
    }

    /* Suggested Tools Grid */
    .suggested-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    /* Responsive: Hide empty sidebars on tablet & mobile */
    @media (max-width: 1280px) {
      .tool-sidebar {
        display: none !important;
      }
      .tool-shell-body {
        padding: 5rem 1rem 3rem;
      }
    }
  `]
})
export class ToolShellComponent implements OnInit {
  readonly config = input.required<ToolManifest>();

  private readonly seoService = inject(SeoService);
  readonly openFaqIndex = signal<number | null>(null);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.seoService.setToolSeo(this.config(), window.location.href);
    }
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update(cur => cur === index ? null : index);
  }

  suggestedToolItems(): Tool[] {
    const slugs = this.config().suggestedTools || [];
    return slugs
      .map(s => TOOL_REGISTRY[s])
      .filter(Boolean)
      .map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        categoryId: m.category,
        categoryName: m.category,
        shortDescription: m.shortDescription,
        description: m.description,
        icon: m.icon
      }));
  }
}
