import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { FallbackStateComponent } from '../../../shared/components/fallback-state/fallback-state';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { CommunityService, ReplyResponse } from '../../../core/services/community.service';
import { ToastService } from '../../../core/services/toast.service';
import { MOCK_DISCUSSIONS } from '../../../core/mock-data/community.data';

@Component({
  selector: 'app-discussion-details',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent, FallbackStateComponent, LoadingSkeletonComponent],
  template: `
    <div class="thread-root page-enter">
      <div class="container-main pb-16 pt-24">
        <!-- Back Link -->
        <a routerLink="/community/discussions" class="back-link mb-6">
          <app-icon name="arrow-left" class="size-3.5" />
          Back to Discussions
        </a>

        @if (loading()) {
          <app-loading-skeleton type="card" [count]="2"></app-loading-skeleton>
        } @else if (!thread()) {
          <app-fallback-state type="NOT_FOUND" title="Thread Not Found" message="The requested discussion thread does not exist or has been removed." primaryActionLink="/community/discussions" primaryActionText="Return to Discussions"></app-fallback-state>
        } @else {
          <!-- Topic Card -->
          <div class="topic-card p-6 mb-8">
            <div class="topic-header flex justify-between items-start mb-4">
              <div>
                <span class="badge badge-brand text-xxs mb-2">{{ (thread()!.category || 'General') | uppercase }}</span>
                <h1 class="topic-title">{{ thread()!.title }}</h1>
              </div>
              <div class="topic-votes">
                <button class="vote-btn" (click)="upvote()">
                  <app-icon name="arrow-up" class="size-4" />
                  <span class="vote-count">{{ thread()!.votesCount || thread()!.upvotes || 0 }}</span>
                </button>
              </div>
            </div>
            <p class="topic-desc">{{ thread()!.summary || thread()!.content }}</p>
            <div class="topic-meta mt-6">
              <span class="meta-avatar">{{ (thread()!.authorName || thread()!.author || 'A')[0] }}</span>
              <span class="meta-author">{{ thread()!.authorName || thread()!.author || 'Community Member' }}</span>
              <span class="meta-dot">•</span>
              <span class="meta-time">{{ thread()!.createdAt ? (thread()!.createdAt | date:'mediumDate') : 'Recently' }}</span>
            </div>
          </div>

          <!-- Replies List -->
          <div class="replies-block">
            <h2 class="replies-title mb-6">Replies ({{ replies().length }})</h2>
            
            <div class="replies-list">
              @for (rep of replies(); track rep.id || rep.createdAt || rep.time) {
                <div class="reply-card glass mb-4 p-4">
                  <div class="reply-header mb-2">
                    <span class="reply-avatar">{{ (rep.authorName || rep.author || 'R')[0] }}</span>
                    <span class="reply-author">{{ rep.authorName || rep.author || 'User' }}</span>
                    <span class="reply-time">{{ rep.createdAt ? (rep.createdAt | date:'shortTime') : rep.time }}</span>
                  </div>
                  <p class="reply-body">{{ rep.content || rep.body }}</p>
                </div>
              } @empty {
                <p class="text-sm text-slate-400 mb-6">No replies yet. Start the conversation below!</p>
              }
            </div>

            <!-- Write reply -->
            <form (submit)="postReply($event)" class="reply-form mt-8 space-y-4">
              <textarea [(ngModel)]="replyText" name="replyText" class="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-area" placeholder="Write your response..." required></textarea>
              <button type="submit" [disabled]="submittingReply()" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2">
                @if (submittingReply()) {
                  <app-icon name="loader" size="16" class="animate-spin"></app-icon>
                  Posting...
                } @else {
                  Post Reply
                }
              </button>
            </form>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .thread-root { min-height: 100vh; background: var(--color-surface-950); }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--color-brand-500); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .back-link:hover { color: var(--color-brand-600); }
    
    .topic-card { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .topic-title { font-size: 1.5rem; font-weight: 700; color: var(--color-neutral-100); }
    .topic-desc { font-size: 0.95rem; color: var(--color-neutral-300); line-height: 1.7; }
    
    .topic-votes { flex-shrink: 0; }
    .vote-btn { display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-soft); background: var(--surface-hover); cursor: pointer; transition: all 0.2s; }
    .vote-btn:hover { border-color: rgba(6,182,212,0.2); background: rgba(6,182,212,0.02); color: var(--color-brand-cyan); }
    .vote-count { font-size: 0.85rem; font-weight: 700; }

    .topic-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--color-neutral-500); }
    .meta-avatar { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #475569; }
    .meta-author { font-weight: 600; color: var(--color-neutral-300); }
    .meta-dot { opacity: 0.5; }

    .replies-block { max-width: 800px; }
    .replies-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); }
    
    .reply-card { border-radius: var(--radius-lg); border: 1px solid var(--border-soft); }
    .reply-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--color-neutral-500); }
    .reply-avatar { width: 20px; height: 20px; border-radius: 50%; background: #cbd5e1; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: #1e293b; }
    .reply-author { font-weight: 600; color: var(--color-neutral-300); }
    .reply-time { margin-left: auto; }
    .reply-body { font-size: 0.875rem; color: var(--color-neutral-300); line-height: 1.6; }

    .text-area { min-height: 120px; resize: vertical; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
  `],
})
export class CommunityDiscussionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly communitySvc = inject(CommunityService);
  private readonly toastSvc = inject(ToastService);

  readonly thread = signal<any | null>(null);
  readonly replies = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  readonly submittingReply = signal<boolean>(false);

  replyText = '';

  ngOnInit(): void {
    const idOrSlug = this.route.snapshot.paramMap.get('id');
    if (!idOrSlug) {
      this.loading.set(false);
      return;
    }

    this.communitySvc.getDiscussionBySlug(idOrSlug).subscribe({
      next: data => {
        this.thread.set(data);
        if (data.replies) {
          this.replies.set(data.replies);
        }
        if (data.id) {
          this.fetchReplies(data.id);
        }
        this.loading.set(false);
      },
      error: () => {
        const mockMatch = MOCK_DISCUSSIONS.find(d => d.id === idOrSlug || d.slug === idOrSlug);
        if (mockMatch) {
          this.thread.set(mockMatch);
          this.replies.set([
            { id: '1', authorName: 'Jordan K.', authorAvatarUrl: 'JK', createdAt: new Date().toISOString(), content: 'JWT Inspector works fully in-browser using pure JS libraries. You don\'t need JWKS validation if you copy the public key value directly.' },
            { id: '2', authorName: 'Elena R.', authorAvatarUrl: 'ER', createdAt: new Date().toISOString(), content: 'I tried it on a 2048-bit RSA token yesterday offline and signature verified instantly. Super convenient!' }
          ]);
        }
        this.loading.set(false);
      }
    });
  }

  fetchReplies(discussionId: string): void {
    this.communitySvc.getReplies(discussionId).subscribe({
      next: list => {
        if (list && list.length > 0) {
          this.replies.set(list);
        }
      },
      error: () => {}
    });
  }

  upvote(): void {
    const current = this.thread();
    if (current) {
      this.thread.set({ ...current, votesCount: (current.votesCount || current.upvotes || 0) + 1, upvotes: (current.upvotes || 0) + 1 });
    }
  }

  postReply(e: Event): void {
    e.preventDefault();
    if (!this.replyText.trim()) return;

    const currentThread = this.thread();
    if (!currentThread?.id) {
      this.replies.update(list => [...list, {
        authorName: 'User Account',
        createdAt: new Date().toISOString(),
        content: this.replyText
      }]);
      this.replyText = '';
      this.toastSvc.success('Reply posted');
      return;
    }

    this.submittingReply.set(true);
    this.communitySvc.createReply(currentThread.id, { content: this.replyText }).subscribe({
      next: created => {
        this.submittingReply.set(false);
        this.replies.update(list => [...list, created]);
        this.replyText = '';
        this.toastSvc.success('Reply posted successfully');
      },
      error: () => {
        this.submittingReply.set(false);
        this.toastSvc.error('Failed to post reply');
      }
    });
  }
}
