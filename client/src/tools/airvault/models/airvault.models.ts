export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'browser';
export type DeviceStatus = 'connected' | 'idle' | 'offline' | 'pairing' | 'revoked';
export type ClipContentType = 'plain-text' | 'url' | 'code' | 'rich-text' | 'image' | 'file';

export interface AirVaultDevice {
  id: string;
  name: string;
  type: DeviceType;
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';
  browser?: string;
  status: DeviceStatus;
  isCurrentDevice: boolean;
  lastActiveAt: string; // ISO 8601
  ipAddressMasked?: string;
  pairedAt: string;
  batteryLevel?: number;
}

export interface AirVaultClipItem {
  id: string;
  content: string;
  contentType: ClipContentType;
  contentHash: string; // SHA-256 for loopback protection & deduplication
  charCount: number;
  wordCount?: number;
  originDeviceId: string;
  originDeviceName: string;
  originDeviceType: DeviceType;
  isPinned: boolean;
  isTargetedOnly?: boolean;
  targetDeviceIds?: string[];
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveredDeviceIds: string[];
  createdAt: string;
  updatedAt: string;
  language?: string; // If contentType is code
}

export interface AirVaultSettings {
  autoSync: boolean;
  notifyOnReceived: boolean;
  maskPasswords: boolean;
  historyLimit: number;
  autoCopyIncoming: boolean;
}

export interface PairingSession {
  code: string; // 6-digit code
  qrToken: string;
  expiresAt: number; // timestamp ms
  active: boolean;
}
