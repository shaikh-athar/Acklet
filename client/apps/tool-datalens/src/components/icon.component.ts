import { Component, input, computed, inject, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-icon [name]="name()" [size]="effectiveSize()" />
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      flex-shrink: 0;
      vertical-align: middle;
      color: inherit;
    }
    :host ::ng-deep ts-icon,
    :host ::ng-deep .ts-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    :host ::ng-deep svg {
      display: block;
      flex-shrink: 0;
    }
  `]
})
export class IconComponent {
  private readonly el = inject(ElementRef);
  readonly name = input.required<string>();
  readonly sizeInput = input<number | undefined>(undefined, { alias: 'size' });

  readonly effectiveSize = computed(() => {
    const explicit = this.sizeInput();
    if (explicit !== undefined) return explicit;
    const cl = this.el.nativeElement.classList;
    if (cl.contains('icon-xs')) return 14;
    if (cl.contains('icon-sm')) return 16;
    if (cl.contains('icon-md')) return 18;
    if (cl.contains('icon-lg')) return 22;
    return 14;
  });
}
