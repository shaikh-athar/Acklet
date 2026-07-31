import { Component, inject, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { PreferenceService } from '../../../core/services/preference.service';
import { Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-workspace-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="pf-root">
      <!-- Page Header -->
      <div class="pf-page-header">
        <div>
          <h1 class="pf-page-title">Profile & Preferences</h1>
          <p class="pf-page-subtitle">Manage your onboarding profile, interests, and workspace settings.</p>
        </div>
        <button class="pf-update-btn" (click)="editOnboarding()">
          Update Preferences
        </button>
      </div>

      <div class="pf-grid">
        <!-- Left: Identity card -->
        <aside class="pf-identity-card">
          <div class="pf-avatar-ring">
            <div class="pf-avatar-inner">A</div>
          </div>
          <div class="pf-identity-name">Athar</div>
          <div class="pf-identity-email">athar&#64;acklet.io</div>

          <div class="pf-divider"></div>

          <div class="pf-meta-list">
            <div class="pf-meta-row">
              <span class="pf-meta-key">Member Since</span>
              <span class="pf-meta-val">2026</span>
            </div>
            <div class="pf-meta-row">
              <span class="pf-meta-key">Plan</span>
              <span class="pf-meta-val pf-plan-pro">Pro</span>
            </div>
            <div class="pf-meta-row">
              <span class="pf-meta-key">Status</span>
              <span class="pf-meta-val pf-status-active">● Active</span>
            </div>
          </div>
        </aside>

        <!-- Right: Sections -->
        <div class="pf-sections">

          <!-- Professional Identity -->
          <div class="pf-section">
            <div class="pf-section-head">
              <h2 class="pf-section-title">Professional Identity</h2>
            </div>

            <div class="pf-field-group">
              <div class="pf-field-label">MY ROLES</div>
              <div class="pf-chip-wrap">
                @for (role of roles(); track role) {
                  <span class="pf-chip pf-chip-role">{{ role }}</span>
                }
                @if (roles().length === 0) {
                  <span class="pf-empty">No roles selected.</span>
                }
              </div>
            </div>

            <div class="pf-field-group">
              <div class="pf-field-label">MY INTERESTS</div>
              <div class="pf-chip-wrap">
                @for (interest of interests(); track interest) {
                  <span class="pf-chip pf-chip-interest">{{ interest }}</span>
                }
                @if (interests().length === 0) {
                  <span class="pf-empty">No interests selected.</span>
                }
              </div>
            </div>

            <div class="pf-field-group">
              <div class="pf-field-label">EXPERIENCE LEVEL</div>
              <span class="pf-exp-badge">{{ expLevel() || 'Not Specified' }}</span>
            </div>
          </div>

          <!-- Appearance -->
          <div class="pf-section">
            <div class="pf-section-head">
              <h2 class="pf-section-title">Appearance</h2>
            </div>
            <div class="pf-field-label" style="margin-bottom: 10px;">THEME</div>
            <div class="pf-theme-row">
              <button class="pf-theme-btn" [class.pf-theme-active]="theme() === 'light'" (click)="setTheme('light')">
                <app-icon name="sun" class="pf-theme-icon" />
                <span>Light</span>
              </button>
              <button class="pf-theme-btn" [class.pf-theme-active]="theme() === 'dark'" (click)="setTheme('dark')">
                <app-icon name="moon" class="pf-theme-icon" />
                <span>Dark</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .pf-root {
      padding: 0;
    }

    /* Header */
    .pf-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .pf-page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
      margin: 0;
    }
    .pf-page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }
    .pf-update-btn {
      padding: 8px 16px;
      border-radius: 6px;
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s ease;
    }
    .pf-update-btn:hover { opacity: 0.85; }

    /* Grid */
    .pf-grid {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 24px;
      align-items: start;
    }

    /* Identity Card */
    .pf-identity-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 28px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .pf-avatar-ring {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      padding: 3px;
      background: linear-gradient(135deg, #7c3aed, #06b6d4);
      margin-bottom: 14px;
    }
    .pf-avatar-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--vercel-card-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: var(--vercel-text-primary);
    }
    .pf-identity-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
    .pf-identity-email {
      font-size: 12px;
      color: var(--vercel-text-muted);
      margin-top: 2px;
    }
    .pf-divider {
      width: 100%;
      height: 1px;
      background: var(--vercel-border);
      margin: 18px 0;
    }
    .pf-meta-list { width: 100%; }
    .pf-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 12px;
    }
    .pf-meta-key { color: var(--vercel-text-muted); }
    .pf-meta-val { color: var(--vercel-text-primary); font-weight: 600; }
    .pf-plan-pro { color: #7c3aed; }
    .pf-status-active { color: #10b981; }

    /* Sections */
    .pf-sections {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .pf-section {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 24px;
    }
    .pf-section-head {
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .pf-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
    .pf-field-group {
      margin-bottom: 18px;
    }
    .pf-field-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--vercel-text-muted);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .pf-chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pf-chip {
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 600;
    }
    .pf-chip-role {
      background: rgba(124, 58, 237, 0.12);
      color: #8b5cf6;
      border: 1px solid rgba(124, 58, 237, 0.25);
    }
    .pf-chip-interest {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-secondary);
      border: 1px solid var(--vercel-border);
    }
    .pf-empty {
      font-size: 13px;
      color: var(--vercel-text-muted);
      font-style: italic;
    }
    .pf-exp-badge {
      display: inline-flex;
      padding: 5px 12px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      text-transform: capitalize;
    }

    /* Theme switcher */
    .pf-theme-row {
      display: flex;
      gap: 10px;
    }
    .pf-theme-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: 8px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pf-theme-btn:hover {
      border-color: var(--vercel-text-muted);
      color: var(--vercel-text-primary);
    }
    .pf-theme-active {
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      border-color: var(--vercel-text-primary);
    }
    .pf-theme-icon {
      width: 14px;
      height: 14px;
    }

    @media (max-width: 860px) {
      .pf-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class WorkspaceProfileComponent {
  private readonly prefsSvc = inject(PreferenceService);
  private readonly router = inject(Router);

  readonly theme = this.prefsSvc.theme;
  readonly roles = computed(() => this.prefsSvc.prefs().onboarding?.roles ?? []);
  readonly interests = computed(() => this.prefsSvc.prefs().onboarding?.interests ?? []);
  readonly expLevel = computed(() => this.prefsSvc.prefs().onboarding?.experienceLevel);

  setTheme(t: Theme): void { this.prefsSvc.setTheme(t); }
  editOnboarding(): void { this.router.navigate(['/auth/onboarding']); }
}
