// apps/tool-image-compressor/src/services/size-estimator.service.ts
import { Injectable } from '@angular/core';
import {
  estimateCompressedSize,
  formatEstimateBytes,
  SizeEstimateInput
} from './size-estimator.util';

export {
  estimateCompressedSize,
  formatEstimateBytes,
  type SizeEstimateInput
};

@Injectable({
  providedIn: 'root'
})
export class SizeEstimatorService {
  estimateSize(input: SizeEstimateInput): number | null {
    return estimateCompressedSize(input);
  }

  formatBytes(bytes: number): string {
    return formatEstimateBytes(bytes);
  }
}
