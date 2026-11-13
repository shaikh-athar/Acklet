// apps/tool-device-studio/src/components/landing/device-studio-landing.component.ts
import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DiagnosticReportService } from '../../services/diagnostic-report.service';
import { SystemInfoService, SystemCapabilities } from '../../services/system-info.service';
import { DeviceStudioTab } from '../../models/device.models';
import { TsIconComponent } from '@acklet/tool-shell';
import { HealthScoreBadgeComponent } from '../shared/health-score-badge.component';
import { MeetingReadinessComponent } from '../readiness/meeting-readiness.component';

interface DiagnosticModuleCard {
  id: DeviceStudioTab;
  route: string;
  title: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-device-studio-landing',
  standalone: true,
  imports: [
    CommonModule, 
    TsIconComponent, 
    HealthScoreBadgeComponent, 
    MeetingReadinessComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-page-container">
      
      <!-- Studio Header with Telemetry & Health Score -->
      <header class="landing-header">
        <div class="header-content">
          <h1 class="landing-title">Device Studio</h1>
          <p class="landing-description">
            Test and calibrate your camera, microphone, speakers, internet speed, IP address, and screen sharing.
          </p>
        </div>

        <div class="header-aside">
          <app-health-score-badge [score]="state.deviceHealthScore()" />
          
          <div class="report-actions">
            <button 
              type="button" 
              class="report-btn history-accent" 
              (click)="navigateToHistory()"
              title="View diagnostic history and reports"
            >
              <ts-icon name="history" [size]="14" />
              <span>History</span>
            </button>
            <button 
              type="button" 
              class="report-btn" 
              (click)="reportService.printReport()"
              title="Print or save PDF diagnostic report"
            >
              <ts-icon name="printer" [size]="14" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Meeting Readiness 1-Click Banner Card -->
      <app-meeting-readiness />

      <!-- Six Core Diagnostic Module Cards -->
      <section class="modules-section" aria-labelledby="tools-heading">
        <div class="section-header">
          <h2 id="tools-heading" class="section-title">Diagnostic Tools</h2>
        </div>

        <div class="modules-grid" role="list" aria-label="Device Studio Diagnostic Tools">
          @for (card of modules; track card.id) {
            <article 
              class="module-card"
              (click)="navigateToModule(card.id, card.route)"
              role="listitem"
              tabindex="0"
              (keydown.enter)="navigateToModule(card.id, card.route)"
              (keydown.space)="navigateToModule(card.id, card.route)"
            >
              <div class="card-top-row">
                <div class="card-icon-box">
                  <ts-icon [name]="card.icon" [size]="20" />
                </div>
                @if (isCardTested(card.id)) {
                  <span class="card-status-indicator tested">Tested</span>
                }
              </div>

              <div class="card-content">
                <h3 class="card-title">{{ card.title }}</h3>
                <p class="card-desc">{{ card.description }}</p>
              </div>

              <div class="card-action">
                <span class="action-text">Open {{ card.title }}</span>
                <ts-icon name="arrow-right" [size]="14" class="action-icon" />
              </div>
            </article>
          }
        </div>
      </section>

      <!-- System Telemetry & Capabilities Footer Bar (Clean Single-Line Info) -->
      <footer class="system-info-bar" aria-label="System Capabilities">
        <span class="info-group">
          <span class="info-label">Browser:</span>
          <span class="info-val">{{ sysInfo.browserName }}</span>
        </span>
        <span class="info-divider" aria-hidden="true">•</span>
        <span class="info-group">
          <span class="info-label">Operating System:</span>
          <span class="info-val">{{ sysInfo.osName }}</span>
        </span>
        <span class="info-divider" aria-hidden="true">•</span>
        <span class="info-group">
          <span class="info-label">Display Screen:</span>
          <span class="info-val">{{ sysInfo.screenResolution }}</span>
        </span>
      </footer>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .landing-page-container {
      width: 100%;
      box-sizing: border-box;
      padding-top: 4px;
    }

    /* Studio Header */
    .landing-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .header-content {
      flex: 1;
      min-width: 300px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .studio-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--tool-accent, #3B82F6);
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .privacy-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 4px 10px;
      border-radius: 9999px;
    }

    :host-context([data-theme="light"]) .privacy-badge {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #64748B;
    }

    .landing-title {
      font-size: 30px;
      font-weight: 800;
      color: var(--text, #F4F4F5);
      letter-spacing: -0.025em;
      margin: 0 0 8px;
      line-height: 1.2;
    }

    :host-context([data-theme="light"]) .landing-title {
      color: #0F172A;
    }

    .landing-description {
      font-size: 15px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.5;
      max-width: 720px;
    }

    :host-context([data-theme="light"]) .landing-description {
      color: #64748B;
    }

    .header-aside {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }

    .report-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .report-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.16s ease, color 0.16s ease;
    }

    .report-btn.history-accent {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .report-btn.history-accent {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.25);
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .report-btn {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .report-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .report-btn-secondary {
      padding: 7px 10px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text-muted, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.16s ease, color 0.16s ease;
    }

    .report-btn-secondary:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    /* Modules Section */
    .modules-section {
      margin-bottom: 36px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .section-title {
      color: #0F172A;
    }

    .section-counter {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .modules-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .modules-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .header-aside {
        align-items: flex-start;
      }
    }

    /* Module Card */
    .module-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 24px;
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      cursor: pointer;
      transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
      box-sizing: border-box;
      outline: none;
      position: relative;
    }

    :host-context([data-theme="light"]) .module-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .module-card:hover,
    .module-card:focus-visible {
      border-color: var(--tool-accent, #3B82F6);
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .module-card:hover,
    :host-context([data-theme="light"]) .module-card:focus-visible {
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 18px;
    }

    .card-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.16s ease, transform 0.16s ease;
    }

    :host-context([data-theme="light"]) .card-icon-box {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #2563EB;
    }

    .module-card:hover .card-icon-box {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.14));
      transform: scale(1.05);
    }

    .card-status-indicator {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 9999px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-3, #71717A);
    }

    .card-status-indicator.tested {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .card-content {
      flex: 1;
      width: 100%;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .card-title {
      color: #0F172A;
    }

    .card-tagline {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--tool-accent, #3B82F6);
      margin: 0 0 8px;
    }

    :host-context([data-theme="light"]) .card-tagline {
      color: #2563EB;
    }

    .card-desc {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0 0 16px;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .card-desc {
      color: #64748B;
    }

    .card-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .spec-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-muted, #A1A1AA);
    }

    :host-context([data-theme="light"]) .spec-pill {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #64748B;
    }

    /* Card Action Link */
    .card-action {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--tool-accent, #3B82F6);
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      width: 100%;
    }

    :host-context([data-theme="light"]) .card-action {
      color: #2563EB;
      border-top-color: #F1F5F9;
    }

    .action-icon {
      transition: transform 0.16s ease;
    }

    .module-card:hover .action-icon {
      transform: translateX(4px);
    }

    /* System Capabilities Single-Line Info Bar */
    .system-info-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 14px 20px;
      margin-top: 10px;
      font-size: 12.5px;
      color: var(--text-muted, #71717A);
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .system-info-bar {
      color: #64748B;
    }

    .info-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .info-label {
      color: var(--text-3, #71717A);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .info-label {
      color: #94A3B8;
    }

    .info-val {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .info-val {
      color: #334155;
    }

    .info-divider {
      color: var(--border, rgba(255, 255, 255, 0.15));
      user-select: none;
    }

    :host-context([data-theme="light"]) .info-divider {
      color: #CBD5E1;
    }

    .api-pills {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .api-chip {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-3, #71717A);
    }

    .api-chip.active {
      background: rgba(52, 211, 153, 0.12);
      color: #34D399;
    }
  `]
})
export class DeviceStudioLandingComponent implements OnInit {
  private router = inject(Router);
  public state = inject(DeviceStudioStateService);
  public reportService = inject(DiagnosticReportService);
  private systemInfo = inject(SystemInfoService);

  public sysInfo: SystemCapabilities = {
    browserName: 'Browser',
    browserVersion: '',
    osName: 'OS',
    screenResolution: '0x0',
    devicePixelRatio: 1,
    isOnline: true,
    supportsMediaDevices: true,
    supportsWebAudio: true,
    supportsDisplayMedia: true,
    supportsWebRTC: true,
    supportsPermissions: true
  };

  public readonly modules: DiagnosticModuleCard[] = [
    {
      id: 'webcam',
      route: 'webcam',
      title: 'Webcam Test',
      icon: 'camera',
      description: 'Check your camera video, resolution, and lighting.'
    },
    {
      id: 'microphone',
      route: 'microphone',
      title: 'Microphone Test',
      icon: 'mic',
      description: 'Test your microphone input level and sound clarity.'
    },
    {
      id: 'speaker',
      route: 'speaker',
      title: 'Speaker & Headphone Test',
      icon: 'headphones',
      description: 'Test left and right stereo sound and volume.'
    },
    {
      id: 'speed',
      route: 'speed',
      title: 'Internet Speed Test',
      icon: 'speed',
      description: 'Measure your download speed, upload speed, and ping.'
    },
    {
      id: 'ip',
      route: 'ip',
      title: 'Public IP Checker',
      icon: 'globe',
      description: 'Find your public IP address, provider, and location.'
    },
    {
      id: 'screen',
      route: 'screen',
      title: 'Screen Sharing Test',
      icon: 'screen',
      description: 'Test sharing your screen, window, or browser tab.'
    }
  ];

  public ngOnInit(): void {
    this.sysInfo = this.systemInfo.getCapabilities();
  }

  public isCardTested(id: DeviceStudioTab): boolean {
    switch (id) {
      case 'webcam': return this.state.webcamTested();
      case 'microphone': return this.state.micTested();
      case 'speaker': return this.state.speakerTested();
      case 'speed': return this.state.speedTested();
      case 'ip': return this.state.ipTested();
      case 'screen': return this.state.screenTested();
      default: return false;
    }
  }

  public navigateToHistory(): void {
    this.state.setActiveModule('history');
    let target = '/devicestudio/history';
    if (this.router.url.includes('/tools/devicestudio') || this.router.url.includes('/tools/device-studio')) {
      target = '/tools/devicestudio/history';
    }
    this.router.navigateByUrl(target).catch(() => {
      this.router.navigate(['/devicestudio/history']);
    });
  }

  public navigateToModule(id: DeviceStudioTab, route: string): void {
    this.state.setActiveModule(id);
    let target = `/devicestudio/${route}`;
    if (this.router.url.includes('/tools/devicestudio') || this.router.url.includes('/tools/device-studio')) {
      target = `/tools/devicestudio/${route}`;
    }
    this.router.navigateByUrl(target).catch(() => {
      this.router.navigate([route]);
    });
  }
}

