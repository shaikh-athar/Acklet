import { Directive, input } from '@angular/core';
import { classes } from '@acklet/tool-shell/helm/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const skeletonVariants = cva('bg-muted/80 animate-pulse rounded-md', {
	variants: {},
	defaultVariants: {},
});

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;

@Directive({
	selector: '[hlmSkeleton],hlm-skeleton',
	host: {
		'data-slot': 'skeleton',
	},
})
export class HlmSkeleton {
	constructor() {
		classes(() => skeletonVariants());
	}
}

export const HlmSkeletonImports = [HlmSkeleton] as const;
