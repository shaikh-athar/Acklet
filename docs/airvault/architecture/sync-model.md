# AirVault — Architecture & Sync Data Flow

## 1. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           AirVault Frontend                             │
│                                                                         │
│  ┌───────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │   Device Dock     │  │ Current Clip Hero  │  │ History & Search   │ │
│  │ (Matrix/Controls) │  │  (Real-Time View)  │  │   (Type Filters)   │ │
│  └─────────┬─────────┘  └──────────┬─────────┘  └──────────┬─────────┘ │
│            │                       │                       │           │
│  ┌─────────┴───────────────────────┴───────────────────────┴─────────┐ │
│  │                   AirVault Store (Angular Signals)                │ │
│  └─────────┬───────────────────────┬───────────────────────┬─────────┘ │
│            │                       │                       │           │
│  ┌─────────┴─────────┐  ┌──────────┴─────────┐  ┌──────────┴─────────┐ │
│  │  Clipboard Engine │  │   Sync Transport   │  │   Storage Engine   │ │
│  │ (Loopback Guard)  │  │ (WebSocket/SSE/RTC)│  │ (IndexedDB / Cache)│ │
│  └───────────────────┘  └──────────┬─────────┘  └────────────────────┘ │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                             (WSS / REST API)
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                       AirVault Sync Hub (Server)                        │
│                                                                         │
│  ┌─────────────────────────┐             ┌───────────────────────────┐  │
│  │ Device Auth & Discovery │             │  Clipboard Event Broker   │  │
│  │     (Pairing / TTL)     │             │    (Room PubSub / Redis)  │  │
│  └─────────────────────────┘             └─────────────┬─────────────┘  │
│                                                        │                │
│                                          ┌─────────────┴─────────────┐  │
│                                          │ Outbox Offline Queue & DB │  │
│                                          └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Models

### 2.1 Device Model
```typescript
export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'browser';
export type DeviceStatus = 'connected' | 'idle' | 'offline' | 'pairing' | 'revoked';

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
}
```

### 2.2 Clipboard Item Model
```typescript
export type ClipContentType = 'plain-text' | 'url' | 'code' | 'rich-text';

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
}
```

---

## 3. Loopback Prevention Engine

To prevent the classic infinite sync storm (Device A -> Device B writes clipboard -> Device B detects clipboard change -> sends back to Device A), AirVault applies a multi-layered guard:

1. **Origin Check:** Every payload attaches `originDeviceId`. A client rejects outbound sync if content was injected from remote sync.
2. **Hash Cache:** Recent SHA-256 content hashes (last 20 hashes within 60s) are recorded in an in-memory `HashRingBuffer`.
3. **Write Stamping:** When AirVault updates the local clipboard programmatically, it acquires a 500ms `internalWriteLock` that mutes the native clipboard listener.
