// client/apps/tool-docs/src/app/pages/profile/docs-profile.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocService } from '../../services/doc.service';
import { DocsAuthService } from '../../services/docs-auth.service';
import { AuthorProfile } from '../../models/doc.model';

type ProfileTab = 'stories' | 'about';

@Component({
  selector: 'app-docs-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-page--profile">
      <div class="docs-profile">
        @if (loading()) {
          <div class="docs-skeleton--card">
            <div class="docs-profile__identity">
              <div class="docs-skeleton docs-avatar docs-avatar--xl"></div>
              <div class="docs-profile__info">
                <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
                <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
              </div>
            </div>
          </div>
        } @else if (profile(); as p) {
          <!-- Author Profile Card -->
          <div class="docs-profile__card">
            <div class="docs-profile__identity">
              <div class="docs-avatar docs-avatar--xl">
                {{ p.displayName.substring(0, 1).toUpperCase() }}
              </div>
              <div class="docs-profile__info">
                <h1 class="docs-profile__name">
                  {{ p.displayName }}
                </h1>
                @if (p.username) {
                  <span class="docs-profile__handle">&#64;{{ p.username }}</span>
                }
                <!-- Clean Single Horizontal Row Stats -->
                <div class="docs-profile__stats">
                  <div class="docs-profile__stat">
                    <span class="docs-profile__stat-value">{{ p.followerCount }}</span>
                    <span class="docs-profile__stat-label">{{ p.followerCount === 1 ? 'follower' : 'followers' }}</span>
                  </div>
                  <div class="docs-profile__stat">
                    <span class="docs-profile__stat-value">{{ p.followingCount }}</span>
                    <span class="docs-profile__stat-label">following</span>
                  </div>
                  <div class="docs-profile__stat">
                    <span class="docs-profile__stat-value">{{ p.publishedStories.length }}</span>
                    <span class="docs-profile__stat-label">{{ p.publishedStories.length === 1 ? 'story' : 'stories' }}</span>
                  </div>
                </div>
              </div>

              <!-- Profile Actions: Edit profile for owner -->
              <div>
                @if (isOwnProfile()) {
                  <button
                    type="button"
                    class="docs-button docs-button--secondary docs-button--sm"
                    (click)="toggleEditBio()"
                  >
                    {{ isEditingBio() ? 'Cancel' : 'Edit profile' }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="docs-button docs-button--primary docs-button--sm"
                    (click)="toggleFollow(p.id)"
                  >
                    {{ p.isFollowing ? 'Following' : 'Follow' }}
                  </button>
                }
              </div>
            </div>

            <!-- Inline Edit Profile Form -->
            @if (isEditingBio()) {
              <div class="docs-form-group">
                <label class="docs-form-label">Display Name</label>
                <input
                  type="text"
                  class="docs-input"
                  [(ngModel)]="editDisplayName"
                  placeholder="Your display name"
                />

                <label class="docs-form-label">Bio</label>
                <textarea
                  class="docs-textarea"
                  [(ngModel)]="editBio"
                  placeholder="Tell readers about yourself, your background, and what you write..."
                ></textarea>

                <div class="docs-dialog__actions">
                  <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="isEditingBio.set(false)">
                    Cancel
                  </button>
                  <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="saveProfile()">
                    Save Changes
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Profile Underline Tabs: Stories / About -->
          <div class="docs-tabs" role="tablist" aria-label="Author Profile Tabs">
            <div class="docs-tabs__list">
              <button
                type="button"
                role="tab"
                class="docs-tabs__tab"
                [class.docs-tabs__tab--active]="activeTab() === 'stories'"
                (click)="activeTab.set('stories')"
                [attr.aria-selected]="activeTab() === 'stories'"
              >
                Stories
              </button>
              <button
                type="button"
                role="tab"
                class="docs-tabs__tab"
                [class.docs-tabs__tab--active]="activeTab() === 'about'"
                (click)="activeTab.set('about')"
                [attr.aria-selected]="activeTab() === 'about'"
              >
                About
              </button>
            </div>
          </div>

          <!-- TAB 1: STORIES -->
          @if (activeTab() === 'stories') {
            @if (p.publishedStories.length === 0) {
              <div class="docs-empty-state">
                <p class="docs-empty-state__desc">
                  This author has not published any stories yet.
                </p>
              </div>
            } @else {
              <div class="docs-feed__column">
                @for (doc of p.publishedStories; track doc.id) {
                  <article class="docs-card docs-card--hover">
                    <div class="docs-card__header">
                      <div class="docs-card__meta">
                        <time>{{ formatDate(doc.publishedAt) }}</time>
                        <span>·</span>
                        <span>
                          {{ doc.sectionCount }} {{ doc.sectionCount === 1 ? 'section' : 'sections' }}
                        </span>
                      </div>
                    </div>

                    <div class="docs-card__body">
                      <h3 class="docs-card__title">
                        <a [routerLink]="['/p', doc.slug]" class="docs-link">
                          {{ doc.title }}
                        </a>
                      </h3>

                      @if (doc.summary) {
                        <p class="docs-card__desc">
                          {{ doc.summary }}
                        </p>
                      }
                    </div>

                    <div class="docs-card__footer">
                      <a [routerLink]="['/p', doc.slug]" class="docs-link">
                        Read Story →
                      </a>
                    </div>
                  </article>
                }
              </div>
            }
          }

          <!-- TAB 2: ABOUT -->
          @if (activeTab() === 'about') {
            <div class="docs-card">
              <h3 class="docs-card__title">About {{ p.displayName }}</h3>
              @if (p.bio) {
                <p class="docs-card__desc">
                  {{ p.bio }}
                </p>
              } @else {
                <p class="docs-card__desc">
                  {{ p.displayName }} has not added a bio yet.
                </p>
              }
            </div>
          }
        }
      </div>
    </div>
  `
})
export class DocsProfileComponent implements OnInit {
  private readonly docService = inject(DocService);
  private readonly authService = inject(DocsAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly profile = signal<AuthorProfile | null>(null);
  readonly loading = signal<boolean>(true);
  readonly isOwnProfile = signal<boolean>(false);
  readonly isEditingBio = signal<boolean>(false);
  readonly activeTab = signal<ProfileTab>('stories');

  editDisplayName = '';
  editBio = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const handle = params.get('handle') || params.get('id') || params.get('username');
      const currentUser = this.authService.currentUser();
      const emailHandle = currentUser?.email ? currentUser.email.split('@')[0] : '';

      if (!handle || handle === 'me' || (currentUser && (handle === currentUser.id || handle === currentUser.username || (emailHandle && handle === emailHandle)))) {
        this.isOwnProfile.set(true);
        if (currentUser) {
          this.loadProfile(currentUser.id, true);
        } else {
          this.loading.set(false);
          this.router.navigate(['/sign-in']);
        }
      } else {
        this.isOwnProfile.set(false);
        this.loadProfile(handle, false);
      }
    });
  }

  loadProfile(target: string, isOwn: boolean): void {
    this.loading.set(true);
    this.docService.getAuthorProfile(target).subscribe({
      next: p => {
        this.profile.set(p);
        this.editDisplayName = p.displayName;
        this.editBio = p.bio || '';
        this.loading.set(false);
      },
      error: () => {
        // Try username fallback
        this.docService.getAuthorProfileByUsername(target).subscribe({
          next: p => {
            this.profile.set(p);
            this.editDisplayName = p.displayName;
            this.editBio = p.bio || '';
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      }
    });
  }

  toggleEditBio(): void {
    this.isEditingBio.update(v => !v);
  }

  saveProfile(): void {
    this.http.put<{ success: boolean }>('/api/v1/users/me/profile', {
      displayName: this.editDisplayName,
      avatarUrl: this.profile()?.avatarUrl || null
    }).subscribe({
      next: () => {
        this.profile.update(p => p ? { ...p, displayName: this.editDisplayName, bio: this.editBio } : null);
        this.isEditingBio.set(false);
      }
    });
  }

  toggleFollow(authorId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/sign-in']);
      return;
    }
    const current = this.profile();
    if (!current) return;

    if (current.isFollowing) {
      this.docService.unfollowAuthor(authorId).subscribe({
        next: res => {
          this.profile.update(p => p ? { ...p, isFollowing: false, followerCount: res.followerCount } : null);
        }
      });
    } else {
      this.docService.followAuthor(authorId).subscribe({
        next: res => {
          this.profile.update(p => p ? { ...p, isFollowing: true, followerCount: res.followerCount } : null);
        }
      });
    }
  }

  formatDate(isoString?: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }
}
