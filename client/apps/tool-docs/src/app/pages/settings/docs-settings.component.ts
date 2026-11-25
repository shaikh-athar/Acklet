// client/apps/tool-docs/src/app/pages/settings/docs-settings.component.ts

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DocsAuthService } from '../../services/docs-auth.service';

@Component({
  selector: 'app-docs-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-page--settings">
      <!-- Page Header -->
      <header class="docs-settings__header">
        <h1 class="docs-settings__title">Settings</h1>
        <p class="docs-settings__subtitle">Manage your profile, writing preferences, and appearance.</p>
      </header>

      <!-- Notification of Save -->
      @if (saveMessage()) {
        <div class="docs-settings__alert">
          <div>
            <strong>✓</strong>
            <span>{{ saveMessage() }}</span>
          </div>
          <button type="button" class="docs-button docs-button--ghost docs-button--xs" (click)="saveMessage.set(null)">✕</button>
        </div>
      }

      <!-- Section 1: Profile & Identity -->
      <section class="docs-settings__section">
        <div class="docs-settings__section-header">
          <h2 class="docs-settings__section-title">Public Profile</h2>
          <p class="docs-settings__section-desc">This information will be displayed on your author profile and stories.</p>
        </div>

        <div class="docs-settings__card">
          <!-- Avatar Preview -->
          <div class="docs-settings__avatar-row">
            <div class="docs-avatar docs-avatar--xl">
              {{ userInitial() }}
            </div>
            <div>
              <p class="docs-profile__name">{{ displayName() || 'Author' }}</p>
              <p class="docs-profile__handle">{{ email() }}</p>
            </div>
          </div>

          <div class="docs-settings__form-col">
            <div class="docs-form-group">
              <label for="displayName" class="docs-form-label">Display Name</label>
              <input
                id="displayName"
                type="text"
                class="docs-input"
                [(ngModel)]="displayName"
                placeholder="Your name"
              />
            </div>

            <div class="docs-form-group">
              <label for="username" class="docs-form-label">Username / Handle</label>
              <div class="docs-settings__prefix-input">
                <span class="docs-settings__prefix">&#64;</span>
                <input
                  id="username"
                  type="text"
                  class="docs-input docs-settings__prefix-field"
                  [(ngModel)]="username"
                  placeholder="username"
                />
              </div>
            </div>

            <div class="docs-form-group">
              <label for="bio" class="docs-form-label">Short Bio</label>
              <textarea
                id="bio"
                class="docs-textarea"
                [(ngModel)]="bio"
                placeholder="Software engineer, writer, creator..."
                maxlength="200"
              ></textarea>
              <span class="docs-form-counter">{{ bio().length }}/200</span>
            </div>
          </div>

          <div class="docs-settings__actions">
            <button
              type="button"
              class="docs-button docs-button--primary docs-button--md"
              (click)="saveProfile()"
            >
              Save Profile
            </button>
          </div>
        </div>
      </section>

      <!-- Section 2: Appearance & Theme -->
      <section class="docs-settings__section">
        <div class="docs-settings__section-header">
          <h2 class="docs-settings__section-title">Appearance</h2>
          <p class="docs-settings__section-desc">Customize the interface theme for reading and writing.</p>
        </div>

        <div class="docs-settings__card">
          <div class="docs-theme-grid">
            <!-- Light Theme Card -->
            <button
              type="button"
              class="docs-theme-card"
              [class.docs-theme-card--active]="currentTheme() === 'light'"
              (click)="setTheme('light')"
            >
              <div class="docs-theme-card__preview docs-theme-card__preview--light">
                <div class="docs-theme-card__bar--dark"></div>
              </div>
              <p class="docs-theme-card__label">Light</p>
              <p class="docs-theme-card__desc">Pure white high-contrast editorial</p>
            </button>

            <!-- Dark Theme Card -->
            <button
              type="button"
              class="docs-theme-card"
              [class.docs-theme-card--active]="currentTheme() === 'dark'"
              (click)="setTheme('dark')"
            >
              <div class="docs-theme-card__preview docs-theme-card__preview--dark">
                <div class="docs-theme-card__bar--light"></div>
              </div>
              <p class="docs-theme-card__label">Dark</p>
              <p class="docs-theme-card__desc">Pure black high-contrast OLED</p>
            </button>
          </div>
        </div>
      </section>

      <!-- Section 3: Platform Link -->
      <footer class="docs-settings__footer">
        <span>Acklet Docs Platform</span>
        <a routerLink="/" class="docs-link">← Back to Discover</a>
      </footer>
    </div>
  `
})
export class DocsSettingsComponent implements OnInit {
  private readonly authService = inject(DocsAuthService);

  readonly displayName = signal<string>('');
  readonly username = signal<string>('');
  readonly email = signal<string>('');
  readonly bio = signal<string>('');
  readonly currentTheme = signal<'light' | 'dark'>('light');
  readonly saveMessage = signal<string | null>(null);

  readonly userInitial = () => {
    return (this.displayName()[0] || 'A').toUpperCase();
  };

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.displayName.set(user.displayName || '');
      this.email.set(user.email || '');
      this.username.set(user.email ? user.email.split('@')[0] : 'author');
    }

    if (typeof document !== 'undefined') {
      const theme = (localStorage.getItem('docs:theme') as 'light' | 'dark') || 
        (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      this.currentTheme.set(theme);
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('docs:theme', theme);
      localStorage.setItem('acklet:theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
  }

  saveProfile(): void {
    this.saveMessage.set('Profile settings saved successfully.');
    setTimeout(() => this.saveMessage.set(null), 3000);
  }
}
