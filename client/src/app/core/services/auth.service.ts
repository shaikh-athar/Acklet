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
  private readonly _accessToken = signal<string | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    // Check if user session already exists
    const token = localStorage.getItem('acklet_access_token');
    const expiryStr = localStorage.getItem('acklet_remember_me_expiry');
    if (token) {
      if (expiryStr && Date.now() > parseInt(expiryStr, 10)) {
        console.log('[AuthService] 7-day session window expired. Requiring fresh sign in.');
        this.clearSession();
      } else {
        this._accessToken.set(token);
        this.fetchCurrentUser().subscribe({
          error: () => this.clearSession()
        });
      }
    } else {
      // Attempt silent refresh via HttpOnly cookie if enterpriseSecurity enabled
      this.refreshToken().subscribe({
        next: () => this.fetchCurrentUser().subscribe(),
        error: () => {}
      });
    }
  }

  getAccessToken(): string | null {
    return this._accessToken() || localStorage.getItem('acklet_access_token');
  }

  /** Gets PKCE state and Google OAuth 2.0 authorization URL from backend */
  getGoogleAuthUrl(redirectUri?: string): Observable<ApiResponse<OAuthPkceState>> {
    const params = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    return this.http.get<ApiResponse<OAuthPkceState>>(`${this.baseUrl}/auth/google/authorize${params}`);
  }

  /** Exchanges PKCE authorization code + verifier for session JWT tokens */
  exchangeGoogleCode(code: string, codeVerifier: string, redirectUri?: string, rememberMe = true): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/google/code`, {
      code,
      codeVerifier,
      redirectUri
    }, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data, rememberMe);
        }
      })
    );
  }

  loginWithGoogle(credential: string, rememberMe = true): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/google`, {
      credential
    }, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data, rememberMe);
        }
      })
    );
  }

  savePreferences(preferences: Record<string, any>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/users/me/preferences`, { preferences });
  }

  refreshToken(refreshTokenStr?: string): Observable<ApiResponse<TokenRefreshResponse>> {
    const tokenToPass = refreshTokenStr || localStorage.getItem('acklet_refresh_token') || '';
    return this.http.post<ApiResponse<TokenRefreshResponse>>(`${this.baseUrl}/auth/refresh`, {
      refreshToken: tokenToPass
    }, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._accessToken.set(res.data.accessToken);
          if (res.data.refreshToken) {
            localStorage.setItem('acklet_refresh_token', res.data.refreshToken);
          }
        }
      })
    );
  }

  getActiveSessions(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/auth/sessions`, { withCredentials: true });
  }

  revokeSession(sessionId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/auth/sessions/${sessionId}`, { withCredentials: true });
  }

  revokeAllSessions(): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/sessions/revoke-all`, {}, { withCredentials: true });
  }

  logout(): void {
    const refreshToken = localStorage.getItem('acklet_refresh_token') || '';
    this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken }, { withCredentials: true }).subscribe();
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

  setSession(authData: LoginResponse, rememberMe = true, provider = 'Google'): void {
    this._accessToken.set(authData.accessToken);
    localStorage.setItem('acklet_access_token', authData.accessToken);
    if (authData.refreshToken) {
      localStorage.setItem('acklet_refresh_token', authData.refreshToken);
    }
    if (authData.profile) {
      if (authData.profile.email) localStorage.setItem('acklet_last_login_email', authData.profile.email);
      if (authData.profile.displayName) localStorage.setItem('acklet_last_login_name', authData.profile.displayName);
      if (authData.profile.avatarUrl) localStorage.setItem('acklet_last_login_avatar', authData.profile.avatarUrl);
      localStorage.setItem('acklet_last_login_provider', provider);
    }
    if (rememberMe) {
      const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      localStorage.setItem('acklet_remember_me_expiry', expiry.toString());
    } else {
      localStorage.removeItem('acklet_remember_me_expiry');
    }
    this._currentUser.set(authData.profile);
    // Trigger lazy background sync after login
    this.syncSvc.onLogin();
  }

  getLastLoginInfo(): { email: string | null; name: string | null; avatarUrl: string | null; provider: string | null } {
    return {
      email: localStorage.getItem('acklet_last_login_email'),
      name: localStorage.getItem('acklet_last_login_name'),
      avatarUrl: localStorage.getItem('acklet_last_login_avatar'),
      provider: localStorage.getItem('acklet_last_login_provider')
    };
  }

  private clearSession(): void {
    this._accessToken.set(null);
    localStorage.removeItem('acklet_access_token');
    localStorage.removeItem('acklet_refresh_token');
    localStorage.removeItem('acklet_remember_me_expiry');
    this._currentUser.set(null);
    // Reset sync metadata on logout
    this.syncSvc.onLogout();
  }
}
