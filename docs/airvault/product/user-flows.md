# AirVault — End-to-End User Flows

## Flow A: Connect & Pair a New Device

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Phone/Secondary)
    participant Primary as Primary Device (Laptop)
    participant Server as AirVault Sync Hub
    participant Secondary as Secondary Device (Phone)

    Primary->>Server: Request Pairing Session
    Server-->>Primary: Returns 6-digit PIN & QR Token (TTL: 5m)
    Primary->>Primary: Displays Pairing Modal (QR + PIN)
    User->>Secondary: Scans QR / Enters PIN
    Secondary->>Server: Submit Pairing Token + Device Info (OS, Name, Type)
    Server->>Server: Validate Token & Generate Device Key
    Server-->>Secondary: Issue Device Auth Token
    Server->>Primary: Broadcast 'device:registered' Event
    Primary->>Primary: Update Device Matrix (Show Phone Connected)
    Secondary->>Secondary: Redirect to AirVault Active Sync View
```

---

## Flow B: Automatic Clipboard Copy & Synchronize

```mermaid
sequenceDiagram
    autonumber
    participant DevA as Device A (MacBook)
    participant Hub as Sync Hub / Transport
    participant DevB as Device B (Windows PC)
    participant DevC as Device C (iPhone - Offline)

    DevA->>DevA: User copies text: "git checkout -b feature/airvault"
    DevA->>DevA: Ingestion & Hash calculation (SHA-256)
    DevA->>Hub: Broadcast Sync Payload (id, originDeviceId=A, content, hash, timestamp)
    Hub->>Hub: Validate user room & persist to History Cache
    Hub->>DevB: Push 'clip:synced' Event
    DevB->>DevB: Check origin != DevB.id (Loopback safe)
    DevB->>DevB: Update Active Clipboard View + Trigger Notification
    Hub->>Hub: Detect DevC is Offline -> Buffer in Outbox Queue
    Hub-->>DevA: Delivery Receipt ACK (Delivered to 1/2 devices)
```

---

## Flow C: Device Reconnection & Outbox Flush

```mermaid
sequenceDiagram
    autonumber
    participant DevC as Device C (iPhone)
    participant Hub as Sync Hub / Transport

    DevC->>Hub: Reconnect & Send Heartbeat (lastSyncedTimestamp)
    Hub->>Hub: Fetch missed events since lastSyncedTimestamp
    Hub->>DevC: Push Queued Events Batch
    DevC->>DevC: Populate Local History & Set Latest Active Item
    DevC-->>Hub: Send Batch ACK
    Hub->>Hub: Mark Outbox Queue cleared for Device C
```

---

## Flow D: Manual Targeted Transfer to Device

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Source as Source Device
    participant Hub as Sync Hub
    participant Target as Target Device

    User->>Source: Select Item -> Click "Send to Device"
    Source->>Source: Display Device Selector (shows online devices)
    User->>Source: Selects "Pixel 9 Pro"
    Source->>Hub: Send Direct Payload (targetDeviceId=Pixel9, content)
    Hub->>Target: Route Direct Event
    Target->>Target: Flash Direct Transfer Toast + Auto-write to clipboard (if permitted)
    Target-->>Hub: ACK Received
    Hub-->>Source: Show "Sent & Received on Pixel 9 Pro" Checkmark
```

---

## Flow E: Revoke / Disconnect a Device

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant DevA as Device A (Admin)
    participant Hub as Sync Hub
    participant DevB as Device B (Compromised / Old Phone)

    User->>DevA: Click "Revoke Device" on Device B
    DevA->>Hub: POST /devices/revoke { deviceId: 'B' }
    Hub->>Hub: Invalidate Device B Token & Disconnect WebSocket
    Hub->>DevB: Push 'device:revoked' Command
    DevB->>DevB: Clear local cache, reset to Unpaired state
    Hub-->>DevA: Broadcast Updated Device List
    DevA->>DevA: Animate Device B card removal
```
