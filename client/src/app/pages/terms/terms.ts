import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="legal-page page-enter">
      <div class="legal-hero gradient-mesh">
        <div class="container-main legal-hero-inner">
          <span class="badge badge-brand">
            <app-icon name="file-text" class="size-3.5 mr-1.5" />
            Terms & Agreement
          </span>
          <h1 class="legal-title">Terms of Service</h1>
          <p class="legal-subtitle">Last updated: October 2026</p>
        </div>
      </div>

      <div class="container-main legal-body">
        <div class="legal-card glass-strong">
          <section class="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Acklet and any tool available on the platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
            </p>
          </section>

          <section class="legal-section">
            <h2>2. Permitted Use & Security</h2>
            <p>
              Acklet provides developer and productivity solutions intended for lawful utility, formatting, testing, and inspection purposes. You agree not to use the platform for malicious activities, including attempts to disrupt infrastructure, bypass security filters, or submit unlawful materials.
            </p>
          </section>

          <section class="legal-section">
            <h2>3. Disclaimers & Warranties</h2>
            <p>
              The tools and platform are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. While we strive for 100% accuracy and high availability, Acklet is not liable for any data loss, transformation inaccuracies, or service disruptions.
            </p>
          </section>

          <section class="legal-section">
            <h2>4. Modifications</h2>
            <p>
              We reserve the right to modify or discontinue tools or features at any time without notice. Continued use of Acklet constitutes acceptance of updated terms.
            </p>
          </section>

          <section class="legal-section">
            <h2>5. Questions</h2>
            <p>
              For inquiries regarding these terms, visit our <a routerLink="/contact">Contact Page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page { min-height: 100vh; padding-bottom: 5rem; }
    .legal-hero { padding: 9rem 0 3rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .legal-hero-inner { display: flex; flex-direction: column; gap: 0.75rem; }
    .legal-title { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; color: var(--color-neutral-50); margin: 0; }
    .legal-subtitle { font-size: 0.95rem; color: var(--color-neutral-400); margin: 0; }

    .legal-body { padding-top: 3rem; max-width: 860px; margin: 0 auto; }
    .legal-card { padding: 2.5rem; border-radius: var(--radius-2xl); background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 2rem; }

    .legal-section h2 { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); margin-bottom: 0.75rem; }
    .legal-section p { font-size: 0.925rem; line-height: 1.7; color: var(--color-neutral-300); margin: 0; }
    .legal-section a { color: #818cf8; text-decoration: underline; }
  `]
})
export class TermsComponent {}
