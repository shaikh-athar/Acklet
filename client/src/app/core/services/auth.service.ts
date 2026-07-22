import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { SyncService } from './sync.service';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  status: string;
  preferences: Record<string, any>;
  notificationSettings: Record<string, any>;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, any>;
  timestamp: string;
  traceId: string;
}

export interface OAuthPkceState {
  authUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
  profile: UserProfile;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly syncSvc = inject(SyncService);

  private readonly baseUrl = 'http://localhost:8080/api/v1';

  private readonly _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    // Check if user session already exists
    const token = localStorage.getItem('acklet_access_token');
    if (token) {
      this.fetchCurrentUser().subscribe({
        error: () => this.clearSession()
      });
    }
  }

  /** Gets PKCE state and Google OAuth 2.0 authorization URL from backend */
  getGoogleAuthUrl(redirectUri?: string): Observable<ApiResponse<OAuthPkceState>> {
    const params = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    return this.http.get<ApiResponse<OAuthPkceState>>(`${this.baseUrl}/auth/google/authorize${params}`);
  }

  /** Exchanges PKCE authorization code + verifier for session JWT tokens */
  exchangeGoogleCode(code: string, codeVerifier: string, redirectUri?: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/google/code`, {
      code,
      codeVerifier,
      redirectUri
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  loginWithGoogle(credential: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/google`, {
      credential
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  savePreferences(preferences: Record<string, any>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/users/me/preferences`, { preferences });
  }


  refreshToken(refreshToken: string): Observable<ApiResponse<TokenRefreshResponse>> {
    return this.http.post<ApiResponse<TokenRefreshResponse>>(`${this.baseUrl}/auth/refresh`, {
      refreshToken
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('acklet_access_token', res.data.accessToken);
          localStorage.setItem('acklet_refresh_token', res.data.refreshToken);
        }
      })
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem('acklet_refresh_token');
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  private fetchCurrentUser(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.baseUrl}/users/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._currentUser.set(res.data);
        }
      })
    );
  }

  /** Called by auth interceptor on 401 — clears state without triggering a logout API call. */
  handleExpiredSession(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  private setSession(authData: LoginResponse): void {
    localStorage.setItem('acklet_access_token', authData.accessToken);
    localStorage.setItem('acklet_refresh_token', authData.refreshToken);
    this._currentUser.set(authData.profile);
    // Trigger lazy background sync after login
    this.syncSvc.onLogin();
  }

  private clearSession(): void {
    localStorage.removeItem('acklet_access_token');
    localStorage.removeItem('acklet_refresh_token');
    this._currentUser.set(null);
    // Reset sync metadata on logout
    this.syncSvc.onLogout();
  }
}
