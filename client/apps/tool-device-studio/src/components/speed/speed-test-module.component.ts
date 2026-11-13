// apps/tool-device-studio/src/components/speed/speed-test-module.component.ts
import { Component, inject, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { SpeedTestService } from '../../services/speed-test.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';

@Component({
  selector: 'app-speed-test-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="speed-module-root">
      
      <!-- Module Header -->
      <app-device-module-header
        title="Internet Speed Test"
        icon="speed"
        description="Measure your download speed, upload speed, and ping."
        [badge]="headerBadgeText()"
        [badgeType]="metrics().status === 'completed' ? 'active' : (isRunning() ? 'warn' : 'default')"
        (backClicked)="goBackToStudio()"
      >
        @if (isRunning()) {
          <button type="button" class="btn-cancel" (click)="speed.cancelTest()" aria-label="Cancel speed test">
            <ts-icon name="alert-circle" [size]="14" />
            <span>Cancel Test</span>
          </button>
        } @else {
          <button type="button" class="btn-start" (click)="startTest()" aria-label="Start speed test">
            <ts-icon [name]="metrics().status === 'completed' ? 'refresh-cw' : 'play'" [size]="15" />
            <span>{{ metrics().status === 'completed' ? 'Run Again' : 'Start Speed Test' }}</span>
          </button>
        }
      </app-device-module-header>

      <!-- Main Layout Grid -->
      <div class="workspace-grid">
        
        <!-- Left / Primary Column -->
        <div class="main-column">
          
          <!-- Speedometer Gauge Card -->
          <div class="gauge-card">
            
            @if (metrics().status === 'idle') {
              <!-- Initial GO Action State (Ookla Style with Acklet Blue Accent) -->
              <div class="go-wrapper">
                <button
                  type="button"
                  class="btn-go-action"
                  (click)="startTest()"
                  aria-label="Start speed test"
                >
                  <span class="go-pulse-ring" aria-hidden="true"></span>
                  <span class="go-text">GO</span>
                </button>
                <div class="live-phase-text">{{ metrics().currentPhaseText }}</div>
              </div>
            } @else {
              <!-- Active / Completed Gauge Wrapper -->
              <div class="gauge-wrapper">
                <!-- Circular Speedometer SVG (Ookla Speedtest Horseshoe Layout) -->
                <svg class="speedometer-svg" viewBox="0 0 240 160" aria-hidden="true">
                  <!-- Background Arc -->
                  <path
                    class="gauge-bg-arc"
                    d="M 63.3 135.6 A 74 74 0 1 1 176.7 135.6"
                  />

                  <!-- Active Progress Arc -->
                  <path
                    class="gauge-active-arc"
                    [attr.stroke-dasharray]="gaugeArcDash()"
                    d="M 63.3 135.6 A 74 74 0 1 1 176.7 135.6"
                  />

                  <!-- Scale Tick Markers -->
                  <g class="gauge-ticks">
                    <text x="76.3" y="124.6" class="tick-label">0</text>
                    <text x="63.0" y="86.9" class="tick-label">10</text>
                    <text x="84.9" y="43.1" class="tick-label">50</text>
                    <text x="120.0" y="31.0" class="tick-label">100</text>
                    <text x="174.8" y="72.3" class="tick-label">250</text>
                    <text x="163.7" y="124.6" class="tick-label">500+</text>
                  </g>

                  <!-- Rotating Needle -->
                  <g transform="translate(120, 88)">
                    <g class="needle-group" [attr.transform]="'rotate(' + needleAngle() + ')'" [style.transform]="'rotate(' + needleAngle() + 'deg)'">
                      <polygon points="-2.5,0 0,-48 2.5,0" class="needle-blade" />
                      <circle cx="0" cy="0" r="4.5" class="needle-hub" />
                    </g>
                  </g>

                  <!-- Center Readout: Speed & Unit -->
                  <g class="gauge-center-readout">
                    <text x="120" y="122" class="live-speed-num">{{ currentSpeedDisplay() }}</text>
                    <text x="120" y="139" class="live-speed-unit">{{ metrics().status === 'ping' ? 'MS' : 'Mbps' }}</text>
                  </g>
                </svg>

                <!-- Phase Status Subtitle -->
                <div class="live-phase-text">{{ metrics().currentPhaseText }}</div>
              </div>
            }

            <!-- Overall Progress Bar -->
            @if (isRunning()) {
              <div class="test-progress-bar" role="progressbar" [attr.aria-valuenow]="metrics().progressPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-fill" [style.width.%]="metrics().progressPercent"></div>
              </div>
            }

            <!-- Spacebar Shortcut Hint -->
            <div class="keyboard-hint">
              <span class="kbd-badge">Space</span>
              <span>to {{ isRunning() ? 'Cancel' : 'Start' }}</span>
            </div>

            <!-- Scorecard Grid (Download, Upload, Ping, Jitter) -->
            <div class="scorecard-grid">
              
              <!-- Download -->
              <div class="score-box" [class.highlight]="metrics().status === 'download'">
                <div class="score-icon-title">
                  <ts-icon name="download" [size]="15" />
                  <span class="score-label">Download</span>
                </div>
                <div class="score-val-wrap">
                  <span class="score-val">{{ metrics().downloadMbps !== null ? metrics().downloadMbps : '--' }}</span>
                  <span class="unit">Mbps</span>
                </div>
                <span class="score-subtext">
                  @if (metrics().status === 'download') {
                    Streaming payload...
                  } @else if (metrics().downloadMbps !== null) {
                    Bandwidth measured
                  } @else {
                    Pending test
                  }
                </span>
              </div>

              <!-- Upload -->
              <div class="score-box" [class.highlight]="metrics().status === 'upload'">
                <div class="score-icon-title">
                  <ts-icon name="upload" [size]="15" />
                  <span class="score-label">Upload</span>
                </div>
                <div class="score-val-wrap">
                  <span class="score-val">{{ metrics().uploadMbps !== null ? metrics().uploadMbps : '--' }}</span>
                  <span class="unit">Mbps</span>
                </div>
                <span class="score-subtext">
                  @if (metrics().status === 'upload') {
                    Uploading chunks...
                  } @else if (metrics().uploadMbps !== null) {
                    Throughput measured
                  } @else {
                    Pending test
                  }
                </span>
              </div>

              <!-- Ping (Latency) -->
              <div class="score-box" [class.highlight]="metrics().status === 'ping'">
                <div class="score-icon-title">
                  <ts-icon name="activity" [size]="15" />
                  <span class="score-label">Ping Latency</span>
                </div>
                <div class="score-val-wrap">
                  <span class="score-val">{{ metrics().pingMs !== null ? metrics().pingMs : '--' }}</span>
                  <span class="unit">ms</span>
                </div>
                <span class="score-subtext">
                  @if (metrics().minPingMs !== null && metrics().maxPingMs !== null) {
                    {{ metrics().minPingMs }}ms – {{ metrics().maxPingMs }}ms range
                  } @else {
                    Round-trip time
                  }
                </span>
              </div>

              <!-- Jitter -->
              <div class="score-box" [class.highlight]="metrics().status === 'ping'">
                <div class="score-icon-title">
                  <ts-icon name="wifi" [size]="15" />
                  <span class="score-label">Jitter</span>
                </div>
                <div class="score-val-wrap">
                  <span class="score-val">{{ metrics().jitterMs !== null ? metrics().jitterMs : '--' }}</span>
                  <span class="unit">ms</span>
                </div>
                <span class="score-subtext">{{ jitterStabilityLabel() }}</span>
              </div>

            </div>

          </div>

          <!-- Test History Panel -->
          <div class="history-card">
            <div class="history-header">
              <div class="history-title-wrap">
                <ts-icon name="history" [size]="16" />
                <h3 class="history-title">Test History</h3>
                <span class="history-count">({{ metrics().testHistory.length }})</span>
              </div>

              @if (metrics().testHistory.length > 0) {
                <button type="button" class="btn-clear-history" (click)="speed.clearHistory()" aria-label="Clear all speed test history">
                  <ts-icon name="trash" [size]="13" />
                  <span>Clear History</span>
                </button>
              }
            </div>

            @if (metrics().testHistory.length > 0) {
              <div class="history-table-wrap">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Download</th>
                      <th>Upload</th>
                      <th>Ping</th>
                      <th>Jitter</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of metrics().testHistory; track item.id) {
                      <tr>
                        <td class="cell-time">{{ item.timestamp }}</td>
                        <td class="cell-speed"><strong>{{ item.downloadMbps }}</strong> Mbps</td>
                        <td class="cell-speed"><strong>{{ item.uploadMbps }}</strong> Mbps</td>
                        <td>{{ item.pingMs }} ms</td>
                        <td>{{ item.jitterMs }} ms</td>
                        <td>
                          <span class="history-rating-pill" [attr.data-rating]="item.qualityRating">
                            {{ item.qualityRating | uppercase }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="history-empty">
                <ts-icon name="clock" [size]="22" />
                <p class="empty-title">No test history recorded yet</p>
                <p class="empty-desc">Completed speed test measurements will be saved locally in this browser for quick comparison.</p>
              </div>
            }
          </div>

        </div>

        <!-- Right / Secondary Column -->
        <div class="side-column">
          
          <!-- Outcome Card: Connection Status -->
          <div class="side-card">
            <div class="card-header-row">
              <h3 class="card-heading">Connection Status</h3>
              @if (metrics().status === 'completed') {
                <span class="score-badge">{{ metrics().suitability.overallScore }}/100</span>
              }
            </div>

            @if (metrics().status === 'completed') {
              <div class="quality-hero">
                <div class="pill-row">
                  <span class="rating-pill" [attr.data-rating]="metrics().qualityRating">
                    {{ metrics().qualityRating | uppercase }} SPEED
                  </span>
                  <span class="stability-pill" [attr.data-stability]="metrics().suitability.stabilityRating">
                    {{ metrics().suitability.stabilityRating | uppercase }}
                  </span>
                </div>
                <p class="quality-desc">{{ metrics().suitability.summaryText }}</p>
              </div>
            } @else {
              <div class="quality-placeholder">
                <ts-icon name="wifi" [size]="24" />
                <span>Run the speed test to check your download, upload, and stability.</span>
              </div>
            }

            <div class="outcome-list" style="margin-top: 14px;">
              <div class="outcome-row">
                <span class="outcome-k">Status</span>
                <span class="outcome-v" [class.working]="metrics().status === 'completed'">
                  {{ metrics().status === 'completed' ? 'Working' : (isRunning() ? 'Testing...' : 'Ready') }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Download</span>
                <span class="outcome-v highlight">{{ metrics().downloadMbps !== null ? metrics().downloadMbps + ' Mbps' : '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Upload</span>
                <span class="outcome-v highlight">{{ metrics().uploadMbps !== null ? metrics().uploadMbps + ' Mbps' : '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Latency (Ping)</span>
                <span class="outcome-v">{{ metrics().pingMs !== null ? metrics().pingMs + ' ms' : '--' }}</span>
              </div>
            </div>
          </div>

          <!-- Progressive Disclosure: App Suitability & Telemetry -->
          <details class="technical-details">
            <summary class="details-summary">
              <div class="summary-left">
                <ts-icon name="sliders" [size]="15" />
                <span>Technical Details & Apps</span>
              </div>
              <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
            </summary>

            <div class="details-content">
              <!-- Application Suitability Checkpoints -->
              <span class="cap-title">App Suitability:</span>
              <div class="suitability-list" style="margin-top: 8px;">
                <div class="suit-item">
                  <div class="suit-title-row">
                    <div class="suit-title-left">
                      <span class="status-dot" [attr.data-status]="metrics().suitability.conferencing.status"></span>
                      <span class="suit-name">Video Calls</span>
                    </div>
                    <span class="suit-badge" [attr.data-status]="metrics().suitability.conferencing.status">
                      {{ metrics().suitability.conferencing.status | uppercase }}
                    </span>
                  </div>
                </div>

                <div class="suit-item">
                  <div class="suit-title-row">
                    <div class="suit-title-left">
                      <span class="status-dot" [attr.data-status]="metrics().suitability.gaming.status"></span>
                      <span class="suit-name">Online Gaming</span>
                    </div>
                    <span class="suit-badge" [attr.data-status]="metrics().suitability.gaming.status">
                      {{ metrics().suitability.gaming.status | uppercase }}
                    </span>
                  </div>
                </div>

                <div class="suit-item">
                  <div class="suit-title-row">
                    <div class="suit-title-left">
                      <span class="status-dot" [attr.data-status]="metrics().suitability.streaming4k.status"></span>
                      <span class="suit-name">4K Streaming</span>
                    </div>
                    <span class="suit-badge" [attr.data-status]="metrics().suitability.streaming4k.status">
                      {{ metrics().suitability.streaming4k.status | uppercase }}
                    </span>
                  </div>
                </div>

                <div class="suit-item">
                  <div class="suit-title-row">
                    <div class="suit-title-left">
                      <span class="status-dot" [attr.data-status]="metrics().suitability.browsing.status"></span>
                      <span class="suit-name">Web Browsing</span>
                    </div>
                    <span class="suit-badge" [attr.data-status]="metrics().suitability.browsing.status">
                      {{ metrics().suitability.browsing.status | uppercase }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Connection Telemetry -->
              <div class="telemetry-section" style="margin-top: 16px;">
                <span class="cap-title">Connection Telemetry:</span>
                <div class="specs-list" style="margin-top: 8px;">
                  <div class="spec-row">
                    <span class="spec-k">Connection Type</span>
                    <span class="spec-v">{{ metrics().telemetry.effectiveType || 'Broadband / Wi-Fi' }}</span>
                  </div>
                  @if (metrics().telemetry.downlinkEstimatedMbps !== undefined) {
                    <div class="spec-row">
                      <span class="spec-k">Browser Downlink</span>
                      <span class="spec-v">{{ metrics().telemetry.downlinkEstimatedMbps }} Mbps</span>
                    </div>
                  }
                  @if (metrics().telemetry.rttEstimatedMs !== undefined) {
                    <div class="spec-row">
                      <span class="spec-k">Browser RTT</span>
                      <span class="spec-v">{{ metrics().telemetry.rttEstimatedMs }} ms</span>
                    </div>
                  }
                  <div class="spec-row">
                    <span class="spec-k">Edge Server</span>
                    <span class="spec-v">Cloudflare Anycast</span>
                  </div>
                </div>
              </div>
            </div>
          </details>

        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .speed-module-root {
      width: 100%;
    }

    .btn-start {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.16s ease, transform 0.16s ease;
    }

    .btn-start:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .btn-start {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-cancel {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #F87171;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-cancel:hover {
      background: rgba(239, 68, 68, 0.25);
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
      gap: 20px;
    }

    /* Gauge Card */
    .gauge-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 32px 24px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .gauge-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    /* GO Action Wrapper (Initial Ookla-Style State) */
    .go-wrapper {
      position: relative;
      width: 100%;
      max-width: 360px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
    }

    .btn-go-action {
      position: relative;
      width: 168px;
      height: 168px;
      border-radius: 50%;
      border: 3px solid var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      outline: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      margin: 8px 0 16px;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    :host-context([data-theme="light"]) .btn-go-action {
      border-color: #2563EB;
      background: rgba(37, 99, 235, 0.03);
    }

    .btn-go-action:hover {
      transform: scale(1.05);
      border-color: var(--tool-accent, #3B82F6);
      background: rgba(59, 130, 246, 0.1);
      box-shadow: 0 0 36px var(--ds-accent-glow, rgba(59, 130, 246, 0.3));
    }

    :host-context([data-theme="light"]) .btn-go-action:hover {
      border-color: #2563EB;
      background: rgba(37, 99, 235, 0.08);
      box-shadow: 0 0 36px rgba(37, 99, 235, 0.25);
    }

    .btn-go-action:active {
      transform: scale(0.97);
    }

    .btn-go-action:focus-visible {
      box-shadow: 0 0 0 4px var(--ds-accent-glow, rgba(59, 130, 246, 0.4));
    }

    .go-pulse-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid var(--tool-accent, #3B82F6);
      opacity: 0.5;
      animation: go-pulse 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
      pointer-events: none;
    }

    :host-context([data-theme="light"]) .go-pulse-ring {
      border-color: #2563EB;
    }

    @keyframes go-pulse {
      0% {
        transform: scale(0.96);
        opacity: 0.6;
      }
      60% {
        transform: scale(1.14);
        opacity: 0.15;
      }
      100% {
        transform: scale(1.22);
        opacity: 0;
      }
    }

    .go-text {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--text, #F4F4F5);
      transition: color 0.2s ease;
    }

    :host-context([data-theme="light"]) .go-text {
      color: #0F172A;
    }

    .btn-go-action:hover .go-text {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-go-action:hover .go-text {
      color: #2563EB;
    }

    @media (prefers-reduced-motion: reduce) {
      .go-pulse-ring {
        animation: none;
        display: none;
      }
      .btn-go-action {
        transition: none;
      }
    }

    .gauge-wrapper {
      position: relative;
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 18px;
    }

    .speedometer-svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .gauge-bg-arc {
      fill: none;
      stroke: var(--ds-meter-bg, #27272A);
      stroke-width: 10;
      stroke-linecap: round;
    }

    :host-context([data-theme="light"]) .gauge-bg-arc {
      stroke: #E2E8F0;
    }

    .gauge-active-arc {
      fill: none;
      stroke: var(--tool-accent, #3B82F6);
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dasharray 0.2s ease-out;
    }

    :host-context([data-theme="light"]) .gauge-active-arc {
      stroke: #2563EB;
    }

    .tick-label {
      font-size: 8px;
      fill: var(--text-muted, #71717A);
      font-weight: 600;
      text-anchor: middle;
      user-select: none;
    }

    :host-context([data-theme="light"]) .tick-label {
      fill: #94A3B8;
    }

    .needle-group {
      transform-origin: 0 0;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .needle-blade {
      fill: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .needle-blade {
      fill: #2563EB;
    }

    .needle-hub {
      fill: var(--text, #F4F4F5);
      stroke: var(--surface, #18181B);
      stroke-width: 2;
    }

    :host-context([data-theme="light"]) .needle-hub {
      fill: #0F172A;
      stroke: #FFFFFF;
    }

    .gauge-center-readout {
      user-select: none;
      pointer-events: none;
    }

    .live-speed-num {
      font-size: 28px;
      font-weight: 800;
      fill: var(--text, #F4F4F5);
      letter-spacing: -0.03em;
      text-anchor: middle;
      font-variant-numeric: tabular-nums;
    }

    :host-context([data-theme="light"]) .live-speed-num {
      fill: #0F172A;
    }

    .live-speed-unit {
      font-size: 10px;
      font-weight: 700;
      fill: var(--tool-accent, #3B82F6);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-anchor: middle;
    }

    :host-context([data-theme="light"]) .live-speed-unit {
      fill: #2563EB;
    }

    .live-phase-text {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin-top: 8px;
      text-align: center;
      line-height: 1.4;
      max-width: 340px;
    }

    :host-context([data-theme="light"]) .live-phase-text {
      color: #64748B;
    }

    .test-progress-bar {
      width: 100%;
      max-width: 380px;
      height: 6px;
      border-radius: 9999px;
      background: var(--surface-secondary, #27272A);
      overflow: hidden;
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .test-progress-bar {
      background: #E2E8F0;
    }

    .progress-fill {
      height: 100%;
      background: var(--tool-accent, #3B82F6);
      transition: width 0.15s ease-out;
    }

    :host-context([data-theme="light"]) .progress-fill {
      background: #2563EB;
    }

    .keyboard-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted, #71717A);
      margin-bottom: 24px;
    }

    .kbd-badge {
      font-family: monospace;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      font-weight: 600;
      font-size: 10px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .kbd-badge {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #334155;
    }

    /* Scorecard Grid */
    .scorecard-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      width: 100%;
    }

    @media (max-width: 640px) {
      .scorecard-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .score-box {
      padding: 14px 12px;
      border-radius: 12px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    :host-context([data-theme="light"]) .score-box {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .score-box.highlight {
      border-color: var(--tool-accent, #3B82F6);
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
    }

    .score-icon-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .score-icon-title {
      color: #64748B;
    }

    .score-label {
      font-size: 11.5px;
      font-weight: 600;
    }

    .score-val-wrap {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-top: 2px;
    }

    .score-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      font-variant-numeric: tabular-nums;
    }

    :host-context([data-theme="light"]) .score-val {
      color: #0F172A;
    }

    .unit {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      font-weight: 500;
    }

    .score-subtext {
      font-size: 10.5px;
      color: var(--text-muted, #71717A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* History Card */
    .history-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 20px;
    }

    :host-context([data-theme="light"]) .history-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .history-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .history-title-wrap {
      color: #0F172A;
    }

    .history-title {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }

    .history-count {
      font-size: 12px;
      color: var(--text-muted, #71717A);
    }

    .btn-clear-history {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }

    .btn-clear-history:hover {
      color: #F87171;
      border-color: rgba(248, 113, 113, 0.4);
    }

    .history-table-wrap {
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }

    .history-table th {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #71717A);
      font-weight: 600;
      font-size: 11px;
    }

    :host-context([data-theme="light"]) .history-table th {
      border-bottom-color: #E2E8F0;
      color: #64748B;
    }

    .history-table td {
      padding: 10px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.04));
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .history-table td {
      border-bottom-color: #F1F5F9;
      color: #475569;
    }

    .cell-time {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }

    .cell-speed strong {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .cell-speed strong {
      color: #0F172A;
    }

    .history-rating-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-muted, #71717A);
    }

    .history-rating-pill[data-rating="gigabit"],
    .history-rating-pill[data-rating="ultra"] {
      background: var(--ds-accent-soft, rgba(37, 99, 235, 0.12));
      color: var(--tool-accent, #2563EB);
    }

    .history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
      color: var(--text-muted, #71717A);
      gap: 6px;
    }

    .empty-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      margin: 4px 0 0;
    }

    .empty-desc {
      font-size: 11.5px;
      margin: 0;
      max-width: 320px;
      line-height: 1.4;
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
      margin-bottom: 14px;
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

    .quality-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      padding: 16px 10px 20px;
      color: var(--text-muted, #71717A);
      font-size: 12.5px;
    }

    .quality-hero {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .quality-hero {
      border-bottom-color: #F1F5F9;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .rating-pill {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--tool-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
    }

    .stability-pill {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      background: rgba(148, 163, 184, 0.1);
      color: #94A3B8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .stability-pill[data-stability="excellent"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border-color: rgba(52, 211, 153, 0.3);
    }

    .quality-desc {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
      margin: 0;
    }

    :host-context([data-theme="light"]) .quality-desc {
      color: #64748B;
    }

    .suitability-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .suit-item {
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    .suit-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    :host-context([data-theme="light"]) .suit-item {
      border-bottom-color: #F1F5F9;
    }

    .suit-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3px;
    }

    .suit-title-left {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background: #71717A;
    }

    .status-dot[data-status="pass"] {
      background: #34D399;
    }

    .status-dot[data-status="check"] {
      background: #FBBF24;
    }

    .status-dot[data-status="fail"] {
      background: #F87171;
    }

    .suit-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .suit-name {
      color: #0F172A;
    }

    .suit-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-muted, #71717A);
    }

    .suit-badge[data-status="pass"] {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .suit-badge[data-status="check"] {
      background: rgba(251, 191, 36, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .suit-badge[data-status="fail"] {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
      border: 1px solid rgba(248, 113, 113, 0.3);
    }

    .suit-desc {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .suit-desc {
      color: #64748B;
    }

    /* Telemetry card */
    .telemetry-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
      margin-bottom: 16px;
    }

    .telem-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }

    .telem-label {
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .telem-label {
      color: #64748B;
    }

    .telem-val {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .telem-val {
      color: #0F172A;
    }

    .telem-val.note {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      font-style: italic;
    }

    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #71717A);
      font-size: 11px;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .privacy-note {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* Outcome List */
    .outcome-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .outcome-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .outcome-row {
      background: #F8FAFC;
      border-color: #F1F5F9;
    }

    .outcome-k {
      font-size: 13px;
      color: var(--text-2, #A1A1AA);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .outcome-k {
      color: #64748B;
    }

    .outcome-v {
      font-size: 13.5px;
      color: var(--text, #F4F4F5);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .outcome-v {
      color: #0F172A;
    }

    .outcome-v.working {
      color: #34D399;
    }

    .outcome-v.highlight {
      color: var(--tool-accent, #3B82F6);
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
export class SpeedTestModuleComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public speed = inject(SpeedTestService);
  private state = inject(DeviceStudioStateService);

  public readonly metrics = this.speed.metrics;

  public readonly isRunning = computed(() => {
    const s = this.metrics().status;
    return s === 'ping' || s === 'download' || s === 'upload';
  });

  public readonly currentSpeedDisplay = computed(() => {
    const m = this.metrics();
    if (m.status === 'ping') {
      return m.pingMs !== null ? m.pingMs : 0;
    }
    if (m.status === 'upload' && m.uploadMbps !== null) {
      return m.uploadMbps;
    }
    if (m.currentInstantSpeedMbps > 0) {
      return m.currentInstantSpeedMbps;
    }
    if (m.downloadMbps !== null) {
      return m.downloadMbps;
    }
    return 0;
  });

  private computeNormalizedSpeed(speed: number): number {
    if (speed <= 0) return 0;
    if (speed <= 100) {
      // 0 to 100 Mbps maps smoothly across the first 50% of the gauge arc (0.0 to 0.5)
      return 0.5 * Math.sqrt(speed / 100);
    }
    // 100 to 500+ Mbps maps across the remaining 50% of the gauge arc (0.5 to 1.0)
    const capped = Math.min(500, speed);
    return 0.5 + 0.5 * (Math.log10(capped / 100) / Math.log10(5));
  }

  public readonly gaugeArcDash = computed(() => {
    const totalLen = 335.8; // R = 74, sweep = 260 deg: 74 * 260 * pi / 180
    const speed = this.currentSpeedDisplay();
    const normalized = this.computeNormalizedSpeed(speed);
    const activeLen = Math.round(normalized * totalLen);
    return `${activeLen}, ${totalLen}`;
  });

  public readonly needleAngle = computed(() => {
    const speed = this.currentSpeedDisplay();
    // Angle from -130deg (0 Mbps) to +130deg (500+ Mbps)
    const normalized = this.computeNormalizedSpeed(speed);
    return Math.round(-130 + normalized * 260);
  });

  public readonly needleSvgTransform = computed(() => {
    return `rotate(${this.needleAngle()})`;
  });

  public readonly needleTransform = computed(() => {
    return `rotate(${this.needleAngle()}deg)`;
  });

  public readonly headerBadgeText = computed(() => {
    const m = this.metrics();
    if (m.status === 'completed') {
      return `Test Complete • ${m.qualityRating.toUpperCase()}`;
    }
    if (this.isRunning()) {
      return `Testing (${m.status})...`;
    }
    return 'Ready';
  });

  public readonly jitterStabilityLabel = computed(() => {
    const j = this.metrics().jitterMs;
    if (j === null) return 'Latency variance';
    if (j <= 5) return 'Ultra-stable connection';
    if (j <= 15) return 'Low variation';
    if (j <= 30) return 'Moderate variation';
    return 'High variance / jitter';
  });

  @HostListener('window:keydown.space', ['$event'])
  public handleSpaceKey(event: Event): void {
    const target = event.target as HTMLElement | null;
    const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (!isEditing) {
      event.preventDefault();
      if (this.isRunning()) {
        this.speed.cancelTest();
      } else {
        this.startTest();
      }
    }
  }

  public ngOnInit(): void {
    this.state.setActiveTab('speed');
  }

  public ngOnDestroy(): void {
    this.speed.cancelTest();
  }

  public async startTest(): Promise<void> {
    try {
      await this.speed.runFullTest();
      this.state.markModuleTested('speed');
      this.state.showToast('Speed test complete!');
    } catch {}
  }

  public goBackToStudio(): void {
    this.speed.cancelTest();
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }
}
