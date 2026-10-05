import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-protocols-chapter',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <article class="av-chapter-card" id="sec-protocols">
      <div class="chapter-badge">
        <app-icon name="sparkles" class="icon-xs"></app-icon>
        <span>Section 03 · Operational Workflows</span>
      </div>

      <h2 class="chapter-title">AirVault Protocols & Usage Guidelines</h2>
      <p class="chapter-desc">
        Tips and keybindings to optimize seamless multi-device clipboard sync across development environments.
      </p>

      <div class="chapter-grid-2x2">
        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="laptop" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Multi-Tab & Device Testing</h4>
            <p class="feature-body">Open AirVault across two browser tabs or mobile devices to experience instantaneous zero-latency peer transfer.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="zap" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Direct Targeting vs. Broadcast</h4>
            <p class="feature-body">Select a specific device in the left sidebar rail to direct-beam payloads rather than broadcasting to all peers.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="command" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">Keyboard Shortcuts</h4>
            <p class="feature-body">Press <kbd class="av-kbd">⌘ Enter</kbd> to beam clipboard, <kbd class="av-kbd">⌘ H</kbd> for history, and <kbd class="av-kbd">Esc</kbd> to close any modal.</p>
          </div>
        </div>

        <div class="chapter-feature-tile">
          <div class="feature-icon-box"><app-icon name="shield-check" class="icon-xs"></app-icon></div>
          <div class="feature-content">
            <h4 class="feature-title">100% Offline Resilience</h4>
            <p class="feature-body">AirVault continues functioning offline over local LAN WebRTC mesh without requiring internet access.</p>
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
    .av-kbd {
      display: inline-block;
      padding: 1px 5px;
      font-size: 11px;
      font-family: var(--av-font-mono);
      font-weight: 600;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 4px;
      color: var(--av-text-primary);
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultProtocolsChapterComponent {}
