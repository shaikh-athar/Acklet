// src/app/shared/components/fallback-state/fallback-state.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';

export type FallbackType = 'EMPTY' | 'NO_RESULTS' | 'ERROR' | 'OFFLINE' | 'UNAUTHORIZED' | 'MAINTENANCE';

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
          @case ('MAINTENANCE') { <app-icon name="wrench" size="32" class="text-sky-400"></app-icon> }
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
      case 'MAINTENANCE': return 'Service Under Maintenance';
    }
  }

  getDefaultMessage(): string {
    switch (this.type) {
      case 'EMPTY': return 'There are currently no items available in this section.';
      case 'NO_RESULTS': return 'We could not find any tools matching your search query or selected filters. Try broadening your keywords.';
      case 'ERROR': return 'An unexpected error occurred while communicating with the server. Please try again.';
      case 'OFFLINE': return 'Please check your network connection. Data will automatically sync once you are back online.';
      case 'UNAUTHORIZED': return 'Please sign in to your Acklet account to view and manage your personalized workspace.';
      case 'MAINTENANCE': return 'Our background AI services are currently updating. Please check back in a few minutes.';
    }
  }
}
