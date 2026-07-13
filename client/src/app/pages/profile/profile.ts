// client/src/app/pages/profile/profile.ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="profile-root page-enter">

      <!-- ══ HEADER BANNER ══════════════════════════════════════ -->
      <div class="profile-banner gradient-mesh">
        <div class="orb orb-brand" style="width:500px;height:500px;top:-200px;left:-100px;"></div>
        <div class="orb orb-accent" style="width:350px;height:350px;bottom:-100px;right:-100px;"></div>
      </div>

      <div class="container-main profile-layout">

        <!-- ══ LEFT: SIDEBAR ══════════════════════════════════ -->
        <aside class="profile-sidebar">
          <!-- Avatar card -->
          <div class="profile-avatar-card glass-strong">
            <div class="avatar-ring">
              <div class="avatar-circle">AV</div>
            </div>
            <div class="avatar-info">
              <div class="avatar-name">Ayaz Vault</div>
              <div class="avatar-email">ayaz@ads-vault.io</div>
              <span class="badge badge-brand mt-2">Pro Member</span>
            </div>
          </div>

          <!-- Nav -->
          <nav class="profile-nav">
            @for (tab of tabs; track tab.id) {
              <button class="profile-nav-btn" [class.active]="activeTab() === tab.id"
                      (click)="setTab(tab.id)">
                <app-icon [name]="tab.icon" class="size-4" />
                {{ tab.label }}
              </button>
            }
          </nav>

          <!-- Quick stats -->
          <div class="profile-mini-stats">
            @for (s of miniStats; track s.label) {
              <div class="mini-stat glass">
                <div class="mini-stat-val" [style.color]="s.color">{{ s.value }}</div>
                <div class="mini-stat-label">{{ s.label }}</div>
              </div>
            }
          </div>
        </aside>

        <!-- ══ RIGHT: CONTENT AREA ════════════════════════════ -->
        <main class="profile-main">

          <!-- Overview tab -->
          @if (activeTab() === 'overview') {
            <div class="profile-section">
              <h2 class="profile-section-title">Account Overview</h2>

              <div class="profile-info-grid">
                @for (field of accountFields; track field.label) {
                  <div class="info-field glass">
                    <div class="info-field-label">{{ field.label }}</div>
                    <div class="info-field-value">{{ field.value }}</div>
                  </div>
                }
              </div>

              <div class="profile-usage-card glass">
                <div class="usage-header">
                  <div>
                    <div class="usage-title">Monthly Usage</div>
                    <div class="usage-sub">Tools run this month</div>
                  </div>
                  <div class="usage-count">312 <span class="usage-limit">/ 500</span></div>
                </div>
                <div class="usage-bar-track">
                  <div class="usage-bar-fill" style="width: 62.4%"></div>
                </div>
                <div class="usage-bar-labels">
                  <span>62% used</span>
                  <span>188 remaining</span>
                </div>
              </div>
            </div>
          }

          <!-- Recent activity tab -->
          @if (activeTab() === 'activity') {
            <div class="profile-section">
              <h2 class="profile-section-title">Recent Activity</h2>
              <div class="activity-list">
                @for (item of recentActivity; track item.id) {
                  <div class="activity-item glass">
                    <div class="activity-icon-box" [style.background]="item.gradient">
                      <app-icon [name]="item.icon" class="size-4 text-white" />
                    </div>
                    <div class="activity-info">
                      <div class="activity-tool">{{ item.tool }}</div>
                      <div class="activity-time">{{ item.time }}</div>
                    </div>
                    <a [routerLink]="['/tools', item.slug]" class="activity-open-btn">
                      Open
                      <app-icon name="arrow-right" class="size-3.5 ml-1" />
                    </a>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Favorites tab -->
          @if (activeTab() === 'favorites') {
            <div class="profile-section">
              <h2 class="profile-section-title">Saved Favorites</h2>
              <div class="favorites-grid">
                @for (fav of favorites; track fav.id) {
                  <a [routerLink]="['/tools', fav.slug]" class="fav-card glass" [style.--fav-color]="fav.color">
                    <div class="fav-icon-box">
                      <app-icon [name]="fav.icon" class="size-5 fav-icon" />
                    </div>
                    <div class="fav-name">{{ fav.name }}</div>
                    <div class="fav-cat">{{ fav.category }}</div>
                  </a>
                }
              </div>
            </div>
          }

          <!-- Settings tab -->
          @if (activeTab() === 'settings') {
            <div class="profile-section">
              <h2 class="profile-section-title">Account Settings</h2>
              <div class="settings-list">
                @for (group of settingsGroups; track group.title) {
                  <div class="settings-group glass">
                    <div class="settings-group-title">{{ group.title }}</div>
                    @for (opt of group.options; track opt.label) {
                      <div class="settings-row">
                        <div>
                          <div class="settings-label">{{ opt.label }}</div>
                          <div class="settings-desc">{{ opt.desc }}</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" [checked]="opt.enabled" />
                          <span class="toggle-track">
                            <span class="toggle-thumb"></span>
                          </span>
                        </label>
                      </div>
                    }
                  </div>
                }
              </div>
              <div class="settings-danger glass">
                <div class="settings-group-title danger-title">Danger Zone</div>
                <div class="danger-btns">
                  <button class="btn-danger-outline">Export Data</button>
                  <button class="btn-danger">Delete Account</button>
                </div>
              </div>
            </div>
          }

        </main>
      </div>
    </div>
  `,
  styles: [`
    .profile-root { min-height: 100vh; }

    /* Banner */
    .profile-banner { height: 200px; position: relative; overflow: hidden; }

    /* Layout */
    .profile-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; margin-top: -80px; padding-bottom: 5rem; position: relative; z-index: 2; align-items: start; }

    /* Sidebar */
    .profile-sidebar { display: flex; flex-direction: column; gap: 1.25rem; }

    .profile-avatar-card { border-radius: var(--radius-xl); padding: 1.75rem 1.5rem; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.875rem; }
    .avatar-ring { width: 80px; height: 80px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4); }
    .avatar-circle { width: 100%; height: 100%; border-radius: 50%; background: var(--color-surface-800); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; color: var(--color-brand-400); letter-spacing: -0.03em; }
    .avatar-name { font-size: 1rem; font-weight: 700; color: var(--color-neutral-100); }
    .avatar-email { font-size: 0.75rem; color: var(--color-neutral-500); }

    /* Nav */
    .profile-nav { display: flex; flex-direction: column; gap: 0.25rem; background: var(--color-surface-900); border-radius: var(--radius-xl); padding: 0.5rem; border: 1px solid rgba(255,255,255,0.04); }
    .profile-nav-btn { display: flex; align-items: center; gap: 0.625rem; padding: 0.625rem 0.875rem; border-radius: var(--radius-lg); border: none; background: none; color: var(--color-neutral-400); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s; text-align: left; }
    .profile-nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--color-neutral-100); }
    .profile-nav-btn.active { background: rgba(99,102,241,0.12); color: var(--color-brand-400); font-weight: 600; }

    /* Mini stats */
    .profile-mini-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.625rem; }
    .mini-stat { border-radius: var(--radius-lg); padding: 0.875rem 0.5rem; text-align: center; border: 1px solid rgba(255,255,255,0.06); }
    .mini-stat-val { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.04em; }
    .mini-stat-label { font-size: 0.65rem; color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-top: 0.125rem; }

    /* Main content */
    .profile-main { min-width: 0; }
    .profile-section { display: flex; flex-direction: column; gap: 1.25rem; }
    .profile-section-title { font-size: 1.375rem; font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.02em; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); }

    /* Overview: Info grid */
    .profile-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .info-field { padding: 1.125rem 1.25rem; border-radius: var(--radius-xl); border: 1px solid rgba(255,255,255,0.06); }
    .info-field-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-neutral-500); margin-bottom: 0.375rem; }
    .info-field-value { font-size: 0.9rem; font-weight: 600; color: var(--color-neutral-100); }

    /* Usage card */
    .profile-usage-card { padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid rgba(255,255,255,0.06); }
    .usage-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .usage-title { font-size: 0.9rem; font-weight: 600; color: var(--color-neutral-100); }
    .usage-sub { font-size: 0.75rem; color: var(--color-neutral-500); margin-top: 0.125rem; }
    .usage-count { font-size: 1.5rem; font-weight: 800; color: var(--color-brand-400); letter-spacing: -0.04em; }
    .usage-limit { font-size: 0.875rem; font-weight: 400; color: var(--color-neutral-500); }
    .usage-bar-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
    .usage-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .usage-bar-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--color-neutral-500); margin-top: 0.5rem; }

    /* Activity */
    .activity-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .activity-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-radius: var(--radius-xl); border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; }
    .activity-item:hover { border-color: rgba(255,255,255,0.1); transform: translateX(2px); }
    .activity-icon-box { width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .activity-info { flex: 1; }
    .activity-tool { font-size: 0.875rem; font-weight: 600; color: var(--color-neutral-100); }
    .activity-time { font-size: 0.72rem; color: var(--color-neutral-500); margin-top: 0.125rem; }
    .activity-open-btn { display: flex; align-items: center; font-size: 0.75rem; font-weight: 600; color: var(--color-brand-400); text-decoration: none; padding: 0.375rem 0.75rem; border-radius: var(--radius-md); background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.15); transition: all 0.2s; }
    .activity-open-btn:hover { background: rgba(99,102,241,0.16); border-color: rgba(99,102,241,0.3); }

    /* Favorites */
    .favorites-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .fav-card { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem 1rem; border-radius: var(--radius-xl); text-decoration: none; border: 1px solid rgba(255,255,255,0.06); transition: all 0.3s; text-align: center; }
    .fav-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--fav-color, #6366f1) 30%, transparent); box-shadow: var(--shadow-card-hover); }
    .fav-icon-box { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--fav-color, #6366f1) 10%, rgba(0,0,0,0.04)); border: 1px solid color-mix(in srgb, var(--fav-color, #6366f1) 16%, rgba(0,0,0,0.04)); }
    .fav-icon { color: var(--fav-color, #818cf8); }
    .fav-name { font-size: 0.825rem; font-weight: 600; color: var(--color-neutral-100); }
    .fav-cat { font-size: 0.7rem; color: var(--color-neutral-500); }

    /* Settings */
    .settings-list { display: flex; flex-direction: column; gap: 1rem; }
    .settings-group { border-radius: var(--radius-xl); padding: 1.5rem; border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 0; }
    .settings-group-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-neutral-500); margin-bottom: 1rem; }
    .settings-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.875rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .settings-row:last-child { border-bottom: none; padding-bottom: 0; }
    .settings-label { font-size: 0.875rem; font-weight: 600; color: var(--color-neutral-100); }
    .settings-desc { font-size: 0.75rem; color: var(--color-neutral-500); margin-top: 0.125rem; }

    /* Toggle */
    .toggle-switch { position: relative; display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0; }
    .toggle-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-track { width: 40px; height: 22px; border-radius: 999px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s; position: relative; }
    .toggle-switch input:checked + .toggle-track { background: rgba(99,102,241,0.4); border-color: rgba(99,102,241,0.5); }
    .toggle-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--color-neutral-400); transition: all 0.3s; }
    .toggle-switch input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); background: #818cf8; }

    /* Danger zone */
    .settings-danger { border-radius: var(--radius-xl); padding: 1.5rem; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.03); }
    .danger-title { color: #f87171 !important; }
    .danger-btns { display: flex; gap: 0.875rem; flex-wrap: wrap; }
    .btn-danger-outline { padding: 0.625rem 1.25rem; border-radius: var(--radius-lg); border: 1px solid rgba(239,68,68,0.35); background: none; color: #f87171; font-size: 0.875rem; font-family: inherit; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-danger-outline:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.6); }
    .btn-danger { padding: 0.625rem 1.25rem; border-radius: var(--radius-lg); border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.15); color: #f87171; font-size: 0.875rem; font-family: inherit; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-danger:hover { background: rgba(239,68,68,0.25); border-color: rgba(239,68,68,0.7); }

    @media (max-width: 900px) {
      .profile-layout { grid-template-columns: 1fr; margin-top: -40px; }
      .profile-mini-stats { grid-template-columns: repeat(3, 1fr); }
      .favorites-grid { grid-template-columns: repeat(2, 1fr); }
      .profile-info-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .favorites-grid { grid-template-columns: 1fr; }
      .danger-btns { flex-direction: column; }
    }
  `],
})
export class ProfileComponent {
  readonly activeTab = signal<string>('overview');

  readonly tabs = [
    { id: 'overview', label: 'Overview', icon: 'user' },
    { id: 'activity', label: 'Recent Activity', icon: 'clock' },
    { id: 'favorites', label: 'Favorites', icon: 'heart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  readonly miniStats = [
    { label: 'Tools Used', value: '148', color: '#6366f1' },
    { label: 'Saved', value: '32', color: '#10b981' },
    { label: 'Days Active', value: '74', color: '#f59e0b' },
  ];

  readonly accountFields = [
    { label: 'Full Name', value: 'Ayaz Vault' },
    { label: 'Email Address', value: 'ayaz@ads-vault.io' },
    { label: 'Member Since', value: 'January 2025' },
    { label: 'Plan', value: 'Pro — $12/mo' },
    { label: 'Timezone', value: 'UTC+5:30 (IST)' },
    { label: 'Last Login', value: 'Today, 12:48 PM' },
  ];

  readonly recentActivity = [
    { id: '1', tool: 'JWT Inspector', slug: 'jwt-inspector', time: '2 hours ago', icon: 'key-round', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { id: '2', tool: 'JSON Formatter', slug: 'json-formatter', time: 'Yesterday, 4:20 PM', icon: 'braces', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { id: '3', tool: 'Color Palette Generator', slug: 'color-palette', time: 'Yesterday, 11:05 AM', icon: 'palette', gradient: 'linear-gradient(135deg,#ec4899,#a855f7)' },
    { id: '4', tool: 'Base64 Encoder/Decoder', slug: 'base64', time: '2 days ago', icon: 'binary', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
    { id: '5', tool: 'Cron Expression Builder', slug: 'cron-builder', time: '3 days ago', icon: 'clock', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)' },
    { id: '6', tool: 'Regex Tester', slug: 'regex-tester', time: '4 days ago', icon: 'regex', gradient: 'linear-gradient(135deg,#f97316,#ef4444)' },
  ];

  readonly favorites = [
    { id: '1', name: 'JWT Inspector', slug: 'jwt-inspector', category: 'Security', icon: 'key-round', color: '#6366f1' },
    { id: '2', name: 'JSON Formatter', slug: 'json-formatter', category: 'Developer', icon: 'braces', color: '#06b6d4' },
    { id: '3', name: 'Color Palette', slug: 'color-palette', category: 'Design', icon: 'palette', color: '#ec4899' },
    { id: '4', name: 'Regex Tester', slug: 'regex-tester', category: 'Developer', icon: 'regex', color: '#f97316' },
    { id: '5', name: 'Markdown Preview', slug: 'markdown-preview', category: 'Writing', icon: 'file-text', color: '#10b981' },
    { id: '6', name: 'Unit Converter', slug: 'unit-converter', category: 'Calculator', icon: 'calculator', color: '#f59e0b' },
  ];

  readonly settingsGroups = [
    {
      title: 'Notifications',
      options: [
        { label: 'New Tool Announcements', desc: 'Get notified when we ship new tools', enabled: true },
        { label: 'Weekly Digest', desc: 'Trending tools summary every Monday', enabled: false },
        { label: 'Security Alerts', desc: 'Important account security notifications', enabled: true },
      ]
    },
    {
      title: 'Privacy',
      options: [
        { label: 'Usage Analytics', desc: 'Help us improve by sharing anonymous usage data', enabled: false },
        { label: 'Tool History', desc: 'Save your tool usage history locally', enabled: true },
      ]
    },
  ];

  setTab(id: string): void { this.activeTab.set(id); }
}
