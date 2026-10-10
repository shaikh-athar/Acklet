import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BrnAvatar, BrnAvatarFallback, BrnAvatarImage } from '@spartan-ng/brain/avatar';
import { classes } from '@acklet/tool-shell/helm/utils';

@Component({
	selector: 'hlm-avatar',
	imports: [BrnAvatar],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'avatar',
	},
	template: `
		<brn-avatar class="relative flex size-10 shrink-0 overflow-hidden rounded-full">
			<ng-content select="[hlmAvatarImage]" />
			<ng-content select="[hlmAvatarFallback]" />
		</brn-avatar>
	`,
})
export class HlmAvatar {
	constructor() {
		classes(() => 'inline-block');
	}
}

@Component({
	selector: 'img[hlmAvatarImage]',
	hostDirectives: [BrnAvatarImage],
	host: {
		'data-slot': 'avatar-image',
		class: 'aspect-square size-full object-cover',
	},
	template: ``,
})
export class HlmAvatarImage {}

@Component({
	selector: '[hlmAvatarFallback]',
	hostDirectives: [BrnAvatarFallback],
	host: {
		'data-slot': 'avatar-fallback',
		class: 'flex size-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs select-none',
	},
	template: `<ng-content />`,
})
export class HlmAvatarFallback {}

export const HlmAvatarImports = [HlmAvatar, HlmAvatarImage, HlmAvatarFallback] as const;
