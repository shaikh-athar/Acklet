// client/src/app/pages/home/home.ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToolsService } from '../../core/services/tools.service';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card';
import { CategoryCardComponent } from '../../shared/components/category-card/category-card';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, ToolCardComponent, CategoryCardComponent, SectionHeaderComponent, IconComponent],
  template: `
    <div class="home-root page-enter">

      <!-- ══ HERO ══════════════════════════════════════════════ -->
      <section class="hero-section gradient-mesh">
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
      <section class="trust-section">
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

      <!-- ══ FEATURED SOLUTIONS ═════════════════════════════════ -->
      <section class="section">
        <div class="container-main">
          <div class="section-header-row">
            <app-section-header eyebrow="Featured" title="Solutions for real work" subtitle="A curated selection of tools built to solve the problems you encounter most." />
            <a routerLink="/tools" class="btn btn-secondary">
              All solutions
              <app-icon name="arrow-right" class="size-3.5" />
            </a>
          </div>
          <div class="tools-grid">
            @for (tool of toolsSvc.featuredTools(); track tool.id) {
              <app-tool-card [tool]="tool" />
            }
          </div>
        </div>
      </section>

      <!-- ══ CATEGORIES ════════════════════════════════════════ -->
      <section class="section popular-categories-sec">
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

      <!-- ══ TRENDING ═══════════════════════════════════════════ -->
      <section class="section">
        <div class="container-main">
          <div class="section-header-row">
            <app-section-header eyebrow="Trending" title="What people are solving right now" subtitle="The solutions being used most frequently this week." />
            <a routerLink="/tools" [queryParams]="{filter:'trending'}" class="btn btn-secondary">
              See trending
              <app-icon name="arrow-right" class="size-3.5" />
            </a>
          </div>
          <div class="tools-grid">
            @for (tool of toolsSvc.trendingTools(); track tool.id) {
              <app-tool-card [tool]="tool" />
            }
          </div>
        </div>
      </section>

      <!-- ══ WHY ACKLET ══════════════════════════════════════════ -->
      <!-- Grounded in Product Constitution and Brand Philosophy — no marketing hype -->
      <section class="section why-section">
        <div class="orb orb-brand" style="width:400px;height:400px;top:0;right:-100px;opacity:0.25"></div>
        <div class="container-main">
          <app-section-header eyebrow="Philosophy" title="Technology should feel helpful, not overwhelming" subtitle="Every decision we make is guided by one question: does this genuinely help someone accomplish something?" [centered]="true" />
          <div class="features-grid mt-14">
            @for (f of whyAcklet; track f.title) {
              <div class="feature-card glass" [style.--feat-color]="f.color">
                <div class="feat-icon-box">
                  <app-icon [name]="f.icon" class="feat-icon size-6" />
                </div>
                <h3 class="feat-title">{{ f.title }}</h3>
                <p class="feat-desc">{{ f.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ══ NEW ADDITIONS ══════════════════════════════════════ -->
      <section class="section recently-added-sec">
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

      <!-- ══ CTA ════════════════════════════════════════════════ -->
      <section class="cta-section">
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

    </div>
  `,
  styles: [`
    .home-root { overflow: hidden; }

    /* Hero */
    .hero-section { position: relative; padding: 11rem 0 5rem; min-height: 75vh; display: flex; align-items: center; overflow: hidden; }
    .hero-orb-1 { width: 600px; height: 600px; top: -200px; left: -150px; }
    .hero-orb-2 { width: 400px; height: 400px; bottom: -100px; right: -50px; }
    .hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.5rem; max-width: 800px; margin: 0 auto; }
    .hero-eyebrow { animation: var(--animate-fade-up); animation-delay: 0.1s; animation-fill-mode: both; opacity: 0; }
    .hero-title { font-family: var(--font-serif); font-size: clamp(2.75rem, 7vw, 5rem); font-weight: 700; color: var(--color-brand-900); line-height: 1.1; letter-spacing: -0.03em; animation: var(--animate-fade-up); animation-delay: 0.2s; animation-fill-mode: both; opacity: 0; }
    .hero-subtitle { font-size: 1.1rem; color: var(--color-brand-600); line-height: 1.75; max-width: 560px; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.3s; opacity: 0; }

    /* Hero Search */
    .hero-search-wrap { position: relative; max-width: 560px; width: 100%; margin: 0 auto; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.4s; opacity: 0; }
    .hero-search { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; border-radius: var(--radius-xl); background: #ffffff; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 24px rgba(0,0,0,0.06); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .hero-search:focus-within { border-color: rgba(99,102,241,0.4); box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 0 0 3px rgba(99,102,241,0.1); }
    .hero-search-input { flex: 1; background: none; border: none; outline: none; font-size: 0.9rem; color: var(--color-neutral-100); font-family: inherit; }
    .hero-search-input::placeholder { color: var(--color-neutral-400); }
    .search-shortcut { display: flex; gap: 0.2rem; }
    .search-shortcut kbd { background: var(--color-surface-800); border: 1px solid rgba(0,0,0,0.08); border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.65rem; color: var(--color-neutral-400); font-family: inherit; }

    /* Search Results Preview */
    .search-results-preview { position: absolute; top: calc(100% + 8px); left: 0; right: 0; border-radius: var(--radius-xl); overflow: hidden; z-index: 50; box-shadow: 0 8px 40px rgba(0,0,0,0.1); }
    .search-result-item { display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem 1.25rem; text-decoration: none; color: var(--color-neutral-100); transition: background 0.2s; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .search-result-item:last-child { border-bottom: none; }
    .search-result-item:hover { background: rgba(0,0,0,0.02); }
    .sr-icon-box { width: 30px; height: 30px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sr-name { font-size: 0.85rem; font-weight: 600; }
    .sr-cat { font-size: 0.72rem; color: var(--color-neutral-500); }
    .sr-empty { padding: 1.25rem; text-align: center; color: var(--color-neutral-500); font-size: 0.85rem; }

    /* CTAs & Pills */
    .hero-ctas { display: flex; align-items: center; justify-content: center; gap: 1rem; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.5s; opacity: 0; }
    .hero-pills { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.5rem; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.6s; opacity: 0; }
    .hero-pill { padding: 0.35rem 0.875rem; border-radius: 999px; font-size: 0.78rem; color: var(--color-neutral-400); background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); text-decoration: none; display: inline-flex; align-items: center; transition: all 0.25s; }
    .hero-pill:hover { color: var(--color-brand-800); border-color: rgba(0,0,0,0.12); background: rgba(0,0,0,0.04); }

    /* Trust signals */
    .trust-section { padding: 3.5rem 0; border-top: 1px solid rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05); background: var(--color-surface-900); }
    .trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
    .trust-item { display: flex; align-items: flex-start; gap: 0.875rem; }
    .trust-icon-wrap { width: 38px; height: 38px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.04); }
    .trust-label { font-size: 0.875rem; font-weight: 700; color: var(--color-neutral-100); }
    .trust-desc { font-size: 0.75rem; color: var(--color-neutral-500); margin-top: 0.15rem; line-height: 1.45; }

    /* Section row */
    .section-header-row { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-bottom: 2.5rem; }
    .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

    /* Categories */
    .popular-categories-sec { background: var(--color-surface-900); border-top: 1px solid rgba(0,0,0,0.04); border-bottom: 1px solid rgba(0,0,0,0.04); padding: 5rem 0; }
    .cats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }

    /* Why Acklet */
    .why-section { position: relative; overflow: hidden; }
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .feature-card { padding: 2rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 0.875rem; border: 1px solid rgba(0,0,0,0.06); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .feature-card:hover { background: var(--color-surface-800); border-color: color-mix(in srgb, var(--feat-color) 20%, transparent); transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
    .feat-icon-box { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--feat-color) 8%, rgba(0,0,0,0.02)); border: 1px solid color-mix(in srgb, var(--feat-color) 16%, rgba(0,0,0,0.06)); transition: all 0.3s; }
    .feature-card:hover .feat-icon-box { background: color-mix(in srgb, var(--feat-color) 12%, transparent); border-color: color-mix(in srgb, var(--feat-color) 30%, transparent); }
    .feat-icon { color: var(--feat-color, #6366f1); }
    .feat-title { font-size: 1rem; font-weight: 700; color: var(--color-neutral-100); }
    .feat-desc { font-size: 0.825rem; color: var(--color-neutral-400); line-height: 1.65; }

    /* Recently Added */
    .recently-added-sec { background: var(--color-surface-900); border-top: 1px solid rgba(0,0,0,0.04); border-bottom: 1px solid rgba(0,0,0,0.04); padding: 5rem 0; }

    /* CTA */
    .cta-section { padding: 7rem 0; background: var(--color-surface-900); position: relative; overflow: hidden; border-top: 1px solid rgba(0,0,0,0.04); }
    .cta-inner { position: relative; z-index: 2; }
    .cta-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .cta-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.03em; line-height: 1.2; }
    .cta-subtitle { font-size: 1.05rem; color: var(--color-neutral-400); max-width: 480px; line-height: 1.7; }
    .cta-actions { display: flex; gap: 0.875rem; }

    @media (max-width: 1024px) {
      .tools-grid { grid-template-columns: repeat(2, 1fr); }
      .cats-grid { grid-template-columns: repeat(2, 1fr); }
      .features-grid { grid-template-columns: repeat(2, 1fr); }
      .trust-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .hero-section { padding: 6rem 0 4rem; min-height: auto; }
      .hero-title { font-size: 2.5rem; }
      .tools-grid, .cats-grid, .features-grid { grid-template-columns: 1fr; }
      .trust-grid { grid-template-columns: repeat(2, 1fr); }
      .section-header-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .cta-actions { flex-direction: column; width: 100%; }
    }
    @media (max-width: 480px) {
      .trust-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class HomeComponent {
  readonly toolsSvc = inject(ToolsService);
  readonly searchQuery = signal('');
  readonly searchResults = signal(this.toolsSvc.tools());

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
