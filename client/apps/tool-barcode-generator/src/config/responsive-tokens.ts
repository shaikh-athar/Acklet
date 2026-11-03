// apps/tool-barcode-generator/src/config/responsive-tokens.ts
/**
 * Canonical Breakpoints and Responsive Design Tokens for Barcode Generator
 * Single source of truth across all components.
 *
 * sm: 0 to 639px (phone portrait)
 * md: 640px to 1023px (phone landscape, small tablet)
 * lg: 1024px to 1439px (laptop, tablet landscape)
 * xl: 1440px and above (desktop, large monitor)
 */

export const BREAKPOINTS = {
  xsMax: 399,
  smMin: 400,
  smMax: 639,
  mdMin: 640,
  mdMax: 1023,
  lgMin: 1024,
  lgMax: 1439,
  xlMin: 1440,
} as const;

export type BreakpointKey = 'sm' | 'md' | 'lg' | 'xl';
export type DeviceTierKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const MEDIA_QUERIES = {
  xs: '(max-width: 399px)',
  sm: '(max-width: 639px)',
  smOnly: '(min-width: 400px) and (max-width: 639px)',
  md: '(min-width: 640px) and (max-width: 1023px)',
  lg: '(min-width: 1024px) and (max-width: 1439px)',
  xl: '(min-width: 1440px)',
  belowMd: '(max-width: 639px)',
  belowLg: '(max-width: 1023px)',
  mdAndUp: '(min-width: 640px)',
  lgAndUp: '(min-width: 1024px)',
  xlAndUp: '(min-width: 1440px)',
} as const;

export const RESPONSIVE_LAYOUT_TOKENS = {
  // Shell sizes
  shellMaxWidth: '1600px',
  topbarHeightXs: '52px',
  topbarHeightSmMd: '56px',
  topbarHeightLgXl: '64px',
  
  // Left column width desktop (lg, xl)
  leftColWidth: 'clamp(380px, 38%, 520px)',
  leftColMin: '380px',
  leftColMax: '520px',

  // Gaps & Paddings per device tier
  paddingXs: '8px',
  paddingSm: '16px',
  cardPaddingXs: '12px',
  cardPaddingSm: '16px',
  cardPaddingMd: '20px',
  cardPaddingLgXl: '24px',

  stepGapXs: '12px',
  stepGapSm: '16px',
  stepGapLg: '24px',

  // Control heights
  controlHeightXs: '44px',
  controlHeightSm: '44px',
  controlHeightMdUp: '48px',

  // Step badge dimensions
  stepBadgeSizeXs: '24px',
  stepBadgeSizeSmUp: '28px',

  // Textarea heights
  textareaMinHeightSm: '120px',
  textareaMinHeightLg: '160px',

  // Record list container max-heights
  recordListMaxHeightSm: '240px',
  recordListMaxHeightLg: '360px',

  // Separator dropdown max-width
  separatorMaxWidthMd: '280px',

  // Custom layout min-field width
  customFieldMinWidth: '140px',

  // Minimum touch target for touch screens
  minTouchTarget: '44px',

  // Focus ring
  focusRingColor: '#2563EB',
  focusRingWidth: '2px',
  focusRingOffset: '2px',

  // Segmented control active accent blue
  segmentedSelectedBg: '#2563EB',
  segmentedSelectedText: '#FFFFFF',
} as const;

/**
 * Determine the active breakpoint key based on pixel width.
 */
export function getBreakpoint(width: number): BreakpointKey {
  if (width <= BREAKPOINTS.smMax) return 'sm';
  if (width <= BREAKPOINTS.mdMax) return 'md';
  if (width <= BREAKPOINTS.lgMax) return 'lg';
  return 'xl';
}

export function getDeviceTier(width: number): DeviceTierKey {
  if (width < 400) return 'xs';
  if (width <= BREAKPOINTS.smMax) return 'sm';
  if (width <= BREAKPOINTS.mdMax) return 'md';
  if (width <= BREAKPOINTS.lgMax) return 'lg';
  return 'xl';
}

export function isBreakpointXs(width: number): boolean {
  return width < 400;
}

export function isBreakpointSm(width: number): boolean {
  return width <= BREAKPOINTS.smMax;
}

export function isBreakpointMd(width: number): boolean {
  return width >= BREAKPOINTS.mdMin && width <= BREAKPOINTS.mdMax;
}

export function isBreakpointLg(width: number): boolean {
  return width >= BREAKPOINTS.lgMin && width <= BREAKPOINTS.lgMax;
}

export function isBreakpointXl(width: number): boolean {
  return width >= BREAKPOINTS.xlMin;
}

