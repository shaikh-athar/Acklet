// packages/tool-shell/src/components/primitive/ts-scroll-area.component.ts
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-scroll-area',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-scroll-area-viewport" #viewport>
      <div class="ts-scroll-area-content">
        <ng-content />
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
    .ts-scroll-area-viewport {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      scroll-behavior: smooth;
    }
    .ts-scroll-area-content {
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class TsScrollAreaComponent {
  @ViewChild('viewport') viewport?: ElementRef<HTMLElement>;
}
