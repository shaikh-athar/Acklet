// packages/tool-shell/src/models/tool-responsive.models.ts

/**
 * Normalized device classes based on viewport dimensions and layout density.
 * - phone: <= 640px
 * - tablet-portrait: 641px - 1023px
 * - tablet-landscape: 1024px - 1279px
 * - desktop: >= 1280px
 */
export type DeviceClass = 'phone' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

/**
 * Interaction input capabilities detected from hardware features.
 * - touch: coarse pointer without hover (pure phones/tablets)
 * - mouse: fine pointer with hover (traditional desktop/laptops)
 * - hybrid: dual fine and coarse pointers, or touch with mouse/trackpad (iPad Pro, Surface, touch laptops)
 */
export type InputMode = 'touch' | 'mouse' | 'hybrid';

/**
 * Screen orientation.
 */
export type DeviceOrientation = 'portrait' | 'landscape';

/**
 * Hardware safe-area insets (iPhone notches, home indicator, dynamic island).
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Three priority tiers for progressive disclosure on mobile/tablet interfaces.
 * - P0: Always visible on the primary screen.
 * - P1: One tap away (collapsed disclosure, secondary step, or bottom sheet).
 * - P2: Moved elsewhere (overflow 3-dots menu, settings modal, or hidden).
 */
export type ToolPriorityTier = 'P0' | 'P1' | 'P2';

export interface PriorityTierGroup {
  /** Feature keys or CSS selector IDs that must remain visible */
  p0: string[];
  /** Feature keys or CSS selector IDs disclosed on demand */
  p1: string[];
  /** Feature keys or CSS selector IDs placed in overflow or settings */
  p2: string[];
}

/**
 * Per-tool responsive descriptor that tools declare and the shell orchestrates.
 */
export interface ToolResponsiveDescriptor {
  /** Unique tool slug matching tool-registry (e.g. 'qr-generator') */
  toolSlug: string;

  /**
   * Phone workflow paradigm:
   * - 'generate-first': Input -> Generate -> Result on the same screen (for generation/conversion tools)
   * - 'live-split': Concurrent live editor + output split
   * - 'stepped': Multi-step guided wizard
   */
  phoneFlow: 'generate-first' | 'live-split' | 'stepped';

  /**
   * Priority tiers mapped per device class.
   */
  priorityMatrix: Record<DeviceClass, PriorityTierGroup>;

  /**
   * Optional configuration for sticky bottom action bars on touch viewports.
   */
  bottomActions?: {
    primaryActionLabel: string;
    secondaryActions?: Array<{
      id: string;
      label: string;
      icon: string;
    }>;
  };
}
