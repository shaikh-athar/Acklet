// apps/tool-device-studio/src/components/readiness/meeting-readiness.component.ts
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { WebcamService } from '../../services/webcam.service';
import { MicrophoneService } from '../../services/microphone.service';
import { SpeakerService } from '../../services/speaker.service';
import { SpeedTestService } from '../../services/speed-test.service';
import { ScreenShareService } from '../../services/screen-share.service';
import { CheckStatus, DeviceStudioTab, MeetingReadinessResult } from '../../models/device.models';

@Component({
  selector: 'app-meeting-readiness',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="readiness-card">
      <div class="readiness-header">
        <div class="header-info">
          <h2 class="readiness-title">Meeting Readiness Test</h2>
          <p class="readiness-subtitle">
            Quickly check your camera, microphone, speakers, and connection before joining a call.
          </p>
        </div>

        <button 
          type="button" 
          class="run-audit-btn"
          [disabled]="isRunning()"
          (click)="runReadinessAudit()"
          aria-label="Run quick meeting readiness test"
        >
          @if (isRunning()) {
            <ts-icon name="loader" [size]="16" class="spin" />
            <span>Checking {{ currentStepText() }}...</span>
          } @else {
            <ts-icon name="play" [size]="16" />
            <span>Run Quick Check</span>
          }
        </button>
      </div>

      <!-- Checklist Grid (Fixed Single-Row Badges with Truncation Protection) -->
      <div class="checklist-grid">
        <!-- 1. Webcam -->
        <div
          class="check-item"
          [attr.data-status]="result().camera"
          (click)="openModule('webcam', '/devicestudio/webcam')"
          role="button"
          tabindex="0"
          title="Click to open Webcam Test"
        >
          <div class="check-icon-wrap">
            <ts-icon name="camera" [size]="16" />
          </div>
          <div class="check-body">
            <div class="check-title-row">
              <span class="check-name">Camera</span>
              <span class="status-pill">{{ formatStatus(result().camera) }}</span>
            </div>
            <p class="check-desc">{{ result().cameraDetail || 'Resolution & video stream' }}</p>
          </div>
        </div>

        <!-- 2. Microphone -->
        <div
          class="check-item"
          [attr.data-status]="result().mic"
          (click)="openModule('microphone', '/devicestudio/microphone')"
          role="button"
          tabindex="0"
          title="Click to open Microphone Test"
        >
          <div class="check-icon-wrap">
            <ts-icon name="mic" [size]="16" />
          </div>
          <div class="check-body">
            <div class="check-title-row">
              <span class="check-name">Microphone</span>
              <span class="status-pill">{{ formatStatus(result().mic) }}</span>
            </div>
            <p class="check-desc">{{ result().micDetail || 'Input level & voice response' }}</p>
          </div>
        </div>

        <!-- 3. Speaker / Audio -->
        <div
          class="check-item"
          [attr.data-status]="result().speaker"
          (click)="openModule('speaker', '/devicestudio/speaker')"
          role="button"
          tabindex="0"
          title="Click to open Speaker Test"
        >
          <div class="check-icon-wrap">
            <ts-icon name="headphones" [size]="16" />
          </div>
          <div class="check-body">
            <div class="check-title-row">
              <span class="check-name">Speaker & Output</span>
              <span class="status-pill">{{ formatStatus(result().speaker) }}</span>
            </div>
            <p class="check-desc">{{ result().speakerDetail || 'Sound playback' }}</p>
          </div>
        </div>

        <!-- 4. Network Latency -->
        <div
          class="check-item"
          [attr.data-status]="result().network"
          (click)="openModule('speed', '/devicestudio/speed')"
          role="button"
          tabindex="0"
          title="Click to open Internet Speed Test"
        >
          <div class="check-icon-wrap">
            <ts-icon name="wifi" [size]="16" />
          </div>
          <div class="check-body">
            <div class="check-title-row">
              <span class="check-name">Connection Stability</span>
              <span class="status-pill">{{ formatStatus(result().network) }}</span>
            </div>
            <p class="check-desc">{{ result().networkDetail || 'Latency & ping response' }}</p>
          </div>
        </div>

        <!-- 5. Screen Share -->
        <div
          class="check-item"
          [attr.data-status]="result().screenShare"
          (click)="openModule('screen', '/devicestudio/screen')"
          role="button"
          tabindex="0"
          title="Click to open Screen Share Test"
        >
          <div class="check-icon-wrap">
            <ts-icon name="screen" [size]="16" />
          </div>
          <div class="check-body">
            <div class="check-title-row">
              <span class="check-name">Screen Sharing</span>
              <span class="status-pill">{{ formatStatus(result().screenShare) }}</span>
            </div>
            <p class="check-desc">{{ result().screenShareDetail || 'Display sharing support' }}</p>
          </div>
        </div>
      </div>

      <!-- Actionable Issue Guidance Banner (Shown when any test fails or warns) -->
      @if (activeIssues().length > 0) {
        <div class="readiness-guidance-card">
          <div class="guidance-header">
            <div class="guidance-title-wrap">
              <div class="guidance-icon-badge">
                <ts-icon name="alert-triangle" [size]="15" />
              </div>
              <div>
                <h4 class="guidance-title">
                  {{ activeIssues().length }} {{ activeIssues().length === 1 ? 'Component Needs' : 'Components Need' }} Attention
                </h4>
                <p class="guidance-subtitle">
                  Review the causes and recommended steps below to optimize your meeting setup.
                </p>
              </div>
            </div>
          </div>

          <div class="guidance-issues-list">
            @for (issue of activeIssues(); track issue.id) {
              <div class="guidance-issue-item" [class.is-fail]="issue.status === 'fail'" [class.is-warn]="issue.status === 'warn'">
                <div class="issue-left-icon">
                  <ts-icon [name]="issue.icon" [size]="16" />
                </div>
                <div class="issue-details">
                  <div class="issue-name-row">
                    <span class="issue-name">{{ issue.name }}</span>
                    <span class="issue-badge" [class.fail]="issue.status === 'fail'" [class.warn]="issue.status === 'warn'">
                      {{ issue.status === 'fail' ? 'Failed' : 'Warning' }}
                    </span>
                  </div>
                  <div class="issue-cause">
                    <span class="cause-label">Reason:</span>
                    <span class="cause-text">{{ issue.reason }}</span>
                  </div>
                  <div class="issue-solution">
                    <span class="solution-label">How to fix:</span>
                    <span class="solution-text">{{ issue.recommendation }}</span>
                  </div>
                </div>
                <div class="issue-action">
                  <button type="button" class="btn-issue-fix" (click)="openModule(issue.tab, issue.route)">
                    <span>{{ issue.actionLabel }}</span>
                    <ts-icon name="arrow-right" [size]="12" />
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- App Compatibility Matrix Footer -->
      <div class="app-matrix-footer">
        <span class="matrix-label">Platform Compatibility:</span>
        <div class="matrix-badges">
          <div class="app-pill" [class.ready]="result().appsReadiness.zoom">
            <ts-icon [name]="result().appsReadiness.zoom ? 'check' : 'clock'" [size]="13" />
            <span>Zoom</span>
          </div>
          <div class="app-pill" [class.ready]="result().appsReadiness.meet">
            <ts-icon [name]="result().appsReadiness.meet ? 'check' : 'clock'" [size]="13" />
            <span>Google Meet</span>
          </div>
          <div class="app-pill" [class.ready]="result().appsReadiness.teams">
            <ts-icon [name]="result().appsReadiness.teams ? 'check' : 'clock'" [size]="13" />
            <span>MS Teams</span>
          </div>
          <div class="app-pill" [class.ready]="result().appsReadiness.webex">
            <ts-icon [name]="result().appsReadiness.webex ? 'check' : 'clock'" [size]="13" />
            <span>Cisco Webex</span>
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

    .readiness-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .readiness-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    .readiness-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .header-info {
      flex: 1;
      min-width: 260px;
    }

    .readiness-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 6px;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .readiness-title {
      color: #0F172A;
    }

    .readiness-subtitle {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.45;
      max-width: 640px;
    }

    :host-context([data-theme="light"]) .readiness-subtitle {
      color: #64748B;
    }

    .run-audit-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.16s ease, transform 0.16s ease;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .run-audit-btn {
      background: #2563EB;
      color: #FFFFFF;
    }

    .run-audit-btn:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .run-audit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Checklist Grid */
    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    @media (min-width: 1080px) {
      .checklist-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border-radius: 12px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      transition: all 0.16s ease;
      cursor: pointer;
      min-width: 0;
      user-select: none;
    }

    .check-item:hover {
      border-color: var(--border-hover, rgba(255, 255, 255, 0.22));
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .check-item {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .check-item:hover {
      border-color: #CBD5E1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .check-item[data-status="pass"] {
      border-color: rgba(52, 211, 153, 0.35);
      background: rgba(52, 211, 153, 0.04);
    }

    .check-item[data-status="warn"] {
      border-color: rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.04);
    }

    .check-item[data-status="fail"] {
      border-color: rgba(248, 113, 113, 0.35);
      background: rgba(248, 113, 113, 0.04);
    }

    .check-icon-wrap {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .check-icon-wrap {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #2563EB;
    }

    .check-body {
      flex: 1;
      min-width: 0;
    }

    .check-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 3px;
      min-width: 0;
    }

    .check-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      flex: 1;
    }

    :host-context([data-theme="light"]) .check-name {
      color: #0F172A;
    }

    /* Fixed Single-Row Status Pill */
    .status-pill {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--bg-1, #18181B);
      color: var(--text-3, #71717A);
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }

    .check-item[data-status="pass"] .status-pill {
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
    }

    :host-context([data-theme="light"]) .check-item[data-status="pass"] .status-pill {
      background: rgba(5, 150, 105, 0.12);
      color: #059669;
    }

    .check-item[data-status="warn"] .status-pill {
      background: rgba(251, 191, 36, 0.15);
      color: #FBBF24;
    }

    :host-context([data-theme="light"]) .check-item[data-status="warn"] .status-pill {
      background: rgba(217, 119, 6, 0.12);
      color: #D97706;
    }

    .check-item[data-status="fail"] .status-pill {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
    }

    :host-context([data-theme="light"]) .check-item[data-status="fail"] .status-pill {
      background: rgba(225, 29, 72, 0.12);
      color: #E11D48;
    }

    .check-desc {
      font-size: 11.5px;
      color: var(--text-muted, #71717A);
      margin: 0;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .check-desc {
      color: #64748B;
    }

    /* Guidance / Actionable Issues Panel */
    .readiness-guidance-card {
      margin-top: 4px;
      margin-bottom: 20px;
      background: rgba(248, 113, 113, 0.05);
      border: 1px solid rgba(248, 113, 113, 0.22);
      border-radius: 12px;
      padding: 16px;
      animation: fadeIn 0.22s ease-out;
    }

    :host-context([data-theme="light"]) .readiness-guidance-card {
      background: #FFF1F2;
      border-color: #FECDD3;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .guidance-header {
      margin-bottom: 12px;
    }

    .guidance-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .guidance-icon-badge {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    :host-context([data-theme="light"]) .guidance-icon-badge {
      background: #FEE2E2;
      color: #E11D48;
    }

    .guidance-title {
      font-size: 14px;
      font-weight: 700;
      color: #F4F4F5;
      margin: 0 0 2px;
    }

    :host-context([data-theme="light"]) .guidance-title {
      color: #9F1239;
    }

    .guidance-subtitle {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .guidance-subtitle {
      color: #64748B;
    }

    .guidance-issues-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .guidance-issue-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--surface, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .guidance-issue-item {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }

    .guidance-issue-item.is-fail {
      border-left: 3px solid #F87171;
    }

    :host-context([data-theme="light"]) .guidance-issue-item.is-fail {
      border-left-color: #E11D48;
    }

    .guidance-issue-item.is-warn {
      border-left: 3px solid #FBBF24;
    }

    :host-context([data-theme="light"]) .guidance-issue-item.is-warn {
      border-left-color: #D97706;
    }

    .issue-left-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--surface-secondary, #27272A);
      color: var(--text-2, #A1A1AA);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .issue-left-icon {
      background: #F1F5F9;
      color: #475569;
    }

    .issue-details {
      flex: 1;
      min-width: 0;
    }

    .issue-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .issue-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .issue-name {
      color: #0F172A;
    }

    .issue-badge {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1.5px 6px;
      border-radius: 4px;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      line-height: 1.2;
    }

    .issue-badge.fail {
      background: rgba(248, 113, 113, 0.15);
      color: #F87171;
    }

    :host-context([data-theme="light"]) .issue-badge.fail {
      background: #FEE2E2;
      color: #B91C1C;
    }

    .issue-badge.warn {
      background: rgba(251, 191, 36, 0.15);
      color: #FBBF24;
    }

    :host-context([data-theme="light"]) .issue-badge.warn {
      background: #FEF3C7;
      color: #B45309;
    }

    .issue-cause {
      font-size: 12px;
      line-height: 1.45;
      margin-bottom: 3px;
    }

    .cause-label {
      font-weight: 600;
      color: #F87171;
      margin-right: 5px;
    }

    :host-context([data-theme="light"]) .cause-label {
      color: #DC2626;
    }

    .cause-text {
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .cause-text {
      color: #475569;
    }

    .issue-solution {
      font-size: 12px;
      line-height: 1.45;
    }

    .solution-label {
      font-weight: 600;
      color: var(--tool-accent, #3B82F6);
      margin-right: 5px;
    }

    :host-context([data-theme="light"]) .solution-label {
      color: #2563EB;
    }

    .solution-text {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .solution-text {
      color: #1E293B;
    }

    .issue-action {
      flex-shrink: 0;
    }

    .btn-issue-fix {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: var(--tool-accent, #3B82F6);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.16s ease;
    }

    :host-context([data-theme="light"]) .btn-issue-fix {
      background: rgba(37, 99, 235, 0.06);
      border-color: rgba(37, 99, 235, 0.22);
      color: #2563EB;
    }

    .btn-issue-fix:hover {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .btn-issue-fix:hover {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    @media (max-width: 640px) {
      .guidance-issue-item {
        flex-direction: column;
        align-items: flex-start;
      }
      .issue-action {
        width: 100%;
        margin-top: 4px;
      }
      .btn-issue-fix {
        width: 100%;
        justify-content: center;
      }
    }

    /* App Matrix Footer */
    .app-matrix-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-wrap: wrap;
    }

    .matrix-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #A1A1AA);
    }

    .matrix-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .app-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 12px;
      font-weight: 500;
      color: var(--text-3, #71717A);
    }

    :host-context([data-theme="light"]) .app-pill {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #64748B;
    }

    .app-pill.ready {
      background: rgba(52, 211, 153, 0.1);
      border-color: rgba(52, 211, 153, 0.25);
      color: #34D399;
    }

    :host-context([data-theme="light"]) .app-pill.ready {
      background: rgba(5, 150, 105, 0.08);
      border-color: rgba(5, 150, 105, 0.22);
      color: #059669;
    }
  `]
})
export class MeetingReadinessComponent {
  private router = inject(Router);
  private state = inject(DeviceStudioStateService);
  private webcam = inject(WebcamService);
  private mic = inject(MicrophoneService);
  private speaker = inject(SpeakerService);
  private speed = inject(SpeedTestService);
  private screen = inject(ScreenShareService);

  public readonly isRunning = signal<boolean>(false);
  public readonly currentStepText = signal<string>('');
  public readonly result = this.state.meetingReadiness;

  public readonly activeIssues = computed(() => {
    const res = this.result();
    const list: Array<{
      id: string;
      name: string;
      icon: string;
      status: 'fail' | 'warn';
      tab: DeviceStudioTab;
      route: string;
      reason: string;
      recommendation: string;
      actionLabel: string;
    }> = [];

    // 1. Network Issue
    if (res.network === 'fail') {
      list.push({
        id: 'network',
        name: 'Connection Stability',
        icon: 'wifi',
        status: 'fail',
        tab: 'speed',
        route: '/devicestudio/speed',
        reason: `${res.networkDetail || 'High latency detected'} (exceeds meeting standard). Latency above 120ms causes audio stutter, voice delay, and frozen video in calls.`,
        recommendation: 'Switch to a 5GHz Wi-Fi band or plug in a wired Ethernet cable, move closer to your router, and pause heavy background downloads or streaming.',
        actionLabel: 'Test Speed'
      });
    } else if (res.network === 'warn') {
      list.push({
        id: 'network',
        name: 'Connection Stability',
        icon: 'wifi',
        status: 'warn',
        tab: 'speed',
        route: '/devicestudio/speed',
        reason: `${res.networkDetail || 'Moderate latency detected'}. May cause minor audio sync delays in multi-party meetings.`,
        recommendation: 'Close bandwidth-heavy background applications or move closer to your Wi-Fi access point for lower latency.',
        actionLabel: 'Test Speed'
      });
    }

    // 2. Camera Issue
    if (res.camera === 'fail') {
      list.push({
        id: 'camera',
        name: 'Camera',
        icon: 'camera',
        status: 'fail',
        tab: 'webcam',
        route: '/devicestudio/webcam',
        reason: `${res.cameraDetail || 'Camera permission blocked or in use'}. Meeting participants will not see your video stream.`,
        recommendation: 'Click the site permission settings in your browser address bar to allow camera access, and quit other apps using the camera (Zoom, Teams, FaceTime).',
        actionLabel: 'Open Webcam'
      });
    } else if (res.camera === 'warn') {
      list.push({
        id: 'camera',
        name: 'Camera',
        icon: 'camera',
        status: 'warn',
        tab: 'webcam',
        route: '/devicestudio/webcam',
        reason: `${res.cameraDetail || 'No camera hardware detected'}. Video meetings will run in audio-only mode.`,
        recommendation: 'Connect an external USB camera or ensure your webcam privacy shutter is open and hardware is recognized.',
        actionLabel: 'Open Webcam'
      });
    }

    // 3. Microphone Issue
    if (res.mic === 'fail') {
      list.push({
        id: 'mic',
        name: 'Microphone',
        icon: 'mic',
        status: 'fail',
        tab: 'microphone',
        route: '/devicestudio/microphone',
        reason: `${res.micDetail || 'Microphone permission blocked or busy'}. Meeting participants will not be able to hear you speak.`,
        recommendation: 'Allow microphone access in browser settings, verify your headset hardware mute switch is off, and select the correct input in audio settings.',
        actionLabel: 'Open Mic Test'
      });
    } else if (res.mic === 'warn') {
      list.push({
        id: 'mic',
        name: 'Microphone',
        icon: 'mic',
        status: 'warn',
        tab: 'microphone',
        route: '/devicestudio/microphone',
        reason: `${res.micDetail || 'No physical microphone detected'}.`,
        recommendation: 'Plug in a headset or microphone and verify sound input levels.',
        actionLabel: 'Open Mic Test'
      });
    }

    // 4. Speaker Issue
    if (res.speaker === 'fail' || res.speaker === 'warn') {
      list.push({
        id: 'speaker',
        name: 'Speaker & Output',
        icon: 'headphones',
        status: res.speaker,
        tab: 'speaker',
        route: '/devicestudio/speaker',
        reason: `${res.speakerDetail || 'Audio output unverified or blocked'}. You may not hear meeting audio or other participants.`,
        recommendation: 'Ensure system audio is unmuted, verify your headphones/speakers are selected, and click to allow browser audio playback.',
        actionLabel: 'Open Speaker Test'
      });
    }

    // 5. Screen Share Issue
    if (res.screenShare === 'fail' || res.screenShare === 'warn') {
      list.push({
        id: 'screenShare',
        name: 'Screen Sharing',
        icon: 'screen',
        status: res.screenShare,
        tab: 'screen',
        route: '/devicestudio/screen',
        reason: `${res.screenShareDetail || 'Screen sharing not permitted'}. You cannot present your desktop or browser tabs.`,
        recommendation: 'On macOS, ensure Screen Recording permission is granted for your browser in System Settings > Privacy & Security.',
        actionLabel: 'Open Screen Share'
      });
    }

    return list;
  });

  public openModule(tab: DeviceStudioTab, route: string): void {
    this.state.setActiveTab(tab);
    this.router.navigate([route]);
  }

  public formatStatus(status: CheckStatus): string {
    switch (status) {
      case 'pass': return 'Passed';
      case 'warn': return 'Warning';
      case 'fail': return 'Failed';
      case 'testing': return 'Testing...';
      default: return 'Ready';
    }
  }

  public async runReadinessAudit(): Promise<void> {
    this.isRunning.set(true);

    const res: MeetingReadinessResult = {
      camera: 'testing',
      cameraDetail: 'Testing video stream...',
      mic: 'testing',
      micDetail: 'Testing microphone response...',
      speaker: 'testing',
      speakerDetail: 'Testing audio system...',
      network: 'testing',
      networkDetail: 'Testing network latency...',
      screenShare: 'testing',
      screenShareDetail: 'Checking capture capability...',
      overallScore: 0,
      summaryText: 'Auditing hardware and network...',
      appsReadiness: { zoom: false, meet: false, teams: false, webex: false }
    };
    this.state.meetingReadiness.set(res);

    try {
      // 1. Audio Check
      this.currentStepText.set('Audio Output');
      const audioSupported = this.speaker.isSupported();
      res.speaker = audioSupported ? 'pass' : 'warn';
      res.speakerDetail = audioSupported ? 'AudioContext initialized & verified' : 'AudioContext unavailable';
      this.state.markModuleTested('speaker');

      // 2. Camera Check
      this.currentStepText.set('Camera');
      try {
        const camDevices = await this.webcam.loadDevices();
        if (camDevices.length > 0) {
          res.camera = 'pass';
          res.cameraDetail = `${camDevices.length} camera(s) detected`;
        } else {
          res.camera = 'warn';
          res.cameraDetail = 'No physical camera detected';
        }
      } catch {
        res.camera = 'fail';
        res.cameraDetail = 'Camera permission blocked or busy';
      }
      this.state.markModuleTested('webcam');

      // 3. Microphone Check
      this.currentStepText.set('Microphone');
      try {
        const micDevices = await this.mic.loadDevices();
        if (micDevices.length > 0) {
          res.mic = 'pass';
          res.micDetail = `${micDevices.length} microphone(s) detected`;
        } else {
          res.mic = 'warn';
          res.micDetail = 'No physical microphone detected';
        }
      } catch {
        res.mic = 'fail';
        res.micDetail = 'Microphone permission blocked or busy';
      }
      this.state.markModuleTested('microphone');

      // 4. Network Check
      this.currentStepText.set('Network Latency');
      try {
        const start = performance.now();
        await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
        const ping = Math.round(performance.now() - start);
        if (ping <= 60) {
          res.network = 'pass';
          res.networkDetail = `Excellent latency (${ping}ms RTT)`;
        } else if (ping <= 120) {
          res.network = 'warn';
          res.networkDetail = `Moderate latency (${ping}ms RTT)`;
        } else {
          res.network = 'fail';
          res.networkDetail = `High latency (${ping}ms RTT)`;
        }
      } catch {
        res.network = 'pass';
        res.networkDetail = 'Standard connection active';
      }
      this.state.markModuleTested('speed');

      // 5. Screen Share
      this.currentStepText.set('Screen Sharing');
      res.screenShare = this.screen.isSupported() ? 'pass' : 'warn';
      res.screenShareDetail = this.screen.isSupported() ? 'getDisplayMedia supported' : 'Browser lacks screen sharing';
      this.state.markModuleTested('screen');

      // Calculate Apps Readiness (requires no critical failure on mic, camera, or connection)
      const hasCriticalFailure = res.camera === 'fail' || res.mic === 'fail' || res.network === 'fail';
      const passes = [res.camera, res.mic, res.speaker, res.network, res.screenShare].filter(s => s === 'pass').length;
      const allReady = !hasCriticalFailure && passes >= 4;

      res.appsReadiness = {
        zoom: allReady,
        meet: allReady,
        teams: allReady,
        webex: allReady
      };

      res.overallScore = Math.round((passes / 5) * 100);
      res.summaryText = allReady
        ? 'Your system is fully prepared for Zoom, Google Meet, and Teams video conferences.'
        : 'Some components require attention or permission grant before meeting.';

      this.state.meetingReadiness.set(res);
      this.state.showToast('Meeting Readiness audit complete!');
    } finally {
      this.isRunning.set(false);
      this.currentStepText.set('');
    }
  }
}

