import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
  AfterViewInit,
  SecurityContext
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent } from '../icon/icon';
import { AckletMessage, AckletMessageType } from '../../../core/services/tool-sdk';

export interface ToolSandboxEvent<T = any> {
  type: AckletMessageType;
  toolId: string;
  payload?: T;
}

@Component({
  selector: 'app-tool-sandbox-host',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="sandbox-container" [class.has-error]="isFrozen() || hasCrashed()">
      
      <!-- Unresponsive / Freeze Recovery Notice -->
      @if (isFrozen()) {
        <div class="sandbox-freeze-banner" role="alert">
          <div class="banner-content">
            <app-icon name="alert-octagon" class="size-4 text-red-500" />
            <div class="banner-text">
              <span class="banner-title">{{ toolTitle() || toolId() }} is unresponsive</span>
              <span class="banner-sub">Heartbeat missed {{ missedPongs() }} consecutive pings. The host shell remains fully responsive.</span>
            </div>
          </div>
          <div class="banner-actions">
            <button class="btn-reload-tool" (click)="reloadIframe()">
              <app-icon name="rotate-cw" class="size-3.5" />
              <span>Reload tool</span>
            </button>
          </div>
        </div>
      }

      <!-- Tool Crash Banner -->
      @if (hasCrashed() && !isFrozen()) {
        <div class="sandbox-crash-banner" role="alert">
          <div class="banner-content">
            <app-icon name="alert-triangle" class="size-4 text-amber-500" />
            <div class="banner-text">
              <span class="banner-title">Tool encountered a runtime error</span>
              <span class="banner-sub">{{ crashMessage() || 'An internal error occurred inside the sandbox.' }}</span>
            </div>
          </div>
          <div class="banner-actions">
            <button class="btn-reload-tool" (click)="reloadIframe()">
              <app-icon name="rotate-cw" class="size-3.5" />
              <span>Reload tool</span>
            </button>
          </div>
        </div>
      }

      <!-- Isolated Sandbox iFrame -->
      <iframe
        #sandboxIframe
        class="sandbox-iframe"
        [src]="trustedUrl()"
        [title]="toolTitle() || toolId()"
        [sandbox]="sandboxPermissions"
        (load)="onIframeLoaded()"
      ></iframe>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    .sandbox-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--av-bg-canvas, var(--color-surface-950, #ffffff));
    }
    .sandbox-iframe {
      width: 100%;
      height: 100%;
      flex: 1;
      border: none;
      display: block;
      background: transparent;
    }
    .sandbox-freeze-banner {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 16px;
      border-radius: 10px;
      background: #7F1D1D;
      border: 1px solid #DC2626;
      color: #FEE2E2;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      max-width: 90%;
      animation: banner-slide-down 0.3s ease-out;
    }
    .sandbox-crash-banner {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 16px;
      border-radius: 10px;
      background: #78350F;
      border: 1px solid #D97706;
      color: #FEF3C7;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      max-width: 90%;
      animation: banner-slide-down 0.3s ease-out;
    }
    .banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .banner-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .banner-title {
      font-weight: 700;
      font-size: 12.5px;
    }
    .banner-sub {
      font-size: 11.5px;
      opacity: 0.9;
    }
    .btn-reload-tool {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      background: #FFFFFF;
      color: #7F1D1D;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: transform 0.15s ease, background 0.15s ease;
      white-space: nowrap;
    }
    .btn-reload-tool:hover {
      transform: scale(1.04);
      background: #FEE2E2;
    }
    @keyframes banner-slide-down {
      from { transform: translate(-50%, -20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolSandboxHostComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sandboxIframe') sandboxIframe!: ElementRef<HTMLIFrameElement>;

  toolId = input.required<string>();
  toolTitle = input<string>('');
  toolSrc = input.required<string>();

  toolEvent = output<ToolSandboxEvent>();

  // Strict sandboxing permissions: allows script execution and forms, blocks top-level hijacking
  readonly sandboxPermissions = 'allow-scripts allow-forms allow-same-origin allow-popups allow-downloads';

  trustedUrl = signal<SafeResourceUrl>('');
  isReady = signal<boolean>(false);
  isFrozen = signal<boolean>(false);
  hasCrashed = signal<boolean>(false);
  crashMessage = signal<string>('');
  missedPongs = signal<number>(0);

  private heartbeatTimer: any;
  private pongTimeoutTimer: any;
  private messageListener?: (e: MessageEvent) => void;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.trustedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.toolSrc()));
    this.setupHostMessageListener();
  }

  ngAfterViewInit() {
    this.startHeartbeatLiveness();
  }

  ngOnDestroy() {
    this.stopHeartbeatLiveness();
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
  }

  onIframeLoaded() {
    this.isFrozen.set(false);
    this.hasCrashed.set(false);
    this.missedPongs.set(0);
  }

  reloadIframe() {
    if (this.sandboxIframe?.nativeElement) {
      this.isFrozen.set(false);
      this.hasCrashed.set(false);
      this.missedPongs.set(0);
      const currentSrc = this.toolSrc();
      // Re-trigger src to reload only the sandboxed iframe
      const freshUrl = currentSrc + (currentSrc.includes('?') ? '&' : '?') + '_t=' + Date.now();
      this.trustedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(freshUrl));
    }
  }

  /**
   * Send a message from host shell to the sandboxed tool iframe.
   */
  sendMessageToTool<T>(type: AckletMessageType, payload?: T) {
    const iframeWindow = this.sandboxIframe?.nativeElement?.contentWindow;
    if (!iframeWindow) return;

    const message: AckletMessage<T> = {
      type,
      toolId: this.toolId(),
      payload,
      timestamp: Date.now(),
      messageId: 'host_' + Math.random().toString(36).substring(2, 10)
    };

    iframeWindow.postMessage(message, '*');
  }

  private startHeartbeatLiveness() {
    this.heartbeatTimer = setInterval(() => {
      if (this.hasCrashed()) return;

      const iframeWindow = this.sandboxIframe?.nativeElement?.contentWindow;
      if (!iframeWindow) return;

      // Send Ping
      this.sendMessageToTool('HEARTBEAT_PING', { pingTime: Date.now() });

      // Expect Pong within 1500ms
      this.pongTimeoutTimer = setTimeout(() => {
        const currentMisses = this.missedPongs() + 1;
        this.missedPongs.set(currentMisses);

        if (currentMisses >= 3) {
          this.isFrozen.set(true);
        }
      }, 1500);
    }, 3000);
  }

  private stopHeartbeatLiveness() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
  }

  private setupHostMessageListener() {
    this.messageListener = (event: MessageEvent) => {
      const data = event.data as AckletMessage;
      if (!data || data.toolId !== this.toolId()) return;

      if (data.type === 'HEARTBEAT_PONG') {
        if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
        this.missedPongs.set(0);
        this.isFrozen.set(false);
        return;
      }

      if (data.type === 'READY') {
        this.isReady.set(true);
        this.isFrozen.set(false);
        this.missedPongs.set(0);
      } else if (data.type === 'ERROR') {
        this.hasCrashed.set(true);
        this.crashMessage.set(data.payload?.message || 'Tool error reported');
      }

      this.toolEvent.emit({
        type: data.type,
        toolId: data.toolId,
        payload: data.payload
      });
    };

    window.addEventListener('message', this.messageListener);
  }
}
