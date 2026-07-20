import { Component, inject, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { ToolsService } from '../../../core/services/tools.service';
import { PreferenceService } from '../../../core/services/preference.service';
import { ActivityService } from '../../../core/services/activity.service';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="dashboard-root page-enter">
      <!-- Title -->
      <header class="dashboard-header mb-10">
        <h1 class="greeting-title">Good {{ timeOfDay() }}, Athar 👋</h1>
        <p class="greeting-subtitle">Here is your tailored workspace. Let's get things done.</p>
      </header>

      <!-- Quick Actions -->
      <div class="quick-actions-row mb-12">
        <button class="quick-action-btn">
          <app-icon name="search" class="size-4 text-neutral-400" />
          Quick Search
        </button>
        <a routerLink="/workspace/favorites" class="quick-action-btn">
          <app-icon name="star" class="size-4 text-brand-500" />
          Favorites ({{ favoritesCount() }})
        </a>
        <a routerLink="/workspace/history" class="quick-action-btn">
          <app-icon name="history" class="size-4 text-accent-500" />
          Recent Activity
        </a>
      </div>

      <div class="dashboard-layout">
        <div class="main-col">
          
          <!-- Continue where you left off -->
          @if (recentTools().length > 0) {
            <section class="dash-section mb-10">
              <h2 class="section-title mb-4">Continue where you left off</h2>
              <div class="resume-grid">
                @for (tool of recentTools(); track tool.id) {
                  <a [routerLink]="['/tools', tool.slug]" class="resume-card glass-strong" appSpotlight>
                    <div class="resume-icon-box" [style.color]="tool.color">
                      <app-icon [name]="tool.icon" class="size-6" />
                    </div>
                    <div class="resume-info">
                      <div class="resume-name">{{ tool.name }}</div>
                      <div class="resume-cat">{{ tool.categoryName }}</div>
                    </div>
                    <app-icon name="arrow-right" class="resume-arrow size-4" />
                  </a>
                }
              </div>
            </section>
          }

          <!-- Recommended for you -->
          <section class="dash-section">
            <h2 class="section-title mb-4">Recommended for you</h2>
            <div class="rec-grid">
              @for (tool of recommendedTools(); track tool.id) {
                <a [routerLink]="['/tools', tool.slug]" class="rec-card glass-strong" appSpotlight>
                  <div class="rec-header">
                    <div class="rec-icon-box" [style.color]="tool.color">
                      <app-icon [name]="tool.icon" class="size-5" />
                    </div>
                    <span class="rec-badge">Matches your interests</span>
                  </div>
                  <h3 class="rec-name mt-4">{{ tool.name }}</h3>
                  <p class="rec-desc mt-1">{{ tool.shortDescription }}</p>
                </a>
              }
            </div>
          </section>

        </div>

        <div class="side-col">
          <!-- Pinned Categories / Interests -->
          <section class="dash-section mb-8">
            <h2 class="section-title mb-4">Your Interests</h2>
            <div class="interests-chips">
              @for (interest of interests(); track interest) {
                <span class="dash-chip">{{ interest }}</span>
              }
              @if (interests().length === 0) {
                <span class="empty-text">No interests set. Update in profile.</span>
              }
            </div>
          </section>

          <!-- Collections (Placeholder) -->
          <section class="dash-section">
            <h2 class="section-title mb-4">Collections</h2>
            <div class="collections-list">
              <div class="collection-item glass">
                <app-icon name="folder" class="size-4 text-purple-400" />
                <span class="collection-name">API Testing Toolkit</span>
                <span class="collection-count">4 items</span>
              </div>
              <div class="collection-item glass">
                <app-icon name="folder" class="size-4 text-brand-400" />
                <span class="collection-name">Frontend Utilities</span>
                <span class="collection-count">7 items</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-root { min-height: 100vh; }
    
    .greeting-title { font-size: 2.25rem; font-weight: 700; color: var(--color-neutral-50); letter-spacing: -0.02em; }
    .greeting-subtitle { font-size: 1.05rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .quick-actions-row { display: flex; gap: 0.75rem; }
    .quick-action-btn {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem;
      background: var(--color-surface-900); border: 1px solid var(--color-surface-700);
      border-radius: var(--radius-lg); font-size: 0.85rem; font-weight: 600;
      color: var(--color-neutral-200); text-decoration: none; cursor: pointer;
      transition: all 0.2s;
    }
    .quick-action-btn:hover { background: var(--color-surface-800); border-color: var(--color-surface-600); color: var(--color-neutral-50); }

    .dashboard-layout { display: grid; grid-template-columns: 1fr 320px; gap: 3rem; }
    .section-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }

    /* Resume Grid */
    .resume-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .resume-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.25rem;
      border-radius: var(--radius-xl); text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .resume-card:hover { transform: translateY(-2px); border-color: var(--color-neutral-500); }
    .resume-icon-box { width: 44px; height: 44px; border-radius: var(--radius-lg); background: var(--color-surface-800); display: flex; align-items: center; justify-content: center; }
    .resume-info { flex: 1; }
    .resume-name { font-size: 0.95rem; font-weight: 700; color: var(--color-neutral-50); margin-bottom: 0.15rem; }
    .resume-cat { font-size: 0.75rem; color: var(--color-neutral-400); }
    .resume-arrow { color: var(--color-neutral-600); opacity: 0; transform: translateX(-4px); transition: all 0.2s; }
    .resume-card:hover .resume-arrow { opacity: 1; transform: translateX(0); color: var(--color-neutral-300); }

    /* Recommended Grid */
    .rec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .rec-card {
      padding: 1.5rem; border-radius: var(--radius-xl); text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rec-card:hover { transform: translateY(-2px); border-color: var(--color-neutral-500); }
    .rec-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .rec-icon-box { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--color-surface-800); display: flex; align-items: center; justify-content: center; }
    .rec-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-brand-400); background: rgba(100, 116, 139, 0.1); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); }
    .rec-name { font-size: 1.05rem; font-weight: 700; color: var(--color-neutral-50); }
    .rec-desc { font-size: 0.85rem; color: var(--color-neutral-400); line-height: 1.5; }

    /* Side Column */
    .dash-chip { display: inline-block; padding: 0.35rem 0.75rem; border-radius: 99px; background: var(--color-surface-800); border: 1px solid var(--color-surface-700); font-size: 0.75rem; font-weight: 600; color: var(--color-neutral-300); margin: 0 0.4rem 0.4rem 0; }
    .empty-text { font-size: 0.8rem; color: var(--color-neutral-500); }

    .collections-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .collection-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; border-radius: var(--radius-lg); }
    .collection-name { font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-200); flex: 1; }
    .collection-count { font-size: 0.75rem; color: var(--color-neutral-500); }

    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 1024px) {
      .dashboard-layout { grid-template-columns: 1fr; }
      .resume-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .resume-grid, .rec-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceDashboardComponent {
  private readonly toolsSvc = inject(ToolsService);
  private readonly prefsSvc = inject(PreferenceService);
  private readonly favsSvc = inject(FavoritesService);
  private readonly activitySvc = inject(ActivityService);

  readonly favoritesCount = this.favsSvc.totalCount;
  
  readonly interests = computed(() => this.prefsSvc.prefs().onboarding?.interests ?? []);

  readonly recentTools = computed(() => {
    const recentIds = this.activitySvc.recentTools().map(a => a.entityId);
    return this.toolsSvc.getRelatedTools(recentIds).slice(0, 3);
  });

  readonly recommendedTools = computed(() => {
    const userInterests = this.interests();
    const allTools = this.toolsSvc.tools();
    if (!userInterests.length) return allTools.slice(0, 4);

    // Basic scoring based on interests
    return allTools
      .map(t => {
        let score = 0;
        if (t.tags.some(tag => userInterests.includes(tag))) score += 2;
        if (t.isTrending) score += 1;
        return { tool: t, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.tool)
      .slice(0, 4);
  });

  readonly timeOfDay = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  });
}
