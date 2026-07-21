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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, any>;
  timestamp: string;
  traceId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
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

  register(email: string, password: string, displayName: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/register`, {
      email,
      password,
      displayName
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  verifyEmail(email: string, code: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/verify-email`, {
      email,
      code
    });
  }

  logout(): void {
    const refreshToken = localStorage.getItem('acklet_refresh_token');
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
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
