// apps/tool-file-converter/src/services/adapters/subtitle-conversion.adapter.ts
import { Injectable } from '@angular/core';
import { IConversionAdapter } from '../adapter.interface';
import { ConversionOptions, ConversionResult, ExecutionMode, FileCategory, FormatDescriptor } from '../../models/converter.models';

const SUPPORTED_OUTPUTS_MAP: Record<string, FormatDescriptor[]> = {
  srt: [
    { format: 'vtt', label: 'WebVTT (.vtt)', extension: 'vtt', mimeType: 'text/vtt', category: 'subtitle', executionMode: 'browser', description: 'Standard HTML5 and web video subtitle format', lossless: true }
  ],
  vtt: [
    { format: 'srt', label: 'SubRip (.srt)', extension: 'srt', mimeType: 'text/plain', category: 'subtitle', executionMode: 'browser', description: 'Universal media player subtitle format', lossless: true }
  ]
};

interface SubtitleCue {
  id?: string;
  startTime: string; // HH:MM:SS.mmm or HH:MM:SS,mmm
  endTime: string;
  settings?: string;
  lines: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SubtitleConversionAdapter implements IConversionAdapter {
  readonly id = 'subtitle-adapter';
  readonly name = 'Subtitle Conversion Adapter';
  readonly category: FileCategory = 'subtitle';
  readonly executionMode: ExecutionMode = 'browser';

  canConvert(sourceFormat: string, targetFormat: string): boolean {
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();
    const available = SUPPORTED_OUTPUTS_MAP[src];
    if (!available) return false;
    return available.some(out => out.format === tgt);
  }

  getSupportedOutputs(sourceFormat: string): FormatDescriptor[] {
    const src = sourceFormat.toLowerCase();
    return SUPPORTED_OUTPUTS_MAP[src] || [];
  }

  async convert(
    file: File,
    sourceFormat: string,
    targetFormat: string,
    options?: ConversionOptions,
    onProgress?: (progress: number, stage?: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult> {
    const startTime = performance.now();
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(15, 'Reading subtitle text...');
    const rawText = await file.text();

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(45, 'Parsing cues and timestamp synchronization...');

    let convertedText = '';

    if (src === 'srt' && tgt === 'vtt') {
      convertedText = this.convertSrtToVtt(rawText);
    } else if (src === 'vtt' && tgt === 'srt') {
      convertedText = this.convertVttToSrt(rawText);
    } else {
      throw new Error(`Unsupported subtitle conversion direction: ${sourceFormat} to ${targetFormat}`);
    }

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(85, 'Validating output formatting...');

    const targetMime = tgt === 'vtt' ? 'text/vtt;charset=utf-8' : 'text/plain;charset=utf-8';
    const outputBlob = new Blob([convertedText], { type: targetMime });

    onProgress?.(100, 'Subtitle conversion complete!');

    const baseName = this.extractBaseName(file.name);
    const outputExtension = tgt;
    const outputFileName = `${baseName}.${outputExtension}`;

    return {
      success: true,
      blob: outputBlob,
      outputFormat: tgt,
      outputExtension,
      outputFileName,
      outputSize: outputBlob.size,
      durationMs: Math.round(performance.now() - startTime)
    };
  }

  private convertSrtToVtt(srtText: string): string {
    const normalized = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const blocks = normalized.split(/\n\n+/);

    const cues: string[] = [];
    cues.push('WEBVTT - Converted by Acklet Universal File Converter\n');

    let cueCount = 0;

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trimEnd());
      if (lines.length === 0) continue;

      // Check if line 0 is a number and line 1 is timestamp
      let timestampIndex = -1;
      let cueId = '';

      if (this.isTimestampLine(lines[0])) {
        timestampIndex = 0;
      } else if (lines.length > 1 && this.isTimestampLine(lines[1])) {
        cueId = lines[0];
        timestampIndex = 1;
      }

      if (timestampIndex === -1) continue;

      const rawTimestamp = lines[timestampIndex];
      // Convert SRT comma millisecond to VTT period millisecond: 00:01:23,456 --> 00:01:25,678 to 00:01:23.456 --> 00:01:25.678
      const vttTimestamp = rawTimestamp.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

      const textLines = lines.slice(timestampIndex + 1);
      if (textLines.length === 0) continue;

      cueCount++;

      let cueBlock = '';
      if (cueId) {
        cueBlock += `${cueId}\n`;
      }
      cueBlock += `${vttTimestamp}\n${textLines.join('\n')}`;
      cues.push(cueBlock);
    }

    if (cueCount === 0) {
      throw new Error('No valid subtitle cues or timestamps found in the uploaded SRT file.');
    }

    return cues.join('\n\n') + '\n';
  }

  private convertVttToSrt(vttText: string): string {
    const normalized = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const blocks = normalized.split(/\n\n+/);

    const srtBlocks: string[] = [];
    let cueIndex = 1;

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trimEnd());
      if (lines.length === 0) continue;

      // Skip WEBVTT header or NOTE comment blocks
      if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE')) {
        continue;
      }

      let timestampIndex = -1;
      if (this.isVttTimestampLine(lines[0])) {
        timestampIndex = 0;
      } else if (lines.length > 1 && this.isVttTimestampLine(lines[1])) {
        timestampIndex = 1;
      }

      if (timestampIndex === -1) continue;

      const rawTimestamp = lines[timestampIndex];
      const srtTimestamp = this.normalizeVttTimestampToSrt(rawTimestamp);
      if (!srtTimestamp) continue;

      const textLines = lines.slice(timestampIndex + 1);
      if (textLines.length === 0) continue;

      // Strip webvtt voice/styling tags if needed or keep standard formatting
      const cleanTextLines = textLines.map(line => line.replace(/<v[^>]*>/g, '').replace(/<\/v>/g, ''));

      srtBlocks.push(`${cueIndex}\n${srtTimestamp}\n${cleanTextLines.join('\n')}`);
      cueIndex++;
    }

    if (srtBlocks.length === 0) {
      throw new Error('No valid subtitle cues or timestamps found in the uploaded WebVTT file.');
    }

    return srtBlocks.join('\n\n') + '\n';
  }

  private isTimestampLine(line: string): boolean {
    return /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line);
  }

  private isVttTimestampLine(line: string): boolean {
    return /(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s*-->\s*(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/.test(line);
  }

  private normalizeVttTimestampToSrt(line: string): string | null {
    // WebVTT timestamp line may contain cue settings: 00:00.000 --> 00:02.000 position:50%
    const match = line.match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
    if (!match) return null;

    const start = this.padVttTime(match[1]).replace('.', ',');
    const end = this.padVttTime(match[2]).replace('.', ',');

    return `${start} --> ${end}`;
  }

  private padVttTime(timeStr: string): string {
    // If MM:SS.mmm (no hours), prepend 00:
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return `00:${timeStr}`;
    }
    return timeStr;
  }

  private extractBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
  }
}

