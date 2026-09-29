import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultCryptoService } from '../services/airvault-crypto.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-privacy-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="privacy-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-badge">
            <app-icon name="shield-check" class="icon-sm text-green"></app-icon>
            <h2>Security & Privacy Architecture</h2>
          </div>
          <button class="close-btn" (click)="close.emit()">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <div class="modal-body">
          <!-- Active Cryptographic Session Box -->
          <div class="crypto-session-box">
            <div class="session-row">
              <span class="session-label">Local Key Thumbprint</span>
              <code class="session-value">{{ crypto.getThumbprint() }}</code>
            </div>
            <div class="session-row">
              <span class="session-label">Key Agreement</span>
              <span class="session-value">ECDH (NIST Curve P-256)</span>
            </div>
            <div class="session-row">
              <span class="session-label">Payload Cipher</span>
              <span class="session-value">AES-GCM-256 (96-bit IV)</span>
            </div>
            <div class="session-row">
              <span class="session-label">Data Privacy</span>
              <span class="session-value text-green">Encrypted in Transit · Auto-Expiry</span>
            </div>
          </div>

          <div class="privacy-pillar">
            <div class="pillar-icon-box">
              <app-icon name="key" class="icon-sm text-cyan"></app-icon>
            </div>
            <div class="pillar-text">
              <h3>Web Crypto API Keys</h3>
              <p>Cryptographic key pairs and derivation material run client-side in your browser instance for active session signaling.</p>
            </div>
          </div>

          <div class="privacy-pillar">
            <div class="pillar-icon-box">
              <app-icon name="lock" class="icon-sm text-cyan"></app-icon>
            </div>
            <div class="pillar-text">
              <h3>Encrypted Transport & Storage</h3>
              <p>Content is encrypted in transit using TLS and AES-GCM. Shared link clipboards are retained on the server until their configurable expiration TTL.</p>
            </div>
          </div>

          <div class="privacy-pillar">
            <div class="pillar-icon-box">
              <app-icon name="shield-alert" class="icon-sm text-cyan"></app-icon>
            </div>
            <div class="pillar-text">
              <h3>Automated Secret Masking</h3>
              <p>API keys (AWS, OpenAI, GitHub), JWTs, passwords, and private keys are detected with regex heuristics and masked with click-to-reveal controls.</p>
            </div>
          </div>

          <div class="privacy-pillar">
            <div class="pillar-icon-box">
              <app-icon name="database" class="icon-sm text-cyan"></app-icon>
            </div>
            <div class="pillar-text">
              <h3>Local IndexedDB & Expiry Cleanup</h3>
              <p>History items are cached in your local browser storage with automatic TTL retention cleanup and 1-click irreversible data purge.</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="dismiss-btn" (click)="close.emit()">Got it, Keep Private</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      animation: fadeIn 0.15s ease;
    }

    .privacy-modal-card {
      width: 480px;
      max-width: 90vw;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 210, 180, 0.1);
      overflow: hidden;
      animation: modalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes modalScaleIn {
      from { opacity: 0; transform: scale(0.96) translateY(4px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--av-border-subtle);
    }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-badge h2 {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted);
      cursor: pointer;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 75vh;
      overflow-y: auto;
    }

    .crypto-session-box {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .session-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }

    .session-label {
      color: var(--av-text-muted);
    }

    .session-value {
      font-weight: 700;
      color: var(--av-text-main);
    }

    code.session-value {
      font-family: var(--font-mono, monospace);
      color: var(--av-accent);
      background: var(--av-surface-primary);
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid var(--av-border);
    }

    .privacy-pillar {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .pillar-icon-box {
      width: 32px;
      height: 32px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pillar-text h3 {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main);
      margin: 0 0 2px;
    }

    .pillar-text p {
      font-size: 11px;
      color: var(--av-text-muted);
      margin: 0;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 20px;
      border-top: 1px solid var(--av-border-subtle);
    }

    .dismiss-btn {
      padding: 6px 14px;
      background: var(--av-accent);
      color: #000;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .dismiss-btn:hover {
      background: var(--av-accent-hover);
    }

    .text-green { color: var(--av-success); }
    .text-cyan { color: var(--av-accent); }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultPrivacyModalComponent {
  crypto = inject(AirVaultCryptoService);
  deviceService = inject(AirVaultDeviceService);

  close = output<void>();
}
