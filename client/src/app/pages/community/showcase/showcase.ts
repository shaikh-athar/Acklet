// client/src/app/pages/community/showcase/showcase.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { MOCK_SHOWCASE, ShowcaseProject } from '../../../core/mock-data/community.data';

@Component({
  selector: 'app-community-showcase',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="showcase-root page-enter">
      <!-- Hero -->
      <section class="showcase-hero gradient-mesh">
        <div class="orb orb-brand" style="width:500px;height:500px;top:-10%;right:5%"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-accent mb-3">Community Gallery</span>
          <h1 class="hero-title">Developer Showcase</h1>
          <p class="hero-subtitle">See how developers automate workflows and customize tools built on Acklet.</p>
        </div>
      </section>

      <!-- Projects Grid -->
      <section class="section">
        <div class="container-main">
          <div class="header-row mb-8">
            <h2 class="section-title">Submitted Workflows</h2>
            <button class="btn btn-primary btn-sm">Share Your Workflow</button>
          </div>

          <div class="projects-grid">
            @for (p of projects(); track p.id) {
              <div class="project-card">
                <div class="img-box">
                  <img [src]="p.imageUrl" class="project-img" alt="{{ p.title }}" />
                </div>
                <div class="card-body">
                  <div class="author-meta mb-2">By {{ p.author }}</div>
                  <h3 class="project-title">{{ p.title }}</h3>
                  <p class="project-desc">{{ p.description }}</p>
                  
                  <div class="tags-row mt-4">
                    @for (t of p.toolsUsed; track t) {
                      <span class="tag-badge">{{ t }}</span>
                    }
                  </div>

                  <div class="card-footer mt-6">
                    <button class="like-btn" (click)="like(p)">
                      <app-icon name="heart" class="size-4" />
                      <span>{{ p.likesCount }} Likes</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .showcase-root { min-height: 100vh; background: var(--color-surface-950); }
    .showcase-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .header-row { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }

    .projects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
    .project-card { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); overflow: hidden; display: flex; flex-direction: column; }
    .img-box { width: 100%; height: 180px; overflow: hidden; position: relative; border-bottom: 1px solid var(--border-soft); }
    .project-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
    .project-card:hover .project-img { transform: scale(1.05); }

    .card-body { padding: 1.5rem; display: flex; flex-direction: column; flex: 1; }
    .author-meta { font-size: 0.72rem; color: var(--color-brand-500); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .project-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); }
    .project-desc { font-size: 0.85rem; color: var(--color-neutral-400); margin-top: 0.35rem; line-height: 1.6; }
    
    .tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .tag-badge { font-size: 0.75rem; background: var(--surface-hover); border: 1px solid var(--border-soft); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); color: var(--color-neutral-400); }
    
    .card-footer { display: flex; align-items: center; border-top: 1px solid var(--border-soft); padding-top: 1rem; margin-top: auto; }
    .like-btn { display: flex; align-items: center; gap: 0.375rem; background: none; border: none; font-size: 0.8rem; font-weight: 600; color: var(--color-neutral-500); cursor: pointer; transition: color 0.2s; }
    .like-btn:hover { color: var(--color-feedback-error); }

    @media (max-width: 768px) {
      .projects-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class CommunityShowcaseComponent {
  readonly projects = signal<ShowcaseProject[]>(MOCK_SHOWCASE);

  like(p: ShowcaseProject): void {
    this.projects.update(list => list.map(item => {
      if (item.id === p.id) {
        return { ...item, likesCount: item.likesCount + 1 };
      }
      return item;
    }));
  }
}
