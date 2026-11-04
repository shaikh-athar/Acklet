// apps/tool-barcode-generator/src/config/temp-code.config.ts
import { ExpiryPreset } from '../models/temp-code.models';

export const TEMP_CODE_CONFIG = {
  presets: [
    { id: '15m', label: '15 minutes', seconds: 15 * 60 },
    { id: '1h', label: '1 hour', seconds: 60 * 60 },
    { id: '6h', label: '6 hours', seconds: 6 * 60 * 60 },
    { id: '24h', label: '24 hours', seconds: 24 * 60 * 60 },
    { id: '7d', label: '7 days', seconds: 7 * 24 * 60 * 60 },
    { id: '30d', label: '30 days', seconds: 30 * 24 * 60 * 60 }
  ] as ExpiryPreset[],

  limits: {
    minMinutes: 1,
    minSeconds: 60,
    maxDays: 365,
    maxSeconds: 365 * 24 * 60 * 60,
    maxMessageChars: 500,
    maxUrlChars: 2048,
    maxReferenceChars: 64,
    maxNameChars: 100
  },

  messages: {
    connectionRequired: 'Temporary codes need a connection. Try again later.',
    minExpiry: 'Choose a time at least 1 minute from now.',
    maxExpiry: 'The maximum is 365 days.',
    storageNotice: 'This code is stored on Acklet until it expires and is then deleted.',
    labelNote: 'If you extend the code later, the printed text does not change.',
    phoneQrNote: 'Phones read links best from QR codes.',
    valid: 'Valid',
    expired: 'This code has expired.',
    deactivated: 'This code was deactivated by its owner.',
    notFound: 'This code was not found.',
    rateLimited: 'Too many checks. Try again in a minute.',
    genericError: 'Something went wrong. Try again later.'
  }
};

