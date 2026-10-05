import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  input,
  signal,
  computed,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-virtual-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="virtual-viewport" #viewport (scroll)="onScroll($event)">
      <!-- Phantom spacer representing total scrollable height -->
      <div class="virtual-phantom" [style.height.px]="totalHeight()"></div>
      
      <!-- Offset container holding only the visible windowed items -->
      <div class="virtual-window" [style.transform]="'translateY(' + offsetY() + 'px)'">
        @for (item of visibleItems(); track trackByFn(item)) {
          <div class="virtual-item" [style.height.px]="itemHeight()">
            <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item }" />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    }
    .virtual-viewport {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      -webkit-overflow-scrolling: touch;
    }
    .virtual-phantom {
      width: 100%;
      pointer-events: none;
      visibility: hidden;
    }
    .virtual-window {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      will-change: transform;
      display: flex;
      flex-direction: column;
    }
    .virtual-item {
      width: 100%;
      box-sizing: border-box;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualListComponent<T> implements AfterViewInit, OnDestroy {
  @ViewChild('viewport') viewport!: ElementRef<HTMLElement>;

  items = input.required<T[]>();
  itemHeight = input<number>(72);
  buffer = input<number>(4);
  itemTemplate: any;

  trackBy = input<(item: T) => any>((item: any) => item?.id || item);

  scrollTop = signal<number>(0);
  viewportHeight = signal<number>(500);

  totalHeight = computed(() => this.items().length * this.itemHeight());

  startIndex = computed(() => {
    const raw = Math.floor(this.scrollTop() / this.itemHeight());
    return Math.max(0, raw - this.buffer());
  });

  endIndex = computed(() => {
    const visibleCount = Math.ceil(this.viewportHeight() / this.itemHeight());
    const raw = this.startIndex() + visibleCount + this.buffer() * 2;
    return Math.min(this.items().length, raw);
  });

  visibleItems = computed(() => {
    return this.items().slice(this.startIndex(), this.endIndex());
  });

  offsetY = computed(() => {
    return this.startIndex() * this.itemHeight();
  });

  private resizeObserver?: ResizeObserver;

  ngAfterViewInit() {
    if (typeof ResizeObserver !== 'undefined' && this.viewport) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.viewportHeight.set(entry.contentRect.height || 500);
        }
      });
      this.resizeObserver.observe(this.viewport.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  onScroll(e: Event) {
    const target = e.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
  }

  trackByFn(item: T) {
    return this.trackBy()(item);
  }
}
