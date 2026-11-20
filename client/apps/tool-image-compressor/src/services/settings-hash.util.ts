// apps/tool-image-compressor/src/services/settings-hash.util.ts
import { CompressionSettings, TransformOp, RotateAngle, FlipDirection } from '../models/compressor.models';

/** Whitelist of supported short keys */
const ALLOWED_KEYS = new Set(['fmt', 't', 'q', 'r', 'tr']);

/** Whitelist of supported format options */
const ALLOWED_FORMATS = new Set(['original', 'webp', 'jpeg', 'jpg', 'png', 'avif', 'tiff']);

/** Whitelist of quality choices */
const ALLOWED_QUALITIES = new Set(['better', 'balanced', 'smallest', 'best', 'best-quality', 'smallest-size']);

/**
 * Encodes non-default or active compression settings into a compact, zero-PII URL hash string.
 * Example format: #s=t:17kb;q:balanced;r:none
 * Zero filenames, dimensions, or payloads are exposed.
 */
export function encodeSettingsToHash(settings: CompressionSettings): string {
  const parts: string[] = [];

  // 1. Format (default is original; only encode if non-original or explicit)
  if (settings.outputFormat && settings.outputFormat !== 'original') {
    const fmt = settings.outputFormat === 'jpeg' ? 'jpg' : settings.outputFormat;
    parts.push(`fmt:${fmt}`);
  }

  // 2. Target size
  if (settings.targetFileSize?.enabled) {
    if (settings.targetFileSize.targetBytes > 0) {
      const bytes = settings.targetFileSize.targetBytes;
      if (bytes >= 1024 * 1024 && bytes % (1024 * 1024) === 0) {
        parts.push(`t:${(bytes / (1024 * 1024)).toFixed(0)}mb`);
      } else if (bytes >= 1024 * 1024) {
        parts.push(`t:${(bytes / (1024 * 1024)).toFixed(1)}mb`);
      } else if (bytes >= 1024 && bytes % 1024 === 0) {
        parts.push(`t:${(bytes / 1024).toFixed(0)}kb`);
      } else if (bytes >= 1024) {
        parts.push(`t:${(bytes / 1024).toFixed(1)}kb`);
      } else {
        parts.push(`t:${bytes}b`);
      }
    } else if (settings.targetFileSize.targetValue && (settings.targetFileSize as any).isPercentageTarget) {
      parts.push(`t:${Math.round(settings.targetFileSize.targetValue)}p`);
    }
  }

  // 3. Quality choice or numeric quality
  const qChoice = (settings as any).qualityChoice;
  if (qChoice === 'better' || qChoice === 'balanced' || qChoice === 'smallest') {
    parts.push(`q:${qChoice}`);
  } else if (settings.quality && settings.quality !== 80 && settings.quality !== 90 && settings.quality !== 60) {
    parts.push(`q:${settings.quality}`);
  } else if (settings.preset === 'best-quality' || settings.quality === 90) {
    parts.push('q:better');
  } else if (settings.preset === 'smallest-size' || settings.quality === 60) {
    parts.push('q:smallest');
  } else if (settings.preset === 'balanced') {
    parts.push('q:balanced');
  } else if (settings.quality && settings.quality !== 80) {
    parts.push(`q:${settings.quality}`);
  }

  // 4. Resize
  if (settings.resize?.enabled) {
    if (settings.resize.mode === 'percentage' && settings.resize.percentage && settings.resize.percentage !== 100) {
      parts.push(`r:${settings.resize.percentage}p`);
    } else if (settings.resize.mode === 'dimensions' && settings.resize.width && settings.resize.height) {
      parts.push(`r:${settings.resize.width}x${settings.resize.height}`);
    } else {
      parts.push('r:none');
    }
  } else {
    parts.push('r:none');
  }

  // 5. Transforms
  if (settings.transforms && settings.transforms.length > 0) {
    const trStrings: string[] = [];
    for (const op of settings.transforms) {
      if (op.type === 'rotate') {
        trStrings.push(`rot${op.angle}`);
      } else if (op.type === 'flip') {
        trStrings.push(op.direction === 'horizontal' ? 'flip' : 'flipv');
      }
    }
    if (trStrings.length > 0) {
      parts.push(`tr:${trStrings.join(',')}`);
    }
  }

  return parts.length > 0 ? `#s=${parts.join(';')}` : '';
}

/**
 * Safely decodes settings from a URL hash string.
 * Whitelist validated. Unknown keys are ignored. Malformed strings safely return null.
 * Clamps out-of-range values. Zero error messages displayed to the user.
 */
export function decodeSettingsFromHash(hash: string): Partial<CompressionSettings> | null {
  if (!hash || typeof hash !== 'string' || !hash.includes('#s=')) {
    return null;
  }

  try {
    const sIndex = hash.indexOf('#s=');
    const raw = hash.substring(sIndex + 3).split('&')[0];
    if (!raw || !raw.trim()) return null;

    const tokens = raw.split(';');
    const result: Partial<CompressionSettings> = {};
    let validTokenFound = false;

    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx <= 0) continue;

      const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
      const val = trimmed.substring(colonIdx + 1).trim();

      // Enforce strict key whitelist: unknown keys are ignored
      if (!ALLOWED_KEYS.has(key)) {
        continue;
      }

      if (key === 'fmt') {
        const lowerVal = val.toLowerCase();
        if (ALLOWED_FORMATS.has(lowerVal)) {
          result.outputFormat = (lowerVal === 'jpg' ? 'jpeg' : lowerVal) as any;
          validTokenFound = true;
        }
      } else if (key === 'q') {
        const lowerVal = val.toLowerCase();
        if (lowerVal === 'better' || lowerVal === 'best' || lowerVal === 'best-quality') {
          (result as any).qualityChoice = 'better';
          result.preset = 'best-quality';
          result.quality = 90;
          validTokenFound = true;
        } else if (lowerVal === 'balanced') {
          (result as any).qualityChoice = 'balanced';
          result.preset = 'balanced';
          result.quality = 80;
          validTokenFound = true;
        } else if (lowerVal === 'smallest' || lowerVal === 'smallest-size') {
          (result as any).qualityChoice = 'smallest';
          result.preset = 'smallest-size';
          result.quality = 60;
          validTokenFound = true;
        } else {
          const q = parseInt(val, 10);
          if (!isNaN(q)) {
            // Clamp between 1 and 100
            const clamped = Math.max(1, Math.min(100, q));
            result.quality = clamped;
            validTokenFound = true;
          }
        }
      } else if (key === 't') {
        const lowerVal = val.toLowerCase();
        // Byte target: e.g. 17kb, 250kb, 1mb, 500b
        const byteMatch = lowerVal.match(/^(\d+(?:\.\d+)?)(b|kb|mb)$/);
        // Percentage target: e.g. 80p or 80%
        const pctMatch = lowerVal.match(/^(\d+(?:\.\d+)?)(?:p|%)$/);

        if (byteMatch) {
          const num = parseFloat(byteMatch[1]);
          const unit = byteMatch[2];
          let bytes = num;
          if (unit === 'kb') bytes = num * 1024;
          if (unit === 'mb') bytes = num * 1024 * 1024;

          // Clamp bytes: minimum 100 B, maximum 100 MB
          const clampedBytes = Math.max(10, Math.min(100 * 1024 * 1024, Math.round(bytes)));
          const targetUnit = unit === 'mb' ? 'MB' : (unit === 'kb' ? 'KB' : 'B');
          result.targetFileSize = {
            enabled: true,
            targetBytes: clampedBytes,
            targetValue: num,
            targetUnit,
            minQuality: 25,
            userDefined: true
          };
          validTokenFound = true;
        } else if (pctMatch) {
          const num = parseFloat(pctMatch[1]);
          // Clamp percentage 1 - 99
          const clampedPct = Math.max(1, Math.min(99, num));
          result.targetFileSize = {
            enabled: true,
            targetBytes: 0,
            targetValue: clampedPct,
            targetUnit: 'KB',
            minQuality: 25,
            userDefined: true,
            isDynamicDefault: false
          };
          (result.targetFileSize as any).isPercentageTarget = true;
          validTokenFound = true;
        }
      } else if (key === 'r') {
        const lowerVal = val.toLowerCase();
        if (lowerVal === 'none') {
          result.resize = {
            enabled: false,
            mode: 'percentage',
            percentage: 100,
            maintainAspectRatio: true,
            preventUpscale: true
          };
          validTokenFound = true;
        } else if (lowerVal.endsWith('p') || lowerVal.startsWith('pct')) {
          const numStr = lowerVal.replace('pct', '').replace('p', '');
          const pct = parseInt(numStr, 10);
          if (!isNaN(pct)) {
            const clamped = Math.max(1, Math.min(100, pct));
            result.resize = {
              enabled: true,
              mode: 'percentage',
              percentage: clamped,
              maintainAspectRatio: true,
              preventUpscale: true
            };
            validTokenFound = true;
          }
        } else if (lowerVal.includes('x')) {
          const [wStr, hStr] = lowerVal.split('x');
          const w = parseInt(wStr, 10);
          const h = parseInt(hStr, 10);
          if (!isNaN(w) && !isNaN(h)) {
            // Clamp dimensions: minimum 1, maximum 16384
            const clampedW = Math.max(1, Math.min(16384, w));
            const clampedH = Math.max(1, Math.min(16384, h));
            result.resize = {
              enabled: true,
              mode: 'dimensions',
              width: clampedW,
              height: clampedH,
              percentage: 100,
              maintainAspectRatio: true,
              preventUpscale: true
            };
            validTokenFound = true;
          }
        }
      } else if (key === 'tr') {
        const sub = val.split(',');
        const transforms: TransformOp[] = [];
        for (const t of sub) {
          const cleanT = t.trim().toLowerCase();
          if (cleanT.startsWith('rot')) {
            const rot = parseInt(cleanT.replace('rot', ''), 10);
            if (rot === 90 || rot === -90 || rot === 180) {
              transforms.push({ type: 'rotate', angle: rot as RotateAngle });
            }
          } else if (cleanT === 'flip' || cleanT === 'fliph') {
            transforms.push({ type: 'flip', direction: 'horizontal' });
          } else if (cleanT === 'flipv') {
            transforms.push({ type: 'flip', direction: 'vertical' });
          }
        }
        if (transforms.length > 0) {
          result.transforms = transforms;
          validTokenFound = true;
        }
      }
    }

    return validTokenFound && Object.keys(result).length > 0 ? result : null;
  } catch {
    return null; // Malformed hash safely ignored
  }
}
