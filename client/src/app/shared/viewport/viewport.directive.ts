import { Directive, ElementRef, Output, EventEmitter, input, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { ViewportService } from './viewport.service';
import { ViewportRegistryService } from './viewport-registry.service';
import { ViewportState } from './viewport-state';

let uniqueIdCounter = 0;

@Directive({
  selector: '[appViewport]',
  standalone: true,
  providers: [ViewportService]
})
export class ViewportDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly viewportSvc = inject(ViewportService);
  private readonly registry = inject(ViewportRegistryService);

  readonly id = input<string>(`viewport-${uniqueIdCounter++}`);

  @Output() readonly prepare = new EventEmitter<void>();
  @Output() readonly enter = new EventEmitter<void>();
  @Output() readonly active = new EventEmitter<void>();
  @Output() readonly leave = new EventEmitter<void>();
  @Output() readonly pause = new EventEmitter<void>();
  @Output() readonly sleep = new EventEmitter<void>();

  readonly viewportState = this.viewportSvc.state;

  ngAfterViewInit(): void {
    const hostEl = this.el.nativeElement as HTMLElement;
    
    // Promote layers on GPU to avoid paint jank during viewport motion
    hostEl.style.willChange = 'transform, opacity';
    hostEl.style.transformStyle = 'preserve-3d';
    hostEl.style.backfaceVisibility = 'hidden';

    // Register inside global registry
    this.registry.register(this.id(), hostEl, 'sleeping');

    this.viewportSvc.observe(hostEl, (state) => {
      this.registry.updateState(this.id(), state);
      this.emitLifecycleEvent(state);
    });
  }

  private hasPrepared = false;
  private hasEntered = false;

  private emitLifecycleEvent(state: ViewportState): void {
    if (state === 'sleeping') {
      this.hasPrepared = false;
      this.hasEntered = false;
      this.sleep.emit();
      return;
    }

    if (state === 'paused') {
      this.pause.emit();
      return;
    }

    if (state === 'preparing') {
      if (!this.hasPrepared) {
        this.prepare.emit();
        this.hasPrepared = true;
      }
      return;
    }

    if (state === 'entering') {
      if (!this.hasPrepared) {
        this.prepare.emit();
        this.hasPrepared = true;
      }
      if (!this.hasEntered) {
        this.enter.emit();
        this.hasEntered = true;
      }
      return;
    }

    if (state === 'active') {
      if (!this.hasPrepared) {
        this.prepare.emit();
        this.hasPrepared = true;
      }
      if (!this.hasEntered) {
        this.enter.emit();
        this.hasEntered = true;
      }
      this.active.emit();
      return;
    }

    if (state === 'leaving') {
      this.leave.emit();
      return;
    }
  }

  ngOnDestroy(): void {
    this.registry.unregister(this.id());
    this.viewportSvc.disconnect();
  }
}
