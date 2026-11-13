// apps/tool-color-studio/src/services/color-state.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ColorEngineService } from './color-engine.service';
import { GradientService } from './gradient.service';
import { ContrastService } from './contrast.service';
import { ExportService } from './export.service';
import { PaletteService } from './palette.service';
import {
  ColorStudioTab,
  ColorObject,
  GradientConfig,
  GradientStop,
  SavedGradient,
  PaletteItem,
  ExtractedColor,
  WcagCompliance,
  DetailedContrastResult,
  ContrastSuggestion,
  PaletteHarmony,
  SavedColorItem,
  SavedPalette
} from '../models/color.models';

export const STORAGE_KEY_SELECTED = 'acklet.colorstudio.selected';
export const STORAGE_KEY_HISTORY = 'acklet.colorstudio.history';
export const STORAGE_KEY_SAVED = 'acklet.colorstudio.saved';
export const STORAGE_KEY_PALETTE = 'acklet.colorstudio.palette';
export const STORAGE_KEY_SAVED_PALETTES = 'acklet.colorstudio.saved_palettes';

export type SupportedCopyFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk' | 'css';

export function moduleToRoute(tab: ColorStudioTab): string {
  switch (tab) {
    case 'landing': return '';
    case 'picker': return 'color-picker';
    case 'extractor': return 'image-extractor';
    case 'gradient': return 'gradient-generator';
    case 'contrast': return 'contrast-checker';
    case 'palette': return 'palette-generator';
    case 'simulator': return 'vision-simulator';
    default: return '';
  }
}

export function routeToModule(route: string): ColorStudioTab {
  if (!route) return 'picker';
  const clean = route.toLowerCase().replace(/^\//, '').split('?')[0].split('#')[0];
  if (clean.includes('extractor')) return 'extractor';
  if (clean.includes('gradient')) return 'gradient';
  if (clean.includes('contrast')) return 'contrast';
  if (clean.includes('palette')) return 'palette';
  if (clean.includes('simulator')) return 'simulator';
  if (clean.includes('picker')) return 'picker';
  if (clean === 'colorstudio' || clean === 'color-studio' || clean === 'tools/colorstudio' || clean === 'tools/color-studio' || clean === 'landing') {
    return 'landing';
  }
  return 'picker';
}

@Injectable({
  providedIn: 'root'
})
export class ColorStateService {
  protected router: Router | null = (() => {
    try {
      return inject(Router);
    } catch {
      return null;
    }
  })();
  protected engine: ColorEngineService = (() => {
    try {
      return inject(ColorEngineService);
    } catch {
      return new ColorEngineService();
    }
  })();

  public gradientService: GradientService = (() => {
    try {
      return inject(GradientService);
    } catch {
      return new GradientService();
    }
  })();

  public contrastService: ContrastService = (() => {
    try {
      return inject(ContrastService);
    } catch {
      return new ContrastService();
    }
  })();

  public exportService: ExportService = (() => {
    try {
      return inject(ExportService);
    } catch {
      return new ExportService();
    }
  })();

  public paletteService: PaletteService = (() => {
    try {
      return inject(PaletteService);
    } catch {
      return new PaletteService();
    }
  })();

  // ── 1. Active & Selected Color ────────────────────────────────────────────
  public readonly selectedColor = signal<string>(this.loadStoredSelectedColor()); // Default Rose Accent
  public readonly activeColor = this.selectedColor; // Canonical alias

  public readonly activeColorObj = computed<ColorObject>(() => {
    return this.engine.parseColor(this.selectedColor());
  });

  // ── 2. Active Harmonies (Computed on-the-fly) ─────────────────────────────
  public readonly activeHarmonies = computed<Record<PaletteHarmony, string[]>>(() => {
    return this.engine.getAllHarmonies(this.selectedColor());
  });

  // ── 3. Undo / Redo Linear History ─────────────────────────────────────────
  public readonly undoStack = signal<string[]>([]);
  public readonly redoStack = signal<string[]>([]);
  public readonly canUndo = computed<boolean>(() => this.undoStack().length > 0);
  public readonly canRedo = computed<boolean>(() => this.redoStack().length > 0);

  // ── 4. Recently Used Colors & Color History ───────────────────────────────
  public readonly recentlyUsedColors = signal<string[]>(this.loadStoredHistory());
  public readonly colorHistory = this.recentlyUsedColors; // Canonical alias

  // ── 5. Saved / Bookmarked Colors ──────────────────────────────────────────
  public readonly savedColorItems = signal<SavedColorItem[]>(this.loadStoredSavedColorItems());
  public readonly savedColors = computed<string[]>(() => this.savedColorItems().map(i => i.hex));
  public readonly savedPing = signal<boolean>(false);
  private savedPingTimer: any;

  public triggerSavedPing(): void {
    this.savedPing.set(true);
    if (this.savedPingTimer) clearTimeout(this.savedPingTimer);
    this.savedPingTimer = setTimeout(() => {
      this.savedPing.set(false);
    }, 1000);
  }

  // ── 6. Shared Working Palette & Palettes ──────────────────────────────────
  public readonly sharedColorPalettes = signal<string[]>(this.loadStoredPalette());
  public readonly sharedWorkingPalette = this.sharedColorPalettes; // Canonical alias
  public readonly savedPalettes = signal<SavedPalette[]>(this.paletteService.loadSavedPalettes());

  // ── 7. Active Navigation Module ───────────────────────────────────────────
  public readonly activeModule = signal<ColorStudioTab>(this.determineInitialModule());
  public readonly activeTab = this.activeModule; // Canonical alias

  // ── 8. Module-Specific States ─────────────────────────────────────────────
  public readonly contrastFg = signal<string>('#0F172A'); // Slate 900
  public readonly contrastBg = signal<string>('#FFFFFF'); // White
  public readonly contrastCompliance = computed<WcagCompliance>(() => {
    return this.contrastService.evaluateWcag(this.contrastFg(), this.contrastBg());
  });
  public readonly detailedContrast = computed<DetailedContrastResult>(() => {
    return this.contrastService.evaluateWcag(this.contrastFg(), this.contrastBg());
  });

  public readonly gradientConfig = signal<GradientConfig>({
    type: 'linear',
    angle: 135,
    shape: 'circle',
    radialExtent: 'farthest-corner',
    positionX: 50,
    positionY: 50,
    stops: [
      { id: 'stop-1', color: '#E11D48', position: 0, locked: false },
      { id: 'stop-2', color: '#8B5CF6', position: 50, locked: false },
      { id: 'stop-3', color: '#3B82F6', position: 100, locked: false }
    ]
  });

  public readonly gradientCss = computed<string>(() => {
    return this.gradientService.generateCss(this.gradientConfig());
  });

  public readonly gradientUndoStack = signal<GradientConfig[]>([]);
  public readonly gradientRedoStack = signal<GradientConfig[]>([]);
  public readonly canUndoGradient = computed<boolean>(() => this.gradientUndoStack().length > 0);
  public readonly canRedoGradient = computed<boolean>(() => this.gradientRedoStack().length > 0);

  public readonly savedGradients = signal<SavedGradient[]>(this.gradientService.loadSavedGradients());

  public readonly paletteItems = signal<PaletteItem[]>([
    { id: 'p1', hex: '#E11D48', locked: false, name: 'Vibrant Rose' },
    { id: 'p2', hex: '#FB7185', locked: false, name: 'Soft Rose' },
    { id: 'p3', hex: '#6366F1', locked: false, name: 'Indigo Dream' },
    { id: 'p4', hex: '#3B82F6', locked: false, name: 'Sky Azure' },
    { id: 'p5', hex: '#0EA5E9', locked: false, name: 'Cyan Glow' }
  ]);

  public readonly extractedColors = signal<ExtractedColor[]>([]);

  // ── 9. Responsive Drawer Toggle ───────────────────────────────────────────
  public readonly sidebarOpen = signal<boolean>(false);

  // ── 10. Transient Toast Notification ──────────────────────────────────────
  public readonly toast = signal<{ message: string; sub?: string } | null>(null);
  public readonly toastMessage = computed(() => this.toast()?.message ?? null);
  private toastTimer: any = null;

  constructor() {
    this.initStoredPaletteItems();
    this.initRouterSync();
  }

  private determineInitialModule(): ColorStudioTab {
    if (typeof window !== 'undefined' && window.location?.pathname) {
      return routeToModule(window.location.pathname);
    }
    return 'picker';
  }

  private initRouterSync(): void {
    if (this.router && typeof (this.router as any).events?.subscribe === 'function') {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const mod = routeToModule(event.urlAfterRedirects || event.url);
          if (this.activeModule() !== mod) {
            this.activeModule.set(mod);
          }
        }
      });
    }
  }

  // ── Active Module Navigation ──────────────────────────────────────────────
  public setActiveModule(module: ColorStudioTab, navigateRouter = true): void {
    this.activeModule.set(module);
    this.sidebarOpen.set(false);
    if (navigateRouter && this.router) {
      if (module === 'landing') {
        const currentUrl = this.router.url || '';
        let target = '/colorstudio';
        if (currentUrl.includes('/tools/colorstudio')) {
          target = '/tools/colorstudio';
        }
        this.router.navigateByUrl(target).catch(() => {});
        return;
      }
      const targetPath = moduleToRoute(module);
      const currentUrl = this.router.url || '';
      if (!currentUrl.includes(targetPath)) {
        let prefix = '/';
        if (currentUrl.includes('/tools/colorstudio')) {
          prefix = '/tools/colorstudio/';
        } else if (currentUrl.includes('/colorstudio')) {
          prefix = '/colorstudio/';
        }
        this.router.navigateByUrl(`${prefix}${targetPath}`).catch(() => {});
      }
    }
  }

  public setActiveTab(tab: ColorStudioTab): void {
    this.setActiveModule(tab);
  }

  public toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  public closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // ── Selected Color Management with Undo / Redo ────────────────────────────
  public setSelectedColor(hex: string, recordUndo = true): void {
    const normalized = this.engine.normalizeHex(hex);
    const current = this.selectedColor().toUpperCase();

    if (normalized === current) return;

    if (recordUndo) {
      this.undoStack.update(stack => [current, ...stack.slice(0, 20)]);
      this.redoStack.set([]); // Clear redo upon new action
    }

    this.selectedColor.set(normalized);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_SELECTED, normalized);
      } catch {}
    }
    this.addRecentlyUsed(normalized);
  }

  public setActiveColor(hex: string, recordUndo = true): void {
    this.setSelectedColor(hex, recordUndo);
  }

  public undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;

    const previous = stack[0];
    const remaining = stack.slice(1);
    const current = this.selectedColor();

    this.undoStack.set(remaining);
    this.redoStack.update(redo => [current, ...redo]);
    this.setSelectedColor(previous, false);
    this.showToast('Reverted to previous color', previous);
  }

  public redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;

    const next = stack[0];
    const remaining = stack.slice(1);
    const current = this.selectedColor();

    this.redoStack.set(remaining);
    this.undoStack.update(undo => [current, ...undo]);
    this.setSelectedColor(next, false);
    this.showToast('Restored color', next);
  }

  public randomizeActiveColor(): void {
    const randomHue = Math.floor(Math.random() * 360);
    const randomSat = Math.floor(Math.random() * 25 + 70); // 70-95%
    const randomLight = Math.floor(Math.random() * 20 + 45); // 45-65%
    const hex = this.engine.hslToHex({ h: randomHue, s: randomSat, l: randomLight });
    this.setSelectedColor(hex);
    this.showToast('Generated random vibrant color', hex);
  }

  // ── Saved / Bookmarked Colors Management ──────────────────────────────────
  public saveColor(hex: string, name?: string): boolean {
    const clean = this.engine.normalizeHex(hex);
    const current = this.savedColorItems();
    if (current.some(item => item.hex.toUpperCase() === clean.toUpperCase())) {
      this.showToast(`${clean} is already saved`);
      return false;
    }
    const newItem: SavedColorItem = {
      id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      hex: clean,
      name: name?.trim() || clean,
      timestamp: Date.now()
    };
    const updated = [newItem, ...current].slice(0, 48);
    this.savedColorItems.set(updated);
    this.persistStorage(STORAGE_KEY_SAVED, updated);
    this.triggerSavedPing();
    this.showToast(`Saved color ${clean} to bookmarks`);
    return true;
  }

  public updateSavedColorName(id: string, newName: string): void {
    const trimmed = newName.trim();
    const updated = this.savedColorItems().map(item => {
      if (item.id === id) {
        return { ...item, name: trimmed || item.hex };
      }
      return item;
    });
    this.savedColorItems.set(updated);
    this.persistStorage(STORAGE_KEY_SAVED, updated);
    this.showToast('Updated color name');
  }

  public removeSavedColor(hexOrId: string): void {
    const clean = hexOrId.startsWith('#') ? this.engine.normalizeHex(hexOrId).toUpperCase() : null;
    const updated = this.savedColorItems().filter(c => {
      if (clean && c.hex.toUpperCase() === clean) return false;
      if (c.id === hexOrId) return false;
      return true;
    });
    this.savedColorItems.set(updated);
    this.persistStorage(STORAGE_KEY_SAVED, updated);
    this.showToast('Removed saved color');
  }

  public toggleSavedColor(hex: string, name?: string): void {
    if (this.isColorSaved(hex)) {
      this.removeSavedColor(hex);
    } else {
      this.saveColor(hex, name);
    }
  }

  public isColorSaved(hex: string): boolean {
    const clean = this.engine.normalizeHex(hex).toUpperCase();
    return this.savedColorItems().some(c => c.hex.toUpperCase() === clean);
  }

  public clearSavedColors(): void {
    this.savedColorItems.set([]);
    this.persistStorage(STORAGE_KEY_SAVED, []);
    this.showToast('Saved colors cleared');
  }

  // ── Recently Used / History Management ────────────────────────────────────
  public addRecentlyUsed(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    const current = this.recentlyUsedColors().filter(c => c.toUpperCase() !== clean.toUpperCase());
    const updated = [clean, ...current].slice(0, 20);
    this.recentlyUsedColors.set(updated);
    this.persistStorage(STORAGE_KEY_HISTORY, updated);
  }

  public addToHistory(hex: string): void {
    this.addRecentlyUsed(hex);
  }

  public removeHistoryColor(indexOrHex: number | string): void {
    const current = this.recentlyUsedColors();
    let updated: string[];
    if (typeof indexOrHex === 'number') {
      updated = current.filter((_, idx) => idx !== indexOrHex);
    } else {
      const clean = this.engine.normalizeHex(indexOrHex).toUpperCase();
      updated = current.filter(c => c.toUpperCase() !== clean);
    }
    this.recentlyUsedColors.set(updated);
    this.persistStorage(STORAGE_KEY_HISTORY, updated);
  }

  public removeRecentlyUsed(indexOrHex: number | string): void {
    this.removeHistoryColor(indexOrHex);
  }

  public clearRecentlyUsed(): void {
    this.recentlyUsedColors.set([]);
    this.removeStorage(STORAGE_KEY_HISTORY);
    this.showToast('Color history cleared');
  }

  public clearHistory(): void {
    this.clearRecentlyUsed();
  }

  public clearColorHistory(): void {
    this.clearRecentlyUsed();
  }

  // ── Shared Working Palette Management ─────────────────────────────────────
  public addToSharedPalette(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    const current = this.sharedColorPalettes();
    if (current.includes(clean)) {
      this.showToast(`${clean} is already in shared palette`);
      return;
    }
    const updated = [...current, clean].slice(0, 10);
    this.sharedColorPalettes.set(updated);
    this.persistStorage(STORAGE_KEY_PALETTE, updated);
    this.showToast(`Added ${clean} to Shared Palette`);
  }

  public addToWorkingPalette(hex: string): void {
    this.addToSharedPalette(hex);
  }

  public removeFromSharedPalette(index: number): void {
    const current = this.sharedColorPalettes();
    if (current.length <= 2) {
      this.showToast('Shared palette must have at least 2 colors');
      return;
    }
    const updated = current.filter((_, i) => i !== index);
    this.sharedColorPalettes.set(updated);
    this.persistStorage(STORAGE_KEY_PALETTE, updated);
  }

  public setSharedPalette(colors: string[]): void {
    const updated = colors.map(c => this.engine.normalizeHex(c)).slice(0, 10);
    this.sharedColorPalettes.set(updated);
    this.persistStorage(STORAGE_KEY_PALETTE, updated);
    this.showToast(`Updated Shared Palette (${colors.length} colors)`);
  }

  // ── Saved Palettes Management ─────────────────────────────────────────────
  public saveExtractedPalette(name: string, colors: string[], description?: string, harmony?: PaletteHarmony): SavedPalette {
    const updated = this.paletteService.savePalette(name, colors, description, harmony);
    this.savedPalettes.set(updated);
    const saved = updated[0];
    this.showToast(`Saved palette "${saved.name}" (${saved.colors.length} colors)`);
    return saved;
  }

  public saveCurrentPalette(name?: string, description?: string, harmony?: PaletteHarmony): SavedPalette {
    const colors = this.paletteItems().map(i => i.hex);
    const paletteName = name || `Palette ${this.savedPalettes().length + 1}`;
    return this.saveExtractedPalette(paletteName, colors, description, harmony);
  }

  public updateSavedPaletteName(id: string, newName: string): void {
    const updated = this.paletteService.updateSavedPalette(id, { name: newName.trim() });
    this.savedPalettes.set(updated);
    this.showToast('Updated palette name');
  }

  public updateSavedPalette(id: string, patch: Partial<SavedPalette>): void {
    const updated = this.paletteService.updateSavedPalette(id, patch);
    this.savedPalettes.set(updated);
  }

  public deleteSavedPalette(id: string): void {
    const updated = this.paletteService.deleteSavedPalette(id);
    this.savedPalettes.set(updated);
    this.showToast('Deleted saved palette');
  }

  public duplicateSavedPalette(id: string): void {
    const updated = this.paletteService.duplicatePalette(id);
    this.savedPalettes.set(updated);
    this.showToast('Duplicated palette');
  }

  public toggleFavoriteSavedPalette(id: string): void {
    const updated = this.paletteService.toggleFavorite(id);
    this.savedPalettes.set(updated);
  }

  public applySavedPalette(saved: SavedPalette): void {
    const items = this.paletteService.createPaletteItems(saved.colors);
    this.paletteItems.set(items);
    this.showToast(`Loaded palette: ${saved.name}`);
  }

  public clearSavedPalettes(): void {
    this.paletteService.clearAll();
    this.savedPalettes.set([]);
    this.showToast('Cleared saved palettes');
  }

  // ── Cross-Module Dispatch Handlers ────────────────────────────────────────
  public sendToPicker(hex: string): void {
    this.setSelectedColor(hex);
    this.setActiveModule('picker');
    this.showToast(`Loaded ${hex} into Color Picker`);
  }

  public sendToContrast(hex: string, target: 'fg' | 'bg' = 'fg'): void {
    const clean = this.engine.normalizeHex(hex);
    if (target === 'fg') {
      this.contrastFg.set(clean);
    } else {
      this.contrastBg.set(clean);
    }
    this.setActiveModule('contrast');
    this.showToast(`Sent ${clean} as ${target === 'fg' ? 'text' : 'background'} to Contrast Checker`);
  }

  public swapContrastColors(): void {
    const fg = this.contrastFg();
    const bg = this.contrastBg();
    this.contrastFg.set(bg);
    this.contrastBg.set(fg);
    this.showToast('Swapped foreground and background colors');
  }

  public setContrastFg(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    this.contrastFg.set(clean);
  }

  public setContrastBg(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    this.contrastBg.set(clean);
  }

  public applyContrastSuggestion(hex: string, role: 'fg' | 'bg'): void {
    const clean = this.engine.normalizeHex(hex);
    if (role === 'fg') {
      this.contrastFg.set(clean);
    } else {
      this.contrastBg.set(clean);
    }
    this.showToast(`Applied ${clean} as ${role === 'fg' ? 'foreground' : 'background'}`);
  }

  public sendToGradient(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    const current = this.gradientConfig();
    const updated = this.gradientService.addStop(current, clean);
    this.gradientConfig.set(updated);
    this.setActiveModule('gradient');
    this.showToast(`Added ${clean} stop to Gradient Generator`);
  }

  // ── Gradient Module State Management ─────────────────────────────────────
  public saveCurrentGradient(name?: string): SavedGradient {
    const config = this.gradientConfig();
    const updated = this.gradientService.saveGradient(name || `Gradient ${this.savedGradients().length + 1}`, config);
    this.savedGradients.set(updated);
    const newlySaved = updated[0];
    this.showToast(`Saved gradient "${newlySaved.name}"`);
    return newlySaved;
  }

  public updateSavedGradientName(id: string, name: string): void {
    const updated = this.gradientService.updateSavedGradientName(id, name);
    this.savedGradients.set(updated);
    this.showToast('Updated gradient name');
  }

  public deleteSavedGradient(id: string): void {
    const updated = this.gradientService.deleteSavedGradient(id);
    this.savedGradients.set(updated);
    this.showToast('Deleted saved gradient');
  }

  public applyGradient(config: GradientConfig, name?: string): void {
    this.pushGradientUndo();
    this.gradientConfig.set(JSON.parse(JSON.stringify(config)));
    if (name) {
      this.showToast(`Applied preset: ${name}`);
    }
  }

  public populateGradientFromPalette(colors: string[] = this.sharedColorPalettes()): void {
    if (!colors || colors.length < 2) {
      this.showToast('Need at least 2 colors to build gradient');
      return;
    }
    this.pushGradientUndo();
    const cleanColors = colors.map(c => this.engine.normalizeHex(c));
    const step = 100 / (cleanColors.length - 1);
    const newStops: GradientStop[] = cleanColors.map((hex, idx) => ({
      id: `stop-palette-${idx}-${Date.now()}`,
      color: hex,
      position: Math.round(idx * step),
      locked: false
    }));

    this.gradientConfig.update(c => ({
      ...c,
      stops: newStops
    }));
    this.setActiveModule('gradient');
    this.showToast(`Populated gradient from ${cleanColors.length} palette colors`);
  }

  public reverseGradientStops(): void {
    this.gradientConfig.update(c => this.gradientService.reverseStops(c));
    this.showToast('Reversed gradient stops');
  }

  public distributeGradientStops(): void {
    this.pushGradientUndo();
    this.gradientConfig.update(c => this.gradientService.distributeStopsEqually(c));
    this.showToast('Distributed stops evenly');
  }

  public pushGradientUndo(config: GradientConfig = this.gradientConfig()): void {
    const clone: GradientConfig = JSON.parse(JSON.stringify(config));
    this.gradientUndoStack.update(stack => [clone, ...stack.slice(0, 20)]);
    this.gradientRedoStack.set([]);
  }

  public undoGradient(): boolean {
    const stack = this.gradientUndoStack();
    if (stack.length === 0) return false;

    const previous = stack[0];
    const remaining = stack.slice(1);
    const current: GradientConfig = JSON.parse(JSON.stringify(this.gradientConfig()));

    this.gradientUndoStack.set(remaining);
    this.gradientRedoStack.update(redo => [current, ...redo]);
    this.gradientConfig.set(previous);
    this.showToast('Reverted to previous gradient');
    return true;
  }

  public redoGradient(): boolean {
    const stack = this.gradientRedoStack();
    if (stack.length === 0) return false;

    const next = stack[0];
    const remaining = stack.slice(1);
    const current: GradientConfig = JSON.parse(JSON.stringify(this.gradientConfig()));

    this.gradientRedoStack.set(remaining);
    this.gradientUndoStack.update(undo => [current, ...undo]);
    this.gradientConfig.set(next);
    this.showToast('Restored gradient');
    return true;
  }

  public sendToPalette(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    const items = this.paletteItems();
    const replaceIndex = items.findIndex(i => !i.locked);
    const targetIndex = replaceIndex >= 0 ? replaceIndex : 0;
    const updated = [...items];
    updated[targetIndex] = {
      ...updated[targetIndex],
      hex: clean,
      name: `Color ${targetIndex + 1}`
    };
    this.paletteItems.set(updated);
    this.setActiveModule('palette');
    this.showToast(`Added ${clean} to Palette Generator`);
  }

  public sendToSimulator(hex: string): void {
    this.setSelectedColor(hex);
    this.setActiveModule('simulator');
    this.showToast(`Viewing ${hex} in Vision Simulator`);
  }

  public sendPaletteToSimulator(colors: string[]): void {
    this.setSharedPalette(colors);
    this.setActiveModule('simulator');
    this.showToast(`Imported ${colors.length} colors into Vision Simulator`);
  }

  // ── Reusable Clipboard Copying for All Formats ────────────────────────────

  public async copyFormat(hex: string, format: SupportedCopyFormat): Promise<boolean> {
    const obj = this.engine.parseColor(hex);
    let textToCopy = '';
    let label = '';

    switch (format) {
      case 'hex':
        textToCopy = obj.hex.toUpperCase();
        label = 'HEX';
        break;
      case 'rgb':
        textToCopy = obj.rgbString;
        label = 'RGB';
        break;
      case 'hsl':
        textToCopy = obj.hslString;
        label = 'HSL';
        break;
      case 'hsv':
        textToCopy = obj.hsvString;
        label = 'HSV';
        break;
      case 'cmyk':
        textToCopy = obj.cmykString;
        label = 'CMYK';
        break;
      case 'css':
        textToCopy = `background-color: ${obj.hex.toUpperCase()};`;
        label = 'CSS';
        break;
    }

    return this.copyToClipboard(textToCopy, label);
  }

  public copyAllFormats(hex: string = this.selectedColor()): void {
    const obj = this.engine.parseColor(hex);
    const text = [
      `HEX:  ${obj.hex.toUpperCase()}`,
      `RGB:  ${obj.rgbString}`,
      `HSL:  ${obj.hslString}`,
      `HSV:  ${obj.hsvString}`,
      `CMYK: ${obj.cmykString}`,
      `CSS:  --color-accent: ${obj.hex.toUpperCase()};`
    ].join('\n');

    this.copyToClipboard(text, 'All Color Formats');
  }

  public async copyToClipboard(text: string, label = 'Color'): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.showToast(`Copied ${label}`, text.length < 32 ? text : undefined);
      return true;
    } catch {
      this.showToast(`Failed to copy to clipboard`);
      return false;
    }
  }

  public showToast(message: string, sub?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, sub });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 5000);
  }

  // ── LocalStorage Helpers ──────────────────────────────────────────────────

  private persistStorage(key: string, data: any): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }

  private removeStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  private loadStoredSelectedColor(): string {
    if (typeof localStorage === 'undefined') return '#E11D48';
    try {
      let stored = localStorage.getItem(STORAGE_KEY_SELECTED);
      if (stored) {
        if (stored.startsWith('"') && stored.endsWith('"')) {
          const parsed = JSON.parse(stored);
          stored = typeof parsed === 'string' ? parsed : null;
        }
        if (stored && this.engine.isValidHex(stored)) {
          return this.engine.normalizeHex(stored);
        }
      }
    } catch {}
    return '#E11D48';
  }

  private loadStoredHistory(): string[] {
    const defaults = ['#E11D48', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#0F172A'];
    if (typeof localStorage === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaults;
  }

  private loadStoredSavedColorItems(): SavedColorItem[] {
    const defaults: SavedColorItem[] = [
      { id: 'saved-1', hex: '#E11D48', name: 'Rose Red', timestamp: 1700000000000 },
      { id: 'saved-2', hex: '#6366F1', name: 'Indigo Dream', timestamp: 1700000001000 },
      { id: 'saved-3', hex: '#10B981', name: 'Emerald Green', timestamp: 1700000002000 }
    ];
    if (typeof localStorage === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => {
            if (typeof item === 'string') {
              return {
                id: `saved-legacy-${idx}-${Date.now()}`,
                hex: this.engine.normalizeHex(item),
                name: item,
                timestamp: Date.now()
              };
            }
            return {
              id: item.id || `saved-${idx}-${Date.now()}`,
              hex: this.engine.normalizeHex(item.hex || '#000000'),
              name: item.name || item.hex,
              timestamp: item.timestamp || Date.now()
            };
          });
        }
      }
    } catch {}
    return defaults;
  }

  private loadStoredPalette(): string[] {
    const defaults = ['#E11D48', '#FB7185', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];
    if (typeof localStorage === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PALETTE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch {}
    return defaults;
  }

  private loadStoredSavedPalettes(): SavedPalette[] {
    const defaults: SavedPalette[] = [
      {
        id: 'palette-default-sunset',
        name: 'Sunset Coast',
        colors: ['#1E1B4B', '#E11D48', '#F59E0B', '#0F766E', '#FFFBEB'],
        timestamp: 1700000000000
      }
    ];
    if (typeof localStorage === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_PALETTES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaults;
  }

  private initStoredPaletteItems(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem('acklet.colorstudio.palette_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          this.paletteItems.set(parsed);
        }
      }
    } catch {}
  }
}

