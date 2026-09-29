import { Component, ChangeDetectionStrategy, signal, computed, input, output, ViewChild, ElementRef, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultDevice, AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultColorService, PEER_NAMED_PALETTE } from '../services/airvault-color.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultLogger } from '../services/airvault-sync-debug.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-airvault-pairing-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" [class.closing]="isClosing()" (click)="onClose()">
      <div class="pairing-modal-card" [class.closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-badge">
            <app-icon name="qr-code" class="icon-sm text-cyan"></app-icon>
            <h2>Pair New Device</h2>
          </div>
          <button class="close-btn" (click)="onClose()" title="Close (Esc)">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Limit Reached Warning Banner -->
        @if (isLimitExceeded()) {
          <div class="limit-exceeded-banner">
            <app-icon name="alert-triangle" class="icon-xs text-amber"></app-icon>
            <span>Connection limit reached (10 devices max). Unpair a device to connect a new one.</span>
          </div>
        }

        <!-- Mode Switcher -->
        <div class="pair-mode-switcher" data-tour="pair-mode-switcher">
          <button class="mode-btn" [class.active]="mode() === 'username-pin'" (click)="setMode('username-pin')">
            <app-icon name="user" class="icon-xs"></app-icon>
            <span>Username & PIN</span>
          </button>
          <button class="mode-btn" [class.active]="mode() === 'qr'" (click)="setMode('qr')">
            <app-icon name="qr-code" class="icon-xs"></app-icon>
            <span>Scan QR Code</span>
          </button>
          <button class="mode-btn" [class.active]="mode() === 'pin'" (click)="setMode('pin')">
            <app-icon name="key" class="icon-xs"></app-icon>
            <span>6-Digit PIN</span>
          </button>
        </div>

        <!-- Mode Content -->
        <div class="modal-body">
          <!-- ── TAB 1: QR CODE / CAMERA SCANNER ── -->
          @if (mode() === 'qr') {
            <div class="qr-pairing-view">
              <!-- Identity Header with dynamic username -->
              <div class="pairing-identity-chip">
                <span class="identity-chip-dot" [style.background]="deviceService.currentDevice().accentColor || '#2196F3'"></span>
                <span class="identity-chip-name">&#64;{{ deviceService.currentDevice().username || 'user' }}</span>
                <span class="identity-chip-sub">Scan to connect directly</span>
              </div>

                <!-- QR or Camera Box (Same frame) -->
                <div class="qr-visual-box">
                  @if (isQrConnecting()) {
                    <div class="qr-connecting-overlay">
                      <app-icon name="loader-2" class="icon-md text-cyan spin-anim"></app-icon>
                      <span class="qr-connecting-title">Establishing Connection</span>
                      <span class="qr-connecting-sub">Exchanging keys with scanned device...</span>
                    </div>
                  } @else if (!isScanning()) {
                    <!-- Original Scannable QR Code containing Network URL -->
                    <img 
                      [src]="qrCodeUrl()" 
                      alt="Scan AirVault QR" 
                      class="qr-img" 
                      loading="eager"
                    />
                  } @else {
                    <!-- Live Camera Stream inside same box -->
                    <div class="scanner-container">
                      <video #cameraVideo class="scanner-video" autoplay playsinline muted></video>
                      <div class="scanner-reticle">
                        <div class="reticle-corner tl"></div>
                        <div class="reticle-corner tr"></div>
                        <div class="reticle-corner bl"></div>
                        <div class="reticle-corner br"></div>
                        <div class="scanner-laser"></div>
                      </div>
                      @if (cameraError()) {
                        <div class="camera-err-badge">
                          <app-icon name="shield-alert" class="icon-sm"></app-icon>
                          <span>{{ cameraError() }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>

                @if (!isScanning() && !isQrConnecting()) {
                  <div class="waiting-peer-pulse">
                    <span class="pulsing-radar-dot"></span>
                    <span>Broadcasting · Waiting for device to scan...</span>
                  </div>
                }

                <!-- Button below the box: Scan Camera toggle -->
                @if (!isScanning()) {
                  <button class="btn-scan-camera" (click)="startCameraScanner()">
                    <app-icon name="scan" class="icon-sm text-cyan"></app-icon>
                    <span>Scan QR Code</span>
                  </button>
                  <p class="qr-guide-text">
                    Scan with your mobile camera to open AirVault and link with <strong>&#64;{{ deviceService.currentDevice().username || 'user' }}</strong>.
                  </p>
                } @else {
                  <button class="btn-scan-camera btn-cancel-scan" (click)="stopCameraScanner()">
                    <app-icon name="x" class="icon-xs"></app-icon>
                    <span>Close Camera</span>
                  </button>
                  <p class="qr-guide-text">
                    Point camera at the QR code on another screen to connect directly.
                  </p>
                }
              </div>
            }

            <!-- ── TAB 2: 6-DIGIT PIN ── -->
            @if (mode() === 'pin') {
              <div class="pin-pairing-view">
                <!-- Connect Identity Header -->
                <div class="pairing-identity-chip">
                  <span class="identity-chip-dot" [style.background]="deviceService.currentDevice().accentColor || '#2196F3'"></span>
                  <span class="identity-chip-name">&#64;{{ deviceService.currentDevice().username || 'user' }}</span>
                  <span class="identity-chip-sub">One-time pairing code</span>
                </div>

                <!-- Display Current Device 6-Digit PIN -->
                <span class="pin-label">YOUR ONE-TIME PAIRING PIN</span>
                <div class="pin-display-box">
                  @for (digit of pin().split(''); track $index) {
                    <div class="pin-digit-cell">{{ digit }}</div>
                  }
                </div>

                <div class="waiting-peer-pulse">
                  <span class="pulsing-radar-dot"></span>
                  <span>Ready · Waiting for peer to enter PIN...</span>
                </div>

                <!-- Divider -->
                <div class="pin-divider">
                  <span class="divider-line"></span>
                  <span class="divider-label">ENTER ANOTHER DEVICE'S 6-DIGIT PIN</span>
                  <span class="divider-line"></span>
                </div>

                <!-- 6 Individual Input Boxes for Remote PIN -->
                <div class="pin-input-group">
                  <input
                    #pinBox0
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[0]"
                    (input)="onPin6Input(0, $event)"
                    (keydown)="onPin6Keydown(0, $event)"
                  />
                  <input
                    #pinBox1
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[1]"
                    (input)="onPin6Input(1, $event)"
                    (keydown)="onPin6Keydown(1, $event)"
                  />
                  <input
                    #pinBox2
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[2]"
                    (input)="onPin6Input(2, $event)"
                    (keydown)="onPin6Keydown(2, $event)"
                  />
                  <input
                    #pinBox3
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[3]"
                    (input)="onPin6Input(3, $event)"
                    (keydown)="onPin6Keydown(3, $event)"
                  />
                  <input
                    #pinBox4
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[4]"
                    (input)="onPin6Input(4, $event)"
                    (keydown)="onPin6Keydown(4, $event)"
                  />
                  <input
                    #pinBox5
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [(ngModel)]="remotePin6Digits[5]"
                    (input)="onPin6Input(5, $event)"
                    (keydown)="onPin6Keydown(5, $event)"
                  />
                </div>

                <!-- Pair Button -->
                <button
                  class="btn-pair-pin"
                  [disabled]="!isRemotePin6Complete() || isPin6Loading()"
                  (click)="onPairWithRemotePin6()"
                >
                  @if (isPin6Loading()) {
                    <app-icon name="loader-2" class="icon-xs spin-anim text-cyan"></app-icon>
                    <span>Pairing with PIN {{ remotePin6Digits.join('') }}...</span>
                  } @else {
                    <app-icon name="link" class="icon-xs"></app-icon>
                    <span>Pair with 6-Digit PIN</span>
                  }
                </button>

                @if (isPin6Loading()) {
                  <div class="active-connecting-banner">
                    <app-icon name="loader-2" class="icon-xs text-cyan spin-anim"></app-icon>
                    <span class="connecting-text">Pairing with remote device...</span>
                    <button class="btn-cancel-connecting" (click)="cancelPin6Connection()">Cancel</button>
                  </div>
                }
              </div>
            }

            <!-- ── TAB 1: USERNAME & 4-DIGIT PIN ── -->
            @if (mode() === 'username-pin') {
              <div class="pin-pairing-view" data-tour="pair-remote-section">
                <!-- Device Persistent Identity Summary with Edit Pencil & Live Availability -->
                <div class="device-identity-summary-banner" data-tour="identity-section">
                  <div class="identity-banner-item">
                    <span class="banner-lbl">MY DEVICE USERNAME</span>
                    @if (isEditingUsername()) {
                      <div class="modal-inline-user-edit-wrapper">
                        <div class="modal-inline-user-edit" [class.valid]="userCheckStatus() === 'available'" [class.invalid]="userCheckStatus() === 'taken' || userCheckStatus() === 'invalid'">
                          <span class="input-at-prefix">&#64;</span>
                          <input
                            type="text"
                            class="modal-username-edit-input"
                            [(ngModel)]="editUsernameValue"
                            (input)="onUsernameInput($event)"
                            (keydown.enter)="userCheckStatus() === 'available' && saveUsername()"
                            (keydown.escape)="cancelUsernameEdit()"
                            placeholder="username"
                            autoFocus
                          />
                          <!-- Status Icon indicator -->
                          @if (userCheckStatus() === 'checking') {
                            <span class="user-status-spinner"></span>
                          } @else if (userCheckStatus() === 'available') {
                            <app-icon name="check" class="icon-xs status-icon text-green"></app-icon>
                          } @else if (userCheckStatus() === 'taken' || userCheckStatus() === 'invalid') {
                            <app-icon name="x" class="icon-xs status-icon text-red"></app-icon>
                          }
                          <button class="user-action-icon-btn save" [disabled]="userCheckStatus() !== 'available'" (click)="saveUsername()" data-tooltip="Save Username">
                            <app-icon name="check" class="icon-xs"></app-icon>
                          </button>
                          <button class="user-action-icon-btn cancel" (click)="cancelUsernameEdit()" data-tooltip="Cancel">
                            <app-icon name="x" class="icon-xs"></app-icon>
                          </button>
                        </div>
                        <!-- Live helper feedback message -->
                        @if (userCheckMessage()) {
                          <span class="user-check-hint" [class.hint-green]="userCheckStatus() === 'available'" [class.hint-red]="userCheckStatus() === 'taken' || userCheckStatus() === 'invalid'">
                            {{ userCheckMessage() }}
                          </span>
                        }
                      </div>
                    } @else {
                      <div class="banner-val-row" (click)="startEditUsername()" data-tooltip="Click to edit username">
                        <span class="banner-val text-cyan">&#64;{{ deviceService.currentDevice().username || 'local' }}</span>
                        <app-icon name="edit-2" class="edit-pencil-icon"></app-icon>
                      </div>
                    }
                  </div>
                  <div class="identity-banner-item">
                    <span class="banner-lbl">MY 4-DIGIT PIN</span>
                    @if (isEditingPin()) {
                      <div class="modal-inline-user-edit-wrapper">
                        <div class="modal-inline-user-edit valid">
                          <input
                            [type]="showPinInEdit() ? 'text' : 'password'"
                            inputmode="numeric"
                            maxlength="4"
                            class="modal-username-edit-input pin-edit"
                            [(ngModel)]="editPinValue"
                            (input)="onPinEditInput($event)"
                            (keydown.enter)="savePin()"
                            (keydown.escape)="cancelPinEdit()"
                            placeholder="••••"
                            autoFocus
                          />
                          <button class="user-action-icon-btn eye" (click)="toggleShowPinInEdit($event)" [attr.data-tooltip]="showPinInEdit() ? 'Hide PIN' : 'Show PIN'">
                            <app-icon [name]="showPinInEdit() ? 'eye-off' : 'eye'" class="icon-xs"></app-icon>
                          </button>
                          <button class="user-action-icon-btn save" [disabled]="editPinValue.trim().length !== 4" (click)="savePin()" data-tooltip="Save PIN">
                            <app-icon name="check" class="icon-xs"></app-icon>
                          </button>
                          <button class="user-action-icon-btn cancel" (click)="cancelPinEdit()" data-tooltip="Cancel">
                            <app-icon name="x" class="icon-xs"></app-icon>
                          </button>
                        </div>
                      </div>
                    } @else {
                      <div class="banner-val-row">
                        <span class="banner-val text-green pin-display-wrapper" [class.is-revealed]="showMyPin()">
                          @if (showMyPin()) {
                            <span class="pin-digits-anim">
                              @for (char of getPinDigits(); track $index) {
                                <span class="pin-digit-char" [style.animation-delay]="$index * 35 + 'ms'">{{ char }}</span>
                              }
                            </span>
                          } @else {
                            <span class="pin-dots-anim">
                              @for (dot of [1,2,3,4]; track $index) {
                                <span class="pin-dot-char" [style.animation-delay]="$index * 25 + 'ms'">•</span>
                              }
                            </span>
                          }
                        </span>
                        <button class="banner-action-btn eye-toggle-btn" (click)="toggleShowMyPin($event)" [attr.data-tooltip]="showMyPin() ? 'Hide PIN' : 'Show PIN'">
                          <app-icon [name]="showMyPin() ? 'eye-off' : 'eye'" class="eye-toggle-icon" [class.active-eye]="showMyPin()"></app-icon>
                        </button>
                        <button class="banner-action-btn edit-toggle-btn" (click)="startEditPin()" data-tooltip="Click to change 4-digit PIN">
                          <app-icon name="edit-2" class="edit-pencil-icon"></app-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- Divider -->
                <div class="pin-divider">
                  <span class="divider-line"></span>
                  <span class="divider-label">PAIR WITH REMOTE USERNAME & 4-DIGIT PIN</span>
                  <span class="divider-line"></span>
                </div>

                <!-- Remote Target Username Input (Centered & Styled) -->
                <div class="remote-pairing-form" data-tour="pair-remote-form">
                <div class="remote-username-field-container">
                  <div class="remote-username-glow-wrapper">
                    <span class="remote-user-prefix">&#64;</span>
                    <input
                      type="text"
                      class="remote-username-styled-input"
                      placeholder="remote_username"
                      [(ngModel)]="remoteUsernameInput"
                      (keydown.enter)="onUsernameEnterKey()"
                    />
                  </div>
                </div>

                <!-- 4 Individual Input Boxes for Remote User PIN -->
                <div class="pin-input-group four-digits" [class.has-error]="hasPinError()">
                  <input
                    #userPin0
                    type="password"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [class.error-cell]="hasPinError()"
                    [(ngModel)]="remoteUser4Digits[0]"
                    (input)="onUserPin4Input(0, $event)"
                    (keydown)="onUserPin4Keydown(0, $event)"
                  />
                  <input
                    #userPin1
                    type="password"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [class.error-cell]="hasPinError()"
                    [(ngModel)]="remoteUser4Digits[1]"
                    (input)="onUserPin4Input(1, $event)"
                    (keydown)="onUserPin4Keydown(1, $event)"
                  />
                  <input
                    #userPin2
                    type="password"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [class.error-cell]="hasPinError()"
                    [(ngModel)]="remoteUser4Digits[2]"
                    (input)="onUserPin4Input(2, $event)"
                    (keydown)="onUserPin4Keydown(2, $event)"
                  />
                  <input
                    #userPin3
                    type="password"
                    inputmode="numeric"
                    maxlength="1"
                    class="pin-input-cell"
                    [class.error-cell]="hasPinError()"
                    [(ngModel)]="remoteUser4Digits[3]"
                    (input)="onUserPin4Input(3, $event)"
                    (keydown)="onUserPin4Keydown(3, $event)"
                  />
                </div>

                @if (pinErrorMessage()) {
                  <div class="pin-error-banner">
                    <app-icon name="alert-triangle" class="icon-xs"></app-icon>
                    <span>{{ pinErrorMessage() }}</span>
                  </div>
                }

                <!-- Pair Button -->
                <button
                  class="btn-pair-pin"
                  [disabled]="!isRemoteUser4Complete() || !remoteUsernameInput.trim() || isPairingLoading()"
                  (click)="onPairWithRemoteUsernamePin()"
                >
                  @if (isPairingLoading()) {
                    <app-icon name="loader-2" class="icon-xs spin-anim text-cyan"></app-icon>
                    <span>Pairing with &#64;{{ remoteUsernameInput.trim() || 'Device' }}...</span>
                  } @else {
                    <app-icon name="link" class="icon-xs"></app-icon>
                    <span>Pair with &#64;{{ remoteUsernameInput.trim() || 'Device' }}</span>
                  }
                </button>
                </div><!-- /remote-pairing-form -->

                <!-- Switch / Login with Existing Identity Option -->
                <div class="existing-account-row">
                  <button class="existing-account-link" (click)="openExistingIdentityLogin()">
                    <app-icon name="user-check" class="icon-xs text-green"></app-icon>
                    <span>Already have an identity? Sign in here</span>
                  </button>
                </div>
              </div>
            }
        </div>

        <div class="modal-footer">
          <div class="security-badge">
            <app-icon name="shield-check" class="icon-xs text-cyan"></app-icon>
            <span>ECDH P-256 Verified Handshake</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(16, 24, 40, 0.65);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      animation: modalBdFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, backdrop-filter;
    }

    .modal-backdrop.closing {
      animation: modalBdFadeOut 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    .pairing-modal-card {
      width: 440px;
      max-width: 90vw;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 14px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 20px var(--av-accent-subtle);
      overflow: hidden;
      animation: pairingModalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .pairing-modal-card.closing {
      animation: pairingModalOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }

    @keyframes modalBdFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes modalBdFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    @keyframes pairingModalIn {
      0% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes pairingModalOut {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
    }

    @keyframes tabPaneFadeIn {
      0% {
        opacity: 0;
        transform: translateY(8px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
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
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    .close-btn:hover {
      color: var(--av-text-main);
      background: var(--av-surface-secondary);
    }

    .pair-mode-switcher {
      display: flex;
      padding: 10px 20px 0;
      gap: 6px;
    }

    .mode-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 6px;
      border-radius: 6px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-muted);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .mode-btn:hover {
      color: var(--av-text-main);
      background: var(--av-surface-primary);
    }
    .mode-btn:active {
      transform: scale(0.96);
    }
    .mode-btn.active {
      background: var(--av-accent-subtle);
      border-color: var(--av-accent);
      color: var(--av-accent);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .modal-body {
      padding: 24px 20px;
    }

    .tab-pane-content,
    .qr-pairing-view,
    .pin-pairing-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: tabPaneFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform;
    }

    .pairing-identity-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 12px;
      background: var(--av-surface-secondary, #161B22);
      border: 1px solid var(--av-border, #30363D);
      border-radius: 9999px;
      font-size: 11px;
    }

    .identity-chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .identity-chip-name {
      font-weight: 700;
      color: var(--av-text-primary, #FFFFFF);
    }

    .identity-chip-sub {
      color: var(--av-text-muted, #8B949E);
      font-size: 10px;
    }

    .qr-pairing-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
    }

    .qr-visual-box {
      width: 190px;
      height: 190px;
      padding: 6px;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 6px;
    }

    /* ── Camera Stream inside QR Box ── */
    .scanner-container {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 6px;
      overflow: hidden;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scanner-reticle {
      position: absolute;
      width: 140px;
      height: 140px;
      pointer-events: none;
      z-index: 10;
    }

    .reticle-corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: var(--av-accent, #00D2B4);
      border-style: solid;
      border-width: 0;
    }
    .reticle-corner.tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 4px; }
    .reticle-corner.tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 4px; }
    .reticle-corner.bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 4px; }
    .reticle-corner.br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 4px; }

    .scanner-laser {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--av-accent, #00D2B4) 50%, transparent);
      box-shadow: 0 0 8px var(--av-accent, #00D2B4);
      animation: laser-sweep 2s ease-in-out infinite alternate;
    }

    @keyframes laser-sweep {
      0% { top: 10%; opacity: 0.4; }
      50% { opacity: 1; }
      100% { top: 90%; opacity: 0.4; }
    }

    .camera-err-badge {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      color: #F87171;
      font-size: 10.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      text-align: center;
    }

    .qr-host-pill-box {
      width: 100%;
      max-width: 320px;
      margin: 4px auto 8px auto;
    }

    .qr-host-display {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--av-surface-secondary);
      border: 1px dashed var(--av-border-strong);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .qr-host-display:hover {
      border-color: var(--av-accent);
      background: var(--av-accent-soft);
    }

    .qr-host-url {
      font-size: 10.5px;
      font-family: var(--av-font-mono, monospace);
      color: var(--av-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .qr-host-edit-btn {
      background: transparent;
      border: none;
      color: var(--av-accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0 2px;
    }

    .qr-host-edit-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .qr-host-input {
      flex: 1;
      height: 26px;
      font-size: 11px;
      font-family: var(--av-font-mono, monospace);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--av-accent);
      background: var(--av-surface-secondary);
      color: var(--av-text-primary);
      outline: none;
    }

    .qr-host-save-btn {
      height: 26px;
      padding: 0 8px;
      font-size: 10.5px;
      font-weight: 600;
      border-radius: 4px;
      border: none;
      background: var(--av-accent);
      color: #FFFFFF;
      cursor: pointer;
    }

    .qr-host-reset-btn {
      height: 26px;
      padding: 0 6px;
      font-size: 10.5px;
      border-radius: 4px;
      border: 1px solid var(--av-border);
      background: transparent;
      color: var(--av-text-muted);
      cursor: pointer;
    }

    .btn-scan-camera {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-primary);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-scan-camera:hover {
      background: var(--av-accent-subtle);
      border-color: var(--av-accent);
      color: var(--av-accent);
    }

    .btn-cancel-scan {
      color: #F87171;
    }
    .btn-cancel-scan:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #F87171;
    }

    .qr-guide-text, .pin-guide-text {
      font-size: 11px;
      color: var(--av-text-muted);
      max-width: 320px;
      margin: 0;
      line-height: 1.4;
    }

    /* ── 6-Digit PIN Styles ── */
    .pin-pairing-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }

    .device-identity-summary-banner {
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 100%;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .identity-banner-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .banner-lbl {
      font-size: 8.5px;
      font-weight: 700;
      color: var(--av-text-muted);
      letter-spacing: 0.05em;
    }
    .banner-val {
      font-size: 11.5px;
      font-weight: 700;
      font-family: monospace;
      color: var(--av-text-primary, #FFFFFF);
    }
    .banner-val-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }
    .banner-val-row:hover {
      background: var(--av-surface-elevated, rgba(255, 255, 255, 0.05));
    }
    .pin-display-wrapper {
      display: inline-flex;
      align-items: center;
      min-width: 32px;
      justify-content: center;
      letter-spacing: 0.12em;
      user-select: none;
    }
    .pin-digits-anim,
    .pin-dots-anim {
      display: inline-flex;
      align-items: center;
      gap: 1.5px;
    }
    .pin-digit-char {
      display: inline-block;
      animation: pinPopReveal 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      font-weight: 800;
      color: #10B981;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }
    .pin-dot-char {
      display: inline-block;
      animation: pinDotReveal 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
      font-size: 14px;
      line-height: 1;
      color: #10B981;
    }
    @keyframes pinPopReveal {
      0% {
        opacity: 0;
        transform: translateY(4px) scale(0.6);
        filter: blur(3px);
      }
      70% {
        transform: translateY(-1px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
    @keyframes pinDotReveal {
      0% {
        opacity: 0;
        transform: scale(0.3);
        filter: blur(2px);
      }
      100% {
        opacity: 1;
        transform: scale(1);
        filter: blur(0);
      }
    }
    .banner-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      padding: 3px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--av-text-muted);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .banner-action-btn:hover {
      background: var(--av-surface-elevated, rgba(255, 255, 255, 0.08));
      color: var(--av-text-primary, #FFFFFF);
      transform: scale(1.1);
    }
    .banner-action-btn:active {
      transform: scale(0.95);
    }
    .eye-toggle-icon {
      width: 13px;
      height: 13px;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .eye-toggle-icon.active-eye {
      color: #10B981;
      filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.5));
    }
    .banner-action-btn:hover .eye-toggle-icon {
      color: #10B981;
    }
    .banner-val-row:hover .edit-pencil-icon {
      opacity: 1;
      color: var(--av-accent);
    }
    .edit-pencil-icon {
      width: 12px;
      height: 12px;
      opacity: 0.6;
      transition: all 0.15s ease;
    }
    .modal-inline-user-edit-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .modal-inline-user-edit {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      transition: all 0.2s ease;
    }
    .modal-inline-user-edit.valid {
      border-color: #10B981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }
    .modal-inline-user-edit.invalid {
      border-color: #EF4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
    }
    .modal-username-edit-input {
      padding: 2px 4px;
      border: none;
      background: transparent;
      color: var(--av-text-primary);
      font-size: 11px;
      font-weight: 600;
      width: 100px;
      outline: none;
    }
    .user-status-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--av-accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .status-icon {
      width: 12px;
      height: 12px;
    }
    .text-green { color: #10B981; }
    .text-red { color: #EF4444; }
    .user-check-hint {
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .hint-green { color: #10B981; }
    .hint-red { color: #EF4444; }
    .user-action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
    }
    .user-action-icon-btn.save { background: #10B981; color: #FFFFFF; }
    .user-action-icon-btn.save:disabled { opacity: 0.35; cursor: not-allowed; }
    .user-action-icon-btn.cancel { background: var(--av-surface-elevated); color: var(--av-text-muted); border: 1px solid var(--av-border); }

    /* ── Centered & Styled Remote Username Input ── */
    .remote-pairing-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }
    .remote-username-field-container {
      display: flex;
      justify-content: center;
      width: 100%;
      margin: 0 0 2px;
    }
    .remote-username-glow-wrapper {
      display: inline-flex;
      align-items: center;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #30363D);
      border-radius: 8px;
      padding: 0 14px;
      width: 260px;
      height: 42px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }
    .remote-username-glow-wrapper:focus-within {
      border-color: var(--av-accent, #2196F3);
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }
    .remote-user-prefix {
      font-size: 15px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
      margin-right: 6px;
      user-select: none;
      flex-shrink: 0;
    }
    .remote-username-styled-input {
      border: none;
      background: transparent;
      outline: none;
      color: var(--av-text-primary, #FFFFFF);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      width: 100%;
      padding: 0;
    }
    .remote-username-styled-input::placeholder {
      color: var(--av-text-muted, #8B949E);
      opacity: 0.6;
      font-weight: 400;
    }

    .pin-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--av-text-muted);
    }

    .pin-display-box {
      display: flex;
      gap: 6px;
    }

    .pin-digit-cell {
      width: 38px;
      height: 48px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-accent);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      font-family: monospace;
      color: var(--av-accent);
      box-shadow: 0 0 10px var(--av-accent-subtle);
    }

    .pin-divider {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 10px;
      margin: 8px 0 4px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: var(--av-border);
    }

    .divider-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--av-text-muted);
      white-space: nowrap;
    }

    /* Individual Input Boxes */
    .pin-input-group {
      display: flex;
      justify-content: center;
      width: 100%;
      gap: 6px;
    }

    .pin-input-cell {
      width: 38px;
      height: 48px;
      border-radius: 8px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-main);
      font-size: 20px;
      font-weight: 800;
      font-family: monospace;
      text-align: center;
      outline: none;
      transition: all 0.15s ease;
    }

    .pin-input-cell:focus {
      border-color: var(--av-accent);
      box-shadow: 0 0 8px var(--av-accent-subtle);
      background: var(--av-surface-primary);
    }

    .pin-input-cell.error-cell {
      border: 1.5px solid #EF4444 !important;
      background: rgba(239, 68, 68, 0.08) !important;
      color: #EF4444 !important;
      animation: pinShake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    .pin-error-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #EF4444;
      font-size: 11px;
      font-weight: 600;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes pinShake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
      40%, 60% { transform: translate3d(3px, 0, 0); }
    }

    .btn-pair-pin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: 6px;
      background: var(--av-accent);
      color: #000000;
      font-size: 12px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      margin-top: 4px;
      transition: opacity 0.15s ease;
    }

    .btn-pair-pin:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spin-anim {
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .qr-connecting-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      background: var(--av-surface-primary, #111419);
      padding: 16px;
      text-align: center;
      border-radius: 8px;
    }

    .qr-connecting-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-main, #FFFFFF);
    }

    .qr-connecting-sub {
      font-size: 10.5px;
      color: var(--av-text-muted, #8B949E);
    }

    .waiting-peer-pulse {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border-subtle, #252B33);
      font-size: 10px;
      color: var(--av-text-muted, #8B949E);
      margin: 2px 0 4px;
    }

    .pulsing-radar-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--av-accent, #2196F3);
      box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
      animation: radar-pulse 1.8s infinite;
    }

    @keyframes radar-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(33, 150, 243, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
      }
    }

    .active-connecting-banner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.25);
      color: var(--av-accent, #2196F3);
      font-size: 11px;
      font-weight: 600;
      margin-top: 8px;
      animation: fadeIn 0.15s ease-out;
    }

    .btn-cancel-connecting {
      background: transparent;
      border: 1px solid rgba(33, 150, 243, 0.4);
      color: var(--av-accent, #2196F3);
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 4px;
    }
    .btn-cancel-connecting:hover {
      background: rgba(33, 150, 243, 0.2);
    }

    .existing-account-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 6px;
    }

    .existing-account-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px dashed var(--av-border);
      border-radius: 6px;
      padding: 6px 12px;
      color: var(--av-text-muted);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .existing-account-link:hover {
      background: var(--av-surface-secondary);
      border-color: #10B981;
      color: var(--av-text-primary, #F0F3F6);
    }

    .simulate-pairing-view {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* ── Step 2: Name Device & Dual Customization ── */
    .name-device-view {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 4px;
    }

    .verified-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    .verified-icon-glow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: rgba(33, 150, 243, 0.12);
      border: 1px solid rgba(33, 150, 243, 0.25);
    }

    .verified-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .verified-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
      letter-spacing: -0.01em;
    }

    .verified-desc {
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
    }

    .dual-custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 580px) {
      .dual-custom-grid {
        grid-template-columns: 1fr;
      }
    }

    .device-custom-card {
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .device-custom-card.self-card {
      border-color: rgba(33, 150, 243, 0.35);
      background: rgba(33, 150, 243, 0.03);
    }

    .device-custom-card.peer-card {
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.03);
    }

    .self-identity-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--av-surface-primary, #0E1217);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    .self-avatar-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--av-surface-secondary, #171B21);
      border: 2px solid #2196F3;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .self-identity-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .self-name-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
    }

    .self-desc-label {
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
    }

    .custom-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .owner-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 20px;
      background: rgba(33, 150, 243, 0.15);
      color: #2196F3;
      font-size: 10.5px;
      font-weight: 700;
    }

    .peer-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      font-size: 10.5px;
      font-weight: 700;
    }

    .card-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: var(--av-text-muted, #8B949E);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .device-type-mini-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .mini-type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 2px;
      background: var(--av-surface-primary, #0E1217);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 6px;
      color: var(--av-text-muted, #8B949E);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .mini-type-btn:hover {
      border-color: var(--av-border-strong, #363D47);
      color: var(--av-text-primary, #F0F3F6);
    }

    .mini-type-btn.selected {
      border-color: var(--accent, #2196F3);
      color: var(--accent, #2196F3);
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 0 1px var(--accent, #2196F3);
    }

    .color-palette {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
      padding: 0;
    }

    .color-dot:hover {
      transform: scale(1.15);
    }

    .color-dot.selected {
      border-color: #FFFFFF;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
      transform: scale(1.15);
    }

    .av-form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .av-field-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--av-text-muted, #8B949E);
    }

    .av-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .av-input-icon {
      position: absolute;
      left: 12px;
      color: var(--av-text-muted, #8B949E);
      pointer-events: none;
    }

    .locked-identity-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 40px;
      padding: 0 12px;
      background: var(--av-surface-primary, #0E1217);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
    }

    .identity-lead {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .device-icon-circle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1.5px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .identity-handle-text {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
      letter-spacing: 0.02em;
    }

    .locked-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--av-border, #252B33);
      color: var(--av-text-muted, #8B949E);
      font-size: 10.5px;
      font-weight: 600;
      user-select: none;
    }

    .device-type-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .type-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 6px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      border-radius: 8px;
      color: var(--av-text-muted, #8B949E);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .type-pill:hover {
      border-color: var(--av-border-strong, #363D47);
      color: var(--av-text-primary, #F0F3F6);
      background: var(--av-surface-elevated, #1A1F26);
    }

    .type-pill.selected {
      border-color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.09);
      color: var(--av-accent, #2196F3);
      font-weight: 700;
    }

    .modal-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .av-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 6px;
      background: var(--av-surface-secondary, #171B21);
      border: 1px solid var(--av-border, #252B33);
      color: var(--av-text-primary, #F0F3F6);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .av-btn-secondary:hover {
      background: var(--av-surface-elevated, #1A1F26);
    }

    .av-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      background: var(--av-accent, #2196F3);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: filter 0.15s ease, opacity 0.15s ease;
    }
    .av-btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    .av-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px 14px;
      border-top: 1px solid var(--av-border-subtle);
    }

    .security-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 600;
      color: var(--av-text-muted);
    }

    .text-cyan { color: var(--av-accent); }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultPairingModalComponent implements OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('pinBox0') pinBox0?: ElementRef<HTMLInputElement>;
  @ViewChild('pinBox1') pinBox1?: ElementRef<HTMLInputElement>;
  @ViewChild('pinBox2') pinBox2?: ElementRef<HTMLInputElement>;
  @ViewChild('pinBox3') pinBox3?: ElementRef<HTMLInputElement>;
  @ViewChild('pinBox4') pinBox4?: ElementRef<HTMLInputElement>;
  @ViewChild('pinBox5') pinBox5?: ElementRef<HTMLInputElement>;

  @ViewChild('userPin0') userPin0?: ElementRef<HTMLInputElement>;
  @ViewChild('userPin1') userPin1?: ElementRef<HTMLInputElement>;
  @ViewChild('userPin2') userPin2?: ElementRef<HTMLInputElement>;
  @ViewChild('userPin3') userPin3?: ElementRef<HTMLInputElement>;

  pin = input.required<string>();
  close = output<void>();
  deviceAdded = output<AirVaultDevice>();

  isClosing = signal<boolean>(false);
  step = signal<'select-mode' | 'name-device'>('select-mode');
  mode = signal<'qr' | 'pin' | 'username-pin'>('username-pin');
  isScanning = signal<boolean>(false);
  cameraError = signal<string>('');

  isEditingUsername = signal<boolean>(false);
  editUsernameValue = '';
  userCheckStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  userCheckMessage = signal<string>('');
  private usernameDebounceTimer: any = null;

  isEditingPin = signal<boolean>(false);
  editPinValue = '';
  showMyPin = signal<boolean>(false);
  showPinInEdit = signal<boolean>(false);

  onClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    this.stopCameraScanner();
    setTimeout(() => {
      this.close.emit();
    }, 220);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(e: any) {
    if (this.isEditingUsername()) {
      this.cancelUsernameEdit();
      return;
    }
    if (this.isEditingPin()) {
      this.cancelPinEdit();
      return;
    }
    if (this.isScanning()) {
      this.stopCameraScanner();
      return;
    }
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    this.onClose();
  }

  toggleShowMyPin(event?: Event) {
    if (event) event.stopPropagation();
    this.showMyPin.update(v => !v);
  }

  toggleShowPinInEdit(event?: Event) {
    if (event) event.stopPropagation();
    this.showPinInEdit.update(v => !v);
  }

  getPinDigits(): string[] {
    const pin = this.deviceService.currentDevice().deviceKeyword || '----';
    return pin.split('');
  }

  startEditPin() {
    this.editPinValue = this.deviceService.currentDevice().deviceKeyword || '';
    this.isEditingPin.set(true);
  }

  onPinEditInput(event: any) {
    const val = event.target.value.replace(/\D/g, '').slice(0, 4);
    this.editPinValue = val;
  }

  savePin() {
    const val = this.editPinValue.trim();
    if (/^\d{4}$/.test(val)) {
      this.deviceService.updatePin(val);
      this.isEditingPin.set(false);
      this.uiStore.triggerToast('✓ PIN updated and saved to database');
      this.cdr.markForCheck();
    }
  }

  cancelPinEdit() {
    this.isEditingPin.set(false);
  }

  startEditUsername() {
    this.editUsernameValue = this.deviceService.currentDevice().username || '';
    this.userCheckStatus.set('available');
    this.userCheckMessage.set('');
    this.isEditingUsername.set(true);
  }

  onUsernameInput(event: any) {
    const val = event.target.value.trim().toLowerCase();
    this.editUsernameValue = val;

    if (!val) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Username cannot be empty');
      return;
    }

    if (val.length < 3) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Too short (min 3 characters)');
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(val)) {
      this.userCheckStatus.set('invalid');
      this.userCheckMessage.set('Only letters, numbers, _, -, . allowed');
      return;
    }

    if (val === (this.deviceService.currentDevice().username || '').toLowerCase()) {
      this.userCheckStatus.set('available');
      this.userCheckMessage.set('Current username');
      return;
    }

    this.userCheckStatus.set('checking');
    this.userCheckMessage.set('Checking availability...');

    if (this.usernameDebounceTimer) {
      clearTimeout(this.usernameDebounceTimer);
    }

    this.usernameDebounceTimer = setTimeout(() => {
      this.deviceService.checkUsernameAvailability(val).subscribe((res: any) => {
        if (res.available) {
          this.userCheckStatus.set('available');
          this.userCheckMessage.set('✓ Username is available');
        } else {
          this.userCheckStatus.set('taken');
          this.userCheckMessage.set(`✕ ${res.message || 'Username already taken'}`);
        }
        this.cdr.markForCheck();
      });
    }, 350);
  }

  saveUsername() {
    const val = this.editUsernameValue.trim().toLowerCase();
    if (val && this.userCheckStatus() === 'available') {
      this.deviceService.updateUsername(val);
      this.isEditingUsername.set(false);
    }
  }

  cancelUsernameEdit() {
    this.isEditingUsername.set(false);
    if (this.usernameDebounceTimer) {
      clearTimeout(this.usernameDebounceTimer);
    }
  }

  newDeviceName = signal<string>('iPad Pro 13"');
  newDeviceType = signal<'smartphone' | 'tablet' | 'laptop' | 'desktop'>('tablet');

  public deviceService = inject(AirVaultDeviceService);
  private syncService = inject(AirVaultSyncService);
  public uiStore = inject(AirVaultUIStore);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  // Step 2 Dual Customization form state
  selfDeviceName = this.deviceService.currentDevice().username || this.deviceService.currentDevice().name;
  selfDeviceType: 'smartphone' | 'tablet' | 'laptop' | 'desktop' = this.deviceService.currentDevice().type;
  selfAccentColor = this.deviceService.currentDevice().accentColor || '#2096f3';

  pairedDeviceName = 'peer_user';
  pairedDeviceType: 'smartphone' | 'tablet' | 'laptop' | 'desktop' = 'smartphone';
  pairedAccentColor = this.deviceService.getAvailableAccentColor();

  // Curated High-Contrast Peer Accent Palette (Owner Theme Blue is strictly reserved)
  peerAccentPalette = PEER_NAMED_PALETTE;

  isLimitExceeded = computed(() => this.deviceService.pairedDevices().filter(d => d.status !== 'revoked').length >= 10);

  availablePeerAccentColors = computed(() => {
    const paired = this.deviceService.pairedDevices();
    const takenHexes = new Set(paired.map(d => (d.accentColor || '').toUpperCase()));
    return this.peerAccentPalette.map(c => ({
      ...c,
      isTaken: takenHexes.has(c.hex.toUpperCase())
    }));
  });

  private pendingDeviceDraft: Partial<AirVaultDevice> | null = null;
  remotePin6Digits = ['', '', '', '', '', ''];
  remoteUsernameInput = '';
  remoteUser4Digits = ['', '', '', ''];

  hasPinError = signal<boolean>(false);
  pinErrorMessage = signal<string>('');
  isPairingLoading = signal<boolean>(false);
  isPin6Loading = signal<boolean>(false);
  isQrConnecting = signal<boolean>(false);

  private mediaStream: MediaStream | null = null;
  private scanInterval: any = null;
  private peerPairedSub: any = null;

  constructor() {
    // When a remote peer connects via QR, PIN or Username handshake, close modal immediately
    this.peerPairedSub = this.syncService.onPeerPaired.subscribe((peerDevice: AirVaultDevice) => {
      AirVaultLogger.info('[AirVault Pairing Modal] ⚡ Remote peer paired event received:', peerDevice?.name);
      this.ngZone.run(() => {
        this.isPin6Loading.set(false);
        this.isQrConnecting.set(false);
        this.isPairingLoading.set(false);
        this.stopCameraScanner();
        this.deviceAdded.emit(peerDevice);
        this.close.emit();
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      });
    });
  }

  ngOnInit() {
    AirVaultLogger.debug(`[AirVault Pairing Modal] 🚀 Initialized in mode: "${this.mode()}", step: "${this.step()}"`);
  }

  // Dynamic domain/IP from central environment config with this device's PIN encoded
  get networkUrl(): string {
    const origin = environment.getOrigin().replace(/\/+$/, '');
    return `${origin}/tools/app/airvault?pin=${encodeURIComponent(this.pin())}`;
  }

  qrCodeUrl = computed(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.networkUrl)}&color=09-09-0b&bgcolor=ffffff&margin=1`;
  });

  setMode(newMode: 'qr' | 'pin' | 'username-pin') {
    this.mode.set(newMode);
    this.step.set('select-mode');
    if (newMode !== 'qr') {
      this.stopCameraScanner();
    }
  }

  async startCameraScanner() {
    this.isScanning.set(true);
    this.cameraError.set('');

    const isSecure = typeof window !== 'undefined' && (
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );

    if (!isSecure) {
      this.cameraError.set('Web browsers require HTTPS or localhost for camera access. Open this via ngrok HTTPS URL on mobile.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access is not supported on this browser.');
      return;
    }

    try {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (this.cameraVideo && this.cameraVideo.nativeElement) {
        this.cameraVideo.nativeElement.srcObject = this.mediaStream;
        await this.cameraVideo.nativeElement.play();
        this.startQrDetectionLoop();
      }
    } catch (err: any) {
      this.cameraError.set('Camera permission denied or camera not found.');
      this.isScanning.set(false);
    }
  }

  stopCameraScanner() {
    this.isScanning.set(false);
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  private startQrDetectionLoop() {
    if (typeof (window as any).BarcodeDetector === 'undefined') {
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      this.scanInterval = setInterval(async () => {
        if (!this.cameraVideo?.nativeElement || !this.isScanning()) return;
        try {
          const barcodes = await barcodeDetector.detect(this.cameraVideo.nativeElement);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            this.handleScannedUrl(rawValue);
          }
        } catch { }
      }, 500);
    } catch { }
  }

  private handleScannedUrl(scannedUrl: string) {
    this.stopCameraScanner();
    try {
      const match = scannedUrl.match(/[?&]pin=(\d{6})/) || scannedUrl.match(/\b\d{6}\b/);
      if (match) {
        const pin = match[1] || match[0];
        AirVaultLogger.info(`[AirVault Scanner] 📸 Scanned QR code with PIN [${pin.slice(0, 2)}****]. Initiating direct connection handshake...`);

        if (this.isLimitExceeded()) {
          this.uiStore.triggerToast('🚫 Connection limit reached (10 devices max). Please unpair a device first.');
          return;
        }

        this.isQrConnecting.set(true);
        setTimeout(() => this.isQrConnecting.set(false), 6000);

        this.syncService.pairWithPin(pin, this.deviceService.currentDevice().name);
        this.uiStore.triggerToast('Connecting to device with PIN...');
      } else {
        AirVaultLogger.warn('[AirVault Scanner] ⚠️ No 6-digit PIN found in scanned content');
      }
    } catch (e) {
      AirVaultLogger.error('[AirVault Scanner] Error parsing scanned QR:', e);
    }
  }

  // 6-digit input auto-focus and auto-submit handling
  onPin6Input(index: number, event: any) {
    const val = event.target.value;
    if (val && val.length > 0) {
      this.remotePin6Digits[index] = val.slice(-1);
      const nextBox = this.getPin6Box(index + 1);
      if (nextBox) {
        nextBox.nativeElement.focus();
      } else if (this.isRemotePin6Complete()) {
        this.onPairWithRemotePin6();
      }
    }
  }

  onPin6Keydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.isRemotePin6Complete()) {
        this.onPairWithRemotePin6();
      }
    } else if (event.key === 'Backspace' && !this.remotePin6Digits[index] && index > 0) {
      const prevBox = this.getPin6Box(index - 1);
      if (prevBox) {
        prevBox.nativeElement.focus();
      }
    }
  }

  private getPin6Box(idx: number): ElementRef<HTMLInputElement> | undefined {
    const boxes = [this.pinBox0, this.pinBox1, this.pinBox2, this.pinBox3, this.pinBox4, this.pinBox5];
    return boxes[idx];
  }

  isRemotePin6Complete(): boolean {
    return this.remotePin6Digits.every(d => d.trim().length === 1);
  }

  onPairWithRemotePin6() {
    if (!this.isRemotePin6Complete() || this.isPin6Loading()) return;
    const fullPin = this.remotePin6Digits.join('');

    if (this.isLimitExceeded()) {
      this.uiStore.triggerToast('🚫 Connection limit reached (10 devices max). Please unpair a device first.');
      return;
    }

    this.isPin6Loading.set(true);
    setTimeout(() => this.isPin6Loading.set(false), 20000);

    AirVaultLogger.info(`[AirVault PIN Pairing] 🚀 Initiating PIN handshake with code [${fullPin.slice(0, 2)}****]`);
    this.syncService.pairWithPin(fullPin, this.deviceService.currentDevice().name);
    this.uiStore.triggerToast('Connecting to device with PIN...');
  }

  cancelPin6Connection() {
    this.isPin6Loading.set(false);
  }

  onUsernameEnterKey() {
    if (this.isRemoteUser4Complete()) {
      this.onPairWithRemoteUsernamePin();
    } else if (this.userPin0) {
      this.userPin0.nativeElement.focus();
    }
  }

  // 4-digit User PIN auto-focus, Enter submission, and auto-submit handling
  onUserPin4Input(index: number, event: any) {
    this.hasPinError.set(false);
    this.pinErrorMessage.set('');
    const val = event.target.value;
    if (val && val.length > 0) {
      this.remoteUser4Digits[index] = val.slice(-1);
      const nextBox = this.getUserPinBox(index + 1);
      if (nextBox) {
        nextBox.nativeElement.focus();
      } else if (this.isRemoteUser4Complete() && this.remoteUsernameInput.trim()) {
        this.onPairWithRemoteUsernamePin();
      }
    }
  }

  onUserPin4Keydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.isRemoteUser4Complete() && this.remoteUsernameInput.trim()) {
        this.onPairWithRemoteUsernamePin();
      }
    } else if (event.key === 'Backspace' && !this.remoteUser4Digits[index] && index > 0) {
      const prevBox = this.getUserPinBox(index - 1);
      if (prevBox) {
        prevBox.nativeElement.focus();
      }
    }
  }

  private getUserPinBox(idx: number): ElementRef<HTMLInputElement> | undefined {
    const boxes = [this.userPin0, this.userPin1, this.userPin2, this.userPin3];
    return boxes[idx];
  }

  isRemoteUser4Complete(): boolean {
    return this.remoteUser4Digits.every(d => d.trim().length === 1);
  }

  onPairWithRemoteUsernamePin() {
    if (!this.isRemoteUser4Complete() || !this.remoteUsernameInput.trim() || this.isPairingLoading()) return;
    const fullPin = this.remoteUser4Digits.join('');
    const targetUser = this.remoteUsernameInput.trim().toLowerCase();

    if (this.isLimitExceeded()) {
      this.uiStore.triggerToast('🚫 Connection limit reached (10 devices max). Please unpair a device first.');
      return;
    }

    this.hasPinError.set(false);
    this.pinErrorMessage.set('');
    this.isPairingLoading.set(true);

    this.deviceService.verifyAndPairWithUsernamePin(targetUser, fullPin).subscribe(res => {
      this.isPairingLoading.set(false);
      if (res.success && res.device) {
        const autoAccent = this.deviceService.getAvailableAccentColor();
        const peerDevice: AirVaultDevice = {
          ...res.device,
          name: res.device.username ? `@${res.device.username}` : `@${targetUser}`,
          accentColor: autoAccent,
          status: 'active',
          lastActive: Date.now(),
          syncEnabled: true
        };

        this.deviceService.clearManualDisconnect(peerDevice.id);
        const added = this.deviceService.addPairedDevice(peerDevice);
        if (added) {
          this.deviceService.setDeviceStatus(peerDevice.id, 'active');
          this.deviceService.fetchRegisteredSessions();
          const cur = this.deviceService.currentDevice();
          const confirmPayload = {
            targetDeviceId: peerDevice.id,
            targetUsername: targetUser,
            device: {
              id: cur.id,
              name: cur.name,
              username: cur.username,
              type: cur.type,
              os: cur.os,
              browser: cur.browser,
              thumbprint: cur.thumbprint,
              ipHint: cur.ipHint,
              status: 'active',
              lastActive: Date.now(),
              isCurrent: false,
              syncEnabled: true,
              accentColor: cur.accentColor || '#2196F3'
            }
          };

          // 1. Send direct to peer ID if known
          if (peerDevice.id) {
            this.syncService.sendSignalMessageDirect('PAIR_CONFIRM', JSON.stringify(confirmPayload), peerDevice.id);
            this.syncService.sendSignalMessageDirect('DEVICE_ONLINE', JSON.stringify({ deviceId: cur.id, senderDevice: confirmPayload.device }), peerDevice.id);
          }
          // 2. Broadcast via network signaling relay so Mobile receives it immediately
          this.syncService.broadcastSignal('PAIR_CONFIRM', confirmPayload);
          this.syncService.broadcastSignal('DEVICE_ONLINE', { deviceId: cur.id, senderDevice: confirmPayload.device });
          this.syncService.pairWithPin(fullPin, cur.name);

          this.deviceAdded.emit(peerDevice);
          this.uiStore.openSyncConsent(peerDevice);
          this.uiStore.triggerToast(`✓ Connected & Paired with @${targetUser}!`);
          this.close.emit();
        } else {
          this.uiStore.triggerToast('🚫 Connection limit reached (10 devices max).');
        }
      } else {
        // WRONG PIN: Erase all 4 digits, apply red border, and focus back to first box
        this.hasPinError.set(true);
        this.pinErrorMessage.set(res.message || 'Incorrect PIN for @' + targetUser);
        this.remoteUser4Digits = ['', '', '', ''];
        this.uiStore.triggerToast(`⛔ Incorrect PIN for @${targetUser}`);
        if (this.userPin0) {
          this.userPin0.nativeElement.focus();
        }
      }
      this.cdr.markForCheck();
    });
  }

  openExistingIdentityLogin() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    this.stopCameraScanner();
    setTimeout(() => {
      this.close.emit();
      this.uiStore.identityOnboardingInitialView.set('login');
      this.uiStore.showIdentityOnboardingModal.set(true);
    }, 220);
  }

  onSimulateAdd() {
    this.pendingDeviceDraft = {
      id: 'dev-sim-' + Date.now().toString(36),
      type: this.newDeviceType(),
      os: this.newDeviceType() === 'tablet' ? 'iPad' : 'Windows',
      browser: 'Client App',
      thumbprint: 'AV-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      ipHint: environment.networkHost,
      status: 'active',
      lastActive: Date.now(),
      isCurrent: false
    };
    this.pairedDeviceName = this.newDeviceName().trim();
    this.pairedDeviceType = this.newDeviceType();
    this.step.set('name-device');
  }

  ngOnDestroy() {
    this.stopCameraScanner();
    if (this.peerPairedSub) {
      this.peerPairedSub.unsubscribe();
      this.peerPairedSub = null;
    }
  }
}

