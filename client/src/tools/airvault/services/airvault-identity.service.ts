import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../app/core/services/auth.service';
import { AirVaultDeviceService,  } from './airvault-device.service';
import { Observable, of } from 'rxjs';

export interface AirVaultUserSession {
  userId: string;
  email: string;
  displayName: string;
  vaultId: string;
  isCloudAuthenticated: boolean;
  activeDeviceCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultIdentityService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(AirVaultDeviceService);

  private readonly baseUrl = '/api/v1/airvault/auth';

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  vaultSession = signal<AirVaultUserSession>({
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'local-vault@acklet.internal',
    displayName: 'Local Developer Vault',
    vaultId: 'vault-local-01',
    isCloudAuthenticated: false,
    activeDeviceCount: 1
  });

  constructor() {
    this.initSession();
  }

  initSession() {
    const user = this.currentUser();
    if (user && this.isAuthenticated()) {
      this.vaultSession.set({
        userId: user.id,
        email: user.email,
        displayName: user.displayName || 'Acklet User',
        vaultId: 'vault-' + user.id.substring(0, 8),
        isCloudAuthenticated: true,
        activeDeviceCount: this.deviceService.pairedDevices().length + 1
      });
    } else {
      let localVaultId = '';
      try {
        localVaultId = localStorage.getItem('airvault_local_vault_id') || '';
      } catch {}

      if (!localVaultId) {
        localVaultId = 'vault-' + Math.random().toString(36).substring(2, 10);
        try {
          localStorage.setItem('airvault_local_vault_id', localVaultId);
        } catch {}
      }

      this.vaultSession.set({
        userId: 'anonymous-local',
        email: 'local-privacy-vault',
        displayName: 'Local Device Vault',
        vaultId: localVaultId,
        isCloudAuthenticated: false,
        activeDeviceCount: this.deviceService.pairedDevices().length + 1
      });
    }
  }

  fetchBackendSession(): Observable<any | null> {
    return of(null);
  }
}
