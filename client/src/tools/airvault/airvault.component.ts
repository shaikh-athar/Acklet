import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { AirVaultSyncService } from './services/airvault-sync.service';
import { AirVaultClipItem, AirVaultDevice, DeviceType, PairingSession } from './models/airvault.models';

@Component({
  selector: 'app-airvault',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './airvault.component.html',
  styleUrls: ['./airvault.component.css'],
})
export class AirVaultComponent {
  private readonly syncService = inject(AirVaultSyncService);
  private readonly router = inject(Router);

  // Service Signals
  public readonly devices = this.syncService.devices;
  public readonly currentClip = this.syncService.currentClip;
  public readonly filteredClips = this.syncService.filteredClips;
  public readonly settings = this.syncService.settings;
  public readonly isSyncing = this.syncService.isSyncing;
  public readonly currentPairingSession = this.syncService.pairingSession;
  public readonly typeFilter = this.syncService.selectedTypeFilter;

  // Local Component Signals
  public readonly showPairingModal = signal<boolean>(false);
  public readonly showTargetSendModal = signal<boolean>(false);
  public readonly showSettingsModal = signal<boolean>(false);
  public readonly showRenameModal = signal<boolean>(false);
  public readonly deviceToRename = signal<AirVaultDevice | null>(null);
  public newDeviceName = '';
  public readonly copiedState = signal<boolean>(false);
  public readonly activeTargetItem = signal<AirVaultClipItem | null>(null);

  // Form Inputs
  public manualInputText = '';
  public searchFilter = '';

  // Computed state
  public readonly activeDeviceCount = computed(
    () => this.devices().filter((d) => d.status === 'connected' || d.status === 'idle').length
  );

  public readonly otherDevices = computed(() =>
    this.devices().filter((d) => !d.isCurrentDevice && d.status === 'connected')
  );

  public readonly detectedInputType = computed(() => {
    if (!this.manualInputText.trim()) return 'None';
    const detection = this.syncService.detectContentType(this.manualInputText);
    return detection.language ? `${detection.type} (${detection.language})` : detection.type;
  });

  // Actions
  public async captureClipboard(): Promise<void> {
    await this.syncService.captureSystemClipboard();
  }

  public async copyClip(content: string): Promise<void> {
    const ok = await this.syncService.copyToClipboard(content);
    if (ok) {
      this.copiedState.set(true);
      setTimeout(() => this.copiedState.set(false), 2000);
    }
  }

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      await this.syncService.syncFileOrImage(file);
      input.value = '';
    }
  }

  public async pushManualContent(): Promise<void> {
    if (!this.manualInputText.trim()) return;
    await this.syncService.syncClipboardContent(this.manualInputText);
    this.manualInputText = '';
  }

  public setTypeFilter(type: string): void {
    this.syncService.selectedTypeFilter.set(type);
  }

  public onSearchChange(val: string): void {
    this.syncService.searchQuery.set(val);
  }

  public togglePin(id: string): void {
    this.syncService.togglePin(id);
  }

  public deleteClip(id: string): void {
    this.syncService.deleteClip(id);
  }

  public clearHistory(): void {
    this.syncService.clearAllHistory();
    this.showSettingsModal.set(false);
  }

  public openPairingModal(): void {
    this.syncService.startPairingSession();
    this.showPairingModal.set(true);
  }

  public closePairingModal(): void {
    this.showPairingModal.set(false);
  }

  public simulatePairDevice(name: string, type: DeviceType, os: any): void {
    this.syncService.completePairing(name, type, os);
    this.showPairingModal.set(false);
  }

  public openTargetSendModal(item: AirVaultClipItem): void {
    this.activeTargetItem.set(item);
    this.showTargetSendModal.set(true);
  }

  public closeTargetSendModal(): void {
    this.showTargetSendModal.set(false);
    this.activeTargetItem.set(null);
  }

  public async executeTargetSend(deviceId: string): Promise<void> {
    const item = this.activeTargetItem();
    if (!item) return;
    await this.syncService.syncClipboardContent(item.content, [deviceId]);
    this.closeTargetSendModal();
  }

  public openRenameModal(dev: AirVaultDevice): void {
    this.deviceToRename.set(dev);
    this.newDeviceName = dev.name;
    this.showRenameModal.set(true);
  }

  public saveRenameDevice(): void {
    const dev = this.deviceToRename();
    if (dev && this.newDeviceName.trim()) {
      this.syncService.renameDevice(dev.id, this.newDeviceName.trim());
      this.showRenameModal.set(false);
      this.deviceToRename.set(null);
    }
  }

  public closeRenameModal(): void {
    this.showRenameModal.set(false);
    this.deviceToRename.set(null);
  }

  public toggleDeviceOnline(deviceId: string): void {
    this.syncService.toggleDeviceStatus(deviceId);
  }

  public revokeDevice(deviceId: string): void {
    this.syncService.revokeDevice(deviceId);
  }

  public toggleSettingsModal(): void {
    this.showSettingsModal.update((v) => !v);
  }

  public openInTool(item: AirVaultClipItem): void {
    if (item.language === 'json' || item.content.trim().startsWith('{') || item.content.trim().startsWith('[')) {
      this.router.navigate(['/tools/json-lens']);
    } else if (item.contentType === 'file' || item.contentType === 'image') {
      this.router.navigate(['/tools/easy-convert']);
    } else if (item.contentType === 'url') {
      window.open(item.content.trim(), '_blank');
    }
  }

  public getDeviceIcon(type: string): string {
    switch (type) {
      case 'mobile':
        return 'smartphone';
      case 'tablet':
        return 'tablet';
      case 'desktop':
        return 'monitor';
      case 'laptop':
        return 'laptop';
      default:
        return 'globe';
    }
  }

  public timeAgo(isoDate: string): string {
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
