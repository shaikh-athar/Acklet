// client/src/app/pages/community/discussions/discussions.ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { MOCK_DISCUSSIONS, DiscussionThread } from '../../../core/mock-data/community.data';

@Component({
  selector: 'app-community-discussions',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="community-root page-enter">
      <!-- Hero -->
      <section class="community-hero gradient-mesh">
        <div class="orb orb-brand" style="width:400px;height:400px;top:-10%;left:5%"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">Acklet Forum</span>
          <h1 class="hero-title">Community Discussions</h1>
          <p class="hero-subtitle">Discuss offline workflows, share integrations, and help other developers.</p>
        </div>
      </section>

      <!-- Discussions Wall -->
      <section class="section">
        <div class="container-main content-grid">
          <!-- Filters & Sidebar -->
          <div class="sidebar">
            <h3 class="sidebar-title">Categories</h3>
            <div class="category-list">
              @for (cat of categories; track cat.id) {
                <button class="cat-btn" [class.active]="selectedCat() === cat.id" (click)="selectedCat.set(cat.id)">
                  <app-icon [name]="cat.icon" class="size-4" />
                  <span>{{ cat.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Threads List -->
          <div class="threads-pane">
            <div class="pane-header mb-6">
              <h2 class="pane-title">Active Threads</h2>
              <button class="btn btn-primary btn-sm">Start Discussion</button>
            </div>

            <div class="threads-list">
              @for (thread of filteredThreads(); track thread.id) {
                <div class="thread-card">
                  <div class="thread-votes">
                    <button class="vote-btn" (click)="upvote(thread)">
                      <app-icon name="arrow-up" class="size-4" />
                      <span class="vote-count">{{ thread.votesCount }}</span>
                    </button>
                  </div>
                  <div class="thread-body">
                    <a [routerLink]="['/community/discussions', thread.id]" class="thread-title">
                      {{ thread.title }}
                    </a>
                    <p class="thread-summary">{{ thread.summary }}</p>
                    <div class="thread-meta mt-4">
                      <span class="meta-avatar">{{ thread.authorAvatar }}</span>
                      <span class="meta-author">{{ thread.author }}</span>
                      <span class="meta-dot">•</span>
                      <span class="meta-time">{{ thread.createdAt }}</span>
                      <span class="meta-dot">•</span>
                      <span class="badge badge-neutral text-xxs">{{ thread.category | uppercase }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .community-root { min-height: 100vh; }
    .community-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .content-grid { display: grid; grid-template-columns: 240px 1fr; gap: 3rem; align-items: start; }
    
    /* Sidebar */
    .sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-neutral-400); }
    .category-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .cat-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; color: var(--color-neutral-400); background: none; border: none; text-align: left; cursor: pointer; transition: all 0.2s; }
    .cat-btn:hover { background: var(--surface-hover); color: var(--color-neutral-100); }
    .cat-btn.active { background: var(--surface-hover); color: var(--color-neutral-100); font-weight: 600; }

    /* Threads list */
    .threads-pane { display: flex; flex-direction: column; }
    .pane-header { display: flex; align-items: center; justify-content: space-between; }
    .pane-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }
    .threads-list { display: flex; flex-direction: column; gap: 1rem; }
    
    .thread-card { display: flex; gap: 1.25rem; padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .thread-votes { display: flex; flex-direction: column; align-items: center; }
    .vote-btn { display: flex; flex-direction: column; align-items: center; padding: 0.5rem; width: 42px; border-radius: var(--radius-md); border: 1px solid var(--border-soft); background: var(--surface-hover); cursor: pointer; transition: all 0.2s; }
    .vote-btn:hover { border-color: rgba(6,182,212,0.2); background: rgba(6,182,212,0.02); color: var(--color-brand-cyan); }
    .vote-count { font-size: 0.8rem; font-weight: 700; margin-top: 0.2rem; }
    
    .thread-body { flex: 1; display: flex; flex-direction: column; }
    .thread-title { font-size: 1rem; font-weight: 600; color: var(--color-neutral-100); text-decoration: none; line-height: 1.4; transition: color 0.2s; }
    .thread-title:hover { color: var(--color-brand-800); }
    .thread-summary { font-size: 0.85rem; color: var(--color-neutral-400); margin-top: 0.35rem; line-height: 1.5; }
    
    .thread-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--color-neutral-500); }
    .meta-avatar { width: 18px; height: 18px; border-radius: 50%; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #475569; }
    .meta-author { font-weight: 500; }
    .meta-dot { opacity: 0.5; }

    @media (max-width: 768px) {
      .content-grid { grid-template-columns: 1fr; gap: 2rem; }
    }
  `],
})
export class CommunityDiscussionsComponent {
  readonly threads = signal<DiscussionThread[]>(MOCK_DISCUSSIONS);
  readonly selectedCat = signal<string>('all');

  readonly categories = [
    { id: 'all', label: 'All Discussions', icon: 'message-square' },
    { id: 'general', label: 'General', icon: 'users' },
    { id: 'help', label: 'Help & Support', icon: 'help-circle' },
    { id: 'ideas', label: 'Ideas & Feedback', icon: 'lightbulb' },
    { id: 'showcase', label: 'Showcase', icon: 'award' },
  ];

  filteredThreads() {
    const cat = this.selectedCat();
    if (cat === 'all') return this.threads();
    return this.threads().filter(t => t.category === cat);
  }

  upvote(t: DiscussionThread) {
    this.threads.update(list => list.map(item => {
      if (item.id === t.id) {
        return { ...item, votesCount: item.votesCount + 1 };
      }
      return item;
    }));
  }
}
