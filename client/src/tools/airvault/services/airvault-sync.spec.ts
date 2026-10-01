import { TestBed } from '@angular/core/testing';
import { AirVaultSyncService } from './airvault-sync.service';
import { AirVaultStorageService } from './airvault-storage.service';
import { AirVaultDeviceService } from './airvault-device.service';
import { AirVaultCryptoService } from './airvault-crypto.service';
import { AirVaultWsTransportService } from './airvault-ws-transport.service';
import { AirVaultClipboardService } from './airvault-clipboard.service';
import { AirVaultNotificationService } from './airvault-notification.service';
import { AirVaultMotionService } from './airvault-motion.service';
import { AirVaultColorService } from './airvault-color.service';
import { AirVaultBlameService } from './airvault-blame.service';
import { AirVaultDocSyncService } from './airvault-doc-sync.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { PreferenceService } from '../../../app/core/services/preference.service';
import { AirVaultDevice, AirVaultItem, EncryptedPacket } from '../models/airvault.types';

describe('AirVault Cross-Device Sync & Delivery ACK Pipeline', () => {
  let syncService: AirVaultSyncService;
  let storageService: AirVaultStorageService;
  let deviceService: AirVaultDeviceService;
  let cryptoService: AirVaultCryptoService;
  let wsTransport: AirVaultWsTransportService;

  const mockSourceDevice: AirVaultDevice = {
    id: 'device_source_chrome',
    name: 'Chrome Laptop',
    username: 'alice',
    type: 'laptop',
    os: 'macOS',
    browser: 'Chrome',
    thumbprint: 'TP-ALICE',
    ipHint: '192.168.1.10',
    status: 'active',
    lastActive: Date.now(),
    isCurrent: true,
    syncEnabled: true,
    accentColor: '#3B82F6'
  };

  const mockDestinationDevice: AirVaultDevice = {
    id: 'device_destination_safari',
    name: 'Safari iPhone',
    username: 'bob',
    type: 'phone',
    os: 'iOS',
    browser: 'Safari',
    thumbprint: 'TP-BOB',
    ipHint: '192.168.1.20',
    status: 'active',
    lastActive: Date.now(),
    isCurrent: false,
    syncEnabled: true,
    accentColor: '#10B981'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AirVaultSyncService,
        AirVaultStorageService,
        AirVaultDeviceService,
        AirVaultCryptoService,
        AirVaultWsTransportService,
        AirVaultClipboardService,
        AirVaultNotificationService,
        AirVaultMotionService,
        AirVaultColorService,
        AirVaultBlameService,
        AirVaultDocSyncService,
        AirVaultUIStore,
        PreferenceService
      ]
    });

    syncService = TestBed.inject(AirVaultSyncService);
    storageService = TestBed.inject(AirVaultStorageService);
    deviceService = TestBed.inject(AirVaultDeviceService);
    cryptoService = TestBed.inject(AirVaultCryptoService);
    wsTransport = TestBed.inject(AirVaultWsTransportService);

    // Initialize mock source device identity
    spyOn(deviceService, 'currentDevice').and.returnValue(mockSourceDevice);
    spyOn(deviceService, 'pairedDevices').and.returnValue([mockDestinationDevice]);
  });

  it('Scenario 1: should encrypt and emit SYNC_PACKET to eligible paired device when beaming content', async () => {
    const wsSendSpy = spyOn(wsTransport, 'send').and.returnValue(true);

    const beamedItem = await syncService.beamContent(
      'Test cross-device payload',
      mockDestinationDevice.id,
      undefined,
      undefined,
      undefined,
      'test_sync_correlation_1'
    );

    expect(beamedItem).toBeTruthy();
    expect(beamedItem.content?.raw).toBe('Test cross-device payload');
    expect(beamedItem.deliveryStatus).toBe('pending');
    expect(wsSendSpy).toHaveBeenCalled();

    const sentCall = wsSendSpy.calls.mostRecent();
    expect(sentCall.args[0].type).toBe('SYNC_PACKET');
    expect(sentCall.args[0].targetDeviceId).toBe(mockDestinationDevice.id);
  });

  it('Scenario 2: destination client decrypts incoming packet, persists to store, and responds with SYNC_ACK', async () => {
    const wsSendSpy = spyOn(wsTransport, 'send').and.returnValue(true);
    const incomingItemSpy = spyOn(syncService.onIncomingItem, 'emit');

    const samplePayload = JSON.stringify({
      raw: 'Synced from Chrome to Safari',
      category: 'text',
      originDeviceId: mockSourceDevice.id,
      originDeviceName: '@alice'
    });

    const encryptedPacket = await cryptoService.encryptPayload(samplePayload, mockSourceDevice.id, mockDestinationDevice.id);

    // Simulate destination receiving the CLIPBOARD_BEAM message
    await syncService.handleMessage({
      type: 'CLIPBOARD_BEAM',
      packet: encryptedPacket,
      senderDevice: mockSourceDevice,
      targetDeviceId: mockDestinationDevice.id,
      timestamp: Date.now()
    });

    // Destination store must contain the item
    const storedItem = storageService.allItems().find(i => i.id === encryptedPacket.packetId);
    expect(storedItem).toBeTruthy();
    expect(storedItem?.content?.raw).toBe('Synced from Chrome to Safari');
    expect(incomingItemSpy).toHaveBeenCalled();

    // Destination must send SYNC_ACK back to sender
    const ackCall = wsSendSpy.calls.all().find(c => c.args[0].type === 'SYNC_ACK');
    expect(ackCall).toBeTruthy();
    expect(ackCall?.args[0].targetDeviceId).toBe(mockSourceDevice.id);
  });

  it('Scenario 3: source device receives SYNC_ACK and marks item delivered and emits onDeliveryConfirmed', (done) => {
    const testPacketId = 'packet_ack_test_123';

    // Seed item in local store with pending delivery
    storageService.addItem({
      id: testPacketId,
      packetId: testPacketId,
      content: { category: 'text', raw: 'Pending sync item' },
      timestamp: Date.now(),
      deliveryStatus: 'pending'
    });

    syncService.onDeliveryConfirmed.subscribe(({ packetId, targetDeviceId }) => {
      expect(packetId).toBe(testPacketId);
      expect(targetDeviceId).toBe(mockDestinationDevice.id);

      const updated = storageService.allItems().find(i => i.id === testPacketId);
      expect(updated?.deliveryStatus).toBe('delivered');
      done();
    });

    // Simulate receiving SYNC_ACK from destination
    syncService.handleMessage({
      type: 'SYNC_ACK',
      packetId: testPacketId,
      senderDevice: mockDestinationDevice,
      targetDeviceId: mockSourceDevice.id,
      timestamp: Date.now()
    });
  });

  it('Scenario 4: should automatically activate and reconnect offline paired device upon receiving DEVICE_ONLINE signal', () => {
    // Start destination device in offline status
    deviceService.pairedDevices.set([{
      ...mockDestinationDevice,
      status: 'offline'
    }]);

    expect(deviceService.pairedDevices()[0].status).toBe('offline');

    // Simulate incoming DEVICE_ONLINE frame from the returning destination device
    syncService.handleMessage({
      type: 'DEVICE_ONLINE',
      senderDevice: mockDestinationDevice,
      targetDeviceId: 'broadcast',
      timestamp: Date.now()
    });

    const activePeer = deviceService.pairedDevices().find(d => d.id === mockDestinationDevice.id);
    expect(activePeer?.status).toBe('active');
  });
});
