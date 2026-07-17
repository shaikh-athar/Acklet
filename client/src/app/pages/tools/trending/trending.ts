// client/src/app/pages/tools/trending/trending.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToolsService } from '../../../core/services/tools.service';
import { ToolCardComponent } from '../../../shared/components/tool-card/tool-card';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

@Component({
  selector: 'app-tools-trending',
  standalone: true,
  imports: [CommonModule, RouterLink, ToolCardComponent, SectionHeaderComponent, IconComponent, SpotlightDirective],
  template: `
    <div class="trending-page page-enter">
      <!-- Page Header -->
      <div class="trending-hero gradient-mesh">
        <div class="orb orb-accent" style="width:400px;height:400px;top:-100px;right:-100px"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-accent mb-3">Trending Now</span>
          <h1 class="hero-title">Trending Solutions</h1>
          <p class="hero-subtitle">Most active developer utilities and parsers in the Acklet catalog today.</p>
        </div>
      </div>

      <!-- Tools Grid -->
      <section class="section">
        <div class="container-main">
          <div class="tools-grid">
            @for (tool of toolsSvc.trendingTools(); track tool.id) {
              <app-tool-card [tool]="tool" />
            } @empty {
              <div class="empty-state glass">
                <app-icon name="trending-up" class="size-8 text-neutral-500 mb-2" />
                <h3 class="empty-title">No trending tools</h3>
                <p class="empty-desc">Check back later for active user trends.</p>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .trending-page { min-height: 100vh; }
    .trending-hero { padding: 8rem 0 4rem; position: relative; overflow: hidden; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.02em; }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    
    .empty-state { text-align: center; padding: 3rem 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); max-width: 400px; margin: 0 auto; }
    .empty-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .empty-desc { font-size: 0.85rem; color: var(--color-neutral-500); }
    .mb-2 { margin-bottom: 0.5rem; }

    @media (max-width: 900px) {
      .tools-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .tools-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ToolsTrendingComponent {
  readonly toolsSvc = inject(ToolsService);
}
