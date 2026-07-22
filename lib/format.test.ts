import { describe, it, expect } from 'vitest';
import { shortenAddress, formatAmount, progressPercent, isDeadlinePassed } from '@/lib/format';

describe('shortenAddress', () => {
  it('shortens a long Stellar address', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
    expect(shortenAddress(addr)).toBe('GABCD…RSTUV');
  });

  it('leaves short strings untouched', () => {
    expect(shortenAddress('short')).toBe('short');
  });
});

describe('formatAmount', () => {
  it('formats a numeric string with thousands separators', () => {
    expect(formatAmount('1234567')).toBe('1,234,567');
  });

  it('returns 0 for non-numeric input', () => {
    expect(formatAmount('not-a-number')).toBe('0');
  });
});

describe('progressPercent', () => {
  it('computes percentage of goal reached', () => {
    expect(progressPercent(250, 1000)).toBe(25);
  });

  it('clamps above 100%', () => {
    expect(progressPercent(1500, 1000)).toBe(100);
  });

  it('returns 0 when goal is zero or invalid', () => {
    expect(progressPercent(100, 0)).toBe(0);
  });
});

describe('isDeadlinePassed', () => {
  it('returns true when current ledger is past the deadline', () => {
    expect(isDeadlinePassed(1000, 999)).toBe(true);
  });

  it('returns false when the deadline has not been reached', () => {
    expect(isDeadlinePassed(500, 999)).toBe(false);
  });
});
