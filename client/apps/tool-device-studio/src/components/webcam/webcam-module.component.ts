// apps/tool-device-studio/src/components/webcam/webcam-module.component.ts
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
import { WebcamService } from '../../services/webcam.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';
import { AckletDropdownComponent, DropdownOption } from '../shared/acklet-dropdown.component';

@Component({
  selector: 'app-webcam-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent, AckletDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="webcam-module-root">
      
      <!-- Top Module Header -->
      <app-device-module-header
        title="Webcam Test"
        icon="camera"
        description="Check your camera video, resolution, and frame rate."
        [badge]="metrics().isStreaming ? 'Working' : 'Offline'"
        [badgeType]="metrics().isStreaming ? 'active' : 'default'"
        (backClicked)="goBackToStudio()"
      >
        @if (metrics().isStreaming) {
          <button type="button" class="btn-snapshot" (click)="takeSnapshot()" title="Capture photo">
            <ts-icon name="camera" [size]="15" />
            <span>Take Photo</span>
          </button>
          <button type="button" class="btn-stop-header" (click)="stopCamera()" title="Stop camera">
            <ts-icon name="power-off" [size]="14" />
            <span>Stop Camera</span>
          </button>
        } @else {
          <button type="button" class="btn-start-header" (click)="startCamera()" title="Start camera">
            <ts-icon name="camera" [size]="15" />
            <span>Start Camera</span>
          </button>
        }
      </app-device-module-header>

      <!-- Main Workspace Grid: Viewport on Left, Hardware Telemetry on Right -->
      <div class="workspace-grid">
        
        <!-- ========================================== -->
        <!-- LEFT COLUMN: Live Camera Viewport & Toolbar -->
        <!-- ========================================== -->
        <div class="viewport-card">
          
          <!-- Viewport Toolbar -->
          <div class="viewport-toolbar">
            <div class="device-select-wrap">
              <app-acklet-dropdown
                [options]="cameraOptions()"
                [value]="metrics().activeDeviceId"
                (valueChange)="onCameraDeviceChange($event)"
                placeholder="Select camera..."
                icon="camera"
                emptyText="No cameras detected"
              />
            </div>

            @if (metrics().isStreaming) {
              <div class="toolbar-actions">
                <!-- Switch Front / Rear Camera if available -->
                @if (devices().length > 1) {
                  <button 
                    type="button" 
                    class="tool-btn" 
                    (click)="toggleFacingMode()"
                    title="Switch front/rear camera"
                    aria-label="Switch camera"
                  >
                    <ts-icon name="refresh-cw" [size]="14" />
                    <span class="btn-text">Flip Cam</span>
                  </button>
                }

                <!-- Mirror Preview Toggle -->
                <button 
                  type="button" 
                  class="tool-btn" 
                  [class.active]="metrics().isMirrored"
                  (click)="webcam.toggleMirror()"
                  title="Flip preview horizontally"
                  aria-label="Mirror preview toggle"
                >
                  <ts-icon name="flip-horizontal" [size]="14" />
                  <span class="btn-text">Mirror</span>
                </button>

                <!-- Fullscreen Toggle -->
                <button 
                  type="button" 
                  class="tool-btn" 
                  (click)="toggleFullscreen()"
                  title="Toggle fullscreen video"
                  aria-label="Fullscreen mode"
                >
                  <ts-icon [name]="isFullscreen() ? 'minimize-2' : 'maximize-2'" [size]="14" />
                </button>
              </div>
            }
          </div>

          <!-- Video Display Viewport -->
          <div #viewportContainer class="video-container" [class.streaming]="metrics().isStreaming" [class.mirrored]="metrics().isMirrored">
            <video
              #videoEl
              autoplay
              playsinline
              muted
              class="webcam-video"
              (loadedmetadata)="onMetadataLoaded()"
            ></video>

            <!-- Live HUD Overlay (when streaming) -->
            @if (metrics().isStreaming) {
              <div class="hud-overlay" role="status" aria-live="off">
                <div class="hud-tag res-tag">
                  <span class="hud-dot"></span>
                  <span>{{ metrics().resolution.label }}</span>
                </div>
                
                <div class="hud-tag fps-tag">
                  <span>{{ metrics().frameRate }} FPS</span>
                </div>
                
                <div class="hud-tag" [attr.data-exposure]="metrics().exposureRating">
                  <ts-icon name="sun" [size]="12" />
                  <span>{{ metrics().brightness }}% ({{ metrics().exposureRating }})</span>
                </div>

                <div class="hud-tag grade-tag">
                  <span>Grade {{ metrics().qualityAssessment.grade }}</span>
                </div>
              </div>

              <!-- Stream Paused Alert -->
              @if (metrics().streamState === 'paused') {
                <div class="stream-paused-banner">
                  <ts-icon name="circle-alert" [size]="16" />
                  <span>Hardware stream paused or obscured by system privacy control.</span>
                </div>
              }
            } @else {
              <!-- Idle / Offline State Placeholder -->
              <div class="idle-placeholder">
                <div class="idle-icon-wrap">
                  <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'circle-alert' : 'camera'" [size]="34" />
                </div>
                <h3 class="idle-title">{{ metrics().permissionStatus === 'denied' ? 'Camera Permission Blocked' : 'Camera Ready to Test' }}</h3>
                <p class="idle-desc">
                  {{ metrics().permissionStatus === 'denied' 
                    ? 'Camera access was blocked by your browser. Please allow camera permissions in your address bar to continue.' 
                    : 'Click start to preview your video feed locally and inspect resolution, frame rate, and lighting.' }}
                </p>

                <!-- Detailed Error / Permission Block Alert -->
                @if (metrics().errorMessage) {
                  <div class="error-banner" role="alert">
                    <ts-icon name="circle-alert" [size]="18" class="error-icon" />
                    <div class="error-content">
                      <strong class="error-title">Camera Access Notice</strong>
                      <p class="error-msg">{{ metrics().errorMessage }}</p>
                    </div>
                  </div>
                }

                <div class="idle-actions">
                  <button type="button" class="btn-primary-start" (click)="startCamera()">
                    <ts-icon [name]="metrics().permissionStatus === 'denied' ? 'refresh-cw' : 'camera'" [size]="17" />
                    <span>{{ metrics().permissionStatus === 'denied' ? 'Try Again' : 'Start Camera Test' }}</span>
                  </button>
                </div>

                <div class="privacy-reassurance">
                  <ts-icon name="shield-check" [size]="13" />
                  <span>Zero-Upload Guarantee: Video frames stay in local browser memory.</span>
                </div>
              </div>
            }
          </div>

          <!-- Viewport Footer Controls -->
          @if (metrics().isStreaming) {
            <div class="viewport-footer">
              <div class="stream-status">
                <span class="pulse-indicator"></span>
                <span>Live Feed • {{ metrics().resolution.width }}×{{ metrics().resolution.height }} • {{ metrics().frameRate }} FPS</span>
              </div>
              
              <div class="action-row">
                <button type="button" class="btn-action-snap" (click)="takeSnapshot()" title="Take snapshot photo">
                  <ts-icon name="camera" [size]="15" />
                  <span>Take Photo</span>
                </button>
                <button type="button" class="btn-action-stop" (click)="stopCamera()" title="Stop active stream">
                  <ts-icon name="power-off" [size]="15" />
                  <span>Stop Camera</span>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- ========================================== -->
        <!-- RIGHT COLUMN: Status, Photos & Details -->
        <!-- ========================================== -->
        <div class="side-column">
          
          <!-- Outcome Card: Camera Status -->
          <div class="spec-card">
            <h3 class="card-heading">Camera Status</h3>

            <div class="outcome-list">
              <div class="outcome-row">
                <span class="outcome-k">Status</span>
                <span class="outcome-v" [class.working]="metrics().isStreaming">
                  {{ metrics().isStreaming ? 'Working' : 'Offline' }}
                </span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Resolution</span>
                <span class="outcome-v highlight">{{ metrics().resolution.label || '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Frame Rate</span>
                <span class="outcome-v">{{ metrics().frameRate ? metrics().frameRate + ' FPS' : '--' }}</span>
              </div>
              <div class="outcome-row">
                <span class="outcome-k">Lighting</span>
                <span class="outcome-v capitalize" [attr.data-exposure]="metrics().isStreaming ? metrics().exposureRating : null">
                  {{ metrics().isStreaming ? (metrics().exposureRating || '--') : '--' }}
                </span>
              </div>
            </div>

            @if (metrics().isStreaming) {
              <button type="button" class="btn-action-snap-full" (click)="takeSnapshot()">
                <ts-icon name="camera" [size]="15" />
                <span>Take Photo</span>
              </button>
            }
          </div>

          <!-- Captured Snapshots Gallery (if any photos exist) -->
          @if (metrics().snapshots.length > 0) {
            <div class="spec-card snapshots-card">
              <div class="gallery-header">
                <div class="gallery-title-wrap">
                  <h3 class="card-heading">Photos</h3>
                  <span class="snap-count">{{ metrics().snapshots.length }}</span>
                </div>
                <button type="button" class="btn-clear-snaps" (click)="clearAllSnapshots()" title="Clear all photos">
                  Clear All
                </button>
              </div>

              <div class="snaps-grid">
                @for (snap of metrics().snapshots; track snap; let i = $index) {
                  <div class="snap-thumb-wrap">
                    <img [src]="snap" alt="Captured Webcam Frame" class="snap-img" (click)="openLightbox(i)" />
                    <div class="snap-actions">
                      <button type="button" class="snap-btn inspect" (click)="openLightbox(i)" title="Inspect photo">
                        <ts-icon name="maximize-2" [size]="12" />
                      </button>
                      <button type="button" class="snap-btn copy" (click)="copySnapshot(i)" title="Copy to clipboard">
                        <ts-icon name="copy" [size]="12" />
                      </button>
                      <a [href]="snap" [download]="'acklet-snapshot-' + (i + 1) + '.png'" class="snap-btn download" title="Download PNG">
                        <ts-icon name="download" [size]="12" />
                      </a>
                      <button type="button" class="snap-btn delete" (click)="deleteSnapshot(i)" title="Delete photo">
                        <ts-icon name="trash-2" [size]="12" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

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
                  <span class="spec-k">Camera Name</span>
                  <span class="spec-v device-name-val" [title]="metrics().activeDeviceLabel">
                    {{ metrics().activeDeviceLabel || 'Default Camera' }}
                  </span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Dimensions</span>
                  <span class="spec-v">
                    {{ metrics().resolution.width ? metrics().resolution.width + ' × ' + metrics().resolution.height : '--' }}
                  </span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Aspect Ratio</span>
                  <span class="spec-v">{{ metrics().resolution.aspectRatio }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Color Temp</span>
                  <span class="spec-v capitalize">{{ metrics().qualityAssessment.colorTemperature }} (~{{ metrics().qualityAssessment.colorTempKelvinApprox }}K)</span>
                </div>
                <div class="spec-row">
                  <span class="spec-k">Facing Direction</span>
                  <span class="spec-v capitalize">{{ metrics().facingMode || 'User' }}</span>
                </div>
              </div>

              @if (metrics().capabilities) {
                <div class="capabilities-section">
                  <span class="cap-title">Hardware Capabilities:</span>
                  <div class="caps-tags">
                    @if (metrics().capabilities?.zoom) {
                      <span class="cap-pill">Zoom ({{ metrics().capabilities?.zoom?.min }}×–{{ metrics().capabilities?.zoom?.max }}×)</span>
                    }
                    @if (metrics().capabilities?.focusMode?.length) {
                      <span class="cap-pill">Focus: {{ metrics().capabilities?.focusMode?.join(', ') }}</span>
                    }
                    @if (metrics().capabilities?.exposureMode?.length) {
                      <span class="cap-pill">Exposure: {{ metrics().capabilities?.exposureMode?.join(', ') }}</span>
                    }
                    @if (metrics().capabilities?.torch) {
                      <span class="cap-pill">Torch / Flash</span>
                    }
                  </div>
                </div>
              }

              <!-- Lighting & Sharpness Analysis -->
              <div class="intel-meters">
                <div class="meter-block">
                  <div class="meter-label-row">
                    <span class="meter-name">Exposure Balance</span>
                    <span class="meter-val capitalize">{{ metrics().exposureRating }} ({{ metrics().brightness }}%)</span>
                  </div>
                  <div class="meter-track">
                    <div class="meter-fill exposure-bar" [style.width.%]="metrics().brightness"></div>
                  </div>
                </div>

                <div class="meter-block">
                  <div class="meter-label-row">
                    <span class="meter-name">Sharpness & Clarity</span>
                    <span class="meter-val capitalize">{{ metrics().qualityAssessment.clarityRating }} ({{ metrics().qualityAssessment.clarityScore }}%)</span>
                  </div>
                  <div class="meter-track">
                    <div class="meter-fill clarity-bar" [style.width.%]="metrics().qualityAssessment.clarityScore"></div>
                  </div>
                </div>
              </div>

              <!-- Resolution Ladder -->
              <div class="ladder-wrap">
                <span class="cap-title">Resolution Standards:</span>
                <div class="resolution-ladder">
                  @for (tier of metrics().resolutionLadder; track tier.id) {
                    <div 
                      class="ladder-row" 
                      [class.current]="tier.isCurrent"
                      [class.achieved]="tier.isAchieved"
                    >
                      <div class="tier-info">
                        <span class="tier-label">{{ tier.label }}</span>
                        <span class="tier-sub">{{ tier.width }}×{{ tier.height }}</span>
                      </div>
                      <div class="tier-status">
                        @if (tier.isAchieved) {
                          <ts-icon name="check" [size]="14" class="check-achieved" />
                        } @else {
                          <span class="dash-dim">—</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Troubleshooting -->
              <div class="troubleshoot-sub">
                <span class="cap-title">Troubleshooting:</span>
                <ul class="tip-list-simple">
                  <li>Check if another app (Zoom, Teams, Meet) is using the camera.</li>
                  <li>Verify the physical privacy shutter on your camera is open.</li>
                  <li>Click the lock icon in your browser address bar to ensure camera access is allowed.</li>
                </ul>
              </div>
            </div>
          </details>

        </div>

      </div>

      <!-- ========================================== -->
      <!-- LIGHTBOX MODAL: Inspect Captured Snapshot -->
      <!-- ========================================== -->
      @if (activeLightboxIndex() !== null && selectedSnapshotUrl()) {
        <div class="lightbox-backdrop" (click)="closeLightbox()" role="dialog" aria-modal="true" aria-label="Inspect Photo">
          <div class="lightbox-modal" (click)="$event.stopPropagation()">
            
            <div class="lightbox-header">
              <div class="lightbox-title-wrap">
                <h3 class="lightbox-title">Photo Preview #{{ (activeLightboxIndex() || 0) + 1 }}</h3>
                <span class="lightbox-meta">{{ metrics().resolution.label }}</span>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeLightbox()" title="Close (Esc)">
                <ts-icon name="rotate-ccw" [size]="14" />
                <span>Close</span>
              </button>
            </div>

            <div class="lightbox-body">
              <img [src]="selectedSnapshotUrl()" alt="Enlarged Webcam Snapshot" class="lightbox-img" />
            </div>

            <div class="lightbox-footer">
              <div class="lightbox-actions-left">
                <button type="button" class="btn-modal-action" (click)="copySnapshot(activeLightboxIndex()!)">
                  <ts-icon name="copy" [size]="14" />
                  <span>Copy Image</span>
                </button>
                <a [href]="selectedSnapshotUrl()" [download]="'acklet-snapshot-' + (activeLightboxIndex()! + 1) + '.png'" class="btn-modal-action download">
                  <ts-icon name="download" [size]="14" />
                  <span>Download PNG</span>
                </a>
              </div>
              
              <div class="lightbox-actions-right">
                <button type="button" class="btn-modal-delete" (click)="deleteCurrentLightboxPhoto()">
                  <ts-icon name="trash-2" [size]="14" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `,
  styleUrls: ['../../styles/device-studio-tokens.css'],
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .webcam-module-root {
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

    .btn-snapshot,
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

    .btn-snapshot {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
    }

    :host-context([data-theme="light"]) .btn-snapshot {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.22);
      color: #2563EB;
    }

    .btn-snapshot:hover {
      background: var(--ds-accent-border, rgba(59, 130, 246, 0.24));
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

    /* Viewport Card */
    .viewport-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #A1A1AA);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tool-btn:hover,
    .tool-btn.active {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.3));
    }

    :host-context([data-theme="light"]) .viewport-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="light"]) .viewport-toolbar {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .tool-btn {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #475569;
    }

    :host-context([data-theme="light"]) .tool-btn:hover,
    :host-context([data-theme="light"]) .tool-btn.active {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    /* Video Viewport */
    .video-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--surface-secondary, #18181B);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .video-container.streaming {
      background: #000000;
      border-style: solid;
    }

    :host-context([data-theme="light"]) .video-container:not(.streaming) {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }

    .webcam-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000000;
      opacity: 0;
      pointer-events: none;
    }

    .video-container.streaming .webcam-video {
      opacity: 1;
      pointer-events: auto;
    }

    .video-container.mirrored .webcam-video {
      transform: scaleX(-1);
    }

    /* HUD Overlay */
    .hud-overlay {
      position: absolute;
      top: 14px;
      left: 14px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      z-index: 2;
    }

    .hud-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 9999px;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #F4F4F5;
      font-size: 11.5px;
      font-weight: 600;
    }

    .hud-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ds-pass, #34D399);
      box-shadow: 0 0 8px var(--ds-pass, #34D399);
    }

    .hud-tag[data-exposure="underexposed"] {
      border-color: rgba(251, 191, 36, 0.45);
      color: #FBBF24;
    }

    .hud-tag[data-exposure="overexposed"] {
      border-color: rgba(248, 113, 113, 0.45);
      color: #F87171;
    }

    .hud-tag.grade-tag {
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--ds-accent, #3B82F6);
    }

    .stream-paused-banner {
      position: absolute;
      bottom: 14px;
      left: 14px;
      right: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.35);
      color: #FDE68A;
      font-size: 12.5px;
      font-weight: 500;
      backdrop-filter: blur(6px);
      z-index: 2;
    }

    /* Idle Placeholder */
    .idle-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 36px 20px;
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
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.25));
      color: var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .idle-icon-wrap {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .idle-title {
      font-size: 19px;
      font-weight: 700;
      color: #F4F4F5;
      margin: 0 0 8px;
    }

    :host-context([data-theme="light"]) .idle-title {
      color: #0F172A;
    }

    .idle-desc {
      font-size: 13.5px;
      color: #A1A1AA;
      margin: 0 0 20px;
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
      background: rgba(248, 113, 113, 0.12);
      border: 1px solid rgba(248, 113, 113, 0.35);
      color: #FCA5A5;
      font-size: 12px;
      margin-bottom: 20px;
      text-align: left;
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
      transition: all 0.16s ease;
      box-shadow: 0 4px 14px var(--ds-accent-glow, rgba(59, 130, 246, 0.25));
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

    .btn-action-snap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-action-snap {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
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

    /* ============================== */
    /* Side Column: Cards & Diagnostics */
    /* ============================== */
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

    /* Meters */
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

    .meter-val[data-exposure="underexposed"] {
      color: var(--ds-warn, #FBBF24);
    }

    .meter-val[data-exposure="overexposed"] {
      color: var(--ds-fail, #F87171);
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

    .exposure-bar {
      background: linear-gradient(90deg, #FBBF24 0%, #34D399 50%, #F87171 100%);
    }

    .clarity-bar {
      background: var(--ds-accent, #3B82F6);
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

    :host-context([data-theme="light"]) .chip-v {
      color: #0F172A;
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

    .stream-status-val.active {
      color: var(--ds-pass, #34D399);
    }

    .capabilities-section {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    .cap-title {
      display: block;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      margin-bottom: 6px;
    }

    .caps-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .cap-pill {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--text-2, #A1A1AA);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    /* Resolution Ladder */
    .resolution-ladder {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ladder-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.06));
      opacity: 0.65;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .ladder-row {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .ladder-row.achieved {
      opacity: 1;
    }

    .ladder-row.current {
      opacity: 1;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.35));
    }

    .tier-info {
      display: flex;
      flex-direction: column;
    }

    .tier-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tier-label {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .tier-label {
      color: #0F172A;
    }

    .active-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 9999px;
      background: var(--ds-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .active-tag {
      background: #2563EB;
      color: #FFFFFF;
    }

    .tier-sub {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      margin-top: 2px;
    }

    .tier-status {
      display: flex;
      align-items: center;
    }

    .check-achieved {
      color: var(--ds-pass, #34D399);
    }

    .dash-dim {
      color: var(--text-3, #52525B);
    }

    /* Snapshots Gallery */
    .snapshots-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gallery-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .gallery-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .snap-count {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 9999px;
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--text-2, #A1A1AA);
    }

    .btn-clear-snaps {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
    }

    .btn-clear-snaps:hover {
      color: var(--ds-fail, #F87171);
    }

    .empty-snaps {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 22px 14px;
      border-radius: 10px;
      border: 1px dashed var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text-2, #71717A);
      font-size: 12px;
      text-align: center;
    }

    .snaps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 10px;
    }

    .snap-thumb-wrap {
      position: relative;
      aspect-ratio: 16 / 9;
      border-radius: 8px;
      overflow: hidden;
      background: #09090B;
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .snap-thumb-wrap {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .snap-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }

    .snap-thumb-wrap:hover .snap-img {
      transform: scale(1.05);
    }

    .snap-actions {
      position: absolute;
      inset: 0;
      background: rgba(9, 9, 11, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .snap-thumb-wrap:hover .snap-actions {
      opacity: 1;
    }

    .snap-btn {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      text-decoration: none;
    }

    .snap-btn:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    .snap-btn.delete:hover {
      background: var(--ds-fail, #EF4444);
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

    .btn-action-snap-full {
      width: 100%;
      margin-top: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      color: var(--tool-accent, #3B82F6);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.16s ease;
    }

    .btn-action-snap-full:hover {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .btn-action-snap-full {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .btn-action-snap-full:hover {
      background: #2563EB;
      color: #FFFFFF;
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

    .ladder-wrap {
      margin-top: 18px;
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

    /* Lightbox Modal */
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .lightbox-modal {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.14));
      border-radius: 16px;
      max-width: 860px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
    }

    :host-context([data-theme="light"]) .lightbox-modal {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .lightbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    .lightbox-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .lightbox-title {
      color: #0F172A;
    }

    .lightbox-meta {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      margin-left: 8px;
    }

    .btn-close-modal {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #A1A1AA);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .lightbox-body {
      width: 100%;
      max-height: 60vh;
      background: #09090B;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .lightbox-img {
      max-width: 100%;
      max-height: 60vh;
      object-fit: contain;
    }

    .lightbox-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    .lightbox-actions-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-modal-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.3));
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }

    :host-context([data-theme="light"]) .btn-modal-action {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .btn-modal-action.download {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
    }

    :host-context([data-theme="light"]) .btn-modal-action.download {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-modal-delete {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      color: var(--ds-fail, #F87171);
      border: 1px solid var(--ds-fail-border, rgba(248, 113, 113, 0.28));
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class WebcamModuleComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public webcam = inject(WebcamService);
  private state = inject(DeviceStudioStateService);

  @ViewChild('videoEl') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('viewportContainer') viewportContainerRef!: ElementRef<HTMLDivElement>;

  public readonly metrics = this.webcam.metrics;
  public readonly devices = this.webcam.availableDevices;

  public readonly cameraOptions = computed<DropdownOption[]>(() => {
    const devs = this.devices();
    if (devs.length === 0 || this.metrics().permissionStatus !== 'granted') {
      return [{ value: '', label: 'Default System Camera', icon: 'camera' }];
    }
    return devs.map((d, index) => ({
      value: d.deviceId,
      label: d.label && d.label.trim().length > 0 ? d.label : `Camera ${index + 1}`,
      icon: 'camera'
    }));
  });

  public readonly activeLightboxIndex = signal<number | null>(null);
  public readonly selectedSnapshotUrl = computed<string | null>(() => {
    const idx = this.activeLightboxIndex();
    if (idx === null) return null;
    return this.metrics().snapshots[idx] || null;
  });

  public readonly isFullscreen = signal<boolean>(false);
  private frameAnalysisLoopId: number | null = null;

  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Escape') {
      if (this.activeLightboxIndex() !== null) {
        this.closeLightbox();
      }
    } else if (event.code === 'Space' && this.metrics().isStreaming && this.activeLightboxIndex() === null) {
      // Avoid space triggering snapshot if focused on input/select
      const activeEl = document.activeElement?.tagName.toLowerCase();
      if (activeEl !== 'input' && activeEl !== 'select' && activeEl !== 'button') {
        event.preventDefault();
        this.takeSnapshot();
      }
    }
  }

  public async ngOnInit(): Promise<void> {
    this.state.setActiveTab('webcam');
    await this.webcam.loadDevices();
  }

  public ngOnDestroy(): void {
    if (this.frameAnalysisLoopId !== null) {
      cancelAnimationFrame(this.frameAnalysisLoopId);
      this.frameAnalysisLoopId = null;
    }
    this.webcam.stopStream();
  }

  public async startCamera(deviceId?: string): Promise<void> {
    try {
      const stream = await this.webcam.startStream(deviceId);
      if (this.videoElementRef?.nativeElement) {
        this.videoElementRef.nativeElement.srcObject = stream;
      }
      this.state.markModuleTested('webcam');
      this.startFrameAnalysis();
      this.state.showToast('Camera stream active.');
    } catch {
      // Error handled inside WebcamService state
    }
  }

  public stopCamera(): void {
    if (this.videoElementRef?.nativeElement) {
      this.videoElementRef.nativeElement.srcObject = null;
    }
    this.webcam.stopStream();
    if (this.frameAnalysisLoopId !== null) {
      cancelAnimationFrame(this.frameAnalysisLoopId);
      this.frameAnalysisLoopId = null;
    }
    this.state.showToast('Camera stopped.');
  }

  public onCameraDeviceChange(deviceId: string): void {
    if (deviceId) {
      this.startCamera(deviceId);
    }
  }

  public onDeviceSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.startCamera(select.value);
    }
  }

  public async toggleFacingMode(): Promise<void> {
    await this.webcam.toggleFacingMode();
    if (this.videoElementRef?.nativeElement && this.metrics().isStreaming) {
      // Stream is re-established in WebcamService
      this.state.showToast(`Switched to ${this.metrics().facingMode} camera.`);
    }
  }

  public onMetadataLoaded(): void {
    if (this.videoElementRef?.nativeElement) {
      this.videoElementRef.nativeElement.play().catch(() => {});
    }
  }

  public takeSnapshot(): void {
    if (!this.videoElementRef?.nativeElement) return;
    const snap = this.webcam.captureSnapshot(this.videoElementRef.nativeElement);
    if (snap) {
      this.state.showToast('Photo captured!');
    }
  }

  public openLightbox(index: number): void {
    this.activeLightboxIndex.set(index);
  }

  public closeLightbox(): void {
    this.activeLightboxIndex.set(null);
  }

  public async copySnapshot(index: number): Promise<void> {
    const success = await this.webcam.copySnapshotToClipboard(index);
    if (success) {
      this.state.showToast('Photo copied to clipboard!');
    } else {
      this.state.showToast('Unable to copy photo directly; use download instead.');
    }
  }

  public deleteSnapshot(index: number): void {
    this.webcam.deleteSnapshot(index);
    this.state.showToast('Photo deleted.');
  }

  public deleteCurrentLightboxPhoto(): void {
    const idx = this.activeLightboxIndex();
    if (idx !== null) {
      this.webcam.deleteSnapshot(idx);
      this.closeLightbox();
      this.state.showToast('Photo deleted.');
    }
  }

  public clearAllSnapshots(): void {
    this.webcam.clearAllSnapshots();
    this.closeLightbox();
    this.state.showToast('All photos cleared.');
  }

  public toggleFullscreen(): void {
    const el = this.viewportContainerRef?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => this.isFullscreen.set(false)).catch(() => {});
    } else {
      el.requestFullscreen().then(() => this.isFullscreen.set(true)).catch(() => {});
    }
  }

  public goBackToStudio(): void {
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }

  private startFrameAnalysis(): void {
    const loop = () => {
      if (this.metrics().isStreaming && this.videoElementRef?.nativeElement) {
        this.webcam.analyzeFrame(this.videoElementRef.nativeElement);
      }
      this.frameAnalysisLoopId = requestAnimationFrame(loop);
    };
    this.frameAnalysisLoopId = requestAnimationFrame(loop);
  }
}
