import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { classes } from '@acklet/tool-shell/helm/utils';

export const itemVariants = cva(
	'group/item relative flex items-center justify-between gap-4 p-4 transition-all duration-200 text-foreground',
	{
		variants: {
			variant: {
				default: 'border-b border-border hover:bg-muted/50',
				outline: 'rounded-xl border border-border bg-card/60 hover:bg-card hover:border-border-accent/40 shadow-xs hover:shadow-sm',
				ghost: 'rounded-xl hover:bg-muted/50',
			},
		},
		defaultVariants: {
			variant: 'outline',
		},
	},
);

export type ItemVariants = VariantProps<typeof itemVariants>;

@Component({
	selector: 'hlm-item',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item',
	},
	template: `
		<ng-content select="hlm-item-media" />
		<ng-content select="hlm-item-content" />
		<ng-content select="hlm-item-actions" />
		<ng-content />
	`,
})
export class HlmItem {
	public readonly variant = input<ItemVariants['variant']>('outline');

	constructor() {
		classes(() => itemVariants({ variant: this.variant() }));
	}
}

@Component({
	selector: 'hlm-item-media',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item-media',
		class: 'flex shrink-0 items-center justify-center',
	},
	template: `<ng-content />`,
})
export class HlmItemMedia {}

@Component({
	selector: 'hlm-item-content',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item-content',
		class: 'flex flex-1 min-w-0 flex-col gap-0.5',
	},
	template: `<ng-content />`,
})
export class HlmItemContent {}

@Component({
	selector: 'hlm-item-title, [hlmItemTitle]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item-title',
		class: 'font-medium text-sm text-foreground truncate',
	},
	template: `<ng-content />`,
})
export class HlmItemTitle {}

@Component({
	selector: 'p[hlmItemDescription], [hlmItemDescription]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item-description',
		class: 'text-xs text-muted-foreground truncate leading-relaxed',
	},
	template: `<ng-content />`,
})
export class HlmItemDescription {}

@Component({
	selector: 'hlm-item-actions',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'item-actions',
		class: 'flex shrink-0 items-center gap-2',
	},
	template: `<ng-content />`,
})
export class HlmItemActions {}

export const HlmItemImports = [
	HlmItem,
	HlmItemMedia,
	HlmItemContent,
	HlmItemTitle,
	HlmItemDescription,
	HlmItemActions,
] as const;
