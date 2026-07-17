import { Injectable, signal, computed } from '@angular/core';
import { ViewportState } from './viewport-state';

export interface RegisteredViewport {
  id: string;
  element: HTMLElement;
  state: ViewportState;
}

@Injectable({
  providedIn: 'root'
})
export class ViewportRegistryService {
  private readonly registries = signal<RegisteredViewport[]>([]);

  readonly allViewports = computed(() => this.registries());
  readonly activeViewports = computed(() => this.registries().filter(v => v.state === 'active'));
  readonly activeCount = computed(() => this.activeViewports().length);

  register(id: string, element: HTMLElement, initialState: ViewportState): void {
    this.registries.update((prev) => {
      if (prev.some(v => v.id === id)) return prev;
      return [...prev, { id, element, state: initialState }];
    });
  }

  updateState(id: string, nextState: ViewportState): void {
    this.registries.update((prev) => {
      return prev.map(v => v.id === id ? { ...v, state: nextState } : v);
    });
  }

  unregister(id: string): void {
    this.registries.update((prev) => prev.filter(v => v.id !== id));
  }
}
