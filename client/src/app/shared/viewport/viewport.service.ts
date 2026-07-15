import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { ViewportState } from './viewport-state';
import { VIEWPORT_CONFIG } from './viewport.tokens';

@Injectable()
export class ViewportService {
  private readonly config = inject(VIEWPORT_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private observer: IntersectionObserver | null = null;
  
  readonly state = signal<ViewportState>('sleeping');

  observe(element: HTMLElement, callback: (state: ViewportState) => void): void {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const entry = entries[0];
        const nextState = this.calculateState(entry);
        
        if (nextState !== this.state()) {
          this.state.set(nextState);
          callback(nextState);
        }
      },
      {
        threshold: this.config.thresholds,
        rootMargin: this.config.rootMargin
      }
    );

    this.observer.observe(element);

    this.destroyRef.onDestroy(() => {
      this.disconnect();
    });
  }

  private calculateState(entry: IntersectionObserverEntry): ViewportState {
    const ratio = entry.intersectionRatio;
    const isIntersecting = entry.isIntersecting;
    const current = this.state();

    if (!isIntersecting || ratio === 0) {
      return 'sleeping';
    }

    if (ratio >= 0.60) {
      return 'active';
    }
    
    if (ratio >= 0.30) {
      if (current === 'active' || current === 'leaving') {
        return 'leaving';
      }
      return 'entering';
    }
    
    if (ratio >= 0.15) {
      if (current === 'entering' || current === 'leaving' || current === 'active' || current === 'paused') {
        return 'paused';
      }
      return 'preparing';
    }

    return 'sleeping';
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
