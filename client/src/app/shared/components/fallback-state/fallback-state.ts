// src/app/shared/components/fallback-state/fallback-state.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';

export type FallbackType =
  | 'EMPTY'
  | 'NO_RESULTS'
  | 'ERROR'
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
    <div class="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md relative overflow-hidden my-6">
      <!-- Ambient Orb Glow -->
      <div class="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-violet-600/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-12 -right-12 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

      <!-- Icon Container -->
      <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-5 shadow-inner">
        @switch (type) {
          @case ('EMPTY') { <app-icon name="folder-open" size="32"></app-icon> }
          @case ('NO_RESULTS') { <app-icon name="search" size="32"></app-icon> }
          @case ('ERROR') { <app-icon name="alert-triangle" size="32" class="text-rose-400"></app-icon> }
          @case ('OFFLINE') { <app-icon name="wifi-off" size="32" class="text-amber-400"></app-icon> }
          @case ('UNAUTHORIZED') { <app-icon name="lock" size="32" class="text-violet-400"></app-icon> }
          @case ('FORBIDDEN') { <app-icon name="shield-off" size="32" class="text-rose-400"></app-icon> }
          @case ('NOT_FOUND') { <app-icon name="help-circle" size="32" class="text-slate-400"></app-icon> }
          @case ('SERVER_ERROR') { <app-icon name="server" size="32" class="text-rose-500"></app-icon> }
          @case ('RATE_LIMIT') { <app-icon name="clock" size="32" class="text-amber-400"></app-icon> }
          @case ('MAINTENANCE') { <app-icon name="wrench" size="32" class="text-sky-400"></app-icon> }
          @case ('AI_UNAVAILABLE') { <app-icon name="cpu" size="32" class="text-purple-400"></app-icon> }
          @case ('GITHUB_SYNC_FAILED') { <app-icon name="github" size="32" class="text-rose-400"></app-icon> }
          @case ('REPO_NOT_FOUND') { <app-icon name="git-branch" size="32" class="text-amber-400"></app-icon> }
          @case ('WEBHOOK_FAILURE') { <app-icon name="zap-off" size="32" class="text-rose-400"></app-icon> }
          @case ('EMBEDDING_PENDING') { <app-icon name="loader" size="32" class="text-cyan-400 animate-spin"></app-icon> }
          @case ('SEARCH_INDEX_BUILDING') { <app-icon name="database" size="32" class="text-indigo-400 animate-pulse"></app-icon> }
        }
      </div>

      <!-- Content -->
      <h3 class="text-xl font-semibold text-white mb-2">{{ title || getDefaultTitle() }}</h3>
      <p class="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{{ message || getDefaultMessage() }}</p>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center justify-center gap-3">
        @if (showRetry) {
          <button (click)="onRetry.emit()" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 transition-all">
            <app-icon name="refresh-cw" size="16"></app-icon>
            {{ retryText }}
          </button>
        }

        @if (primaryActionLink) {
          <a [routerLink]="primaryActionLink" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 transition-all">
            {{ primaryActionText }}
          </a>
        }

        @if (secondaryActionLink) {
          <a [routerLink]="secondaryActionLink" class="btn btn-secondary px-5 py-2.5 text-sm font-medium rounded-xl text-slate-300 hover:text-white transition-all">
            {{ secondaryActionText }}
          </a>
        }
      </div>
    </div>
  `
})
export class FallbackStateComponent {
  @Input() type: FallbackType = 'EMPTY';
  @Input() title?: string;
  @Input() message?: string;
  @Input() showRetry = false;
  @Input() retryText = 'Try Again';
  @Input() primaryActionText = 'Browse Solutions';
  @Input() primaryActionLink?: string;
  @Input() secondaryActionText = 'Go to Home';
  @Input() secondaryActionLink?: string;

  @Output() onRetry = new EventEmitter<void>();

  getDefaultTitle(): string {
    switch (this.type) {
      case 'EMPTY': return 'No Data Found';
      case 'NO_RESULTS': return 'No Matching Tools Found';
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
      case 'EMPTY': return 'There are currently no items available in this section.';
      case 'NO_RESULTS': return 'We could not find any tools matching your search query or selected filters. Try broadening your keywords.';
      case 'ERROR': return 'An unexpected error occurred while communicating with the server. Please try again.';
      case 'OFFLINE': return 'Please check your network connection. Data will automatically sync once you are back online.';
      case 'UNAUTHORIZED': return 'Please sign in to your Acklet account to view and manage your personalized workspace.';
      case 'FORBIDDEN': return 'You do not have permission to view or edit this resource. Contact administrator if you believe this is an error.';
      case 'NOT_FOUND': return 'The page, tool, or resource you are looking for could not be located.';
      case 'SERVER_ERROR': return 'Our backend servers encountered an internal error. Engineers have been notified.';
      case 'RATE_LIMIT': return 'You have sent too many requests in a short period. Please wait a moment before trying again.';
      case 'MAINTENANCE': return 'Our background AI services are currently updating. Please check back in a few minutes.';
      case 'AI_UNAVAILABLE': return 'Both primary (Mistral) and fallback (Gemini) AI inference providers are currently unreachable.';
      case 'GITHUB_SYNC_FAILED': return 'Failed to pull latest repository updates, commits, or releases from GitHub API.';
      case 'REPO_NOT_FOUND': return 'The specified GitHub repository could not be accessed. Check repository permissions and URL.';
      case 'WEBHOOK_FAILURE': return 'HMAC verification or payload parsing failed for incoming GitHub webhook event.';
      case 'EMBEDDING_PENDING': return 'Tool metadata is queued for vector embedding generation. Semantic search will update shortly.';
      case 'SEARCH_INDEX_BUILDING': return 'Initializing pgvector index and full-text search dictionaries.';
    }
  }
}
