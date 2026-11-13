// apps/tool-image-compressor/src/components/rotating-word/rotating-word.component.ts
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

@Component({
  selector: 'app-rotating-word',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="rotating-word-host" aria-live="off">
      <!-- Invisible in-flow text sizer reserving exact width of widest word -->
      <span class="word-sizer" aria-hidden="true">{{ widestWord() }}</span>

      <!-- Previous word softly fading out, blurring and drifting slightly up -->
      @if (previousIndex() !== null && !isReducedMotion()) {
        <span class="word-layer is-exiting" aria-hidden="true">
          {{ wordsList()[previousIndex()!] }}
        </span>
      }

      <!-- Current word softly fading in, coming from blur and drifting into position -->
      <span
        class="word-layer"
        [class.is-entering]="previousIndex() !== null && !isReducedMotion()"
      >
        {{ wordsList()[currentIndex()] }}
      </span>
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      vertical-align: baseline;
      line-height: inherit;
    }

    .rotating-word-host {
      display: inline-flex;
      position: relative;
      vertical-align: baseline;
      overflow: hidden;
      line-height: inherit;
      color: inherit;
      font-weight: 800;
    }

    .word-sizer {
      visibility: hidden;
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
      line-height: inherit;
      font-weight: inherit;
    }

    .word-layer {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      line-height: inherit;
      font-weight: inherit;
      will-change: transform, opacity, filter;
    }

    .word-layer.is-entering {
      animation: wordSoftFadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .word-layer.is-exiting {
      animation: wordSoftFadeOut 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes wordSoftFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
        filter: blur(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    @keyframes wordSoftFadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
      to {
        opacity: 0;
        transform: translateY(-6px);
        filter: blur(4px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .word-layer {
        animation: none !important;
        transform: none !important;
        filter: none !important;
        opacity: 1 !important;
      }
    }
  `]
})
export class RotatingWordComponent implements OnInit, OnDestroy {
  readonly words = input<string[]>([
    'for your website',
    'for email',
    'for faster loading',
    'for social media',
    'under 200 KB'
  ]);
  readonly interval = input<number>(2400);
  readonly paused = input<boolean>(false);

  readonly wordsList = computed<string[]>(() => {
    const w = this.words();
    return w && w.length > 0
      ? w
      : [
          'for your website',
          'for email',
          'for faster loading',
          'for social media',
          'under 200 KB'
        ];
  });

  readonly widestWord = computed<string>(() => {
    const list = this.wordsList();
    return list.reduce((longest, current) => (current.length > longest.length ? current : longest), list[0]);
  });

  readonly currentIndex = signal<number>(0);
  readonly previousIndex = signal<number | null>(null);
  readonly isReducedMotion = signal<boolean>(false);
  readonly isHostHovered = signal<boolean>(false);

  private readonly platformId = inject(PLATFORM_ID);
  private timerId: any = null;
  private animTimerId: any = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHostHovered.set(true);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHostHovered.set(false);
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.isHostHovered.set(true);
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.isHostHovered.set(false);
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
    const intervalMs = this.interval() || 2400;
    this.timerId = setInterval(() => {
      if (this.paused() || this.isHostHovered()) return;

      const list = this.wordsList();
      if (!list || list.length <= 1) return;

      const prev = this.currentIndex();
      const next = (prev + 1) % list.length;

      this.previousIndex.set(prev);
      this.currentIndex.set(next);

      if (this.animTimerId) clearTimeout(this.animTimerId);
      this.animTimerId = setTimeout(() => {
        this.previousIndex.set(null);
      }, 650);
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

