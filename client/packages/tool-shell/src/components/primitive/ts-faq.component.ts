// packages/tool-shell/src/components/primitive/ts-faq.component.ts
import { Component, input, signal, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolFaq } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-faq',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="ts-faq-root">
      <h3 class="ts-faq-heading">{{ title() }}</h3>

      <div class="ts-faq-list" role="region" aria-label="Frequently Asked Questions">
        @for (item of visibleFaqs(); track item.id; let i = $index) {
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
              (keydown)="onKeydown($event, i)"
            >
              <span class="ts-faq-question">{{ item.question }}</span>
              <span class="ts-faq-icon-wrap" [class.rotated]="isOpen(item.id)" aria-hidden="true">
                <ts-icon name="plus" [size]="16" />
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

      @if (hasMoreFaqs()) {
        <div class="ts-faq-discover-row">
          <button 
            type="button" 
            class="ts-faq-discover-btn"
            (click)="toggleDiscoverMore()"
            [attr.aria-expanded]="isDiscoverExpanded()"
          >
            <span>{{ isDiscoverExpanded() ? 'Show less' : 'Discover more questions' }}</span>
            <ts-icon [name]="isDiscoverExpanded() ? 'chevron-up' : 'chevron-down'" [size]="14" />
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
      gap: var(--ts-space-3, 12px);
    }

    .ts-faq-heading {
      font-size: var(--ts-text-lg, 20px);
      font-weight: 500;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
      margin-bottom: var(--ts-space-2, 8px);
    }

    .ts-faq-list {
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--ts-border);
    }

    .ts-faq-item {
      border-bottom: 1px solid var(--ts-border);
      transition: background-color var(--ts-dur-base) var(--ts-ease);
    }

    .ts-faq-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 56px;
      padding: var(--ts-space-3, 12px) 0;
      background: transparent;
      border: none;
      color: var(--ts-text);
      font-size: var(--ts-text-md, 16px);
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      outline: none;
      gap: var(--ts-space-4, 16px);
      transition: color var(--ts-dur-base) var(--ts-ease);
    }

    .ts-faq-trigger:hover {
      color: var(--ts-accent);
    }

    .ts-faq-question {
      flex: 1;
      line-height: 1.4;
      letter-spacing: var(--ts-tracking-tight);
    }

    .ts-faq-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-full);
      background: var(--ts-raised);
      color: var(--ts-text-muted);
      flex-shrink: 0;
      transition: transform var(--ts-dur-base) var(--ts-ease),
                  background-color var(--ts-dur-base) var(--ts-ease),
                  color var(--ts-dur-base) var(--ts-ease);
    }

    .ts-faq-icon-wrap.rotated {
      transform: rotate(45deg);
      background: var(--ts-accent);
      color: var(--ts-accent-contrast);
    }

    /* Zero-CLS CSS Grid Row Transition */
    .ts-faq-panel-grid {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows var(--ts-dur-base) var(--ts-ease);
      overflow: hidden;
    }

    .ts-faq-item.is-open .ts-faq-panel-grid {
      grid-template-rows: 1fr;
    }

    .ts-faq-panel-content {
      min-height: 0;
      overflow: hidden;
    }

    .ts-faq-answer {
      font-size: var(--ts-text-base, 14px);
      color: var(--ts-text-muted);
      line-height: 1.6;
      max-width: 70ch;
      padding-bottom: var(--ts-space-4, 16px);
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity var(--ts-dur-base) var(--ts-ease) 100ms,
                  transform var(--ts-dur-base) var(--ts-ease) 100ms;
    }

    .ts-faq-item.is-open .ts-faq-answer {
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
      transition: var(--ts-transition-all);
    }

    .ts-faq-discover-btn:hover {
      background: var(--ts-raised-hover);
      color: var(--ts-text);
      border-color: var(--ts-border-hover);
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-faq-panel-grid,
      .ts-faq-icon-wrap,
      .ts-faq-answer {
        transition: none !important;
      }
    }
  `]
})
export class TsFaqComponent {
  readonly faqs = input<ToolFaq[]>([]);
  readonly title = input<string>('Common questions');
  readonly multiple = input<boolean>(false);
  readonly initialOpenIndex = input<number | null>(0);

  readonly openIds = signal<Set<string>>(new Set());
  readonly isDiscoverExpanded = signal<boolean>(false);

  constructor() {
    // Open initial FAQ item if configured
    setTimeout(() => {
      const list = this.faqs();
      const initIdx = this.initialOpenIndex();
      if (initIdx !== null && list && list[initIdx]) {
        this.openIds.set(new Set([list[initIdx].id]));
      }
    }, 0);
  }

  readonly visibleFaqs = computed(() => {
    const list = this.faqs() || [];
    if (this.isDiscoverExpanded() || list.length <= 4) {
      return list;
    }
    return list.slice(0, 4);
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
    const visible = this.visibleFaqs();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % visible.length;
      document.getElementById(`faq-${visible[next].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + visible.length) % visible.length;
      document.getElementById(`faq-${visible[prev].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      document.getElementById(`faq-${visible[0].id}`)?.querySelector('button')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      document.getElementById(`faq-${visible[visible.length - 1].id}`)?.querySelector('button')?.focus();
    }
  }
}
