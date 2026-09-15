import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-tips-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="title-group">
            <div class="icon-circle">
              <app-icon name="sparkles" class="icon-sm text-blue"></app-icon>
            </div>
            <div>
              <h3>AirVault Workflow Tips & Shortcuts</h3>
              <p class="subtitle">Master lightning-fast cross-device clipboard synchronization</p>
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()" aria-label="Close">
            <app-icon name="x" class="icon-sm"></app-icon>
          </button>
        </div>

        <div class="modal-body">
          <div class="tips-grid">
            <div class="tip-card">
              <div class="tip-header">
                <app-icon name="layers" class="icon-xs text-blue"></app-icon>
                <h4>Instant Multi-Tab Demo</h4>
              </div>
              <p>Open AirVault in a second browser window or tab. Copy something in one tab to witness peer-to-peer BroadcastChannel synchronization instantly without any cloud relay.</p>
            </div>

            <div class="tip-card">
              <div class="tip-header">
                <app-icon name="zap" class="icon-xs text-blue"></app-icon>
                <h4>Auto-Capture on Focus</h4>
              </div>
              <p>Enable <strong>Auto-Capture</strong> from the bottom dock. When you switch back to AirVault after copying text in any app, it automatically stages and encrypts the clipboard contents.</p>
            </div>

            <div class="tip-card">
              <div class="tip-header">
                <app-icon name="shield-check" class="icon-xs text-blue"></app-icon>
                <h4>Smart Credential Shielding</h4>
              </div>
              <p>API keys, JWT tokens, private keys, and passwords are automatically masked with a security shield. Click on any masked payload to safely reveal its plaintext.</p>
            </div>

            <div class="tip-card">
              <div class="tip-header">
                <app-icon name="send" class="icon-xs text-blue"></app-icon>
                <h4>Targeted Direct Beams</h4>
              </div>
              <p>By default, content beams to all connected devices. Use the destination selector in the Right Sidebar to direct a beam strictly to a specific phone, tablet, or laptop.</p>
            </div>
          </div>

          <div class="shortcuts-section">
            <h4>Keyboard Shortcuts</h4>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <span>Beam / Send Staged Content</span>
                <kbd>⌘ + Enter</kbd>
              </div>
              <div class="shortcut-item">
                <span>Capture from System Clipboard</span>
                <kbd>⌘ + V</kbd>
              </div>
              <div class="shortcut-item">
                <span>Toggle Auto-Capture</span>
                <kbd>Alt + A</kbd>
              </div>
              <div class="shortcut-item">
                <span>Dismiss Modals & Drawers</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="primary-btn" (click)="close.emit()">Got it, let's sync</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 17, 24, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-card {
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35);
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--av-border-subtle);
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--av-accent-wash);
      border: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title-group h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0 0 2px;
    }

    .subtitle {
      font-size: 12px;
      color: var(--av-text-muted);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: var(--av-surface-secondary);
      color: var(--av-text-main);
    }

    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .tips-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 540px) {
      .tips-grid {
        grid-template-columns: 1fr;
      }
    }

    .tip-card {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border-subtle);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .tip-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .tip-header h4 {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0;
    }

    .tip-card p {
      font-size: 12px;
      line-height: 1.45;
      color: var(--av-text-muted);
      margin: 0;
    }

    .shortcuts-section {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border-subtle);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .shortcuts-section h4 {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0 0 10px;
    }

    .shortcuts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--av-text-muted);
    }

    kbd {
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 700;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      padding: 2px 6px;
      border-radius: 6px;
      color: var(--av-text-main);
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--av-border-subtle);
      display: flex;
      justify-content: flex-end;
    }

    .primary-btn {
      padding: 8px 18px;
      background: var(--av-primary);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .primary-btn:hover {
      background: var(--av-deep);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    .text-blue { color: var(--av-primary); }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultTipsModalComponent {
  close = output<void>();
}
