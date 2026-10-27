// client/packages/tool-shell/src/components/adaptive-dropdown/adaptive-dropdown.component.ts
import {
  Component,
  input,
  model,
  output,
  computed,
  inject,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveService } from '../../services/responsive.service';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-adaptive-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BottomSheetComponent, TsIconComponent],
  template: `
    <!-- Trigger Button -->
    <div class="dropdown-trigger-wrapper">
      <ng-content select="[trigger]">
        <!-- Default Trigger Button if custom trigger is not provided -->
        <button
          type="button"
          class="default-dropdown-trigger"
          (click)="toggleOpen()"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-label]="ariaLabel()"
        >
          @if (triggerIcon()) {
            <ts-icon [name]="triggerIcon()" [size]="16" class="trigger-icon" />
          }
          @if (triggerLabel()) {
            <span class="trigger-label">{{ triggerLabel() }}</span>
          }
          <ts-icon name="chevron-down" [size]="14" class="trigger-chevron" [class.rotated]="isOpen()" />
        </button>
      </ng-content>
    </div>

    <!-- Phone Viewport: Adaptive Bottom Sheet -->
    @if (responsive.isPhone()) {
      <ts-bottom-sheet
        [isOpen]="isOpen()"
        [title]="title()"
        (close)="close()"
      >
        <div class="adaptive-sheet-content" (click)="onItemClick($event)">
          <ng-content />
        </div>
      </ts-bottom-sheet>
    } @else {
      <!-- Desktop & Tablet Viewport: Floating Popover Menu -->
      @if (isOpen()) {
        <div class="desktop-popover-backdrop" (click)="close()" aria-hidden="true"></div>
        <div
          class="desktop-popover custom-scrollbar"
          role="menu"
          [style.width]="menuWidth()"
          [attr.aria-label]="title() || ariaLabel()"
        >
          <ng-content />
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .dropdown-trigger-wrapper {
      display: inline-flex;
    }

    .default-dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      min-height: 36px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .default-dropdown-trigger:hover {
      background: var(--bg-elevated, #282830);
      border-color: var(--border, rgba(255, 255, 255, 0.2));
    }

    .trigger-chevron {
      transition: transform 0.2s ease;
    }

    .trigger-chevron.rotated {
      transform: rotate(180deg);
    }

    /* Desktop Popover */
    .desktop-popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: transparent;
    }

    .desktop-popover {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 101;
      min-width: 200px;
      max-height: 360px;
      overflow-y: auto;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      animation: popoverFadeIn 0.15s ease forwards;
    }

    /* Light Theme */
    :host-context([data-theme="light"]) .default-dropdown-trigger,
    [data-theme="light"] .default-dropdown-trigger {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, #e2e8f0);
      color: var(--text, #0f172a);
    }

    :host-context([data-theme="light"]) .desktop-popover,
    [data-theme="light"] .desktop-popover {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, #e2e8f0);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .adaptive-sheet-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }

    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Respect reduced-motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .desktop-popover {
        animation: none !important;
      }
      .default-dropdown-trigger,
      .trigger-chevron {
        transition: none !important;
      }
    }
  `]
})
export class AdaptiveDropdownComponent {
  readonly responsive = inject(ResponsiveService);

  readonly isOpen = model<boolean>(false);
  readonly title = input<string>('Select Option');
  readonly triggerLabel = input<string>('');
  readonly triggerIcon = input<string>('');
  readonly ariaLabel = input<string>('Dropdown menu');
  readonly menuWidth = input<string>('240px');
  readonly closeOnSelect = input<boolean>(true);

  readonly opened = output<void>();
  readonly closed = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.opened.emit();
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  onItemClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.closeOnSelect() && (target.closest('button') || target.closest('a') || target.closest('[role="menuitem"]'))) {
      this.close();
    }
  }
}
