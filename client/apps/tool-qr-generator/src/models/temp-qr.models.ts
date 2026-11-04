// client/apps/tool-qr-generator/src/models/temp-qr.models.ts

export type PayloadMode = 'LINK' | 'CODE';
export type TempContentType = 'MESSAGE' | 'LINK' | 'REFERENCE_ONLY';
export type TempCodeStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEACTIVATED';
export type ExpiryMode = 'preset' | 'custom' | 'duration' | 'until';

export interface TempQrRecord {
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

export interface CreateTempQrPayload {
  name: string;
  payloadMode: PayloadMode;
  contentType: TempContentType;
  content?: string;
  reference?: string;
  barcodeFormat: 'qrcode';
  expiresAt?: string;
  durationSeconds?: number;
  showExpiryOnLabel?: boolean;
}

export interface UpdateTempQrPayload {
  action: 'extend' | 'expireNow' | 'rename';
  extensionSeconds?: number;
  newExpiresAt?: string;
  name?: string;
}

export interface ExpiryPreset {
  id: string;
  label: string;
  seconds: number;
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

