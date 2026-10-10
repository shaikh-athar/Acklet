// packages/tool-shell/src/components/sidebar/ts-resize-handle.component.ts
import { Component, inject } from '@angular/core';
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
  readonly minWidth = SIDEBAR_MIN_WIDTH;
  readonly maxWidth = SIDEBAR_MAX_WIDTH;

  private startX = 0;
  private startWidth = 0;

  onPointerDown(event: PointerEvent): void {
    if (this.sidebarService.isCollapsed()) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    this.startX = event.clientX;
    this.startWidth = this.sidebarService.width();
    this.sidebarService.isDragging.set(true);

    const onPointerMove = (e: PointerEvent) => {
      // Left sidebar: dragging right increases width, dragging left decreases width
      const deltaX = e.clientX - this.startX;
      this.sidebarService.setWidth(this.startWidth + deltaX);
    };

    const onPointerUp = (e: PointerEvent) => {
      (event.target as HTMLElement).releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      this.sidebarService.isDragging.set(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
