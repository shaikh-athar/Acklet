import { TestBed } from '@angular/core/testing';
import { AirVaultStorageService } from './airvault-storage.service';
import { AirVaultDeviceService, PairedDevice } from './airvault-device.service';
import { signal } from '@angular/core';

describe('AirVault Storage Limit Removal (Regression Test)', () => {
  let storageService: AirVaultStorageService;
  let mockDeviceService: any;
  let pairedDevicesSignal = signal<PairedDevice[]>([]);

  beforeEach(() => {
    mockDeviceService = {
      currentDevice: signal({ id: 'dev-self', name: 'Self Device', username: 'selfuser' }),
      pairedDevices: pairedDevicesSignal,
      savePairedDevices: jasmine.createSpy('savePairedDevices')
    };

    TestBed.configureTestingModule({
      providers: [
        AirVaultStorageService,
        { provide: AirVaultDeviceService, useValue: mockDeviceService }
      ]
    });

    storageService = TestBed.inject(AirVaultStorageService);
  });

  it('Pairing 1, 5, or 20 devices never introduces or alters any client-visible storage limit value', () => {
    // 1. Initial state (0 devices)
    pairedDevicesSignal.set([]);
    expect((storageService as any).totalStorageCapBytes).toBeUndefined();
    expect((storageService as any).capExceeded).toBeUndefined();
    expect((storageService as any).storageUsedPercent).toBeUndefined();

    // 2. Pair 1 device
    pairedDevicesSignal.set([
      { id: 'dev-1', name: 'MacBook Pro', status: 'active', pairedAt: Date.now(), lastSeen: Date.now(), syncEnabled: true }
    ]);
    expect((storageService as any).totalStorageCapBytes).toBeUndefined();

    // 3. Pair 5 devices
    const fiveDevices: PairedDevice[] = Array.from({ length: 5 }, (_, i) => ({
      id: `dev-${i + 1}`,
      name: `Device ${i + 1}`,
      status: 'active',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      syncEnabled: true
    }));
    pairedDevicesSignal.set(fiveDevices);
    expect((storageService as any).totalStorageCapBytes).toBeUndefined();

    // 4. Pair 20 devices
    const twentyDevices: PairedDevice[] = Array.from({ length: 20 }, (_, i) => ({
      id: `dev-${i + 1}`,
      name: `Device ${i + 1}`,
      status: 'active',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      syncEnabled: true
    }));
    pairedDevicesSignal.set(twentyDevices);
    expect((storageService as any).totalStorageCapBytes).toBeUndefined();
  });
});
