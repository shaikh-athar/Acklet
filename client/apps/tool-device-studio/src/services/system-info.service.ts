// apps/tool-device-studio/src/services/system-info.service.ts
import { Injectable } from '@angular/core';

export interface SystemCapabilities {
  browserName: string;
  browserVersion: string;
  osName: string;
  screenResolution: string;
  devicePixelRatio: number;
  isOnline: boolean;
  supportsMediaDevices: boolean;
  supportsWebAudio: boolean;
  supportsDisplayMedia: boolean;
  supportsWebRTC: boolean;
  supportsPermissions: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SystemInfoService {
  public getCapabilities(): SystemCapabilities {
    if (typeof window === 'undefined') {
      return {
        browserName: 'Unknown',
        browserVersion: '0',
        osName: 'Unknown',
        screenResolution: '0x0',
        devicePixelRatio: 1,
        isOnline: true,
        supportsMediaDevices: false,
        supportsWebAudio: false,
        supportsDisplayMedia: false,
        supportsWebRTC: false,
        supportsPermissions: false
      };
    }

    const nav = window.navigator;
    const ua = nav.userAgent;

    // Detect browser
    let browserName = 'Browser';
    let browserVersion = '';
    if (/chrome|chromium|crios/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) {
      browserName = 'Google Chrome';
      const match = ua.match(/(?:chrome|crios)\/([0-9.]+)/i);
      browserVersion = match ? match[1] : '';
    } else if (/edg/i.test(ua)) {
      browserName = 'Microsoft Edge';
      const match = ua.match(/edg\/([0-9.]+)/i);
      browserVersion = match ? match[1] : '';
    } else if (/firefox|fxios/i.test(ua)) {
      browserName = 'Mozilla Firefox';
      const match = ua.match(/(?:firefox|fxios)\/([0-9.]+)/i);
      browserVersion = match ? match[1] : '';
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browserName = 'Apple Safari';
      const match = ua.match(/version\/([0-9.]+)/i);
      browserVersion = match ? match[1] : '';
    } else if (/opr\//i.test(ua)) {
      browserName = 'Opera';
      const match = ua.match(/opr\/([0-9.]+)/i);
      browserVersion = match ? match[1] : '';
    }

    // Detect OS
    let osName = 'Desktop';
    if (/macintosh|mac os x/i.test(ua)) {
      osName = 'macOS';
    } else if (/windows|win32/i.test(ua)) {
      osName = 'Windows';
    } else if (/android/i.test(ua)) {
      osName = 'Android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      osName = 'iOS';
    } else if (/linux/i.test(ua)) {
      osName = 'Linux';
    }

    const supportsMediaDevices = !!(nav.mediaDevices && nav.mediaDevices.getUserMedia);
    const supportsWebAudio = !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const supportsDisplayMedia = !!(nav.mediaDevices && nav.mediaDevices.getDisplayMedia);
    const supportsWebRTC = !!(window.RTCPeerConnection);
    const supportsPermissions = !!(nav.permissions && nav.permissions.query);

    return {
      browserName,
      browserVersion,
      osName,
      screenResolution: `${window.screen?.width || 0} × ${window.screen?.height || 0}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      isOnline: nav.onLine !== false,
      supportsMediaDevices,
      supportsWebAudio,
      supportsDisplayMedia,
      supportsWebRTC,
      supportsPermissions
    };
  }
}

