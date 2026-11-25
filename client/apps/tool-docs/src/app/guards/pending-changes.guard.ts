// client/apps/tool-docs/src/app/guards/pending-changes.guard.ts

import { CanDeactivateFn } from '@angular/router';

export interface ComponentCanDeactivate {
  canDeactivate: () => boolean;
}

export const pendingChangesGuard: CanDeactivateFn<ComponentCanDeactivate> = (component) => {
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }
  return true;
};
