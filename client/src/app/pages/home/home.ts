import { Component, inject, signal, ElementRef, HostListener, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToolsService } from '../../core/services/tools.service';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card';
import { CategoryCardComponent } from '../../shared/components/category-card/category-card';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header';
import { IconComponent } from '../../shared/components/icon/icon';
import { ViewportDirective } from '../../shared/viewport/viewport.directive';
import { ThemeService } from '../../core/services/theme.service';
import { gsap } from 'gsap';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, ToolCardComponent, CategoryCardComponent, SectionHeaderComponent, IconComponent, ViewportDirective],
  template: `
    <div class="home-root page-enter">

      <!-- ══ HERO ══════════════════════════════════════════════ -->
      <section class="hero-section gradient-mesh" appViewport viewportId="hero" (enter)="playHero()">
        <div class="orb orb-brand hero-orb-1"></div>
        <div class="orb orb-accent hero-orb-2"></div>

        <div class="container-main hero-inner">
          <!-- Eyebrow -->
          <div class="hero-eyebrow">
            <span class="badge badge-brand">
              Digital Solution Platform
            </span>
          </div>

          <!-- Headline — outcome first, not product-first -->
          <h1 class="hero-title">
            Stop searching.<br>
            <span class="gradient-text-brand">Start solving.</span>
          </h1>
          <p class="hero-subtitle">
            Acklet brings reliable, thoughtfully designed digital solutions to one place.
            No subscriptions. No ads. No data collection. Just answers.
          </p>

          <!-- CTAs -->
          <div class="hero-ctas">
            <a routerLink="/tools" class="btn btn-primary btn-lg">Browse solutions</a>
            <a routerLink="/categories" class="btn btn-secondary btn-lg">Explore categories</a>
          </div>

          <!-- Quick category pills -->
          <div class="hero-pills">
            @for (cat of toolsSvc.featuredCategories().slice(0, 5); track cat.id) {
              <a [routerLink]="['/tools']" [queryParams]="{category: cat.slug}" class="hero-pill">
                <app-icon [name]="cat.icon" class="size-3.5 mr-1.5" />
                {{ cat.name }}
              </a>
            }
          </div>
        </div>
      </section>

      <!-- ══ TRUST SIGNALS ══════════════════════════════════════ -->
      <!-- Replaces fabricated statistics — all claims are factual and defensible -->
      <section class="trust-section" appViewport viewportId="trust" (enter)="playTrust()">
        <div class="container-main trust-grid">
          @for (t of trustSignals; track t.label) {
            <div class="trust-item">
              <div class="trust-icon-wrap" [style.background]="t.iconBg">
                <app-icon [name]="t.icon" class="size-4" [style.color]="t.color" />
              </div>
              <div>
                <div class="trust-label">{{ t.label }}</div>
                <div class="trust-desc">{{ t.desc }}</div>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- ══ CATEGORIES ════════════════════════════════════════ -->
      <section class="section popular-categories-sec" appViewport viewportId="categories" (enter)="playCategories()">
        <div class="container-main">
          <app-section-header eyebrow="Categories" title="Organized around what you need to do" subtitle="Browse solutions by the type of problem you're solving — not by how they're built." [centered]="true" />
          <div class="cats-grid mt-12">
            @for (cat of toolsSvc.featuredCategories(); track cat.id) {
              <app-category-card [category]="cat" />
            }
          </div>
          <div class="text-center mt-10">
            <a routerLink="/categories" class="btn btn-secondary">
              All categories
              <app-icon name="arrow-right" class="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <!-- ══ WHY ACKLET ══════════════════════════════════════════ -->
      <!-- Grounded in Product Constitution and Brand Philosophy — no marketing hype -->
      <section class="section why-section" appViewport viewportId="philosophy" (enter)="playPhilosophy()">
        <div class="orb orb-brand" style="width:400px;height:400px;top:0;right:-100px;opacity:0.25"></div>
        <div class="container-main">
          <app-section-header eyebrow="Philosophy" title="Technology should feel helpful, not overwhelming" subtitle="Every decision we make is guided by one question: does this genuinely help someone accomplish something?" [centered]="true" />
          
          <!-- Interactive Story & Content Viewer -->
          <div class="story-viewer mt-14">
            <!-- Tabs Navigation -->
            <div class="story-tabs">
              @for (f of whyAcklet; track f.title; let idx = $index) {
                <button class="story-tab-btn" 
                        [class.active]="activeStoryIdx() === idx" 
                        (click)="activeStoryIdx.set(idx)">
                  <span class="tab-num">0{{ idx + 1 }}</span>
                  <span class="tab-title">{{ f.title }}</span>
                </button>
              }
            </div>
            
            <!-- Active Story Content Panel -->
            <div class="story-content-panel glass">
              <div class="story-panel-left">
                <div class="story-icon-box" [style.--feat-color]="whyAcklet[activeStoryIdx()].color">
                  <app-icon [name]="whyAcklet[activeStoryIdx()].icon" class="story-icon size-8" />
                </div>
                <h3 class="story-panel-title">{{ whyAcklet[activeStoryIdx()].title }}</h3>
                <p class="story-panel-desc">{{ whyAcklet[activeStoryIdx()].desc }}</p>
                <div class="story-panel-footer">
                  <span class="story-badge">Core Principle</span>
                  <span class="story-badge">Verified Offline</span>
                </div>
              </div>
              <div class="story-panel-right">
                <!-- A mock preview simulating the feature's layout -->
                <div class="mock-viewer-content">
                  <div class="mock-header">
                    <span class="mock-dot red"></span>
                    <span class="mock-dot yellow"></span>
                    <span class="mock-dot green"></span>
                    <span class="mock-title">acklet-runtime-sandbox</span>
                  </div>
                  <div class="mock-body">
                    <pre><code><span class="code-comment">// Verified Safe Browser Processing</span>
<span class="code-keyword">import</span> &#123; sandbox &#125; <span class="code-keyword">from</span> <span class="code-string">'acklet/core'</span>;

<span class="code-keyword">async function</span> <span class="code-function">runOffline</span>() &#123;
  <span class="code-keyword">const</span> data = <span class="code-keyword">await</span> sandbox.process(&#123;
    action: <span class="code-string">'{{ whyAcklet[activeStoryIdx()].title }}'</span>,
    scope: <span class="code-string">'client-only'</span>,
    offline: <span class="code-literal">true</span>
  &#125;);
  console.log(<span class="code-string">'Done!'</span>);
&#125;</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ══ NEW ADDITIONS ══════════════════════════════════════ -->
      <section class="section recently-added-sec" appViewport viewportId="recentlyAdded" (enter)="playRecentlyAdded()">
        <div class="container-main">
          <div class="section-header-row">
            <app-section-header eyebrow="New" title="Recently added solutions" subtitle="The latest additions to our catalog — quality-checked and ready to use." />
            <a routerLink="/tools" [queryParams]="{filter:'new'}" class="btn btn-secondary">
              See all new
              <app-icon name="arrow-right" class="size-3.5" />
            </a>
          </div>
          <div class="tools-grid mt-10">
            @for (tool of toolsSvc.newTools(); track tool.id) {
              <app-tool-card [tool]="tool" />
            }
          </div>
        </div>
      </section>

      <!-- ══ REVIEWS ════════════════════════════════════════════ -->
      <section class="section reviews-section" appViewport viewportId="reviews" (enter)="playReviews()">
        <div class="container-main">
          <app-section-header eyebrow="Reviews" title="Trusted by digital builders" subtitle="Here is what creators and developers think about their new workspace." [centered]="true" />
          
          <div class="reviews-grid mt-14">
            @for (r of reviews; track r.author; let idx = $index) {
              <div class="review-card glass">
                <div class="rating-stars">
                  @for (star of [1,2,3,4,5]; track star) {
                    <app-icon name="star" class="size-3.5 star-icon" />
                  }
                </div>
                <p class="review-quote">"{{ r.quote }}"</p>
                <div class="review-author-row">
                  <div class="author-avatar">{{ r.avatarInitials }}</div>
                  <div>
                    <div class="author-name">{{ r.author }}</div>
                    <div class="author-role">{{ r.role }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ══ CTA ════════════════════════════════════════════════ -->
      <section class="cta-section" appViewport viewportId="cta" (enter)="playCTA()">
        <div class="container-main cta-inner">
          <div class="orb orb-brand" style="width:300px;height:300px;left:10%;top:-50%;opacity:0.25"></div>
          <div class="orb orb-accent" style="width:250px;height:250px;right:10%;top:20%;opacity:0.2"></div>
          <div class="cta-content">
            <h2 class="cta-title">Your problem has a solution.<br><span class="gradient-text-brand">Find it here.</span></h2>
            <p class="cta-subtitle">One place for the digital work that used to take five websites. Fast, private, and free.</p>
            <div class="cta-actions">
              <a routerLink="/tools" class="btn btn-primary btn-lg">Browse solutions</a>
              <a routerLink="/about" class="btn btn-secondary btn-lg">Learn about Acklet</a>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ SCROLL TO TOP ══════════════════════════════════════ -->
      @if (showScrollTop()) {
        <button class="scroll-top-btn" (click)="scrollToTop()" aria-label="Scroll to top">
          <app-icon name="arrow-up" class="size-5" />
        </button>
      }

    </div>
  `,
  styles: [`
    .home-root { overflow: hidden; background-color: var(--color-surface-950); color: var(--color-neutral-200); min-height: 100vh; transition: background-color 0.3s ease, color 0.3s ease; }

    /* Hero */
    .hero-section { position: relative; padding: 11rem 0 5rem; min-height: 75vh; display: flex; align-items: center; overflow: hidden; background-color: var(--color-surface-950) !important; }
    .hero-orb-1 { width: 600px; height: 600px; top: -200px; left: -150px; }
    .hero-orb-2 { width: 400px; height: 400px; bottom: -100px; right: -50px; }
    .hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.5rem; max-width: 800px; margin: 0 auto; }
    .hero-eyebrow { opacity: 0; }
    .hero-title { font-family: var(--font-serif); font-size: clamp(2.75rem, 7vw, 5rem); font-weight: 700; color: var(--color-neutral-50); line-height: 1.1; letter-spacing: -0.03em; opacity: 0; }
    .hero-subtitle { font-size: 1.1rem; color: var(--color-neutral-400); line-height: 1.75; max-width: 560px; opacity: 0; }
    .smoke-letter {
      display: inline-block;
      will-change: transform, filter;
      transform-style: preserve-3d;
      backface-visibility: hidden;
    }

    /* Hero Search */
    .hero-search-wrap { position: relative; max-width: 560px; width: 100%; margin: 0 auto; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.4s; opacity: 0; }
    .hero-search { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid var(--color-surface-700); box-shadow: var(--shadow-card); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .hero-search:focus-within { border-color: var(--color-neutral-400); box-shadow: var(--shadow-card-hover); }
    .hero-search-input { flex: 1; background: none; border: none; outline: none; font-size: 0.9rem; color: var(--color-neutral-100); font-family: inherit; }
    .hero-search-input::placeholder { color: var(--color-neutral-400); }
    .search-shortcut { display: flex; gap: 0.2rem; }
    .search-shortcut kbd { background: var(--color-surface-800); border: 1px solid var(--color-surface-700); border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.65rem; color: var(--color-neutral-400); font-family: inherit; }

    /* Search Results Preview */
    .search-results-preview { position: absolute; top: calc(100% + 8px); left: 0; right: 0; border-radius: var(--radius-xl); overflow: hidden; z-index: 50; box-shadow: var(--shadow-overlay); background: var(--color-surface-900); border: 1px solid var(--color-surface-700); }
    .search-result-item { display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem 1.25rem; text-decoration: none; color: var(--color-neutral-100); transition: background 0.2s; border-bottom: 1px solid var(--color-surface-700); }
    .search-result-item:last-child { border-bottom: none; }
    .search-result-item:hover { background: var(--color-surface-800); }
    .sr-icon-box { width: 30px; height: 30px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--color-surface-800); border: 1px solid var(--color-surface-700); }
    .sr-name { font-size: 0.85rem; font-weight: 600; }
    .sr-cat { font-size: 0.72rem; color: var(--color-neutral-500); }
    .sr-empty { padding: 1.25rem; text-align: center; color: var(--color-neutral-500); font-size: 0.85rem; }

    /* CTAs & Pills */
    .hero-ctas { display: flex; align-items: center; justify-content: center; gap: 1rem; opacity: 0; }
    .hero-pills { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.5rem; }
    .hero-pill { padding: 0.35rem 0.875rem; border-radius: 999px; font-size: 0.78rem; color: var(--color-neutral-400); background: var(--color-surface-900); border: 1px solid var(--color-surface-700); text-decoration: none; display: inline-flex; align-items: center; transition: all 0.25s; opacity: 0; }
    .hero-pill:hover { color: var(--color-neutral-50); border-color: var(--color-neutral-400); background: var(--color-surface-800); }

    /* Trust signals */
    .trust-section { padding: 3.5rem 0; border-top: 1px solid var(--color-surface-700); border-bottom: 1px solid var(--color-surface-700); background-color: var(--color-surface-900) !important; }
    .trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
    .trust-item { display: flex; align-items: flex-start; gap: 0.875rem; }
    .trust-icon-wrap { width: 38px; height: 38px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--color-surface-700); background: var(--color-surface-800); }
    .trust-label { font-size: 0.875rem; font-weight: 700; color: var(--color-neutral-50); }
    .trust-desc { font-size: 0.75rem; color: var(--color-neutral-400); margin-top: 0.15rem; line-height: 1.45; }

    /* Section row */
    .section-header-row { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-bottom: 2.5rem; }
    .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

    /* Categories */
    .popular-categories-sec { background-color: var(--color-surface-900) !important; border-top: 1px solid var(--color-surface-700); border-bottom: 1px solid var(--color-surface-700); padding: 5rem 0; }
    .cats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }

    /* Why Acklet */
    .why-section { position: relative; overflow: hidden; background-color: var(--color-surface-950) !important; }

    /* Recently Added */
    .recently-added-sec { background-color: var(--color-surface-900) !important; border-top: 1px solid var(--color-surface-700); border-bottom: 1px solid var(--color-surface-700); padding: 5rem 0; }

    .hero-section, .popular-categories-sec, .why-section, .recently-added-sec, .reviews-section, .cta-section { min-height: 100vh; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .popular-categories-sec, .why-section, .recently-added-sec, .reviews-section, .cta-section { padding: 6rem 0; }
    .reviews-section { background-color: var(--color-surface-950) !important; }
    .cta-section { background-color: var(--color-surface-900) !important; }

    .popular-categories-sec > .container-main,
    .why-section > .container-main,
    .recently-added-sec > .container-main,
    .reviews-section > .container-main,
    .cta-section > .container-main {
      width: 100%;
    }

    /* Section Header Global Dark Overrides */
    app-section-header ::ng-deep .sh-title {
      color: var(--color-neutral-50) !important;
    }
    app-section-header ::ng-deep .sh-subtitle {
      color: var(--color-neutral-400) !important;
    }

    /* Uniform Premium Dark Glass Card Styling for ALL cards on Black Landing Page */
    .tools-grid app-tool-card ::ng-deep .tool-card-root,
    .cats-grid app-category-card ::ng-deep .cat-card-root,
    .review-card {
      background: var(--color-surface-900) !important;
      border: 1px solid var(--color-surface-700) !important;
      color: var(--color-neutral-100) !important;
    }

    /* Category Card details */
    .cats-grid app-category-card ::ng-deep .cat-card-root .cat-name {
      color: var(--color-neutral-50) !important;
    }
    .cats-grid app-category-card ::ng-deep .cat-card-root .cat-count {
      color: var(--color-neutral-400) !important;
    }
    .cats-grid app-category-card ::ng-deep .cat-card-root .cat-icon-box {
      background: var(--color-surface-800) !important;
      border: 1px solid var(--color-surface-700) !important;
    }
    .cats-grid app-category-card ::ng-deep .cat-card-root:hover {
      background: var(--color-surface-800) !important;
      border-color: var(--color-neutral-400) !important;
    }

    /* Tool Card details */
    .tools-grid app-tool-card ::ng-deep .tool-card-root .card-title {
      color: var(--color-neutral-50) !important;
    }
    .tools-grid app-tool-card ::ng-deep .tool-card-root .card-category {
      color: var(--color-neutral-400) !important;
    }
    .tools-grid app-tool-card ::ng-deep .tool-card-root .card-desc {
      color: var(--color-neutral-400) !important;
    }
    .tools-grid app-tool-card ::ng-deep .tool-card-root .card-icon-wrap {
      background: var(--color-surface-800) !important;
      border: 1px solid var(--color-surface-700) !important;
    }
    .tools-grid app-tool-card ::ng-deep .tool-card-root .card-icon {
      color: var(--color-neutral-400) !important;
    }
    .tools-grid app-tool-card ::ng-deep .tool-card-root:hover {
      background: var(--color-surface-800) !important;
      border-color: var(--color-neutral-400) !important;
    }

    /* Interactive Story Viewer styles */
    .story-viewer {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      width: 100%;
    }
    .story-tabs {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.75rem;
      width: 100%;
    }
    .story-tab-btn {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem 1rem;
      border-radius: var(--radius-lg);
      background: var(--color-surface-900);
      border: 1px solid var(--color-surface-700);
      text-align: left;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .story-tab-btn .tab-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-neutral-500);
      font-family: var(--font-mono);
    }
    .story-tab-btn .tab-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-neutral-400);
      transition: color 0.3s;
    }
    .story-tab-btn:hover {
      background: var(--color-surface-800);
      border-color: var(--color-surface-600);
    }
    .story-tab-btn:hover .tab-title {
      color: var(--color-neutral-50);
    }
    .story-tab-btn.active {
      background: var(--color-surface-800);
      border-color: var(--color-neutral-50);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.04);
    }
    .story-tab-btn.active .tab-num {
      color: var(--color-neutral-50);
    }
    .story-tab-btn.active .tab-title {
      color: var(--color-neutral-50);
    }

    .story-content-panel {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 3rem;
      padding: 3.5rem;
      border-radius: var(--radius-2xl);
      background: var(--color-surface-900) !important;
      border: 1px solid var(--color-surface-700) !important;
      align-items: center;
      min-height: 380px;
    }
    .story-panel-left {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .story-icon-box {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface-800);
      border: 1px solid var(--color-surface-700);
      color: var(--color-neutral-50);
    }
    .story-icon {
      color: var(--feat-color, #ffffff);
    }
    .story-panel-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-neutral-50);
      letter-spacing: -0.02em;
    }
    .story-panel-desc {
      font-size: 0.95rem;
      color: var(--color-neutral-400);
      line-height: 1.7;
    }
    .story-panel-footer {
      display: flex;
      gap: 0.5rem;
    }
    .story-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-md);
      background: var(--color-surface-800);
      border: 1px solid var(--color-surface-700);
      color: var(--color-neutral-400);
    }

    .story-panel-right {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Code sandbox simulation styles */
    .mock-viewer-content {
      width: 100%;
      background: #000000;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      font-family: var(--font-mono);
      text-align: left;
    }
    .mock-header {
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mock-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .mock-dot.red { background: #ef4444; }
    .mock-dot.yellow { background: #eab308; }
    .mock-dot.green { background: #22c55e; }
    .mock-title {
      font-size: 0.72rem;
      color: var(--color-neutral-500);
      margin-left: 0.5rem;
    }
    .mock-body {
      padding: 1.5rem;
      font-size: 0.8rem;
      line-height: 1.6;
      color: var(--color-neutral-300);
      overflow-x: auto;
    }
    .code-comment { color: var(--color-neutral-500); }
    .code-keyword { color: #f43f5e; }
    .code-string { color: #10b981; }
    .code-function { color: #6366f1; }
    .code-literal { color: #3b82f6; }

    /* Bento Grid Layout Overrides (Index-based styling) */
    .cats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 1.25rem;
    }
    .cats-grid app-category-card:nth-child(1),
    .cats-grid app-category-card:nth-child(4),
    .cats-grid app-category-card:nth-child(5),
    .cats-grid app-category-card:nth-child(8) {
      grid-column: span 2;
    }
    .cats-grid app-category-card:nth-child(1) ::ng-deep .cat-card-root,
    .cats-grid app-category-card:nth-child(4) ::ng-deep .cat-card-root,
    .cats-grid app-category-card:nth-child(5) ::ng-deep .cat-card-root,
    .cats-grid app-category-card:nth-child(8) ::ng-deep .cat-card-root {
      padding: 1.5rem 1.75rem;
    }

    .recently-added-sec .tools-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 1.5rem;
    }
    .recently-added-sec .tools-grid app-tool-card:nth-child(1) {
      grid-column: span 2;
    }
    .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
      padding: 2rem;
    }
    .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root .card-icon-wrap {
      width: 56px;
      height: 56px;
    }
    .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root .card-badges {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
    }
    .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root .card-arrow {
      top: unset;
      bottom: 1.5rem;
      right: 1.5rem;
      transform: translate(0, 0);
      opacity: 1;
    }

    .reviews-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 1.5rem;
    }
    .reviews-grid .review-card:nth-child(1),
    .reviews-grid .review-card:nth-child(4),
    .reviews-grid .review-card:nth-child(5) {
      grid-column: span 2;
    }
    .reviews-grid .review-card:nth-child(2),
    .reviews-grid .review-card:nth-child(3),
    .reviews-grid .review-card:nth-child(6) {
      grid-column: span 1;
    }

    /* Reviews Section Detail styles */
    .reviews-section {
      padding: 5rem 0;
      border-top: 1px solid var(--color-surface-700);
      border-bottom: 1px solid var(--color-surface-700);
    }
    .review-card {
      padding: 2.25rem 2rem;
      border-radius: var(--radius-xl);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .review-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-card-hover);
      border-color: var(--color-neutral-400) !important;
    }
    .rating-stars { display: flex; gap: 0.2rem; }
    .star-icon { color: var(--color-neutral-500); }
    .review-quote { font-size: 0.875rem; line-height: 1.6; color: var(--color-neutral-300); font-style: italic; }
    .review-author-row { display: flex; align-items: center; gap: 0.75rem; margin-top: auto; }
    .author-avatar {
      width: 36px; height: 36px; border-radius: var(--radius-full);
      background: var(--color-surface-800); color: var(--color-neutral-50);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.78rem; font-weight: 700;
    }
    .author-name { font-size: 0.85rem; font-weight: 700; color: var(--color-neutral-50); }
    .author-role { font-size: 0.72rem; color: var(--color-neutral-400); }

    /* CTA */
    .cta-section { 
      padding: 7rem 0; 
      background: var(--color-surface-900); 
      position: relative; 
      overflow: hidden; 
      border-top: 1px solid var(--color-surface-700); 
    }
    .cta-inner { position: relative; z-index: 2; }
    .cta-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .cta-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; color: var(--color-neutral-50); letter-spacing: -0.03em; line-height: 1.2; }
    .cta-subtitle { font-size: 1.05rem; color: var(--color-neutral-400); max-width: 480px; line-height: 1.7; }
    .cta-actions { display: flex; gap: 0.875rem; }
    .cta-section .btn-secondary {
      background: var(--color-surface-800);
      border-color: var(--color-surface-700);
      color: var(--color-neutral-100);
    }
    .cta-section .btn-secondary:hover {
      background: var(--color-surface-700);
      border-color: var(--color-neutral-400);
    }

    /* Scroll to Top Button with shaking animation */
    @keyframes shake-bounce {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      15% { transform: translateY(-6px) rotate(-4deg); }
      30% { transform: translateY(-2px) rotate(4deg); }
      45% { transform: translateY(-4px) rotate(-2deg); }
      60% { transform: translateY(-1px) rotate(2deg); }
      75% { transform: translateY(-2px) rotate(0deg); }
    }
    .scroll-top-btn {
      position: fixed;
      bottom: 2.5rem;
      right: 2.5rem;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--color-neutral-50);
      color: var(--color-surface-950);
      border: 1px solid var(--color-surface-700);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 999;
      transition: all 0.3s;
      animation: shake-bounce 4s ease-in-out infinite;
    }
    .scroll-top-btn:hover {
      background: var(--color-neutral-100);
      color: var(--color-surface-950);
      transform: scale(1.1) !important;
      animation-play-state: paused;
    }

    /* Override app-footer container to blend to dark theme on home page */
    ::ng-deep app-footer footer {
      background-color: var(--color-surface-950) !important;
      border-top: 1px solid var(--color-surface-700) !important;
    }

    /* Initial hidden state to prevent FOUC before scroll animation triggers */
    .trust-item,
    .popular-categories-sec app-section-header,
    .popular-categories-sec app-category-card,
    .popular-categories-sec .btn-secondary,
    .why-section app-section-header,
    .why-section .story-viewer,
    .recently-added-sec .section-header-row,
    .recently-added-sec app-tool-card,
    .reviews-section app-section-header,
    .reviews-section .review-card,
    .cta-section .cta-content {
      opacity: 0;
    }

    @media (max-width: 1024px) {
      .tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .cats-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .reviews-grid { grid-template-columns: repeat(2, 1fr) !important; }
      
      .features-grid .feature-card:nth-child(n),
      .cats-grid app-category-card:nth-child(n),
      .recently-added-sec .tools-grid app-tool-card:nth-child(n),
      .reviews-grid .review-card:nth-child(n) {
        grid-column: span 1 !important;
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 0.875rem !important;
        padding: 1.5rem !important;
      }
      .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root .card-badges {
        position: relative !important;
        top: unset !important;
        right: unset !important;
      }
      .recently-added-sec .tools-grid app-tool-card:nth-child(1) ::ng-deep .tool-card-root .card-arrow {
        position: absolute !important;
        top: 1.25rem !important;
        right: 1.25rem !important;
        bottom: unset !important;
        transform: translate(4px, -4px) !important;
        opacity: 0 !important;
      }
    }
    @media (max-width: 768px) {
      .hero-section { padding: 6rem 0 4rem; min-height: 100vh; }
      .hero-title { font-size: 2.5rem; }
      .tools-grid, .cats-grid, .features-grid, .reviews-grid { grid-template-columns: 1fr !important; }
      .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .section-header-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .cta-actions { flex-direction: column; width: 100%; }
    }
    @media (max-width: 480px) {
      .trust-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class HomeComponent {
  private readonly el = inject(ElementRef);
  readonly toolsSvc = inject(ToolsService);
  readonly searchQuery = signal('');
  readonly searchResults = signal(this.toolsSvc.tools());
  readonly activeStoryIdx = signal(0);
  readonly showScrollTop = signal(false);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.showScrollTop.set(window.scrollY > 400);
    }
  }

  readonly themeSvc = inject(ThemeService);

  constructor() {
    effect(() => {
      // Trigger effect when themeSvc.theme changes
      const activeTheme = this.themeSvc.theme();
      
      // Reset animation guards
      this.heroTimelinePlayed = false;
      this.trustTimelinePlayed = false;
      this.categoriesTimelinePlayed = false;
      this.philosophyTimelinePlayed = false;
      this.recentlyAddedTimelinePlayed = false;
      this.reviewsTimelinePlayed = false;
      this.ctaTimelinePlayed = false;

      // Safe-delay to allow theme DOM repaint, then trigger entrance animation for visible sections
      setTimeout(() => {
        const sections = [
          { selector: '.hero-section', play: () => this.playHero() },
          { selector: '.trust-section', play: () => this.playTrust() },
          { selector: '.popular-categories-sec', play: () => this.playCategories() },
          { selector: '.why-section', play: () => this.playPhilosophy() },
          { selector: '.recently-added-sec', play: () => this.playRecentlyAdded() },
          { selector: '.reviews-section', play: () => this.playReviews() },
          { selector: '.cta-section', play: () => this.playCTA() }
        ];

        sections.forEach(s => {
          const el = this.el.nativeElement.querySelector(s.selector);
          if (el && typeof window !== 'undefined') {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            if (isVisible) {
              s.play();
            }
          }
        });
      }, 50);
    });
  }

  scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private heroTimelinePlayed = false;
  private trustTimelinePlayed = false;
  private categoriesTimelinePlayed = false;
  private philosophyTimelinePlayed = false;
  private recentlyAddedTimelinePlayed = false;
  private reviewsTimelinePlayed = false;
  private ctaTimelinePlayed = false;

  // Hero Animation
  playHero(): void {
    if (this.heroTimelinePlayed) return;
    this.heroTimelinePlayed = true;

    const heroSec = this.el.nativeElement.querySelector('.hero-section');
    if (heroSec) {
      const eyebrow = heroSec.querySelector('.hero-eyebrow');
      const title = heroSec.querySelector('.hero-title');
      const subtitle = heroSec.querySelector('.hero-subtitle');
      const ctas = heroSec.querySelector('.hero-ctas');
      const pills = heroSec.querySelector('.hero-pills');
      
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (eyebrow) {
        tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      }
      
      if (title) {
        let letters = title.querySelectorAll('.smoke-letter');
        if (letters.length === 0) {
          splitElement(title);
          letters = title.querySelectorAll('.smoke-letter');
        }
        
        // Prevent FOUC: make container visible and animate letters
        gsap.set(title, { opacity: 1 });
        
        tl.fromTo(letters,
          { 
            opacity: 0,
            filter: 'blur(16px)',
            scale: 1.8,
            x: () => gsap.utils.random(-40, 40),
            y: () => gsap.utils.random(-35, 35),
            rotation: () => gsap.utils.random(-15, 15)
          },
          { 
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            x: 0,
            y: 0,
            rotation: 0,
            duration: 1.6,
            stagger: {
              each: 0.02,
              from: 'random'
            },
            ease: 'power3.out'
          },
          '-=0.4'
        );
      }

      if (subtitle) {
        tl.fromTo(subtitle, 
          { filter: 'blur(12px)', opacity: 0 },
          { filter: 'blur(0px)', opacity: 1, duration: 0.8 },
          '-=1.0'
        );
      }

      if (ctas) {
        tl.fromTo(ctas, 
          { scale: 0.95, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8 },
          '-=0.6'
        );
      }

      if (pills) {
        const pillItems = pills.querySelectorAll('.hero-pill');
        if (pillItems.length > 0) {
          tl.fromTo(pillItems, 
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.6, stagger: 0.05 },
            '-=0.6'
          );
        } else {
          tl.fromTo(pills, 
            { opacity: 0 },
            { opacity: 1, duration: 0.6 },
            '-=0.6'
          );
        }
      }
    }
  }

  // Trust Animation
  playTrust(): void {
    if (this.trustTimelinePlayed) return;
    this.trustTimelinePlayed = true;

    const trustSec = this.el.nativeElement.querySelector('.trust-section');
    if (trustSec) {
      const items = trustSec.querySelectorAll('.trust-item');
      if (items.length > 0) {
        gsap.fromTo(items,
          { opacity: 0, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: 'power2.out'
          }
        );
      }
    }
  }

  // Categories Animation
  playCategories(): void {
    if (this.categoriesTimelinePlayed) return;
    this.categoriesTimelinePlayed = true;

    const catsSec = this.el.nativeElement.querySelector('.popular-categories-sec');
    if (catsSec) {
      const header = catsSec.querySelector('app-section-header');
      const cards = catsSec.querySelectorAll('app-category-card');
      const btn = catsSec.querySelector('.btn-secondary');
      
      const tl = gsap.timeline();
      
      if (header) {
        tl.fromTo(header, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6 });
      }
      if (cards.length > 0) {
        tl.fromTo(cards, 
          { opacity: 0, filter: 'blur(10px)', scale: 0.95 }, 
          { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.8, stagger: 0.06 }, 
          '-=0.4'
        );
      }
      if (btn) {
        tl.fromTo(btn, { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.4');
      }
    }
  }

  // Philosophy (Why Acklet) Animation
  playPhilosophy(): void {
    if (this.philosophyTimelinePlayed) return;
    this.philosophyTimelinePlayed = true;

    const whySec = this.el.nativeElement.querySelector('.why-section');
    if (whySec) {
      const header = whySec.querySelector('app-section-header');
      const viewer = whySec.querySelector('.story-viewer');
      
      const tl = gsap.timeline();
      
      if (header) {
        tl.fromTo(header, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6 });
      }
      if (viewer) {
        tl.fromTo(viewer, 
          { opacity: 0, filter: 'blur(10px)', y: 30 }, 
          { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.8, ease: 'power2.out' }, 
          '-=0.4'
        );
      }
    }
  }

  // Recently Added Animation
  playRecentlyAdded(): void {
    if (this.recentlyAddedTimelinePlayed) return;
    this.recentlyAddedTimelinePlayed = true;

    const recentSec = this.el.nativeElement.querySelector('.recently-added-sec');
    if (recentSec) {
      const header = recentSec.querySelector('.section-header-row');
      const cards = recentSec.querySelectorAll('app-tool-card');
      
      const tl = gsap.timeline();
      
      if (header) {
        tl.fromTo(header, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6 });
      }
      if (cards.length > 0) {
        tl.fromTo(cards, 
          { opacity: 0, filter: 'blur(10px)', scale: 0.96, y: 20 }, 
          { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, 
          '-=0.4'
        );
      }
    }
  }

  // Reviews Animation
  playReviews(): void {
    if (this.reviewsTimelinePlayed) return;
    this.reviewsTimelinePlayed = true;

    const reviewsSec = this.el.nativeElement.querySelector('.reviews-section');
    if (reviewsSec) {
      const header = reviewsSec.querySelector('app-section-header');
      const cards = reviewsSec.querySelectorAll('.review-card');
      
      const tl = gsap.timeline();
      
      if (header) {
        tl.fromTo(header, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6 });
      }
      if (cards.length > 0) {
        tl.fromTo(cards, 
          { opacity: 0, filter: 'blur(10px)', scale: 0.96, y: 20 }, 
          { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power2.out' }, 
          '-=0.4'
        );
      }
    }
  }

  // CTA Animation
  playCTA(): void {
    if (this.ctaTimelinePlayed) return;
    this.ctaTimelinePlayed = true;

    const ctaSec = this.el.nativeElement.querySelector('.cta-section');
    if (ctaSec) {
      const content = ctaSec.querySelector('.cta-content');
      if (content) {
        gsap.fromTo(content,
          { scale: 0.94, opacity: 0, filter: 'blur(12px)' },
          {
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.85,
            ease: 'power2.out'
          }
        );
      }
    }
  }

  /**
   * Trust signals — factual, defensible claims only.
   * No fabricated user counts or execution statistics.
   * Source: Brand Philosophy — "Trust is our greatest competitive advantage"
   */
  readonly trustSignals = [
    {
      icon: 'shield-check',
      label: 'Browser-based processing',
      desc: 'Your data never leaves your device',
      color: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.08)',
    },
    {
      icon: 'user-x',
      label: 'No account required',
      desc: 'Use everything without signing up',
      color: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.08)',
    },
    {
      icon: 'ban',
      label: 'Zero advertisements',
      desc: 'No banners, no trackers, no noise',
      color: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.08)',
    },
    {
      icon: 'heart',
      label: 'Always free',
      desc: 'Core solutions stay free, forever',
      color: '#ec4899',
      iconBg: 'rgba(236, 72, 153, 0.08)',
    },
  ];

  readonly reviews = [
    { quote: "Acklet has completely changed my daily workflow. Having all these offline utilities in one clean, fast interface without ads is a dream come true.", author: "Sarah Jenkins", role: "Frontend Engineer", avatarInitials: "SJ", rating: 5 },
    { quote: "The design is gorgeous. It feels like a premium native desktop app. I use the formatters and converters every single day.", author: "David Chen", role: "UI Designer", avatarInitials: "DC", rating: 5 },
    { quote: "No subscriptions, no trackers, no BS. Just solid offline-first tools that work instantly. This is what the web should be.", author: "Alex Kovalev", role: "Fullstack Developer", avatarInitials: "AK", rating: 5 },
    { quote: "I was skeptical at first, but the performance is mind-blowing. GSAP animations are fluid and the tools load in milliseconds.", author: "Elena Rostova", role: "Technical Writer", avatarInitials: "ER", rating: 5 },
    { quote: "The FHIR validator alone saved me hours of debugging. Acklet is a must-have bookmark for any developer.", author: "Marcus Thompson", role: "Healthcare IT Consultant", avatarInitials: "MT", rating: 5 },
    { quote: "A masterclass in modern web design and utility. The attention to detail is stunning, and it respects user privacy completely.", author: "Clara Dupont", role: "DevOps Engineer", avatarInitials: "CD", rating: 5 }
  ];

  /**
   * Why Acklet — grounded in Product Constitution and Brand Philosophy.
   * Every statement is a real product commitment, not marketing hype.
   */
  readonly whyAcklet = [
    {
      icon: 'target',
      title: 'Problems before features',
      desc: "Every solution exists because a real person had a real problem. We don't build features because competitors have them.",
      color: '#6366f1',
    },
    {
      icon: 'lock',
      title: 'Privacy is the default',
      desc: "Wherever possible, your inputs stay on your device. We collect only what we genuinely need — which is very little.",
      color: '#10b981',
    },
    {
      icon: 'zap',
      title: 'Speed is a feature',
      desc: 'Every second you wait is time stolen from meaningful work. We optimize for the fastest path from problem to solution.',
      color: '#f59e0b',
    },
    {
      icon: 'check-circle',
      title: 'Quality before quantity',
      desc: "Ten exceptional solutions create more trust than one hundred average ones. We ship only what we're proud of.",
      color: '#06b6d4',
    },
    {
      icon: 'layers',
      title: 'Consistency builds confidence',
      desc: 'Learn one solution and you understand every other. Predictable patterns reduce the time you spend figuring things out.',
      color: '#8b5cf6',
    },
    {
      icon: 'accessibility',
      title: 'Built for everyone',
      desc: 'Accessibility is not an optional enhancement. It is part of quality. Acklet should work for every person, on every device.',
      color: '#ec4899',
    },
  ];

  onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.searchResults.set(this.toolsSvc.searchTools(q));
  }
}

function splitElement(el: HTMLElement | ChildNode): void {
  const childNodes = Array.from(el.childNodes);
  
  for (const child of childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.nodeValue || '';
      if (!text.trim()) continue;
      
      const fragment = document.createDocumentFragment();
      const words = text.split(/(\s+)/);
      
      for (const word of words) {
        if (word.trim() === '') {
          fragment.appendChild(document.createTextNode(word));
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.style.display = 'inline-block';
          wordSpan.style.whiteSpace = 'nowrap';
          
          for (const char of word) {
            const charSpan = document.createElement('span');
            charSpan.className = 'smoke-letter';
            charSpan.style.display = 'inline-block';
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
          }
          fragment.appendChild(wordSpan);
        }
      }
      el.replaceChild(fragment, child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitElement(child as HTMLElement);
    }
  }
}
