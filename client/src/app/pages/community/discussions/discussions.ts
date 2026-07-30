import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { FallbackStateComponent } from '../../../shared/components/fallback-state/fallback-state';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { CommunityService, DiscussionRequest } from '../../../core/services/community.service';
import { ToastService } from '../../../core/services/toast.service';
import { MOCK_DISCUSSIONS } from '../../../core/mock-data/community.data';

@Component({
  selector: 'app-community-discussions',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent, FallbackStateComponent, LoadingSkeletonComponent],
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
              <button (click)="showModal.set(true)" class="btn btn-primary btn-sm flex items-center gap-2">
                <app-icon name="plus" size="16"></app-icon>
                Start Discussion
              </button>
            </div>

            @if (loading()) {
              <app-loading-skeleton type="card" [count]="3"></app-loading-skeleton>
            } @else if (filteredThreads().length === 0) {
              <app-fallback-state type="EMPTY" title="No Discussions Found" message="Be the first to start a conversation in this category."></app-fallback-state>
            } @else {
              <div class="threads-list">
                @for (thread of filteredThreads(); track thread.id || thread.slug) {
                  <div class="thread-card">
                    <div class="thread-votes">
                      <button class="vote-btn" (click)="upvote(thread)">
                        <app-icon name="arrow-up" class="size-4" />
                        <span class="vote-count">{{ thread.votesCount || thread.upvotes || 0 }}</span>
                      </button>
                    </div>
                    <div class="thread-body">
                      <a [routerLink]="['/community/discussions', thread.slug || thread.id]" class="thread-title">
                        {{ thread.title }}
                      </a>
                      <p class="thread-summary">{{ thread.summary || thread.content }}</p>
                      <div class="thread-meta mt-4">
                        <span class="meta-avatar">{{ (thread.authorName || thread.author || 'A')[0] }}</span>
                        <span class="meta-author">{{ thread.authorName || thread.author || 'Community Member' }}</span>
                        <span class="meta-dot">•</span>
                        <span class="meta-time">{{ thread.createdAt ? (thread.createdAt | date:'shortDate') : 'recently' }}</span>
                        <span class="meta-dot">•</span>
                        <span class="badge badge-neutral text-xxs">{{ (thread.category || 'General') | uppercase }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- New Discussion Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div class="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-6">
            <div class="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 class="text-lg font-bold text-white">Start New Discussion</h3>
              <button (click)="showModal.set(false)" class="text-slate-400 hover:text-white">
                <app-icon name="x" size="20"></app-icon>
              </button>
            </div>

            <form (submit)="createDiscussion($event)" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Title *</label>
                <input [(ngModel)]="newTitle" name="newTitle" type="text" placeholder="e.g. Best practices for offline WASM plugins" required class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Category *</label>
                <select [(ngModel)]="newCategory" name="newCategory" class="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-500">
                  <option value="general">General</option>
                  <option value="help">Help & Support</option>
                  <option value="ideas">Ideas & Feedback</option>
                  <option value="showcase">Showcase</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Content *</label>
                <textarea [(ngModel)]="newContent" name="newContent" rows="4" placeholder="Detail your thoughts or questions..." required class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" (click)="showModal.set(false)" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" [disabled]="submitting()" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2">
                  @if (submitting()) {
                    <app-icon name="loader" size="16" class="animate-spin"></app-icon>
                    Posting...
                  } @else {
                    Publish Discussion
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .community-root { min-height: 100vh; }
    .community-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .content-grid { display: grid; grid-template-columns: 240px 1fr; gap: 3rem; align-items: start; }
    
    .sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-neutral-400); }
    .category-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .cat-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; color: var(--color-neutral-400); background: none; border: none; text-align: left; cursor: pointer; transition: all 0.2s; }
    .cat-btn:hover { background: var(--surface-hover); color: var(--color-neutral-100); }
    .cat-btn.active { background: var(--surface-hover); color: var(--color-neutral-100); font-weight: 600; }

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
export class CommunityDiscussionsComponent implements OnInit {
  private readonly communitySvc = inject(CommunityService);
  private readonly toastSvc = inject(ToastService);

  readonly threads = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedCat = signal<string>('all');
  readonly showModal = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  newTitle = '';
  newCategory = 'general';
  newContent = '';

  readonly categories = [
    { id: 'all', label: 'All Discussions', icon: 'message-square' },
    { id: 'general', label: 'General', icon: 'users' },
    { id: 'help', label: 'Help & Support', icon: 'help-circle' },
    { id: 'ideas', label: 'Ideas & Feedback', icon: 'lightbulb' },
    { id: 'showcase', label: 'Showcase', icon: 'award' },
  ];

  ngOnInit(): void {
    this.loadDiscussions();
  }

  loadDiscussions(): void {
    this.loading.set(true);
    this.communitySvc.getDiscussions(0, 50).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          this.threads.set(page.content);
        } else {
          this.threads.set(MOCK_DISCUSSIONS);
        }
        this.loading.set(false);
      },
      error: () => {
        this.threads.set(MOCK_DISCUSSIONS);
        this.loading.set(false);
      }
    });
  }

  filteredThreads() {
    const cat = this.selectedCat();
    if (cat === 'all') return this.threads();
    return this.threads().filter(t => (t.category || '').toLowerCase() === cat.toLowerCase());
  }

  upvote(t: any) {
    this.threads.update(list => list.map(item => {
      if (item.id === t.id) {
        return { ...item, votesCount: (item.votesCount || item.upvotes || 0) + 1, upvotes: (item.upvotes || 0) + 1 };
      }
      return item;
    }));
  }

  createDiscussion(e: Event): void {
    e.preventDefault();
    if (!this.newTitle.trim() || !this.newContent.trim()) return;

    this.submitting.set(true);
    const req: DiscussionRequest = {
      title: this.newTitle,
      category: this.newCategory,
      content: this.newContent
    };

    this.communitySvc.createDiscussion(req).subscribe({
      next: created => {
        this.submitting.set(false);
        this.showModal.set(false);
        this.newTitle = '';
        this.newContent = '';
        this.toastSvc.success('Discussion thread created successfully');
        this.loadDiscussions();
      },
      error: () => {
        this.submitting.set(false);
        this.toastSvc.error('Failed to create discussion');
      }
    });
  }
}
