// packages/tool-shell/src/components/primitive/ts-tool-canvas.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ts-tool-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ts-tool-canvas-root"
      [class.full-bleed]="layout() === 'fullBleed'"
      [class.max-width-boxed]="layout() !== 'fullBleed'"
    >
      <!-- Optional Tool Toolbar Slot -->
      <div class="ts-tool-canvas-toolbar">
        <ng-content select="[toolbar]" />
      </div>

      <!-- Main Tool Surface -->
      <div class="ts-tool-canvas-content">
        <ng-content />
      </div>

      <!-- Optional Tool Status Bar Slot -->
      <div class="ts-tool-canvas-statusbar">
        <ng-content select="[statusbar]" />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-tool-canvas-root {
      width: 100%;
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-lg, 16px);
      box-shadow: var(--ts-shadow-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 480px;
    }

    .ts-tool-canvas-root.full-bleed {
      border-radius: 0;
      border: none;
      box-shadow: none;
      background: transparent;
    }

    .ts-tool-canvas-toolbar:empty,
    .ts-tool-canvas-statusbar:empty {
      display: none;
    }

    .ts-tool-canvas-toolbar {
      padding: var(--ts-space-3, 12px) var(--ts-space-4, 16px);
      border-bottom: 1px solid var(--ts-border);
      background: var(--ts-surface);
    }

    .ts-tool-canvas-content {
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    .ts-tool-canvas-statusbar {
      padding: var(--ts-space-2, 8px) var(--ts-space-4, 16px);
      border-top: 1px solid var(--ts-border);
      background: var(--ts-raised);
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-muted);
    }
  `]
})
export class TsToolCanvasComponent {
  readonly layout = input<'standard' | 'fullBleed'>('standard');
}
