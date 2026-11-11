// packages/tool-shell/src/components/primitive/ts-spotlight.directive.ts
import { Directive } from '@angular/core';

/**
 * @deprecated Spotlight and cursor glow effects have been removed per shell design specifications.
 */
@Directive({
  selector: '[tsSpotlight]',
  standalone: true
})
export class TsSpotlightDirective {}
