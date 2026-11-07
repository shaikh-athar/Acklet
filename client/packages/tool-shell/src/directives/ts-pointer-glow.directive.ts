// packages/tool-shell/src/directives/ts-pointer-glow.directive.ts
import { Directive } from '@angular/core';

/**
 * @deprecated Cursor glow has been removed per shell design specifications.
 */
@Directive({
  selector: '[tsPointerGlow]',
  standalone: true
})
export class TsPointerGlowDirective {}
