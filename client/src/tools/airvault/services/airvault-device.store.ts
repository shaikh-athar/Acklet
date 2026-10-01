import { Injectable, signal, computed, inject } from '@angular/core';
import { AirVaultDeviceService, AirVaultDevice } from './airvault-device.service';

@Injectable({
  providedIn: 'root'
})
export class AirVaultDeviceStore {
  private deviceService = inject(AirVaultDeviceService);

  readonly currentDevice = this.deviceService.currentDevice;
  readonly pairedDevices = this.deviceService.pairedDevices;
  readonly ephemeralPin = this.deviceService.ephemeralPin;

  // Selected Target (undefined = broadcast to all sync-enabled devices)
  readonly selectedTargetId = signal<string | undefined>(undefined);

  readonly selectedTargetDevice = computed(() => {
    const targetId = this.selectedTargetId();
    if (!targetId) return null;
    return this.pairedDevices().find(d => d.id === targetId) || null;
  });

  readonly totalOnlineDevicesCount = computed(() => {
    return this.pairedDevices().filter(d => d.status === 'active' && d.syncEnabled !== false).length + 1; // +1 for self
  });

  readonly syncEnabledDevices = computed(() => {
    return this.pairedDevices().filter(d => d.syncEnabled !== false);
  });

  setSelectedTarget(targetId: string | undefined) {
    this.selectedTargetId.set(targetId);
  }

  toggleSyncTarget(deviceId: string) {
    this.deviceService.toggleSyncTarget(deviceId);
  }

  addDevice(device: AirVaultDevice) {
    this.deviceService.addPairedDevice(device);
  }

  revokeDevice(deviceId: string) {
    this.deviceService.revokeDevice(deviceId);
    if (this.selectedTargetId() === deviceId) {
      this.selectedTargetId.set(undefined);
    }
  }

  renameDevice(deviceId: string, newName: string) {
    this.deviceService.renameDevice(deviceId, newName);
  }

  getDisplayLabel(device?: AirVaultDevice | null): string {
    return this.deviceService.getDisplayLabel(device);
  }

  getActualUsername(device?: AirVaultDevice | null): string {
    return this.deviceService.getActualUsername(device);
  }

  generatePairingPin() {
    this.deviceService.generatePairingPin();
  }
}
