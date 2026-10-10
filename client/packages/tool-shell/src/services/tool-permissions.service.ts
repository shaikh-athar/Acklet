// packages/tool-shell/src/services/tool-permissions.service.ts
import { Injectable, signal } from '@angular/core';

export type ToolPermissionType = 'clipboard-read' | 'clipboard-write' | 'camera' | 'microphone' | 'notifications';

export interface PermissionStateResult {
  granted: boolean;
  prompted: boolean;
  denied: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToolPermissionsService {
  async requestClipboardWrite(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async requestClipboardRead(): Promise<string | null> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return null;
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }

  async requestNotifications(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
}
