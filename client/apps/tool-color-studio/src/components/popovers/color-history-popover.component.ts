// apps/tool-color-studio/src/components/popovers/color-history-popover.component.ts
import { Component, inject, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-color-history-popover',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="popover-backdrop" (click)="close.emit()"></div>
    <div class="popover-panel animate-scale-in" role="dialog" aria-label="Color History">
      <div class="popover-header">
        <div class="popover-title-row">
          <ts-icon name="clock" [size]="15" class="popover-icon" />
          <h4 class="popover-title">Recent Colors</h4>
          <span class="count-badge">{{ state.recentlyUsedColors().length }}</span>
        </div>
        <div class="header-actions">
          @if (state.recentlyUsedColors().length > 0) {
            <button 
              type="button" 
              class="text-action-btn danger" 
              (click)="state.clearColorHistory()"
              title="Clear all recent colors"
            >
              Clear
            </button>
          }
          <button 
            type="button" 
            class="close-btn" 
            (click)="close.emit()" 
            aria-label="Close popover"
          >
            <ts-icon name="x" [size]="14" />
          </button>
        </div>
      </div>

      <div class="popover-body">
        @if (state.recentlyUsedColors().length === 0) {
          <div class="empty-state">
            <ts-icon name="clock" [size]="24" class="empty-icon" />
            <p class="empty-text">No recent colors yet.</p>
            <span class="empty-subtext">Colors you pick or edit will automatically appear here.</span>
          </div>
        } @else {
          <div class="history-list">
            @for (hex of state.recentlyUsedColors(); track hex; let idx = $index) {
              <div 
                class="history-row"
                [class.active]="hex.toUpperCase() === state.activeColor().toUpperCase()"
                (click)="selectColor(hex)"
                role="button"
                tabindex="0"
                (keydown.enter)="selectColor(hex)"
                [title]="'Restore ' + hex"
              >
                <div class="history-swatch" [style.background-color]="hex"></div>
                <span class="history-hex font-mono">{{ hex.toUpperCase() }}</span>
                <div class="history-actions" (click)="$event.stopPropagation()">
                  <button 
                    type="button" 
                    class="icon-tiny-btn" 
                    (click)="copyHex(hex, $event)"
                    title="Copy HEX"
                    aria-label="Copy HEX"
                  >
                    <ts-icon name="copy" [size]="12" />
                  </button>
                  <button 
                    type="button" 
                    class="icon-tiny-btn danger" 
                    (click)="removeHistory(idx, $event)"
                    title="Remove from history"
                    aria-label="Remove from history"
                  >
                    <ts-icon name="x" [size]="12" />
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      z-index: 50;
    }

    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
    }

    .popover-panel {
      position: relative;
      z-index: 50;
      width: 300px;
      background: var(--bg-surface, #18181B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .popover-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
    }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-default, #27272A);
    }

    :host-context([data-theme="light"]) .popover-header {
      border-bottom-color: #F1F5F9;
    }

    .popover-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .popover-icon {
      color: var(--tool-accent, #2563EB);
    }

    .popover-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .popover-title {
      color: #0F172A;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .text-action-btn {
      font-size: 11px;
      font-weight: 600;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted, #A1A1AA);
    }

    .text-action-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: none;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
    }

    .close-btn:hover {
      background: var(--bg-hover, rgba(255, 255, 255, 0.06));
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .popover-body {
      padding: 12px 14px;
      max-height: 280px;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 18px 8px;
    }

    .empty-icon {
      color: var(--text-muted, #71717A);
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .empty-text {
      color: #0F172A;
    }

    .empty-subtext {
      font-size: 11px;
      color: var(--text-muted, #A1A1AA);
      line-height: 1.4;
    }

    .history-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .history-swatch {
      position: relative;
      height: 48px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 3px;
    }

    .history-swatch:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    }

    .history-swatch.active {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    .copy-quick-btn {
      opacity: 0;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.65);
      color: #FFFFFF;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.12s ease;
    }

    .history-swatch:hover .copy-quick-btn {
      opacity: 1;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .history-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .history-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .history-row:hover {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .history-row.active {
      border-color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    .history-swatch {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .history-swatch {
      border-color: rgba(0, 0, 0, 0.12);
    }

    .history-hex {
      font-size: 12px;
      color: var(--text, #F4F4F5);
      flex: 1;
    }

    :host-context([data-theme="light"]) .history-hex {
      color: #0F172A;
    }

    .history-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0.8;
    }

    .history-row:hover .history-actions {
      opacity: 1;
    }

    .icon-tiny-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
    }

    .icon-tiny-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .icon-tiny-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .icon-tiny-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    @media (max-width: 640px) {
      :host {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        margin: 0;
        z-index: 9999;
      }
      .popover-panel {
        width: 100% !important;
        max-height: 80vh;
        border-radius: 16px 16px 0 0;
        box-sizing: border-box;
      }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class ColorHistoryPopoverComponent {
  public state = inject(ColorStudioStateService);
  public close = output<void>();

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.close.emit();
  }

  public selectColor(hex: string): void {
    this.state.setSelectedColor(hex);
    this.close.emit();
  }

  public copyHex(hex: string, event: MouseEvent): void {
    event.stopPropagation();
    this.state.copyToClipboard(hex.toUpperCase(), 'HEX');
  }

  public removeHistory(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.state.removeHistoryColor(index);
  }
}

