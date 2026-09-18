# AirVault WebSocket Backend Scaling Guide (100,000 Concurrent Connections)

## 1. Executive Summary

This architecture guide details the engineering principles, thread model, Linux kernel tuning, and cluster message routing required to scale **AirVault's Spring Boot WebSocket backend** to **100,000+ concurrent persistent connections**.

---

## 2. Architecture & Concurrency Strategy

```text
                                [ Load Balancer (HAProxy / AWS ALB / NGINX) ]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │                                               │
               [ Spring Boot Node 1 ]                          [ Spring Boot Node 2 ]
               - Java 21+ Virtual Threads                      - Java 21+ Virtual Threads
               - wsOffloadExecutor                             - wsOffloadExecutor
               - Per-session ReentrantLocks                    - Per-session ReentrantLocks
               - 50,000 connections                           - 50,000 connections
                             │                                               │
                             └───────────────┬───────────────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
            [ RabbitMQ Cluster / Topic Exchange ]         [ Redis Cluster ]
            - Exchange: airvault.exchange                 - Session & Device Presence TTLs
            - Anonymous Node Broadcast Queues             - Burn-After-Read Atomic CAS
            - Cross-Node Sync & Presence Fanout           - Rate Limiting & Auth State
```

### Key Optimizations:
1. **Java 21+ Virtual Threads**: Offload WebSocket message serialization, Redis operations, and DB audits to `Executors.newVirtualThreadPerTaskExecutor()`. Virtual threads consume mere bytes of memory compared to ~1MB OS platform threads.
2. **ReentrantLock Carrier-Thread Unpinning**: Replaced all `synchronized (session)` blocks with lightweight per-session `ReentrantLock` instances with `tryLock(2, TimeUnit.SECONDS)`. This eliminates carrier-thread pinning under Java Virtual Threads.
3. **Clean Offline Closure & Memory Leak Immunity**:
   - Explicit `CloseStatus.GOING_AWAY` for heartbeat timeouts (20s cutoff) and `CloseStatus.NORMAL` for graceful page unload.
   - Zero retention of large buffers in `deviceSessions` and `sessionDeviceMap`. Locks and session maps are wiped synchronously on disconnect.
   - All presence deletions to Redis run asynchronously without blocking WebSocket I/O.
4. **Horizontal Cross-Node Message Routing**:
   - Nodes act statelessly behind load balancers.
   - Cross-node sync events are published to `airvault.exchange` and consumed via node-specific `AnonymousQueue` listeners (`AirVaultClusterSyncListener`), fanning out only to sessions locally attached to each node.

---

## 3. OS & Linux Kernel Tuning for 100k+ Sockets

To support 100,000 open file descriptors and TCP sockets per instance, apply the following configuration to `/etc/sysctl.conf` and `/etc/security/limits.conf`:

### `/etc/security/limits.conf`
```ini
*         soft    nofile      1048576
*         hard    nofile      1048576
root      soft    nofile      1048576
root      hard    nofile      1048576
```

### `/etc/sysctl.conf`
```ini
# System-wide maximum file descriptors
fs.file-max = 2097152

# Epoll & Connection backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535

# Epoll event limits
fs.epoll.max_user_watches = 1048576

# Ephemeral port range for outbound proxies
net.ipv4.ip_local_port_range = 1024 65535

# TCP memory buffer tuning for high-concurrency (restricts socket buffer memory to ~12KB per connection)
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Rapid socket recycling for closed connections
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
```

Apply immediately:
```bash
sudo sysctl -p
ulimit -n 1048576
```

---

## 4. Observability & Micrometer Metrics

AirVault exposes real-time WebSocket connection telemetry under Actuator:

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `airvault.ws.connections.active` | Gauge | Live active WebSocket connection count per node instance. |
| `airvault.ws.connections.total` | Counter | Cumulative established connections counter. |
| `airvault.ws.disconnections.total` | Counter | Disconnection counter with tags (`reason=graceful`, `heartbeat_timeout`, `slow_client`, `send_failed`). |
| `airvault.ws.messages.sent` | Counter | Total outgoing WebSocket messages. |
| `airvault.ws.messages.received` | Counter | Total incoming WebSocket frames. |
| `airvault.ws.operation.duration` | Timer | High-resolution duration histogram for Redis, RabbitMQ, and WS socket writes. |

### Accessing Metrics:
- Prometheus Scrape: `GET /actuator/prometheus`
- JSON Metric: `GET /actuator/metrics/airvault.ws.connections.active`

---

## 5. Load Testing with k6

Run the automated WebSocket load test suite:

```bash
k6 run --vus 5000 --duration 10m server/acklet/src/test/resources/k6-ws-100k-loadtest.js
```
