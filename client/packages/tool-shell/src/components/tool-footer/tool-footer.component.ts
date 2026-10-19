import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getPortalUrl } from '@acklet/shared';

@Component({
  selector: 'lib-tool-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="tool-footer-root">
      <div class="tool-footer-inner">
        <div class="footer-left">
          <span class="tool-copy">&copy; {{ currentYear }} {{ toolName() }}.</span>
          <span class="tool-powered">
            by <a [href]="portalUrl" target="_blank" rel="noopener noreferrer" class="acklet-brand-link">Acklet</a>
          </span>
        </div>
        <div class="footer-right">
          <a [href]="portalUrl + '/privacy'" target="_blank" rel="noopener noreferrer" class="footer-link">Privacy</a>
          <a [href]="portalUrl + '/terms'" target="_blank" rel="noopener noreferrer" class="footer-link">Terms</a>
          <a [href]="portalUrl + '/contact'" target="_blank" rel="noopener noreferrer" class="footer-link">Feedback</a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .tool-footer-root {
      width: 100%;
      border-top: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      background: var(--tool-bg-surface, #111726);
      padding: 1.5rem 0;
      margin-top: auto;
    }
    .tool-footer-inner {
      max-width: 1560px;
      width: 100%;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.8125rem;
      color: var(--tool-text-muted, #64748b);
    }
    .footer-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .acklet-brand-link {
      color: var(--tool-brand-accent, #10b981);
      text-decoration: none;
      font-weight: 600;
    }
    .acklet-brand-link:hover {
      text-decoration: underline;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .footer-link {
      color: var(--tool-text-secondary, #94a3b8);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .footer-link:hover {
      color: var(--tool-text-primary, #f8fafc);
    }
  `]
})
export class ToolFooterComponent {
  readonly toolName = input.required<string>();
  readonly currentYear = new Date().getFullYear();

  get portalUrl(): string {
    return getPortalUrl();
  }
}
