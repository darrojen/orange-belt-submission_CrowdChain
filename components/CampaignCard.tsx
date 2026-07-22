'use client';

import { useState } from 'react';
import { contributeToCampaign, claimCampaign, explorerLink } from '@/lib/soroban';
import { classifyError } from '@/lib/errors';
import { formatAmount, progressPercent, shortenAddress, isDeadlinePassed } from '@/lib/format';
import type { Campaign, TxStatus, AppError } from '@/types/campaign';

interface CampaignCardProps {
  campaign: Campaign;
  currentLedger: number | null;
  senderAddress: string | null;
  onStatusUpdate: (status: TxStatus) => void;
  onError: (error: AppError) => void;
  onChanged: () => void;
}

export default function CampaignCard({
  campaign,
  currentLedger,
  senderAddress,
  onStatusUpdate,
  onError,
  onChanged,
}: CampaignCardProps) {
  const [amount, setAmount] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const pct = progressPercent(campaign.raised, campaign.goal);
  const expired = currentLedger !== null && isDeadlinePassed(currentLedger, campaign.deadlineLedger);
  const goalMet = Number(campaign.raised) >= Number(campaign.goal);
  const isCreator = senderAddress === campaign.creator;

  async function handleContribute() {
    if (!senderAddress) return;
    const numeric = Number(amount);
    if (!numeric || numeric <= 0) {
      onError({ kind: 'CONTRACT_ERROR', message: 'Enter an amount greater than 0.' });
      return;
    }
    setIsBusy(true);
    try {
      const hash = await contributeToCampaign(campaign.id, senderAddress, String(Math.floor(numeric)), onStatusUpdate);
      onStatusUpdate({ state: 'success', hash, message: 'Contribution confirmed on testnet.', explorerUrl: explorerLink(hash) });
      setAmount('');
      onChanged();
    } catch (err) {
      const classified = classifyError(err);
      onError(classified);
      onStatusUpdate({ state: 'error', hash: null, message: classified.message, explorerUrl: null });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClaim() {
    if (!senderAddress) return;
    setIsBusy(true);
    try {
      const hash = await claimCampaign(campaign.id, senderAddress, onStatusUpdate);
      onStatusUpdate({ state: 'success', hash, message: 'Campaign claimed.', explorerUrl: explorerLink(hash) });
      onChanged();
    } catch (err) {
      const classified = classifyError(err);
      onError(classified);
      onStatusUpdate({ state: 'error', hash: null, message: classified.message, explorerUrl: null });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between text-xs text-mute">
        <span>Campaign #{campaign.id}</span>
        <span className="font-mono">{shortenAddress(campaign.creator)}</span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-display text-lg text-ink">{formatAmount(campaign.raised)}</span>
          <span className="text-xs text-mute">of {formatAmount(campaign.goal)} goal</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-void">
          <div className="h-full rounded-full bg-lumen transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-mute">
          <span>{pct}% funded</span>
          <span>{expired ? 'Ended' : 'Open'}</span>
        </div>
      </div>

      {campaign.claimed ? (
        <p className="mt-4 text-xs text-lumen">Funds claimed by the creator.</p>
      ) : expired && goalMet && isCreator ? (
        <button
          onClick={handleClaim}
          disabled={isBusy}
          className="mt-4 w-full rounded-full bg-lumen px-4 py-2 text-xs font-semibold text-void hover:bg-lumen-dim disabled:opacity-50"
        >
          {isBusy ? 'Claiming…' : 'Claim funds'}
        </button>
      ) : !expired ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            inputMode="numeric"
            disabled={!senderAddress || isBusy}
            className="w-full rounded-lg border border-line bg-void px-3 py-2 text-sm text-ink placeholder:text-mute/50 focus:border-lumen focus:outline-none disabled:opacity-50 sm:flex-1"
          />
          <button
            onClick={handleContribute}
            disabled={!senderAddress || isBusy}
            className="w-full shrink-0 rounded-full bg-lumen px-4 py-2 text-xs font-semibold text-void hover:bg-lumen-dim disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isBusy ? 'Sending…' : 'Contribute'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-mute">
          {goalMet ? 'Goal met — waiting for the creator to claim.' : 'Campaign ended without reaching its goal.'}
        </p>
      )}
    </div>
  );
}
