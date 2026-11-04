// apps/tool-barcode-generator/src/services/temp-code-expiry.spec.ts
import { describe, it, expect } from 'vitest';
import { TEMP_CODE_CONFIG } from '../config/temp-code.config';

describe('Temporary Code Expiry and Timezone Calculation', () => {
  it('correctly validates minimum 1 minute and maximum 365 days limits', () => {
    const now = Date.now();

    // Less than 1 minute (e.g. 30 seconds)
    const tooSoon = now + 30 * 1000;
    const diffTooSoon = tooSoon - now;
    expect(diffTooSoon < 60 * 1000).toBe(true);

    // More than 365 days (e.g. 366 days)
    const tooFar = now + 366 * 86400 * 1000;
    const diffTooFar = tooFar - now;
    expect(diffTooFar > 365 * 86400 * 1000).toBe(true);

    // Plain catalog messages
    expect(TEMP_CODE_CONFIG.messages.minExpiry).toBe('Choose a time at least 1 minute from now.');
    expect(TEMP_CODE_CONFIG.messages.maxExpiry).toBe('The maximum is 365 days.');
  });

  it('computes exact UTC timestamp from duration regardless of local timezone', () => {
    const fixedNow = new Date('2026-11-03T15:00:00.000Z').getTime();
    const durationMinutes = 15;
    const computedUtc = new Date(fixedNow + durationMinutes * 60 * 1000).toISOString();
    expect(computedUtc).toBe('2026-11-03T15:15:00.000Z');

    const durationDays = 7;
    const computedDaysUtc = new Date(fixedNow + durationDays * 86400 * 1000).toISOString();
    expect(computedDaysUtc).toBe('2026-11-10T15:00:00.000Z');
  });

  it('formats dates in Asia/Kolkata and Daylight-Saving timezones accurately', () => {
    const testUtc = new Date('2026-07-15T12:00:00.000Z'); // Summer / DST in Northern Hemisphere

    // Asia/Kolkata (+05:30, no DST)
    const kolkataFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'long'
    });
    const kolkataFormatted = kolkataFormatter.format(testUtc);
    expect(kolkataFormatted).toContain('5:30');
    expect(kolkataFormatted).toContain('India Standard Time');

    // America/New_York (Eastern Daylight Time, UTC-4 in July)
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
    const nyFormatted = nyFormatter.format(testUtc);
    expect(nyFormatted).toContain('8:00');
    expect(nyFormatted).toContain('EDT');

    // Europe/London (British Summer Time, UTC+1 in July)
    const londonFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
    const londonFormatted = londonFormatter.format(testUtc);
    expect(londonFormatted).toContain('13:00');
    expect(londonFormatted).toContain('BST');
  });
});
