// client/src/app/pages/contact/contact.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="contact-root page-enter">

      <!-- ══ HERO ══════════════════════════════════════════════ -->
      <section class="contact-hero gradient-mesh">
        <div class="orb orb-brand" style="width:600px;height:600px;top:-200px;left:-100px;"></div>
        <div class="orb orb-accent" style="width:400px;height:400px;bottom:-100px;right:-50px;"></div>
        <div class="container-main contact-hero-inner">
          <span class="badge badge-brand">
            <app-icon name="message-circle" class="size-3.5 text-brand-300 mr-1.5" />
            Get in Touch
          </span>
          <h1 class="contact-hero-title">We'd love to <span class="gradient-text-brand">hear from you</span></h1>
          <p class="contact-hero-sub">
            Have a solution request, bug report, or just want to share feedback? We read everything and genuinely appreciate hearing from users.
          </p>
        </div>
      </section>

      <!-- ══ MAIN CONTENT ═══════════════════════════════════════ -->
      <div class="container-main contact-layout">

        <!-- Contact form -->
        <div class="contact-form-col">
          @if (!submitted()) {
            <div class="contact-card glass-strong">
              <h2 class="contact-card-title">Send a message</h2>
              <form class="contact-form" (submit)="onSubmit($event)">

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="cf-name">Full name</label>
                    <input id="cf-name" type="text" class="form-input" placeholder="Your name" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cf-email">Email address</label>
                    <input id="cf-email" type="email" class="form-input" placeholder="you@example.com" required />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="cf-subject">Subject</label>
                  <select id="cf-subject" class="form-input form-select">
                    <option value="">Select a topic…</option>
                    <option value="solution-request">Solution Request</option>
                    <option value="bug-report">Bug Report</option>
                    <option value="feedback">General Feedback</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="cf-message">Message</label>
                  <textarea id="cf-message" class="form-input form-textarea" rows="5" placeholder="Tell us what's on your mind…" required></textarea>
                </div>

                <button type="submit" class="btn btn-primary contact-submit-btn" [class.loading]="submitting()">
                  @if (submitting()) {
                    <span class="submit-spinner"></span>
                    Sending…
                  } @else {
                    <app-icon name="send" class="size-4 mr-2" />
                    Send Message
                  }
                </button>
              </form>
            </div>
          } @else {
            <!-- Success state -->
            <div class="contact-success glass-strong">
              <div class="success-icon-ring">
                <app-icon name="check" class="size-8 text-success-400" />
              </div>
              <h2 class="success-title">Message sent!</h2>
              <p class="success-sub">Thanks for reaching out. We'll get back to you within one business day.</p>
              <button class="btn btn-secondary" (click)="resetForm()">Send another message</button>
            </div>
          }
        </div>

        <!-- Sidebar info -->
        <aside class="contact-info-col">

          <!-- Contact channels -->
          <div class="contact-channels glass">
            <div class="cc-title">Other ways to reach us</div>
            @for (ch of channels; track ch.label) {
              <a [href]="ch.href" class="channel-row" target="_blank" rel="noopener">
                <div class="channel-icon-box" [style.background]="ch.bg">
                  <app-icon [name]="ch.icon" class="size-4 text-white" />
                </div>
                <div>
                  <div class="channel-label">{{ ch.label }}</div>
                  <div class="channel-value">{{ ch.value }}</div>
                </div>
                <app-icon name="external-link" class="size-3.5 text-neutral-600 ml-auto" />
              </a>
            }
          </div>

          <!-- FAQs -->
          <div class="contact-faq glass">
            <div class="cc-title">Frequently asked</div>
            @for (faq of faqs; track faq.q) {
              <div class="faq-item" [class.open]="openFaq() === faq.q" (click)="toggleFaq(faq.q)">
                <div class="faq-q">
                  {{ faq.q }}
                  <app-icon [name]="openFaq() === faq.q ? 'chevron-up' : 'chevron-down'" class="size-4 ml-auto flex-shrink-0" />
                </div>
                @if (openFaq() === faq.q) {
                  <div class="faq-a">{{ faq.a }}</div>
                }
              </div>
            }
          </div>

          <!-- Response time badge -->
          <div class="response-badge glass">
            <app-icon name="zap" class="size-5 text-brand-400" />
            <div>
              <div class="rb-title">Average response time</div>
              <div class="rb-val">Under 24 hours</div>
            </div>
          </div>

        </aside>
      </div>

    </div>
  `,
  styles: [`
    .contact-root { overflow: hidden; }

    /* Hero */
    .contact-hero { position: relative; padding: 8.5rem 0 5rem; overflow: hidden; }
    .contact-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; max-width: 680px; margin: 0 auto; }
    .contact-hero-title { font-size: clamp(2.5rem, 6vw, 4rem); font-family: var(--font-hero); font-weight: 500; color: var(--color-brand-900); line-height: 1.1; letter-spacing: -0.02em; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.2s; opacity: 0; }
    .contact-hero-sub { font-size: 1.05rem; color: var(--color-brand-600); line-height: 1.75; max-width: 540px; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.3s; opacity: 0; }

    /* Layout */
    .contact-layout { display: grid; grid-template-columns: 1fr 380px; gap: 2rem; padding: 3rem 0 6rem; align-items: start; }

    /* Form card */
    .contact-card { border-radius: var(--radius-xl); padding: 2.25rem; border: 1px solid rgba(255,255,255,0.08); }
    .contact-card-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); margin-bottom: 1.75rem; letter-spacing: -0.02em; }

    .contact-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-neutral-400); }
    .form-input {
      background: var(--color-surface-800); border: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--radius-lg); padding: 0.75rem 1rem;
      font-size: 0.875rem; color: var(--color-neutral-100); font-family: inherit;
      outline: none; transition: all 0.2s; width: 100%;
    }
    .form-input::placeholder { color: var(--color-neutral-600); }
    .form-input:focus { border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); background: var(--color-surface-700); }
    .form-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.5rem; }
    .form-select option { background: #1a1a2e; color: #e2e8f0; }
    .form-textarea { resize: vertical; min-height: 140px; }

    .contact-submit-btn { width: 100%; justify-content: center; position: relative; }
    .contact-submit-btn.loading { opacity: 0.7; pointer-events: none; }
    .submit-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 0.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Success state */
    .contact-success { border-radius: var(--radius-xl); padding: 3rem 2.25rem; border: 1px solid rgba(16,185,129,0.2); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; }
    .success-icon-ring { width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); display: flex; align-items: center; justify-content: center; }
    .success-title { font-size: 1.625rem; font-weight: 800; color: var(--color-neutral-100); letter-spacing: -0.03em; }
    .success-sub { font-size: 0.9rem; color: var(--color-neutral-400); line-height: 1.7; max-width: 380px; }

    /* Info sidebar */
    .contact-info-col { display: flex; flex-direction: column; gap: 1.25rem; }

    .contact-channels { border-radius: var(--radius-xl); padding: 1.5rem; border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 0; }
    .cc-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-neutral-500); margin-bottom: 1rem; }
    .channel-row { display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); text-decoration: none; transition: all 0.2s; border-radius: var(--radius-md); }
    .channel-row:last-child { border-bottom: none; padding-bottom: 0; }
    .channel-row:hover { opacity: 0.8; }
    .channel-icon-box { width: 34px; height: 34px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .channel-label { font-size: 0.8rem; font-weight: 600; color: var(--color-neutral-200); }
    .channel-value { font-size: 0.72rem; color: var(--color-neutral-500); margin-top: 0.1rem; }

    /* FAQ */
    .contact-faq { border-radius: var(--radius-xl); padding: 1.5rem; border: 1px solid rgba(255,255,255,0.06); }
    .faq-item { border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
    .faq-item:last-child { border-bottom: none; }
    .faq-q { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-200); padding: 0.875rem 0; transition: color 0.2s; }
    .faq-item.open .faq-q { color: var(--color-brand-400); }
    .faq-a { font-size: 0.8rem; color: var(--color-neutral-500); line-height: 1.65; padding-bottom: 0.875rem; animation: var(--animate-fade-up); }

    /* Response badge */
    .response-badge { border-radius: var(--radius-xl); padding: 1.25rem 1.5rem; border: 1px solid rgba(99,102,241,0.2); display: flex; align-items: center; gap: 1rem; background: rgba(99,102,241,0.05); }
    .rb-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-neutral-500); }
    .rb-val { font-size: 0.9rem; font-weight: 700; color: var(--color-brand-400); margin-top: 0.125rem; }

    @media (max-width: 1024px) {
      .contact-layout { grid-template-columns: 1fr; }
      .contact-info-col { grid-row: 1; }
    }
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .contact-hero { padding: 6rem 0 3rem; }
    }
  `],
})
export class ContactComponent {
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly openFaq = signal<string | null>(null);

  readonly channels = [
    { label: 'Email', value: 'hello@acklet.io', icon: 'mail', href: 'mailto:hello@acklet.io', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { label: 'GitHub', value: 'github.com/acklet', icon: 'github', href: 'https://github.com', bg: 'linear-gradient(135deg,#374151,#1f2937)' },
    { label: 'Twitter / X', value: '@acklet_io', icon: 'twitter', href: 'https://twitter.com', bg: 'linear-gradient(135deg,#0284c7,#0369a1)' },
    { label: 'Discord Community', value: 'discord.gg/acklet', icon: 'message-square', href: '#', bg: 'linear-gradient(135deg,#5865f2,#7c3aed)' },
  ];

  readonly faqs = [
    { q: 'Is Acklet free to use?', a: 'Yes. Core solutions on Acklet are free to use. We may introduce optional features for power users in the future, but the foundations will always remain free.' },
    { q: 'Do you store my data?', a: 'We process as much as possible directly in your browser. Your input data is never sent to a server unless a solution explicitly requires it, and we will always tell you when that is the case.' },
    { q: 'Can I request a new solution?', a: 'Yes. Use the contact form and select "Solution Request". We review all requests and prioritize the ones most frequently needed by users.' },
    { q: 'How do I report a bug?', a: 'Use the contact form with "Bug Report" selected, or open an issue on our GitHub repository. Please include the solution name and steps to reproduce the issue.' },
  ];

  onSubmit(event: Event): void {
    event.preventDefault();
    this.submitting.set(true);
    setTimeout(() => {
      this.submitting.set(false);
      this.submitted.set(true);
    }, 1800);
  }

  resetForm(): void {
    this.submitted.set(false);
  }

  toggleFaq(q: string): void {
    this.openFaq.set(this.openFaq() === q ? null : q);
  }
}
