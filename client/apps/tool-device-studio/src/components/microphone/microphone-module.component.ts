// apps/tool-device-studio/src/components/microphone/microphone-module.component.ts
import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { MicrophoneService } from '../../services/microphone.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';
import { AckletDropdownComponent, DropdownOption } from '../shared/acklet-dropdown.component';

@Component({
  selector: 'app-microphone-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent, AckletDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mic-module-root">
      
      <!-- Top Module Header -->
      <app-device-module-header
        title="Microphone Test"
        icon="mic"
        description="Test your microphone input level and sound clarity."
        [badge]="metrics().isStreaming ? (metrics().isMuted ? 'Muted' : 'Working') : 'Offline'"
        [badgeType]="metrics().isStreaming && !metrics().isMuted ? 'active' : 'default'"
        (backClicked)="goBackToStudio()"
      >
        @if (metrics().isStreaming) {
          <button 
            type="button" 
            class="btn-mute" 
            [class.muted]="metrics().isMuted"
            (click)="toggleMute()"
            [title]="metrics().isMuted ? 'Unmute microphone' : 'Mute microphone'"
          >
            <ts-icon [name]="metrics().isMuted ? 'mic-off' : 'mic'" [size]="14" />
            <span>{{ metrics().isMuted ? 'Unmute' : 'Mute Mic' }}</span>
          </button>

          <button type="button" class="btn-stop-header" (click)="stopMic()" title="Stop microphone">
            <ts-icon name="power-off" [size]="14" />
            <span>Stop Mic</span>
          </button>
        } @else {
          <button type="button" class="btn-start-header" (click)="startMic()" title="Start microphone">
            <ts-icon name="mic" [size]="15" />
            <span>Start Microphone</span>
          </button>
        }
      </app-device-module-header>

      <!-- Main Workspace Grid -->
      <div class="workspace-grid">
        
        <!-- ========================================== -->
        <!-- LEFT COLUMN: Visualizer & Meters & Recording -->
        <!-- ========================================== -->
        <div class="main-column">
          
          <!-- Visualizer Card -->
          <div class="visualizer-card">
            
            <!-- Toolbar with Device Selector & Visualizer Mode Switch -->
            <div class="viewport-toolbar">
              <div class="device-select-wrap">
                <app-acklet-dropdown
                  [options]="micOptions()"
                  [value]="metrics().activeDeviceId"
                  (valueChange)="onMicDeviceChange($event)"
                  placeholder="Select microphone..."
                  icon="mic"
                  emptyText="No microphones detected"
                />
              </div>

              <!-- Mode Switch: Oscilloscope vs Frequency Spectrum -->
              <div class="vis-mode-switch" role="tablist" aria-label="Visualizer Mode">
                <button 
                  type="button" 
                  role="tab"
                  class="vis-mode-btn" 
                  [class.active]="visMode() === 'wave'"
                  [attr.aria-selected]="visMode() === 'wave'"
                  (click)="setVisMode('wave')"
                >
                  Oscilloscope
                </button>
                <button 
                  type="button" 
                  role="tab"
                  class="vis-mode-btn" 
                  [class.active]="visMode() === 'freq'"
                  [attr.aria-selected]="visMode() === 'freq'"
                  (click)="setVisMode('freq')"
                >
                  Frequency
                </button>
              </div>
            </div>

            <!-- HTML5 Canvas Visualizer Screen -->
            <div class="canvas-container" [class.streaming]="metrics().isStreaming">
              <canvas #visCanvas class="vis-canvas" [style.display]="metrics().isStreaming ? 'block' : 'none'"></canvas>

              <!-- Live HUD overlay when streaming -->
              @if (metrics().isStreaming) {
                <div class="canvas-hud">
                  <div class="hud-pill live">
                    <span class="hud-pulse"></span>
                    <span>{{ metrics().sampleRate }} Hz</span>
                  </div>

                  @if (metrics().isClipping) {
                    <div class="hud-pill clip" role="alert">
                      <span>CLIPPING</span>
                    </div>
                  }

                  @if (metrics().isSilent && !metrics().isMuted) {
                    <div class="hud-pill silent">
                      <span>Silent Input</span>
                    </div>
                  }
                </div>
              } @else {
                <!-- Offline / Idle State -->
                <div class="idle-placeholder">
                  <div class="idle-icon-wrap">
                    <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'circle-alert' : 'mic'" [size]="26" />
                  </div>
                  <h3 class="idle-title">{{ metrics().permissionStatus === 'denied' ? 'Microphone Permission Blocked' : 'Microphone Ready to Test' }}</h3>
                  <p class="idle-desc">
                    {{ metrics().permissionStatus === 'denied' 
                      ? 'Microphone access was blocked by your browser. Please allow microphone permissions in your address bar to continue.' 
                      : 'Start the microphone to check your input level, sound clarity, and run a voice loopback test.' }}
                  </p>

                  <!-- Error Banner if permissions were denied or hardware failed -->
                  @if (metrics().errorMessage) {
                    <div class="error-banner" role="alert">
                      <ts-icon name="circle-alert" [size]="18" class="error-icon" />
                      <div class="error-content">
                        <strong class="error-title">Microphone Access Notice</strong>
                        <p class="error-msg">{{ metrics().errorMessage }}</p>
                      </div>
                    </div>
                  }

                  <button type="button" class="btn-primary-start" (click)="startMic()">
                    <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'refresh-cw' : 'mic'" [size]="16" />
                    <span>{{ metrics().permissionStatus === 'denied' ? 'Try Again' : 'Start Microphone' }}</span>
                  </button>
                </div>
              }

              <!-- Muted Overlay Warning -->
              @if (metrics().isStreaming && metrics().isMuted) {
                <div class="muted-banner">
                  <ts-icon name="mic-off" [size]="20" />
                  <span>Microphone Muted — Audio Track Inactive</span>
                  <button type="button" class="btn-unmute-quick" (click)="toggleMute()">
                    Unmute
                  </button>
                </div>
              }
            </div>

            <!-- Viewport Footer Controls -->
            @if (metrics().isStreaming) {
              <div class="viewport-footer">
                <div class="stream-status">
                  <span class="pulse-indicator" [class.muted]="metrics().isMuted"></span>
                  <span>
                    {{ metrics().isMuted ? 'Muted' : 'Live Hardware Stream' }} • 
                    {{ metrics().channelCount === 1 ? 'Mono' : 'Stereo' }} • 
                    Peak: {{ metrics().peakDb }} dBFS
                  </span>
                </div>
                
                <div class="action-row">
                  <button type="button" class="btn-action-mute" (click)="toggleMute()">
                    <ts-icon [name]="metrics().isMuted ? 'mic' : 'mic-off'" [size]="14" />
                    <span>{{ metrics().isMuted ? 'Unmute' : 'Mute' }}</span>
                  </button>
                  <button type="button" class="btn-action-stop" (click)="stopMic()">
                    <ts-icon name="power-off" [size]="14" />
                    <span>Stop Mic</span>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Real-Time Volume & Peak dBFS Meter Card -->
          <div class="meter-card">
            <div class="meter-info-row">
              <div class="meter-label-wrap">
                <span class="meter-label">Live Input Level</span>
                <span class="meter-val">{{ metrics().volumeRms }}%</span>
              </div>
              <div class="db-meter-wrap">
                <span class="db-val">{{ metrics().peakDb }} dBFS</span>
                <span class="db-hold">(Peak Hold: {{ metrics().peakHoldDb }} dBFS)</span>
                @if (metrics().isClipping) {
                  <span class="clip-badge">CLIPPING</span>
                }
              </div>
            </div>

            <!-- Visual Bar with Peak Hold Notch -->
            <div class="volume-bar-track">
              <div 
                class="volume-bar-fill" 
                [style.width.%]="metrics().volumeRms"
                [attr.data-clipping]="metrics().isClipping"
              ></div>
              <!-- Peak hold indicator line -->
              <div 
                class="peak-hold-marker" 
                [style.left.%]="computeDbPercent(metrics().peakHoldDb)"
                [title]="'Peak Hold: ' + metrics().peakHoldDb + ' dBFS'"
              ></div>
            </div>

            <div class="meter-scale">
              <span>-60 dB (Silent)</span>
              <span>-30 dB</span>
              <span>-12 dB (Optimal)</span>
              <span>-3 dB</span>
              <span>0 dB (Clip)</span>
            </div>

            <!-- Rolling Volume Sparkline History -->
            @if (metrics().isStreaming) {
              <div class="sparkline-section">
                <span class="sparkline-title">Audio Dynamic History (Recent Speech Levels):</span>
                <div class="sparkline-bars">
                  @for (val of metrics().levelHistory; track $index) {
                    <div 
                      class="spark-bar" 
                      [style.height.%]="val"
                      [class.high]="val > 80"
                      [class.opt]="val >= 30 && val <= 80"
                    ></div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Voice Recording & Playback Section -->
          <div class="recording-card">
            <div class="rec-header">
              <div class="rec-title-wrap">
                <h3 class="card-heading">Voice Recording & Playback Check</h3>
                <p class="rec-desc">Record your voice to test clarity and hear exactly how others hear you in meetings.</p>
              </div>

              <!-- Duration Selector (when idle) -->
              @if (metrics().recording.status === 'idle') {
                <div class="rec-dur-select">
                  <button 
                    type="button" 
                    class="dur-pill" 
                    [class.active]="selectedDuration() === 5"
                    (click)="selectedDuration.set(5)"
                  >5s</button>
                  <button 
                    type="button" 
                    class="dur-pill" 
                    [class.active]="selectedDuration() === 10"
                    (click)="selectedDuration.set(10)"
                  >10s</button>
                  <button 
                    type="button" 
                    class="dur-pill" 
                    [class.active]="selectedDuration() === 15"
                    (click)="selectedDuration.set(15)"
                  >15s</button>
                </div>
              }
            </div>

            <div class="rec-body">
              <!-- State 1: Idle -->
              @if (metrics().recording.status === 'idle') {
                <div class="rec-idle-row">
                  <button 
                    type="button" 
                    class="btn-start-record" 
                    [disabled]="!metrics().isStreaming"
                    (click)="startRecording()"
                    title="Record voice sample"
                  >
                    <span class="record-red-dot"></span>
                    <span>Record {{ selectedDuration() }}s Voice Sample</span>
                  </button>
                  @if (!metrics().isStreaming) {
                    <span class="rec-hint">Start microphone above to enable voice recording.</span>
                  }
                </div>
              }

              <!-- State 2: Recording in Progress -->
              @if (metrics().recording.status === 'recording') {
                <div class="rec-active-row">
                  <div class="rec-timer-badge">
                    <span class="rec-pulsing-dot"></span>
                    <span>Recording: 00:{{ formatSeconds(metrics().recording.durationSeconds) }} / 00:{{ formatSeconds(metrics().recording.maxDurationSeconds) }}</span>
                  </div>
                  <button type="button" class="btn-stop-record" (click)="stopRecording()">
                    <ts-icon name="square" [size]="13" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              }

              <!-- State 3: Recorded Sample Available (Playback) -->
              @if (metrics().recording.status === 'recorded' || metrics().recording.status === 'playing') {
                <div class="rec-player-row">
                  <div class="player-controls">
                    @if (metrics().recording.status === 'playing') {
                      <button type="button" class="btn-play-toggle playing" (click)="pauseRecording()" title="Pause audio">
                        <ts-icon name="pause" [size]="15" />
                        <span>Pause</span>
                      </button>
                    } @else {
                      <button type="button" class="btn-play-toggle" (click)="playRecording()" title="Play audio">
                        <ts-icon name="play" [size]="15" />
                        <span>Play Audio</span>
                      </button>
                    }

                    <div class="player-meta">
                      <span class="player-time">Sample Duration: {{ metrics().recording.durationSeconds || selectedDuration() }}s</span>
                      <span class="player-type">{{ metrics().recording.mimeType }}</span>
                    </div>
                  </div>

                  <div class="player-actions">
                    <button type="button" class="btn-rec-action download" (click)="downloadRecording()" title="Download audio">
                      <ts-icon name="download" [size]="14" />
                      <span>Download</span>
                    </button>
                    <button type="button" class="btn-rec-action retake" (click)="retakeRecording()" title="Retake sample">
                      <ts-icon name="rotate-ccw" [size]="14" />
                      <span>Retake</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>

        <!-- ========================================== -->
        <!-- RIGHT COLUMN: Status & Details -->
        <!-- ========================================== -->
        <div class="side-column">
          
          <!-- Outcome Card: Microphone Status -->
          <div class="spec-card">
            <h3 class="card-heading">Microphone Status</h3>

            <div class="outcome-list">
              <div class="outcome-row">
                <span class="outcome-k">Status</span>
                <span class="outcome-v" [class.working]="metrics().isStreaming && !metrics().isMuted">
                  {{ metrics().isStreaming ? (metrics().isMuted ? 'Muted' : 'Working') : 'Offline' }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Volume Level</span>
                <span class="outcome-v highlight">{{ metrics().isStreaming ? metrics().volumeRms + '%' : '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Peak Loudness</span>
                <span class="outcome-v">{{ metrics().isStreaming ? metrics().peakDb + ' dBFS' : '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Sound Quality</span>
                <span class="outcome-v">
                  {{ metrics().isStreaming ? (metrics().isSilent ? 'Silent' : (metrics().isClipping ? 'Clipping' : 'Clear')) : '--' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Progressive Disclosure: Technical Details -->
          <details class="technical-details">
            <summary class="details-summary">
              <div class="summary-left">
                <ts-icon name="sliders" [size]="15" />
                <span>Technical Details</span>
              </div>
              <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
            </summary>

            <div class="details-content">
              <div class="specs-list">
                <div class="spec-row">
                  <span class="spec-k">Microphone Name</span>
                  <span class="spec-v device-name-val" [title]="metrics().activeDeviceLabel">
                    {{ metrics().activeDeviceLabel || 'Default Microphone' }}
                  </span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Sample Rate</span>
                  <span class="spec-v">{{ metrics().sampleRate }} Hz</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Channels</span>
                  <span class="spec-v">{{ metrics().channelCount === 1 ? 'Mono (1 Ch)' : 'Stereo (2 Ch)' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Echo Cancellation</span>
                  <span class="spec-v">{{ metrics().echoCancellation ? 'Enabled' : 'Disabled' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Noise Suppression</span>
                  <span class="spec-v">{{ metrics().noiseSuppression ? 'Enabled' : 'Disabled' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Auto Gain</span>
                  <span class="spec-v">{{ metrics().autoGainControl ? 'Enabled' : 'Disabled' }}</span>
                </div>
              </div>

              <!-- Audio Clarity & Noise Floor -->
              <div class="intel-meters">
                <div class="meter-block">
                  <div class="meter-label-row">
                    <span class="meter-name">Voice Clarity</span>
                    <span class="meter-val capitalize">{{ metrics().qualityAssessment.clarityRating }} ({{ metrics().qualityAssessment.clarityPercent }}%)</span>
                  </div>
                  <div class="meter-track">
                    <div class="meter-fill clarity-bar" [style.width.%]="metrics().qualityAssessment.clarityPercent"></div>
                  </div>
                </div>

                <div class="meter-block">
                  <div class="meter-label-row">
                    <span class="meter-name">Noise Floor</span>
                    <span class="meter-val capitalize">{{ metrics().qualityAssessment.noiseFloorDb }} dBFS</span>
                  </div>
                  <div class="meter-track">
                    <div class="meter-fill noise-bar" [style.width.%]="computeNoiseFloorPercent(metrics().qualityAssessment.noiseFloorDb)"></div>
                  </div>
                </div>
              </div>

              <!-- Speaking Loudness Guidance -->
              <div class="troubleshoot-sub">
                <span class="cap-title">Recommended Speaking Levels:</span>
                <ul class="tip-list-simple">
                  <li><strong>40% – 75%:</strong> Optimal vocal level for Zoom, Meet, and Teams.</li>
                  <li><strong>&lt; 30%:</strong> Too quiet. Speak closer to the mic or raise input volume.</li>
                  <li><strong>&gt; 90%:</strong> Clipping / distortion. Lower your microphone level.</li>
                </ul>
              </div>

              <!-- Troubleshooting -->
              <div class="troubleshoot-sub">
                <span class="cap-title">Troubleshooting:</span>
                <ul class="tip-list-simple">
                  <li>Check the hardware mute switch on your headset or microphone boom.</li>
                  <li>Click the lock icon in your browser address bar to allow microphone access.</li>
                  <li>If you hear echo or feedback, wear headphones to isolate the audio output.</li>
                </ul>
              </div>
            </div>
          </details>

        </div>

      </div>

    </div>
  `,
  styleUrls: ['../../styles/device-studio-tokens.css'],
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .mic-module-root {
      width: 100%;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    /* Header Actions */
    .btn-mute,
    .btn-start-header,
    .btn-stop-header {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-mute {
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--text, #F4F4F5);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
    }

    :host-context([data-theme="light"]) .btn-mute {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-mute.muted {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      color: var(--ds-fail, #F87171);
      border-color: var(--ds-fail-border, rgba(248, 113, 113, 0.3));
    }

    .btn-start-header {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .btn-start-header {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-stop-header {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      color: var(--ds-fail, #F87171);
      border: 1px solid var(--ds-fail-border, rgba(248, 113, 113, 0.28));
    }

    /* Workspace Grid */
    .workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(360px, 1fr);
      gap: 20px;
      margin-top: 18px;
    }

    @media (max-width: 980px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Visualizer Card */
    .visualizer-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .visualizer-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    .viewport-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: var(--ds-card-bg-elevated, #27272A);
      border-bottom: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .viewport-toolbar {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    .device-select-wrap {
      flex: 1;
      max-width: 380px;
    }

    .device-select {
      width: 100%;
      height: 34px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      color: var(--text, #F4F4F5);
      font-size: 13px;
      padding: 0 10px;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .device-select {
      background: #FFFFFF;
      color: #0F172A;
      border-color: #CBD5E1;
    }

    .vis-mode-switch {
      display: flex;
      background: var(--ds-card-bg, #18181B);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .vis-mode-switch {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    .vis-mode-btn {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .vis-mode-btn.active {
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--ds-accent, #3B82F6);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .vis-mode-btn.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Canvas Screen */
    .canvas-container {
      position: relative;
      width: calc(100% - 24px);
      height: 310px;
      background: var(--surface-secondary, #18181B);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      margin: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: background 0.2s ease, border-color 0.2s ease;
      box-sizing: border-box;
    }

    .canvas-container.streaming {
      background: #09090B;
      border-style: solid;
      border-color: transparent;
      margin: 0;
      width: 100%;
      border-radius: 0;
      height: 310px;
    }

    :host-context([data-theme="light"]) .canvas-container:not(.streaming) {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }

    :host-context([data-theme="light"]) .canvas-container.streaming {
      background: #0F172A;
    }

    .vis-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* HUD overlay */
    .canvas-hud {
      position: absolute;
      top: 14px;
      left: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 2;
    }

    .hud-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(9, 9, 11, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #F4F4F5;
      font-size: 11px;
      font-weight: 600;
      backdrop-filter: blur(8px);
    }

    .hud-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ds-pass, #34D399);
      box-shadow: 0 0 8px var(--ds-pass, #34D399);
    }

    .hud-pill.clip {
      border-color: rgba(248, 113, 113, 0.5);
      color: #F87171;
    }

    .hud-pill.silent {
      border-color: rgba(251, 191, 36, 0.5);
      color: #FBBF24;
    }

    /* Idle State Placeholder */
    .idle-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px 20px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      z-index: 2;
    }

    .idle-icon-wrap {
      width: 56px;
      height: 56px;
      min-width: 56px;
      min-height: 56px;
      flex-shrink: 0;
      aspect-ratio: 1 / 1;
      border-radius: 16px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.25));
      color: var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .idle-icon-wrap {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .idle-title {
      font-size: 18px;
      font-weight: 700;
      color: #F4F4F5;
      margin: 0 0 6px;
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .idle-title {
      color: #0F172A;
    }

    .idle-desc {
      font-size: 13px;
      color: #A1A1AA;
      margin: 0 0 18px;
      max-width: 440px;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .idle-desc {
      color: #64748B;
    }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(248, 113, 113, 0.14);
      border: 1px solid rgba(248, 113, 113, 0.35);
      color: #FCA5A5;
      font-size: 12px;
      margin-bottom: 20px;
      text-align: left;
      max-width: 440px;
    }

    :host-context([data-theme="light"]) .error-banner {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #991B1B;
    }

    .error-title {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 2px;
      color: #F87171;
    }

    :host-context([data-theme="light"]) .error-title {
      color: #DC2626;
    }

    .error-msg {
      margin: 0;
      line-height: 1.45;
    }

    .btn-primary-start {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
      border-radius: 10px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px var(--ds-accent-glow, rgba(59, 130, 246, 0.25));
      transition: all 0.16s ease;
    }

    .btn-primary-start:hover {
      transform: translateY(-1px);
      background: var(--ds-accent-hover, #60A5FA);
    }

    :host-context([data-theme="light"]) .btn-primary-start {
      background: #2563EB;
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .btn-primary-start:hover {
      background: #1D4ED8;
    }

    .privacy-reassurance {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #71717A;
      margin-top: 18px;
    }

    :host-context([data-theme="light"]) .privacy-reassurance {
      color: #64748B;
    }

    /* Muted Banner */
    .muted-banner {
      position: absolute;
      inset: 0;
      background: rgba(9, 9, 11, 0.82);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #F87171;
      font-size: 15px;
      font-weight: 600;
      z-index: 2;
    }

    .btn-unmute-quick {
      padding: 6px 16px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-unmute-quick {
      background: #2563EB;
      color: #FFFFFF;
    }

    /* Viewport Footer */
    .viewport-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: var(--ds-card-bg-elevated, #27272A);
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .viewport-footer {
      background: #F8FAFC;
      border-top-color: #E2E8F0;
    }

    .stream-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
    }

    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ds-pass, #34D399);
      box-shadow: 0 0 8px var(--ds-pass, #34D399);
      animation: pulse-ring 2s infinite;
    }

    .pulse-indicator.muted {
      background: var(--ds-fail, #F87171);
      box-shadow: 0 0 8px var(--ds-fail, #F87171);
      animation: none;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.9; }
      50% { transform: scale(1.2); opacity: 0.5; }
      100% { transform: scale(0.95); opacity: 0.9; }
    }

    .action-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-action-mute {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-action-stop {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      color: var(--ds-fail, #F87171);
      border: 1px solid var(--ds-fail-border, rgba(248, 113, 113, 0.3));
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Meter Card */
    .meter-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 16px 18px;
    }

    :host-context([data-theme="light"]) .meter-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .meter-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .meter-label-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meter-label {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .meter-label {
      color: #0F172A;
    }

    .meter-val {
      font-size: 13px;
      font-weight: 600;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .meter-val {
      color: #2563EB;
    }

    .db-meter-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .db-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .db-val {
      color: #0F172A;
    }

    .db-hold {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
    }

    .clip-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--ds-fail, #F87171);
      color: #FFFFFF;
      letter-spacing: 0.05em;
    }

    .volume-bar-track {
      position: relative;
      width: 100%;
      height: 12px;
      background: var(--ds-meter-bg, #27272A);
      border-radius: 6px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .volume-bar-track {
      background: #E2E8F0;
    }

    .volume-bar-fill {
      height: 100%;
      border-radius: 6px;
      background: linear-gradient(90deg, #3B82F6 0%, #34D399 70%, #FBBF24 88%, #F87171 100%);
      transition: width 0.08s ease;
    }

    :host-context([data-theme="light"]) .volume-bar-fill {
      background: linear-gradient(90deg, #2563EB 0%, #059669 70%, #D97706 88%, #DC2626 100%);
    }

    .volume-bar-fill[data-clipping="true"] {
      background: var(--ds-fail, #F87171);
    }

    .peak-hold-marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #FFFFFF;
      box-shadow: 0 0 4px #FFFFFF;
      transition: left 0.1s ease;
      pointer-events: none;
    }

    .meter-scale {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--text-3, #71717A);
      margin-top: 5px;
    }

    .sparkline-section {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    .sparkline-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      margin-bottom: 6px;
      display: block;
    }

    .sparkline-bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 28px;
      background: var(--ds-card-bg-elevated, #27272A);
      padding: 3px 6px;
      border-radius: 6px;
    }

    :host-context([data-theme="light"]) .sparkline-bars {
      background: #F8FAFC;
    }

    .spark-bar {
      flex: 1;
      min-height: 2px;
      border-radius: 2px;
      background: var(--text-3, #52525B);
      transition: height 0.1s ease;
    }

    .spark-bar.opt {
      background: var(--ds-accent, #3B82F6);
    }

    .spark-bar.high {
      background: var(--ds-fail, #F87171);
    }

    /* Recording Card */
    .recording-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 16px 18px;
    }

    :host-context([data-theme="light"]) .recording-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .rec-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .rec-desc {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 2px 0 0;
    }

    .rec-dur-select {
      display: flex;
      gap: 4px;
      background: var(--ds-card-bg-elevated, #27272A);
      padding: 2px;
      border-radius: 6px;
    }

    :host-context([data-theme="light"]) .rec-dur-select {
      background: #F1F5F9;
    }

    .dur-pill {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      background: none;
      border: none;
      cursor: pointer;
    }

    .dur-pill.active {
      background: var(--ds-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .dur-pill.active {
      background: #2563EB;
      color: #FFFFFF;
    }

    .rec-idle-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-start-record {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-start-record:hover:not(:disabled) {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .btn-start-record {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .btn-start-record:hover:not(:disabled) {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-start-record:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .record-red-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #EF4444;
    }

    .rec-hint {
      font-size: 12px;
      color: var(--text-2, #71717A);
    }

    .rec-active-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .rec-timer-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #FCA5A5;
    }

    .rec-pulsing-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #EF4444;
      animation: pulse-ring 1.5s infinite;
    }

    .btn-stop-record {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      background: #EF4444;
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    /* Player Row */
    .rec-player-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .rec-player-row {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .player-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-play-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-play-toggle {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-play-toggle.playing {
      background: var(--ds-warn, #FBBF24);
      color: #78350F;
    }

    .player-meta {
      display: flex;
      flex-direction: column;
    }

    .player-time {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .player-time {
      color: #0F172A;
    }

    .player-type {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
    }

    .player-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-rec-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: var(--ds-card-bg, #18181B);
      color: var(--text, #F4F4F5);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
    }

    :host-context([data-theme="light"]) .btn-rec-action {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .rec-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #71717A;
      margin-top: 10px;
    }

    /* Side Column */
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .spec-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="light"]) .spec-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .card-header-flex {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .card-heading {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .card-heading {
      color: #0F172A;
    }

    .card-sub-desc {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 2px 0 12px;
    }

    .heuristic-pill {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-2, #A1A1AA);
      margin-top: 3px;
    }

    .grade-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 48px;
      border-radius: 10px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      color: var(--ds-accent, #3B82F6);
    }

    .grade-badge[data-grade="A+"],
    .grade-badge[data-grade="A"] {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.12));
      border-color: var(--ds-pass-border, rgba(52, 211, 153, 0.35));
      color: var(--ds-pass, #34D399);
    }

    .grade-badge[data-grade="B"] {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.35));
      color: var(--ds-accent, #3B82F6);
    }

    .grade-badge[data-grade="C"] {
      background: var(--ds-warn-soft, rgba(251, 191, 36, 0.12));
      border-color: var(--ds-warn-border, rgba(251, 191, 36, 0.35));
      color: var(--ds-warn, #FBBF24);
    }

    .grade-badge[data-grade="D"] {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      border-color: var(--ds-fail-border, rgba(248, 113, 113, 0.35));
      color: var(--ds-fail, #F87171);
    }

    .grade-letter {
      font-size: 17px;
      font-weight: 800;
      line-height: 1;
    }

    .grade-score {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.85;
      margin-top: 2px;
    }

    .intel-summary {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0 0 14px;
      line-height: 1.45;
    }

    .intel-meters {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .meter-block {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .meter-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }

    .meter-name {
      color: var(--text-2, #A1A1AA);
      font-weight: 500;
    }

    .meter-val {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .meter-val {
      color: #0F172A;
    }

    .meter-track {
      width: 100%;
      height: 6px;
      border-radius: 9999px;
      background: var(--ds-meter-bg, #27272A);
      overflow: hidden;
    }

    .meter-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .clarity-bar {
      background: var(--ds-accent, #3B82F6);
    }

    .noise-bar {
      background: linear-gradient(90deg, #34D399 0%, #FBBF24 70%, #F87171 100%);
    }

    .meter-scale-legend {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--text-3, #71717A);
    }

    .intel-badges-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .intel-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 7px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      font-size: 11.5px;
    }

    :host-context([data-theme="light"]) .intel-chip {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .chip-k {
      color: var(--text-2, #A1A1AA);
    }

    .chip-v {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    .chip-v.danger {
      color: var(--ds-fail, #F87171);
    }

    .chip-v[data-readiness="optimal"] {
      color: var(--ds-pass, #34D399);
    }

    .chip-v[data-readiness="recommended"] {
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .chip-v[data-readiness="recommended"] {
      color: #2563EB;
    }

    .chip-v[data-readiness="needs-improvement"] {
      color: var(--ds-fail, #F87171);
    }

    /* Hardware Telemetry List */
    .specs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .spec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      padding-bottom: 7px;
      border-bottom: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.06));
    }

    .spec-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .spec-k {
      color: var(--text-2, #A1A1AA);
    }

    .spec-v {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .spec-v {
      color: #0F172A;
    }

    .spec-v.active {
      color: var(--ds-pass, #34D399);
    }

    .device-name-val {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .highlight-val {
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .highlight-val {
      color: #2563EB;
    }

    /* Optimal Volume Range Guidance */
    .level-legend {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .legend-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
    }

    .legend-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .legend-badge.green {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.14));
      color: var(--ds-pass, #34D399);
      border: 1px solid var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    .legend-badge.yellow {
      background: var(--ds-warn-soft, rgba(251, 191, 36, 0.14));
      color: var(--ds-warn, #FBBF24);
      border: 1px solid var(--ds-warn-border, rgba(251, 191, 36, 0.3));
    }

    .legend-badge.red {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.14));
      color: var(--ds-fail, #F87171);
      border: 1px solid var(--ds-fail-border, rgba(248, 113, 113, 0.3));
    }

    .legend-text {
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .legend-text {
      color: #64748B;
    }

    /* Troubleshooting Card */
    .troubleshoot-card {
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 16px 18px;
    }

    :host-context([data-theme="light"]) .troubleshoot-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .tip-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 10px;
    }

    :host-context([data-theme="light"]) .tip-title {
      color: #0F172A;
    }

    .tip-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.55;
    }

    :host-context([data-theme="light"]) .tip-list {
      color: #64748B;
    }

    /* Outcome List */
    .outcome-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
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

    :host-context([data-theme="light"]) .outcome-v.highlight {
      color: #2563EB;
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

    :host-context([data-theme="light"]) .technical-details[open] {
      border-color: #2563EB;
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

    :host-context([data-theme="light"]) .summary-left {
      color: #2563EB;
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

    .troubleshoot-sub {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .tip-list-simple {
      margin: 8px 0 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.6;
    }

    :host-context([data-theme="light"]) .tip-list-simple {
      color: #64748B;
    }
  `]
})
export class MicrophoneModuleComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public mic = inject(MicrophoneService);
  private state = inject(DeviceStudioStateService);

  @ViewChild('visCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  public readonly metrics = this.mic.metrics;
  public readonly devices = this.mic.availableDevices;

  public readonly micOptions = computed<DropdownOption[]>(() => {
    const devs = this.devices();
    if (devs.length === 0 || this.metrics().permissionStatus !== 'granted') {
      return [{ value: '', label: 'Default Microphone', icon: 'mic' }];
    }
    return devs.map((d, index) => ({
      value: d.deviceId,
      label: d.label && d.label.trim().length > 0 ? d.label : `Microphone ${index + 1}`,
      icon: 'mic'
    }));
  });
  public readonly visMode = signal<'wave' | 'freq'>('wave');
  public readonly selectedDuration = signal<number>(5);

  private animFrameId: number | null = null;

  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      const activeEl = document.activeElement?.tagName.toLowerCase();
      if (activeEl !== 'input' && activeEl !== 'select' && activeEl !== 'button') {
        event.preventDefault();
        if (this.metrics().isStreaming) {
          if (this.metrics().recording.status === 'idle') {
            this.startRecording();
          } else if (this.metrics().recording.status === 'recording') {
            this.stopRecording();
          }
        } else {
          this.startMic();
        }
      }
    }
  }

  public async ngOnInit(): Promise<void> {
    this.state.setActiveTab('microphone');
    await this.mic.loadDevices();
  }

  public ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clearCanvas();
    this.mic.stopStream();
  }

  public async startMic(deviceId?: string): Promise<void> {
    try {
      await this.mic.startStream(deviceId);
      this.state.markModuleTested('microphone');
      this.startCanvasRendering();
      this.state.showToast('Microphone stream active.');
    } catch {
      // Handled inside MicrophoneService
    }
  }

  public stopMic(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clearCanvas();
    this.mic.stopStream();
    this.state.showToast('Microphone stream stopped.');
  }

  private clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  public toggleMute(): void {
    this.mic.toggleMute();
    this.state.showToast(this.metrics().isMuted ? 'Microphone muted.' : 'Microphone unmuted.');
  }

  public onMicDeviceChange(deviceId: string): void {
    if (deviceId) {
      this.startMic(deviceId);
    }
  }

  public onDeviceSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.startMic(select.value);
    }
  }

  public setVisMode(mode: 'wave' | 'freq'): void {
    this.visMode.set(mode);
  }

  public startRecording(): void {
    this.mic.startRecording(this.selectedDuration()).then(() => {
      this.state.showToast(`Recording ${this.selectedDuration()}s voice sample...`);
    }).catch(() => {
      this.state.showToast('Failed to start recording.');
    });
  }

  public stopRecording(): void {
    this.mic.stopRecording().then(() => {
      this.state.showToast('Voice sample recorded! Click Play to listen.');
    });
  }

  public playRecording(): void {
    this.mic.playRecording();
  }

  public pauseRecording(): void {
    this.mic.pauseRecordingPlayback();
  }

  public retakeRecording(): void {
    this.mic.retakeRecording();
    this.state.showToast('Recording cleared. Ready to retake.');
  }

  public downloadRecording(): void {
    this.mic.downloadRecording();
    this.state.showToast('Recording downloaded.');
  }

  public goBackToStudio(): void {
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }

  public computeDbPercent(db: number): number {
    // Maps -60 dBFS .. 0 dBFS to 0% .. 100%
    const clamped = Math.max(-60, Math.min(0, db));
    return Math.round(((clamped + 60) / 60) * 100);
  }

  public computeNoiseFloorPercent(noiseFloorDb: number): number {
    // Maps -60 dBFS (best) to 10%, -20 dBFS (worst) to 100%
    const clamped = Math.max(-60, Math.min(-20, noiseFloorDb));
    return Math.round(((clamped + 60) / 40) * 100);
  }

  public formatSeconds(sec: number): string {
    return sec < 10 ? `0${sec}` : `${sec}`;
  }

  private startCanvasRendering(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');

      if (ctx && w > 0 && h > 0) {
        ctx.clearRect(0, 0, w, h);

        if (this.metrics().isStreaming && !this.metrics().isMuted) {
          // Draw subtle background grid lines
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.moveTo(0, h / 4);
          ctx.lineTo(w, h / 4);
          ctx.moveTo(0, (3 * h) / 4);
          ctx.lineTo(w, (3 * h) / 4);
          ctx.stroke();

          if (this.visMode() === 'wave') {
            const timeData = this.mic.getTimeDomainData();
            if (timeData) {
              ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
              ctx.strokeStyle = '#3B82F6';
              ctx.shadowColor = '#3B82F6';
              ctx.shadowBlur = 8;
              ctx.beginPath();

              const sliceWidth = w / timeData.length;
              let x = 0;

              for (let i = 0; i < timeData.length; i++) {
                const v = timeData[i] / 128.0;
                const y = (v * h) / 2;
                if (i === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
                x += sliceWidth;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          } else {
            // Frequency Spectrum Bars
            const freqData = this.mic.getFrequencyData();
            if (freqData) {
              const barCount = 56;
              const step = Math.floor(freqData.length / barCount);
              const barWidth = (w / barCount) - 2;

              for (let i = 0; i < barCount; i++) {
                const value = freqData[i * step] / 255.0;
                const barHeight = Math.max(3, value * (h - 24));

                const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
                gradient.addColorStop(0, '#1D4ED8');
                gradient.addColorStop(0.7, '#3B82F6');
                gradient.addColorStop(1, i > 40 ? '#FBBF24' : '#34D399');

                ctx.fillStyle = gradient;
                ctx.fillRect(i * (barWidth + 2), h - barHeight, barWidth, barHeight);
              }
            }
          }
        }
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.animFrameId = requestAnimationFrame(render);
  }
}
