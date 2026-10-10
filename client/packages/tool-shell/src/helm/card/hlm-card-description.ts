import { Directive } from '@angular/core';
import { classes } from '@acklet/tool-shell/helm/utils';

@Directive({
	selector: '[hlmCardDescription]',
	host: { 'data-slot': 'card-description' },
})
export class HlmCardDescription {
	constructor() {
		classes(() => 'spartan-card-description text-sm text-muted-foreground');
	}
}
