// apps/tool-image-compressor/src/services/wasm-codecs.adapter.ts
/**
 * Advanced WebAssembly Codec Adapter for Acklet Image Compressor (Phase 1).
 *
 * Provides specialized, privacy-preserving, 100% in-browser WebAssembly encoding
 * via MozJPEG (progressive JPEG with Trellis quantization), Oxipng (multi-filter
 * lossless PNG optimization), and libwebp (high-efficiency lossy/lossless WebP).
 *
 * Operates with graceful fallback: if WASM initialization or execution is unavailable
 * or fails, callers fall back immediately to native browser canvas encoding.
 */

export interface MozJpegOptions {
  quality?: number; // 1 to 100
  baseline?: boolean;
  arithmetic?: boolean;
  progressive?: boolean;
  optimize_coding?: boolean;
  smoothing?: number;
  trellis_multipass?: boolean;
  trellis_opt_zero?: boolean;
  trellis_opt_table?: boolean;
  trellis_loops?: number;
  auto_subsample?: boolean;
  chroma_subsample?: number; // 1 = 4:4:4, 2 = 4:2:0
}

export interface WebpOptions {
  quality?: number; // 1 to 100
  lossless?: number; // 0 = lossy, 1 = lossless
  method?: number; // 0 to 6 (default 4)
  exact?: number;
  alpha_compression?: number;
  alpha_quality?: number;
}

export interface OxipngOptions {
  level?: number; // 1 to 6 (default 2)
  interlace?: boolean;
  optimiseAlpha?: boolean;
}

export interface CodecCapabilities {
  name: string;
  mimeType: string;
  isWasmAvailable: boolean;
  supportsLossless: boolean;
  supportsQuality: boolean;
  supportsEffort: boolean;
  supportsProgressive: boolean;
  encoderVersion: string;
}

export interface CodecDiagnostics {
  initialized: {
    mozjpeg: boolean;
    webp: boolean;
    oxipng: boolean;
  };
  encodeCounts: {
    mozjpeg: number;
    webp: number;
    oxipng: number;
    fallbacks: number;
  };
  lastError: {
    mozjpeg?: string;
    webp?: string;
    oxipng?: string;
  };
}

class WasmCodecsAdapter {
  private mozjpegModule: any = null;
  private webpModule: any = null;
  private oxipngModule: any = null;

  private mozjpegInitPromise: Promise<boolean> | null = null;
  private webpInitPromise: Promise<boolean> | null = null;
  private oxipngInitPromise: Promise<boolean> | null = null;

  private diagnostics: CodecDiagnostics = {
    initialized: { mozjpeg: false, webp: false, oxipng: false },
    encodeCounts: { mozjpeg: 0, webp: 0, oxipng: 0, fallbacks: 0 },
    lastError: {}
  };

  /**
   * Checks whether the current runtime environment supports WebAssembly.
   */
  public isWasmSupported(): boolean {
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  }

  /**
   * Detects whether running inside Node.js / Vitest test environment.
   */
  private isNodeEnv(): boolean {
    return typeof process !== 'undefined' &&
      process.versions != null &&
      process.versions.node != null &&
      typeof window === 'undefined';
  }

  /**
   * Helper to locate WASM binary on disk when running in Node.js / Vitest test runner.
   */
  private async resolveNodeWasm(subpath: string): Promise<WebAssembly.Module | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.resolve('node_modules', subpath),
        path.resolve('client', 'node_modules', subpath)
      ];
      const wasmPath = candidates.find(p => fs.existsSync(p));
      if (!wasmPath) return null;
      const wasmBuf = fs.readFileSync(wasmPath);
      return await WebAssembly.compile(wasmBuf);
    } catch {
      return null;
    }
  }

  /**
   * Initializes MozJPEG WASM module.
   */
  public async initMozJpeg(): Promise<boolean> {
    if (this.diagnostics.initialized.mozjpeg) return true;
    if (this.mozjpegInitPromise) return this.mozjpegInitPromise;

    this.mozjpegInitPromise = (async () => {
      try {
        if (!this.isWasmSupported()) return false;

        const jpegMod = await import('@jsquash/jpeg/encode.js');
        if (this.isNodeEnv()) {
          const compiled = await this.resolveNodeWasm('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm');
          if (compiled) {
            await jpegMod.init(compiled);
          } else {
            await jpegMod.init();
          }
        } else {
          await jpegMod.init();
        }

        this.mozjpegModule = jpegMod;
        this.diagnostics.initialized.mozjpeg = true;
        return true;
      } catch (err: any) {
        this.diagnostics.lastError.mozjpeg = err?.message || String(err);
        return false;
      }
    })();

    return this.mozjpegInitPromise;
  }

  /**
   * Initializes WebP WASM module.
   */
  public async initWebp(): Promise<boolean> {
    if (this.diagnostics.initialized.webp) return true;
    if (this.webpInitPromise) return this.webpInitPromise;

    this.webpInitPromise = (async () => {
      try {
        if (!this.isWasmSupported()) return false;

        const webpMod = await import('@jsquash/webp/encode.js');
        if (this.isNodeEnv()) {
          const compiled = await this.resolveNodeWasm('@jsquash/webp/codec/enc/webp_enc_simd.wasm');
          if (compiled) {
            await webpMod.init(compiled);
          } else {
            await webpMod.init();
          }
        } else {
          await webpMod.init();
        }

        this.webpModule = webpMod;
        this.diagnostics.initialized.webp = true;
        return true;
      } catch (err: any) {
        this.diagnostics.lastError.webp = err?.message || String(err);
        return false;
      }
    })();

    return this.webpInitPromise;
  }

  /**
   * Initializes Oxipng WASM module.
   */
  public async initOxipng(): Promise<boolean> {
    if (this.diagnostics.initialized.oxipng) return true;
    if (this.oxipngInitPromise) return this.oxipngInitPromise;

    this.oxipngInitPromise = (async () => {
      try {
        if (!this.isWasmSupported()) return false;

        const oxipngMod = await import('@jsquash/oxipng/optimise.js');
        if (this.isNodeEnv()) {
          const compiled = await this.resolveNodeWasm('@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm');
          if (compiled) {
            await oxipngMod.init(compiled);
          } else {
            await oxipngMod.init();
          }
        } else {
          await oxipngMod.init();
        }

        this.oxipngModule = oxipngMod;
        this.diagnostics.initialized.oxipng = true;
        return true;
      } catch (err: any) {
        this.diagnostics.lastError.oxipng = err?.message || String(err);
        return false;
      }
    })();

    return this.oxipngInitPromise;
  }

  /**
   * Encodes RGBA ImageData using MozJPEG WebAssembly.
   * Returns ArrayBuffer on success, or null on failure.
   */
  public async encodeMozJpeg(
    data: ImageData,
    options: MozJpegOptions = {},
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    const ready = await this.initMozJpeg();
    if (!ready || !this.mozjpegModule) {
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }

    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    try {
      const encodeFn = this.mozjpegModule.default || this.mozjpegModule.encode;
      const q = Math.max(1, Math.min(100, Math.round(options.quality ?? 80)));

      const mozOptions = {
        quality: q,
        baseline: Boolean(options.baseline),
        arithmetic: Boolean(options.arithmetic),
        progressive: options.progressive !== false, // default true
        optimize_coding: options.optimize_coding !== false, // default true
        smoothing: options.smoothing ?? 0,
        trellis_multipass: options.trellis_multipass !== false, // default true
        trellis_opt_zero: options.trellis_opt_zero !== false, // default true
        trellis_opt_table: options.trellis_opt_table !== false, // default true
        trellis_loops: options.trellis_loops ?? 1,
        auto_subsample: options.auto_subsample !== false,
        chroma_subsample: options.chroma_subsample ?? 2 // 2 = 4:2:0, 1 = 4:4:4
      };

      const result: ArrayBuffer = await encodeFn(data, mozOptions);
      if (result && result.byteLength > 0) {
        this.diagnostics.encodeCounts.mozjpeg++;
        return result;
      }
      return null;
    } catch (err: any) {
      this.diagnostics.lastError.mozjpeg = err?.message || String(err);
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }
  }

  /**
   * Encodes RGBA ImageData using WebP WebAssembly.
   * Returns ArrayBuffer on success, or null on failure.
   */
  public async encodeWebp(
    data: ImageData,
    options: WebpOptions = {},
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    const ready = await this.initWebp();
    if (!ready || !this.webpModule) {
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }

    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    try {
      const encodeFn = this.webpModule.default || this.webpModule.encode;
      const q = Math.max(1, Math.min(100, Math.round(options.quality ?? 80)));
      const isLossless = options.lossless === 1 || q === 100;

      const webpOptions = {
        quality: q,
        lossless: isLossless ? 1 : 0,
        method: options.method ?? 4, // 4 balances speed and compression
        exact: options.exact ?? 0,
        alpha_compression: options.alpha_compression ?? 1,
        alpha_quality: options.alpha_quality ?? 100
      };

      const result: ArrayBuffer = await encodeFn(data, webpOptions);
      if (result && result.byteLength > 0) {
        this.diagnostics.encodeCounts.webp++;
        return result;
      }
      return null;
    } catch (err: any) {
      this.diagnostics.lastError.webp = err?.message || String(err);
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }
  }

  /**
   * Optimizes a PNG binary buffer using Oxipng WebAssembly.
   * Returns ArrayBuffer on success, or null on failure.
   */
  public async optimiseOxipng(
    data: ArrayBuffer | Uint8Array,
    options: OxipngOptions = {},
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    const ready = await this.initOxipng();
    if (!ready || !this.oxipngModule) {
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }

    if (abortSignal?.aborted) throw new Error('Encoding cancelled by user.');

    try {
      const optimiseFn = this.oxipngModule.default || this.oxipngModule.optimise;
      const oxiOptions = {
        level: options.level ?? 2, // level 2 is fast and captures ~90% max compression
        interlace: Boolean(options.interlace),
        optimiseAlpha: options.optimiseAlpha !== false
      };

      // Ensure clean, non-shared ArrayBuffer slice to avoid rust unwrap_throw
      let cleanBuf: ArrayBuffer;
      if (data instanceof Uint8Array) {
        cleanBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      } else {
        cleanBuf = (data as ArrayBuffer).slice(0);
      }

      const result: ArrayBuffer = await optimiseFn(cleanBuf, oxiOptions);
      if (result && result.byteLength > 0) {
        this.diagnostics.encodeCounts.oxipng++;
        return result;
      }
      return null;
    } catch (err: any) {
      this.diagnostics.lastError.oxipng = err?.message || String(err);
      this.diagnostics.encodeCounts.fallbacks++;
      return null;
    }
  }

  /**
   * Returns reported capabilities for a specific format.
   */
  public getCapabilities(mimeType: string): CodecCapabilities {
    const isWasm = this.isWasmSupported();

    switch (mimeType) {
      case 'image/jpeg':
        return {
          name: 'MozJPEG WASM',
          mimeType: 'image/jpeg',
          isWasmAvailable: isWasm,
          supportsLossless: false,
          supportsQuality: true,
          supportsEffort: true,
          supportsProgressive: true,
          encoderVersion: 'MozJPEG v4.0.3 (WASM)'
        };
      case 'image/webp':
        return {
          name: 'libwebp WASM',
          mimeType: 'image/webp',
          isWasmAvailable: isWasm,
          supportsLossless: true,
          supportsQuality: true,
          supportsEffort: true,
          supportsProgressive: false,
          encoderVersion: 'libwebp v1.3.0 (WASM)'
        };
      case 'image/png':
        return {
          name: 'Oxipng WASM + Wu Quantizer',
          mimeType: 'image/png',
          isWasmAvailable: isWasm,
          supportsLossless: true,
          supportsQuality: true, // via palette reduction
          supportsEffort: true, // via Oxipng level 1-6
          supportsProgressive: true, // interlacing supported
          encoderVersion: 'Oxipng v9.0.0 (WASM)'
        };
      case 'image/avif':
        return {
          name: 'Canvas AVIF / Evaluated AOMedia',
          mimeType: 'image/avif',
          isWasmAvailable: false, // native browser canvas or WebP fallback
          supportsLossless: true,
          supportsQuality: true,
          supportsEffort: false,
          supportsProgressive: false,
          encoderVersion: 'Native Browser Canvas'
        };
      default:
        return {
          name: 'Canvas / Decoder Fallback',
          mimeType,
          isWasmAvailable: false,
          supportsLossless: true,
          supportsQuality: false,
          supportsEffort: false,
          supportsProgressive: false,
          encoderVersion: 'Acklet Custom Decoders'
        };
    }
  }

  /**
   * Diagnostic telemetry for tracking encoder usage and performance.
   */
  public getDiagnostics(): CodecDiagnostics {
    return {
      initialized: { ...this.diagnostics.initialized },
      encodeCounts: { ...this.diagnostics.encodeCounts },
      lastError: { ...this.diagnostics.lastError }
    };
  }
}

export const wasmCodecs = new WasmCodecsAdapter();
