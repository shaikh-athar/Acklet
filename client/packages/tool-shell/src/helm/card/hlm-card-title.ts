import { Directive } from '@angular/core';
import { classes } from '@acklet/tool-shell/helm/utils';

@Directive({
	selector: '[hlmCardTitle]',
	host: { 'data-slot': 'card-title' },
})
export class HlmCardTitle {
	constructor() {
		classes(() => 'spartan-card-title font-semibold leading-none tracking-tight');
	}
}
