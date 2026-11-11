// apps/tool-color-studio/src/services/color-studio-state.service.ts
import { Injectable } from '@angular/core';
import { ColorStateService } from './color-state.service';

/**
 * ColorStudioStateService extends the canonical ColorStateService,
 * ensuring complete backwards compatibility with all Phase 2 module components
 * while providing unified state, persistence, and cross-module synchronization.
 */
@Injectable({
  providedIn: 'root'
})
export class ColorStudioStateService extends ColorStateService {}
