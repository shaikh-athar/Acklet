import { Component, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { ViewportDirective } from '../../viewport/viewport.directive';
import { gsap } from 'gsap';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent, ViewportDirective],
  template: `
    <footer class="footer-root" appViewport viewportId="footer" (enter)="playFooter()">
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
          <a routerLink="/tools/explore">Explore Tools</a>
          <a routerLink="/tools/categories">Categories</a>
          <a routerLink="/about">About</a>
          <a routerLink="/contact">Contact</a>
          <a routerLink="/privacy">Privacy Policy</a>
          <a routerLink="/terms">Terms</a>
          <a routerLink="/auth/login">Sign In</a>
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
    .footer-root { background: var(--color-surface-950); margin-top: 6rem; border-top: 1px solid var(--color-surface-700); position: relative; transition: background-color 0.3s ease, border-color 0.3s ease; }
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
      color: var(--color-neutral-50);
      display: inline-block;
      opacity: 0;
      transition: color 0.3s ease;
    }
    .logo-wrap:hover .logo-text-shining-small {
      color: var(--color-neutral-200);
    }
    .brand-desc { font-size: 0.85rem; color: var(--color-neutral-400); line-height: 1.6; max-width: 360px; }
    .social-links { display: flex; gap: 0.75rem; }
    .social-btn {
      width: 34px; height: 34px; border-radius: var(--radius-full);
      display: flex; align-items: center; justify-content: center;
      background: var(--color-surface-900); border: 1px solid var(--color-surface-700);
      color: var(--color-neutral-500); text-decoration: none; transition: all 0.25s ease;
    }
    .social-btn:hover { color: var(--color-neutral-100); border-color: var(--color-neutral-400); background: var(--color-surface-800); }

    .footer-nav-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 3rem;
      border-top: 1px solid var(--color-surface-700);
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
      color: var(--color-neutral-100);
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
      color: var(--color-surface-500);
      display: inline-block;
      opacity: 0;
      transition: color 0.3s ease;
    }
    
    .smoke-letter {
      display: inline-block;
      will-change: transform, filter;
      transform-style: preserve-3d;
      backface-visibility: hidden;
    }
    .huge-brand-text:hover {
      color: var(--color-neutral-100);
    }

    .footer-bottom { border-top: 1px solid var(--color-surface-700); padding: 1.5rem 0; width: 100%; }
    .footer-bottom-inner { display: flex; align-items: center; justify-content: center; text-align: center; }
    .copyright { font-size: 0.75rem; color: var(--color-neutral-500); }
  `],
})
export class FooterComponent {
  private readonly el = inject(ElementRef);

  private footerTimelinePlayed = false;

  playFooter(): void {
    if (this.footerTimelinePlayed) return;
    this.footerTimelinePlayed = true;

    const hugeBrand = this.el.nativeElement.querySelector('.huge-brand-text');
    if (hugeBrand) {
      splitElement(hugeBrand);
      const letters = hugeBrand.querySelectorAll('.smoke-letter');
      gsap.set(hugeBrand, { opacity: 1 });
      gsap.fromTo(letters,
        {
          opacity: 0,
          filter: 'blur(16px)',
          scale: 1.8,
          x: () => gsap.utils.random(-60, 60),
          y: () => gsap.utils.random(-50, 50),
          rotation: () => gsap.utils.random(-15, 15)
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          duration: 1.8,
          stagger: {
            each: 0.04,
            from: 'random'
          },
          ease: 'power3.out'
        }
      );
    }

    const smallBrand = this.el.nativeElement.querySelector('.logo-text-shining-small');
    if (smallBrand) {
      splitElement(smallBrand);
      const letters = smallBrand.querySelectorAll('.smoke-letter');
      gsap.set(smallBrand, { opacity: 1 });
      gsap.fromTo(letters,
        {
          opacity: 0,
          filter: 'blur(12px)',
          scale: 1.6,
          x: () => gsap.utils.random(-25, 25),
          y: () => gsap.utils.random(-20, 20),
          rotation: () => gsap.utils.random(-15, 15)
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          duration: 1.5,
          stagger: {
            each: 0.03,
            from: 'random'
          },
          ease: 'power3.out'
        }
      );
    }
  }
}

function splitElement(el: HTMLElement | ChildNode): void {
  const childNodes = Array.from(el.childNodes);

  for (const child of childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.nodeValue || '';
      if (!text.trim()) continue;

      const fragment = document.createDocumentFragment();
      const words = text.split(/(\s+)/);

      for (const word of words) {
        if (word.trim() === '') {
          fragment.appendChild(document.createTextNode(word));
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.style.display = 'inline-block';
          wordSpan.style.whiteSpace = 'nowrap';

          for (const char of word) {
            const charSpan = document.createElement('span');
            charSpan.className = 'smoke-letter';
            charSpan.style.display = 'inline-block';
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
          }
          fragment.appendChild(wordSpan);
        }
      }
      el.replaceChild(fragment, child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitElement(child as HTMLElement);
    }
  }
}
