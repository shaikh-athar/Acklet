// client/src/app/pages/tool-detail/tool-detail.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToolsService } from '../../core/services/tools.service';
import { IconComponent } from '../../shared/components/icon/icon';
import { Tool } from '../../core/models/tool.model';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="tool-detail-page page-enter">
      @if (tool()) {
        <!-- Hero -->
        <div class="td-hero gradient-mesh">
          <div class="orb orb-brand" style="width:400px;height:400px;top:-200px;left:-100px"></div>
          <div class="container-main td-hero-inner">
            <!-- Breadcrumb -->
            <div class="breadcrumb">
              <a routerLink="/">Home</a>
              <app-icon name="chevron-right" class="size-3 text-neutral-600 mx-1" />
              <a routerLink="/tools">Solutions</a>
              <app-icon name="chevron-right" class="size-3 text-neutral-600 mx-1" />
              <a [routerLink]="['/tools']" [queryParams]="{category: getCategorySlug()}">{{ tool()!.categoryName }}</a>
              <app-icon name="chevron-right" class="size-3 text-neutral-600 mx-1" />
              <span class="bc-current">{{ tool()!.name }}</span>
            </div>

            <div class="td-hero-content" [style.--tool-color]="tool()!.color">
              <div class="td-icon-wrap">
                <app-icon [name]="tool()!.icon" class="td-icon size-8" />
              </div>
              <div class="td-hero-text">
                <div class="td-meta">
                  <span class="badge badge-neutral">{{ tool()!.categoryName }}</span>
                  @if (tool()!.isNew) { <span class="badge badge-accent">New</span> }
                  @if (tool()!.isTrending) { <span class="badge badge-brand">Trending</span> }
                </div>
                <h1 class="td-title">{{ tool()!.name }}</h1>
                <p class="td-subtitle">{{ tool()!.shortDescription }}</p>
                <div class="td-stats-row">
                  <span class="badge badge-brand flex items-center gap-1">
                    <app-icon name="shield" class="size-3.5 text-brand-300 mr-1.5" />
                    Private Sandbox
                  </span>
                  <span class="td-divider">·</span>
                  <span class="td-usage-stat">
                    <app-icon name="users" class="size-3.5 text-neutral-500 inline-block mr-1" />
                    {{ formatCount(tool()!.usageCount) }} runs
                  </span>
                </div>
                <div class="td-tag-row">
                  @for (tag of tool()!.tags; track tag) {
                    <span class="tag-pill">{{ tag }}</span>
                  }
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="td-hero-cta">
              <button class="btn btn-primary btn-lg" (click)="useTool()">
                <app-icon name="zap" class="size-4 mr-1.5 fill-current" />
                Launch Locally
              </button>
              <button class="btn btn-secondary" (click)="copyLink()">
                <app-icon name="arrow-up-right" class="size-4 mr-1.5" />
                Copy Link
              </button>
              <button class="btn btn-ghost" (click)="toggleFavorite()" [class.favorited]="isFavorited()">
                <app-icon name="heart" class="size-4 mr-1.5" [class.fill-current]="isFavorited()" />
                {{ isFavorited() ? 'Saved' : 'Save to Favorites' }}
              </button>
            </div>
          </div>
        </div>

        <div class="container-main td-body">
          <!-- Left column -->
          <div class="td-main">
            <!-- Description -->
            <section class="td-section">
              <h2 class="td-section-title">About this tool</h2>
              <p class="td-desc">{{ tool()!.description }}</p>
            </section>

            <!-- Features -->
            <section class="td-section">
              <h2 class="td-section-title">Features</h2>
              <div class="features-list">
                @for (f of tool()!.features; track f) {
                  <div class="feature-item">
                    <app-icon name="check" class="feature-check size-4 text-success-500 mr-2" />
                    <span>{{ f }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Screenshot placeholders -->
            <section class="td-section">
              <h2 class="td-section-title">Visual Interface Preview</h2>
              <div class="screenshots-grid">
                @for (ss of tool()!.screenshots; track ss.id) {
                  <div class="screenshot-placeholder">
                    <div class="ss-inner">
                      <div class="ss-bar">
                        <span class="ss-dot red"></span>
                        <span class="ss-dot yellow"></span>
                        <span class="ss-dot green"></span>
                      </div>
                      <div class="ss-content">
                        <app-icon [name]="tool()!.icon" class="size-10 text-neutral-600 mb-2" />
                        <div class="ss-title">{{ ss.title }}</div>
                        <div class="ss-desc">{{ ss.description }}</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <!-- Usage Steps -->
            <section class="td-section">
              <h2 class="td-section-title">Execution Procedure</h2>
              <div class="steps-list">
                @for (step of tool()!.usageSteps; track step.step) {
                  <div class="step-item">
                    <div class="step-num">{{ step.step }}</div>
                    <div class="step-content">
                      <h3 class="step-title">{{ step.title }}</h3>
                      <p class="step-desc">{{ step.description }}</p>
                    </div>
                  </div>
                }
              </div>
            </section>

            <!-- FAQ -->
            <section class="td-section">
              <h2 class="td-section-title">Frequently Asked Questions</h2>
              <div class="faq-list">
                @for (faq of tool()!.faqs; track faq.question; let i = $index) {
                  <div class="faq-item" [class.open]="openFaq() === i" (click)="toggleFaq(i)">
                    <div class="faq-q">
                      <span>{{ faq.question }}</span>
                      <app-icon name="chevron-down" class="size-4 text-neutral-500" [class.rotated]="openFaq() === i" />
                    </div>
                    @if (openFaq() === i) {
                      <div class="faq-a">{{ faq.answer }}</div>
                    }
                  </div>
                }
              </div>
            </section>

            <!-- Local-first Sandbox Guarantee -->
            <section class="td-section">
              <h2 class="td-section-title">Zero-Telemetry Sandbox Guarantee</h2>
              <div class="reviews-summary flex flex-col items-start gap-4">
                <div class="flex items-center gap-3">
                  <div class="logo-icon flex-shrink-0" style="width:36px; height:36px; border-radius:var(--radius-md); background:rgba(99, 102, 241, 0.1); border:1px solid rgba(99,102,241,0.2); display:flex; align-items:center; justify-content:center;">
                    <app-icon name="shield" class="size-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-neutral-100">Zero Cloud Processing Guarantee</h3>
                    <p class="text-xs text-neutral-500">Every execution runs directly in-memory within your local sandbox environment.</p>
                  </div>
                </div>
                <div class="text-xs text-neutral-400 leading-relaxed">
                  Acklet uses a secure local-first compilation layer. All parsed structures, conversions, and inputs remain purely within your browser memory segment. No tracing cookies, trackers, or endpoint analytics are loaded or transmitted.
                </div>
              </div>
            </section>
          </div>

          <!-- Right sidebar -->
          <aside class="td-sidebar">
            <div class="td-info-card glass">
              <h3 class="info-card-title">Technical Specifications</h3>
              <div class="info-rows">
                <div class="info-row"><span class="info-label">Category</span><span class="info-val">{{ tool()!.categoryName }}</span></div>
                <div class="info-row"><span class="info-label">Latency</span><span class="info-val">Sub-10ms</span></div>
                <div class="info-row"><span class="info-label">Privacy State</span><span class="info-val">Fully Offline</span></div>
                <div class="info-row"><span class="info-label">Executions</span><span class="info-val">{{ formatCount(tool()!.usageCount) }}</span></div>
                <div class="info-row"><span class="info-label">Release Date</span><span class="info-val">{{ tool()!.addedDate }}</span></div>
                <div class="info-row">
                  <span class="info-label">Host Environment</span>
                  <span class="info-val text-success-400">
                    <app-icon name="shield-check" class="size-3.5 mr-0.5 inline-block" />
                    Browser-only
                  </span>
                </div>
              </div>
            </div>

            <!-- Related Tools -->
            @if (relatedTools().length > 0) {
              <div class="related-section">
                <h3 class="related-title">Related Tools</h3>
                <div class="related-list">
                  @for (rt of relatedTools(); track rt.id) {
                    <a [routerLink]="['/tools', rt.slug]" class="related-item glass">
                      <div class="related-icon" [style.background]="rt.gradient">
                        <app-icon [name]="rt.icon" class="size-4.5 text-white" />
                      </div>
                      <div class="related-info">
                        <div class="related-name">{{ rt.name }}</div>
                        <div class="related-cat">{{ rt.categoryName }}</div>
                      </div>
                      <app-icon name="chevron-right" class="size-4 text-neutral-500" />
                    </a>
                  }
                </div>
              </div>
            }
          </aside>
        </div>
      } @else {
        <div class="not-found-wrap">
          <app-icon name="search" class="size-12 text-neutral-500" />
          <h2>Tool Specification Not Found</h2>
          <a routerLink="/tools" class="btn btn-primary">Browse complete catalog</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .tool-detail-page { min-height: 100vh; }
    .td-hero { padding: 8.5rem 0 3.5rem; border-bottom: 1px solid var(--border-soft); position: relative; overflow: hidden; }
    .td-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1.75rem; }
    .breadcrumb { display: flex; align-items: center; font-size: 0.78rem; color: var(--color-neutral-400); }
    .breadcrumb a { color: var(--color-neutral-400); text-decoration: none; transition: color 0.2s; }
    .breadcrumb a:hover { color: #818cf8; }
    .bc-current { color: var(--color-neutral-200); }
    .td-hero-content { display: flex; gap: 2rem; align-items: flex-start; }
    .td-icon-wrap {
      width: 64px; height: 64px; border-radius: var(--radius-xl);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--tool-color, #6366f1) 8%, var(--surface-hover));
      border: 1px solid color-mix(in srgb, var(--tool-color, #6366f1) 20%, var(--border-soft));
      box-shadow: 0 8px 32px rgba(0,0,0,0.05);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .td-icon {
      color: var(--tool-color, #818cf8);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .td-hero-content:hover .td-icon-wrap {
      background: color-mix(in srgb, var(--tool-color, #6366f1) 15%, transparent) !important;
      border-color: color-mix(in srgb, var(--tool-color, #6366f1) 50%, transparent) !important;
      box-shadow: 0 0 24px color-mix(in srgb, var(--tool-color, #6366f1) 40%, transparent);
    }
    .td-hero-content:hover .td-icon {
      filter: drop-shadow(0 0 8px var(--tool-color, #818cf8));
    }
    .td-hero-text { flex: 1; display: flex; flex-direction: column; gap: 0.625rem; }
    .td-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .td-title { font-size: clamp(2rem, 4vw, 3.5rem); font-family: var(--font-hero); font-weight: 600; color: var(--color-neutral-50); letter-spacing: -0.02em; }
    .td-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 650px; }
    .td-stats-row { display: flex; align-items: center; gap: 0.75rem; }
    .td-divider { color: var(--border-medium); }
    .td-usage-stat { font-size: 0.8rem; color: var(--color-neutral-400); display: inline-flex; align-items: center; }
    .td-tag-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .tag-pill { padding: 0.2rem 0.625rem; border-radius: var(--radius-sm); font-size: 0.72rem; background: var(--surface-hover); border: 1px solid var(--border-soft); color: var(--color-neutral-400); }
    .td-hero-cta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .favorited { color: #f87171 !important; border-color: rgba(248,113,113,0.3) !important; background: rgba(248,113,113,0.05) !important; }
 
    .td-body { display: grid; grid-template-columns: 1fr 300px; gap: 3rem; padding-top: 3.5rem; padding-bottom: 6rem; align-items: start; }
    .td-section { margin-bottom: 3.5rem; }
    .td-section-title { font-size: 1.5rem; font-weight: 500; color: var(--color-neutral-100); margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-soft); }
    .td-desc { font-size: 0.9rem; color: var(--color-neutral-300); line-height: 1.8; }
    .features-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .feature-item { display: flex; align-items: flex-start; font-size: 0.875rem; color: var(--color-neutral-300); }
    .feature-check { flex-shrink: 0; margin-top: 0.15rem; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .screenshot-placeholder { border-radius: var(--radius-xl); overflow: hidden; border: 1px solid var(--border-soft); background: var(--color-surface-900); }
    .ss-inner { display: flex; flex-direction: column; }
    .ss-bar { display: flex; gap: 0.375rem; padding: 0.625rem 1rem; background: var(--color-surface-800); border-bottom: 1px solid var(--border-soft); }
    .ss-dot { width: 8px; height: 8px; border-radius: 50%; }
    .ss-dot.red { background: #ef4444; } .ss-dot.yellow { background: #f59e0b; } .ss-dot.green { background: #22c55e; }
    .ss-content { padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .ss-title { font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-100); }
    .ss-desc { font-size: 0.75rem; color: var(--color-neutral-400); }
    .steps-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .step-item { display: flex; gap: 1.25rem; align-items: flex-start; }
    .step-num { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: white; flex-shrink: 0; }
    .step-content { flex: 1; }
    .step-title { font-size: 0.9rem; font-weight: 600; color: var(--color-neutral-100); margin-bottom: 0.25rem; }
    .step-desc { font-size: 0.825rem; color: var(--color-neutral-400); line-height: 1.6; }
    
    .faq-list { display: flex; flex-direction: column; gap: 0.625rem; }
    .faq-item { border: 1px solid var(--border-soft); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all 0.25s ease; background: var(--color-surface-900); }
    .faq-item:hover, .faq-item.open { border-color: var(--border-medium); box-shadow: var(--shadow-card); }
    .faq-q { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; font-size: 0.875rem; font-weight: 600; color: var(--color-neutral-100); }
    .faq-q app-icon { flex-shrink: 0; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .faq-q app-icon.rotated { transform: rotate(180deg); color: #818cf8; }
    .faq-a { padding: 0 1.25rem 1rem; font-size: 0.825rem; color: var(--color-neutral-400); line-height: 1.7; }
    
    .reviews-summary { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.04); margin-bottom: 1.5rem; }
    .review-big-score { font-size: 3rem; font-weight: 800; color: var(--color-neutral-100); line-height: 1; }
    .review-count-label { font-size: 0.78rem; color: var(--color-neutral-500); margin-top: 0.25rem; }
    
    .reviews-list { display: flex; flex-direction: column; gap: 1rem; }
    .review-card { padding: 1.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 0.875rem; border: 1px solid rgba(255,255,255,0.04); }
    .review-header { display: flex; align-items: center; gap: 1rem; }
    .review-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: white; flex-shrink: 0; }
    .review-meta { flex: 1; }
    .review-name { font-size: 0.825rem; font-weight: 600; color: var(--color-neutral-100); display: flex; align-items: center; gap: 0.5rem; }
    .verified-badge { font-size: 0.65rem; color: #4ade80; font-weight: 600; display: inline-flex; align-items: center; }
    .review-date { font-size: 0.72rem; color: var(--color-neutral-500); }
    .review-title { font-size: 0.875rem; font-weight: 600; color: var(--color-neutral-100); }
    .review-body { font-size: 0.825rem; color: var(--color-neutral-400); line-height: 1.7; }
    .review-helpful { display: flex; align-items: center; gap: 0.625rem; }
    .helpful-label { font-size: 0.72rem; color: var(--color-neutral-500); }
    .helpful-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); color: var(--color-neutral-400); font-size: 0.72rem; padding: 0.2rem 0.5rem; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; }
    .helpful-btn:hover { border-color: rgba(99,102,241,0.25); color: #818cf8; }
    
    .td-sidebar { display: flex; flex-direction: column; gap: 1.5rem; position: sticky; top: 84px; }
    .td-info-card { padding: 1.5rem; border-radius: var(--radius-xl); }
    .info-card-title { font-size: 0.825rem; font-weight: 700; color: var(--color-neutral-100); margin-bottom: 1.125rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-rows { display: flex; flex-direction: column; gap: 0.75rem; }
    .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; }
    .info-label { color: var(--color-neutral-400); }
    .info-val { color: var(--color-neutral-200); font-weight: 600; }
    
    .related-section { display: flex; flex-direction: column; gap: 1rem; }
    .related-title { font-size: 0.825rem; font-weight: 700; color: var(--color-neutral-100); text-transform: uppercase; letter-spacing: 0.08em; }
    .related-list { display: flex; flex-direction: column; gap: 0.625rem; }
    .related-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: var(--radius-lg); text-decoration: none; color: var(--color-neutral-100); border: 1px solid rgba(255,255,255,0.04); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .related-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(99,102,241,0.15); }
    .related-icon { width: 34px; height: 34px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .related-info { flex: 1; }
    .related-name { font-size: 0.8rem; font-weight: 600; }
    .related-cat { font-size: 0.7rem; color: var(--color-neutral-500); }
    
    .not-found-wrap { text-align: center; padding: 8rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; color: var(--color-neutral-100); }
    
    @media (max-width: 900px) {
      .td-body { grid-template-columns: 1fr; }
      .td-sidebar { position: static; }
      .screenshots-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ToolDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toolsSvc = inject(ToolsService);

  readonly tool = signal<Tool | undefined>(undefined);
  readonly relatedTools = signal<Tool[]>([]);
  readonly isFavorited = signal(false);
  readonly openFaq = signal<number | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const t = this.toolsSvc.getToolBySlug(params['id']);
      this.tool.set(t);
      if (t) this.relatedTools.set(this.toolsSvc.getRelatedTools(t.relatedToolIds));
    });
  }

  toggleFaq(i: number): void { this.openFaq.set(this.openFaq() === i ? null : i); }
  toggleFavorite(): void { this.isFavorited.update(v => !v); }
  useTool(): void { alert('Tool interface launching configuration details soon.'); }
  copyLink(): void { navigator.clipboard.writeText(window.location.href); }

  getCategorySlug(): string {
    const t = this.tool();
    if (!t) return '';
    const cat = this.toolsSvc.getCategoryById(t.categoryId);
    return cat ? cat.slug : '';
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
  }
}
