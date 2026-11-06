// apps/tool-file-converter/src/services/adapter.interface.ts
import { ConversionOptions, ConversionResult, ExecutionMode, FileCategory, FormatDescriptor } from '../models/converter.models';

export interface IConversionAdapter {
  readonly id: string;
  readonly name: string;
  readonly category: FileCategory;
  readonly executionMode: ExecutionMode;

  /**
   * Returns true if this adapter can transform files from sourceFormat to targetFormat.
   */
  canConvert(sourceFormat: string, targetFormat: string): boolean;

  /**
   * Returns list of currently supported and verified target formats for the given source format.
   * Note: Only return formats that are tested and active.
   */
  getSupportedOutputs(sourceFormat: string): FormatDescriptor[];

  /**
   * Executes the file conversion asynchronously.
   */
  convert(
    file: File,
    sourceFormat: string,
    targetFormat: string,
    options?: ConversionOptions,
    onProgress?: (progress: number, stage?: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult>;
}

