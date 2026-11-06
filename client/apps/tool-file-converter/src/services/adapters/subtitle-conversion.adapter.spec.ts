// apps/tool-file-converter/src/services/adapters/subtitle-conversion.adapter.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SubtitleConversionAdapter } from './subtitle-conversion.adapter';

function createTextFile(text: string, name: string): File {
  return new File([text], name, { type: 'text/plain' });
}

describe('SubtitleConversionAdapter', () => {
  let adapter: SubtitleConversionAdapter;

  beforeEach(() => {
    adapter = new SubtitleConversionAdapter();
  });

  it('should declare support for srt -> vtt and vtt -> srt', () => {
    expect(adapter.canConvert('srt', 'vtt')).toBe(true);
    expect(adapter.canConvert('vtt', 'srt')).toBe(true);
    expect(adapter.canConvert('srt', 'mp3')).toBe(false);
  });

  describe('SRT to VTT Conversion', () => {
    it('should convert SRT timestamps with commas to VTT timestamps with periods', async () => {
      const srt = `1\n00:01:23,456 --> 00:01:25,789\nHello from Acklet!\n\n2\n00:01:26,000 --> 00:01:30,123\nSecond subtitle line.`;
      const file = createTextFile(srt, 'sample.srt');

      const result = await adapter.convert(file, 'srt', 'vtt');

      expect(result.success).toBe(true);
      expect(result.outputExtension).toBe('vtt');
      expect(result.outputFileName).toBe('sample.vtt');

      const text = await result.blob!.text();
      expect(text).toContain('WEBVTT');
      expect(text).toContain('00:01:23.456 --> 00:01:25.789');
      expect(text).toContain('Hello from Acklet!');
      expect(text).toContain('00:01:26.000 --> 00:01:30.123');
      expect(text).toContain('Second subtitle line.');
    });

    it('should preserve multi-line dialogue and formatting tags', async () => {
      const srt = `1\n00:00:01,000 --> 00:00:04,000\n<b>Speaker 1:</b> Welcome!\n<i>Speaker 2:</i> Thanks.`;
      const file = createTextFile(srt, 'formatted.srt');

      const result = await adapter.convert(file, 'srt', 'vtt');
      const text = await result.blob!.text();

      expect(text).toContain('<b>Speaker 1:</b> Welcome!');
      expect(text).toContain('<i>Speaker 2:</i> Thanks.');
    });
  });

  describe('VTT to SRT Conversion', () => {
    it('should strip WEBVTT header and normalize timestamps to comma syntax with sequential cue numbers', async () => {
      const vtt = `WEBVTT - Video Title\n\n00:02:10.500 --> 00:02:15.200\nFirst line in WebVTT.\n\n00:02:16.100 --> 00:02:20.900\nSecond line in WebVTT.`;
      const file = createTextFile(vtt, 'movie.vtt');

      const result = await adapter.convert(file, 'vtt', 'srt');

      expect(result.success).toBe(true);
      expect(result.outputExtension).toBe('srt');
      expect(result.outputFileName).toBe('movie.srt');

      const text = await result.blob!.text();
      expect(text).not.toContain('WEBVTT');
      expect(text).toContain('1\n00:02:10,500 --> 00:02:15,200\nFirst line in WebVTT.');
      expect(text).toContain('2\n00:02:16,100 --> 00:02:20,900\nSecond line in WebVTT.');
    });

    it('should pad short MM:SS.mmm VTT timestamps with 00: hours prefix', async () => {
      const vtt = `WEBVTT\n\n01:20.300 --> 01:25.800\nShort timestamp cue.`;
      const file = createTextFile(vtt, 'short.vtt');

      const result = await adapter.convert(file, 'vtt', 'srt');
      const text = await result.blob!.text();

      expect(text).toContain('00:01:20,300 --> 00:01:25,800');
    });
  });
});

