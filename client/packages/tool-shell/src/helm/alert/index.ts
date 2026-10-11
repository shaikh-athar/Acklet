import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { classes } from '@acklet/tool-shell/helm/utils';

export const alertVariants = cva(
  'relative w-full rounded-xl p-3.5 text-sm transition-colors [&>ng-icon]:absolute [&>ng-icon]:left-3.5 [&>ng-icon]:top-3.5 [&>ng-icon]:text-foreground [&>ng-icon~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground border border-border',
        destructive: 'bg-[var(--danger-soft)] text-destructive border border-[var(--danger-border)] text-[var(--danger)]',
        info: 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type AlertVariants = VariantProps<typeof alertVariants>;

@Component({
  selector: 'div[hlmAlert], [hlmAlert]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'alert',
    'data-slot': 'alert',
  },
  template: `<ng-content />`,
})
export class HlmAlert {
  public readonly variant = input<AlertVariants['variant']>('default');

  constructor() {
    classes(() => alertVariants({ variant: this.variant() }));
  }
}

@Component({
  selector: 'h5[hlmAlertTitle], [hlmAlertTitle]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'alert-title',
    class: 'font-semibold tracking-tight text-sm leading-none mb-1',
  },
  template: `<ng-content />`,
})
export class HlmAlertTitle {}

@Component({
  selector: 'div[hlmAlertDescription], p[hlmAlertDescription], [hlmAlertDescription]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'alert-description',
    class: 'text-sm [&_p]:leading-relaxed text-muted-foreground',
  },
  template: `<ng-content />`,
})
export class HlmAlertDescription {}

export const HlmAlertImports = [HlmAlert, HlmAlertTitle, HlmAlertDescription] as const;
