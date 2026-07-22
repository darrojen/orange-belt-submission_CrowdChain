import { describe, it, expect } from 'vitest';
import { classifyError } from '@/lib/errors';

describe('classifyError', () => {
  it('classifies a missing wallet extension', () => {
    const result = classifyError(new Error('Freighter is not installed'));
    expect(result.kind).toBe('WALLET_NOT_FOUND');
  });

  it('classifies a user-rejected signature request', () => {
    const result = classifyError(new Error('User declined access'));
    expect(result.kind).toBe('USER_REJECTED');
  });

  it('classifies insufficient balance errors', () => {
    const result = classifyError(new Error('tx_insufficient_balance'));
    expect(result.kind).toBe('INSUFFICIENT_BALANCE');
  });

  it('classifies a known contract error by discriminant', () => {
    const result = classifyError(new Error('HostError: Error(Contract, #6)'));
    expect(result.kind).toBe('CONTRACT_ERROR');
    expect(result.message).toMatch(/already ended/i);
  });

  it('falls back to UNKNOWN for unrecognized errors', () => {
    const result = classifyError(new Error('some obscure network blip'));
    expect(result.kind).toBe('UNKNOWN');
  });

  it('handles non-Error thrown values without crashing', () => {
    const result = classifyError('rejected by user');
    expect(result.kind).toBe('USER_REJECTED');
  });
});
