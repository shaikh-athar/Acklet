// client/apps/tool-qr-generator/src/config/qr-responsive.descriptor.ts
import { ToolResponsiveDescriptor } from '@acklet/tool-shell';

/**
 * QR Code Generator responsive capabilities & priority descriptor.
 * Consumed by lib-tool-layout and the QR studio to adapt layout,
 * progressive disclosure, and touch interactions across device classes.
 */
export const QR_RESPONSIVE_DESCRIPTOR: ToolResponsiveDescriptor = {
  toolSlug: 'qr-generator',
  phoneFlow: 'generate-first',
  priorityMatrix: {
    phone: {
      p0: [
        'type-picker-track',
        'type-primary-fields',
        'sticky-generate-bar',
        'qr-result-image',
        'sticky-result-actions'
      ],
      p1: [
        'design-bottom-sheet',
        'more-options-disclosure',
        'examples-sheet-trigger',
        'fullscreen-toggle'
      ],
      p2: [
        'history-drawer',
        'dynamic-manager-modal',
        'advanced-settings-sheet',
        'verbose-descriptions'
      ]
    },
    'tablet-portrait': {
      p0: [
        'type-picker-track',
        'type-all-fields',
        'prominent-generate-bar',
        'qr-preview-stage',
        'primary-export-actions'
      ],
      p1: [
        'design-subtabs',
        'more-options-disclosure',
        'examples-dropdown',
        'scan-confidence-bar'
      ],
      p2: [
        'history-slideout',
        'dynamic-manager-modal',
        'advanced-settings-modal'
      ]
    },
    'tablet-landscape': {
      p0: [
        'type-picker-track',
        'studio-content-pane',
        'live-qr-preview-pane',
        'primary-export-actions'
      ],
      p1: [
        'studio-design-subtabs',
        'more-types-dropdown',
        'examples-dropdown',
        'scan-confidence-bar'
      ],
      p2: [
        'history-panel',
        'dynamic-manager-modal',
        'advanced-settings-modal'
      ]
    },
    desktop: {
      p0: [
        'type-picker-track',
        'studio-content-pane',
        'live-qr-preview-pane',
        'primary-export-actions'
      ],
      p1: [
        'studio-design-subtabs',
        'more-types-dropdown',
        'examples-dropdown',
        'scan-confidence-bar'
      ],
      p2: [
        'history-panel',
        'dynamic-manager-modal',
        'advanced-settings-modal'
      ]
    }
  },
  bottomActions: {
    primaryActionLabel: 'Generate QR Code',
    secondaryActions: [
      { id: 'download', label: 'Download', icon: 'download' },
      { id: 'share', label: 'Share', icon: 'share-2' },
      { id: 'design', label: 'Customize', icon: 'palette' }
    ]
  }
};
