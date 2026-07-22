import { scValToNative } from '@stellar/stellar-sdk';
import { server, REGISTRY_CONTRACT_ID } from './soroban';
import type { ContributionEvent } from '@/types/campaign';

export async function fetchContributionEvents(
  startLedger: number
): Promise<{ events: ContributionEvent[]; latestLedger: number }> {
  if (!REGISTRY_CONTRACT_ID) return { events: [], latestLedger: startLedger };

  const response = await server.getEvents({
    startLedger,
    filters: [{ type: 'contract', contractIds: [REGISTRY_CONTRACT_ID] }],
    limit: 50,
  });

  const events: ContributionEvent[] = response.events
    .filter((e) => e.topic?.length && safeDecode(e.topic[0]) === 'contrib')
    .map((e) => {
      const campaignId = safeDecode(e.topic[1]) as number;
      const decoded = safeDecode(e.value) as [string, bigint, bigint, bigint];
      const [contributor, amount, campaignTotal, globalTotal] = decoded ?? ['', BigInt(0), BigInt(0), BigInt(0)];
      return {
        campaignId,
        contributor,
        amount: Number(amount),
        campaignTotal: Number(campaignTotal),
        globalTotal: Number(globalTotal),
        ledger: e.ledger,
      };
    });

  return { events, latestLedger: response.latestLedger };
}

function safeDecode(value: unknown) {
  try {
    return scValToNative(value as any);
  } catch {
    return null;
  }
}
