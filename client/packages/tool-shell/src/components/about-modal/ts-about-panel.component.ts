// packages/tool-shell/src/components/about-modal/ts-about-panel.component.ts
import { Component, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getPortalUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsFaqComponent } from '../primitive/ts-faq.component';
import { TsScrollAreaComponent } from '../primitive/ts-scroll-area.component';

@Component({
  selector: 'ts-about-panel',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsFaqComponent, TsScrollAreaComponent],
  template: `
    @if (isOpen() && tool()) {
      <div class="ts-about-modal-backdrop" (click)="close.emit()">
        <div 
          class="ts-about-panel-container" 
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'About ' + tool()?.name"
        >
          <!-- Panel Header -->
          <div class="ts-about-panel-header">
            <div class="ts-about-panel-title-cluster">
              <span class="ts-about-panel-title">About {{ tool()?.name }}</span>
            </div>
            <button 
              type="button" 
              class="ts-about-close-btn"
              (click)="close.emit()"
              aria-label="Close about dialog"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Panel Scrollable Body -->
          <div class="ts-about-panel-body">
            <ts-scroll-area>
              <div class="ts-about-panel-inner">
                
                <!-- Overview -->
                <section class="ts-about-section">
                  <h3 class="ts-section-heading">Overview</h3>
                  <p class="ts-about-summary">{{ tool()?.description || tool()?.shortDescription }}</p>
                </section>

                <!-- Key Features Checklist -->
                @if (tool()?.features && tool()?.features!.length > 0) {
                  <section class="ts-about-section">
                    <h3 class="ts-section-heading">Key Features</h3>
                    <ul class="ts-features-grid">
                      @for (feat of tool()?.features; track feat) {
                        <li class="ts-feature-item">
                          <ts-icon name="check" [size]="14" class="ts-feature-check" />
                          <span>{{ feat }}</span>
                        </li>
                      }
                    </ul>
                  </section>
                }

                <!-- How It Works (Numbered list) -->
                @if (tool()?.howItWorks && tool()?.howItWorks!.length > 0) {
                  <section class="ts-about-section">
                    <h3 class="ts-section-heading">How It Works</h3>
                    <ol class="ts-steps-list">
                      @for (step of tool()?.howItWorks; track step; let idx = $index) {
                        <li class="ts-step-item">
                          <span class="ts-step-pill">{{ idx + 1 }}</span>
                          <span class="ts-step-text">{{ step }}</span>
                        </li>
                      }
                    </ol>
                  </section>
                }

                <!-- Frequently Asked Questions Accordion -->
                @if (tool()?.faqs && tool()?.faqs!.length > 0) {
                  <section class="ts-about-section">
                    <ts-faq [faqs]="tool()!.faqs!" [multiple]="false" />
                  </section>
                }

                <!-- Footer (Reference Style) -->
                <footer class="ts-panel-footer">
                  <div class="ts-footer-copyright">
                    © {{ currentYear }} Acklet. All rights reserved.
                  </div>
                  <div class="ts-footer-links">
                    <a [href]="portalUrl" class="ts-footer-link" target="_blank" rel="noopener noreferrer">Acklet</a>
                    <a [href]="portalUrl + '/privacy'" class="ts-footer-link" target="_blank" rel="noopener noreferrer">Privacy</a>
                    <a [href]="portalUrl + '/terms'" class="ts-footer-link" target="_blank" rel="noopener noreferrer">Terms</a>
                    <a [href]="portalUrl + '/contact'" class="ts-footer-link" target="_blank" rel="noopener noreferrer">Contact</a>
                  </div>
                </footer>

              </div>
            </ts-scroll-area>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-about-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: var(--ts-z-overlay, 40);
      display: flex;
      justify-content: flex-end;
      animation: var(--ts-transition-opacity);
    }

    .ts-about-panel-container {
      width: 100%;
      max-width: 680px;
      height: 100%;
      background: var(--ts-surface);
      border-left: 1px solid var(--ts-border);
      box-shadow: var(--ts-shadow-overlay);
      display: flex;
      flex-direction: column;
      animation: tsSlideInRight var(--ts-dur-base) var(--ts-ease) both;
      overflow: hidden;
    }

    .ts-about-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--ts-topbar-height, 56px);
      padding: 0 var(--ts-space-6, 24px);
      border-bottom: 1px solid var(--ts-border);
      background: var(--ts-surface);
      flex-shrink: 0;
    }

    .ts-about-panel-title {
      font-family: var(--ts-font-heading);
      font-size: var(--ts-text-lg, 20px);
      font-weight: 600;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
    }

    .ts-about-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-md, 12px);
      background: transparent;
      border: 1px solid transparent;
      color: var(--ts-text-muted);
      cursor: pointer;
      transition: var(--ts-transition-colors);
    }

    .ts-about-close-btn:hover {
      background: var(--ts-raised);
      color: var(--ts-text);
      border-color: var(--ts-border);
    }

    .ts-about-panel-body {
      flex: 1;
      overflow: hidden;
    }

    .ts-about-panel-inner {
      padding: var(--ts-space-6, 24px) var(--ts-space-6, 24px) var(--ts-space-12, 48px);
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-8, 32px);
    }

    .ts-about-section {
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-3, 12px);
    }

    .ts-section-heading {
      font-family: var(--ts-font-heading);
      font-size: var(--ts-text-lg, 20px);
      font-weight: 500;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
    }

    .ts-about-summary {
      font-size: var(--ts-text-md, 16px);
      color: var(--ts-text-muted);
      line-height: 1.65;
      white-space: pre-line;
      max-width: 72ch;
    }

    .ts-features-grid {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--ts-space-3, 12px);
    }

    @media (min-width: 600px) {
      .ts-features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .ts-feature-item {
      display: flex;
      align-items: flex-start;
      gap: var(--ts-space-2, 8px);
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text);
      line-height: 1.4;
    }

    .ts-feature-check {
      color: var(--ts-text-muted);
      margin-top: 2px;
      flex-shrink: 0;
    }

    .ts-steps-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-3, 12px);
    }

    .ts-step-item {
      display: flex;
      align-items: flex-start;
      gap: var(--ts-space-3, 12px);
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text);
      line-height: 1.5;
    }

    .ts-step-pill {
      width: 22px;
      height: 22px;
      border-radius: var(--ts-radius-full);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      color: var(--ts-text-muted);
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .ts-panel-footer {
      margin-top: var(--ts-space-4, 16px);
      padding-top: var(--ts-space-6, 24px);
      border-top: 1px solid var(--ts-border);
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-3, 12px);
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-subtle);
    }

    @media (min-width: 500px) {
      .ts-panel-footer {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .ts-footer-links {
      display: flex;
      align-items: center;
      gap: var(--ts-space-3, 12px);
    }

    .ts-footer-link {
      color: var(--ts-text-muted);
      text-decoration: none;
      transition: var(--ts-transition-colors);
    }

    .ts-footer-link:hover {
      color: var(--ts-text);
    }
  `]
})
export class TsAboutPanelComponent {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();

  readonly portalUrl = getPortalUrl();
  readonly currentYear = new Date().getFullYear();

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }
}
