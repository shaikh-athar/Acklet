// apps/tool-device-studio/src/components/ip/ip-checker-module.component.ts
import { Component, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { IpCheckerService } from '../../services/ip-checker.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';

@Component({
  selector: 'app-ip-checker-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ip-module-root">
      
      <!-- Module Header -->
      <app-device-module-header
        title="Public IP Checker"
        icon="globe"
        description="Find your public IP address, internet provider, and location."
        [badge]="headerBadgeText()"
        [badgeType]="metrics().ip ? 'active' : 'default'"
        (backClicked)="goBackToStudio()"
      >
        <button 
          type="button" 
          class="btn-refresh" 
          [disabled]="metrics().isLoading" 
          (click)="refreshIp()"
          aria-label="Refresh public IP address"
        >
          <ts-icon name="refresh-cw" [size]="14" [class.spin]="metrics().isLoading" />
          <span>{{ metrics().isLoading ? 'Detecting...' : 'Refresh' }}</span>
        </button>
      </app-device-module-header>

      <!-- Main Layout Grid -->
      <div class="workspace-grid">
        
        <!-- Left / Primary Column -->
        <div class="main-column">
          
          <!-- Public IP Hero Card -->
          <div class="ip-hero-card">
            <div class="ip-hero-top">
              <div class="ip-hero-label-wrap">
                <span class="flag-icon">{{ metrics().flagEmoji || '🌐' }}</span>
                <span class="ip-hero-label">Your Public IP Address</span>
              </div>
              <div class="version-badges">
                <span class="version-tag" [class.ipv6]="metrics().version === 'IPv6'">
                  {{ metrics().version }}
                </span>
                <span class="dual-stack-tag" [attr.data-status]="metrics().dualStackStatus">
                  {{ metrics().dualStackStatus | uppercase }}
                </span>
              </div>
            </div>

            <div class="ip-address-display">
              <span class="ip-mono">{{ metrics().ip || (metrics().isLoading ? 'Detecting network address...' : 'Address Unavailable') }}</span>
              
              @if (metrics().ip) {
                <button type="button" class="btn-copy-ip" (click)="copyIp(metrics().ip)" aria-label="Copy public IP to clipboard">
                  <ts-icon name="copy" [size]="14" />
                  <span>Copy IP</span>
                </button>
              }
            </div>

            <div class="ip-summary-row">
              <div class="summary-item">
                <span class="k">ISP</span>
                <span class="v">{{ metrics().isp || '--' }}</span>
              </div>
              <div class="summary-item">
                <span class="k">Location</span>
                <span class="v">{{ metrics().city || '--' }}, {{ metrics().country || '--' }}</span>
              </div>
              <div class="summary-item">
                <span class="k">Autonomous System</span>
                <span class="v">{{ metrics().asn || '--' }}</span>
              </div>
              <div class="summary-item">
                <span class="k">Network Privacy</span>
                <span class="v status-pill" [attr.data-rating]="metrics().privacyRating">
                  {{ metrics().privacyRating | uppercase }} ({{ metrics().privacyScore }}/100)
                </span>
              </div>
            </div>
          </div>

          <!-- Dual-Stack Protocol Reachability (IPv4 & IPv6 Cards) -->
          <div class="dual-stack-grid">
            
            <!-- IPv4 Card -->
            <div class="protocol-card" [class.active]="metrics().ipv4 !== null">
              <div class="protocol-header">
                <div class="protocol-title-wrap">
                  <ts-icon name="globe" [size]="16" />
                  <span class="protocol-title">IPv4 Address</span>
                </div>
                <span class="protocol-badge" [class.online]="metrics().ipv4 !== null">
                  {{ metrics().ipv4 !== null ? 'Reachable' : 'Not Detected' }}
                </span>
              </div>

              <div class="protocol-body">
                <span class="protocol-ip-mono">{{ metrics().ipv4 || 'No IPv4 address detected' }}</span>
                @if (metrics().ipv4) {
                  <button type="button" class="btn-protocol-copy" (click)="copyIp(metrics().ipv4!)" title="Copy IPv4">
                    <ts-icon name="copy" [size]="13" />
                  </button>
                }
              </div>
            </div>

            <!-- IPv6 Card -->
            <div class="protocol-card" [class.active]="metrics().ipv6 !== null">
              <div class="protocol-header">
                <div class="protocol-title-wrap">
                  <ts-icon name="globe" [size]="16" />
                  <span class="protocol-title">IPv6 Address</span>
                </div>
                <span class="protocol-badge" [class.online]="metrics().ipv6 !== null">
                  {{ metrics().ipv6 !== null ? 'Reachable' : 'Not Configured' }}
                </span>
              </div>

              <div class="protocol-body">
                <span class="protocol-ip-mono" [class.long]="Boolean(metrics().ipv6)">
                  {{ metrics().ipv6 || 'Not assigned on your network' }}
                </span>
                @if (metrics().ipv6) {
                  <button type="button" class="btn-protocol-copy" (click)="copyIp(metrics().ipv6!)" title="Copy IPv6">
                    <ts-icon name="copy" [size]="13" />
                  </button>
                }
              </div>
            </div>

          </div>

          <!-- Progressive Disclosure: Technical Details & Audit -->
          <details class="technical-details">
            <summary class="details-summary">
              <div class="summary-left">
                <ts-icon name="sliders" [size]="15" />
                <span>Technical Details & WebRTC Audit</span>
              </div>
              <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
            </summary>

            <div class="details-content">
              <!-- Geolocation Info -->
              <span class="cap-title">Network Routing Location:</span>
              <div class="geo-grid" style="margin-top: 8px;">
                <div class="geo-item">
                  <span class="geo-k">Country</span>
                  <span class="geo-v">
                    {{ metrics().country }}
                    @if (metrics().countryCode) {
                      <span class="country-pill">{{ metrics().countryCode }}</span>
                    }
                  </span>
                </div>
                <div class="geo-item">
                  <span class="geo-k">Region</span>
                  <span class="geo-v">{{ metrics().region || '--' }}</span>
                </div>
                <div class="geo-item">
                  <span class="geo-k">City</span>
                  <span class="geo-v">{{ metrics().city || '--' }}</span>
                </div>
                <div class="geo-item">
                  <span class="geo-k">Postal Code</span>
                  <span class="geo-v">{{ metrics().postal || '--' }}</span>
                </div>
                <div class="geo-item">
                  <span class="geo-k">Coordinates</span>
                  <span class="geo-v">
                    @if (metrics().latitude !== null && metrics().longitude !== null) {
                      {{ metrics().latitude }}, {{ metrics().longitude }}
                      <a 
                        [href]="'https://www.google.com/maps/search/?api=1&query=' + metrics().latitude + ',' + metrics().longitude" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="map-link"
                        title="View on Google Maps"
                      >
                        <ts-icon name="external-link" [size]="12" />
                      </a>
                    } @else {
                      --
                    }
                  </span>
                </div>
                <div class="geo-item">
                  <span class="geo-k">Timezone</span>
                  <span class="geo-v">{{ metrics().timezone }} ({{ metrics().localTime }})</span>
                </div>
              </div>

              <!-- WebRTC Local IP Leak Audit -->
              <div class="leak-audit-section" style="margin-top: 18px;">
                <span class="cap-title">WebRTC Leak Audit:</span>
                <div class="leak-status-row" [class.secure]="metrics().isWebRtcLeakProtected" style="margin-top: 8px;">
                  <ts-icon [name]="metrics().isWebRtcLeakProtected ? 'shield-check' : 'circle-alert'" [size]="18" />
                  <div>
                    <span class="status-head">
                      {{ metrics().isWebRtcLeakProtected ? 'Protected: Zero Private IP Leaks' : 'Notice: Local LAN IP Exposed' }}
                    </span>
                    <p class="status-desc" style="font-size: 11.5px; margin: 2px 0 0;">
                      {{ metrics().isWebRtcLeakProtected 
                        ? 'Your browser uses mDNS masking (.local candidates) to hide internal LAN network topology.' 
                        : 'WebRTC returned active network interface addresses.' 
                      }}
                    </p>
                  </div>
                </div>

                @if (metrics().localIps.length > 0) {
                  <div class="local-ips-wrap" style="margin-top: 8px;">
                    <span class="local-ips-label">Detected Candidates:</span>
                    <div class="ips-tags">
                      @for (lip of metrics().localIps; track lip) {
                        <span class="ip-chip">{{ lip }}</span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Export Diagnostic Reports -->
              <div class="export-section" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));">
                <span class="cap-title">Export Diagnostics:</span>
                <div class="report-actions-grid" style="margin-top: 8px;">
                  <button type="button" class="btn-report-action" (click)="copyAllDetails()">
                    <ts-icon name="copy" [size]="13" />
                    <span>Copy Summary</span>
                  </button>
                  <button type="button" class="btn-report-action" (click)="copyJsonDetails()">
                    <ts-icon name="file-code" [size]="13" />
                    <span>Copy JSON</span>
                  </button>
                  <button type="button" class="btn-report-action" (click)="downloadReport('txt')">
                    <ts-icon name="download" [size]="13" />
                    <span>Download TXT</span>
                  </button>
                  <button type="button" class="btn-report-action" (click)="downloadReport('json')">
                    <ts-icon name="download" [size]="13" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </div>
            </div>
          </details>

        </div>

        <!-- Right / Secondary Column -->
        <div class="side-column">
          
          <!-- IP Privacy Score & Exposure Analysis -->
          <div class="side-card">
            <div class="card-header-row">
              <h3 class="card-heading">Privacy Score</h3>
              <span class="score-badge" [attr.data-rating]="metrics().privacyRating">
                {{ metrics().privacyScore }}/100
              </span>
            </div>

            <div class="privacy-hero">
              <span class="privacy-pill" [attr.data-rating]="metrics().privacyRating">
                {{ metrics().privacyRating | uppercase }} PRIVACY
              </span>
            </div>

            <!-- Explainable Privacy Score Factors -->
            <div class="factors-list">
              @for (factor of metrics().privacyFactors; track factor.label) {
                <div class="factor-item">
                  <div class="factor-title-row">
                    <span class="factor-name">{{ factor.label }}</span>
                    <span class="factor-pts">+{{ factor.score }} pts</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- ISP & Routing Organization Card -->
          <div class="side-card">
            <h3 class="card-heading">Provider & Network</h3>
            
            <div class="specs-list">
              <div class="spec-row">
                <span class="spec-k">ISP Name</span>
                <span class="spec-v">{{ metrics().isp || '--' }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Organization</span>
                <span class="spec-v">{{ metrics().org || '--' }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">ASN</span>
                <span class="spec-v">{{ metrics().asn || '--' }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Network Type</span>
                <span class="spec-v">{{ metrics().proxyDetection.type }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">VPN / Proxy</span>
                <span class="spec-v" [class.detected]="metrics().isProxyOrVpn">
                  {{ metrics().isProxyOrVpn ? 'Detected' : 'Not Detected' }}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ip-module-root {
      width: 100%;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .btn-refresh:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border-hover, rgba(255, 255, 255, 0.2));
    }

    :host-context([data-theme="light"]) .btn-refresh {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-refresh:hover:not(:disabled) {
      background: #E2E8F0;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
      gap: 24px;
    }

    @media (max-width: 960px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* IP Hero Card */
    .ip-hero-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .ip-hero-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    .ip-hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .ip-hero-label-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .flag-icon {
      font-size: 18px;
      line-height: 1;
    }

    .ip-hero-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .ip-hero-label {
      color: #64748B;
    }

    .version-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .version-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--tool-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
    }

    :host-context([data-theme="light"]) .version-tag {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .version-tag.ipv6 {
      background: rgba(168, 85, 247, 0.15);
      color: #C084FC;
      border-color: rgba(168, 85, 247, 0.3);
    }

    .dual-stack-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-muted, #71717A);
    }

    .dual-stack-tag[data-status="dual-stack"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .ip-address-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .ip-address-display {
      border-bottom-color: #F1F5F9;
    }

    .ip-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 36px;
      font-weight: 800;
      color: var(--text, #F4F4F5);
      letter-spacing: -0.02em;
      word-break: break-all;
    }

    @media (max-width: 600px) {
      .ip-mono {
        font-size: 26px;
      }
    }

    :host-context([data-theme="light"]) .ip-mono {
      color: #0F172A;
    }

    .btn-copy-ip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 4px 14px var(--ds-accent-glow, rgba(59, 130, 246, 0.25));
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .btn-copy-ip:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .btn-copy-ip {
      background: #2563EB;
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
    }

    .ip-summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) {
      .ip-summary-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-item .k {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .summary-item .k {
      color: #64748B;
    }

    .summary-item .v {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .summary-item .v {
      color: #0F172A;
    }

    .status-pill {
      font-size: 11px;
      font-weight: 700;
      color: var(--tool-accent, #3B82F6) !important;
    }

    :host-context([data-theme="light"]) .status-pill {
      color: #2563EB !important;
    }

    /* Dual-Stack Grid */
    .dual-stack-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .dual-stack-grid {
        grid-template-columns: 1fr;
      }
    }

    .protocol-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s ease;
    }

    :host-context([data-theme="light"]) .protocol-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .protocol-card.active {
      border-color: rgba(45, 212, 191, 0.3);
    }

    .protocol-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .protocol-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .protocol-title-wrap {
      color: #0F172A;
    }

    .protocol-title {
      font-size: 13px;
      font-weight: 700;
    }

    .protocol-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-muted, #71717A);
    }

    .protocol-badge.online {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .protocol-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 4px;
    }

    .protocol-ip-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      word-break: break-all;
    }

    .protocol-ip-mono.long {
      font-size: 12.5px;
    }

    :host-context([data-theme="light"]) .protocol-ip-mono {
      color: #0F172A;
    }

    .btn-protocol-copy {
      padding: 5px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #71717A);
      cursor: pointer;
      flex-shrink: 0;
      transition: color 0.15s, border-color 0.15s;
    }

    .btn-protocol-copy:hover {
      color: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-protocol-copy:hover {
      color: #2563EB;
      border-color: #2563EB;
    }

    .protocol-note {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      margin: 0;
      line-height: 1.4;
    }

    /* Info Cards (Geo & WebRTC) */
    .info-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 24px;
    }

    :host-context([data-theme="light"]) .info-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .card-title-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }

    .icon-chip {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--surface-secondary, #27272A);
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .icon-chip {
      background: #EFF6FF;
      color: #2563EB;
    }

    .icon-chip.secure {
      color: #34D399;
      background: rgba(52, 211, 153, 0.15);
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .card-title {
      color: #0F172A;
    }

    .card-subtitle {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .card-subtitle {
      color: #64748B;
    }

    /* Geo Grid */
    .geo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) {
      .geo-grid {
        grid-template-columns: 1fr;
      }
    }

    .geo-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .geo-item {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .geo-k {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .geo-k {
      color: #64748B;
    }

    .geo-v {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    :host-context([data-theme="light"]) .geo-v {
      color: #0F172A;
    }

    .country-pill {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-2, #A1A1AA);
    }

    .map-link {
      display: inline-flex;
      align-items: center;
      color: var(--tool-accent, #3B82F6);
      text-decoration: none;
      margin-left: 4px;
    }

    :host-context([data-theme="light"]) .map-link {
      color: #2563EB;
    }

    /* WebRTC Leak Body */
    .leak-audit-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .leak-status-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(248, 113, 113, 0.12);
      border: 1px solid rgba(248, 113, 113, 0.3);
      color: #F87171;
    }

    .leak-status-row.secure {
      background: rgba(52, 211, 153, 0.12);
      border-color: rgba(52, 211, 153, 0.3);
      color: #34D399;
    }

    .status-head {
      font-size: 13px;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .status-desc {
      font-size: 11.5px;
      margin: 0;
      line-height: 1.45;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .status-desc {
      color: #475569;
    }

    .local-ips-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .local-ips-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    .ips-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ip-chip {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .ip-chip {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #1E293B;
    }

    /* Side Cards */
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .side-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 20px;
    }

    :host-context([data-theme="light"]) .side-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .card-heading {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .card-heading {
      color: #0F172A;
    }

    .score-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .score-badge {
      background: #2563EB;
      color: #FFFFFF;
    }

    .privacy-hero {
      display: flex;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .privacy-hero {
      border-bottom-color: #F1F5F9;
    }

    .privacy-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--tool-accent, #3B82F6);
      align-self: flex-start;
    }

    .factors-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .factor-item {
      display: flex;
      align-items: center;
      padding: 4px 0;
    }

    .factor-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .factor-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .factor-name {
      color: #0F172A;
    }

    .factor-pts {
      font-size: 11px;
      font-weight: 700;
      color: #34D399;
    }

    .factor-desc {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      margin: 0;
      line-height: 1.4;
    }

    /* Specs List */
    .specs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
      margin-bottom: 12px;
    }

    .spec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }

    .spec-k {
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .spec-k {
      color: #64748B;
    }

    .spec-v {
      font-weight: 600;
      color: var(--text, #F4F4F5);
      text-align: right;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .spec-v {
      color: #0F172A;
    }

    .spec-v.detected {
      color: #FBBF24;
    }

    .disclaimer-note {
      font-size: 10.5px;
      color: var(--text-muted, #71717A);
      line-height: 1.4;
      margin: 8px 0 0;
      font-style: italic;
    }

    /* Diagnostic Reports Actions */
    .export-intro {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
      margin: 10px 0 16px;
    }

    :host-context([data-theme="light"]) .export-intro {
      color: #64748B;
    }

    .report-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .btn-report-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn-report-action:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--tool-accent, #3B82F6);
    }

    .btn-report-action.primary {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-report-action {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-report-action.primary {
      background: rgba(37, 99, 235, 0.1);
      border-color: rgba(37, 99, 235, 0.3);
      color: #2563EB;
    }

    .privacy-guarantee {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #71717A);
      font-size: 10.5px;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .privacy-guarantee {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* Technical Details Expandable */
    .technical-details {
      margin-top: 16px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.16s ease;
    }

    :host-context([data-theme="light"]) .technical-details {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .technical-details[open] {
      border-color: var(--tool-accent, #3B82F6);
    }

    .details-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      cursor: pointer;
      user-select: none;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      background: transparent;
      list-style: none;
    }

    :host-context([data-theme="light"]) .details-summary {
      color: #0F172A;
    }

    .details-summary::-webkit-details-marker {
      display: none;
    }

    .details-summary:hover {
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
    }

    :host-context([data-theme="light"]) .details-summary:hover {
      background: #F8FAFC;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--tool-accent, #3B82F6);
    }

    .summary-left span {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .summary-left span {
      color: #0F172A;
    }

    .summary-chevron {
      transition: transform 0.2s ease;
      color: var(--text-2, #A1A1AA);
    }

    .technical-details[open] .summary-chevron {
      transform: rotate(180deg);
    }

    .details-content {
      padding: 16px 18px 20px;
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .details-content {
      border-top-color: #F1F5F9;
    }
  `]
})
export class IpCheckerModuleComponent implements OnInit {
  private router = inject(Router);
  public ipChecker = inject(IpCheckerService);
  private state = inject(DeviceStudioStateService);

  public readonly metrics = this.ipChecker.metrics;

  public readonly headerBadgeText = computed(() => {
    const m = this.metrics();
    if (m.isLoading) return 'Checking...';
    if (m.dualStackStatus === 'dual-stack') return 'Dual-Stack Active';
    if (m.ip) return `${m.version} Identified`;
    return 'Ready';
  });

  public readonly privacySummaryText = computed(() => {
    const m = this.metrics();
    if (m.privacyScore >= 80) {
      return 'Excellent privacy posture. Strong WebRTC masking and protected regional geolocation.';
    }
    if (m.privacyScore >= 65) {
      return 'Good standard privacy. Standard broadband IP exposed with active WebRTC LAN masking.';
    }
    if (m.privacyScore >= 45) {
      return 'Moderate exposure. Direct residential ISP address visible to web servers.';
    }
    return 'Noticeable exposure. WebRTC or protocol leakage detected on this connection.';
  });

  public ngOnInit(): void {
    this.state.setActiveTab('ip');
    if (!this.metrics().ip) {
      this.refreshIp();
    }
  }

  public async refreshIp(): Promise<void> {
    try {
      await this.ipChecker.fetchIpDetails();
      this.state.markModuleTested('ip');
      this.state.showToast('Public IP & network details refreshed.');
    } catch {}
  }

  public copyIp(ip: string): void {
    if (ip && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(ip);
      this.state.showToast(`Copied ${ip} to clipboard!`);
    }
  }

  public copyAllDetails(): void {
    const text = this.ipChecker.generateReportText();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      this.state.showToast('Full network intelligence summary copied!');
    }
  }

  public copyJsonDetails(): void {
    const json = JSON.stringify(this.ipChecker.generateReportJson(), null, 2);
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(json);
      this.state.showToast('Network JSON payload copied to clipboard!');
    }
  }

  public downloadReport(format: 'txt' | 'json'): void {
    this.ipChecker.downloadReport(format);
    this.state.showToast(`Downloading IP report (${format.toUpperCase()})...`);
  }

  public goBackToStudio(): void {
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }

  public Boolean(val: unknown): boolean {
    return Boolean(val);
  }
}
