// packages/tool-shell/src/services/tool-sidebar.service.ts
import { Injectable, signal } from '@angular/core';

export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_DEFAULT_WIDTH = 272;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_RAIL_WIDTH = 72;

@Injectable({
  providedIn: 'root'
})
export class ToolSidebarService {
  private readonly WIDTH_KEY = 'acklet_ts_sidebar_width';
  private readonly COLLAPSED_KEY = 'acklet_sidebar_collapsed';

  readonly width = signal<number>(SIDEBAR_DEFAULT_WIDTH);
  readonly isCollapsed = signal<boolean>(false);
  readonly isMobileDrawerOpen = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedWidth = localStorage.getItem(this.WIDTH_KEY);
        if (savedWidth) {
          const parsed = Number(savedWidth);
          if (parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH) {
            this.width.set(parsed);
          }
        }
        const savedCollapsed = localStorage.getItem(this.COLLAPSED_KEY);
        if (savedCollapsed !== null) {
          this.isCollapsed.set(savedCollapsed === 'true');
        }
      } catch (_) {}
    }
  }

  setWidth(w: number): void {
    const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(w)));
    this.width.set(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.WIDTH_KEY, String(clamped));
      } catch (_) {}
    }
  }

  toggleCollapse(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.COLLAPSED_KEY, String(next));
      } catch (_) {}
    }
  }

  resetWidth(): void {
    this.setWidth(SIDEBAR_DEFAULT_WIDTH);
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update(v => !v);
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen.set(false);
  }
}
