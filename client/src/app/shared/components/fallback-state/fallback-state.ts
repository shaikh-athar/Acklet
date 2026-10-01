// src/app/shared/components/fallback-state/fallback-state.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';

export type FallbackType =
  | 'EMPTY'
  | 'NO_RESULTS'
  | 'ERROR'
  | 'UNAVAILABLE'
  | 'SUCCESS'
  | 'LOADING'
  | 'FIRST_USE'
  | 'OFFLINE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'RATE_LIMIT'
  | 'MAINTENANCE'
  | 'AI_UNAVAILABLE'
  | 'GITHUB_SYNC_FAILED'
  | 'REPO_NOT_FOUND'
  | 'WEBHOOK_FAILURE'
  | 'EMBEDDING_PENDING'
  | 'SEARCH_INDEX_BUILDING';

@Component({
  selector: 'app-fallback-state',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div
      class="fallback-container"
      [class.compact]="size === 'compact'"
      [class.large]="size === 'large'"
    >
      <!-- Icon / Visual Container -->
      <div class="fallback-icon-box">
        @switch (type) {
          @case ('FIRST_USE') { <app-icon name="file-code" class="icon-lg text-emerald-400"></app-icon> }
          @case ('EMPTY') { <app-icon name="folder" class="icon-lg text-slate-400"></app-icon> }
          @case ('NO_RESULTS') { <app-icon name="search-x" class="icon-lg text-amber-400"></app-icon> }
          @case ('UNAVAILABLE') { <app-icon name="table" class="icon-lg text-slate-400 opacity-60"></app-icon> }
          @case ('ERROR') { <app-icon name="shield-alert" class="icon-lg text-rose-500"></app-icon> }
          @case ('SUCCESS') { <app-icon name="check-check" class="icon-lg text-emerald-400"></app-icon> }
          @case ('LOADING') { <app-icon name="clock" class="icon-lg text-cyan-400 animate-spin"></app-icon> }
          @case ('OFFLINE') { <app-icon name="wifi-off" class="icon-lg text-amber-400"></app-icon> }
          @case ('UNAUTHORIZED') { <app-icon name="lock" class="icon-lg text-violet-400"></app-icon> }
          @case ('FORBIDDEN') { <app-icon name="shield-off" class="icon-lg text-rose-400"></app-icon> }
          @case ('NOT_FOUND') { <app-icon name="help-circle" class="icon-lg text-slate-400"></app-icon> }
          @case ('SERVER_ERROR') { <app-icon name="server" class="icon-lg text-rose-500"></app-icon> }
          @case ('RATE_LIMIT') { <app-icon name="clock" class="icon-lg text-amber-400"></app-icon> }
          @case ('MAINTENANCE') { <app-icon name="wrench" class="icon-lg text-sky-400"></app-icon> }
          @case ('AI_UNAVAILABLE') { <app-icon name="cpu" class="icon-lg text-purple-400"></app-icon> }
          @case ('GITHUB_SYNC_FAILED') { <app-icon name="github" class="icon-lg text-rose-400"></app-icon> }
          @case ('REPO_NOT_FOUND') { <app-icon name="git-branch" class="icon-lg text-amber-400"></app-icon> }
          @case ('WEBHOOK_FAILURE') { <app-icon name="zap" class="icon-lg text-rose-400"></app-icon> }
          @case ('EMBEDDING_PENDING') { <app-icon name="clock" class="icon-lg text-cyan-400 animate-spin"></app-icon> }
          @case ('SEARCH_INDEX_BUILDING') { <app-icon name="database" class="icon-lg text-indigo-400 animate-pulse"></app-icon> }
        }
      </div>

      <!-- Header Content -->
      <h3 class="fallback-title">{{ title || getDefaultTitle() }}</h3>
      @if (message || getDefaultMessage()) {
        <p class="fallback-message">{{ message || getDefaultMessage() }}</p>
      }

      <!-- Sample Pills (First-Use / Quick Action) -->
      @if (samplePills && samplePills.length > 0) {
        <div class="sample-pills-row">
          @for (pill of samplePills; track pill.id || pill.label || pill) {
            <button class="sample-pill-btn" (click)="onSamplePillClick.emit(pill.id || pill.value || pill)">
              {{ pill.label || pill }}
            </button>
          }
        </div>
      }

      <!-- Action Buttons -->
      @if (showRetry || primaryActionLink || secondaryActionLink || primaryActionText) {
        <div class="fallback-actions-row">
          @if (showRetry) {
            <button (click)="onRetry.emit()" class="fallback-btn primary">
              <app-icon name="refresh-cw" class="icon-xs inline-block mr-1"></app-icon>
              {{ retryText }}
            </button>
          }

          @if (primaryActionLink) {
            <a [routerLink]="primaryActionLink" class="fallback-btn primary">
              {{ primaryActionText }}
            </a>
          } @else if (primaryActionText && !showRetry && (!samplePills || samplePills.length === 0)) {
            <button (click)="onPrimaryAction.emit()" class="fallback-btn primary">
              {{ primaryActionText }}
            </button>
          }

          @if (secondaryActionLink) {
            <a [routerLink]="secondaryActionLink" class="fallback-btn secondary">
              {{ secondaryActionText }}
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .fallback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      text-align: center;
      border-radius: 12px;
      background: var(--jl-surface-secondary, rgba(23, 27, 33, 0.6));
      border: 1px solid var(--jl-border-dark, rgba(255, 255, 255, 0.08));
      color: var(--jl-text-main, #E8EAED);
      position: relative;
      overflow: hidden;
      margin: 1rem 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .fallback-container.compact {
      padding: 1.5rem 1rem;
      margin: 0.5rem 0;
      border-radius: 8px;
    }

    .fallback-container.large {
      padding: 4rem 2rem;
    }

    .fallback-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--jl-border-dark, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.85rem;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .compact .fallback-icon-box {
      width: 38px;
      height: 38px;
      margin-bottom: 0.6rem;
      border-radius: 8px;
    }

    .fallback-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 0.35rem 0;
      color: var(--jl-text-main, #FFFFFF);
      letter-spacing: -0.01em;
    }

    .compact .fallback-title {
      font-size: 0.85rem;
      margin-bottom: 0.2rem;
    }

    .fallback-message {
      font-size: 0.78rem;
      color: var(--jl-text-secondary, #8B949E);
      max-width: 420px;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .compact .fallback-message {
      font-size: 0.72rem;
      margin-bottom: 0.6rem;
      max-width: 320px;
    }

    .sample-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
      justify-content: center;
      margin-top: 0.4rem;
    }

    .sample-pill-btn {
      background: var(--jl-surface-primary, #111419);
      border: 1px solid var(--jl-border-dark, #252B33);
      color: var(--jl-text-main, #E8EAED);
      padding: 0.25rem 0.65rem;
      font-size: 0.72rem;
      font-weight: 500;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sample-pill-btn:hover {
      border-color: var(--jl-accent, #2FA084);
      color: var(--jl-accent, #2FA084);
      background: var(--jl-surface-secondary);
    }

    .fallback-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
      margin-top: 0.5rem;
    }

    .fallback-btn {
      padding: 0.35rem 0.8rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .fallback-btn.primary {
      background: var(--jl-accent, #2FA084);
      color: #FFFFFF;
    }

    .fallback-btn.primary:hover {
      background: var(--jl-accent-hover, #1F6F5F);
    }

    .fallback-btn.secondary {
      background: var(--jl-surface-primary, #111419);
      border-color: var(--jl-border-dark, #252B33);
      color: var(--jl-text-secondary, #8B949E);
    }

    .fallback-btn.secondary:hover {
      color: var(--jl-text-main, #FFFFFF);
      border-color: var(--jl-text-secondary);
    }

    .icon-lg {
      width: 24px;
      height: 24px;
    }

    .compact .icon-lg {
      width: 20px;
      height: 20px;
    }

    .icon-xs {
      width: 12px;
      height: 12px;
    }

    @media (prefers-reduced-motion: reduce) {
      .animate-spin, .animate-pulse {
        animation: none !important;
      }
    }
  `]
})
export class FallbackStateComponent {
  @Input() type: FallbackType = 'EMPTY';
  @Input() size: 'compact' | 'default' | 'large' = 'default';
  @Input() title?: string;
  @Input() message?: string;
  @Input() samplePills?: any[];
  @Input() showRetry = false;
  @Input() retryText = 'Try Again';
  @Input() primaryActionText = 'Browse';
  @Input() primaryActionLink?: string;
  @Input() secondaryActionText = 'Home';
  @Input() secondaryActionLink?: string;

  @Output() onRetry = new EventEmitter<void>();
  @Output() onPrimaryAction = new EventEmitter<void>();
  @Output() onSamplePillClick = new EventEmitter<any>();

  getDefaultTitle(): string {
    switch (this.type) {
      case 'FIRST_USE': return 'Drop JSON here, paste payload, or load a sample';
      case 'EMPTY': return 'No Data Found';
      case 'NO_RESULTS': return 'No Matching Results Found';
      case 'UNAVAILABLE': return 'View Unavailable for Data';
      case 'SUCCESS': return 'Operation Completed';
      case 'LOADING': return 'Processing Payload...';
      case 'ERROR': return 'Something Went Wrong';
      case 'OFFLINE': return 'You are Offline';
      case 'UNAUTHORIZED': return 'Authentication Required';
      case 'FORBIDDEN': return 'Access Restricted';
      case 'NOT_FOUND': return 'Resource Not Found';
      case 'SERVER_ERROR': return 'Internal Server Error';
      case 'RATE_LIMIT': return 'Rate Limit Exceeded';
      case 'MAINTENANCE': return 'Service Under Maintenance';
      case 'AI_UNAVAILABLE': return 'AI Provider Temporarily Unavailable';
      case 'GITHUB_SYNC_FAILED': return 'GitHub Synchronization Failed';
      case 'REPO_NOT_FOUND': return 'GitHub Repository Not Found';
      case 'WEBHOOK_FAILURE': return 'Webhook Processing Failed';
      case 'EMBEDDING_PENDING': return 'Generating Vector Embeddings...';
      case 'SEARCH_INDEX_BUILDING': return 'Building Hybrid Search Index...';
    }
  }

  getDefaultMessage(): string {
    switch (this.type) {
      case 'FIRST_USE': return 'Paste raw JSON into the editor or select a sample payload to start inspecting.';
      case 'EMPTY': return 'There are currently no items available in this section.';
      case 'NO_RESULTS': return 'We could not find any keys or values matching your query. Try another search term.';
      case 'UNAVAILABLE': return 'This data structure cannot be displayed in the current view. Try another tab.';
      case 'SUCCESS': return 'Your operation completed successfully.';
      case 'LOADING': return 'Processing payload asynchronously without blocking the UI thread.';
      case 'ERROR': return 'An unexpected error occurred. Please verify your input and try again.';
      case 'OFFLINE': return 'Please check your network connection. Data will automatically sync once online.';
      case 'UNAUTHORIZED': return 'Please sign in to your Acklet account to view this resource.';
      case 'FORBIDDEN': return 'You do not have permission to view or edit this resource.';
      case 'NOT_FOUND': return 'The page, tool, or resource you are looking for could not be located.';
      case 'SERVER_ERROR': return 'Our backend servers encountered an internal error.';
      case 'RATE_LIMIT': return 'You have sent too many requests. Please wait a moment before trying again.';
      case 'MAINTENANCE': return 'Services are currently updating. Please check back in a few minutes.';
      case 'AI_UNAVAILABLE': return 'AI inference providers are currently unreachable.';
      case 'GITHUB_SYNC_FAILED': return 'Failed to pull latest repository updates from GitHub API.';
      case 'REPO_NOT_FOUND': return 'The specified GitHub repository could not be accessed.';
      case 'WEBHOOK_FAILURE': return 'Payload parsing failed for incoming event.';
      case 'EMBEDDING_PENDING': return 'Metadata is queued for vector embedding generation.';
      case 'SEARCH_INDEX_BUILDING': return 'Initializing search index dictionaries.';
    }
  }
}
