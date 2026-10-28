// data-lens.worker.ts - Web Worker for off-thread JSON/YAML/XML formatting, validation, and diffing

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

addEventListener('message', (event: MessageEvent) => {
  const { jobId, type, payload } = event.data;

  if (type === 'CANCEL_JOB') {
    postMessage({ jobId, type, status: 'cancelled' });
    return;
  }

  try {
    if (type === 'FORMAT_DATA') {
      const { text, options, formatId } = payload;
      const result = executeFormat(text, options, formatId);
      postMessage({
        jobId,
        type,
        status: 'success',
        result
      });
      return;
    }

    if (type === 'VALIDATE_DATA') {
      const { text, formatId } = payload;
      const result = executeValidate(text, formatId);
      postMessage({
        jobId,
        type,
        status: 'success',
        result
      });
      return;
    }

    if (type === 'DIFF_DATA') {
      const { original, modified } = payload;
      const result = executeDiff(original, modified);
      postMessage({
        jobId,
        type,
        status: 'success',
        result
      });
      return;
    }
  } catch (err: any) {
    postMessage({
      jobId,
      type,
      status: 'error',
      error: err?.message || 'Worker processing failure',
      errorStack: err?.stack
    });
  }
});

function executeFormat(text: string, options: any, formatId: string = 'json') {
  if (!text || !text.trim()) {
    return { success: true, formatted: '' };
  }

  if (formatId === 'yaml') {
    const parsed = parseYaml(text);
    const formatted = stringifyYaml(parsed, { indent: typeof options?.indent === 'number' ? options.indent : 2 });
    return { success: true, formatted };
  }

  // Default JSON formatting
  const parsed = JSON.parse(text);
  const indent = options?.minify ? 0 : (typeof options?.indent === 'number' ? options.indent : 2);
  const formatted = JSON.stringify(parsed, null, indent);
  return { success: true, formatted, parsed };
}

function executeValidate(text: string, formatId: string = 'json') {
  try {
    if (formatId === 'yaml') {
      parseYaml(text);
    } else {
      JSON.parse(text);
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

function executeDiff(original: string, modified: string) {
  const origLines = (original || '').split('\n');
  const modLines = (modified || '').split('\n');
  return {
    originalLinesCount: origLines.length,
    modifiedLinesCount: modLines.length,
    isIdentical: original === modified
  };
}
