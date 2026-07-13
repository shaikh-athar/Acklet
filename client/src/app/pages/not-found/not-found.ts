// client/src/app/pages/not-found/not-found.ts
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="nf-page">
      <div class="nf-bg">
        <div class="orb orb-brand nf-orb-1"></div>
        <div class="orb orb-accent nf-orb-2"></div>
        <div class="orb orb-purple nf-orb-3"></div>
      </div>

      <div class="nf-content">
        <!-- Glitch 404 -->
        <div class="nf-number-wrap">
          <div class="nf-number" [class.glitch]="isGlitching()">404</div>
          <div class="nf-number nf-glitch-1" aria-hidden="true">404</div>
          <div class="nf-number nf-glitch-2" aria-hidden="true">404</div>
        </div>

        <div class="nf-badge">
          <span class="badge badge-brand">Page Not Found</span>
        </div>

        <h1 class="nf-title">Looks like you wandered<br>off the map</h1>
        <p class="nf-desc">The page you're looking for doesn't exist, was moved, or you typed the URL wrong. Let's get you back on track.</p>

        <div class="nf-actions">
          <a routerLink="/" class="btn btn-primary btn-lg">
            <app-icon name="arrow-left" class="size-4 mr-1.5" />
            Go Home
          </a>
          <a routerLink="/tools" class="btn btn-secondary btn-lg">Browse Tools</a>
        </div>

        <!-- Suggestions -->
        <div class="nf-suggestions">
          <p class="nf-suggestion-label">You might be looking for:</p>
          <div class="nf-pills">
            <a routerLink="/tools" class="nf-pill">All Tools</a>
            <a routerLink="/categories" class="nf-pill">Categories</a>
            <a routerLink="/tools/jwt-inspector" class="nf-pill">JWT Inspector</a>
            <a routerLink="/tools/json-formatter" class="nf-pill">JSON Formatter</a>
            <a routerLink="/about" class="nf-pill">About</a>
          </div>
        </div>
      </div>

      <!-- Grid lines decoration -->
      <div class="nf-grid"></div>
    </div>
  `,
  styles: [`
    .nf-page {
      min-height: calc(100vh - 64px);
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden; background: var(--color-surface-950);
    }
    .nf-bg { position: absolute; inset: 0; pointer-events: none; }
    .nf-orb-1 { width: 500px; height: 500px; top: -150px; left: -100px; }
    .nf-orb-2 { width: 350px; height: 350px; bottom: -100px; right: -50px; }
    .nf-orb-3 { width: 250px; height: 250px; top: 40%; left: 60%; }

    .nf-content {
      position: relative; z-index: 2;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 1.5rem; padding: 2rem 1.5rem;
    }

    /* Glitch 404 */
    .nf-number-wrap { position: relative; margin-bottom: 0.5rem; }
    .nf-number {
      font-size: clamp(6rem, 18vw, 12rem);
      font-weight: 800; line-height: 1;
      background: linear-gradient(135deg, #818cf8, #22d3ee);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      letter-spacing: -0.05em; font-family: var(--font-mono);
      user-select: none;
    }
    .nf-glitch-1, .nf-glitch-2 {
      position: absolute; top: 0; left: 0; right: 0;
      clip-path: polygon(0 15%, 100% 15%, 100% 40%, 0 40%);
    }
    .nf-glitch-1 {
      background: linear-gradient(135deg, #ef4444, #f97316);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      opacity: 0;
    }
    .nf-glitch-2 {
      background: linear-gradient(135deg, #22d3ee, #818cf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
      opacity: 0;
    }
    .nf-number-wrap.glitch .nf-glitch-1 {
      animation: glitch-1 0.3s steps(2, end);
    }
    .nf-number-wrap.glitch .nf-glitch-2 {
      animation: glitch-2 0.3s steps(2, end) 0.05s;
    }
    @keyframes glitch-1 {
      0% { opacity: 0; transform: translate(0, 0); }
      20% { opacity: 0.8; transform: translate(-4px, 2px); }
      40% { opacity: 0.6; transform: translate(4px, -2px); }
      60% { opacity: 0.8; transform: translate(-2px, 3px); }
      80% { opacity: 0.4; transform: translate(3px, -1px); }
      100% { opacity: 0; transform: translate(0, 0); }
    }
    @keyframes glitch-2 {
      0% { opacity: 0; transform: translate(0, 0); }
      20% { opacity: 0.6; transform: translate(4px, -3px); }
      60% { opacity: 0.8; transform: translate(-3px, 2px); }
      100% { opacity: 0; transform: translate(0, 0); }
    }

    .nf-title { font-size: clamp(1.25rem, 3vw, 2rem); font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.02em; }
    .nf-desc { font-size: 0.9rem; color: var(--color-neutral-400); max-width: 440px; line-height: 1.7; }
    .nf-actions { display: flex; gap: 0.875rem; }
    .nf-suggestions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
    .nf-suggestion-label { font-size: 0.78rem; color: var(--color-neutral-500); }
    .nf-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    .nf-pill { padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.78rem; color: var(--color-neutral-400); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); text-decoration: none; transition: all 0.2s; }
    .nf-pill:hover { color: #818cf8; border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.06); }

    /* Grid decoration */
    .nf-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
    }

    @media (max-width: 480px) { .nf-actions { flex-direction: column; } }
  `],
})
export class NotFoundComponent implements OnInit, OnDestroy {
  readonly isGlitching = signal(false);
  private glitchInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.glitchInterval = setInterval(() => {
      this.isGlitching.set(true);
      setTimeout(() => this.isGlitching.set(false), 400);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.glitchInterval) clearInterval(this.glitchInterval);
  }
}
