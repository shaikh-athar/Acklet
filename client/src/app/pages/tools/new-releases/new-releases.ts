// client/src/app/pages/tools/new-releases/new-releases.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToolsService } from '../../../core/services/tools.service';
import { ToolCardComponent } from '../../../shared/components/tool-card/tool-card';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

@Component({
  selector: 'app-tools-new-releases',
  standalone: true,
  imports: [CommonModule, RouterLink, ToolCardComponent, SectionHeaderComponent, IconComponent, SpotlightDirective],
  template: `
    <div class="new-releases-page page-enter">
      <!-- Page Header -->
      <div class="new-releases-hero gradient-mesh">
        <div class="orb orb-brand" style="width:400px;height:400px;bottom:-100px;left:-100px"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">Freshly Shipped</span>
          <h1 class="hero-title">New Releases</h1>
          <p class="hero-subtitle">The latest offline-first developer solutions added to our tool catalog.</p>
        </div>
      </div>

      <!-- Tools Grid -->
      <section class="section">
        <div class="container-main">
          <div class="tools-grid">
            @for (tool of toolsSvc.newTools(); track tool.id) {
              <app-tool-card [tool]="tool" />
            } @empty {
              <div class="empty-state glass">
                <app-icon name="plus-circle" class="size-8 text-neutral-500 mb-2" />
                <h3 class="empty-title">No new tools</h3>
                <p class="empty-desc">Check back soon for upcoming releases.</p>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .new-releases-page { min-height: 100vh; }
    .new-releases-hero { padding: 8rem 0 4rem; position: relative; overflow: hidden; }
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
export class ToolsNewReleasesComponent {
  readonly toolsSvc = inject(ToolsService);
}
