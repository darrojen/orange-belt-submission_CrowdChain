export interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletId: string | null;
}

export interface Campaign {
  id: number;
  creator: string;
  goal: string; // i128 as decimal string
  raised: string;
  deadlineLedger: number;
  claimed: boolean;
}

export type TxState = 'idle' | 'simulating' | 'signing' | 'submitting' | 'success' | 'error';

export interface TxStatus {
  state: TxState;
  hash: string | null;
  message: string | null;
  explorerUrl: string | null;
}

export type AppErrorKind =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'CONTRACT_ERROR'
  | 'UNKNOWN';

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

export interface ContributionEvent {
  campaignId: number;
  contributor: string;
  amount: number;
  campaignTotal: number;
  globalTotal: number;
  ledger: number;
}
