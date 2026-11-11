// apps/tool-color-studio/src/models/gradient-repair.models.ts
import { GradientConfig, GradientStop } from './color.models';

export type RepairStrategy = 'balanced' | 'smooth' | 'harmony' | 'contrast' | 'custom';

export interface CustomRepairOptions {
  stopPositions: boolean;
  colorTransitions: boolean;
  colorHarmony: boolean;
  balanceBrightnessSaturation: boolean;
  gradientAngle: boolean;
  cssConfig: boolean;
}

export type FindingCategory = 'position' | 'color' | 'harmony' | 'transition' | 'config';
export type FindingSeverity = 'error' | 'warning' | 'suggestion' | 'info';
export type HealthStatus = 'good' | 'needs-attention' | 'improved' | 'valid';

export interface GradientFinding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  message: string;
  originalValue?: string;
  suggestedValue?: string;
  stopIndex?: number;
  stopId?: string;
  autoFixable: boolean;
}

export interface GradientAnalysisSummary {
  stopPositionsStatus: HealthStatus;
  stopPositionsCount: number;
  transitionsStatus: HealthStatus;
  transitionsCount: number;
  colorHarmonyStatus: HealthStatus;
  colorHarmonyLabel: string;
  cssValidityStatus: HealthStatus;
  overallStatus: HealthStatus;
  hasActionableIssues: boolean;
}

export interface GradientAnalysisResult {
  isValid: boolean;
  findings: GradientFinding[];
  summary: GradientAnalysisSummary;
  analyzedAt: number;
  detectedHarmony?: string;
  averageDeltaE?: number;
  maxDeltaE?: number;
  isHardTransitionPresent?: boolean;
}

export interface GradientRepairResult {
  strategy: RepairStrategy;
  originalConfig: GradientConfig;
  repairedConfig: GradientConfig;
  analysis: GradientAnalysisResult;
  changesMade: string[];
  customOptions?: CustomRepairOptions;
}

