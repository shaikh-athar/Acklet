// packages/tool-shell/src/services/tool-context.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { ToolTab } from '../models/tool-shell.models';
import { ToolThemeService } from './tool-theme.service';
import { getToolUrl, getToolsHubUrl, getPortalUrl } from '@acklet/shared';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  durationMs?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToolContextService {
  private readonly themeService = inject(ToolThemeService);

  readonly currentTool = signal<ToolRegistryItem | null>(null);
  readonly currentTabId = signal<string>('');
  readonly toolTitle = signal<string>('');
  readonly badgeCount = signal<number | null>(null);

  // Status & Health states
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isBackendHealthy = signal<boolean>(true);
  readonly isSlowLoading = signal<boolean>(false);

  // Global toasts
  readonly toasts = signal<ToastMessage[]>([]);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }

  setTool(tool: ToolRegistryItem | null, tabId = ''): void {
    this.currentTool.set(tool);
    this.currentTabId.set(tabId);
    if (tool) {
      this.toolTitle.set(tool.name);
      this.updateDocumentTitle(tool.name, tabId);
    }
  }

  setTab(tabId: string): void {
    this.currentTabId.set(tabId);
    const tool = this.currentTool();
    if (tool) {
      this.updateDocumentTitle(tool.name, tabId);
    }
  }

  setTitle(title: string): void {
    this.toolTitle.set(title);
    this.updateDocumentTitle(title, this.currentTabId());
  }

  setBadge(count: number | null): void {
    this.badgeCount.set(count);
  }

  toast(type: ToastMessage['type'], message: string, title?: string, durationMs = 4000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, type, title, message, durationMs };
    this.toasts.update(list => [...list, newToast]);

    if (durationMs > 0) {
      setTimeout(() => this.removeToast(id), durationMs);
    }
  }

  removeToast(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  getToolUrl(slug: string): string {
    return getToolUrl(slug);
  }

  getHubUrl(): string {
    return getToolsHubUrl();
  }

  getPortalUrl(): string {
    return getPortalUrl();
  }

  private updateDocumentTitle(title: string, tabId?: string): void {
    if (typeof document !== 'undefined') {
      const tabSegment = tabId && tabId !== 'about' ? ` — ${tabId.charAt(0).toUpperCase() + tabId.slice(1)}` : '';
      document.title = `${title}${tabSegment} — Tools`;
    }
  }
}
