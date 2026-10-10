import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getToolsByCategory } from '@acklet/tool-registry';
import { getToolUrl, getPortalUrl } from '@acklet/shared';

@Component({
  selector: 'lib-tool-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="tool-navbar-root">
      <div class="tool-navbar-inner">
        
        <!-- 1. Left: Tool Brand Name & Icon + Acklet back link -->
        <div class="tool-navbar-brand">
          <a [href]="portalUrl" class="btn-portal-back" title="Back to Acklet Portal" aria-label="Back to Acklet Portal">
            <span>←</span>
          </a>
          <div class="brand-icon-box">
            <span class="tool-brand-glyph">{{ tool().name.charAt(0) }}</span>
          </div>
          <span class="tool-brand-name">{{ tool().name }}</span>
        </div>

        <!-- 2. Center: 3-4 other tools from the SAME category (desktop only) -->
        <nav class="tool-category-peers" aria-label="Related tools">
          @for (peer of peerTools(); track peer.slug) {
            <a [href]="getToolUrl(peer)" class="peer-tool-link">
              {{ peer.name }}
            </a>
          }
        </nav>

        <!-- 3. Right: "Explore more" button for drawer -->
        <div class="tool-navbar-actions">
          <button 
            type="button" 
            class="btn-explore-drawer" 
            (click)="exploreClick.emit()"
            aria-label="Explore more tools"
          >
            <span class="explore-text">Explore more</span>
            <span class="explore-icon">☰</span>
          </button>
        </div>

      </div>
    </header>
  `,
  styles: [`
    .tool-navbar-root {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--tool-bg-surface, #111726);
      border-bottom: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: var(--tool-shadow-sm, 0 1px 3px rgba(0,0,0,0.2));
      height: 60px;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .tool-navbar-inner {
      max-width: 1560px;
      width: 100%;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    /* Left Brand */
    .tool-navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .brand-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--tool-radius-md, 8px);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.15));
      border: 1px solid var(--tool-border, rgba(16, 185, 129, 0.25));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tool-brand-glyph {
      font-size: 1rem;
      font-weight: 700;
      color: var(--tool-brand-accent, #10b981);
    }

    .tool-brand-name {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--tool-text-primary, #f8fafc);
    }

    /* Center Category Peers */
    .tool-category-peers {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tool-category-peers::-webkit-scrollbar {
      display: none;
    }

    .peer-tool-link {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--tool-text-secondary, #94a3b8);
      padding: 0.35rem 0.75rem;
      border-radius: var(--tool-radius-md, 8px);
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
      background: transparent;
    }

    .peer-tool-link:hover {
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.05));
    }

    /* Right Explore button */
    .tool-navbar-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .btn-explore-drawer {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.875rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--tool-radius-md, 8px);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-explore-drawer:hover {
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.1));
      border-color: var(--tool-border-focus, #10b981);
    }

    .explore-icon {
      font-size: 0.95rem;
      color: var(--tool-brand-accent, #10b981);
    }

    .btn-portal-back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--tool-radius-sm, 6px);
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.1));
      color: var(--tool-text-secondary, #94a3b8);
      font-size: 0.95rem;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-portal-back:hover {
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.1));
      border-color: var(--tool-border-focus, #10b981);
    }

    /* Responsive: Mobile collapses peer tools */
    @media (max-width: 768px) {
      .tool-category-peers {
        display: none !important;
      }
      .explore-text {
        display: none;
      }
      .btn-explore-drawer {
        padding: 0.4rem 0.6rem;
      }
    }
  `]
})
export class ToolNavbarComponent {
  readonly tool = input.required<ToolRegistryItem>();
  readonly exploreClick = output<void>();
  readonly portalUrl = getPortalUrl();

  readonly peerTools = computed(() => {
    const current = this.tool();
    const categoryPeers = getToolsByCategory(current.category, current.slug);
    return categoryPeers.slice(0, 4);
  });

  getToolUrl(item: ToolRegistryItem): string {
    return getToolUrl(item.subdomain || item.slug);
  }
}
