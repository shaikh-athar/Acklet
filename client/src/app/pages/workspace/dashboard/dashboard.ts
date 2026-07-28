import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { ToolsService } from '../../../core/services/tools.service';
import { PreferenceService } from '../../../core/services/preference.service';
import { ActivityService } from '../../../core/services/activity.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="dashboard-root page-enter space-y-8">
      <!-- Welcome Banner -->
      <header class="dashboard-header p-6 rounded-2xl bg-gradient-to-r from-cyan-900/40 via-slate-900 to-indigo-900/40 border border-slate-200 dark:border-white/10 shadow-lg text-white">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Good {{ timeOfDay() }}, {{ userName() }} 👋
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">Your tailored digital problem solving hub. Explore tools, manage collections, and publish your own solutions.</p>
          </div>
          <div class="flex items-center gap-2">
            <a routerLink="/workspace/publisher" class="btn text-xs px-4 py-2.5 rounded-xl font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md transition-all flex items-center gap-1.5">
              <app-icon name="plus" class="size-4" />
              Publish Tool
            </a>
            <a routerLink="/tools/explore" class="btn text-xs px-4 py-2.5 rounded-xl font-semibold bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all flex items-center gap-1.5">
              <app-icon name="search" class="size-4" />
              Explore Catalog
            </a>
          </div>
        </div>
      </header>

      <!-- Quick Shortcuts Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <a routerLink="/tools/explore" class="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 shadow-sm transition-all flex items-center gap-3">
          <div class="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <app-icon name="search" class="size-5" />
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Explore Solutions</div>
            <div class="text-xxs text-slate-500 dark:text-slate-400">Instant tool lookup</div>
          </div>
        </a>

        <a routerLink="/workspace/favorites" class="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-amber-500/40 shadow-sm transition-all flex items-center gap-3">
          <div class="size-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <app-icon name="star" class="size-5" />
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Favorites</div>
            <div class="text-xxs text-slate-500 dark:text-slate-400">{{ favoritesCount() }} tools saved</div>
          </div>
        </a>

        <a routerLink="/workspace/history" class="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 shadow-sm transition-all flex items-center gap-3">
          <div class="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <app-icon name="history" class="size-5" />
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Run History</div>
            <div class="text-xxs text-slate-500 dark:text-slate-400">Recent executions</div>
          </div>
        </a>

        <a routerLink="/workspace/publisher" class="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 shadow-sm transition-all flex items-center gap-3">
          <div class="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <app-icon name="box" class="size-5" />
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Publisher Workspace</div>
            <div class="text-xxs text-slate-500 dark:text-slate-400">Creator portal</div>
          </div>
        </a>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          
          <!-- Recommended Tools Section -->
          <section class="space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <app-icon name="sparkles" class="size-4 text-cyan-500" />
              Recommended Solutions For You
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (tool of recommendedTools(); track tool.id || tool.name) {
                <a [routerLink]="['/tools', tool.slug || tool.id]" class="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between">
                      <div class="size-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <app-icon [name]="tool.icon || 'code'" class="size-5" />
                      </div>
                      <span class="px-2 py-0.5 text-xxs font-bold uppercase tracking-wider rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        Top Pick
                      </span>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-3">{{ tool.name }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{{ tool.shortDescription || 'Developer tool solution' }}</p>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-xxs text-slate-500 dark:text-slate-400">
                    <span>{{ tool.categoryName || 'General' }}</span>
                    <span class="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                      Open Tool <app-icon name="arrow-right" class="size-3" />
                    </span>
                  </div>
                </a>
              }
            </div>
          </section>
        </div>

        <!-- Right Side Panel -->
        <div class="space-y-6">
          <!-- Pinned Interests -->
          <section class="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <app-icon name="tag" class="size-4 text-cyan-500" />
              Workspace Topics & Interests
            </h2>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2.5 py-1 rounded-full text-xxs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">JWT Security</span>
              <span class="px-2.5 py-1 rounded-full text-xxs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">Formatters</span>
              <span class="px-2.5 py-1 rounded-full text-xxs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">API Testing</span>
              <span class="px-2.5 py-1 rounded-full text-xxs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">PostgreSQL</span>
            </div>
          </section>

          <!-- Featured Collections -->
          <section class="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <app-icon name="folder" class="size-4 text-purple-500" />
              Tool Collections
            </h2>
            <div class="space-y-2">
              <a routerLink="/workspace/collections" class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 hover:border-purple-500/40 transition-all">
                <span class="font-semibold">API & Security Suite</span>
                <span class="text-xxs text-slate-500 dark:text-slate-400">4 items</span>
              </a>
              <a routerLink="/workspace/collections" class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 hover:border-purple-500/40 transition-all">
                <span class="font-semibold">Frontend Utilities</span>
                <span class="text-xxs text-slate-500 dark:text-slate-400">7 items</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-xxs { font-size: 0.65rem; }
  `]
})
export class WorkspaceDashboardComponent {
  private readonly toolsSvc = inject(ToolsService);
  private readonly favsSvc = inject(FavoritesService);
  private readonly authSvc = inject(AuthService);

  readonly favoritesCount = this.favsSvc.totalCount;
  readonly userName = computed(() => this.authSvc.currentUser()?.displayName || 'Acklet User');

  readonly recommendedTools = computed(() => {
    const all = this.toolsSvc.tools();
    if (all && all.length > 0) return all.slice(0, 4);
    const fallback: any[] = [
      { id: '1', name: 'JWT Inspector', slug: 'jwt-inspector', icon: 'shield-check', categoryName: 'Security & Crypto', shortDescription: 'Inspect RS256 / HS256 JWT tokens and claims payload' },
      { id: '2', name: 'JSON Formatter', slug: 'json-formatter', icon: 'code', categoryName: 'Formatters', shortDescription: 'Clean, format, and validate JSON data structures' },
      { id: '3', name: 'Base64 Decoder', slug: 'base64-tool', icon: 'binary', categoryName: 'Developer Tools', shortDescription: 'Decode base64 encoded payload buffers' },
      { id: '4', name: 'SQL Query Formatter', slug: 'sql-formatter', icon: 'database', categoryName: 'Formatters', shortDescription: 'Format SQL queries for PostgreSQL and MySQL databases' }
    ];
    return fallback;
  });

  readonly timeOfDay = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  });
}
