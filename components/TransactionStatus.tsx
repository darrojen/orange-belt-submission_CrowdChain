import type { TxStatus } from '@/types/campaign';

const STATE_COPY: Record<string, string> = {
  simulating: 'Simulating transaction…',
  signing: 'Waiting for signature in your wallet…',
  submitting: 'Submitting to the testnet ledger…',
};

export default function TransactionStatus({ status }: { status: TxStatus }) {
  if (status.state === 'idle') {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-6 text-center">
        <p className="text-sm text-mute">Transaction status appears here once you create or fund a campaign.</p>
      </div>
    );
  }

  const isPending = ['simulating', 'signing', 'submitting'].includes(status.state);
  const isSuccess = status.state === 'success';
  const isError = status.state === 'error';

  return (
    <div
      className={`rounded-2xl border p-6 ${
        isSuccess ? 'border-lumen/50 bg-lumen/5' : isError ? 'border-signal/50 bg-signal/5' : 'border-line bg-panel'
      }`}
    >
      <div className="flex items-center gap-3">
        {isPending && <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-lumen" />}
        {isSuccess && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lumen text-void">✓</span>
        )}
        {isError && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-void">!</span>
        )}
        <p className={`text-sm ${isError ? 'text-signal' : 'text-ink'}`}>
          {status.message ?? STATE_COPY[status.state] ?? ''}
        </p>
      </div>

      {status.hash && (
        <div className="mt-4 border-t border-line pt-4">
          <span className="text-xs uppercase tracking-widest text-mute">Transaction hash</span>
          <p className="mt-1 break-all font-mono text-xs text-ink">{status.hash}</p>
          {status.explorerUrl && (
            <a
              href={status.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-lumen underline-offset-4 hover:underline"
            >
              View on Stellar Expert →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
