import { Component, inject, OnInit, signal, Type } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToolsService } from '../../core/services/tools.service';
import { DiscoveryService } from '../../core/services/discovery.service';
import { ToolKnowledgeService } from '../../core/services/tool-knowledge.service';
import { SeoService } from '../../core/services/seo.service';
import { IconComponent } from '../../shared/components/icon/icon';
import { Tool } from '../../core/models/tool.model';
import { ToolKnowledgeHub } from '../../core/models/tool-knowledge.model';
import { TOOL_COMPONENTS } from '../../core/tool-registry';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="tool-detail-page page-enter">
      @if (tool()) {
        <!-- HERO -->
        <div class="td-hero gradient-mesh" [style.--tool-color]="tool()!.color">
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

            <div class="td-hero-content">
              <div class="td-icon-wrap">
                <app-icon [name]="tool()!.icon || 'zap'" class="td-icon size-8" />
              </div>
              <div class="td-hero-text">
                <div class="td-meta">
                  <span class="badge badge-neutral">{{ tool()!.categoryName }}</span>
                  @if (tool()!.isNew) { <span class="badge badge-accent">New</span> }
                  @if (tool()!.isTrending) { <span class="badge badge-brand">Trending</span> }
                  @if (knowledge()?.verifiedBadge) {
                    <span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                      <app-icon name="shield-check" class="size-3" /> Verified Author
                    </span>
                  }
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
              </div>
            </div>

            <!-- CTA -->
            <div class="td-hero-cta">
              <button class="btn btn-primary btn-lg" (click)="useTool()">
                <app-icon name="zap" class="size-4 mr-1.5 fill-current" />
                Launch Sandbox
              </button>
              <button class="btn btn-secondary" (click)="copyLink()">
                <app-icon name="arrow-up-right" class="size-4 mr-1.5" />
                Share
              </button>
              <button class="btn btn-ghost" (click)="toggleFavorite()" [class.favorited]="isFavorited()">
                <app-icon name="heart" class="size-4 mr-1.5" [class.fill-current]="isFavorited()" />
                {{ isFavorited() ? 'Saved' : 'Save to Favorites' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Sandbox Layer -->
        @if (sandboxLaunched()) {
          <div class="container-main py-8 border-b border-[var(--border-soft)]">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold flex items-center gap-2">
                <app-icon name="wrench" class="text-brand-400 size-5" />
                Interactive Sandbox
              </h2>
              <button class="btn btn-ghost btn-sm" (click)="closeSandbox()">
                <app-icon name="x" class="size-4 mr-1" /> Close Sandbox
              </button>
            </div>
            
            <div class="p-6 bg-neutral-950 rounded-2xl border border-[var(--border-soft)]">
              @if (loadError()) {
                <div class="flex flex-col items-center justify-center p-8 text-center text-rose-400 gap-3">
                  <app-icon name="shield-alert" class="size-12 text-rose-500" />
                  <h3 class="font-bold text-lg">Sandbox Loading Error</h3>
                  <p class="text-sm max-w-md text-neutral-400">{{ loadError() }}</p>
                </div>
              } @else if (dynamicComponent()) {
                <ng-container *ngComponentOutlet="dynamicComponent()" />
              } @else {
                <div class="flex flex-col items-center justify-center p-8 text-neutral-500 gap-2">
                  <app-icon name="clock" class="size-8 animate-spin" />
                  <p class="text-sm">Launching secure sandbox environment...</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- CONTENT LAYOUT -->
        <div class="container-main td-body">
          <div class="td-main">
            <!-- Overview -->
            <section id="overview" class="td-section">
              <h2 class="td-section-title">Overview</h2>
              <p class="td-desc">{{ knowledge()?.overview || tool()!.description }}</p>

              <!-- Advantages & Limitations side-by-side -->
              <div class="adv-lim-row">
                <div class="adv-card">
                  <h3 class="adv-card-title">
                    <app-icon name="check-circle" class="size-4 mr-1.5 text-emerald-400" />
                    Advantages
                  </h3>
                  <p class="adv-card-desc">{{ knowledge()?.advantages || 'Immediate performance, fully client-side calculations.' }}</p>
                </div>
                <div class="lim-card">
                  <h3 class="lim-card-title">
                    <app-icon name="x-circle" class="size-4 mr-1.5 text-rose-400" />
                    Limitations
                  </h3>
                  <p class="lim-card-desc">{{ knowledge()?.limitations || 'Memory segment bounds within the browser runtime.' }}</p>
                </div>
              </div>
            </section>

            <!-- Technical details -->
            <section id="technical" class="td-section">
              <h2 class="td-section-title">Technical Specifications</h2>
              <div class="specs-grid-container">
                <div class="spec-tile">
                  <span class="spec-tile-label">Inputs Expected</span>
                  <span class="spec-tile-val">{{ knowledge()?.expectedInputs || 'Raw Minified Payload' }}</span>
                </div>
                <div class="spec-tile">
                  <span class="spec-tile-label">Outputs Expected</span>
                  <span class="spec-tile-val">{{ knowledge()?.expectedOutputs || 'Structured Indented Format' }}</span>
                </div>
                @for (spec of getTechnicalSpecs(); track spec.key) {
                  <div class="spec-tile">
                    <span class="spec-tile-label">{{ spec.key }}</span>
                    <span class="spec-tile-val">{{ spec.value }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Privacy audit -->
            <section id="privacy" class="td-section">
              <h2 class="td-section-title">Security & Privacy Audit</h2>
              <div class="privacy-box">
                <div class="privacy-box-header">
                  <app-icon name="shield" class="size-5 text-emerald-400" />
                  <h3>Zero Telemetry Sandbox Guarantee</h3>
                </div>
                <p class="privacy-box-desc">
                  Acklet runs tools using secure client-side code compilers. Data is transformed in browser memory space without any tracking, endpoint leakage, or remote cloud database serialization.
                </p>
                <div class="privacy-details-list">
                  @for (priv of getPrivacyDetails(); track priv.key) {
                    <div class="privacy-detail-row">
                      <span class="privacy-detail-label">{{ priv.key }}</span>
                      <span class="privacy-detail-val">{{ priv.value }}</span>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Pricing & Licenses -->
            <section id="pricing" class="td-section">
              <h2 class="td-section-title">Pricing & Licensing</h2>
              <div class="specs-grid-container">
                <div class="spec-tile">
                  <span class="spec-tile-label">Pricing Model</span>
                  <span class="spec-tile-val text-indigo-400 font-bold">Free / Freemium</span>
                </div>
                @for (p of getPricingDetails(); track p.key) {
                  <div class="spec-tile">
                    <span class="spec-tile-label">{{ p.key }}</span>
                    <span class="spec-tile-val">{{ p.value }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Compatibility Matrix -->
            <section id="compatibility" class="td-section">
              <h2 class="td-section-title">Compatibility Matrix</h2>
              <div class="compat-grid">
                @for (env of getCompatibilitySpecs(); track env.key) {
                  <div class="compat-tile">
                    <span class="compat-tile-env">{{ env.key }}</span>
                    <span class="compat-tile-status">{{ env.value }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Version Log / History -->
            <section id="versions" class="td-section">
              <h2 class="td-section-title">Release Version Log</h2>
              <div class="version-log-list">
                @if (knowledge()?.versionHistory && knowledge()!.versionHistory.length > 0) {
                  @for (v of knowledge()!.versionHistory; track v.version) {
                    <div class="version-log-item">
                      <div class="version-log-header">
                        <span class="version-num">v{{ v.version }}</span>
                        <span class="version-date">{{ v.releaseDate | date }}</span>
                      </div>
                      <p class="version-notes">{{ v.releaseNotes || 'Stable release updates.' }}</p>
                    </div>
                  }
                } @else {
                  <div class="version-log-item">
                    <div class="version-log-header">
                      <span class="version-num">v1.0.0</span>
                      <span class="version-date">Initial Release</span>
                    </div>
                    <p class="version-notes">Official production-grade stable release launch.</p>
                  </div>
                }
              </div>
            </section>
          </div>

          <!-- Sidebar -->
          <aside class="td-sidebar">
            <div class="td-info-card glass">
              <h3 class="info-card-title">Technical Specifications</h3>
              <div class="info-rows">
                <div class="info-row"><span class="info-label">Category</span><span class="info-val">{{ tool()!.categoryName }}</span></div>
                <div class="info-row"><span class="info-label">Latency</span><span class="info-val">Sub-10ms</span></div>
                <div class="info-row"><span class="info-label">Privacy State</span><span class="info-val">Fully Offline</span></div>
                <div class="info-row"><span class="info-label">Executions</span><span class="info-val">{{ formatCount(tool()!.usageCount) }}</span></div>
                @if (knowledge()?.officialWebsite) {
                  <div class="info-row"><span class="info-label">Publisher</span><span class="info-val">{{ knowledge()?.maintainer || 'Acklet' }}</span></div>
                }
              </div>
            </div>

            <!-- Resources -->
            <div class="related-section">
              <h3 class="related-title">Official Resources</h3>
              <div class="related-list">
                @if (knowledge()?.officialWebsite) {
                  <a [href]="knowledge()!.officialWebsite" target="_blank" class="related-item glass">
                    <div class="related-icon bg-brand-500/10 text-brand-400">
                      <app-icon name="external-link" class="size-4" />
                    </div>
                    <div class="related-info">
                      <div class="related-name">Official Website</div>
                      <div class="related-cat">Main Site</div>
                    </div>
                  </a>
                }
                @if (knowledge()?.documentationUrl) {
                  <a [href]="knowledge()!.documentationUrl" target="_blank" class="related-item glass">
                    <div class="related-icon bg-indigo-500/10 text-indigo-400">
                      <app-icon name="book" class="size-4" />
                    </div>
                    <div class="related-info">
                      <div class="related-name">Documentation</div>
                      <div class="related-cat">Developer Reference</div>
                    </div>
                  </a>
                }
                @if (knowledge()?.githubRepository) {
                  <a [href]="knowledge()!.githubRepository" target="_blank" class="related-item glass">
                    <div class="related-icon bg-neutral-800 text-neutral-300">
                      <app-icon name="github" class="size-4" />
                    </div>
                    <div class="related-info">
                      <div class="related-name">GitHub Repository</div>
                      <div class="related-cat">Source Code</div>
                    </div>
                  </a>
                }
              </div>
            </div>

            <!-- Related Tools -->
            @if (relatedTools().length > 0) {
              <div class="related-section">
                <h3 class="related-title">Related Tools</h3>
                <div class="related-list">
                  @for (rt of relatedTools(); track rt.id) {
                    <a [routerLink]="['/tools', rt.slug]" class="related-item glass">
                      <div class="related-icon bg-brand-500/10 text-brand-400">
                        <app-icon [name]="rt.icon || 'zap'" class="size-4.5" />
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
    .td-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
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

   
    /* Advantages and Limitations layout */
    .adv-lim-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .adv-card, .lim-card {
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .adv-card {
      background: rgba(16, 185, 129, 0.03);
      border-color: rgba(16, 185, 129, 0.1);
    }
    .lim-card {
      background: rgba(244, 63, 94, 0.03);
      border-color: rgba(244, 63, 94, 0.1);
    }
    .adv-card-title, .lim-card-title {
      font-size: 0.875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .adv-card-title { color: #34d399; }
    .lim-card-title { color: #f87171; }
    .adv-card-desc, .lim-card-desc {
      font-size: 0.8rem;
      color: var(--color-neutral-300);
      line-height: 1.6;
    }

    /* Specs & compatibility */
    .specs-grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .spec-tile {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.875rem 1.25rem;
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
    }
    .spec-tile-label {
      font-size: 0.8rem;
      color: var(--color-neutral-400);
    }
    .spec-tile-val {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-neutral-100);
    }

    /* Privacy Audit */
    .privacy-box {
      padding: 1.5rem;
      border-radius: var(--radius-xl);
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
    }
    .privacy-box-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .privacy-box-header h3 {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--color-neutral-100);
    }
    .privacy-box-desc {
      font-size: 0.825rem;
      color: var(--color-neutral-400);
      line-height: 1.7;
      margin-bottom: 1.25rem;
    }
    .privacy-details-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .privacy-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .privacy-detail-label {
      font-size: 0.78rem;
      color: var(--color-neutral-400);
    }
    .privacy-detail-val {
      font-size: 0.78rem;
      font-weight: 600;
      color: #34d399;
    }

    /* Compatibility Matrix */
    .compat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .compat-tile {
      padding: 1rem;
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      text-align: center;
    }
    .compat-tile-env {
      font-size: 0.7rem;
      color: var(--color-neutral-500);
      text-transform: uppercase;
      font-weight: 700;
      display: block;
      margin-bottom: 0.25rem;
    }
    .compat-tile-status {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-neutral-100);
    }

    /* Version History */
    .version-log-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .version-log-item {
      padding: 1.25rem;
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
    }
    .version-log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .version-num {
      font-size: 0.85rem;
      font-weight: 700;
      color: #818cf8;
      font-family: var(--font-mono);
    }
    .version-date {
      font-size: 0.72rem;
      color: var(--color-neutral-500);
    }
    .version-notes {
      font-size: 0.8rem;
      color: var(--color-neutral-300);
      line-height: 1.6;
    }

    .td-sidebar { display: flex; flex-direction: column; gap: 1.5rem; position: sticky; top: 120px; }
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
      .adv-lim-row { grid-template-columns: 1fr; }
      .specs-grid-container { grid-template-columns: 1fr; }
      .privacy-details-list { grid-template-columns: 1fr; }
      .compat-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class ToolDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toolsSvc = inject(ToolsService);
  private readonly discoverySvc = inject(DiscoveryService);
  private readonly knowledgeSvc = inject(ToolKnowledgeService);
  private readonly seoSvc = inject(SeoService);

  readonly tool = signal<Tool | undefined>(undefined);
  readonly knowledge = signal<ToolKnowledgeHub | null>(null);
  readonly relatedTools = signal<Tool[]>([]);
  readonly isFavorited = signal(false);

  readonly sandboxLaunched = signal(false);
  readonly dynamicComponent = signal<Type<any> | null>(null);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['id'];
      if (!slug) return;
      
      // Reset sandbox state when route parameter changes
      this.closeSandbox();
      
      this.toolsSvc.getToolBySlug(slug).subscribe(t => {
        this.tool.set(t);
        if (t) {
          // 1. Fetch DTO Recommendations
          this.discoverySvc.getToolRecommendations(t.id, 'ALTERNATIVE').subscribe(recs => {
            if (recs && recs.length > 0) {
              this.relatedTools.set(recs);
            } else {
              this.relatedTools.set(this.toolsSvc.getRelatedTools(t.relatedToolIds || []));
            }
          });

          // 2. Fetch Tool Knowledge audit profiles
          this.knowledgeSvc.getToolKnowledge(t.id).subscribe(hub => {
            this.knowledge.set(hub);
            this.seoSvc.setToolKnowledgeSeo(hub, t.name, t.categoryName || 'Developer Tools');
          });
        }
      });
    });
  }

  toggleFavorite(): void { this.isFavorited.update(v => !v); }

  useTool(): void {
    const slug = this.tool()?.slug;
    if (!slug) return;
    window.open(`/tools/app/${slug}`, '_blank');
  }

  closeSandbox(): void {
    this.sandboxLaunched.set(false);
    this.dynamicComponent.set(null);
    this.loadError.set(null);
  }

  copyLink(): void { navigator.clipboard.writeText(window.location.href); }

  getCategorySlug(): string {
    const t = this.tool();
    if (!t) return '';
    const cat = this.toolsSvc.getCategoryById(t.categoryId);
    return cat ? cat.slug : '';
  }

  getTechnicalSpecs(): { key: string; value: string }[] {
    const tech = this.knowledge()?.technicalDetails;
    if (!tech) return [];
    return Object.entries(tech).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  getCompatibilitySpecs(): { key: string; value: string }[] {
    const comp = this.knowledge()?.compatibility;
    if (!comp) return [
      { key: 'Web Browser', value: 'Yes' },
      { key: 'Offline Execution', value: '100% Client-side' }
    ];
    return Object.entries(comp).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  getPricingDetails(): { key: string; value: string }[] {
    const price = this.knowledge()?.pricingDetails;
    if (!price) return [];
    return Object.entries(price).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  getPrivacyDetails(): { key: string; value: string }[] {
    const priv = this.knowledge()?.privacyDetails;
    if (!priv) return [
      { key: 'Processes Data Locally', value: 'Yes' },
      { key: 'Stores Files', value: 'No' },
      { key: 'Uploads Files', value: 'No' }
    ];
    return Object.entries(priv).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  formatCount(n?: number): string {
    const val = n || 0;
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'K';
    return val.toString();
  }
}
