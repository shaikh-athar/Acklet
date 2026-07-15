import { Component, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header';
import { IconComponent } from '../../shared/components/icon/icon';
import { ViewportDirective } from '../../shared/viewport/viewport.directive';
import { gsap } from 'gsap';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, SectionHeaderComponent, CommonModule, IconComponent, ViewportDirective],
  template: `
    <div class="about-page page-enter">

      <!-- Hero -->
      <section class="about-hero gradient-mesh" appViewport viewportId="aboutHero" (enter)="playHero()">
        <div class="orb orb-brand" style="width:500px;height:500px;top:-200px;left:-100px"></div>
        <div class="orb orb-accent" style="width:350px;height:350px;bottom:-100px;right:-50px"></div>
        <div class="container-main about-hero-inner">
          <span class="badge badge-brand mb-4">
            <app-icon name="info" class="size-3.5 mr-1.5" />
            About Acklet
          </span>
          <h1 class="about-hero-title">
            We believe digital work<br>
            <span class="gradient-text-brand">should be effortless.</span>
          </h1>
          <p class="about-hero-sub">
            Acklet is a digital solution platform. A single place to solve the problems that come up again and again in digital work — without switching between five different websites, creating accounts, or worrying about where your data goes.
          </p>
        </div>
      </section>

      <div class="container-main about-body">

        <!-- Mission & Vision -->
        <div class="mv-grid" appViewport viewportId="aboutMV" (enter)="playMV()">
          <div class="mv-card glass">
            <div class="mv-icon-wrap">
              <app-icon name="target" class="size-6 text-brand-500" />
            </div>
            <h2 class="mv-title">Mission</h2>
            <p class="mv-text">
              Help people complete digital work faster by providing reliable, thoughtfully designed solutions that reduce friction, eliminate repetitive effort, and build lasting trust.
            </p>
          </div>
          <div class="mv-card glass">
            <div class="mv-icon-wrap">
              <app-icon name="compass" class="size-6 text-accent-500" />
            </div>
            <h2 class="mv-title">Vision</h2>
            <p class="mv-text">
              To become the most trusted digital solution platform. Not the biggest — the most trusted. The one people reach for when they need to solve something, because it has never let them down.
            </p>
          </div>
        </div>

        <!-- The problem we solve -->
        <div class="problem-block" appViewport viewportId="aboutProblem" (enter)="playCommitments()">
          <app-section-header eyebrow="Why Acklet exists" title="People search for answers. Not tools." />
          <div class="problem-content">
            <div class="problem-text">
              <p class="problem-para">
                When you need to format JSON, decode a JWT, generate a QR code, or merge a PDF — you don't think "I need a tool." You think "I need to get this done."
              </p>
              <p class="problem-para">
                But getting it done means opening three browser tabs, picking a website with questionable privacy practices, and copying your sensitive data into a form with no idea where it ends up.
              </p>
              <p class="problem-para">
                Acklet exists to remove all of that. One place. Reliable solutions. Data stays on your device wherever possible. No accounts. No noise.
              </p>
            </div>
            <div class="problem-commitments">
              @for (c of commitments; track c.label) {
                <div class="commitment-item">
                  <div class="commitment-icon-box" [style.background]="c.iconBg">
                    <app-icon [name]="c.icon" class="size-4" [style.color]="c.color" />
                  </div>
                  <div>
                    <div class="commitment-label">{{ c.label }}</div>
                    <div class="commitment-desc">{{ c.desc }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Principles -->
        <div class="principles-block" appViewport viewportId="aboutPrinciples" (enter)="playPrinciples()">
          <app-section-header eyebrow="How we build" title="Principles we don't compromise on" [centered]="true" />
          <div class="principles-grid mt-12">
            @for (p of principles; track p.title) {
              <div class="principle-card">
                <div class="principle-icon" [style.color]="p.color">
                  <app-icon [name]="p.icon" class="size-5" />
                </div>
                <h3 class="principle-title">{{ p.title }}</h3>
                <p class="principle-desc">{{ p.desc }}</p>
              </div>
            }
          </div>
        </div>

        <!-- What's next -->
        <div class="roadmap-block glass" appViewport viewportId="aboutRoadmap" (enter)="playRoadmap()">
          <div class="roadmap-header">
            <app-icon name="map" class="size-5 text-brand-500" />
            <h2 class="roadmap-title">What we're building toward</h2>
          </div>
          <p class="roadmap-intro">
            Acklet is in its earliest stage. Right now, we're focused on building a small catalog of genuinely excellent solutions — not hundreds of average ones. Trust is earned before scale, not after it.
          </p>
          <div class="roadmap-phases">
            @for (phase of roadmap; track phase.label) {
              <div class="roadmap-phase" [class.active]="phase.active">
                <div class="phase-dot" [class.active-dot]="phase.active"></div>
                <div>
                  <div class="phase-label">{{ phase.label }}</div>
                  <div class="phase-desc">{{ phase.desc }}</div>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- CTA -->
      <section class="about-cta" appViewport viewportId="aboutCTA" (enter)="playCTA()">
        <div class="container-main about-cta-inner">
          <h2 class="about-cta-title">Ready to solve something?</h2>
          <p class="about-cta-sub">No account needed. No installation. Just open Acklet and start.</p>
          <div class="about-cta-btns">
            <a routerLink="/tools" class="btn btn-primary btn-lg">Browse solutions</a>
            <a routerLink="/categories" class="btn btn-secondary btn-lg">Explore categories</a>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .about-page { overflow: hidden; }

    /* Hero */
    .about-hero { position: relative; padding: 8.5rem 0 6rem; overflow: hidden; }
    .about-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; max-width: 720px; margin: 0 auto; }
    .about-hero-title { font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 700; color: var(--color-neutral-50); line-height: 1.1; letter-spacing: -0.03em; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.1s; opacity: 0; }
    .about-hero-sub { font-size: 1.1rem; color: var(--color-neutral-400); line-height: 1.75; max-width: 600px; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.2s; opacity: 0; }

    /* Body */
    .about-body { display: flex; flex-direction: column; gap: 5rem; padding: 5rem 0; }

    /* Mission & Vision */
    .mv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .mv-card { padding: 2.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border-soft); }
    .mv-icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); background: var(--surface-hover); border: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: center; }
    .mv-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }
    .mv-text { font-size: 0.9rem; color: var(--color-neutral-400); line-height: 1.75; }

    /* Problem block */
    .problem-block { display: flex; flex-direction: column; gap: 2.5rem; }
    .problem-content { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
    .problem-text { display: flex; flex-direction: column; gap: 1rem; }
    .problem-para { font-size: 0.95rem; color: var(--color-neutral-400); line-height: 1.8; }
    .problem-commitments { display: flex; flex-direction: column; gap: 1.25rem; }
    .commitment-item { display: flex; align-items: flex-start; gap: 0.875rem; }
    .commitment-icon-box { width: 38px; height: 38px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border-soft); }
    .commitment-label { font-size: 0.875rem; font-weight: 700; color: var(--color-neutral-100); }
    .commitment-desc { font-size: 0.78rem; color: var(--color-neutral-500); margin-top: 0.1rem; line-height: 1.4; }

    /* Principles */
    .principles-block { display: flex; flex-direction: column; gap: 0; }
    .principles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .principle-card { padding: 1.75rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid var(--border-soft); display: flex; flex-direction: column; gap: 0.75rem; }
    .principle-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
    .principle-title { font-size: 0.9rem; font-weight: 700; color: var(--color-neutral-100); }
    .principle-desc { font-size: 0.8rem; color: var(--color-neutral-400); line-height: 1.65; }

    /* Roadmap */
    .roadmap-block { padding: 2.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .roadmap-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .roadmap-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }
    .roadmap-intro { font-size: 0.9rem; color: var(--color-neutral-400); line-height: 1.75; margin-bottom: 1.75rem; max-width: 600px; }
    .roadmap-phases { display: flex; flex-direction: column; gap: 0; border-left: 2px solid var(--border-soft); padding-left: 1.5rem; margin-left: 0.5rem; }
    .roadmap-phase { position: relative; padding: 0.875rem 0; display: flex; gap: 0.875rem; align-items: flex-start; }
    .phase-dot { position: absolute; left: -1.6rem; top: 1.125rem; width: 12px; height: 12px; border-radius: 50%; background: var(--color-surface-700); border: 2px solid var(--border-soft); flex-shrink: 0; }
    .phase-dot.active-dot { background: var(--color-brand-500); border-color: var(--color-brand-400); box-shadow: 0 0 8px rgba(79, 70, 229, 0.3); }
    .roadmap-phase.active .phase-label { color: var(--color-brand-600); }
    .phase-label { font-size: 0.875rem; font-weight: 700; color: var(--color-neutral-300); margin-bottom: 0.2rem; }
    .phase-desc { font-size: 0.78rem; color: var(--color-neutral-500); line-height: 1.5; }

    /* CTA */
    .about-cta { padding: 7rem 0; background: var(--color-surface-900); border-top: 1px solid var(--border-soft); }
    .about-cta-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    .about-cta-title { font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.03em; }
    .about-cta-sub { font-size: 1rem; color: var(--color-neutral-400); max-width: 400px; line-height: 1.7; }
    .about-cta-btns { display: flex; gap: 0.875rem; flex-wrap: wrap; justify-content: center; }

    .mv-card,
    .commitment-item,
    .principle-card,
    .roadmap-phase,
    .about-cta-inner {
      opacity: 0;
    }

    @media (max-width: 900px) {
      .mv-grid { grid-template-columns: 1fr; }
      .problem-content { grid-template-columns: 1fr; }
      .principles-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .about-hero { padding: 6rem 0 4rem; }
      .principles-grid { grid-template-columns: 1fr; }
      .about-cta-btns { flex-direction: column; width: 100%; }
    }
  `],
})
export class AboutComponent {
  private readonly el = inject(ElementRef);

  private heroTimelinePlayed = false;
  private mvTimelinePlayed = false;
  private commitmentsTimelinePlayed = false;
  private principlesTimelinePlayed = false;
  private roadmapTimelinePlayed = false;
  private ctaTimelinePlayed = false;

  playHero(): void {
    if (this.heroTimelinePlayed) return;
    this.heroTimelinePlayed = true;

    const root = this.el.nativeElement;
    const title = root.querySelector('.about-hero h1');
    const subtitle = root.querySelector('.about-hero p');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (title) {
      tl.fromTo(title,
        { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)', y: 30 },
        { clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)', y: 0, duration: 0.8 }
      );
    }
    if (subtitle) {
      tl.fromTo(subtitle,
        { filter: 'blur(8px)', opacity: 0, y: 15 },
        { filter: 'blur(0px)', opacity: 1, y: 0, duration: 0.6 },
        '-=0.45'
      );
    }
  }

  playMV(): void {
    if (this.mvTimelinePlayed) return;
    this.mvTimelinePlayed = true;

    const root = this.el.nativeElement;
    const mvCards = root.querySelectorAll('.mv-card');
    if (mvCards.length > 0) {
      gsap.fromTo(mvCards,
        { rotateX: -20, scale: 0.95, opacity: 0, y: 40 },
        {
          rotateX: 0,
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out',
          transformOrigin: 'top center'
        }
      );
    }
  }

  playCommitments(): void {
    if (this.commitmentsTimelinePlayed) return;
    this.commitmentsTimelinePlayed = true;

    const root = this.el.nativeElement;
    const commitments = root.querySelectorAll('.commitment-item');
    if (commitments.length > 0) {
      gsap.fromTo(commitments,
        { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0, x: -20 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          opacity: 1,
          x: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out'
        }
      );
    }
  }

  playPrinciples(): void {
    if (this.principlesTimelinePlayed) return;
    this.principlesTimelinePlayed = true;

    const root = this.el.nativeElement;
    const principles = root.querySelectorAll('.principle-card');
    if (principles.length > 0) {
      gsap.fromTo(principles,
        { scale: 0.88, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'back.out(1.4)'
        }
      );
    }
  }

  playRoadmap(): void {
    if (this.roadmapTimelinePlayed) return;
    this.roadmapTimelinePlayed = true;

    const root = this.el.nativeElement;
    const phases = root.querySelectorAll('.roadmap-phase');
    if (phases.length > 0) {
      gsap.fromTo(phases,
        { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0, x: -15 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          opacity: 1,
          x: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out'
        }
      );
    }
  }

  playCTA(): void {
    if (this.ctaTimelinePlayed) return;
    this.ctaTimelinePlayed = true;

    const root = this.el.nativeElement;
    const ctaInner = root.querySelector('.about-cta-inner');
    const ctaBtns = root.querySelector('.about-cta-btns');

    if (ctaInner) {
      gsap.fromTo(ctaInner,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
      );
    }
    if (ctaBtns) {
      gsap.fromTo(ctaBtns,
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.5)' }
      );
    }
  }

  readonly commitments = [
    {
      icon: 'shield-check',
      label: 'Privacy by design',
      desc: 'Processing happens in your browser wherever feasible',
      color: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.08)',
    },
    {
      icon: 'user-x',
      label: 'No account wall',
      desc: 'Access every solution without registering',
      color: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.08)',
    },
    {
      icon: 'check-circle',
      label: 'Accuracy is non-negotiable',
      desc: 'Wrong results damage trust; we never ship unverified outputs',
      color: '#06b6d4',
      iconBg: 'rgba(6, 182, 212, 0.08)',
    },
    {
      icon: 'ban',
      label: 'No advertisements, ever',
      desc: 'Our revenue will come from the product, not from your attention',
      color: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.08)',
    },
  ];

  readonly principles = [
    { icon: 'target', title: 'Solve real problems', desc: 'Every solution exists because someone repeatedly encounters a genuine problem. We never build features simply because competitors have them.', color: '#6366f1' },
    { icon: 'clock', title: 'Save time', desc: 'Time is our most valuable product metric. If a solution does not meaningfully reduce effort, it should not exist.', color: '#10b981' },
    { icon: 'zap', title: 'Reduce friction', desc: 'Users should never wonder what to click next. The platform should guide them naturally toward completing their task.', color: '#f59e0b' },
    { icon: 'shield', title: 'Build trust', desc: 'Accuracy, consistency, and transparency are our highest priorities. Trust always outweighs feature count.', color: '#06b6d4' },
    { icon: 'layers', title: 'Scale through simplicity', desc: 'As Acklet grows, the experience should become simpler — not more complicated. Growth must never increase cognitive load.', color: '#8b5cf6' },
    { icon: 'accessibility', title: 'Build for everyone', desc: 'Accessibility is craftsmanship. Every interface must support keyboard navigation, screen readers, and responsive layouts.', color: '#ec4899' },
  ];

  readonly roadmap = [
    {
      label: 'Stage 1 — Now: High-quality standalone solutions',
      desc: 'Building a focused catalog of reliable, well-designed solutions across Developer, Documents, Productivity, and Business categories.',
      active: true,
    },
    {
      label: 'Stage 2 — Connected solutions',
      desc: 'Solutions that understand each other. Complete JSON, then decode JWT, then format output — without switching context.',
      active: false,
    },
    {
      label: 'Stage 3 — Personal workspace',
      desc: 'Save your history, create collections, and let Acklet remember your preferences.',
      active: false,
    },
    {
      label: 'Stage 4 — Platform ecosystem',
      desc: 'Community contributions, APIs, workflow automation, and integrations.',
      active: false,
    },
  ];
}
