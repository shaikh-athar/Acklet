// apps/tool-image-compressor/src/components/rotating-heading/rotating-heading.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeroLine, HERO_LINES } from '../../config/hero-lines.config';

export interface LineSegments {
  before: string;
  highlight?: string;
  after: string;
}

@Component({
  selector: 'app-rotating-heading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1
      class="rotating-heading-root"
      tabindex="0"
      aria-live="polite"
      [attr.aria-label]="currentLine().text"
    >
      <!-- Invisible in-flow sizer reserving consistent height for the longest line -->
      <span class="heading-sizer" aria-hidden="true">
        {{ longestLineText() }}
      </span>

      <!-- Exiting Line -->
      @if (previousIndex() !== null && !isReducedMotion()) {
        <span class="heading-layer is-exiting" aria-hidden="true">
          <span class="heading-text-content">{{ prevSegments().before }}<span class="heading-accent">{{ prevSegments().highlight }}</span>{{ prevSegments().after }}</span>
        </span>
      }

      <!-- Current Active Line -->
      <span
        class="heading-layer"
        [class.is-entering]="previousIndex() !== null && !isReducedMotion()"
      >
        <span class="heading-text-content">{{ currentSegments().before }}<span class="heading-accent">{{ currentSegments().highlight }}</span>{{ currentSegments().after }}</span>
      </span>
    </h1>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .rotating-heading-root {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      text-align: center;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.2;
      color: #0F172A;
      min-height: 1.25em;
      overflow: hidden;
      cursor: default;
      outline: none;
    }

    .rotating-heading-root:focus-visible {
      border-radius: 8px;
      outline: 2px solid var(--accent, #2563EB);
      outline-offset: 4px;
    }

    :host-context([data-theme="dark"]) .rotating-heading-root,
    [data-theme="dark"] .rotating-heading-root {
      color: #F8FAFC;
    }

    .heading-sizer {
      visibility: hidden;
      pointer-events: none;
      user-select: none;
      line-height: inherit;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      padding: 0 4px;
    }

    .heading-layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      text-align: center;
      line-height: inherit;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      padding: 0 4px;
      will-change: transform, opacity, filter;
    }

    .heading-text-content {
      white-space: pre-wrap;
      display: inline;
    }

    .heading-layer.is-entering {
      animation: headingSoftSlideIn 950ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    .heading-layer.is-exiting {
      animation: headingSoftSlideOut 950ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    .heading-accent {
      color: var(--accent, #2563EB);
      padding: 0 2px;
      display: inline;
    }

    :host-context([data-theme="dark"]) .heading-accent,
    [data-theme="dark"] .heading-accent {
      color: var(--accent, #3B82F6);
    }

    @keyframes headingSoftSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
        filter: blur(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    @keyframes headingSoftSlideOut {
      from {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
        filter: blur(6px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .heading-layer {
        animation: none !important;
        transform: none !important;
        filter: none !important;
        opacity: 1 !important;
      }
    }

    @media (max-width: 640px) {
      .rotating-heading-root {
        font-size: 26px;
        line-height: 1.25;
        min-height: 2.5em;
        max-width: 320px;
      }
    }
  `]
})
export class RotatingHeadingComponent implements OnInit, OnDestroy {
  readonly lines = input<HeroLine[]>(HERO_LINES);
  readonly interval = input<number>(5000);
  readonly paused = input<boolean>(false);

  readonly linesList = computed<HeroLine[]>(() => {
    const l = this.lines();
    return l && l.length > 0 ? l : HERO_LINES;
  });

  readonly longestLineText = computed<string>(() => {
    const list = this.linesList();
    return list.reduce((longest, curr) => (curr.text.length > longest.length ? curr.text : longest), list[0].text);
  });

  readonly currentIndex = signal<number>(0);
  readonly previousIndex = signal<number | null>(null);
  readonly isReducedMotion = signal<boolean>(false);
  readonly isInteractionPaused = signal<boolean>(false);

  private readonly platformId = inject(PLATFORM_ID);
  private timerId: any = null;
  private animTimerId: any = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isInteractionPaused.set(true);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isInteractionPaused.set(false);
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.isInteractionPaused.set(true);
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.isInteractionPaused.set(false);
  }

  readonly currentLine = computed<HeroLine>(() => {
    const list = this.linesList();
    return list[this.currentIndex()] || list[0];
  });

  readonly currentSegments = computed<LineSegments>(() => {
    return this.parseSegments(this.currentLine());
  });

  readonly prevSegments = computed<LineSegments>(() => {
    const prev = this.previousIndex();
    if (prev === null) return { before: '', after: '' };
    const list = this.linesList();
    return this.parseSegments(list[prev] || list[0]);
  });

  private parseSegments(line: HeroLine): LineSegments {
    if (!line.highlight || !line.text.includes(line.highlight)) {
      return { before: line.text, after: '' };
    }
    const idx = line.text.indexOf(line.highlight);
    let before = line.text.slice(0, idx);
    let after = line.text.slice(idx + line.highlight.length);

    if (before.endsWith(' ')) {
      before = before.slice(0, -1) + '\u00A0';
    }
    if (after.startsWith(' ')) {
      after = '\u00A0' + after.slice(1);
    }

    return {
      before,
      highlight: line.highlight,
      after
    };
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      let isReduced = false;
      try {
        if (typeof window.matchMedia === 'function') {
          isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
      } catch (_) {}
      this.isReducedMotion.set(isReduced);
      if (!isReduced) {
        this.startCycle();
      }
    }
  }

  private startCycle(): void {
    this.stopCycle();
    const intervalMs = this.interval() || 3000;
    this.timerId = setInterval(() => {
      if (this.paused() || this.isInteractionPaused()) return;

      const list = this.linesList();
      if (!list || list.length <= 1) return;

      const prev = this.currentIndex();
      const next = (prev + 1) % list.length;

      this.previousIndex.set(prev);
      this.currentIndex.set(next);

      if (this.animTimerId) clearTimeout(this.animTimerId);
      this.animTimerId = setTimeout(() => {
        this.previousIndex.set(null);
      }, 980);
    }, intervalMs);
  }

  private stopCycle(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.animTimerId) {
      clearTimeout(this.animTimerId);
      this.animTimerId = null;
    }
  }

  ngOnDestroy(): void {
    this.stopCycle();
  }
}

