// client/src/app/pages/community/discussion-details/discussion-details.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { MOCK_DISCUSSIONS, DiscussionThread } from '../../../core/mock-data/community.data';

interface Reply {
  author: string;
  avatar: string;
  time: string;
  body: string;
}

@Component({
  selector: 'app-discussion-details',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="thread-root page-enter">
      <div class="container-main pb-16 pt-24">
        <!-- Back Link -->
        <a routerLink="/community/discussions" class="back-link mb-6">
          <app-icon name="arrow-left" class="size-3.5" />
          Back to Discussions
        </a>

        @if (thread()) {
          <!-- Topic Card -->
          <div class="topic-card p-6 mb-8">
            <div class="topic-header flex justify-between items-start mb-4">
              <div>
                <span class="badge badge-brand text-xxs mb-2">{{ thread()!.category | uppercase }}</span>
                <h1 class="topic-title">{{ thread()!.title }}</h1>
              </div>
              <div class="topic-votes">
                <button class="vote-btn" (click)="upvote()">
                  <app-icon name="arrow-up" class="size-4" />
                  <span class="vote-count">{{ thread()!.votesCount }}</span>
                </button>
              </div>
            </div>
            <p class="topic-desc">{{ thread()!.summary }}</p>
            <div class="topic-meta mt-6">
              <span class="meta-avatar">{{ thread()!.authorAvatar }}</span>
              <span class="meta-author">{{ thread()!.author }}</span>
              <span class="meta-dot">•</span>
              <span class="meta-time">{{ thread()!.createdAt }}</span>
            </div>
          </div>

          <!-- Replies List -->
          <div class="replies-block">
            <h2 class="replies-title mb-6">Replies ({{ replies().length }})</h2>
            
            <div class="replies-list">
              @for (rep of replies(); track rep.time) {
                <div class="reply-card glass mb-4 p-4">
                  <div class="reply-header mb-2">
                    <span class="reply-avatar">{{ rep.avatar }}</span>
                    <span class="reply-author">{{ rep.author }}</span>
                    <span class="reply-time">{{ rep.time }}</span>
                  </div>
                  <p class="reply-body">{{ rep.body }}</p>
                </div>
              }
            </div>

            <!-- Write reply -->
            <form (submit)="postReply($event)" class="reply-form mt-8">
              <textarea class="input text-area mb-4" placeholder="Write your response..." required></textarea>
              <button type="submit" class="btn btn-primary">Post Reply</button>
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

    /* Replies */
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
  readonly thread = signal<DiscussionThread | null>(null);

  readonly replies = signal<Reply[]>([
    { author: 'Jordan K.', avatar: 'JK', time: '1 hour ago', body: 'Yes, JWT Inspector works fully in-browser using pure JS libraries. You don\'t need JWKS validation if you copy the public key value directly into the secret verification field.' },
    { author: 'Elena R.', avatar: 'ER', time: '45 mins ago', body: 'I tried it on a 2048-bit RSA token yesterday offline and signature verified instantly. Super convenient!' }
  ]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const match = MOCK_DISCUSSIONS.find(d => d.id === id);
    if (match) {
      this.thread.set(match);
    }
  }

  upvote(): void {
    const current = this.thread();
    if (current) {
      this.thread.set({ ...current, votesCount: current.votesCount + 1 });
    }
  }

  postReply(e: Event): void {
    e.preventDefault();
    const txt = (e.target as HTMLFormElement).querySelector('textarea') as HTMLTextAreaElement;
    if (txt && txt.value) {
      this.replies.update(list => [...list, {
        author: 'User Account',
        avatar: 'U',
        time: 'Just now',
        body: txt.value
      }]);
      txt.value = '';
    }
  }
}
