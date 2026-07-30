import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { NotificationService } from '../../../core/services/notification.service';

interface AlertItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'security';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-workspace-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="notifications-root page-enter">
      <header class="header-row mb-8">
        <div>
          <h1 class="page-title">Workspace Notifications</h1>
          <p class="page-subtitle">Alerts and updates regarding your local execution sandbox and settings.</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="markAllAsRead()">Mark All Read</button>
      </header>

      <div class="notifications-stack">
        @for (item of items(); track item.id) {
          <div class="notification-card" [class.unread]="!item.read">
            <div class="alert-icon-wrap" [ngClass]="item.type">
              <app-icon [name]="iconName(item.type)" class="size-5" />
            </div>
            <div class="alert-details">
              <h3 class="alert-title">{{ item.title }}</h3>
              <p class="alert-body">{{ item.body }}</p>
              <span class="alert-time">{{ item.time }}</span>
            </div>
            <div class="alert-actions">
              @if (!item.read) {
                <button class="icon-btn" (click)="toggleRead(item)" aria-label="Mark as read">
                  <app-icon name="check" class="size-4" />
                </button>
              }
              <button class="icon-btn" (click)="deleteAlert(item)" aria-label="Delete notification">
                <app-icon name="x" class="size-4 text-neutral-500" />
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state p-12 text-center glass">
            <app-icon name="bell-off" class="size-8 text-neutral-500 mb-2" />
            <h3 class="empty-title">All caught up!</h3>
            <p class="empty-desc">You have no unread notifications.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notifications-root { min-height: 100vh; }
    .header-row { display: flex; align-items: center; justify-content: space-between; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .notifications-stack { display: flex; flex-direction: column; gap: 1rem; max-width: 800px; margin: 0 auto; }
    .notification-card { display: flex; gap: 1.25rem; padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); transition: background 0.3s; position: relative; }
    
    .notification-card.unread { border-left: 3px solid var(--color-brand-indigo); }
    .alert-icon-wrap { width: 38px; height: 38px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    
    .alert-icon-wrap.info { background: rgba(99,102,241,0.08); color: var(--color-brand-indigo); }
    .alert-icon-wrap.success { background: rgba(16,185,129,0.08); color: var(--color-feedback-success); }
    .alert-icon-wrap.warning { background: rgba(245,158,11,0.08); color: var(--color-feedback-warning); }
    .alert-icon-wrap.security { background: rgba(239,68,68,0.08); color: var(--color-feedback-error); }

    .alert-details { flex: 1; display: flex; flex-direction: column; }
    .alert-title { font-size: 0.95rem; font-weight: 700; color: var(--color-neutral-100); }
    .alert-body { font-size: 0.8rem; color: var(--color-neutral-400); margin-top: 0.2rem; line-height: 1.5; }
    .alert-time { font-size: 0.72rem; color: var(--color-neutral-500); margin-top: 0.35rem; }

    .alert-actions { display: flex; align-items: center; gap: 0.5rem; }
    
    .empty-state { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); max-width: 400px; margin: 0 auto; }
    .empty-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); }
    .empty-desc { font-size: 0.85rem; color: var(--color-neutral-500); margin-top: 0.25rem; }

    .mb-2 { margin-bottom: 0.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .text-center { text-align: center; }
  `],
})
export class WorkspaceNotificationsComponent implements OnInit {
  private readonly notifSvc = inject(NotificationService);

  readonly items = signal<AlertItem[]>([
    { id: '1', type: 'info', title: 'JSON Formatter Updated', body: 'Added regex search support inside structural output panes.', time: '1 hour ago', read: false },
    { id: '2', type: 'security', title: 'Workspace Logged In', body: 'New workspace session initialized on Safari macOS.', time: '3 hours ago', read: false },
    { id: '3', type: 'success', title: 'Backup Synchronized', body: 'All favorites folders backed up to cloud workspace.', time: '1 day ago', read: true }
  ]);

  ngOnInit(): void {
    this.notifSvc.getNotifications(0, 20).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          const mapped: AlertItem[] = page.content.map(n => ({
            id: n.id,
            type: (n.type as any) || 'info',
            title: n.title,
            body: n.message,
            time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'recently',
            read: n.isRead
          }));
          this.items.set(mapped);
        }
      },
      error: () => {}
    });
  }

  iconName(type: string): string {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-triangle';
      case 'security': return 'shield-alert';
      default: return 'info';
    }
  }

  toggleRead(item: AlertItem): void {
    this.notifSvc.markAsRead(item.id).subscribe({
      next: () => {
        this.items.update(list => list.map(a => a.id === item.id ? { ...a, read: true } : a));
      },
      error: () => {
        this.items.update(list => list.map(a => a.id === item.id ? { ...a, read: true } : a));
      }
    });
  }

  deleteAlert(item: AlertItem): void {
    this.items.update(list => list.filter(a => a.id !== item.id));
  }

  markAllAsRead(): void {
    this.notifSvc.markAllAsRead().subscribe({
      next: () => {
        this.items.update(list => list.map(a => ({ ...a, read: true })));
      },
      error: () => {
        this.items.update(list => list.map(a => ({ ...a, read: true })));
      }
    });
  }
}
