import { Directive, input } from '@angular/core';

@Directive({
	selector: '[hlmInputGroup], hlm-input-group',
	host: {
		'data-slot': 'input-group',
		class: 'group/input-group relative flex w-full items-center',
	},
})
export class HlmInputGroup {}

@Directive({
	selector: 'input[hlmInputGroupInput]',
	host: {
		'data-slot': 'input-group-input',
		class: 'w-full bg-transparent py-2.5 pl-10 pr-14 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none border-none leading-normal font-sans',
	},
})
export class HlmInputGroupInput {}

@Directive({
	selector: '[hlmInputGroupAddon]',
	host: {
		'data-slot': 'input-group-addon',
		'[class.start-addon]': 'align() !== "inline-end"',
		'[class.end-addon]': 'align() === "inline-end"',
		'[class.left-3.5]': 'align() !== "inline-end"',
		'[class.right-3]': 'align() === "inline-end"',
		class: 'absolute flex items-center gap-1 text-muted-foreground text-sm',
	},
})
export class HlmInputGroupAddon {
	public readonly align = input<'inline-start' | 'inline-end'>('inline-start');
}

export const HlmInputGroupImports = [
	HlmInputGroup,
	HlmInputGroupInput,
	HlmInputGroupAddon,
] as const;
