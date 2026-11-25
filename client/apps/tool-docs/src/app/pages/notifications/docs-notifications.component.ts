// client/apps/tool-docs/src/app/pages/notifications/docs-notifications.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DocService } from '../../services/doc.service';
import { DocNotificationItem } from '../../models/doc.model';

@Component({
  selector: 'app-docs-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="docs-page--notifications">
      <!-- Header -->
      <div class="docs-notifications__header">
        <div class="docs-notifications__title-group">
          <h1 class="docs-notifications__title">Notifications</h1>
          <p class="docs-notifications__desc">
            Stay updated with new followers and published stories.
          </p>
        </div>

        @if (notifications().length > 0 && hasUnread()) {
          <button
            type="button"
            class="docs-button docs-button--secondary docs-button--sm"
            (click)="markAllRead()"
          >
            Mark all as read
          </button>
        }
      </div>

      <!-- Notification List -->
      @if (loading()) {
        <div class="docs-notifications__list">
          @for (i of [1, 2, 3]; track i) {
            <div class="docs-skeleton--card">
              <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
              <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
            </div>
          }
        </div>
      } @else if (notifications().length === 0) {
        <div class="docs-empty-state">
          <div class="docs-empty-state__icon-box">
            🔔
          </div>
          <h2 class="docs-empty-state__title">No notifications yet</h2>
          <p class="docs-empty-state__desc">
            When authors you follow publish new stories or readers follow you, alerts will appear here.
          </p>
          <div class="docs-empty-state__actions">
            <a routerLink="/" class="docs-button docs-button--primary docs-button--sm">
              Explore Stories
            </a>
          </div>
        </div>
      } @else {
        <div class="docs-notifications__list">
          @for (n of notifications(); track n.id) {
            <div
              class="docs-notifications__item"
              [class.docs-notifications__item--unread]="!n.read"
              (click)="onNotificationClick(n)"
            >
              <div class="docs-notifications__item-body">
                <div class="docs-notifications__item-meta">
                  @if (!n.read) {
                    <span class="docs-notifications__dot"></span>
                  }
                  <span class="docs-notifications__item-title">{{ n.title }}</span>
                  <span>•</span>
                  <time class="docs-notifications__item-time">{{ formatDate(n.createdAt) }}</time>
                </div>
                <p class="docs-notifications__item-text">
                  {{ n.message }}
                </p>
              </div>

              @if (!n.read) {
                <button
                  type="button"
                  class="docs-notifications__item-action"
                  (click)="markOneRead($event, n.id)"
                >
                  Mark read
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DocsNotificationsComponent implements OnInit {
  private readonly docService = inject(DocService);
  private readonly router = inject(Router);

  readonly notifications = signal<DocNotificationItem[]>([]);
  readonly loading = signal<boolean>(true);
  readonly hasUnread = signal<boolean>(false);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.docService.listNotifications(0, 30).subscribe({
      next: (page) => {
        const list = page.content || [];
        this.notifications.set(list);
        this.hasUnread.set(list.some(n => !n.read));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  markOneRead(event: Event, id: string): void {
    event.stopPropagation();
    this.docService.markNotificationRead(id).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
        this.hasUnread.set(this.notifications().some(n => !n.read));
      }
    });
  }

  markAllRead(): void {
    this.docService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.hasUnread.set(false);
      }
    });
  }

  onNotificationClick(n: DocNotificationItem): void {
    if (!n.read) {
      this.docService.markNotificationRead(n.id).subscribe();
    }
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
