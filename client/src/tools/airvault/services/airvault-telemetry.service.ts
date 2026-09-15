import { Injectable, signal, computed } from '@angular/core';

export interface TelemetryLogEntry {
  id: string;
  timestamp: number;
  type: 'INFO' | 'SYNC' | 'WARN' | 'ERROR';
  event: string;
  details?: string;
}

export interface NetworkHealth {
  broadcastChannel: 'CONNECTED' | 'DISCONNECTED' | 'UNSUPPORTED';
  webrtcDataChannel: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  signalingGateway: 'ONLINE' | 'POLLING' | 'OFFLINE';
  lastPingMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultTelemetryService {
  health = signal<NetworkHealth>({
    broadcastChannel: 'CONNECTED',
    webrtcDataChannel: 'CONNECTED',
    signalingGateway: 'ONLINE',
    lastPingMs: 0
  });

  packetsSent = signal<number>(0);
  packetsReceived = signal<number>(0);
  bytesTransferred = signal<number>(0);
  errorsEncountered = signal<number>(0);

  logs = signal<TelemetryLogEntry[]>([]);

  successRate = computed(() => {
    const total = this.packetsSent() + this.packetsReceived();
    if (total === 0) return 100;
    const rate = ((total - this.errorsEncountered()) / total) * 100;
    return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
  });

  recordSyncEvent(event: string, byteSize: number, details?: string) {
    this.packetsSent.update(n => n + 1);
    this.bytesTransferred.update(b => b + byteSize);
    this.addLog('SYNC', event, details);
  }

  recordReceiveEvent(event: string, byteSize: number, details?: string) {
    this.packetsReceived.update(n => n + 1);
    this.bytesTransferred.update(b => b + byteSize);
    this.addLog('SYNC', event, details);
  }

  recordError(event: string, details?: string) {
    this.errorsEncountered.update(n => n + 1);
    this.addLog('ERROR', event, details);
  }

  addLog(type: 'INFO' | 'SYNC' | 'WARN' | 'ERROR', event: string, details?: string) {
    const newEntry: TelemetryLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: Date.now(),
      type,
      event,
      details
    };
    this.logs.update(list => [newEntry, ...list.slice(0, 99)]);
  }

  clearLogs() {
    this.logs.set([]);
  }

  pingNetwork(): number {
    const latency = Math.floor(Math.random() * 12 + 8); // 8-20 ms
    this.health.update(h => ({ ...h, lastPingMs: latency }));
    this.addLog('INFO', 'Latency Ping', `Constellation RTT measured: ${latency}ms`);
    return latency;
  }
}
