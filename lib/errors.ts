import type { AppError } from '@/types/campaign';

/**
 * Wallet SDKs and Soroban RPC don't share one error shape, so failures are
 * classified by matching known substrings against the error message. This
 * covers the required categories (wallet not found, user rejection,
 * insufficient balance) plus the crowdfunding contract's own Error enum.
 */
export function classifyError(err: unknown): AppError {
  const raw = extractMessage(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('not installed') ||
    lower.includes('not detected') ||
    lower.includes('no wallet') ||
    lower.includes('is not available')
  ) {
    return {
      kind: 'WALLET_NOT_FOUND',
      message: 'No compatible wallet extension was found. Install Freighter, xBull, or another supported wallet.',
    };
  }

  if (
    lower.includes('declined') ||
    lower.includes('rejected') ||
    lower.includes('user cancelled') ||
    lower.includes('user canceled') ||
    lower.includes('permission denied')
  ) {
    return {
      kind: 'USER_REJECTED',
      message: 'The request was rejected in your wallet. Nothing was sent.',
    };
  }

  if (
    lower.includes('insufficient balance') ||
    lower.includes('insufficient funds') ||
    lower.includes('tx_insufficient_balance') ||
    lower.includes('underfunded') ||
    lower.includes('op_underfunded')
  ) {
    return {
      kind: 'INSUFFICIENT_BALANCE',
      message: 'This account does not have enough XLM to cover the transaction fee.',
    };
  }

  const contractMatch = CONTRACT_ERRORS.find(({ pattern }) => lower.includes(pattern));
  if (contractMatch) {
    return { kind: 'CONTRACT_ERROR', message: contractMatch.message };
  }

  return { kind: 'UNKNOWN', message: raw || 'Something went wrong. Please try again.' };
}

// Maps the Crowdfunding contract's `Error` enum (by discriminant, as it
// appears in a Soroban revert message, e.g. "Error(Contract, #6)") to a
// human-readable explanation.
const CONTRACT_ERRORS: { pattern: string; message: string }[] = [
  { pattern: 'error(contract, #3)', message: 'Campaign goal must be greater than zero.' },
  { pattern: 'error(contract, #4)', message: 'Contribution amount must be greater than zero.' },
  { pattern: 'error(contract, #5)', message: 'That campaign does not exist.' },
  { pattern: 'error(contract, #6)', message: 'This campaign has already ended.' },
  { pattern: 'error(contract, #7)', message: 'Only the campaign creator can do that.' },
  { pattern: 'error(contract, #8)', message: 'This campaign has not reached its goal yet.' },
  { pattern: 'error(contract, #9)', message: 'This campaign has already been claimed.' },
  { pattern: 'error(contract, #10)', message: 'This campaign is still open — wait for the deadline.' },
];

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const ERROR_LABELS: Record<AppError['kind'], string> = {
  WALLET_NOT_FOUND: 'Wallet not found',
  USER_REJECTED: 'Request rejected',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  CONTRACT_ERROR: 'Contract error',
  UNKNOWN: 'Error',
};
