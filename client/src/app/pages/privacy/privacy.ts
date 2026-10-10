import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="legal-page page-enter">
      <div class="legal-hero gradient-mesh">
        <div class="container-main legal-hero-inner">
          <span class="badge badge-brand">
            <app-icon name="shield" class="size-3.5 mr-1.5" />
            Security & Privacy
          </span>
          <h1 class="legal-title">Privacy Policy</h1>
          <p class="legal-subtitle">Last updated: October 2026</p>
        </div>
      </div>

      <div class="container-main legal-body">
        <div class="legal-card glass-strong">
          <div class="highlight-callout">
            <app-icon name="check-circle" class="size-5 text-emerald-400 flex-shrink-0" />
            <div>
              <strong>Core Privacy Principle:</strong> All user input is processed strictly for the requested operation and is never stored, logged, or shared. Client-side tools execute 100% in your local browser sandbox.
            </div>
          </div>

          <section class="legal-section">
            <h2>1. Information We Do Not Collect</h2>
            <p>
              Acklet was engineered with an offline-first, zero-persistence philosophy. When you paste or input data into any tool on Acklet (such as tokens, code, JSON, documents, or keys), that data is processed solely within your browser runtime or in an ephemeral backend proxy request solely to execute the operation. We do not store your payloads, parameters, or file inputs on any database or persistent storage system.
            </p>
          </section>

          <section class="legal-section">
            <h2>2. User Input Processing</h2>
            <p>
              Your input data is held in memory only for the duration of the tool execution. Once execution completes or your browser tab is closed, that data is completely discarded. We do not use user inputs to train AI models or aggregate analytics.
            </p>
          </section>

          <section class="legal-section">
            <h2>3. Account & Authentication</h2>
            <p>
              If you optionally create an Acklet account, we only retain your authenticated profile information (such as email address and display name) necessary to manage your preferences and workspace.
            </p>
          </section>

          <section class="legal-section">
            <h2>4. Security & Third Parties</h2>
            <p>
              Acklet utilizes HTTPS, secure HTTP-only cookies, and encrypted proxies for any necessary backend requests. Third-party integrations (such as OAuth providers) adhere to industry standard cryptographic flows (PKCE).
            </p>
          </section>

          <section class="legal-section">
            <h2>5. Contact Us</h2>
            <p>
              If you have any questions or security concerns regarding our privacy practices, please contact us via our <a routerLink="/contact">Contact Page</a>.
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

    .highlight-callout {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1.25rem 1.5rem; border-radius: var(--radius-xl);
      background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--color-neutral-200); font-size: 0.95rem; line-height: 1.6;
    }

    .legal-section h2 { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); margin-bottom: 0.75rem; }
    .legal-section p { font-size: 0.925rem; line-height: 1.7; color: var(--color-neutral-300); margin: 0; }
    .legal-section a { color: #818cf8; text-decoration: underline; }
  `]
})
export class PrivacyComponent {}
