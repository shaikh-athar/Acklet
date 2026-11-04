// apps/tool-barcode-generator/src/models/temp-code.models.ts

export type PayloadMode = 'LINK' | 'CODE';
export type TempContentType = 'MESSAGE' | 'LINK' | 'REFERENCE_ONLY';
export type TempCodeStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEACTIVATED';
export type ExpiryMode = 'preset' | 'custom' | 'duration' | 'until';

export interface TempCodeRecord {
  id: string;
  batchId?: string;
  name: string;
  token: string;
  tokenHash: string;
  verifyUrl: string;
  payload: string;
  payloadMode: PayloadMode;
  contentType: TempContentType;
  content: string | null;
  reference: string | null;
  barcodeFormat: string;
  showExpiryOnLabel: boolean;
  createdAt: string;
  expiresAt: string;
  status: TempCodeStatus;
  remainingSeconds: number;
  checkCount: number;
  lastCheckedAt: string | null;
  ownerToken?: string;
}

export interface CreateTempCodePayload {
  name: string;
  payloadMode: PayloadMode;
  contentType: TempContentType;
  content?: string;
  reference?: string;
  barcodeFormat: string;
  expiresAt?: string;
  durationSeconds?: number;
  showExpiryOnLabel?: boolean;
}

export interface UpdateTempCodePayload {
  action: 'extend' | 'expireNow' | 'rename';
  extensionSeconds?: number;
  newExpiresAt?: string;
  name?: string;
}

export interface TempCodeVerifyResult {
  status: 'VALID' | 'EXPIRED' | 'DEACTIVATED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'ERROR';
  expiresAt?: string;
  remainingSeconds?: number;
  payloadMode?: PayloadMode;
  contentType?: TempContentType;
  content?: string;
  reference?: string;
  barcodeFormat?: string;
  name?: string;
}

export interface ExpiryPreset {
  id: string;
  label: string;
  seconds: number;
}

export interface BatchItemPayload {
  name?: string;
  content?: string;
  reference?: string;
}

export interface BatchCreateTempCodePayload {
  items: BatchItemPayload[];
  idempotencyKey?: string;
  payloadMode: PayloadMode;
  contentType: TempContentType;
  barcodeFormat: string;
  expiresAt?: string;
  durationSeconds?: number;
  showExpiryOnLabel?: boolean;
}

export interface BatchTempCodeResult {
  batchId: string;
  items: TempCodeRecord[];
  totalCount: number;
  expiresAt: string;
  ownerToken?: string;
}
