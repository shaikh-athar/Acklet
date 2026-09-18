import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { ContentActionShortcut, DetectedContentType, ActionShortcutMetadata } from '../services/airvault-clipboard.service';
import { AirVaultQuickActionsService } from '../services/airvault-quick-actions.service';

export interface ActionButtonDefinition {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  isPrimary?: boolean;
}

@Component({
  selector: 'app-airvault-action-popover',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="action-popover-container" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
      <!-- Header / Type Badge & Optional Missing Data Indicator -->
      <div class="popover-meta-row">
        <div class="type-badge" [attr.data-type]="effectiveType()">
          <app-icon [name]="getTypeIcon()" class="icon-xs"></app-icon>
        </div>

        @if (missingInfoHint()) {
          <div class="missing-hint-badge" [attr.data-tooltip]="missingInfoHint()">
            <app-icon name="alert-circle" class="icon-2xs"></app-icon>
          </div>
        }
      </div>

      <div class="meta-divider"></div>

      <!-- Action Buttons Row (Max 3 visible + kebab for overflow) -->
      <div class="action-btn-row">
        @for (btn of visibleActions(); track btn.id) {
          <button
            type="button"
            class="action-pill-btn"
            [class.action-pill-primary]="btn.isPrimary"
            (click)="handleAction(btn, $event)"
            [title]="btn.label">
            <app-icon [name]="btn.icon" class="icon-xs"></app-icon>
            <span class="btn-text">{{ btn.label }}</span>
          </button>
        }

        <!-- Overflow Kebab Dropdown Trigger -->
        @if (overflowActions().length > 0) {
          <div class="overflow-menu-wrapper">
            <button
              type="button"
              class="action-pill-btn overflow-btn"
              [class.active]="isMenuOpen()"
              (click)="toggleMenu($event)"
              title="More actions">
              <app-icon name="more-horizontal" class="icon-xs"></app-icon>
            </button>

            @if (isMenuOpen()) {
              <div class="overflow-dropdown-menu">
                @for (obtn of overflowActions(); track obtn.id) {
                  <button
                    type="button"
                    class="overflow-menu-item"
                    (click)="handleAction(obtn, $event)">
                    <app-icon [name]="obtn.icon" class="icon-xs"></app-icon>
                    <span>{{ obtn.label }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 100;
      pointer-events: auto;
      animation: popoverFluidSpring 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    @keyframes popoverFluidSpring {
      0% {
        opacity: 0;
        transform: scale(0.88) translateY(6px);
        filter: blur(4px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0px);
      }
    }

    .action-popover-container {
      position: relative;
      background: rgba(18, 22, 31, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 9999px;
      box-shadow: 
        0 16px 36px -4px rgba(0, 0, 0, 0.65), 
        0 4px 12px -2px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(59, 130, 246, 0.25),
        0 0 20px -2px rgba(59, 130, 246, 0.22);
      padding: 3px 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      transition: box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s ease;
    }

    .action-popover-container::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 9999px;
      padding: 1px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(168, 85, 247, 0.4), rgba(16, 185, 129, 0.35));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      opacity: 0.85;
      transition: opacity 0.3s ease;
    }

    .action-popover-container:hover {
      box-shadow: 
        0 20px 42px -4px rgba(0, 0, 0, 0.75), 
        0 6px 16px -2px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(59, 130, 246, 0.4),
        0 0 26px 2px rgba(59, 130, 246, 0.35);
    }

    .action-popover-container:hover::before {
      opacity: 1;
    }

    :host-context([data-theme="light"]) .action-popover-container,
    [data-theme="light"] .action-popover-container {
      background: rgba(255, 255, 255, 0.94);
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 
        0 14px 32px -4px rgba(0, 0, 0, 0.14), 
        0 4px 12px -2px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(37, 99, 235, 0.2),
        0 0 20px -2px rgba(37, 99, 235, 0.16);
    }

    :host-context([data-theme="light"]) .action-popover-container::before,
    [data-theme="light"] .action-popover-container::before {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.5), rgba(147, 51, 234, 0.35), rgba(5, 150, 105, 0.3));
    }

    :host-context([data-theme="light"]) .action-pill-btn,
    [data-theme="light"] .action-pill-btn {
      color: #1e293b;
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.08);
    }

    :host-context([data-theme="light"]) .action-pill-btn:hover,
    [data-theme="light"] .action-pill-btn:hover {
      background: rgba(0, 0, 0, 0.08);
      border-color: rgba(0, 0, 0, 0.16);
      color: #0f172a;
    }

    :host-context([data-theme="light"]) .action-pill-primary,
    [data-theme="light"] .action-pill-primary {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    :host-context([data-theme="light"]) .action-pill-primary:hover,
    [data-theme="light"] .action-pill-primary:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
    }

    :host-context([data-theme="light"]) .overflow-dropdown-menu,
    [data-theme="light"] .overflow-dropdown-menu {
      background: #ffffff;
      border-color: rgba(0, 0, 0, 0.14);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .overflow-menu-item,
    [data-theme="light"] .overflow-menu-item {
      color: #1e293b;
    }

    :host-context([data-theme="light"]) .overflow-menu-item:hover,
    [data-theme="light"] .overflow-menu-item:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #0f172a;
    }

    .popover-meta-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-left: 2px;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--av-text-primary, #ffffff);
      flex-shrink: 0;
    }

    .type-badge[data-type="url"] {
      background: rgba(59, 130, 246, 0.16);
      color: #60a5fa;
    }
    .type-badge[data-type="phone"] {
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
    }
    .type-badge[data-type="address"] {
      background: rgba(245, 158, 11, 0.16);
      color: #fbbf24;
    }

    .missing-hint-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.16);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.35);
      cursor: help;
      position: relative;
      flex-shrink: 0;
      transition: all 0.12s ease;
    }

    .missing-hint-badge:hover {
      background: rgba(245, 158, 11, 0.28);
      border-color: rgba(245, 158, 11, 0.6);
      color: #fbbf24;
    }

    .missing-hint-badge[data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 7px);
      left: 0;
      transform: translateY(4px);
      background: #0f172a;
      color: #f8fafc;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.01em;
      line-height: 1.2;
      padding: 4px 9px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s ease, transform 0.12s ease;
      z-index: 150;
    }

    .missing-hint-badge:hover::before {
      opacity: 1;
      transform: translateY(0);
    }

    :host-context([data-theme="light"]) .missing-hint-badge[data-tooltip]::before,
    [data-theme="light"] .missing-hint-badge[data-tooltip]::before {
      background: #0f172a;
      color: #ffffff;
      border-color: rgba(0, 0, 0, 0.15);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    }

    .meta-divider {
      width: 1px;
      height: 14px;
      background: var(--av-border-subtle, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
      margin: 0 1px;
    }

    :host-context([data-theme="light"]) .meta-divider,
    [data-theme="light"] .meta-divider {
      background: rgba(0, 0, 0, 0.1);
    }

    .action-btn-row {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .action-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 24px;
      padding: 0 9px;
      font-size: 11px;
      font-weight: 500;
      color: var(--av-text-primary, #e2e8f0);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.12s ease;
      user-select: none;
    }

    .action-pill-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      transform: translateY(-0.5px);
    }

    .action-pill-primary {
      background: var(--av-accent, #3b82f6);
      border-color: var(--av-accent, #3b82f6);
      color: #ffffff;
      font-weight: 600;
    }

    .action-pill-primary:hover {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .overflow-menu-wrapper {
      position: relative;
    }

    .overflow-btn {
      padding: 0 6px;
    }

    .overflow-btn.active {
      background: rgba(255, 255, 255, 0.2);
    }

    .overflow-dropdown-menu {
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      background: var(--av-surface-elevated, #1f232b);
      border: 1px solid var(--av-border-strong, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 130px;
      z-index: 100;
      animation: menuFadeIn 0.1s ease forwards;
    }

    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .overflow-menu-item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 5px 8px;
      font-size: 11px;
      color: var(--av-text-primary, #e2e8f0);
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s ease;
    }

    .overflow-menu-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
  `]
})
export class AirVaultActionPopoverComponent {
  shortcut = input<ContentActionShortcut | undefined>();
  rawContent = input.required<string>();
  actionExecuted = output<string>();

  private quickActions = inject(AirVaultQuickActionsService);
  isMenuOpen = signal<boolean>(false);

  effectiveType = computed<DetectedContentType | 'generic'>(() => {
    return this.shortcut()?.detectedType || 'generic';
  });

  missingInfoHint = computed<string | undefined>(() => {
    return this.shortcut()?.missingInfoHint;
  });

  allActions = computed<ActionButtonDefinition[]>(() => {
    const sc = this.shortcut();
    const type = sc?.detectedType;
    const meta = sc?.metadata || {};
    const text = this.rawContent();
    const actions: ActionButtonDefinition[] = [];

    switch (type) {
      case 'url': {
        const urlToOpen = meta.url || text;
        actions.push({
          id: 'open-link',
          label: 'Open Link',
          icon: 'external-link',
          isPrimary: true,
          action: () => this.quickActions.openLink(urlToOpen)
        });
        actions.push({
          id: 'copy-link',
          label: 'Copy Link',
          icon: 'copy',
          action: () => this.quickActions.copyText(urlToOpen, 'Link copied')
        });
        actions.push({
          id: 'share-url',
          label: 'Share',
          icon: 'share-2',
          action: () => this.quickActions.shareUrl(urlToOpen)
        });
        break;
      }

      case 'phone': {
        const phone = meta.formattedE164 || meta.number || text;
        actions.push({
          id: 'call-phone',
          label: 'Call',
          icon: 'phone',
          isPrimary: true,
          action: () => this.quickActions.callPhone(phone)
        });
        actions.push({
          id: 'message-phone',
          label: 'Message',
          icon: 'message-circle',
          action: () => this.quickActions.messagePhone(phone)
        });
        actions.push({
          id: 'copy-phone',
          label: 'Copy Number',
          icon: 'copy',
          action: () => this.quickActions.copyText(phone, 'Phone number copied')
        });
        actions.push({
          id: 'add-contact',
          label: 'Add to Contacts',
          icon: 'user-plus',
          action: () => this.quickActions.addToContacts(phone, undefined, meta.country)
        });
        break;
      }

      case 'address': {
        const addr = meta.address || text;
        actions.push({
          id: 'open-maps',
          label: 'Open in Maps',
          icon: 'map-pin',
          isPrimary: true,
          action: () => this.quickActions.openInMaps(addr)
        });
        actions.push({
          id: 'get-directions',
          label: 'Directions',
          icon: 'navigation',
          action: () => this.quickActions.openDirections(addr)
        });
        actions.push({
          id: 'copy-address',
          label: 'Copy Address',
          icon: 'copy',
          action: () => this.quickActions.copyText(addr, 'Address copied')
        });
        break;
      }

      default: {
        actions.push({
          id: 'copy-text',
          label: 'Copy',
          icon: 'copy',
          isPrimary: true,
          action: () => this.quickActions.copyText(text)
        });
        break;
      }
    }

    return actions;
  });

  visibleActions = computed<ActionButtonDefinition[]>(() => {
    const list = this.allActions();
    return list.length > 3 ? list.slice(0, 3) : list;
  });

  overflowActions = computed<ActionButtonDefinition[]>(() => {
    const list = this.allActions();
    return list.length > 3 ? list.slice(3) : [];
  });

  getTypeIcon(): string {
    switch (this.effectiveType()) {
      case 'url': return 'external-link';
      case 'phone': return 'phone';
      case 'address': return 'map-pin';
      default: return 'copy';
    }
  }

  getTypeTitle(): string {
    switch (this.effectiveType()) {
      case 'url': return 'Link';
      case 'phone': return 'Phone';
      case 'address': return 'Address';
      default: return 'Actions';
    }
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen.update(v => !v);
  }

  handleAction(btn: ActionButtonDefinition, event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    btn.action();
    this.actionExecuted.emit(btn.id);
  }
}
