// packages/tool-shell/src/services/tool-theme.service.ts
import { Injectable, signal, computed, effect } from '@angular/core';
import { readCookie, writeCookie, resolveCookieDomain } from './sidebar-state.service';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ToolAccentPreset = 'blue';
export type ToolBackgroundVariant = 'soft-mesh' | 'top-wash' | 'ambient-orb' | 'diagonal-stream' | 'dual-spotlight';

export interface ToolBackgroundOption {
  id: ToolBackgroundVariant;
  name: string;
  description: string;
}

export const TOOL_BACKGROUND_OPTIONS: ToolBackgroundOption[] = [
  {
    id: 'soft-mesh',
    name: 'Soft Mesh',
    description: 'Subtle multi-point ambient spots (Default)'
  },
  {
    id: 'top-wash',
    name: 'Top Wash',
    description: 'Gentle azure tint fade from top'
  },
  {
    id: 'ambient-orb',
    name: 'Ambient Orb',
    description: 'Soft centered radiant glow'
  },
  {
    id: 'diagonal-stream',
    name: 'Diagonal Stream',
    description: 'Angled azure directional flow'
  },
  {
    id: 'dual-spotlight',
    name: 'Dual Spotlight',
    description: 'Twin atmospheric horizon glows'
  }
];

export const VALID_BACKGROUNDS = new Set<string>(TOOL_BACKGROUND_OPTIONS.map(b => b.id));

export const CENTERED_TOOLS = new Set<string>([
  'urlshortener',
  'url-shortener',
  'file-converter',
  'fileconverter',
  'image-converter',
  'imageconverter',
  'image-compressor',
  'img-compressor',
  'imagecompressor',
  'barcode',
  'barcode-generator'
]);

export const CENTERED_BACKGROUND_POOL: ToolBackgroundVariant[] = [
  'ambient-orb',
  'top-wash',
  'dual-spotlight'
];

export const WIDE_BACKGROUND_POOL: ToolBackgroundVariant[] = [
  'soft-mesh',
  'diagonal-stream'
];

export const TOOL_EXPLICIT_BACKGROUND_MAP: Record<string, ToolBackgroundVariant> = {
  'urlshortener': 'ambient-orb',
  'url-shortener': 'ambient-orb',
  'shortener': 'ambient-orb',
  'image-converter': 'ambient-orb',
  'imageconverter': 'ambient-orb',
  'image-compressor': 'dual-spotlight',
  'img-compressor': 'dual-spotlight',
  'imagecompressor': 'dual-spotlight',
  'file-converter': 'top-wash',
  'fileconverter': 'top-wash',
  'converter': 'top-wash',
  'qr': 'soft-mesh',
  'qr-generator': 'soft-mesh',
  'qr-code-generator': 'soft-mesh',
  'barcode': 'diagonal-stream',
  'barcode-generator': 'diagonal-stream',
  'datalens': 'dual-spotlight',
  'data-lens': 'dual-spotlight',
  'clipboard': 'top-wash',
  'online-clipboard': 'top-wash',
  'temp-email': 'diagonal-stream',
  'tempemail': 'diagonal-stream'
};

export function isCenteredTool(toolIdOrSlug?: string, layout?: string): boolean {
  if (layout) {
    const l = layout.toLowerCase();
    if (l === 'centered' || l === 'standard' || l === 'compact') return true;
    if (l === 'fullbleed' || l === 'workbench' || l === 'wide') return false;
  }
  if (!toolIdOrSlug) return false;
  const clean = toolIdOrSlug.toLowerCase().trim();
  return CENTERED_TOOLS.has(clean);
}

export function resolveToolDefaultBackground(toolIdOrSlug?: string, layout?: string): ToolBackgroundVariant {
  const clean = (toolIdOrSlug || '').toLowerCase().trim();
  if (clean && TOOL_EXPLICIT_BACKGROUND_MAP[clean]) {
    return TOOL_EXPLICIT_BACKGROUND_MAP[clean];
  }
  const pool = isCenteredTool(clean, layout) ? CENTERED_BACKGROUND_POOL : WIDE_BACKGROUND_POOL;
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

export interface ToolAccentOption {
  id: ToolAccentPreset;
  name: string;
  description: string;
  lightHex: string;
  darkHex: string;
  softLight: string;
  softDark: string;
}

export const TOOL_ACCENT_PRESETS: ToolAccentOption[] = [
  {
    id: 'blue',
    name: 'Acklet Blue',
    description: 'Unified Acklet brand accent — clear, focused, and professional',
    lightHex: '#2563EB',
    darkHex: '#60A5FA',
    softLight: 'rgba(37, 99, 235, 0.08)',
    softDark: 'rgba(59, 130, 246, 0.14)'
  }
];

const VALID_ACCENTS = new Set<string>(TOOL_ACCENT_PRESETS.map(p => p.id));

@Injectable({
  providedIn: 'root'
})
export class ToolThemeService {
  private readonly THEME_KEY = 'acklet_ts_theme';
  private readonly ACCENT_KEY = 'acklet_tool_accent';
  private readonly BACKGROUND_KEY = 'acklet_tool_background';
  private readonly TRANSPARENCY_KEY = 'acklet_reduce_transparency';
  private readonly MOTION_KEY = 'acklet_reduce_motion';
  private readonly POINTER_GLOW_KEY = 'acklet_pointer_glow';

  readonly currentTheme = signal<ThemeMode>('dark');
  readonly effectiveTheme = signal<'dark' | 'light'>('dark');
  readonly currentAccent = signal<ToolAccentPreset>('blue');
  readonly currentBackground = signal<ToolBackgroundVariant>('soft-mesh');
  readonly reduceTransparency = signal<boolean>(false);
  readonly reduceMotion = signal<boolean>(false);
  readonly pointerGlowEnabled = signal<boolean>(true);

  readonly availableAccents = TOOL_ACCENT_PRESETS;
  readonly availableBackgrounds = TOOL_BACKGROUND_OPTIONS;
  readonly selectedAccentOption = computed(() => {
    const acc = this.currentAccent();
    return TOOL_ACCENT_PRESETS.find(p => p.id === acc) || TOOL_ACCENT_PRESETS[0];
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme') as ThemeMode | null;
      const savedTheme = (urlTheme === 'light' || urlTheme === 'dark' || urlTheme === 'system')
        ? urlTheme
        : ((localStorage.getItem(this.THEME_KEY) as ThemeMode) || 'dark');
      this.currentTheme.set(savedTheme);
      this.resolveEffectiveTheme();

      // Clean up legacy multi-accent settings so all tools strictly use 'blue'
      try {
        localStorage.removeItem(this.ACCENT_KEY);
      } catch (_) {}
      this.currentAccent.set('blue');

      // Resolve background preference per tool mapping (system-managed, clean up stale manual overrides)
      try {
        localStorage.removeItem(this.BACKGROUND_KEY);
      } catch (_) {}

      // Automatically detect tool from hostname or path and apply designated background
      let detectedSlug: string | undefined;
      const hostname = window.location.hostname.toLowerCase();
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== 'tools') {
        detectedSlug = parts[0];
      } else {
        const match = window.location.pathname.match(/\/(?:tools|apps)\/([a-zA-Z0-9_-]+)/);
        if (match) detectedSlug = match[1];
      }
      if (detectedSlug) {
        this.initForTool(detectedSlug);
      } else {
        this.currentBackground.set('soft-mesh');
      }

      const savedTransparency = localStorage.getItem(this.TRANSPARENCY_KEY) === 'true';
      this.reduceTransparency.set(savedTransparency);

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const savedMotion = localStorage.getItem(this.MOTION_KEY);
      this.reduceMotion.set(savedMotion !== null ? savedMotion === 'true' : prefersReducedMotion);

      const savedPointerGlow = localStorage.getItem(this.POINTER_GLOW_KEY);
      this.pointerGlowEnabled.set(savedPointerGlow !== null ? savedPointerGlow === 'true' : true);

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.currentTheme() === 'system') {
          this.resolveEffectiveTheme();
        }
      });

      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (localStorage.getItem(this.MOTION_KEY) === null) {
          this.reduceMotion.set(e.matches);
        }
      });
    }

    effect(() => {
      const eff = this.effectiveTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', eff);
      }
    });

    effect(() => {
      const acc = this.currentAccent();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-accent', acc);
      }
    });

    effect(() => {
      const bg = this.currentBackground();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-background', bg);
        if (document.body) {
          document.body.setAttribute('data-background', bg);
        }
      }
    });

    effect(() => {
      const redTrans = this.reduceTransparency();
      if (typeof document !== 'undefined') {
        if (redTrans) {
          document.documentElement.setAttribute('data-reduce-transparency', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-transparency');
        }
      }
    });

    effect(() => {
      const redMotion = this.reduceMotion();
      if (typeof document !== 'undefined') {
        if (redMotion) {
          document.documentElement.setAttribute('data-reduce-motion', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-motion');
        }
      }
    });

    effect(() => {
      const glowEnabled = this.pointerGlowEnabled();
      if (typeof document !== 'undefined') {
        if (!glowEnabled) {
          document.documentElement.setAttribute('data-disable-pointer-glow', 'true');
        } else {
          document.documentElement.removeAttribute('data-disable-pointer-glow');
        }
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (_) { }
    }
    this.resolveEffectiveTheme();
  }

  toggleTheme(): void {
    const next: ThemeMode = this.effectiveTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setAccent(_accent?: ToolAccentPreset): void {
    this.currentAccent.set('blue');
  }

  resetAccent(): void {
    this.currentAccent.set('blue');
  }

  private activeToolSlug: string | null = null;
  private activeToolLayout: string | null = null;

  initForTool(toolIdOrSlug?: string, layout?: string): void {
    if (!toolIdOrSlug) return;
    this.activeToolSlug = toolIdOrSlug;
    if (layout) {
      this.activeToolLayout = layout;
    }
    const toolBg = resolveToolDefaultBackground(toolIdOrSlug, layout || this.activeToolLayout || undefined);
    this.currentBackground.set(toolBg);
  }

  setBackground(bg: ToolBackgroundVariant): void {
    if (!VALID_BACKGROUNDS.has(bg)) return;
    this.currentBackground.set(bg);
  }

  resetBackground(): void {
    const defaultBg = resolveToolDefaultBackground(this.activeToolSlug || undefined, this.activeToolLayout || undefined);
    this.setBackground(defaultBg);
  }

  setReduceTransparency(val: boolean): void {
    this.reduceTransparency.set(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.TRANSPARENCY_KEY, String(val));
      } catch (_) {}
    }
  }

  toggleReduceTransparency(): void {
    this.setReduceTransparency(!this.reduceTransparency());
  }

  setReduceMotion(val: boolean): void {
    this.reduceMotion.set(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.MOTION_KEY, String(val));
      } catch (_) {}
    }
  }

  toggleReduceMotion(): void {
    this.setReduceMotion(!this.reduceMotion());
  }

  setPointerGlowEnabled(val: boolean): void {
    this.pointerGlowEnabled.set(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.POINTER_GLOW_KEY, String(val));
      } catch (_) {}
    }
  }

  togglePointerGlow(): void {
    this.setPointerGlowEnabled(!this.pointerGlowEnabled());
  }

  private resolveEffectiveTheme(): void {
    const mode = this.currentTheme();
    if (mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.effectiveTheme.set('light');
      } else {
        this.effectiveTheme.set('dark');
      }
    } else {
      this.effectiveTheme.set(mode);
    }
  }
}
