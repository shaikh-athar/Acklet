import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { classes } from '@acklet/tool-shell/helm/utils';

export const emptyVariants = cva(
  'flex min-w-0 flex-col items-center justify-center p-8 text-center text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        card: 'rounded-xl border border-border bg-card p-8 shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type EmptyVariants = VariantProps<typeof emptyVariants>;

@Component({
  selector: 'div[hlmEmpty], [hlmEmpty]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'empty',
  },
  template: `<ng-content />`,
})
export class HlmEmpty {
  public readonly variant = input<EmptyVariants['variant']>('default');

  constructor() {
    classes(() => emptyVariants({ variant: this.variant() }));
  }
}

@Component({
  selector: 'div[hlmEmptyIcon], [hlmEmptyIcon]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'empty-icon',
    class: 'mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]',
  },
  template: `<ng-content />`,
})
export class HlmEmptyIcon {}

@Component({
  selector: 'h4[hlmEmptyTitle], [hlmEmptyTitle]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'empty-title',
    class: 'mb-1 text-base font-semibold tracking-tight text-foreground',
  },
  template: `<ng-content />`,
})
export class HlmEmptyTitle {}

@Component({
  selector: 'p[hlmEmptyDescription], [hlmEmptyDescription]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'empty-description',
    class: 'max-w-sm text-sm text-muted-foreground leading-relaxed',
  },
  template: `<ng-content />`,
})
export class HlmEmptyDescription {}

@Component({
  selector: 'div[hlmEmptyActions], [hlmEmptyActions]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'empty-actions',
    class: 'mt-4 flex items-center justify-center gap-2',
  },
  template: `<ng-content />`,
})
export class HlmEmptyActions {}

export const HlmEmptyImports = [
  HlmEmpty,
  HlmEmptyIcon,
  HlmEmptyTitle,
  HlmEmptyDescription,
  HlmEmptyActions,
] as const;
