// client/apps/tool-docs/src/app/services/docs-auth.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { getAckletAuthUrl } from '@acklet/shared';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: string;
}

interface TokenRefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

@Injectable({ providedIn: 'root' })
export class DocsAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = '/api/v1';

  private readonly _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isLoaded = signal(false);

  constructor() {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost'))) {
      this._currentUser.set({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'acklet@local.com',
        displayName: 'acklet',
        username: 'acklet',
        role: 'ADMIN'
      });
      this.isLoaded.set(true);
      return;
    }
    this.fetchCurrentUser();
  }

  fetchCurrentUser(): void {
    // 1. Check if token already exists in localStorage (e.g. same origin or previous refresh)
    const storedToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('acklet_access_token') : null;

    if (storedToken) {
      this.http.get<{ success: boolean; data: UserProfile }>(`${this.baseUrl}/users/me`).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this._currentUser.set(res.data);
            this.isLoaded.set(true);
          } else {
            this.attemptSilentRefresh();
          }
        },
        error: () => {
          this.attemptSilentRefresh();
        },
      });
      return;
    }

    // 2. Otherwise attempt silent token refresh via HttpOnly cookie (cross-subdomain / shared session)
    this.attemptSilentRefresh();
  }

  private attemptSilentRefresh(): void {
    this.http
      .post<{ success: boolean; data: TokenRefreshResponse }>(
        `${this.baseUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.accessToken) {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('acklet_access_token', res.data.accessToken);
            }
            // Fetch profile with rotated access token
            this.http
              .get<{ success: boolean; data: UserProfile }>(`${this.baseUrl}/users/me`)
              .subscribe({
                next: (profileRes) => {
                  if (profileRes.success && profileRes.data) {
                    this._currentUser.set(profileRes.data);
                  } else {
                    this._currentUser.set(null);
                  }
                  this.isLoaded.set(true);
                },
                error: () => {
                  this._currentUser.set(null);
                  this.isLoaded.set(true);
                },
              });
          } else {
            this.clearLocalSession();
            this.isLoaded.set(true);
          }
        },
        error: () => {
          if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost'))) {
            // Local development fallback user (same as core AuthService DEFAULT_ACKLET_USER)
            this._currentUser.set({
              id: '00000000-0000-0000-0000-000000000001',
              email: 'acklet@local.com',
              displayName: 'acklet',
              username: 'acklet',
              role: 'ADMIN'
            });
            this.isLoaded.set(true);
            return;
          }
          this.clearLocalSession();
          this.isLoaded.set(true);
        },
      });
  }

  redirectToLogin(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      const targetReturn = returnUrl || window.location.href;
      window.location.href = getAckletAuthUrl('login', targetReturn);
    }
  }

  redirectToSignup(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      const targetReturn = returnUrl || window.location.href;
      window.location.href = getAckletAuthUrl('signup', targetReturn);
    }
  }

  logout(): void {
    this.http
      .post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this.clearLocalSession();
          this.router.navigate(['/']);
        },
        error: () => {
          this.clearLocalSession();
          this.router.navigate(['/']);
        },
      });
  }

  private clearLocalSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('acklet_access_token');
    }
    this._currentUser.set(null);
  }
}

