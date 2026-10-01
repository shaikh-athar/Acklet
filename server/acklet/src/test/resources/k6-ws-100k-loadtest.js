import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Gauge, Trend } from 'k6/metrics';

// Custom Metrics for 100k Benchmark
const activeConnections = new Gauge('airvault_ws_active_connections');
const connectionErrors = new Counter('airvault_ws_connection_errors');
const heartbeatLatency = new Trend('airvault_ws_heartbeat_rtt_ms');
const messagesReceived = new Counter('airvault_ws_messages_received');

export const options = {
    scenarios: {
        ramp_to_100k: {
            executor: 'ramping-vus',
            startVUs: 100,
            stages: [
                { duration: '2m', target: 5000 },    // Warm-up to 5k
                { duration: '5m', target: 25000 },   // Ramp to 25k
                { duration: '10m', target: 50000 },  // Ramp to 50k
                { duration: '15m', target: 100000 }, // Scale to 100k target
                { duration: '10m', target: 100000 }, // Hold at 100k peak
                { duration: '5m', target: 0 },       // Clean ramp down
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        'airvault_ws_connection_errors': ['count<100'],
        'airvault_ws_heartbeat_rtt_ms': ['p(95)<150', 'p(99)<300'],
    },
};

const BASE_WS_URL = __ENV.WS_URL || 'ws://localhost:8080/ws/airvault';

export default function () {
    const deviceId = `dev-load-${__VU}-${__ITER}-${Date.now()}`;
    const url = `${BASE_WS_URL}?deviceId=${deviceId}`;

    const res = ws.connect(url, {}, function (socket) {
        activeConnections.add(1);

        socket.on('open', function () {
            // Heartbeat loop every 5 seconds per device
            socket.setInterval(function () {
                const t0 = Date.now();
                socket.send(JSON.stringify({
                    type: 'HEARTBEAT',
                    senderDeviceId: deviceId,
                    timestamp: t0
                }));
            }, 5000);

            // Periodic PING every 30 seconds to measure RTT
            socket.setInterval(function () {
                const pingTime = Date.now();
                socket.send(JSON.stringify({
                    type: 'PING',
                    senderDeviceId: deviceId,
                    timestamp: pingTime
                }));
            }, 30000);
        });

        socket.on('message', function (data) {
            messagesReceived.add(1);
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'PONG') {
                    const rtt = Date.now() - msg.timestamp;
                    heartbeatLatency.add(rtt);
                }
            } catch (err) {}
        });

        socket.on('close', function () {
            activeConnections.add(-1);
        });

        socket.on('error', function (e) {
            connectionErrors.add(1);
        });

        // Hold open connection during test stage
        sleep(120);
    });

    check(res, { 'WebSocket connected successfully (status 101)': (r) => r && r.status === 101 });
}
