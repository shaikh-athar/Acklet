// client/apps/tool-docs/src/app/components/docs-tooltip/docs-tooltip.component.ts

import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'docs-tooltip',
  standalone: true,
  template: `
    <span class="docs-tooltip" role="tooltip" aria-hidden="true">
      <span class="docs-tooltip__text">{{ text() }}</span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsTooltipComponent {
  readonly text = input.required<string>();
}
