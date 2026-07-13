// client/src/app/shared/components/footer/footer.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="footer-root">
      <div class="container-main footer-inner">
        <!-- Centered Brand column -->
        <div class="footer-brand-centered">
          <a routerLink="/" class="logo-wrap">
            <span class="logo-text-shining-small">ACKLET</span>
          </a>
          <p class="brand-desc">A digital solution platform for getting things done. Reliable, private, and free.</p>
          
          <!-- Social links -->
          <div class="social-links">
            <a href="#" class="social-btn" aria-label="GitHub">
              <app-icon name="github" class="size-4" />
            </a>
            <a href="#" class="social-btn" aria-label="Twitter">
              <app-icon name="twitter" class="size-4" />
            </a>
            <a href="#" class="social-btn" aria-label="LinkedIn">
              <app-icon name="linkedin" class="size-4" />
            </a>
          </div>
        </div>

        <!-- Horizontal navigation links row -->
        <div class="footer-nav-row">
          <a routerLink="/">Home</a>
          <a routerLink="/tools">Solutions</a>
          <a routerLink="/categories">Categories</a>
          <a routerLink="/about">About</a>
          <a routerLink="/contact">Contact</a>
        </div>

        <!-- Giant full-width brand name with gradient shine on hover -->
        <div class="footer-huge-brand">
          <span class="huge-brand-text" routerLink="/">ACKLET</span>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="footer-bottom">
        <div class="container-main footer-bottom-inner">
          <p class="copyright">© 2026 Acklet — Solutions run locally in your browser.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer-root { background: #ffffff; margin-top: 6rem; border-top: 1px solid rgba(0, 0, 0, 0.04); position: relative; }
    .footer-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 4.5rem; padding-bottom: 2rem;
      gap: 3rem;
    }
    .footer-brand-centered { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; }
    .logo-wrap { display: flex; align-items: center; text-decoration: none; }
    .logo-text-shining-small {
      font-family: var(--font-decorative);
      font-size: 1.8rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      cursor: pointer;
      user-select: none;
      background: linear-gradient(
        120deg,
        var(--color-brand-800) 25%,
        var(--color-accent-500) 50%,
        var(--color-brand-800) 75%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transition: background-position 0.6s ease, transform 0.4s ease;
      display: inline-block;
    }
    .logo-wrap:hover .logo-text-shining-small {
      background-position: right center;
      transform: scale(1.03);
    }
    .brand-desc { font-size: 0.85rem; color: var(--color-neutral-400); line-height: 1.6; max-width: 360px; }
    .social-links { display: flex; gap: 0.75rem; }
    .social-btn {
      width: 34px; height: 34px; border-radius: var(--radius-full);
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04);
      color: var(--color-neutral-500); text-decoration: none; transition: all 0.25s ease;
    }
    .social-btn:hover { color: var(--color-brand-800); border-color: rgba(0,0,0,0.1); background: rgba(0,0,0,0.04); }

    .footer-nav-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 3rem;
      border-top: 1px solid rgba(0, 0, 0, 0.03);
      width: 100%;
      padding-top: 2rem;
    }
    .footer-nav-row a {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-neutral-400);
      text-decoration: none;
      transition: color 0.2s ease;
      letter-spacing: 0.02em;
    }
    .footer-nav-row a:hover {
      color: var(--color-brand-800);
    }

    .footer-huge-brand {
      width: 100%;
      text-align: center;
      overflow: hidden;
      margin-top: 1.5rem;
    }
    .huge-brand-text {
      font-family: var(--font-decorative);
      font-size: clamp(6rem, 19vw, 18rem);
      font-weight: 550;
      letter-spacing: 0.1em;
      line-height: 0.8;
      cursor: pointer;
      user-select: none;
      background: linear-gradient(
        120deg,
        var(--color-brand-800) 25%,
        var(--color-accent-500) 50%,
        var(--color-brand-800) 75%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transition: background-position 0.6s ease, transform 0.4s ease;
      display: inline-block;
    }
    .huge-brand-text:hover {
      background-position: right center;
      transform: scale(1.03);
    }

    .footer-bottom { border-top: 1px solid rgba(0,0,0,0.04); padding: 1.5rem 0; width: 100%; }
    .footer-bottom-inner { display: flex; align-items: center; justify-content: center; text-align: center; }
    .copyright { font-size: 0.75rem; color: var(--color-neutral-500); }
  `],
})
export class FooterComponent {}
