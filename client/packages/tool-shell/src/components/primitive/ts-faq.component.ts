import { Component, input, signal, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolFaq } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsRevealDirective } from '../../directives/ts-reveal.directive';

@Component({
  selector: 'ts-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent, TsRevealDirective],
  template: `
    <div class="ts-faq-root">
      <h3 class="ts-faq-heading" appReveal [revealDelay]="0">{{ title() }}</h3>

      <div class="ts-faq-list" role="region" aria-label="Frequently Asked Questions">
        <!-- Primary FAQ Items -->
        @for (item of primaryFaqs(); track item.id; let i = $index) {
          <div 
            appReveal 
            [revealVariant]="'scale'"
            [revealDelay]="i * 75"
            class="ts-faq-item" 
            [class.is-open]="isOpen(item.id)"
            [id]="'faq-' + item.id"
          >
            <button
              type="button"
              class="ts-faq-trigger"
              [attr.aria-expanded]="isOpen(item.id)"
              [attr.aria-controls]="'faq-panel-' + item.id"
              (click)="toggleFaq(item.id)"
              (keydown)="onKeydown($event, i)"
            >
              <span class="ts-faq-question">{{ item.question }}</span>
              <span class="ts-faq-icon-wrap" aria-hidden="true">
                @if (isOpen(item.id)) {
                  <svg class="ts-faq-sign-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                } @else {
                  <svg class="ts-faq-sign-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                }
              </span>
            </button>

            <div 
              class="ts-faq-panel-grid" 
              [id]="'faq-panel-' + item.id"
              role="region"
              [attr.aria-labelledby]="'faq-' + item.id"
            >
              <div class="ts-faq-panel-content">
                <p class="ts-faq-answer">{{ item.answer }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Additional FAQ Items with Smooth Accordion Drawer Animation -->
        @if (extraFaqs().length > 0) {
          <div 
            class="ts-faq-extra-drawer" 
            [class.is-expanded]="isDiscoverExpanded()"
            role="region"
            aria-label="Additional Questions"
          >
            <div class="ts-faq-extra-content">
              @for (item of extraFaqs(); track item.id; let i = $index) {
                <div 
                  class="ts-faq-item" 
                  [class.is-open]="isOpen(item.id)"
                  [id]="'faq-' + item.id"
                >
                  <button
                    type="button"
                    class="ts-faq-trigger"
                    [attr.aria-expanded]="isOpen(item.id)"
                    [attr.aria-controls]="'faq-panel-' + item.id"
                    (click)="toggleFaq(item.id)"
                    (keydown)="onKeydown($event, i + 4)"
                  >
                    <span class="ts-faq-question">{{ item.question }}</span>
                    <span class="ts-faq-icon-wrap" aria-hidden="true">
                      @if (isOpen(item.id)) {
                        <svg class="ts-faq-sign-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      } @else {
                        <svg class="ts-faq-sign-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      }
                    </span>
                  </button>

                  <div 
                    class="ts-faq-panel-grid" 
                    [id]="'faq-panel-' + item.id"
                    role="region"
                    [attr.aria-labelledby]="'faq-' + item.id"
                  >
                    <div class="ts-faq-panel-content">
                      <p class="ts-faq-answer">{{ item.answer }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      @if (hasMoreFaqs()) {
        <div class="ts-faq-discover-row">
          <button 
            type="button" 
            class="ts-faq-discover-btn"
            (click)="toggleDiscoverMore()"
            [attr.aria-expanded]="isDiscoverExpanded()"
          >
            <span>{{ isDiscoverExpanded() ? 'Show less' : 'Discover more questions' }}</span>
            <ts-icon 
              name="chevron-down" 
              [size]="14" 
              class="ts-faq-chevron-icon"
              [class.is-expanded]="isDiscoverExpanded()"
            />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ts-faq-root {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ts-faq-heading {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: var(--ts-type-section-title-size, 18px);
      line-height: var(--ts-type-section-title-lh, 26px);
      font-weight: var(--ts-type-section-title-weight, 650);
      letter-spacing: var(--ts-type-title-tracking, -0.01em);
      color: var(--text, #18181B);
      margin-bottom: 4px;
    }

    :host-context([data-theme="dark"]) .ts-faq-heading {
      color: var(--text, #FCFCFC);
    }

    .ts-faq-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ts-faq-item {
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-inner, 16px);
      box-shadow: var(--ts-surface-raised-shadow);
      padding: 0;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      transition: opacity 0.65s cubic-bezier(.22, .61, .36, 1),
                  transform 0.65s cubic-bezier(.22, .61, .36, 1),
                  background-color 150ms ease,
                  border-color 200ms ease,
                  box-shadow 200ms ease;
      transition-delay: var(--reveal-delay, 0ms);
    }

    :host-context([data-theme="dark"]) .ts-faq-item {
      background: var(--ts-surface-raised, #18181B);
      border-color: var(--ts-surface-raised-border, #27272A);
    }

    .ts-faq-item:hover {
      border-color: var(--accent-border, rgba(45, 212, 191, 0.35));
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.06);
    }

    .ts-faq-item.is-open {
      border-color: var(--accent-border, rgba(45, 212, 191, 0.45));
    }

    /* Card-level focus ring instead of inner button rectangle */
    .ts-faq-item:focus-within {
      outline: 2px solid var(--accent, #0F766E) !important;
      outline-offset: 2px;
    }

    .ts-faq-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 52px;
      padding: 16px 20px;
      background: transparent;
      border: none;
      color: var(--text, #18181B);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: var(--ts-type-body-size, 14.5px);
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      outline: none;
      gap: 16px;
      transition: color 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-faq-trigger {
      color: var(--text, #FCFCFC);
    }

    .ts-faq-trigger:focus-visible {
      outline: none !important;
    }

    .ts-faq-question {
      flex: 1;
      line-height: 1.4;
      letter-spacing: -0.01em;
    }

    .ts-faq-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717A);
      flex-shrink: 0;
      transition: background-color 0.25s ease,
                  color 0.25s ease,
                  border-color 0.25s ease,
                  transform 0.25s cubic-bezier(.22, .61, .36, 1);
    }

    :host-context([data-theme="dark"]) .ts-faq-icon-wrap {
      background: #27272A;
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--text, #FCFCFC);
    }

    /* Active open pill: scale pop without rotation so minus remains perfectly horizontal */
    .ts-faq-item.is-open .ts-faq-icon-wrap {
      background: var(--accent, #0F766E);
      color: var(--accent-ink, #FFFFFF);
      border-color: transparent;
      transform: scale(1.04);
    }

    :host-context([data-theme="dark"]) .ts-faq-item.is-open .ts-faq-icon-wrap {
      background: var(--accent, #2DD4BF);
      color: var(--accent-ink, #042F2B);
    }

    .ts-faq-sign-svg {
      width: 14px;
      height: 14px;
      display: block;
    }

    /* Smooth 0.4s Accordion Grid Transition */
    .ts-faq-panel-grid {
      display: grid;
      grid-template-rows: 0fr;
      overflow: hidden;
      visibility: hidden;
      opacity: 0;
      transition: grid-template-rows 0.4s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)),
                  visibility 0.4s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)),
                  opacity 0.4s ease;
    }

    .ts-faq-item.is-open .ts-faq-panel-grid {
      grid-template-rows: 1fr;
      visibility: visible;
      opacity: 1;
    }

    /* Zero vertical padding when closed to completely eliminate unnecessary space */
    .ts-faq-panel-content {
      min-height: 0;
      overflow: hidden;
      padding: 0 20px 0 20px;
      transition: padding-bottom 0.6s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1));
    }

    .ts-faq-item.is-open .ts-faq-panel-content {
      padding-bottom: 18px;
    }

    .ts-faq-answer {
      font-size: var(--ts-type-body-size, 14.5px);
      color: var(--ts-text-muted);
      line-height: 1.6;
      max-width: 70ch;
      margin: 0;
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity 0.5s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)) 0.1s,
                  transform 0.5s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)) 0.1s;
    }

    .ts-faq-item.is-open .ts-faq-answer {
      opacity: 1;
      transform: translateY(0);
    }

    /* Discover More Extra Drawer Smooth Expansion */
    .ts-faq-extra-drawer {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.7s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1));
      overflow: hidden;
    }

    .ts-faq-extra-drawer.is-expanded {
      grid-template-rows: 1fr;
    }

    .ts-faq-extra-content {
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 10px;
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.5s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)) 0.15s,
                  transform 0.5s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1)) 0.15s;
    }

    .ts-faq-extra-drawer.is-expanded .ts-faq-extra-content {
      opacity: 1;
      transform: translateY(0);
    }

    .ts-faq-discover-row {
      display: flex;
      justify-content: center;
      margin-top: var(--ts-space-3, 12px);
    }

    .ts-faq-discover-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      font-size: var(--ts-text-sm, 13px);
      font-weight: 500;
      color: var(--ts-text-muted);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-full);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-faq-discover-btn:hover {
      background: var(--ts-raised-hover);
      color: var(--ts-text);
      border-color: var(--ts-border-hover);
    }

    .ts-faq-chevron-icon {
      transition: transform 0.4s var(--ts-ease-premium, cubic-bezier(.22,.61,.36,1));
    }

    .ts-faq-chevron-icon.is-expanded {
      transform: rotate(180deg);
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-faq-panel-grid,
      .ts-faq-extra-drawer,
      .ts-faq-extra-content,
      .ts-faq-icon-wrap,
      .ts-faq-answer,
      .ts-faq-chevron-icon {
        transition: none !important;
      }
    }
  `]
})
export class TsFaqComponent {
  readonly faqs = input<ToolFaq[]>([]);
  readonly title = input<string>('Common questions');
  readonly multiple = input<boolean>(false);
  readonly initialOpenIndex = input<number | null>(null);

  readonly openIds = signal<Set<string>>(new Set());
  readonly isDiscoverExpanded = signal<boolean>(false);

  constructor() {
    // Open initial FAQ item if explicitly configured
    setTimeout(() => {
      const list = this.faqs();
      const initIdx = this.initialOpenIndex();
      if (initIdx !== null && initIdx !== undefined && list && list[initIdx]) {
        this.openIds.set(new Set([list[initIdx].id]));
      }
    }, 0);
  }

  readonly primaryFaqs = computed(() => {
    return (this.faqs() || []).slice(0, 4);
  });

  readonly extraFaqs = computed(() => {
    return (this.faqs() || []).slice(4);
  });

  readonly hasMoreFaqs = computed(() => {
    return (this.faqs() || []).length > 4;
  });

  isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  toggleFaq(id: string): void {
    const current = new Set(this.openIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      if (!this.multiple()) {
        current.clear();
      }
      current.add(id);
    }
    this.openIds.set(current);
  }

  toggleDiscoverMore(): void {
    this.isDiscoverExpanded.update(v => !v);
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    const all = this.faqs() || [];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % all.length;
      document.getElementById(`faq-${all[next].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + all.length) % all.length;
      document.getElementById(`faq-${all[prev].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      document.getElementById(`faq-${all[0].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      document.getElementById(`faq-${all[all.length - 1].id}`)?.querySelector('button')?.focus();
    }
  }
}
