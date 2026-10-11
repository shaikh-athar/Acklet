import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { BrnTabs, BrnTabsContent, BrnTabsList, BrnTabsTrigger } from '@spartan-ng/brain/tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { classes } from '@acklet/tool-shell/helm/utils';

@Component({
  selector: 'hlm-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BrnTabs,
      inputs: ['orientation', 'activationMode', 'brnTabs: tab'],
      outputs: ['brnTabsChange: tabChange', 'tabActivated'],
    },
  ],
  host: {
    'data-slot': 'tabs',
    class: 'block w-full',
  },
  template: `<ng-content />`,
})
export class HlmTabs {}

export const tabsListVariants = cva(
  'inline-flex items-center justify-center p-1 text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'h-11 rounded-xl bg-muted p-1 text-muted-foreground border border-border',
        underline: 'h-11 w-full justify-start gap-6 border-b border-border bg-transparent p-0 rounded-none',
        segmented: 'h-11 rounded-xl bg-muted p-1 border border-border gap-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type TabsListVariants = VariantProps<typeof tabsListVariants>;

@Component({
  selector: 'hlm-tabs-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnTabsList],
  host: {
    'data-slot': 'tabs-list',
  },
  template: `<ng-content />`,
})
export class HlmTabsList {
  public readonly variant = input<TabsListVariants['variant']>('default');

  constructor() {
    classes(() => tabsListVariants({ variant: this.variant() }));
  }
}

export const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'h-9 rounded-lg px-3.5 py-1 text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs',
        underline: 'relative h-11 rounded-none px-1 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground font-semibold border-b-2 border-transparent data-[state=active]:border-[var(--accent)]',
        segmented: 'h-9 rounded-lg px-4 py-1.5 text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>;

@Component({
  selector: 'button[hlmTabsTrigger], [hlmTabsTrigger]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BrnTabsTrigger,
      inputs: ['brnTabsTrigger: triggerFor', 'disabled'],
    },
  ],
  host: {
    'data-slot': 'tabs-trigger',
  },
  template: `<ng-content />`,
})
export class HlmTabsTrigger {
  public readonly variant = input<TabsTriggerVariants['variant']>('default');

  constructor() {
    classes(() => tabsTriggerVariants({ variant: this.variant() }));
  }
}

@Component({
  selector: 'hlm-tabs-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BrnTabsContent,
      inputs: ['brnTabsContent: contentFor'],
    },
  ],
  host: {
    'data-slot': 'tabs-content',
    class: 'mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  },
  template: `<ng-content />`,
})
export class HlmTabsContent {}

export const HlmTabsImports = [HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent] as const;
