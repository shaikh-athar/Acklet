import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-airvault-footer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <footer class="av-footer">
      <div class="av-footer-inner">

        <!-- Left cluster -->
        <div class="footer-cluster">
          <button class="footer-pill" (click)="historyClick.emit()" data-tooltip="Clipboard history (⌘H)">
            <app-icon name="history" class="icon-xs"></app-icon>
            <span>History</span>
          </button>
          <button
            class="footer-pill"
            [class.footer-pill-active]="autoCaptureEnabled()"
            (click)="toggleAutoCapture.emit()"
            [attr.data-tooltip]="autoCaptureEnabled() ? 'Auto-Capture ON' : 'Auto-Capture OFF'"
          >
            <app-icon [name]="autoCaptureEnabled() ? 'zap' : 'radio'" class="icon-xs"></app-icon>
            <span>Auto-Capture</span>
            <span class="footer-dot" [class.footer-dot-on]="autoCaptureEnabled()"></span>
          </button>
        </div>

        <!-- Center capsule -->
        <div class="footer-capsule">
          <button class="capsule-btn" (click)="pairDeviceClick.emit()" data-tooltip="Pair a new device (Auto-Sync)" data-tour="footer-pair-btn">
            <app-icon name="plus" class="icon-xs"></app-icon>
            <span>Pair Device</span>
          </button>
          <div class="capsule-sep"></div>
          <button class="capsule-btn capsule-btn-invite" (click)="inviteClick.emit()" data-tooltip="Invite collaborator (@username or invite link)">
            <app-icon name="user-plus" class="icon-xs"></app-icon>
            <span>Invite</span>
          </button>
          <div class="capsule-sep"></div>
          <button class="capsule-btn capsule-btn-share" (click)="shareLinkClick.emit()" data-tooltip="Copy shareable link (Standalone access)">
            <app-icon name="share-2" class="icon-xs"></app-icon>
            <span>Share Link</span>
          </button>
          <div class="capsule-sep"></div>
          <button class="capsule-btn" (click)="toggleTheme.emit()" [attr.data-tooltip]="currentTheme() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <app-icon [name]="currentTheme() === 'dark' ? 'sun' : 'moon'" class="icon-xs"></app-icon>
            <span>{{ currentTheme() === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
        </div>

        <!-- Right cluster -->
        <div class="footer-cluster">

          <!-- Font Style Selector Pill -->
          <div class="font-menu-container">
            <button class="footer-pill" (click)="toggleFontMenu($event)" [attr.data-tooltip]="'Font: ' + currentFontName()">
              <app-icon name="type" class="icon-xs"></app-icon>
              <app-icon name="chevron-down" class="icon-xxs font-chevron"></app-icon>
            </button>
            @if (showFontMenu()) {
              <div class="font-popover-menu" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <span class="popover-title">FONT FAMILY</span>
                </div>
                <div class="font-options-list">
                  @for (font of fontStyles; track font.id) {
                    <button class="font-option-item" [class.selected]="selectedFontId() === font.id" (click)="selectFont(font.id)">
                      <div class="font-item-meta">
                        <span class="font-item-name" [style.font-family]="font.family">{{ font.name }}</span>
                        <span class="font-item-desc">{{ font.desc }}</span>
                      </div>
                      @if (selectedFontId() === font.id) {
                        <app-icon name="check" class="icon-xs text-cyan"></app-icon>
                      }
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Font Size Selector Pill -->
          <div class="font-menu-container">
            <button class="footer-pill" (click)="toggleSizeMenu($event)" [attr.data-tooltip]="'Text Size: ' + currentSizeName()">
              <app-icon name="a-large-small" class="icon-xs"></app-icon>
              <app-icon name="chevron-down" class="icon-xxs font-chevron"></app-icon>
            </button>
            @if (showSizeMenu()) {
              <div class="font-popover-menu size-menu" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <span class="popover-title">TEXT SIZE</span>
                </div>
                <div class="font-options-list">
                  @for (size of fontSizes; track size.id) {
                    <button class="font-option-item" [class.selected]="selectedSizeId() === size.id" (click)="selectSize(size.id)">
                      <span class="font-item-name">{{ size.name }}</span>
                      @if (selectedSizeId() === size.id) {
                        <app-icon name="check" class="icon-xs text-cyan"></app-icon>
                      }
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <button class="footer-pill" (click)="feedbackClick.emit()" data-tooltip="Send feedback">
            <app-icon name="message-square" class="icon-xs"></app-icon>
            <span>Feedback</span>
          </button>
        </div>

      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; position: relative; z-index: 100; }

    .av-footer {
      flex-shrink: 0;
      height: 38px;
      background: var(--av-surface-primary);
      border-top: 1px solid var(--av-border);
      display: flex;
      align-items: center;
      box-sizing: border-box;
      position: relative;
      overflow: visible;
      z-index: 100;
    }

    .av-footer-inner {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0 12px;
      gap: 8px;
      box-sizing: border-box;
      position: relative;
      overflow: visible;
    }

    /* Footer tooltips MUST open upwards and have top z-index so they never hide */
    .av-footer [data-tooltip]::after {
      bottom: calc(100% + 8px) !important;
      top: auto !important;
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      z-index: 5000 !important;
    }
    .av-footer [data-tooltip]:hover::after {
      transform: translateX(-50%) translateY(0);
    }

    /* Leftmost button in footer stays aligned */
    .footer-cluster > :first-child[data-tooltip]::after {
      left: 0;
      transform: translateY(4px);
    }
    .footer-cluster > :first-child[data-tooltip]:hover::after {
      transform: translateY(0);
    }

    /* Right cluster buttons tooltips: right-anchored so they don't overflow viewport */
    .footer-cluster:last-child [data-tooltip]::after {
      left: auto;
      right: 0;
      transform: translateX(0) translateY(4px);
    }
    .footer-cluster:last-child [data-tooltip]:hover::after {
      transform: translateX(0) translateY(0);
    }

    /* Left / Right clusters */
    .footer-cluster {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 3px;
    }

    /* Pill button — every single footer action uses this */
    .footer-pill {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 5px;
      height: 22px;
      padding: 0 8px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--av-text-primary);
      opacity: 0.85;
      font-family: var(--av-font-ui);
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      box-sizing: border-box;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, opacity 0.12s ease;
    }
    .footer-pill app-icon { color: inherit; }
    .footer-pill:hover {
      background: var(--av-surface-secondary);
      border-color: var(--av-border);
      color: var(--av-text-primary);
      opacity: 1;
    }
    /* Active (user toggled on) */
    .footer-pill.footer-pill-active {
      color: #2196F3;
      border-color: rgba(33, 150, 243, 0.3);
      background: rgba(33, 150, 243, 0.07);
    }

    /* Status dot for Auto-Capture */
    .footer-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--av-text-faint);
      flex-shrink: 0;
    }
    .footer-dot.footer-dot-on { background: #2196F3; }

    /* Center capsule (pill-shaped group) — absolutely centered in footer row */
    .footer-capsule {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      height: 26px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 9999px;
      padding: 0 8px;
      gap: 4px;
      box-sizing: border-box;
      z-index: 10;
    }

    .capsule-sep {
      width: 1px;
      height: 14px;
      background: var(--av-border);
      flex-shrink: 0;
    }

    .capsule-btn {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 5px;
      height: 20px;
      padding: 0 7px;
      background: transparent;
      border: none;
      border-radius: 9999px;
      color: var(--av-text-muted);
      font-family: var(--av-font-ui);
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      box-sizing: border-box;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .capsule-btn app-icon { color: inherit; }
    .capsule-btn:hover { background: var(--av-border); color: var(--av-text-primary); transform: translateY(-0.5px); }
    .capsule-btn:active { transform: translateY(0); }

    /* Invite button branded color and hover highlight */
    .capsule-btn.capsule-btn-invite {
      color: #6366f1;
    }
    .capsule-btn.capsule-btn-invite:hover {
      background: rgba(99, 102, 241, 0.14);
      color: #4f46e5;
      box-shadow: 0 1px 6px rgba(99, 102, 241, 0.25);
    }
    :host-context([data-theme="dark"]) .capsule-btn.capsule-btn-invite {
      color: #818cf8;
    }
    :host-context([data-theme="dark"]) .capsule-btn.capsule-btn-invite:hover {
      background: rgba(99, 102, 241, 0.22);
      color: #a5b4fc;
      box-shadow: 0 1px 8px rgba(99, 102, 241, 0.35);
    }

    /* Share Link button branded color and hover highlight */
    .capsule-btn.capsule-btn-share {
      color: #0284c7;
    }
    .capsule-btn.capsule-btn-share:hover {
      background: rgba(33, 150, 243, 0.14);
      color: #0369a1;
      box-shadow: 0 1px 6px rgba(33, 150, 243, 0.25);
    }
    :host-context([data-theme="dark"]) .capsule-btn.capsule-btn-share {
      color: #38bdf8;
    }
    :host-context([data-theme="dark"]) .capsule-btn.capsule-btn-share:hover {
      background: rgba(33, 150, 243, 0.2);
      color: #7dd3fc;
      box-shadow: 0 1px 8px rgba(33, 150, 243, 0.35);
    }

    .capsule-btn.capsule-btn-active {
      color: #D97706;
      background: rgba(245, 158, 11, 0.12);
    }
    .capsule-btn.capsule-btn-active:hover {
      background: rgba(245, 158, 11, 0.2);
    }
    .capsule-btn .footer-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--av-text-faint);
      flex-shrink: 0;
    }
    .capsule-btn .footer-dot.footer-dot-on {
      background: #D97706;
    }

    .capsule-divider {
      width: 1px;
      height: 12px;
      background: var(--av-border-strong);
      flex-shrink: 0;
      margin: 0 2px;
    }

    /* Storage usage pill */
    .storage-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 22px;
      padding: 0 7px;
      border-radius: 6px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      cursor: default;
    }
    .storage-pill app-icon { color: var(--av-text-faint); flex-shrink: 0; }
    .storage-pill.storage-pill-warn { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.06); }
    .storage-pill.storage-pill-warn app-icon { color: #EF4444; }
    .storage-bar-track {
      width: 44px;
      height: 4px;
      border-radius: 9999px;
      background: var(--av-border-strong);
      overflow: hidden;
      flex-shrink: 0;
    }
    .storage-bar-fill {
      height: 100%;
      border-radius: 9999px;
      background: #10B981;
      transition: width 0.4s ease, background 0.2s ease;
    }
    .storage-bar-fill.storage-bar-warn { background: #EF4444; }
    .storage-label { font-size: 10px; color: var(--av-text-faint); white-space: nowrap; font-family: var(--av-font-mono); }
    .storage-pill.storage-pill-warn .storage-label { color: #EF4444; }

    /* Font Style and Size Menu */
    .font-menu-container {
      position: relative;
    }
    .font-chevron {
      font-size: 9px;
      opacity: 0.6;
      margin-left: 1px;
    }
    .font-popover-menu {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      width: 210px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong, #363D47);
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 500;
      animation: fadeIn 0.15s ease;
    }
    .font-popover-menu.size-menu {
      width: 170px;
    }
    .popover-header {
      padding: 4px 8px 6px;
      border-bottom: 1px solid var(--av-border-subtle);
      margin-bottom: 4px;
    }
    .popover-title {
      font-size: 9px;
      font-weight: 700;
      color: var(--av-text-muted);
      letter-spacing: 0.06em;
    }
    .font-options-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .font-option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 8px;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: var(--av-text-primary);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
    }
    .font-option-item:hover {
      background: var(--av-surface-secondary);
    }
    .font-option-item.selected {
      background: rgba(33, 150, 243, 0.12);
      color: var(--av-accent, #2196F3);
    }
    .font-item-meta {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .font-item-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-primary);
    }
    .font-item-desc {
      font-size: 9.5px;
      color: var(--av-text-primary);
      opacity: 0.7;
    }
    .font-option-item.selected .font-item-name {
      color: var(--av-accent, #2196F3);
    }
    .font-option-item.selected .font-item-desc {
      color: var(--av-accent, #2196F3);
      opacity: 0.9;
    }
    .text-cyan { color: var(--av-accent, #2196F3); }
    .icon-xxs { width: 10px; height: 10px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultFooterComponent {
  currentTheme = input<'dark' | 'light'>('dark');
  autoCaptureEnabled = input<boolean>(true);
  totalBytes = input<number>(0);
  activeBytes = input<number>(0);
  historyBytes = input<number>(0);

  // Typography Options (6 diverse styles)
  fontStyles = [
    { id: 'system', name: 'System Sans', desc: 'Default OS Typography', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' },
    { id: 'inter', name: 'Inter / Modern', desc: 'Clean geometric sans', family: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
    { id: 'mono', name: 'JetBrains / Mono', desc: 'Developer monospace', family: 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, monospace' },
    { id: 'serif', name: 'Editorial Serif', desc: 'Refined serif typography', family: '"Newsreader", "Georgia", "Times New Roman", serif' },
    { id: 'rounded', name: 'Rounded Sans', desc: 'Friendly soft curvature', family: '"Plus Jakarta Sans", "Quicksand", "Segoe UI", sans-serif' },
    { id: 'humanist', name: 'Humanist Sans', desc: 'High readability & warm', family: '"Gill Sans", "Optima", "Segoe UI", sans-serif' }
  ];

  // Font Size Scaling
  fontSizes = [
    { id: 'compact', name: 'Compact (85%)', desc: 'High density UI', scale: '0.85' },
    { id: 'normal', name: 'Normal (100%)', desc: 'Standard platform size', scale: '1.0' },
    { id: 'comfortable', name: 'Comfortable (115%)', desc: 'Spacious reading', scale: '1.15' },
    { id: 'large', name: 'Large (130%)', desc: 'Enhanced accessibility', scale: '1.30' }
  ];

  selectedFontId = signal<string>(this.getSavedFontId());
  selectedSizeId = signal<string>(this.getSavedSizeId());

  showFontMenu = signal<boolean>(false);
  showSizeMenu = signal<boolean>(false);

  currentFontName = computed(() => {
    const f = this.fontStyles.find(item => item.id === this.selectedFontId());
    return f ? f.name : 'Font';
  });

  currentSizeName = computed(() => {
    const s = this.fontSizes.find(item => item.id === this.selectedSizeId());
    return s ? s.name.split(' ')[0] : 'Size';
  });

  constructor() {
    this.applyTypographySettings(this.selectedFontId(), this.selectedSizeId());
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => {
        this.showFontMenu.set(false);
        this.showSizeMenu.set(false);
      });
    }
  }

  private getSavedFontId(): string {
    try {
      return localStorage.getItem('acklet_airvault_font') || 'system';
    } catch {
      return 'system';
    }
  }

  private getSavedSizeId(): string {
    try {
      return localStorage.getItem('acklet_airvault_size') || 'normal';
    } catch {
      return 'normal';
    }
  }

  toggleFontMenu(event: Event) {
    event.stopPropagation();
    this.showSizeMenu.set(false);
    this.showFontMenu.update(v => !v);
  }

  toggleSizeMenu(event: Event) {
    event.stopPropagation();
    this.showFontMenu.set(false);
    this.showSizeMenu.update(v => !v);
  }

  selectFont(fontId: string) {
    this.selectedFontId.set(fontId);
    this.showFontMenu.set(false);
    try {
      localStorage.setItem('acklet_airvault_font', fontId);
    } catch {}
    this.applyTypographySettings(fontId, this.selectedSizeId());
  }

  selectSize(sizeId: string) {
    this.selectedSizeId.set(sizeId);
    this.showSizeMenu.set(false);
    try {
      localStorage.setItem('acklet_airvault_size', sizeId);
    } catch {}
    this.applyTypographySettings(this.selectedFontId(), sizeId);
  }

  private applyTypographySettings(fontId: string, sizeId: string) {
    if (typeof document === 'undefined') return;
    const font = this.fontStyles.find(f => f.id === fontId) || this.fontStyles[0];
    const size = this.fontSizes.find(s => s.id === sizeId) || this.fontSizes[1];

    document.documentElement.style.setProperty('--av-custom-font-family', font.family);
    document.documentElement.style.setProperty('--av-custom-font-scale', size.scale);
  }

  historyClick = output<void>();
  toggleAutoCapture = output<void>();
  pairDeviceClick = output<void>();
  inviteClick = output<void>();
  shareLinkClick = output<void>();
  toggleTheme = output<void>();
  privacyClick = output<void>();
  settingsClick = output<void>();
  feedbackClick = output<void>();
}
