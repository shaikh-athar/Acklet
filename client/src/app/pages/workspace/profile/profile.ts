// client/src/app/pages/workspace/profile/profile.ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

@Component({
  selector: 'app-workspace-profile',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="profile-root page-enter">
      <header class="mb-8">
        <h1 class="page-title">User Profile</h1>
        <p class="page-subtitle">Manage your personal developer account and subscription settings.</p>
      </header>

      <div class="profile-layout">
        <!-- Sidebar profile details -->
        <aside class="profile-sidebar p-6">
          <div class="avatar-ring mb-4">
            <div class="avatar-circle">U</div>
          </div>
          <div class="avatar-info text-center">
            <h2 class="avatar-name">User Account</h2>
            <p class="avatar-email">user@acklet.io</p>
            <span class="badge badge-brand mt-2">Pro Developer</span>
          </div>
        </aside>

        <!-- Main details -->
        <main class="profile-main">
          <div class="p-6">
            <h2 class="section-title mb-4">Account Information</h2>
            <div class="info-grid">
              @for (field of accountFields; track field.label) {
                <div class="info-field">
                  <div class="info-field-label">{{ field.label }}</div>
                  <div class="info-field-value">{{ field.value }}</div>
                </div>
              }
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .profile-root { min-height: 100vh; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .profile-layout { display: grid; grid-template-columns: 260px 1fr; gap: 2rem; }
    .profile-sidebar { display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    
    .avatar-ring { width: 80px; height: 80px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--color-brand-800), var(--color-accent-500)); }
    .avatar-circle { width: 100%; height: 100%; border-radius: 50%; background: var(--color-surface-900); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: var(--color-brand-800); }
    .avatar-name { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .avatar-email { font-size: 0.8rem; color: var(--color-neutral-500); }

    .profile-main { display: flex; flex-direction: column; gap: 1.5rem; }
    .section-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); border-bottom: 1px solid var(--border-soft); padding-bottom: 0.5rem; }
    
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .info-field { display: flex; flex-direction: column; gap: 0.25rem; }
    .info-field-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--color-neutral-500); }
    .info-field-value { font-size: 0.875rem; color: var(--color-neutral-200); font-weight: 600; }

    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-2 { margin-top: 0.5rem; }
    .text-center { text-align: center; }

    @media (max-width: 768px) {
      .profile-layout { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceProfileComponent {
  readonly accountFields = [
    { label: 'Full Name', value: 'User Account' },
    { label: 'Email Address', value: 'user@acklet.io' },
    { label: 'Member Since', value: 'January 2026' },
    { label: 'Plan', value: 'Pro — $0/mo (Free Beta)' },
    { label: 'Timezone', value: 'UTC+5:30 (IST)' },
    { label: 'Last Login', value: 'Today, 5:00 PM' }
  ];
}
