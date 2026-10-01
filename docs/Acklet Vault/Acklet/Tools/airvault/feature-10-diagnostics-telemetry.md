# Feature 10 — Diagnostics, Telemetry, and Support Specification

## 1. Executive Summary & Objective

**Feature 10 (Diagnostics, Telemetry, and Support)** provides comprehensive failure visibility, real-time peer-to-peer round-trip latency telemetry (RTT), transport channel monitoring, and diagnostic protocol event logs with 1-click network testing.

---

## 2. Telemetry Architecture & KPIs

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Sync Diagnostics & Telemetry                            │
├─────────────────────────────────────────────────────────────┤
│  [ P2P Latency (RTT) ]  [ Sync Success Rate ]  [ Data Synced ]
│       14 ms                   99.8%                48.0 KB  │
├─────────────────────────────────────────────────────────────┤
│  TRANSPORT CHANNELS:                                        │
│  • WebRTC DataChannels (P2P):       [ CONNECTED ]           │
│  • BroadcastChannel (Multi-Tab):    [ CONNECTED ]           │
│  • Signaling Relay Gateway:         [ ONLINE ]              │
├─────────────────────────────────────────────────────────────┤
│  [ ⚡ Ping Network ]                [ 🧹 Clear Event Logs ]  │
├─────────────────────────────────────────────────────────────┤
│  LIVE PROTOCOL EVENT STREAM:                                │
│  20:14:02  SYNC  Peer Handshake (iPhone 16 Pro, RTT: 14ms)  │
│  20:14:00  INFO  Crypto Session Initialized (ECDH P-256)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Telemetry Service & State

- **Service**: [`AirVaultTelemetryService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-telemetry.service.ts)
  - `health`: WebRTC, BroadcastChannel, and Gateway connectivity states + live latency in ms.
  - `packetsSent` & `packetsReceived`: Monotonic counters tracking bidirectional sync traffic.
  - `bytesTransferred`: Cumulative byte volume transferred across encrypted channels.
  - `successRate`: Computed percentage reflecting delivery reliability.
  - `logs`: Circular buffer containing the latest 100 protocol events with timestamps.

---

## 4. End-to-End Pipeline Profiling & Telemetry Tracing

To isolate microsecond bottlenecks across multi-device synchronizations:
- **Frontend Sender Profiling ([`airvault-send-tracer.ts`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-send-tracer.ts))**:
  - Profiles `composer.prepare`: Text extraction & metadata formatting.
  - Profiles `crypto.encrypt`: Web Crypto AES-GCM-256 payload encryption.
  - Profiles `ws.send`: WebSocket JSON serialization and transmission.
  - Profiles `ack.roundtrip`: Full round-trip time from send to remote peer delivery acknowledgment.
- **Backend WebSocket Profiling ([`WsOperationTimer.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/diagnostic/WsOperationTimer.java))**:
  - Profiles `json.deserialize`: Payload parsing on Netty/Tomcat worker threads.
  - Profiles `redis.record_presence`: Fast session status writes in Redis.
  - Profiles `rabbitmq.publish`: Event emission onto topic exchange.
  - Profiles `audit.record`: Asynchronous DB event logging.
  - Profiles `ws.session.send`: Non-blocking socket write per target peer session.

---

## 5. UI Components

- **Header Activity Button**: [`AirVaultComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/airvault.component.html) header icon (`activity`).
- **Telemetry Modal**: [`AirVaultDiagnosticsModalComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/components/airvault-diagnostics-modal.component.ts).
- **Feedback Integration**: Native `FeedbackModalComponent` for submitting bug reports or suggestions.

---

## 6. Centralized Error-to-User Mapping & Sanitization Policy

To uphold privacy and user trust, technical errors, stack traces, and backend responses are never rendered directly in the UI.

### Architecture

```text
Technical Error (Exception / HTTP Failure / Worker Crash)
                       ↓
         AirVaultUIStore.reportOperationError()
         AirVaultUIStore.getUserFriendlyErrorMessage()
                       ↓
   ┌───────────────────┴───────────────────┐
   │                                       │
Developer Telemetry & Console       Safe User-Facing Toast/UI
(console.error + Tracer + Logs)     ("We couldn't send this resource. Please try again.")
```

### Contextual Error Mappings

| Context | User-Facing Message | Technical Preservation |
| :--- | :--- | :--- |
| `sending` | *"We couldn't send this resource. Please try again."* | Logged via `console.error` & `AirVaultSendTracer` |
| `pairing` | *"We couldn't pair this device. Please try again."* | Logged via `console.error` with peer details |
| `syncing` | *"Sync couldn't be completed. Please try again."* | Logged via `console.error` with sync packet metadata |
| `deleting` | *"We couldn't complete the deletion. Please try again."* | Logged via `console.error` with target ID |
| `loading` | *"We couldn't load this resource. Please try again."* | Logged via `console.error` with resource key |
| `searching` | *"We couldn't complete the search. Please try again."* | Logged via `console.error` with query trace |
| `import` | *"Unable to import this backup file. Please try again."* | Logged via `console.error` with JSON/schema parsing trace |
| `export` | *"Unable to export vault data. Please try again."* | Logged via `console.error` with serialization trace |
| `erasing` | *"AirVault could not complete the account erase. Please try again."* | Logged via `console.error` with wipe lifecycle failure |
| `clipboard` | *"Unable to access clipboard. Please check browser permissions and try again."* | Logged via `console.error` with DOMException |
| `general` | *"Something went wrong. Please try again."* | Logged via `console.error` with stack trace |

