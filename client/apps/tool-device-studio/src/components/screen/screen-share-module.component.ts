// apps/tool-device-studio/src/components/screen/screen-share-module.component.ts
import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TsIconComponent } from '@acklet/tool-shell';
import { ScreenShareService } from '../../services/screen-share.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';

@Component({
  selector: 'app-screen-share-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen-module-root">
      
      <!-- Module Header -->
      <app-device-module-header
        title="Screen Sharing Test"
        icon="screen"
        description="Test sharing your screen, window, or browser tab."
        [badge]="headerBadgeText()"
        [badgeType]="metrics().isSharing ? 'active' : (metrics().diagnosticSummary.verdict !== 'untested' ? 'warn' : 'default')"
        (backClicked)="goBackToStudio()"
      >
        @if (metrics().isSharing) {
          <button type="button" class="btn-stop-share" (click)="stopSharing()" aria-label="Stop screen sharing">
            <ts-icon name="power" [size]="14" />
            <span>Stop Sharing</span>
          </button>
        } @else {
          <button type="button" class="btn-start-share" (click)="startSharing()" aria-label="Start screen sharing test">
            <ts-icon name="play" [size]="15" />
            <span>{{ metrics().diagnosticSummary.verdict !== 'untested' ? 'Run Again' : 'Start Screen Share' }}</span>
          </button>
        }
      </app-device-module-header>

      <!-- Main Layout Grid -->
      <div class="workspace-grid">
        
        <!-- Left / Primary Column -->
        <div class="main-column">
          
          <!-- Video Preview Viewport Card -->
          <div class="viewport-card">
            
            <!-- Viewport Toolbar -->
            <div class="viewport-toolbar">
              <div class="surface-badge-wrap">
                <span class="toolbar-label">Surface:</span>
                <span class="surface-tag" [attr.data-surface]="metrics().surfaceType">
                  {{ formatSurfaceType(metrics().surfaceType) }}
                </span>
                @if (metrics().isSharing && metrics().resolution.width > 0) {
                  <span class="res-tag">
                    {{ metrics().resolution.width }} × {{ metrics().resolution.height }} ({{ metrics().resolution.aspectRatio }})
                  </span>
                }
              </div>

              @if (metrics().isSharing) {
                <div class="toolbar-actions">
                  <button type="button" class="tool-btn" (click)="takeSnapshot()" title="Capture frame snapshot">
                    <ts-icon name="camera" [size]="14" />
                    <span>Snapshot</span>
                  </button>

                  <button type="button" class="tool-btn" (click)="toggleFullscreen()" title="Toggle fullscreen view">
                    <ts-icon name="maximize-2" [size]="14" />
                  </button>
                </div>
              }
            </div>

            <!-- Video Screen Container -->
            <div #viewportContainer class="video-container" [class.sharing]="metrics().isSharing">
              <video
                #videoEl
                autoplay
                playsinline
                muted
                class="screen-video"
                [style.display]="metrics().isSharing ? 'block' : 'none'"
                (loadedmetadata)="onMetadataLoaded()"
              ></video>

              <!-- Stream Interrupted Banner -->
              @if (metrics().isSharing && metrics().isMuted) {
                <div class="interruption-banner">
                  <ts-icon name="circle-alert" [size]="16" />
                  <span>Stream Paused: Window minimized or screen locked by OS</span>
                </div>
              }

              <!-- Stream HUD Overlay (Active during sharing) -->
              @if (metrics().isSharing) {
                <div class="hud-overlay">
                  <div class="hud-tag fps-tag">
                    <span class="live-dot"></span>
                    <span>{{ metrics().measuredFps }} FPS</span>
                  </div>

                  <div class="hud-tag">
                    <span>{{ metrics().qualityAssessment.tierLabel }}</span>
                  </div>

                  <div class="hud-tag" [class.has-audio]="metrics().hasAudio">
                    <ts-icon [name]="metrics().hasAudio ? 'volume' : 'volume-x'" [size]="13" />
                    <span>{{ metrics().hasAudio ? 'Tab / System Audio' : 'Video Only' }}</span>
                  </div>
                </div>
              } @else {
                <!-- Idle State Placeholder -->
                <div class="idle-placeholder">
                  <div class="idle-icon-wrap">
                    <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'circle-alert' : 'screen'" [size]="36" />
                  </div>
                  
                  <h3 class="idle-title">{{ metrics().permissionStatus === 'denied' ? 'Screen Sharing Permission Needed' : 'Screen Sharing Ready' }}</h3>
                  <p class="idle-desc">
                    {{ metrics().permissionStatus === 'denied' 
                      ? 'Screen sharing permission was cancelled or blocked. Please select a screen, window, or tab to share.' 
                      : 'Select your entire screen, an application window, or a browser tab to start the test.' }}
                  </p>

                  @if (metrics().errorMessage) {
                    <div class="error-banner">
                      <ts-icon name="circle-alert" [size]="16" />
                      <span>{{ metrics().errorMessage }}</span>
                    </div>
                  }

                  <button type="button" class="btn-primary-start" (click)="startSharing()">
                    <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'refresh-cw' : 'play'" [size]="16" />
                    <span>{{ metrics().permissionStatus === 'denied' ? 'Try Again' : 'Select Screen & Test' }}</span>
                  </button>
                </div>
              }
            </div>

            <!-- Keyboard shortcut hint -->
            <div class="keyboard-hint">
              <span class="kbd-badge">Space</span>
              <span>to {{ metrics().isSharing ? 'Stop' : 'Start' }} Sharing</span>
            </div>

          </div>

          <!-- Captured Snapshots Gallery -->
          @if (metrics().capturedFrames.length > 0) {
            <div class="gallery-card">
              <div class="gallery-header">
                <div class="gallery-title-wrap">
                  <ts-icon name="camera" [size]="15" />
                  <span class="gallery-title">Captured Screen Snapshots ({{ metrics().capturedFrames.length }})</span>
                </div>
                <button type="button" class="btn-clear-snaps" (click)="screen.clearAllSnapshots()" title="Clear all snapshots">
                  <span>Clear All</span>
                </button>
              </div>

              <div class="gallery-strip">
                @for (snap of metrics().capturedFrames; track snap; let idx = $index) {
                  <div class="snap-thumbnail-wrap">
                    <img [src]="snap" alt="Captured screen snapshot" class="snap-thumb" (click)="openLightbox(snap)" />
                    <div class="snap-actions">
                      <button type="button" class="btn-thumb-action" (click)="copySnapshot(idx)" title="Copy to clipboard">
                        <ts-icon name="copy" [size]="12" />
                      </button>
                      <a [href]="snap" [download]="'acklet-screen-snap-' + (idx + 1) + '.png'" class="btn-thumb-action" title="Download PNG">
                        <ts-icon name="download" [size]="12" />
                      </a>
                      <button type="button" class="btn-thumb-action delete" (click)="screen.deleteSnapshot(idx)" title="Delete snapshot">
                        <ts-icon name="trash" [size]="12" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

        </div>

        <!-- Right / Secondary Column -->
        <div class="side-column">
          
          <!-- Outcome Card: Screen Status -->
          <div class="side-card">
            <h3 class="card-heading">Screen Share Status</h3>

            <div class="outcome-list" style="margin-top: 14px;">
              <div class="outcome-row">
                <span class="outcome-k">Status</span>
                <span class="outcome-v" [class.working]="metrics().isSharing && !metrics().isMuted">
                  {{ metrics().isSharing ? (metrics().isMuted ? 'Muted' : 'Working') : 'Idle' }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Resolution</span>
                <span class="outcome-v highlight">
                  {{ metrics().resolution.width ? metrics().resolution.width + ' × ' + metrics().resolution.height : '--' }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Frame Rate</span>
                <span class="outcome-v">
                  {{ metrics().isSharing ? metrics().measuredFps + ' FPS' : (metrics().diagnosticSummary.averageFps ? metrics().diagnosticSummary.averageFps + ' FPS (Avg)' : '--') }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Audio Captured</span>
                <span class="outcome-v">{{ metrics().hasAudio ? 'Yes' : 'No' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Surface</span>
                <span class="outcome-v capitalize">{{ formatSurfaceType(metrics().surfaceType) }}</span>
              </div>
            </div>
          </div>

          <!-- Diagnostic Session Summary (Visible when test completed) -->
          @if (metrics().diagnosticSummary.verdict !== 'untested' && !metrics().isSharing) {
            <div class="side-card summary-card">
              <div class="card-header-row">
                <h3 class="card-heading">Last Test Summary</h3>
                <span class="verdict-badge" [attr.data-verdict]="metrics().diagnosticSummary.verdict">
                  {{ metrics().diagnosticSummary.verdict | uppercase }}
                </span>
              </div>

              <div class="summary-specs">
                <div class="sum-row">
                  <span class="sum-k">Duration</span>
                  <span class="sum-v">{{ metrics().diagnosticSummary.durationSeconds }}s</span>
                </div>
                <div class="sum-row">
                  <span class="sum-k">Max Resolution</span>
                  <span class="sum-v">{{ metrics().diagnosticSummary.maxResolution }}</span>
                </div>
                <div class="sum-row">
                  <span class="sum-k">Average FPS</span>
                  <span class="sum-v">{{ metrics().diagnosticSummary.averageFps }} FPS</span>
                </div>
              </div>
            </div>
          }

          <!-- Progressive Disclosure: Technical Details & Troubleshooting -->
          <details class="technical-details">
            <summary class="details-summary">
              <div class="summary-left">
                <ts-icon name="sliders" [size]="15" />
                <span>Technical Details & Guide</span>
              </div>
              <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
            </summary>

            <div class="details-content">
              <div class="specs-list">
                <div class="spec-row">
                  <span class="spec-k">Aspect Ratio</span>
                  <span class="spec-v">{{ metrics().resolution.aspectRatio }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Target FPS</span>
                  <span class="spec-v">{{ metrics().frameRate ? metrics().frameRate + ' FPS' : '--' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Text Clarity</span>
                  <span class="spec-v capitalize">{{ metrics().qualityAssessment.textClarity }}</span>
                </div>
              </div>

              <!-- Surface Guidance -->
              <div class="troubleshoot-sub">
                <span class="cap-title">Sharing Surface Tips:</span>
                <ul class="tip-list-simple">
                  <li><strong>Entire Screen:</strong> Best for multi-window workflows and code demos.</li>
                  <li><strong>Application Window:</strong> Keeps personal notifications and desktop private.</li>
                  <li><strong>Browser Tab:</strong> Supports tab audio for presentations and YouTube video.</li>
                </ul>
              </div>

              <!-- OS Permissions -->
              <div class="troubleshoot-sub">
                <span class="cap-title">Troubleshooting:</span>
                <ul class="tip-list-simple">
                  <li><strong>macOS:</strong> Open <em>System Settings → Privacy & Security → Screen Recording</em>.</li>
                  <li><strong>Browser prompt:</strong> Ensure you select the target window and click Share.</li>
                </ul>
              </div>
            </div>
          </details>

        </div>

      </div>

      <!-- Lightbox Modal for Fullscreen Snapshot Preview -->
      @if (lightboxUrl) {
        <div class="lightbox-backdrop" (click)="closeLightbox()">
          <div class="lightbox-modal" (click)="$event.stopPropagation()">
            <img [src]="lightboxUrl" alt="Screenshot detail" class="lightbox-img" />
            <button type="button" class="btn-close-lightbox" (click)="closeLightbox()">✕</button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .screen-module-root {
      width: 100%;
    }

    .btn-start-share {
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

    .btn-start-share:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .btn-start-share {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-stop-share {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #F87171;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-stop-share:hover {
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

    /* Viewport Card */
    .viewport-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .viewport-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    .viewport-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.02));
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .viewport-toolbar {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    .surface-badge-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .toolbar-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .toolbar-label {
      color: #64748B;
    }

    .surface-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--surface-secondary, #27272A);
      color: var(--text, #F4F4F5);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    :host-context([data-theme="light"]) .surface-tag {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .res-tag {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 9px;
      border-radius: 6px;
      background: var(--surface, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .tool-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .tool-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .tool-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
      background: #EFF6FF;
    }

    /* Video Container */
    .video-container {
      position: relative;
      width: 100%;
      height: 480px;
      background: var(--surface-secondary, #18181B);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      margin: 12px;
      width: calc(100% - 24px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .video-container.sharing {
      background: #000000;
      border-style: solid;
      margin: 0;
      width: 100%;
      border-radius: 0;
    }

    :host-context([data-theme="light"]) .video-container:not(.sharing) {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }

    @media (max-width: 640px) {
      .video-container {
        height: 320px;
      }
    }

    .screen-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
    }

    .interruption-banner {
      position: absolute;
      top: 14px;
      left: 14px;
      right: 14px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.9);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .hud-overlay {
      position: absolute;
      bottom: 14px;
      left: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      z-index: 5;
      pointer-events: none;
    }

    .hud-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #F4F4F5;
      font-size: 11px;
      font-weight: 600;
    }

    .fps-tag {
      color: var(--tool-accent, #3B82F6);
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: #34D399;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .hud-tag.has-audio {
      color: #A7F3D0;
      border-color: rgba(52, 211, 153, 0.3);
    }

    /* Idle Placeholder */
    .idle-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px 24px;
      max-width: 440px;
    }

    .idle-icon-wrap {
      width: 68px;
      height: 68px;
      min-width: 68px;
      min-height: 68px;
      flex-shrink: 0;
      aspect-ratio: 1 / 1;
      border-radius: 20px;
      background: var(--surface-secondary, #27272A);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tool-accent, #3B82F6);
      margin-bottom: 18px;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .idle-icon-wrap {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #2563EB;
    }

    .idle-title {
      font-size: 18px;
      font-weight: 700;
      color: #F4F4F5;
      margin: 0 0 8px;
    }

    :host-context([data-theme="light"]) .idle-title {
      color: #0F172A;
    }

    .idle-desc {
      font-size: 13px;
      color: #A1A1AA;
      line-height: 1.5;
      margin: 0 0 16px;
    }

    :host-context([data-theme="light"]) .idle-desc {
      color: #64748B;
    }

    .capability-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 22px;
    }

    .cap-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #D4D4D8;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #F87171;
      font-size: 12px;
      margin-bottom: 16px;
      text-align: left;
    }

    .btn-primary-start {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 22px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px var(--ds-accent-glow, rgba(59, 130, 246, 0.25));
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .btn-primary-start:hover {
      opacity: 0.94;
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

    .keyboard-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted, #71717A);
      padding: 8px 16px 12px;
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

    /* Gallery Card */
    .gallery-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 16px 20px;
    }

    :host-context([data-theme="light"]) .gallery-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .gallery-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .gallery-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .gallery-title-wrap {
      color: #0F172A;
    }

    .gallery-title {
      font-size: 13px;
      font-weight: 700;
    }

    .btn-clear-snaps {
      font-size: 11px;
      background: none;
      border: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
    }

    .btn-clear-snaps:hover {
      color: #F87171;
    }

    .gallery-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .snap-thumbnail-wrap {
      position: relative;
      width: 140px;
      height: 85px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
      background: #000000;
    }

    .snap-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }

    .snap-actions {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 4px;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-around;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .snap-thumbnail-wrap:hover .snap-actions {
      opacity: 1;
    }

    .btn-thumb-action {
      background: none;
      border: none;
      color: #F4F4F5;
      cursor: pointer;
      padding: 2px;
    }

    .btn-thumb-action:hover {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-thumb-action:hover {
      color: #2563EB;
    }

    .btn-thumb-action.delete:hover {
      color: #F87171;
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

    .specs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
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
    }

    :host-context([data-theme="light"]) .spec-v {
      color: #0F172A;
    }

    .spec-v.active {
      color: #34D399;
    }

    .spec-v.highlight {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .spec-v.highlight {
      color: #2563EB;
    }

    .quality-note-box {
      margin-top: 16px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .quality-note-box {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .quality-note-text {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
      margin: 0;
    }

    :host-context([data-theme="light"]) .quality-note-text {
      color: #64748B;
    }

    /* Summary Card */
    .summary-card {
      border-color: rgba(45, 212, 191, 0.3);
      background: var(--ds-accent-soft, rgba(45, 212, 191, 0.04));
    }

    .verdict-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .summary-specs {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    .sum-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }

    .sum-k {
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .sum-k {
      color: #64748B;
    }

    .sum-v {
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .sum-v {
      color: #0F172A;
    }

    /* Guide List */
    .guide-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 14px;
    }

    .guide-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    .guide-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    :host-context([data-theme="light"]) .guide-item {
      border-bottom-color: #F1F5F9;
    }

    .guide-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .guide-title {
      color: #0F172A;
    }

    .guide-desc {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .guide-desc {
      color: #64748B;
    }

    /* Troubleshooting Card */
    .troubleshoot-card {
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 18px 20px;
    }

    :host-context([data-theme="light"]) .troubleshoot-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .tip-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 10px;
    }

    :host-context([data-theme="light"]) .tip-title {
      color: #0F172A;
    }

    .tip-list {
      margin: 0 0 14px;
      padding-left: 18px;
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .tip-list {
      color: #64748B;
    }

    .tip-list li {
      margin-bottom: 6px;
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
      margin-top: 16px;
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

    /* Lightbox Modal */
    .lightbox-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
    }

    .lightbox-modal {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .lightbox-img {
      width: 100%;
      height: auto;
      max-height: 85vh;
      object-fit: contain;
      display: block;
    }

    .btn-close-lightbox {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
  `]
})
export class ScreenShareModuleComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public screen = inject(ScreenShareService);
  private state = inject(DeviceStudioStateService);

  @ViewChild('videoEl') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('viewportContainer') viewportContainerRef!: ElementRef<HTMLDivElement>;

  public readonly metrics = this.screen.metrics;
  public lightboxUrl: string | null = null;

  public readonly headerBadgeText = computed(() => {
    const m = this.metrics();
    if (m.isSharing) {
      return `Transmitting (${m.measuredFps} FPS)`;
    }
    if (m.diagnosticSummary.verdict !== 'untested') {
      return 'Test Completed';
    }
    return 'Ready';
  });

  @HostListener('window:keydown.space', ['$event'])
  public handleSpaceKey(event: Event): void {
    const target = event.target as HTMLElement | null;
    const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (!isEditing) {
      event.preventDefault();
      if (this.metrics().isSharing) {
        this.stopSharing();
      } else {
        this.startSharing();
      }
    }
  }

  public ngOnInit(): void {
    this.state.setActiveTab('screen');
  }

  public ngOnDestroy(): void {
    this.stopSharing();
  }

  public async startSharing(): Promise<void> {
    try {
      const stream = await this.screen.startSharing();
      if (this.videoElementRef?.nativeElement) {
        const videoEl = this.videoElementRef.nativeElement;
        videoEl.srcObject = stream;
        this.screen.attachFpsMonitoring(videoEl);
      }
      this.state.markModuleTested('screen');
      this.state.showToast('Screen sharing active.');
    } catch {}
  }

  public stopSharing(): void {
    const videoEl = this.videoElementRef?.nativeElement;
    if (videoEl) {
      videoEl.srcObject = null;
    }
    this.screen.stopSharing(videoEl);
  }

  public onMetadataLoaded(): void {
    if (this.videoElementRef?.nativeElement) {
      const videoEl = this.videoElementRef.nativeElement;
      videoEl.play().catch(() => {});
      this.screen.attachFpsMonitoring(videoEl);
    }
  }

  public takeSnapshot(): void {
    if (!this.videoElementRef?.nativeElement) return;
    const snap = this.screen.captureSnapshot(this.videoElementRef.nativeElement);
    if (snap) {
      this.state.showToast('Screen frame snapshot captured!');
    }
  }

  public async copySnapshot(index: number): Promise<void> {
    const success = await this.screen.copySnapshotToClipboard(index);
    if (success) {
      this.state.showToast('Snapshot copied to clipboard!');
    }
  }

  public openLightbox(url: string): void {
    this.lightboxUrl = url;
  }

  public closeLightbox(): void {
    this.lightboxUrl = null;
  }

  public toggleFullscreen(): void {
    const el = this.viewportContainerRef?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }

  public formatSurfaceType(surface: string): string {
    switch (surface) {
      case 'monitor': return 'Entire Screen';
      case 'window': return 'Application Window';
      case 'browser': return 'Browser Tab';
      default: return 'Display';
    }
  }

  public goBackToStudio(): void {
    this.stopSharing();
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }
}
