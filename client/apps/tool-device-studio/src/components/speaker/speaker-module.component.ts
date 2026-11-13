// apps/tool-device-studio/src/components/speaker/speaker-module.component.ts
import {
  Component,
  inject,
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
import { SpeakerService } from '../../services/speaker.service';
import { DeviceStudioStateService } from '../../services/device-studio-state.service';
import { DiagnosticReportService } from '../../services/diagnostic-report.service';
import { DeviceModuleHeaderComponent } from '../shared/module-header.component';
import { SpeakerConfirmationStatus } from '../../models/device.models';
import { AckletDropdownComponent, DropdownOption } from '../shared/acklet-dropdown.component';

@Component({
  selector: 'app-speaker-module',
  standalone: true,
  imports: [CommonModule, TsIconComponent, DeviceModuleHeaderComponent, AckletDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="speaker-module-root">

      <!-- Top Module Header -->
      <app-device-module-header
        title="Speaker & Headphone Test"
        icon="headphones"
        description="Test your stereo sound, left and right channels, and volume balance."
        [badge]="metrics().isPlaying ? 'Playing Audio' : 'Ready'"
        [badgeType]="metrics().isPlaying ? 'active' : 'default'"
        (backClicked)="goBackToStudio()"
      >
        @if (metrics().isPlaying) {
          <button type="button" class="btn-stop-audio" (click)="stopAudio()" title="Stop audio">
            <ts-icon name="volume-x" [size]="15" />
            <span>Stop Sound</span>
          </button>
        }
      </app-device-module-header>

      <!-- Main Workspace Grid -->
      <div class="workspace-grid">

        <!-- ========================================== -->
        <!-- LEFT COLUMN: Stereo Stage & Frequency Workbench -->
        <!-- ========================================== -->
        <div class="main-column">

          <!-- Mode Tabs: Step-by-Step Test (Default) vs Free-Form Workbench -->
          <div class="mode-tabs-bar">
            <button
              type="button"
              class="mode-tab-btn"
              [class.active]="activeTab() === 'guided'"
              (click)="activeTab.set('guided')"
            >
              Step-by-Step Test
            </button>
            <button
              type="button"
              class="mode-tab-btn"
              [class.active]="activeTab() === 'workbench'"
              (click)="activeTab.set('workbench')"
            >
              Stereo & Sound Test
            </button>
          </div>

          <!-- TAB 1: GUIDED 5-STEP TEST WIZARD (DEFAULT) -->
          @if (activeTab() === 'guided') {

            <div class="tool-card wizard-card">
              <!-- Wizard Progress Header -->
              <div class="wizard-header">
                <div class="wizard-progress-pills" role="tablist" aria-label="Testing Steps">
                  <button
                    type="button"
                    class="wiz-pill"
                    [class.done]="wizardStep() > 1"
                    [class.active]="wizardStep() === 1"
                    (click)="setWizardStep(1)"
                  >
                    @if (wizardStep() > 1) { <ts-icon name="check" [size]="11" /> }
                    <span>1. Output Device</span>
                  </button>

                  <button
                    type="button"
                    class="wiz-pill"
                    [class.done]="metrics().confirmations.leftConfirmed !== null && wizardStep() > 2"
                    [class.active]="wizardStep() === 2"
                    (click)="setWizardStep(2)"
                  >
                    @if (metrics().confirmations.leftConfirmed !== null && wizardStep() > 2) { <ts-icon name="check" [size]="11" /> }
                    <span>2. Left Channel</span>
                  </button>

                  <button
                    type="button"
                    class="wiz-pill"
                    [class.done]="metrics().confirmations.rightConfirmed !== null && wizardStep() > 3"
                    [class.active]="wizardStep() === 3"
                    (click)="setWizardStep(3)"
                  >
                    @if (metrics().confirmations.rightConfirmed !== null && wizardStep() > 3) { <ts-icon name="check" [size]="11" /> }
                    <span>3. Right Channel</span>
                  </button>

                  <button
                    type="button"
                    class="wiz-pill"
                    [class.done]="metrics().confirmations.stereoConfirmed !== null && wizardStep() > 4"
                    [class.active]="wizardStep() === 4"
                    (click)="setWizardStep(4)"
                  >
                    @if (metrics().confirmations.stereoConfirmed !== null && wizardStep() > 4) { <ts-icon name="check" [size]="11" /> }
                    <span>4. Stereo Output</span>
                  </button>

                  <button
                    type="button"
                    class="wiz-pill"
                    [class.done]="metrics().confirmations.frequenciesConfirmed !== null && wizardStep() > 5"
                    [class.active]="wizardStep() === 5"
                    (click)="setWizardStep(5)"
                  >
                    @if (metrics().confirmations.frequenciesConfirmed !== null && wizardStep() > 5) { <ts-icon name="check" [size]="11" /> }
                    <span>5. Frequency Test</span>
                  </button>

                  @if (wizardStep() === 6) {
                    <button type="button" class="wiz-pill active results-pill" (click)="setWizardStep(6)">
                      <ts-icon name="check-circle" [size]="11" />
                      <span>Results</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Wizard Step Content (Steps 1 to 5) -->
              @if (wizardStep() <= 5) {
                <div class="wizard-step-content">
                  @switch (wizardStep()) {

                    <!-- STEP 1: Output Device Selection -->
                    @case (1) {
                      <div class="step-view">
                        <div class="step-heading-group">
                          <span class="step-num-badge">STEP 1 OF 5</span>
                          <h4 class="step-title">Select Output Device</h4>
                          <p class="step-desc">Verify your headphones or external speakers are connected and selected as the active playback device.</p>
                        </div>

                        <div class="step-interactive-area">
                          <div class="active-dev-box">
                            <div class="dev-box-icon">
                              <ts-icon [name]="activeDeviceType() === 'headphones' ? 'headphones' : 'volume-2'" [size]="22" />
                            </div>
                            <div class="dev-box-info">
                              <span class="dev-box-type">{{ activeDeviceType() === 'headphones' ? 'Connected Headphones' : 'Audio Output Device' }}</span>
                              <strong class="dev-box-name" [title]="metrics().activeOutputDeviceLabel">{{ metrics().activeOutputDeviceLabel || 'Default Device' }}</strong>
                            </div>
                            <button type="button" class="btn-rescan-dev" (click)="detectHeadphones()" title="Scan for newly plugged-in headphones">
                              <ts-icon name="refresh-cw" [size]="13" />
                              <span>Rescan</span>
                            </button>
                          </div>
                        </div>

                        <div class="step-footer-actions">
                          <button type="button" class="btn-step-primary" (click)="startStepTest(2)">
                            <span>Start Test &rarr;</span>
                          </button>
                        </div>
                      </div>
                    }

                    <!-- STEP 2: Left Channel Test -->
                    @case (2) {
                      <div class="step-view">
                        <div class="step-heading-group">
                          <span class="step-num-badge">STEP 2 OF 5</span>
                          <h4 class="step-title">Left Channel Test</h4>
                          <p class="step-desc">Play the bell chime to verify that sound is heard exclusively in your left ear or left speaker.</p>
                        </div>

                        <div class="step-interactive-area">
                          <div class="channel-visual-stage">
                            <div class="speaker-cone-visual left" [class.active]="metrics().currentMode === 'left'">
                              <div class="cone-symbol">
                                <ts-icon name="volume-2" [size]="28" />
                              </div>
                              <span class="cone-label">LEFT EAR</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            class="btn-step-play"
                            [class.playing]="metrics().currentMode === 'left'"
                            (click)="testChannel('left')"
                          >
                            <ts-icon [name]="metrics().currentMode === 'left' ? 'pause' : 'play'" [size]="16" />
                            <span>{{ metrics().currentMode === 'left' ? 'Stop Left Chime' : 'Play Left Chime' }}</span>
                          </button>

                          <div class="confirm-box">
                            <span class="confirm-prompt">Did you hear the bell chime clearly in your LEFT ear?</span>
                            <div class="confirm-btns">
                              <button
                                type="button"
                                class="btn-confirm yes"
                                [class.selected]="metrics().confirmations.leftConfirmed === true"
                                (click)="handleWizardConfirm('leftConfirmed', true, 3)"
                              >
                                <ts-icon name="check" [size]="14" />
                                <span>Yes, Heard in Left</span>
                              </button>
                              <button
                                type="button"
                                class="btn-confirm no"
                                [class.selected]="metrics().confirmations.leftConfirmed === false"
                                (click)="handleWizardConfirm('leftConfirmed', false, 3)"
                              >
                                <ts-icon name="x" [size]="14" />
                                <span>No, Not Heard / Wrong Ear</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class="step-footer-actions">
                          <button type="button" class="btn-step-secondary" (click)="setWizardStep(1)">
                            <span>&larr; Previous</span>
                          </button>
                          @if (metrics().confirmations.leftConfirmed !== null) {
                            <button type="button" class="btn-step-primary" (click)="setWizardStep(3)">
                              <span>Next: Right Channel &rarr;</span>
                            </button>
                          }
                        </div>
                      </div>
                    }

                    <!-- STEP 3: Right Channel Test -->
                    @case (3) {
                      <div class="step-view">
                        <div class="step-heading-group">
                          <span class="step-num-badge">STEP 3 OF 5</span>
                          <h4 class="step-title">Right Channel Test</h4>
                          <p class="step-desc">Play the bell chime to verify that sound is heard exclusively in your right ear or right speaker.</p>
                        </div>

                        <div class="step-interactive-area">
                          <div class="channel-visual-stage">
                            <div class="speaker-cone-visual right" [class.active]="metrics().currentMode === 'right'">
                              <div class="cone-symbol">
                                <ts-icon name="volume-2" [size]="28" />
                              </div>
                              <span class="cone-label">RIGHT EAR</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            class="btn-step-play"
                            [class.playing]="metrics().currentMode === 'right'"
                            (click)="testChannel('right')"
                          >
                            <ts-icon [name]="metrics().currentMode === 'right' ? 'pause' : 'play'" [size]="16" />
                            <span>{{ metrics().currentMode === 'right' ? 'Stop Right Chime' : 'Play Right Chime' }}</span>
                          </button>

                          <div class="confirm-box">
                            <span class="confirm-prompt">Did you hear the bell chime clearly in your RIGHT ear?</span>
                            <div class="confirm-btns">
                              <button
                                type="button"
                                class="btn-confirm yes"
                                [class.selected]="metrics().confirmations.rightConfirmed === true"
                                (click)="handleWizardConfirm('rightConfirmed', true, 4)"
                              >
                                <ts-icon name="check" [size]="14" />
                                <span>Yes, Heard in Right</span>
                              </button>
                              <button
                                type="button"
                                class="btn-confirm no"
                                [class.selected]="metrics().confirmations.rightConfirmed === false"
                                (click)="handleWizardConfirm('rightConfirmed', false, 4)"
                              >
                                <ts-icon name="x" [size]="14" />
                                <span>No, Not Heard / Wrong Ear</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class="step-footer-actions">
                          <button type="button" class="btn-step-secondary" (click)="setWizardStep(2)">
                            <span>&larr; Previous</span>
                          </button>
                          @if (metrics().confirmations.rightConfirmed !== null) {
                            <button type="button" class="btn-step-primary" (click)="setWizardStep(4)">
                              <span>Next: Stereo Output &rarr;</span>
                            </button>
                          }
                        </div>
                      </div>
                    }

                    <!-- STEP 4: Stereo Output Test -->
                    @case (4) {
                      <div class="step-view">
                        <div class="step-heading-group">
                          <span class="step-num-badge">STEP 4 OF 5</span>
                          <h4 class="step-title">Stereo Output Test</h4>
                          <p class="step-desc">Both channels will sound simultaneously. Confirm that stereo playback is centered and balanced across both ears.</p>
                        </div>

                        <div class="step-interactive-area">
                          <div class="channel-visual-stage stereo">
                            <div class="speaker-cone-visual stereo" [class.active]="metrics().currentMode === 'stereo'">
                              <div class="cone-symbol">
                                <ts-icon name="headphones" [size]="32" />
                              </div>
                              <span class="cone-label">STEREO (BOTH CHANNELS)</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            class="btn-step-play"
                            [class.playing]="metrics().currentMode === 'stereo'"
                            (click)="testChannel('stereo')"
                          >
                            <ts-icon [name]="metrics().currentMode === 'stereo' ? 'pause' : 'play'" [size]="16" />
                            <span>{{ metrics().currentMode === 'stereo' ? 'Stop Stereo Chime' : 'Play Stereo Chime' }}</span>
                          </button>

                          <div class="confirm-box">
                            <span class="confirm-prompt">Did you hear balanced audio in BOTH ears?</span>
                            <div class="confirm-btns">
                              <button
                                type="button"
                                class="btn-confirm yes"
                                [class.selected]="metrics().confirmations.stereoConfirmed === true"
                                (click)="handleWizardConfirm('stereoConfirmed', true, 5)"
                              >
                                <ts-icon name="check" [size]="14" />
                                <span>Yes, Balanced Stereo</span>
                              </button>
                              <button
                                type="button"
                                class="btn-confirm no"
                                [class.selected]="metrics().confirmations.stereoConfirmed === false"
                                (click)="handleWizardConfirm('stereoConfirmed', false, 5)"
                              >
                                <ts-icon name="x" [size]="14" />
                                <span>No, One Side Muted / Imbalanced</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class="step-footer-actions">
                          <button type="button" class="btn-step-secondary" (click)="setWizardStep(3)">
                            <span>&larr; Previous</span>
                          </button>
                          @if (metrics().confirmations.stereoConfirmed !== null) {
                            <button type="button" class="btn-step-primary" (click)="setWizardStep(5)">
                              <span>Next: Frequency Test &rarr;</span>
                            </button>
                          }
                        </div>
                      </div>
                    }

                    <!-- STEP 5: Frequency Spectrum Test -->
                    @case (5) {
                      <div class="step-view">
                        <div class="step-heading-group">
                          <span class="step-num-badge">STEP 5 OF 5</span>
                          <h4 class="step-title">Frequency Spectrum Test</h4>
                          <p class="step-desc">Run a continuous 20 Hz to 20,000 Hz sweep to verify low bass, vocal midrange, and treble clarity.</p>
                        </div>

                        <div class="step-interactive-area">
                          <div class="frequency-hud-box">
                            <div class="sweep-hud-val">
                              <span class="hud-num">{{ metrics().sweepRunning ? metrics().currentFrequency : '20 - 20,000' }}</span>
                              <span class="hud-unit">Hz</span>
                            </div>
                            <div class="sweep-bar-track">
                              <div class="sweep-bar-fill" [style.width.%]="metrics().sweepProgress"></div>
                            </div>
                          </div>

                          <button
                            type="button"
                            class="btn-step-play"
                            [class.playing]="metrics().sweepRunning"
                            (click)="toggleSweep()"
                          >
                            <ts-icon [name]="metrics().sweepRunning ? 'pause' : 'play'" [size]="16" />
                            <span>{{ metrics().sweepRunning ? 'Stop Sweep' : 'Start Frequency Sweep' }}</span>
                          </button>

                          <div class="confirm-box">
                            <span class="confirm-prompt">Did you hear the smooth progression from low bass to high treble?</span>
                            <div class="confirm-btns">
                              <button
                                type="button"
                                class="btn-confirm yes"
                                [class.selected]="metrics().confirmations.frequenciesConfirmed === true"
                                (click)="handleWizardConfirm('frequenciesConfirmed', true, 6)"
                              >
                                <ts-icon name="check" [size]="14" />
                                <span>Yes, Full Range Audible</span>
                              </button>
                              <button
                                type="button"
                                class="btn-confirm no"
                                [class.selected]="metrics().confirmations.frequenciesConfirmed === false"
                                (click)="handleWizardConfirm('frequenciesConfirmed', false, 6)"
                              >
                                <ts-icon name="x" [size]="14" />
                                <span>No, Frequencies Missing / Distorted</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class="step-footer-actions">
                          <button type="button" class="btn-step-secondary" (click)="setWizardStep(4)">
                            <span>&larr; Previous</span>
                          </button>
                          @if (metrics().confirmations.frequenciesConfirmed !== null) {
                            <button type="button" class="btn-step-primary" (click)="setWizardStep(6)">
                              <span>View Final Results &rarr;</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              } @else {

                <!-- ========================================== -->
                <!-- FINAL RESULTS — SAME COMPONENT (STEP 6)   -->
                <!-- ========================================== -->
                <div class="final-results-view">

                  <!-- Results Header -->
                  <div class="results-header-row">
                    <div>
                      <h4 class="results-title">Speaker & Headphone Test Results</h4>
                      <p class="results-subtitle">Output: <strong>{{ metrics().activeOutputDeviceLabel }}</strong></p>
                    </div>
                    <div class="results-badge" [attr.data-status]="getOverallStatus()">
                      <ts-icon [name]="getOverallStatus() === 'Passed' ? 'check-circle' : 'alert-triangle'" [size]="14" />
                      <span>{{ getOverallStatus() }}</span>
                    </div>
                  </div>

                  <!-- Verdict Banner with Score -->
                  <div class="results-verdict-banner" [attr.data-status]="getOverallStatus()">
                    <div class="verdict-score-ring">
                      <span class="score-num">{{ metrics().diagnosticSummary.stereoSeparationScore }}%</span>
                    </div>
                    <div class="verdict-text-block">
                      <h5 class="verdict-title">{{ metrics().diagnosticSummary.verdictTitle }}</h5>
                      <p class="verdict-desc">{{ metrics().diagnosticSummary.verdictDescription }}</p>
                    </div>
                  </div>

                  <!-- Results Grid (4 Channels) -->
                  <div class="results-grid">
                    <!-- 1. Left Channel -->
                    <div class="result-tile">
                      <div class="tile-header">
                        <span class="tile-name">Left Channel</span>
                        <span class="status-pill" [attr.data-status]="getStepStatus(metrics().confirmations.leftConfirmed)">
                          {{ getStepStatus(metrics().confirmations.leftConfirmed) }}
                        </span>
                      </div>
                      <p class="tile-desc">
                        {{ metrics().confirmations.leftConfirmed === true ? 'Verified in left ear with zero bleed.' : metrics().confirmations.leftConfirmed === false ? 'Channel audio was not heard or wrong side.' : 'Test not completed.' }}
                      </p>
                    </div>

                    <!-- 2. Right Channel -->
                    <div class="result-tile">
                      <div class="tile-header">
                        <span class="tile-name">Right Channel</span>
                        <span class="status-pill" [attr.data-status]="getStepStatus(metrics().confirmations.rightConfirmed)">
                          {{ getStepStatus(metrics().confirmations.rightConfirmed) }}
                        </span>
                      </div>
                      <p class="tile-desc">
                        {{ metrics().confirmations.rightConfirmed === true ? 'Verified in right ear with zero bleed.' : metrics().confirmations.rightConfirmed === false ? 'Channel audio was not heard or wrong side.' : 'Test not completed.' }}
                      </p>
                    </div>

                    <!-- 3. Stereo Output -->
                    <div class="result-tile">
                      <div class="tile-header">
                        <span class="tile-name">Stereo Output</span>
                        <span class="status-pill" [attr.data-status]="getStepStatus(metrics().confirmations.stereoConfirmed)">
                          {{ getStepStatus(metrics().confirmations.stereoConfirmed) }}
                        </span>
                      </div>
                      <p class="tile-desc">
                        {{ metrics().confirmations.stereoConfirmed === true ? 'Both channels balanced across ears.' : metrics().confirmations.stereoConfirmed === false ? 'Stereo imbalance or one side muted.' : 'Test not completed.' }}
                      </p>
                    </div>

                    <!-- 4. Frequency Test -->
                    <div class="result-tile">
                      <div class="tile-header">
                        <span class="tile-name">Frequency Test</span>
                        <span class="status-pill" [attr.data-status]="getStepStatus(metrics().confirmations.frequenciesConfirmed)">
                          {{ getStepStatus(metrics().confirmations.frequenciesConfirmed) }}
                        </span>
                      </div>
                      <p class="tile-desc">
                        {{ metrics().confirmations.frequenciesConfirmed === true ? 'Full 20 Hz – 20,000 Hz spectrum audible.' : metrics().confirmations.frequenciesConfirmed === false ? 'Certain frequency ranges missing or distorted.' : 'Test not completed.' }}
                      </p>
                    </div>
                  </div>

                  <!-- Identified Issues / Health Note -->
                  <div class="issues-summary-card" [class.has-issues]="identifiedIssues().length > 0">
                    <div class="issues-title-row">
                      <ts-icon [name]="identifiedIssues().length > 0 ? 'alert-circle' : 'check-circle'" [size]="15" />
                      <span class="issues-title">{{ identifiedIssues().length > 0 ? 'Identified Issues' : 'Audit Summary' }}</span>
                    </div>
                    @if (identifiedIssues().length > 0) {
                      <ul class="issues-list">
                        @for (issue of identifiedIssues(); track issue) {
                          <li>{{ issue }}</li>
                        }
                      </ul>
                    } @else {
                      <p class="no-issues-text">All stereo separation and frequency tests passed cleanly. Your device is ready for video conferences and media.</p>
                    }
                  </div>

                  <!-- Primary Actions After Completion -->
                  <div class="results-actions-bar">
                    <button type="button" class="btn-save-report" (click)="saveReport()" title="Download a clean PDF report of your test results">
                      <ts-icon name="download" [size]="15" />
                      <span>Save Report</span>
                    </button>
                    <button type="button" class="btn-start-again" (click)="startAgain()" title="Clear results and start the test again from Step 1">
                      <ts-icon name="rotate-ccw" [size]="15" />
                      <span>Start Again</span>
                    </button>
                  </div>

                </div>
              }
            </div>

          } @else {

            <!-- TAB 2: MANUAL STEREO & SOUND WORKBENCH (OPTIONAL) -->
            <div class="tool-card">
              <div class="card-title-row">
                <div class="icon-chip">
                  <ts-icon name="headphones" [size]="18" />
                </div>
                <div>
                  <h3 class="card-title">Stereo Channel Separation</h3>
                  <p class="card-subtitle">Verify whether your left and right audio channels are connected correctly and isolated.</p>
                </div>
              </div>

              <!-- Interactive Speakers Visual Stage -->
              <div class="speakers-stage">

                <!-- Left Speaker Box -->
                <div
                  class="speaker-box"
                  [class.active]="isLeftActive()"
                >
                  <div class="speaker-cone">
                    <div class="cone-core"></div>
                    <div class="wave-ring ring-1"></div>
                    <div class="wave-ring ring-2"></div>
                  </div>
                  <span class="speaker-name">LEFT CHANNEL</span>
                  <span class="speaker-freq">Left Ear Bell Chime</span>

                  <button
                    type="button"
                    class="speaker-action-btn"
                    [class.playing]="metrics().currentMode === 'left'"
                    (click)="testChannel('left')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'left' ? 'pause' : 'play'" [size]="14" />
                    <span>{{ metrics().currentMode === 'left' ? 'Stop' : 'Play Left' }}</span>
                  </button>

                  <!-- Confirmation Pill -->
                  <div class="channel-feedback">
                    <button
                      type="button"
                      class="confirm-pill yes"
                      [class.selected]="metrics().confirmations.leftConfirmed === true"
                      (click)="confirmChannel('leftConfirmed', true)"
                    >
                      <ts-icon name="check" [size]="12" />
                      <span>Heard Left</span>
                    </button>
                    <button
                      type="button"
                      class="confirm-pill no"
                      [class.selected]="metrics().confirmations.leftConfirmed === false"
                      (click)="confirmChannel('leftConfirmed', false)"
                    >
                      <span>No</span>
                    </button>
                  </div>
                </div>

                <!-- Center Bridge: Stereo & Alternate -->
                <div class="stereo-bridge">
                  <button
                    type="button"
                    class="btn-stereo"
                    [class.playing]="metrics().currentMode === 'stereo'"
                    (click)="testChannel('stereo')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'stereo' ? 'pause' : 'play'" [size]="14" />
                    <span>Both Channels (Stereo Bell Chime)</span>
                  </button>

                  <button
                    type="button"
                    class="btn-alternate"
                    [class.playing]="metrics().currentMode === 'alternate'"
                    (click)="testAlternating()"
                    title="Alternates sound between left and right automatically"
                  >
                    <ts-icon [name]="metrics().currentMode === 'alternate' ? 'pause' : 'radio'" [size]="14" />
                    <span>
                      {{ metrics().currentMode === 'alternate' ? 'Stop Alternating' : 'Auto Alternate L / R' }}
                    </span>
                  </button>

                  <!-- Headphone Balance Slider -->
                  <div class="balance-slider-wrap">
                    <div class="bal-label-row">
                      <span class="bal-lbl">Pan Balance:</span>
                      <span class="bal-val">{{ formatPan(metrics().panValue) }}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      [value]="metrics().panValue * 100"
                      (input)="onPanChange($event)"
                      class="pan-slider"
                      aria-label="Audio Panning Balance"
                    />
                    <div class="bal-endpoints">
                      <button type="button" class="pan-quick" (click)="speaker.setPan(-1)">Full Left</button>
                      <button type="button" class="pan-quick" (click)="speaker.setPan(0)">Center</button>
                      <button type="button" class="pan-quick" (click)="speaker.setPan(1)">Full Right</button>
                    </div>
                  </div>
                </div>

                <!-- Right Speaker Box -->
                <div
                  class="speaker-box"
                  [class.active]="isRightActive()"
                >
                  <div class="speaker-cone">
                    <div class="cone-core"></div>
                    <div class="wave-ring ring-1"></div>
                    <div class="wave-ring ring-2"></div>
                  </div>
                  <span class="speaker-name">RIGHT CHANNEL</span>
                  <span class="speaker-freq">Right Ear Bell Chime</span>

                  <button
                    type="button"
                    class="speaker-action-btn"
                    [class.playing]="metrics().currentMode === 'right'"
                    (click)="testChannel('right')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'right' ? 'pause' : 'play'" [size]="14" />
                    <span>{{ metrics().currentMode === 'right' ? 'Stop' : 'Play Right' }}</span>
                  </button>

                  <!-- Confirmation Pill -->
                  <div class="channel-feedback">
                    <button
                      type="button"
                      class="confirm-pill yes"
                      [class.selected]="metrics().confirmations.rightConfirmed === true"
                      (click)="confirmChannel('rightConfirmed', true)"
                    >
                      <ts-icon name="check" [size]="12" />
                      <span>Heard Right</span>
                    </button>
                    <button
                      type="button"
                      class="confirm-pill no"
                      [class.selected]="metrics().confirmations.rightConfirmed === false"
                      (click)="confirmChannel('rightConfirmed', false)"
                    >
                      <span>No</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Optional: Frequency Sweep & Acoustic Noise Tests -->
            <details class="technical-details speaker-advanced-details">
              <summary class="details-summary">
                <div class="summary-left">
                  <ts-icon name="radio" [size]="15" />
                  <span>Audio Frequency & Noise Tests (Optional)</span>
                </div>
                <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
              </summary>

              <div class="details-content">
                <!-- Card 2: Frequency Range & Continuous Sweep -->
                <div class="tool-card inner-card">
                  <div class="card-title-row">
                    <div class="icon-chip">
                      <ts-icon name="radio" [size]="18" />
                    </div>
                    <div>
                      <h3 class="card-title">Frequency Sweep & Presets</h3>
                      <p class="card-subtitle">Test bass response, vocal clarity, and high-frequency limits.</p>
                    </div>
                  </div>

                  <!-- Sweep Progress Panel -->
                  <div class="sweep-panel">
                    <div class="sweep-hud">
                      <div class="sweep-hud-item">
                        <span class="hud-lbl">Current Frequency</span>
                        <span class="hud-val">{{ metrics().currentFrequency }} Hz</span>
                  </div>
                  <div class="sweep-hud-item right">
                    <span class="hud-lbl">Sweep Progress</span>
                    <span class="hud-val">{{ metrics().sweepProgress }}%</span>
                  </div>
                </div>

                <div class="sweep-track">
                  <div class="sweep-fill" [style.width.%]="metrics().sweepProgress"></div>
                </div>

                <div class="sweep-ctrl-row">
                  <button
                    type="button"
                    class="btn-sweep"
                    [class.playing]="metrics().sweepRunning"
                    (click)="toggleSweep()"
                  >
                    <ts-icon [name]="metrics().sweepRunning ? 'pause' : 'play'" [size]="15" />
                    <span>{{ metrics().sweepRunning ? 'Stop Sweep' : 'Start 20Hz – 20kHz Continuous Sweep' }}</span>
                  </button>
                  <span class="sweep-hint">Logarithmic exponential ramp across human hearing range (12s).</span>
                </div>
              </div>

              <!-- Discrete Frequency Grid -->
              <div class="freq-presets-section">
                <span class="presets-label">Discrete Audio Frequencies:</span>
                <div class="presets-grid">
                  <button type="button" class="preset-btn" (click)="testFreq(60, 'bass')" [class.active]="metrics().currentFrequency === 60 && metrics().isPlaying">
                    <span class="preset-title">60 Hz</span>
                    <span class="preset-sub">Sub-Bass</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(120, 'bass')" [class.active]="metrics().currentFrequency === 120 && metrics().isPlaying">
                    <span class="preset-title">120 Hz</span>
                    <span class="preset-sub">Mid-Bass</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(250, 'bass')" [class.active]="metrics().currentFrequency === 250 && metrics().isPlaying">
                    <span class="preset-title">250 Hz</span>
                    <span class="preset-sub">Upper Bass</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(1000, 'mid')" [class.active]="metrics().currentFrequency === 1000 && metrics().isPlaying">
                    <span class="preset-title">1,000 Hz</span>
                    <span class="preset-sub">Vocal Mid</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(4000, 'treble')" [class.active]="metrics().currentFrequency === 4000 && metrics().isPlaying">
                    <span class="preset-title">4,000 Hz</span>
                    <span class="preset-sub">Presence</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(8000, 'treble')" [class.active]="metrics().currentFrequency === 8000 && metrics().isPlaying">
                    <span class="preset-title">8,000 Hz</span>
                    <span class="preset-sub">Treble</span>
                  </button>
                  <button type="button" class="preset-btn" (click)="testFreq(15000, 'treble')" [class.active]="metrics().currentFrequency === 15000 && metrics().isPlaying">
                    <span class="preset-title">15,000 Hz</span>
                    <span class="preset-sub">High Air</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Card 3: Sound Profiles & Noise Generators -->
            <div class="tool-card">
              <div class="card-title-row">
                <div class="icon-chip">
                  <ts-icon name="radio" [size]="18" />
                </div>
                <div>
                  <h3 class="card-title">Sound Profiles & Noise Calibration</h3>
                  <p class="card-subtitle">Generate pure acoustic noise to check speaker driver rattle, resonance, and balance.</p>
                </div>
              </div>

              <div class="noise-grid">
                <div class="noise-card">
                  <div class="noise-info">
                    <span class="noise-name">Pink Noise</span>
                    <span class="noise-desc">Equal energy per octave. Industry standard for neutral speaker calibration.</span>
                  </div>
                  <button
                    type="button"
                    class="btn-noise"
                    [class.playing]="metrics().currentMode === 'pink-noise'"
                    (click)="testNoise('pink')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'pink-noise' ? 'pause' : 'play'" [size]="14" />
                    <span>{{ metrics().currentMode === 'pink-noise' ? 'Stop' : 'Play Pink Noise' }}</span>
                  </button>
                </div>

                <div class="noise-card">
                  <div class="noise-info">
                    <span class="noise-name">White Noise</span>
                    <span class="noise-desc">Equal energy per frequency. Helpful for detecting driver rattle and hiss.</span>
                  </div>
                  <button
                    type="button"
                    class="btn-noise"
                    [class.playing]="metrics().currentMode === 'white-noise'"
                    (click)="testNoise('white')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'white-noise' ? 'pause' : 'play'" [size]="14" />
                    <span>{{ metrics().currentMode === 'white-noise' ? 'Stop' : 'Play White Noise' }}</span>
                  </button>
                </div>

                <div class="noise-card">
                  <div class="noise-info">
                    <span class="noise-name">Brown Noise</span>
                    <span class="noise-desc">Deep low-frequency rumble. Ideal for sub-bass resonance checks.</span>
                  </div>
                  <button
                    type="button"
                    class="btn-noise"
                    [class.playing]="metrics().currentMode === 'brown-noise'"
                    (click)="testNoise('brown')"
                  >
                    <ts-icon [name]="metrics().currentMode === 'brown-noise' ? 'pause' : 'play'" [size]="14" />
                    <span>{{ metrics().currentMode === 'brown-noise' ? 'Stop' : 'Play Brown Noise' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>

          }

        </div>

        <!-- ========================================== -->
        <!-- RIGHT COLUMN: Output Device          }

        </div>

        <!-- ========================================== -->
        <!-- RIGHT COLUMN: Output Device, Volume, Status -->
        <!-- ========================================== -->
        <div class="side-column">

          <!-- Card 1: Output Device & Volume -->
          <div class="side-card">
            <div class="side-card-header">
              <h3 class="card-heading">Audio Output & Volume</h3>
              <button type="button" class="btn-text-detect" (click)="detectHeadphones()" title="Scan for newly connected headphones or audio devices">
                <ts-icon name="refresh-cw" [size]="12" />
                <span>Detect</span>
              </button>
            </div>

            <div class="device-select-wrap">
              <app-acklet-dropdown
                [options]="outputDeviceOptions()"
                [value]="metrics().activeOutputDeviceId || ''"
                (valueChange)="onOutputDeviceChange($event)"
                placeholder="Select speaker/output..."
                [icon]="activeDeviceType() === 'headphones' ? 'headphones' : 'volume-2'"
                emptyText="No output devices detected"
              />
            </div>

            <!-- Connected / Detected Output Devices List -->
            @if (devices().length > 0) {
              <div class="detected-devices-section">
                <span class="detected-section-lbl">Connected Devices ({{ devices().length }})</span>
                <div class="detected-devices-list">
                  @for (dev of devices(); track dev.deviceId) {
                    <button
                      type="button"
                      class="device-chip-btn"
                      [class.active]="(metrics().activeOutputDeviceId || 'default') === dev.deviceId || (!metrics().activeOutputDeviceId && dev.deviceId === 'default')"
                      (click)="onOutputDeviceChange(dev.deviceId)"
                      [title]="dev.label"
                    >
                      <ts-icon [name]="getDevIcon(dev.label)" [size]="13" />
                      <span class="dev-chip-label">{{ dev.label }}</span>
                      @if ((metrics().activeOutputDeviceId || 'default') === dev.deviceId || (!metrics().activeOutputDeviceId && dev.deviceId === 'default')) {
                        <span class="active-pill">Active</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <div class="volume-slider-wrap" style="margin-top: 14px;">
              <div class="vol-header">
                <span class="vol-label">Volume Level</span>
                <span class="vol-val">{{ metrics().isMuted ? 'Muted' : metrics().masterVolume + '%' }}</span>
              </div>

              <div class="slider-row">
                <button
                  type="button"
                  class="mute-icon-btn"
                  [class.muted]="metrics().isMuted"
                  (click)="speaker.toggleMute()"
                  [title]="metrics().isMuted ? 'Unmute' : 'Mute'"
                >
                  <ts-icon [name]="metrics().isMuted ? 'volume-x' : 'volume-2'" [size]="18" />
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  [value]="metrics().masterVolume"
                  (input)="onVolumeChange($event)"
                  class="vol-slider"
                  aria-label="Master Output Volume"
                />
              </div>
            </div>
          </div>

          <!-- Card 2: Diagnostic Results & Channel Verification -->
          <div class="side-card">
            <div class="card-header-flex">
              <div class="header-left">
                <h3 class="card-heading">Audio Status</h3>
              </div>
              <div class="verdict-tag" [attr.data-verdict]="metrics().diagnosticSummary.verdict">
                <span>{{ metrics().diagnosticSummary.stereoSeparationScore }}%</span>
              </div>
            </div>

            <div class="current-test-status-row">
              <span class="status-indicator-dot" [class.active]="metrics().isPlaying"></span>
              <span class="status-summary-text">{{ getTestingStatusText() }}</span>
            </div>

            <h4 class="diag-title">{{ metrics().diagnosticSummary.verdictTitle }}</h4>

            <div class="checklist-items">
              <div class="check-item">
                <span class="item-name">Left Channel:</span>
                <span class="item-status" [attr.data-state]="metrics().confirmations.leftConfirmed">
                  {{ formatConfirmState(metrics().confirmations.leftConfirmed) }}
                </span>
              </div>
              <div class="check-item">
                <span class="item-name">Right Channel:</span>
                <span class="item-status" [attr.data-state]="metrics().confirmations.rightConfirmed">
                  {{ formatConfirmState(metrics().confirmations.rightConfirmed) }}
                </span>
              </div>
              <div class="check-item">
                <span class="item-name">Stereo Separation:</span>
                <span class="item-status" [attr.data-state]="metrics().confirmations.stereoConfirmed">
                  {{ formatConfirmState(metrics().confirmations.stereoConfirmed) }}
                </span>
              </div>
            </div>

            <div class="checklist-footer">
              <button type="button" class="btn-reset-confirms" (click)="resetConfirmations()">
                <ts-icon name="rotate-ccw" [size]="12" />
                <span>Reset Test</span>
              </button>
            </div>
          </div>


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

    .speaker-module-root {
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

    .btn-stop-audio {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      border: 1px solid var(--ds-fail-border, rgba(248, 113, 113, 0.3));
      color: var(--ds-fail, #F87171);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-stop-audio:hover {
      background: var(--ds-fail, #F87171);
      color: #FFFFFF;
    }

    /* Mode Tabs Bar */
    .mode-tabs-bar {
      display: flex;
      gap: 6px;
      background: var(--ds-card-bg-elevated, #27272A);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .mode-tabs-bar {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    .mode-tab-btn {
      flex: 1;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      background: none;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-tab-btn.active {
      background: var(--ds-card-bg, #18181B);
      color: var(--ds-accent, #3B82F6);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .mode-tab-btn.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
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

    .tool-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="light"]) .tool-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    /* Connected Headphone / Output Device Bar */
    .connected-device-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .connected-device-bar {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .connected-dev-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .dev-badge-pulse {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .dev-badge-pulse {
      background: #EFF6FF;
      color: #2563EB;
    }

    .pulse-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
    }

    .dev-text-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .dev-status-tag {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #10B981;
      line-height: 1.2;
    }

    .dev-current-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    :host-context([data-theme="light"]) .dev-current-name {
      color: #0F172A;
    }

    .connected-dev-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .quick-dev-select {
      min-width: 170px;
      max-width: 220px;
    }

    .btn-detect-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .btn-detect-action {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-detect-action:hover {
      border-color: var(--ds-accent, #3B82F6);
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-detect-action:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    .card-title-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
    }

    .icon-chip {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      color: var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .icon-chip {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 2px;
    }

    :host-context([data-theme="light"]) .card-title {
      color: #0F172A;
    }

    .card-subtitle {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    /* Speakers Stage */
    .speakers-stage {
      display: grid;
      grid-template-columns: 1fr 1.1fr 1fr;
      gap: 14px;
      align-items: center;
    }

    @media (max-width: 640px) {
      .speakers-stage {
        grid-template-columns: 1fr;
      }
    }

    .speaker-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 18px 12px;
      border-radius: 12px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      transition: all 0.2s ease;
      text-align: center;
    }

    :host-context([data-theme="light"]) .speaker-box {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .speaker-box.active {
      border-color: var(--ds-accent, #3B82F6);
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.08));
      box-shadow: 0 0 16px var(--ds-accent-glow, rgba(59, 130, 246, 0.2));
    }

    :host-context([data-theme="light"]) .speaker-box.active {
      border-color: #2563EB;
      background: #EFF6FF;
      box-shadow: 0 0 16px rgba(37, 99, 235, 0.15);
    }

    .speaker-cone {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #09090B;
      border: 2px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      overflow: visible;
    }

    :host-context([data-theme="light"]) .speaker-cone {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    .cone-core {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--text-3, #52525B);
      transition: transform 0.1s ease;
    }

    :host-context([data-theme="light"]) .cone-core {
      background: #94A3B8;
    }

    .speaker-box.active .cone-core {
      background: var(--ds-accent, #3B82F6);
      animation: cone-vibrate 0.12s infinite alternate;
    }

    :host-context([data-theme="light"]) .speaker-box.active .cone-core {
      background: #2563EB;
    }

    @keyframes cone-vibrate {
      0% { transform: scale(0.92); }
      100% { transform: scale(1.08); }
    }

    .wave-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1.5px solid transparent;
      pointer-events: none;
    }

    .speaker-box.active .wave-ring.ring-1 {
      border-color: var(--ds-accent, #3B82F6);
      animation: wave-expand 1.4s infinite;
    }

    .speaker-box.active .wave-ring.ring-2 {
      border-color: var(--ds-accent, #3B82F6);
      animation: wave-expand 1.4s infinite 0.7s;
    }

    @keyframes wave-expand {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.45); opacity: 0; }
    }

    .speaker-name {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .speaker-name {
      color: #0F172A;
    }

    .speaker-freq {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      margin: 2px 0 10px;
    }

    .speaker-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .speaker-action-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .speaker-action-btn.playing {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .speaker-action-btn.playing {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
    }

    .channel-feedback {
      display: flex;
      gap: 4px;
      margin-top: 10px;
    }

    .confirm-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--ds-card-bg, #18181B);
      color: var(--text-2, #A1A1AA);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .confirm-pill {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .confirm-pill.yes.selected {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.14));
      color: var(--ds-pass, #34D399);
      border-color: var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    .confirm-pill.no.selected {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.14));
      color: var(--ds-fail, #F87171);
      border-color: var(--ds-fail-border, rgba(248, 113, 113, 0.3));
    }

    /* Center Stereo Bridge */
    .stereo-bridge {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }

    .btn-stereo,
    .btn-alternate {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--text, #F4F4F5);
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-stereo,
    :host-context([data-theme="light"]) .btn-alternate {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-stereo.playing,
    .btn-alternate.playing {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-stereo.playing,
    :host-context([data-theme="light"]) .btn-alternate.playing {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
    }

    .balance-slider-wrap {
      width: 100%;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 8px 10px;
    }

    :host-context([data-theme="light"]) .balance-slider-wrap {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .bal-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      margin-bottom: 4px;
    }

    .bal-lbl {
      color: var(--text-2, #A1A1AA);
    }

    .bal-val {
      font-weight: 700;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .bal-val {
      color: #2563EB;
    }

    .pan-slider {
      width: 100%;
      accent-color: var(--ds-accent, #3B82F6);
      cursor: pointer;
      margin: 2px 0;
    }

    .bal-endpoints {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }

    .pan-quick {
      font-size: 10px;
      background: none;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      padding: 0;
    }

    .pan-quick:hover {
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .pan-quick:hover {
      color: #2563EB;
    }

    /* Sweep Panel */
    .sweep-panel {
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .sweep-panel {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .sweep-hud {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .hud-lbl {
      display: block;
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
    }

    .hud-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .hud-val {
      color: #2563EB;
    }

    .sweep-track {
      width: 100%;
      height: 8px;
      background: var(--ds-meter-bg, #18181B);
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    :host-context([data-theme="light"]) .sweep-track {
      background: #E2E8F0;
    }

    .sweep-fill {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6 0%, #34D399 50%, #FBBF24 100%);
      transition: width 0.05s linear;
    }

    :host-context([data-theme="light"]) .sweep-fill {
      background: linear-gradient(90deg, #2563EB 0%, #059669 50%, #D97706 100%);
    }

    .sweep-ctrl-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-sweep {
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
    }

    :host-context([data-theme="light"]) .btn-sweep {
      background: #2563EB;
      color: #FFFFFF;
    }

    .btn-sweep.playing {
      background: var(--ds-warn, #FBBF24);
      color: #78350F;
    }

    .sweep-hint {
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
    }

    /* Frequency Presets */
    .freq-presets-section {
      margin-top: 14px;
    }

    .presets-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      margin-bottom: 8px;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
      gap: 8px;
    }

    .preset-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .preset-btn {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .preset-btn.active {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .preset-btn.active {
      background: #2563EB;
      border-color: #2563EB;
    }

    .preset-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .preset-title {
      color: #0F172A;
    }

    .preset-btn.active .preset-title,
    .preset-btn.active .preset-sub {
      color: #FFFFFF;
    }

    .preset-sub {
      font-size: 10.5px;
      color: var(--text-2, #A1A1AA);
      margin-top: 1px;
    }

    /* Noise Grid */
    .noise-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }

    .noise-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14px;
      border-radius: 10px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .noise-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .noise-name {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin-bottom: 4px;
    }

    :host-context([data-theme="light"]) .noise-name {
      color: #0F172A;
    }

    .noise-desc {
      display: block;
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
      margin-bottom: 12px;
    }

    .btn-noise {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 7px 12px;
      border-radius: 6px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-noise {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-noise.playing {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-noise.playing {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
    }

    /* Wizard Container & Header */
    .wizard-card {
      min-height: 480px;
      display: flex;
      flex-direction: column;
    }

    .wizard-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .wizard-header {
      border-color: #E2E8F0;
    }

    .wizard-progress-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .wiz-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 9999px;
      background: var(--ds-card-bg-elevated, #27272A);
      color: var(--text-2, #A1A1AA);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .wiz-pill {
      background: #F1F5F9;
      color: #64748B;
      border-color: #E2E8F0;
    }

    .wiz-pill:hover {
      border-color: var(--ds-accent, #3B82F6);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .wiz-pill:hover {
      border-color: #2563EB;
      color: #0F172A;
    }

    .wiz-pill.active {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--ds-accent, #3B82F6);
      border-color: var(--ds-accent-border, rgba(59, 130, 246, 0.4));
    }

    :host-context([data-theme="light"]) .wiz-pill.active {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    .wiz-pill.done {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.12));
      color: var(--ds-pass, #34D399);
      border-color: var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    :host-context([data-theme="light"]) .wiz-pill.done {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .results-pill.active {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.2));
      color: var(--ds-accent, #3B82F6);
      border-color: var(--ds-accent, #3B82F6);
    }

    /* Step View */
    .step-view {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .step-heading-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .step-num-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .step-num-badge {
      color: #2563EB;
    }

    .step-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .step-title {
      color: #0F172A;
    }

    .step-desc {
      font-size: 13.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .step-desc {
      color: #64748B;
    }

    .step-interactive-area {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .step-interactive-area {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .active-dev-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .active-dev-box {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .dev-box-icon {
      color: var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .dev-box-icon {
      color: #2563EB;
    }

    .dev-box-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dev-box-type {
      font-size: 11px;
      font-weight: 600;
      color: #10B981;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .dev-box-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .dev-box-name {
      color: #0F172A;
    }

    .btn-rescan-dev {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-rescan-dev {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-rescan-dev:hover {
      border-color: var(--ds-accent, #3B82F6);
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-rescan-dev:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    /* Channel Visual Stage */
    .channel-visual-stage {
      display: flex;
      justify-content: center;
      padding: 16px 0;
    }

    .speaker-cone-visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 28px;
      border-radius: 12px;
      background: var(--ds-card-bg, #18181B);
      border: 2px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      transition: all 0.2s ease;
    }

    :host-context([data-theme="light"]) .speaker-cone-visual {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .speaker-cone-visual.active {
      border-color: var(--ds-accent, #3B82F6);
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.25);
    }

    :host-context([data-theme="light"]) .speaker-cone-visual.active {
      border-color: #2563EB;
      background: #EFF6FF;
      box-shadow: 0 0 16px rgba(37, 99, 235, 0.18);
    }

    .cone-symbol {
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .cone-symbol {
      color: #2563EB;
    }

    .cone-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .cone-label {
      color: #0F172A;
    }

    /* Frequency HUD */
    .frequency-hud-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border-radius: 10px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .frequency-hud-box {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .sweep-hud-val {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .hud-num {
      font-size: 24px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .hud-num {
      color: #2563EB;
    }

    .hud-unit {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    .sweep-bar-track {
      width: 100%;
      height: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border-radius: 4px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .sweep-bar-track {
      background: #E2E8F0;
    }

    .sweep-bar-fill {
      height: 100%;
      background: var(--ds-accent, #3B82F6);
      transition: width 0.1s linear;
    }

    :host-context([data-theme="light"]) .sweep-bar-fill {
      background: #2563EB;
    }

    .btn-step-play {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.15));
      color: var(--text, #F4F4F5);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      width: fit-content;
      margin: 0 auto;
    }

    :host-context([data-theme="light"]) .btn-step-play {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-step-play:hover {
      border-color: var(--ds-accent, #3B82F6);
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-step-play:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    .btn-step-play.playing {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-step-play.playing {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
    }

    .confirm-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 8px;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      margin-top: 4px;
    }

    :host-context([data-theme="light"]) .confirm-box {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .confirm-prompt {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .confirm-prompt {
      color: #0F172A;
    }

    .confirm-btns {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-confirm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .btn-confirm.yes {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.12));
      color: var(--ds-pass, #34D399);
      border-color: var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    :host-context([data-theme="light"]) .btn-confirm.yes {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .btn-confirm.yes.selected {
      background: #10B981;
      color: #FFFFFF;
      border-color: #10B981;
    }

    .btn-confirm.no {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.12));
      color: var(--ds-fail, #F87171);
      border-color: var(--ds-fail-border, rgba(248, 113, 113, 0.3));
    }

    :host-context([data-theme="light"]) .btn-confirm.no {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #FECACA;
    }

    .btn-confirm.no.selected {
      background: #EF4444;
      color: #FFFFFF;
      border-color: #EF4444;
    }

    /* Step Footer Actions */
    .step-footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 6px;
    }

    .btn-step-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 22px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-left: auto;
    }

    :host-context([data-theme="light"]) .btn-step-primary {
      background: #2563EB;
    }

    .btn-step-primary:hover {
      filter: brightness(1.1);
    }

    .btn-step-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-step-secondary {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-step-secondary:hover {
      border-color: var(--ds-accent, #3B82F6);
    }

    /* Final Results View Styles */
    .final-results-view {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .results-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .results-header-row {
      border-color: #E2E8F0;
    }

    .results-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 2px;
    }

    :host-context([data-theme="light"]) .results-title {
      color: #0F172A;
    }

    .results-subtitle {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    :host-context([data-theme="light"]) .results-subtitle {
      color: #64748B;
    }

    .results-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .results-badge[data-status="Passed"] {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.15));
      color: var(--ds-pass, #34D399);
      border: 1px solid var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    :host-context([data-theme="light"]) .results-badge[data-status="Passed"] {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .results-badge[data-status="Needs Attention"] {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    :host-context([data-theme="light"]) .results-badge[data-status="Needs Attention"] {
      background: #FFFBEB;
      color: #D97706;
      border-color: #FDE68A;
    }

    .results-badge[data-status="Not Completed"] {
      background: rgba(156, 163, 175, 0.12);
      color: #9CA3AF;
      border: 1px solid rgba(156, 163, 175, 0.25);
    }

    :host-context([data-theme="light"]) .results-badge[data-status="Not Completed"] {
      background: #F3F4F6;
      color: #6B7280;
      border-color: #E5E7EB;
    }

    /* Verdict Banner */
    .results-verdict-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 12px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .results-verdict-banner {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .verdict-score-ring {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.15));
      border: 2px solid var(--ds-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .verdict-score-ring {
      background: #EFF6FF;
      border-color: #2563EB;
    }

    .score-num {
      font-size: 16px;
      font-weight: 800;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .score-num {
      color: #2563EB;
    }

    .verdict-text-block {
      flex: 1;
      min-width: 0;
    }

    .verdict-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 3px;
    }

    :host-context([data-theme="light"]) .verdict-title {
      color: #0F172A;
    }

    .verdict-desc {
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .verdict-desc {
      color: #64748B;
    }

    /* Results Grid */
    .results-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    @media (max-width: 600px) {
      .results-grid {
        grid-template-columns: 1fr;
      }
    }

    .result-tile {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .result-tile {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .tile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .tile-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .tile-name {
      color: #0F172A;
    }

    .status-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .status-pill[data-status="Passed"] {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.15));
      color: var(--ds-pass, #34D399);
      border: 1px solid var(--ds-pass-border, rgba(52, 211, 153, 0.3));
    }

    :host-context([data-theme="light"]) .status-pill[data-status="Passed"] {
      background: #ECFDF5;
      color: #059669;
      border-color: #A7F3D0;
    }

    .status-pill[data-status="Needs Attention"] {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    :host-context([data-theme="light"]) .status-pill[data-status="Needs Attention"] {
      background: #FFFBEB;
      color: #D97706;
      border-color: #FDE68A;
    }

    .status-pill[data-status="Not Completed"] {
      background: rgba(156, 163, 175, 0.12);
      color: #9CA3AF;
      border: 1px solid rgba(156, 163, 175, 0.25);
    }

    :host-context([data-theme="light"]) .status-pill[data-status="Not Completed"] {
      background: #F3F4F6;
      color: #6B7280;
      border-color: #E5E7EB;
    }

    .tile-desc {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .tile-desc {
      color: #64748B;
    }

    /* Issues Box */
    .issues-summary-card {
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .issues-summary-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .issues-summary-card.has-issues {
      border-color: rgba(245, 158, 11, 0.3);
      background: rgba(245, 158, 11, 0.06);
    }

    :host-context([data-theme="light"]) .issues-summary-card.has-issues {
      background: #FFFBEB;
      border-color: #FDE68A;
    }

    .issues-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .issues-title-row {
      color: #0F172A;
    }

    .issues-summary-card.has-issues .issues-title-row {
      color: #F59E0B;
    }

    :host-context([data-theme="light"]) .issues-summary-card.has-issues .issues-title-row {
      color: #D97706;
    }

    .issues-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.6;
    }

    :host-context([data-theme="light"]) .issues-list {
      color: #475569;
    }

    .no-issues-text {
      margin: 0;
      font-size: 12.5px;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .no-issues-text {
      color: #64748B;
    }

    /* Actions After Completion */
    .results-actions-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 10px;
    }

    .btn-save-report {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-save-report {
      background: #2563EB;
    }

    .btn-save-report:hover {
      filter: brightness(1.1);
    }

    .btn-start-again {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-start-again {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-start-again:hover {
      border-color: var(--ds-accent, #3B82F6);
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-start-again:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    /* Current test status row in side card */
    .current-test-status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.06));
      margin-bottom: 12px;
    }

    :host-context([data-theme="light"]) .current-test-status-row {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .status-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
    }

    .status-indicator-dot.active {
      box-shadow: 0 0 6px #10B981;
    }

    .status-summary-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .status-summary-text {
      color: #475569;
    }

    /* Side Cards */
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .side-card {
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="light"]) .side-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
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

    .side-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .btn-text-detect {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-accent, #3B82F6);
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-text-detect {
      color: #2563EB;
    }

    .btn-text-detect:hover {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
    }

    .detected-devices-section {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detected-section-lbl {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .detected-section-lbl {
      color: #64748B;
    }

    .detected-devices-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .device-chip-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
    }

    :host-context([data-theme="light"]) .device-chip-btn {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #1E293B;
    }

    .device-chip-btn:hover {
      border-color: var(--ds-accent, #3B82F6);
    }

    .device-chip-btn.active {
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.1));
      border-color: var(--ds-accent, #3B82F6);
      color: var(--ds-accent, #3B82F6);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .device-chip-btn.active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
    }

    .dev-chip-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .active-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--ds-accent, #3B82F6);
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    :host-context([data-theme="light"]) .active-pill {
      background: #2563EB;
      color: #FFFFFF;
    }

    .device-select {
      width: 100%;
      height: 34px;
      background: var(--ds-card-bg-elevated, #27272A);
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

    .sink-status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-2, #A1A1AA);
      margin-top: 8px;
    }

    .sink-status-badge.supported {
      color: var(--ds-pass, #34D399);
    }

    /* Volume Slider */
    .volume-slider-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .vol-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .vol-label {
      color: var(--text-2, #A1A1AA);
    }

    .vol-val {
      font-weight: 700;
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .vol-val {
      color: #2563EB;
    }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mute-icon-btn {
      background: none;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .mute-icon-btn.muted {
      color: var(--ds-fail, #F87171);
    }

    .vol-slider {
      flex: 1;
      accent-color: var(--ds-accent, #3B82F6);
      cursor: pointer;
    }

    .vol-note {
      font-size: 11px;
      color: var(--text-3, #71717A);
      margin: 0;
    }

    /* Diagnostics Results */
    .card-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .heuristic-pill {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, #A1A1AA);
      display: block;
      margin-top: 2px;
    }

    .verdict-tag {
      font-size: 14px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .verdict-tag {
      background: #EFF6FF;
      color: #2563EB;
    }

    .verdict-tag[data-verdict="verified"] {
      background: var(--ds-pass-soft, rgba(52, 211, 153, 0.15));
      color: var(--ds-pass, #34D399);
    }

    .verdict-tag[data-verdict="issue"] {
      background: var(--ds-fail-soft, rgba(248, 113, 113, 0.15));
      color: var(--ds-fail, #F87171);
    }

    .diag-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .diag-title {
      color: #0F172A;
    }

    .diag-desc {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.45;
      margin: 0 0 12px;
    }

    .checklist-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--ds-card-bg-elevated, #27272A);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .checklist-items {
      background: #F8FAFC;
    }

    .check-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .item-name {
      color: var(--text-2, #A1A1AA);
    }

    .item-status {
      font-weight: 600;
    }

    .item-status[data-state="true"] {
      color: var(--ds-pass, #34D399);
    }

    .item-status[data-state="false"] {
      color: var(--ds-fail, #F87171);
    }

    .checklist-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .btn-reset-confirms {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      background: none;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    .btn-reset-confirms:hover {
      color: var(--ds-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .btn-reset-confirms:hover {
      color: #2563EB;
    }

    /* Specs List */
    .specs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .spec-row {
      display: flex;
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
      max-width: 170px;
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

    .advice-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      line-height: 1.55;
    }

    :host-context([data-theme="light"]) .advice-list {
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
export class SpeakerModuleComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public speaker = inject(SpeakerService);
  private state = inject(DeviceStudioStateService);
  public reportService = inject(DiagnosticReportService);

  public readonly metrics = this.speaker.metrics;
  public readonly devices = this.speaker.availableDevices;

  public readonly outputDeviceOptions = computed<DropdownOption[]>(() => {
    const devs = this.devices();
    if (devs.length === 0) {
      return [{ value: '', label: 'Default Audio Output', icon: 'headphones' }];
    }
    return devs.map(d => ({
      value: d.deviceId,
      label: d.label || 'Audio Output',
      icon: (d.label || '').toLowerCase().includes('headphone') || (d.label || '').toLowerCase().includes('airpod') ? 'headphones' : 'volume-2'
    }));
  });

  public readonly activeDeviceType = computed<'headphones' | 'speaker'>(() => {
    const label = (this.metrics().activeOutputDeviceLabel || '').toLowerCase();
    return label.includes('headphone') || label.includes('airpod') || label.includes('ear') || label.includes('buds') || label.includes('headset')
      ? 'headphones'
      : 'speaker';
  });

  public readonly deviceStatusDescription = computed<string>(() => {
    const isHeadphone = this.activeDeviceType() === 'headphones';
    return isHeadphone
      ? 'Connected Headphones • Stereo separation ready'
      : 'Connected Audio Output • Ready for channel check';
  });

  public readonly activeTab = signal<'guided' | 'workbench'>('guided');
  public readonly wizardStep = signal<number>(1);

  public readonly identifiedIssues = computed<string[]>(() => {
    const c = this.metrics().confirmations;
    const issues: string[] = [];
    if (c.leftConfirmed === false) {
      issues.push('Left channel tone was not heard. Check headphone orientation, balance slider, or cable connection.');
    }
    if (c.rightConfirmed === false) {
      issues.push('Right channel tone was not heard. Check headphone orientation, balance slider, or cable connection.');
    }
    if (c.stereoConfirmed === false) {
      issues.push('Stereo output was imbalanced or audio was muted on one channel.');
    }
    if (c.frequenciesConfirmed === false) {
      issues.push('Certain audio frequencies were not reproduced cleanly. Check driver capabilities or volume.');
    }
    if (c.leftConfirmed === null || c.rightConfirmed === null || c.stereoConfirmed === null || c.frequenciesConfirmed === null) {
      issues.push('One or more test steps were skipped or not completed.');
    }
    return issues;
  });

  public readonly isLeftActive = computed(() => {
    const m = this.metrics();
    if (!m.isPlaying) return false;
    return m.currentMode === 'left' || m.currentMode === 'stereo' || m.alternatingChannel === 'left';
  });

  public readonly isRightActive = computed(() => {
    const m = this.metrics();
    if (!m.isPlaying) return false;
    return m.currentMode === 'right' || m.currentMode === 'stereo' || m.alternatingChannel === 'right';
  });

  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      const activeEl = document.activeElement?.tagName.toLowerCase();
      if (activeEl !== 'input' && activeEl !== 'select' && activeEl !== 'button') {
        event.preventDefault();
        if (this.metrics().isPlaying) {
          this.stopAudio();
        } else {
          this.testChannel('stereo');
        }
      }
    }
  }

  public async ngOnInit(): Promise<void> {
    this.state.setActiveTab('speaker');
    await this.speaker.loadDevices();
    await this.speaker.preloadHeadphoneSound();
  }

  public ngOnDestroy(): void {
    this.speaker.stop();
  }

  public testChannel(channel: 'left' | 'right' | 'stereo'): void {
    if (this.metrics().currentMode === channel && this.metrics().isPlaying) {
      this.speaker.stop();
    } else {
      this.speaker.playChannelTone(channel);
      this.state.markModuleTested('speaker');
      this.state.showToast(`Playing ${channel} channel bell chime.`);
    }
  }

  public testAlternating(): void {
    if (this.metrics().currentMode === 'alternate' && this.metrics().isPlaying) {
      this.speaker.stop();
    } else {
      this.speaker.playAlternatingChannels(6);
      this.state.markModuleTested('speaker');
      this.state.showToast('Alternating bell chime between left and right channels.');
    }
  }

  public toggleSweep(): void {
    if (this.metrics().sweepRunning) {
      this.speaker.stop();
    } else {
      this.speaker.startFrequencySweep(12);
      this.state.markModuleTested('speaker');
      this.state.showToast('Frequency sweep started: 20 Hz to 20,000 Hz.');
    }
  }

  public testFreq(freq: number, mode: 'bass' | 'mid' | 'treble'): void {
    if (this.metrics().isPlaying && this.metrics().currentFrequency === freq) {
      this.speaker.stop();
    } else {
      this.speaker.playToneAtFrequency(freq, mode);
      this.state.markModuleTested('speaker');
    }
  }

  public testNoise(type: 'white' | 'pink' | 'brown'): void {
    const targetMode = type === 'white' ? 'white-noise' : type === 'pink' ? 'pink-noise' : 'brown-noise';
    if (this.metrics().currentMode === targetMode) {
      this.speaker.stop();
    } else {
      this.speaker.playNoise(type);
      this.state.markModuleTested('speaker');
    }
  }

  public stopAudio(): void {
    this.speaker.stop();
    this.state.showToast('Sound stopped.');
  }

  public onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.speaker.setVolume(Number(input.value));
  }

  public onPanChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const panVal = Number(input.value) / 100;
    this.speaker.setPan(panVal);
  }

  public onOutputDeviceChange(deviceId: string): void {
    if (deviceId) {
      this.speaker.setOutputDevice(deviceId);
    }
  }

  public onOutputDeviceSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.speaker.setOutputDevice(select.value);
    }
  }

  public confirmChannel(key: keyof SpeakerConfirmationStatus, isSuccess: boolean): void {
    this.speaker.confirmResult(key, isSuccess);
    this.state.showToast(isSuccess ? 'Channel verified.' : 'Channel flagged as issue.');
  }

  public setWizardStep(step: number): void {
    this.speaker.stop();
    this.wizardStep.set(step);
  }

  public startStepTest(step: number): void {
    this.speaker.stop();
    this.wizardStep.set(step);
    this.state.markModuleTested('speaker');
  }

  public handleWizardConfirm(key: keyof SpeakerConfirmationStatus, isSuccess: boolean, nextStep: number): void {
    this.confirmChannel(key, isSuccess);
    this.speaker.stop();
    this.wizardStep.set(nextStep);
  }

  public startAgain(): void {
    this.speaker.stop();
    this.speaker.resetConfirmations();
    this.wizardStep.set(1);
    this.state.showToast('Test session reset. Starting from Step 1.');
  }

  public saveReport(): void {
    this.reportService.downloadReportPdf({ includeModules: ['speaker'], template: 'audio' });
  }

  public getStepStatus(val: boolean | null | undefined): 'Passed' | 'Needs Attention' | 'Not Completed' {
    if (val === true) return 'Passed';
    if (val === false) return 'Needs Attention';
    return 'Not Completed';
  }

  public getOverallStatus(): 'Passed' | 'Needs Attention' | 'Not Completed' {
    const c = this.metrics().confirmations;
    if (c.leftConfirmed === null && c.rightConfirmed === null && c.stereoConfirmed === null && c.frequenciesConfirmed === null) {
      return 'Not Completed';
    }
    if (c.leftConfirmed === false || c.rightConfirmed === false || c.stereoConfirmed === false || c.frequenciesConfirmed === false) {
      return 'Needs Attention';
    }
    if (c.leftConfirmed === true && c.rightConfirmed === true && c.stereoConfirmed === true && c.frequenciesConfirmed === true) {
      return 'Passed';
    }
    return 'Needs Attention';
  }

  public getTestingStatusText(): string {
    const step = this.wizardStep();
    if (this.activeTab() === 'workbench') {
      return this.metrics().isPlaying ? 'Playing Sound' : 'Workbench Ready';
    }
    if (step === 1) return 'Step 1 of 5: Device Ready';
    if (step === 2) return 'Step 2 of 5: Left Channel';
    if (step === 3) return 'Step 3 of 5: Right Channel';
    if (step === 4) return 'Step 4 of 5: Stereo Output';
    if (step === 5) return 'Step 5 of 5: Frequency Sweep';
    return 'Testing Complete: Results Ready';
  }

  public resetConfirmations(): void {
    this.speaker.resetConfirmations();
    this.state.showToast('Verification reset.');
  }

  public formatPan(pan: number): string {
    if (Math.abs(pan) < 0.05) return 'Center (0)';
    if (pan < 0) return `Left ${Math.round(Math.abs(pan) * 100)}%`;
    return `Right ${Math.round(pan * 100)}%`;
  }

  public formatConfirmState(val: boolean | null): string {
    if (val === true) return 'Passed';
    if (val === false) return 'Needs Attention';
    return 'Not Completed';
  }

  public getDevIcon(label: string): string {
    const l = (label || '').toLowerCase();
    return l.includes('headphone') || l.includes('airpod') || l.includes('ear') || l.includes('buds') || l.includes('headset')
      ? 'headphones'
      : 'volume-2';
  }

  public async detectHeadphones(): Promise<void> {
    const devs = await this.speaker.detectAudioDevices();
    const count = devs.length;
    this.state.showToast(`Found ${count} audio output device${count === 1 ? '' : 's'}.`);
  }

  public goBackToStudio(): void {
    this.speaker.stop();
    this.state.setActiveTab('landing');
    this.router.navigate(['/devicestudio']);
  }
}
