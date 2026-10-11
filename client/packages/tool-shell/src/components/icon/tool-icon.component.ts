// packages/tool-shell/src/components/icon/tool-icon.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from './ts-icon.component';

/**
 * Backward compatibility alias for lib-tool-icon, routing directly through ts-icon.
 */
@Component({
  selector: 'lib-tool-icon',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <ts-icon 
      [name]="name()" 
      [size]="computedSize()" 
      [tone]="'inherit'" 
      [animateOn]="'hover'" 
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
    `,
  ],
})
export class ToolIconComponent {
  readonly name = input.required<string>();
  readonly class = input<string>('size-5');
  readonly strokeWidth = input<number>(2);

  readonly computedSize = computed<number>(() => {
    const cls = this.class() || '';
    if (cls.includes('size-3.5')) return 14;
    if (cls.includes('size-3')) return 12;
    if (cls.includes('size-4')) return 16;
    if (cls.includes('size-5')) return 20;
    if (cls.includes('size-6')) return 24;
    if (cls.includes('size-8')) return 32;
    return 16;
  });
}
