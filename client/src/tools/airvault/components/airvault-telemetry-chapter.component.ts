import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-telemetry-chapter',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <article class="av-chapter-card" id="sec-telemetry">
      <div class="chapter-badge">
        <app-icon name="activity" class="icon-xs"></app-icon>
        <span>Section 02 · Diagnostics & P2P Channels</span>
      </div>

      <h2 class="chapter-title">Real-Time Channel Telemetry</h2>
      <p class="chapter-desc">
        Direct peer-to-peer transport metrics and session state monitoring for all paired constellation nodes.
      </p>

      <!-- Stat Strip -->
      <div class="av-stat-row">
        <div class="av-stat-card">
          <div class="stat-num">{{ pairedDevices().length + 1 }}</div>
          <div class="stat-lbl">Devices online</div>
        </div>
        <div class="av-stat-card">
          <div class="stat-num">{{ totalBytes() }} B</div>
          <div class="stat-lbl">Vault storage</div>
        </div>
        <div class="av-stat-card">
          <div class="stat-num">100%</div>
          <div class="stat-lbl">Delivery rate</div>
        </div>
      </div>

      <!-- Channel Status Key-Value Panel -->
      <div class="chapter-panel-full">
        <div class="av-kv-row">
          <span class="av-kv-label">
            <app-icon name="radio" class="icon-xs"></app-icon>
            <span>Transport protocol</span>
          </span>
          <span class="av-kv-val">WebRTC DataChannel · BroadcastChannel</span>
        </div>
        <div class="av-kv-row">
          <span class="av-kv-label">
            <app-icon name="lock" class="icon-xs"></app-icon>
            <span>Authenticated encryption</span>
          </span>
          <span class="av-kv-val">AES-GCM-256</span>
        </div>
        <div class="av-kv-row">
          <span class="av-kv-label">
            <app-icon name="key" class="icon-xs"></app-icon>
            <span>Key negotiation</span>
          </span>
          <span class="av-kv-val">ECDH P-256 (Diffie-Hellman)</span>
        </div>
        <div class="av-kv-row">
          <span class="av-kv-label">
            <app-icon name="activity" class="icon-xs"></app-icon>
            <span>Channel health</span>
          </span>
          <span class="av-kv-val av-kv-online">
            <span class="pulse-beacon"></span>
            <span>Optimal · 0ms latency</span>
          </span>
        </div>

        <div class="av-panel-actions">
          <button class="av-btn-secondary" (click)="openDeviceManager.emit()" data-tooltip="Manage paired devices">
            <app-icon name="sliders" class="icon-xs"></app-icon>
            <span>Device permissions</span>
          </button>
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
    .av-stat-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .av-stat-card {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
    }
    .av-stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(33, 150, 243, 0.4);
    }
    .av-stat-card .stat-num {
      font-size: 22px;
      font-weight: 700;
      color: var(--av-text-primary);
    }
    .av-stat-card .stat-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-faint);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .chapter-panel-full {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 12px;
      padding: 20px;
    }
    .av-kv-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 0;
      border-bottom: 1px solid var(--av-border-subtle);
    }
    .av-kv-row:last-child {
      border-bottom: none;
    }
    .av-kv-label {
      font-size: 12px;
      color: var(--av-text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .av-kv-val {
      font-size: 11.5px;
      font-weight: 600;
      font-family: var(--av-font-mono);
      color: var(--av-text-primary);
      background: var(--av-surface-primary);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--av-border);
    }
    .av-kv-online {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.2);
    }
    .pulse-beacon {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: beacon-pulse 1.8s infinite;
    }
    @keyframes beacon-pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }
    .av-panel-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .av-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--av-border);
      border-radius: 6px;
      background: var(--av-surface-primary);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--av-text-primary);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }
    .av-btn-secondary:hover {
      background: var(--av-surface-secondary);
      border-color: var(--av-border-strong);
      transform: translateY(-1px);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultTelemetryChapterComponent {
  pairedDevices = input<AirVaultDevice[]>([]);
  totalBytes = input<number>(0);

  openDeviceManager = output<void>();
}
