// apps/tool-barcode-generator/src/services/barcode-engine.adapter.ts
import { Injectable, Optional, Inject } from '@angular/core';
import {
  BarcodeDesignOptions,
  FormatPerOptions,
  BarcodeValidationResult,
  BarcodeRenderResult
} from '../models/barcode.models';
import { BARCODE_CATALOG } from '../config/barcode-catalog.config';
import { ValidatorService } from './validator.service';
import { RenderService } from './render.service';
import { BarcodeCheckDigitService } from './check-digit.service';

export interface BarcodeRenderRequest {
  format: string;
  value: string;
  design: BarcodeDesignOptions;
  formatOptions: FormatPerOptions;
}

export type { BarcodeRenderResult };

export interface IBarcodeEngine {
  renderToSvg(request: BarcodeRenderRequest): Promise<BarcodeRenderResult>;
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeEngineAdapter implements IBarcodeEngine {
  private validatorService: ValidatorService;
  private renderService: RenderService;

  constructor(
    @Optional() @Inject(ValidatorService) checkDigitServiceOrValidator?: any,
    @Optional() @Inject(RenderService) renderService?: RenderService
  ) {
    if (checkDigitServiceOrValidator instanceof ValidatorService && renderService) {
      this.validatorService = checkDigitServiceOrValidator;
      this.renderService = renderService;
    } else if (checkDigitServiceOrValidator instanceof BarcodeCheckDigitService) {
      this.validatorService = new ValidatorService(checkDigitServiceOrValidator);
      this.renderService = renderService || new RenderService();
    } else if (checkDigitServiceOrValidator instanceof ValidatorService) {
      this.validatorService = checkDigitServiceOrValidator;
      this.renderService = renderService || new RenderService();
    } else {
      this.validatorService = new ValidatorService();
      this.renderService = renderService || new RenderService();
    }
  }

  validateInput(
    format: string,
    rawInput: string,
    options: FormatPerOptions = {}
  ): BarcodeValidationResult {
    return this.validatorService.validate(format, rawInput, options);
  }

  async renderToSvg(request: BarcodeRenderRequest): Promise<BarcodeRenderResult> {
    const item = BARCODE_CATALOG[request.format];
    if (!item) {
      throw new Error(`Format ${request.format} not found in catalog.`);
    }

    const validation = this.validateInput(request.format, request.value, request.formatOptions);
    const cleanValue = validation.cleanValue || request.value;
    const displayValue = validation.displayValue || request.value;

    return this.renderService.render(
      item,
      cleanValue,
      displayValue,
      request.design,
      request.formatOptions
    );
  }
}
