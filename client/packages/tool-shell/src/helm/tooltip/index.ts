import { Directive, ElementRef, HostListener, input, OnDestroy, inject } from '@angular/core';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';

@Directive({
  selector: '[hlmTooltip]',
  standalone: true,
  host: {
    'data-slot': 'tooltip-trigger',
  },
})
export class HlmTooltipDirective implements OnDestroy {
  readonly hlmTooltip = input<string>('');
  readonly tooltipPosition = input<'top' | 'bottom' | 'left' | 'right'>('top');

  private readonly el = inject(ElementRef);
  private tooltipEl: HTMLDivElement | null = null;

  @HostListener('mouseenter')
  @HostListener('focusin')
  show(): void {
    const text = this.hlmTooltip();
    if (!text || typeof document === 'undefined') return;

    this.hide();

    const div = document.createElement('div');
    div.className = 'ts-tooltip-bubble';
    div.textContent = text;
    div.setAttribute('role', 'tooltip');
    document.body.appendChild(div);
    this.tooltipEl = div;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = div.getBoundingClientRect();

    let top = 0;
    let left = 0;
    const pos = this.tooltipPosition();

    if (pos === 'top') {
      top = hostRect.top - tooltipRect.height - 6;
      left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
    } else if (pos === 'bottom') {
      top = hostRect.bottom + 6;
      left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
    } else if (pos === 'left') {
      top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
      left = hostRect.left - tooltipRect.width - 6;
    } else {
      top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
      left = hostRect.right + 6;
    }

    div.style.top = `${Math.max(6, top)}px`;
    div.style.left = `${Math.max(6, left)}px`;
    div.style.opacity = '1';
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  hide(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}

export const HlmTooltipImports = [HlmTooltipDirective] as const;
