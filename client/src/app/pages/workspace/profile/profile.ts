import { Component, inject, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { PreferenceService } from '../../../core/services/preference.service';
import { Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-workspace-profile',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="profile-root page-enter">
      <header class="mb-10 flex justify-between items-center">
        <div>
          <h1 class="page-title">Profile & Preferences</h1>
          <p class="page-subtitle">Manage your onboarding profile, interests, and workspace settings.</p>
        </div>
        <button class="btn btn-primary" (click)="editOnboarding()">
          <app-icon name="edit-2" class="size-4 mr-2" />
          Update Preferences
        </button>
      </header>

      <div class="profile-layout">
        <!-- Sidebar profile details -->
        <aside class="profile-sidebar glass">
          <div class="avatar-ring mb-4">
            <div class="avatar-circle">A</div>
          </div>
          <div class="avatar-info text-center">
            <h2 class="avatar-name">Athar</h2>
            <p class="avatar-email">athar@acklet.io</p>
          </div>
          
          <div class="sidebar-meta mt-8">
            <div class="meta-row">
              <span class="meta-label">Member Since</span>
              <span class="meta-value">2026</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Plan</span>
              <span class="meta-value text-brand-500 font-bold">Pro</span>
            </div>
          </div>
        </aside>

        <!-- Main details -->
        <main class="profile-main">
          
          <!-- Roles & Interests -->
          <section class="profile-section glass-strong">
            <div class="section-header">
              <h2 class="section-title">Professional Identity</h2>
              <app-icon name="user" class="size-5 text-neutral-400" />
            </div>
            
            <div class="info-group">
              <h3 class="info-label">My Roles</h3>
              <div class="chip-container">
                @for (role of roles(); track role) {
                  <span class="profile-chip role-chip">{{ role }}</span>
                }
                @if (roles().length === 0) {
                  <span class="empty-text">No roles selected.</span>
                }
              </div>
            </div>

            <div class="info-group mt-6">
              <h3 class="info-label">My Interests</h3>
              <div class="chip-container">
                @for (interest of interests(); track interest) {
                  <span class="profile-chip interest-chip">{{ interest }}</span>
                }
                @if (interests().length === 0) {
                  <span class="empty-text">No interests selected.</span>
                }
              </div>
            </div>

            <div class="info-group mt-6">
              <h3 class="info-label">Experience Level</h3>
              <div class="exp-badge">
                {{ expLevel() || 'Not specified' }}
              </div>
            </div>
          </section>

          <!-- Appearance -->
          <section class="profile-section glass-strong">
            <div class="section-header">
              <h2 class="section-title">Appearance</h2>
              <app-icon name="layout" class="size-5 text-neutral-400" />
            </div>
            
            <div class="theme-options mt-4">
              <button class="theme-btn" [class.selected]="theme() === 'light'" (click)="setTheme('light')">
                <app-icon name="sun" class="size-4 mb-2" />
                Light
              </button>
              <button class="theme-btn" [class.selected]="theme() === 'dark'" (click)="setTheme('dark')">
                <app-icon name="moon" class="size-4 mb-2" />
                Dark
              </button>
            </div>
          </section>

        </main>
      </div>
    </div>
  `,
  styles: [`
    .profile-root { min-height: 100vh; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }

    .profile-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2.5rem; }
    
    /* Sidebar */
    .profile-sidebar { 
      padding: 2.5rem 1.5rem; border-radius: var(--radius-xl); 
      display: flex; flex-direction: column; align-items: center;
    }
    .avatar-ring { 
      width: 90px; height: 90px; border-radius: 50%; padding: 4px; 
      background: linear-gradient(135deg, var(--color-brand-500), var(--color-accent-400)); 
    }
    .avatar-circle { 
      width: 100%; height: 100%; border-radius: 50%; background: var(--color-surface-900); 
      display: flex; align-items: center; justify-content: center; font-size: 2rem; 
      font-weight: 800; color: var(--color-neutral-100); 
    }
    .avatar-name { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-50); }
    .avatar-email { font-size: 0.85rem; color: var(--color-neutral-400); }
    
    .sidebar-meta { width: 100%; padding-top: 1.5rem; border-top: 1px solid var(--border-soft); }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.85rem; }
    .meta-label { color: var(--color-neutral-400); }
    .meta-value { color: var(--color-neutral-100); font-weight: 600; }

    /* Main Sections */
    .profile-main { display: flex; flex-direction: column; gap: 2rem; }
    .profile-section { padding: 2rem; border-radius: var(--radius-xl); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-soft); padding-bottom: 1rem; }
    .section-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); }

    .info-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-neutral-500); margin-bottom: 0.75rem; }
    
    .chip-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .profile-chip { padding: 0.4rem 0.875rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; }
    .role-chip { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); text-transform: capitalize; }
    .interest-chip { background: var(--color-surface-800); color: var(--color-neutral-300); border: 1px solid var(--color-surface-700); }
    
    .empty-text { font-size: 0.85rem; color: var(--color-neutral-500); font-style: italic; }
    
    .exp-badge { display: inline-flex; padding: 0.5rem 1rem; background: var(--color-surface-800); border-radius: var(--radius-lg); font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-100); text-transform: capitalize; border: 1px solid var(--color-surface-700); }

    /* Theme */
    .theme-options { display: flex; gap: 1rem; max-width: 300px; }
    .theme-btn { 
      flex: 1; padding: 1.25rem 1rem; display: flex; flex-direction: column; align-items: center;
      background: var(--color-surface-900); border: 1px solid var(--color-surface-700);
      border-radius: var(--radius-lg); font-weight: 600; color: var(--color-neutral-400); 
      cursor: pointer; transition: all 0.2s;
    }
    .theme-btn.selected {
      background: var(--color-surface-800); border-color: var(--color-neutral-50); color: var(--color-neutral-50);
    }

    .mb-4 { margin-bottom: 1rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .text-center { text-align: center; }

    @media (max-width: 900px) {
      .profile-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceProfileComponent {
  private readonly prefsSvc = inject(PreferenceService);
  private readonly router = inject(Router);

  readonly theme = this.prefsSvc.theme;
  
  readonly roles = computed(() => this.prefsSvc.prefs().onboarding?.roles ?? []);
  readonly interests = computed(() => this.prefsSvc.prefs().onboarding?.interests ?? []);
  readonly expLevel = computed(() => this.prefsSvc.prefs().onboarding?.experienceLevel);

  setTheme(t: Theme): void {
    this.prefsSvc.setTheme(t);
  }

  editOnboarding(): void {
    this.router.navigate(['/auth/onboarding']);
  }
}
