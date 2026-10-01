// client/src/app/pages/community/features/features.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { MOCK_FEATURES, FeatureRequest } from '../../../core/mock-data/community.data';

@Component({
  selector: 'app-community-features',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="features-root page-enter">
      <!-- Hero -->
      <section class="features-hero gradient-mesh">
        <div class="orb orb-brand" style="width:400px;height:400px;bottom:-10%;left:5%"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">Acklet Feedback</span>
          <h1 class="hero-title">Feature Requests</h1>
          <p class="hero-subtitle">Help shape Acklet. Vote for upcoming tools or submit new requests.</p>
        </div>
      </section>

      <!-- Roadmap & Lists -->
      <section class="section">
        <div class="container-main content-layout">
          <!-- Request list -->
          <div class="list-pane">
            <div class="pane-header mb-6">
              <h2 class="pane-title">Feature Backlog</h2>
              <button class="btn btn-primary btn-sm">Request a Feature</button>
            </div>

            <div class="requests-stack">
              @for (req of requests(); track req.id) {
                <div class="request-card">
                  <div class="card-votes">
                    <button class="upvote-btn" (click)="upvote(req)">
                      <app-icon name="chevron-up" class="size-5" />
                      <span class="votes-num">{{ req.votesCount }}</span>
                    </button>
                  </div>
                  <div class="card-details">
                    <h3 class="req-title">{{ req.title }}</h3>
                    <p class="req-desc">{{ req.description }}</p>
                    <div class="req-meta mt-3">
                      <span class="badge" [ngClass]="statusBadge(req.status)">{{ req.status | uppercase }}</span>
                      <span class="meta-by">Requested by {{ req.requestedBy }}</span>
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
    .features-root { min-height: 100vh; background: var(--color-surface-950); }
    .features-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .content-layout { max-width: 800px; margin: 0 auto; }
    .pane-header { display: flex; align-items: center; justify-content: space-between; }
    .pane-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }
    
    .requests-stack { display: flex; flex-direction: column; gap: 1rem; }
    .request-card { display: flex; gap: 1.5rem; padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    
    .card-votes { flex-shrink: 0; }
    .upvote-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 48px; height: 56px; border-radius: var(--radius-md); border: 1px solid var(--border-soft); background: var(--surface-hover); cursor: pointer; transition: all 0.2s; }
    .upvote-btn:hover { border-color: rgba(6,182,212,0.25); background: rgba(6,182,212,0.02); color: var(--color-brand-cyan); }
    .votes-num { font-size: 0.85rem; font-weight: 700; margin-top: 0.15rem; }

    .card-details { flex: 1; display: flex; flex-direction: column; }
    .req-title { font-size: 1.05rem; font-weight: 700; color: var(--color-neutral-100); }
    .req-desc { font-size: 0.85rem; color: var(--color-neutral-400); margin-top: 0.25rem; line-height: 1.5; }
    
    .req-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.72rem; }
    .meta-by { color: var(--color-neutral-500); }
  `],
})
export class CommunityFeaturesComponent {
  readonly requests = signal<FeatureRequest[]>(MOCK_FEATURES);

  upvote(req: FeatureRequest): void {
    this.requests.update(list => list.map(item => {
      if (item.id === req.id) {
        return { ...item, votesCount: item.votesCount + 1 };
      }
      return item;
    }));
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'completed': return 'badge-brand';
      case 'in-progress': return 'badge-accent';
      case 'planning': return 'badge-warning';
      default: return 'badge-neutral';
    }
  }
}
