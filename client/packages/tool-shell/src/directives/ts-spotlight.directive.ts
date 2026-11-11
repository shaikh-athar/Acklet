// packages/tool-shell/src/directives/ts-spotlight.directive.ts
import { Directive, input, booleanAttribute } from '@angular/core';

/**
 * @deprecated Spotlight and cursor glow effects have been removed per shell design specifications.
 */
@Directive({
  selector: '[tsSpotlight], [appSpotlight]',
  standalone: true
})
export class TsSpotlightDirective {
  readonly disabled = input<boolean, unknown>(false, { transform: booleanAttribute });
}
