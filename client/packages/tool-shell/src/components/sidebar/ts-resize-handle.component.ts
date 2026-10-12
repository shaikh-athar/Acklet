import { Component, inject, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ToolSidebarService, 
  SIDEBAR_MIN_WIDTH, 
  SIDEBAR_MAX_WIDTH 
} from '../../services/tool-sidebar.service';

@Component({
  selector: 'ts-resize-handle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ts-resize-handle"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      [attr.aria-valuemin]="minWidth"
      [attr.aria-valuemax]="maxWidth"
      [attr.aria-valuenow]="sidebarService.width()"
      aria-label="Sidebar resize handle"
      (pointerdown)="onPointerDown($event)"
      (dblclick)="onDoubleClick()"
      (keydown)="onKeyDown($event)"
    >
      <div class="ts-resize-line"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      width: 8px;
      margin-right: -4px;
      cursor: col-resize;
      z-index: var(--ts-z-sticky, 30);
      touch-action: none;
    }
    .ts-resize-handle {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
    }
    .ts-resize-line {
      width: 2px;
      height: 100%;
      background: transparent;
      transition: background-color var(--ts-dur-base) var(--ts-ease);
    }
    :host(:hover) .ts-resize-line,
    :host(:focus-visible) .ts-resize-line,
    .ts-resize-handle:active .ts-resize-line {
      background: var(--ts-focus-ring);
    }
  `]
})
export class TsResizeHandleComponent {
  readonly sidebarService = inject(ToolSidebarService);
  private readonly ngZone = inject(NgZone);
  readonly minWidth = SIDEBAR_MIN_WIDTH;
  readonly maxWidth = SIDEBAR_MAX_WIDTH;

  private startX = 0;
  private startWidth = 0;
  private resizeRafId: number | null = null;

  onPointerDown(event: PointerEvent): void {
    if (this.sidebarService.isCollapsed()) return;
    event.preventDefault();
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.startX = event.clientX;
    this.startWidth = this.sidebarService.width();
    this.sidebarService.isDragging.set(true);

    this.ngZone.runOutsideAngular(() => {
      let pendingWidth = this.startWidth;

      const onPointerMove = (e: PointerEvent): void => {
        const deltaX = e.clientX - this.startX;
        pendingWidth = this.startWidth + deltaX;

        if (this.resizeRafId === null) {
          this.resizeRafId = requestAnimationFrame(() => {
            this.resizeRafId = null;
            this.sidebarService.setWidth(pendingWidth);
          });
        }
      };

      const onPointerUp = (e: PointerEvent): void => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (this.resizeRafId !== null) {
          cancelAnimationFrame(this.resizeRafId);
          this.resizeRafId = null;
        }
        this.sidebarService.setWidth(pendingWidth);
        this.sidebarService.isDragging.set(false);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
    });
  }

  onDoubleClick(): void {
    this.sidebarService.resetWidth();
  }

  onKeyDown(event: KeyboardEvent): void {
    const current = this.sidebarService.width();
    const STEP = 16;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.sidebarService.setWidth(current + STEP);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.sidebarService.setWidth(current - STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.sidebarService.setWidth(this.maxWidth);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.sidebarService.setWidth(this.minWidth);
    }
  }
}
