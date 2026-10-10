import { Directive } from '@angular/core';
import { classes } from '@acklet/tool-shell/helm/utils';

@Directive({
	selector: 'kbd[hlmKbd], [hlmKbd]',
	host: {
		'data-slot': 'kbd',
	},
})
export class HlmKbd {
	constructor() {
		classes(
			() =>
				'inline-flex items-center justify-center font-mono text-[11px] font-medium text-muted-foreground bg-muted/80 border border-border/80 rounded px-1.5 py-0.5 min-w-[20px] select-none shadow-2xs leading-tight',
		);
	}
}

export const HlmKbdImports = [HlmKbd] as const;
