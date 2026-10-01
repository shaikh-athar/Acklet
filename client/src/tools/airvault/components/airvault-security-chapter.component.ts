import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-security-chapter',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <article class="av-chapter-card" id="sec-security">
      <div class="chapter-badge">
        <app-icon name="shield-check" class="icon-xs"></app-icon>
        <span>Section 01 · Cryptographic Engine</span>
      </div>

      <h2 class="chapter-title">Security & Privacy Architecture</h2>
      <p class="chapter-desc">
        Data in transit is encrypted using TLS and Web Crypto primitives. Shared clipboards are stored securely on the server until their expiration TTL.
      </p>

      <div class="chapter-grid-2x2">
        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="key" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Web Crypto API Keys</h4>
            <p class="feature-body">Cryptographic key material generated in browser memory for active device signaling.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="lock" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Encrypted Transport & Storage</h4>
            <p class="feature-body">All payloads are encrypted in transit. Standalone shared clipboards remain stored until their expiration TTL.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="shield-alert" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Automated Secret Masking</h4>
            <p class="feature-body">API keys, bearer tokens, passwords, and connection strings are detected on ingest and redacted with click-to-reveal.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="hard-drive" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Local IndexedDB Storage</h4>
            <p class="feature-body">Clipboard snapshots persist exclusively inside your local browser database, accompanied by user-defined TTL auto-purging.</p>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .av-chapter-card {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 16px;
      padding: 32px 36px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(0, 0, 0, 0.02);
      scroll-margin-top: 24px;
      transition: border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    :host-context([data-theme="dark"]) .av-chapter-card {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .av-chapter-card:hover {
      border-color: rgba(33, 150, 243, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(33, 150, 243, 0.08);
    }
    .chapter-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(33, 150, 243, 0.1);
      color: #2196F3;
      border: 1px solid rgba(33, 150, 243, 0.2);
      margin-bottom: 12px;
    }
    .chapter-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--av-text-primary);
      letter-spacing: -0.03em;
      margin: 0 0 8px;
      line-height: 1.25;
    }
    .chapter-desc {
      font-size: 13.5px;
      color: var(--av-text-muted);
      line-height: 1.5;
      margin: 0 0 24px;
      max-width: 700px;
    }
    .chapter-grid-2x2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .chapter-grid-2x2 {
        grid-template-columns: 1fr;
      }
    }
    .chapter-feature-tile {
      display: flex;
      gap: 12px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 12px;
      padding: 16px 18px;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .chapter-feature-tile:hover {
      transform: translateY(-2px);
      border-color: rgba(33, 150, 243, 0.35);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .feature-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2196F3;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .chapter-feature-tile:hover .feature-icon-box {
      transform: scale(1.08);
      background: rgba(33, 150, 243, 0.1);
    }
    .feature-content {
      flex: 1;
      min-width: 0;
    }
    .feature-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0 0 3px;
    }
    .feature-body {
      font-size: 12px;
      color: var(--av-text-muted);
      line-height: 1.45;
      margin: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultSecurityChapterComponent {}
