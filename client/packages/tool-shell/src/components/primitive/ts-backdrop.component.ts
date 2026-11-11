import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  inject,
  NgZone,
  OnInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToolThemeService } from '../../services/tool-theme.service';

@Component({
  selector: 'ts-backdrop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'page-bg',
    '[attr.data-background]': 'themeService.currentBackground()',
    '[attr.data-theme]': 'themeService.effectiveTheme()'
  },
  template: `
    <div
      class="ts-bg"
      aria-hidden="true"
      [style.--ts-tool-hue]="accentHueStyle()"
    >
      <!-- Grid pattern: hidden by default (opacity: 0), fades in on background hover only -->
      <div #bgGrid class="ts-bg-grid" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: -1;
      contain: strict;
      overflow: hidden;
      background-color: var(--ts-page-bg, var(--surface-page, #F8FAFC));
      transition: background-color 200ms ease;
    }

    :host([data-theme="dark"]),
    :host-context([data-theme="dark"]),
    [data-theme="dark"] :host {
      background-color: var(--ts-page-bg, var(--surface-page, #090D16));
    }

    /* ── Main .ts-bg container ─────────────────────────────────── */
    .ts-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      transform: translateZ(0);
      transition: opacity 250ms ease, background 250ms ease;
      /* Default fallback: Soft Mesh */
      background:
        radial-gradient(circle 700px at 15% 10%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 14%, transparent) 0%, transparent 70%),
        radial-gradient(circle 800px at 85% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 11%, transparent) 0%, transparent 70%),
        radial-gradient(circle 550px at 50% 45%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 6%, transparent) 0%, transparent 75%);
    }

    :host([data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"]) .ts-bg,
    [data-theme="dark"] .ts-bg {
      background:
        radial-gradient(circle 700px at 15% 10%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 14%, transparent) 0%, transparent 70%),
        radial-gradient(circle 800px at 85% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 10%, transparent) 0%, transparent 70%),
        radial-gradient(circle 550px at 50% 45%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 5%, transparent) 0%, transparent 75%);
    }

    /* ── Background Variant 1: Soft Mesh (Default) ───────────── */
    :host([data-background="soft-mesh"]) .ts-bg,
    :host-context([data-background="soft-mesh"]) .ts-bg,
    [data-background="soft-mesh"] .ts-bg,
    [data-background="soft-mesh"] :host .ts-bg {
      background:
        radial-gradient(circle 700px at 15% 10%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 14%, transparent) 0%, transparent 70%),
        radial-gradient(circle 800px at 85% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 11%, transparent) 0%, transparent 70%),
        radial-gradient(circle 550px at 50% 45%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 6%, transparent) 0%, transparent 75%);
    }

    :host([data-background="soft-mesh"][data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"][data-background="soft-mesh"]) .ts-bg,
    :host-context([data-theme="dark"]) [data-background="soft-mesh"] .ts-bg,
    [data-theme="dark"][data-background="soft-mesh"] .ts-bg,
    [data-theme="dark"] [data-background="soft-mesh"] .ts-bg {
      background:
        radial-gradient(circle 700px at 15% 10%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 14%, transparent) 0%, transparent 70%),
        radial-gradient(circle 800px at 85% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 10%, transparent) 0%, transparent 70%),
        radial-gradient(circle 550px at 50% 45%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 5%, transparent) 0%, transparent 75%);
    }

    /* ── Background Variant 2: Top Wash ──────────────────────── */
    :host([data-background="top-wash"]) .ts-bg,
    :host-context([data-background="top-wash"]) .ts-bg,
    [data-background="top-wash"] .ts-bg,
    [data-background="top-wash"] :host .ts-bg {
      background: linear-gradient(180deg, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 16%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 5%, transparent) 35%, transparent 65%);
    }

    :host([data-background="top-wash"][data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"][data-background="top-wash"]) .ts-bg,
    :host-context([data-theme="dark"]) [data-background="top-wash"] .ts-bg,
    [data-theme="dark"][data-background="top-wash"] .ts-bg,
    [data-theme="dark"] [data-background="top-wash"] .ts-bg {
      background: linear-gradient(180deg, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 15%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 4%, transparent) 35%, transparent 65%);
    }

    /* ── Background Variant 3: Ambient Orb ────────────────────── */
    :host([data-background="ambient-orb"]) .ts-bg,
    :host-context([data-background="ambient-orb"]) .ts-bg,
    [data-background="ambient-orb"] .ts-bg,
    [data-background="ambient-orb"] :host .ts-bg {
      background:
        radial-gradient(ellipse 900px 600px at 50% 25%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 15%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 6%, transparent) 45%, transparent 75%),
        radial-gradient(circle 500px at 80% 80%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent) 0%, transparent 65%);
    }

    :host([data-background="ambient-orb"][data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"][data-background="ambient-orb"]) .ts-bg,
    :host-context([data-theme="dark"]) [data-background="ambient-orb"] .ts-bg,
    [data-theme="dark"][data-background="ambient-orb"] .ts-bg,
    [data-theme="dark"] [data-background="ambient-orb"] .ts-bg {
      background:
        radial-gradient(ellipse 900px 600px at 50% 25%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 15%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 5%, transparent) 45%, transparent 75%),
        radial-gradient(circle 500px at 80% 80%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 7%, transparent) 0%, transparent 65%);
    }

    /* ── Background Variant 4: Diagonal Stream ────────────────── */
    :host([data-background="diagonal-stream"]) .ts-bg,
    :host-context([data-background="diagonal-stream"]) .ts-bg,
    [data-background="diagonal-stream"] .ts-bg,
    [data-background="diagonal-stream"] :host .ts-bg {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 15%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 5%, transparent) 45%, transparent 75%),
        radial-gradient(circle 600px at 90% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 10%, transparent) 0%, transparent 65%);
    }

    :host([data-background="diagonal-stream"][data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"][data-background="diagonal-stream"]) .ts-bg,
    :host-context([data-theme="dark"]) [data-background="diagonal-stream"] .ts-bg,
    [data-theme="dark"][data-background="diagonal-stream"] .ts-bg,
    [data-theme="dark"] [data-background="diagonal-stream"] .ts-bg {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 14%, transparent) 0%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 4%, transparent) 45%, transparent 75%),
        radial-gradient(circle 600px at 90% 85%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 9%, transparent) 0%, transparent 65%);
    }

    /* ── Background Variant 5: Dual Spotlight ─────────────────── */
    :host([data-background="dual-spotlight"]) .ts-bg,
    :host-context([data-background="dual-spotlight"]) .ts-bg,
    [data-background="dual-spotlight"] .ts-bg,
    [data-background="dual-spotlight"] :host .ts-bg {
      background:
        radial-gradient(circle 700px at 10% 90%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 14%, transparent) 0%, transparent 65%),
        radial-gradient(circle 700px at 90% 90%, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 12%, transparent) 0%, transparent 65%),
        linear-gradient(180deg, color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent) 0%, transparent 40%);
    }

    :host([data-background="dual-spotlight"][data-theme="dark"]) .ts-bg,
    :host-context([data-theme="dark"][data-background="dual-spotlight"]) .ts-bg,
    :host-context([data-theme="dark"]) [data-background="dual-spotlight"] .ts-bg,
    [data-theme="dark"][data-background="dual-spotlight"] .ts-bg,
    [data-theme="dark"] [data-background="dual-spotlight"] .ts-bg {
      background:
        radial-gradient(circle 700px at 10% 90%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 13%, transparent) 0%, transparent 65%),
        radial-gradient(circle 700px at 90% 90%, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 11%, transparent) 0%, transparent 65%),
        linear-gradient(180deg, color-mix(in srgb, var(--tool-accent, var(--accent, #60A5FA)) 7%, transparent) 0%, transparent 40%);
    }

    /* ── Pointer-based Grid overlay: reveals around cursor on hover (no glowing blob) ─── */
    .ts-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 250ms ease;
      background-size: 24px 24px;
      background-position: 0 0;
      -webkit-mask-image: radial-gradient(circle 380px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
              mask-image: radial-gradient(circle 380px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), #000 0%, rgba(0, 0, 0, 0.45) 55%, transparent 100%);
      background-image:
        linear-gradient(to right,  rgba(6, 7, 10, 0.13) 1.3px, transparent 1px),
        linear-gradient(to bottom, rgba(9, 10, 12, 0.13) 1.3px, transparent 1px);
    }

    :host-context([data-theme="dark"]) .ts-bg-grid,
    [data-theme="dark"] .ts-bg-grid {
      background-image:
        linear-gradient(to right,  rgba(255, 255, 255, 0.13) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.13) 1px, transparent 1px);
    }

    .ts-bg-grid.is-active {
      opacity: 1;
    }

    @media (hover: none) {
      .ts-bg-grid {
        display: none !important;
        opacity: 0 !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-bg-grid {
        transition: none !important;
      }
    }

    @media print, (forced-colors: active) {
      :host,
      .ts-bg,
      .ts-bg-grid {
        display: none !important;
      }
    }

    @media (prefers-contrast: more) {
      .ts-bg {
        background: none !important;
      }
      .ts-bg-grid {
        opacity: 0.2;
      }
    }
  `]
})
export class TsBackdropComponent implements OnInit, OnDestroy {
  readonly accentHue = input<number | null>(null);
  readonly bgGridRef = viewChild<ElementRef<HTMLElement>>('bgGrid');
  readonly themeService = inject(ToolThemeService);

  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private cleanupFns: Array<() => void> = [];

  readonly accentHueStyle = computed(() => {
    const hue = this.accentHue();
    return hue !== null && hue !== undefined ? `${hue}deg` : 'initial';
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof window === 'undefined') return;

    // Only enable grid-hover on pointer/hover capable devices
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.zone.runOutsideAngular(() => {
      const gridEl = this.bgGridRef()?.nativeElement;
      if (!gridEl) return;

      let rafId: number | null = null;
      let lastX = -1000;
      let lastY = -1000;

      const updatePosition = (): void => {
        gridEl.style.setProperty('--mouse-x', `${lastX}px`);
        gridEl.style.setProperty('--mouse-y', `${lastY}px`);
        rafId = null;
      };

      const onPointerMove = (e: PointerEvent): void => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (!gridEl.classList.contains('is-active')) {
          gridEl.classList.add('is-active');
        }
        if (rafId === null) {
          rafId = requestAnimationFrame(updatePosition);
        }
      };

      const onLeave = (): void => {
        if (gridEl.classList.contains('is-active')) {
          gridEl.classList.remove('is-active');
        }
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onLeave);

      this.cleanupFns.push(
        () => document.removeEventListener('pointermove', onPointerMove),
        () => document.removeEventListener('mouseleave', onLeave),
        () => window.removeEventListener('blur', onLeave),
        () => {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      );
    });
  }

  ngOnDestroy(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }
}
