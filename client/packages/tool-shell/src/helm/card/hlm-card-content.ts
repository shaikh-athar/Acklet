import { Directive } from '@angular/core';
import { classes } from '@acklet/tool-shell/helm/utils';

@Directive({
	selector: '[hlmCardContent],hlm-card-content',
	host: { 'data-slot': 'card-content' },
})
export class HlmCardContent {
	constructor() {
		classes(() => 'spartan-card-content');
	}
}
