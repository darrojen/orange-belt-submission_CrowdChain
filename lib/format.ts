/** Shortens a Stellar address to "GABC…WXYZ" for compact display. */
export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}

/** Formats a raw i128 stroop-scale integer string/number as a plain decimal. */
export function formatAmount(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Percentage of goal reached, clamped to [0, 100]. */
export function progressPercent(raised: string | number, goal: string | number): number {
  const r = typeof raised === 'string' ? Number(raised) : raised;
  const g = typeof goal === 'string' ? Number(goal) : goal;
  if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((r / g) * 100)));
}

/**
 * Stellar testnet ledgers close roughly every 5 seconds. This gives a rough
 * human-readable estimate only — not a substitute for reading the actual
 * ledger sequence from RPC.
 */
const AVG_LEDGER_SECONDS = 5;

export function ledgersToDuration(ledgerCount: number): string {
  const totalSeconds = ledgerCount * AVG_LEDGER_SECONDS;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `~${days}d ${hours}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${minutes}m`;
}

export function isDeadlinePassed(currentLedger: number, deadlineLedger: number): boolean {
  return currentLedger > deadlineLedger;
}
