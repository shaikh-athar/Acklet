import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalPreferenceService } from './local-preference.service';
import { ToolPreferenceSchema } from '../models/preference.model';

/**
 * Per-tool preference registry.
 * Each tool registers its schema + defaults at bootstrap.
 * Preferences are stored independently per tool slug.
 */
@Injectable({ providedIn: 'root' })
export class ToolPrefsService {
  private readonly local = inject(LocalPreferenceService);

  // Registry of known schemas (tool slug → schema)
  private readonly schemas = new Map<string, ToolPreferenceSchema>();

  // Active signal per tool (lazy loaded on first access)
  private readonly activePrefs = new Map<string, ReturnType<typeof signal<Record<string, any>>>>();

  constructor() {
    // Register built-in tool schemas
    this.register({
      slug: 'json-formatter',
      defaults: { indentation: 2, quoteStyle: 'double', sortKeys: false, theme: 'dark' },
    });
    this.register({
      slug: 'markdown-editor',
      defaults: { previewMode: 'split', fontSize: 14, wordWrap: true },
    });
    this.register({
      slug: 'regex-tester',
      defaults: { flags: 'g', patternHistory: [] },
    });
    this.register({
      slug: 'color-picker',
      defaults: { format: 'hex', paletteStyle: 'material' },
    });
    this.register({
      slug: 'base64-encoder',
      defaults: { mode: 'encode', charset: 'utf-8' },
    });
    this.register({
      slug: 'url-encoder',
      defaults: { mode: 'encode', encoding: 'rfc3986' },
    });
    this.register({
      slug: 'jwt-debugger',
      defaults: { verifySignature: false, showHeader: true },
    });
  }

  /** Register a tool's preference schema. Idempotent. */
  register(schema: ToolPreferenceSchema): void {
    this.schemas.set(schema.slug, schema);
  }

  /** Get the reactive preferences signal for a given tool slug */
  getPrefs(slug: string): ReturnType<typeof signal<Record<string, any>>> {
    if (!this.activePrefs.has(slug)) {
      const defaults = this.schemas.get(slug)?.defaults ?? {};
      const stored = this.local.getToolPrefs(slug);
      const merged = { ...defaults, ...stored };
      const sig = signal<Record<string, any>>(merged);
      this.activePrefs.set(slug, sig);
    }
    return this.activePrefs.get(slug)!;
  }

  /** Update a single preference key for a tool */
  set(slug: string, key: string, value: any): void {
    const sig = this.getPrefs(slug);
    const updated = { ...sig(), [key]: value };
    sig.set(updated);
    this.local.saveToolPrefs(slug, updated);
  }

  /** Batch update preferences for a tool */
  patch(slug: string, patch: Record<string, any>): void {
    const sig = this.getPrefs(slug);
    const updated = { ...sig(), ...patch };
    sig.set(updated);
    this.local.saveToolPrefs(slug, updated);
  }

  /** Reset a tool's preferences to registered defaults */
  reset(slug: string): void {
    const defaults = this.schemas.get(slug)?.defaults ?? {};
    const sig = this.getPrefs(slug);
    sig.set({ ...defaults });
    this.local.saveToolPrefs(slug, defaults);
  }

  /** Get a computed signal for a specific key in a tool's preferences */
  getKey<T>(slug: string, key: string): () => T {
    const sig = this.getPrefs(slug);
    return computed(() => sig()[key] as T);
  }

  getSchema(slug: string): ToolPreferenceSchema | undefined {
    return this.schemas.get(slug);
  }
}
