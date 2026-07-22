'use client';

import { useState, FormEvent } from 'react';
import { createCampaign, explorerLink } from '@/lib/soroban';
import { classifyError } from '@/lib/errors';
import { ledgersToDuration } from '@/lib/format';
import type { TxStatus, AppError } from '@/types/campaign';

interface CreateCampaignFormProps {
  creatorAddress: string | null;
  onStatusUpdate: (status: TxStatus) => void;
  onError: (error: AppError) => void;
  onCreated: () => void;
}

export default function CreateCampaignForm({ creatorAddress, onStatusUpdate, onError, onCreated }: CreateCampaignFormProps) {
  const [goal, setGoal] = useState('');
  const [durationLedgers, setDurationLedgers] = useState('17280'); // ~1 day at ~5s/ledger
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!creatorAddress) return;

    const numericGoal = Number(goal);
    const numericDuration = Number(durationLedgers);
    if (!numericGoal || numericGoal <= 0) {
      onError({ kind: 'CONTRACT_ERROR', message: 'Goal must be greater than 0.' });
      return;
    }
    if (!numericDuration || numericDuration <= 0) {
      onError({ kind: 'CONTRACT_ERROR', message: 'Duration must be greater than 0 ledgers.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { hash } = await createCampaign(creatorAddress, String(Math.floor(numericGoal)), Math.floor(numericDuration), onStatusUpdate);
      onStatusUpdate({ state: 'success', hash, message: 'Campaign created on testnet.', explorerUrl: explorerLink(hash) });
      setGoal('');
      onCreated();
    } catch (err) {
      const classified = classifyError(err);
      onError(classified);
      onStatusUpdate({ state: 'error', hash: null, message: classified.message, explorerUrl: null });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-5">
      <span className="text-xs uppercase tracking-widest text-mute">New campaign</span>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-mute">Goal</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="1000"
            inputMode="numeric"
            disabled={!creatorAddress}
            className="rounded-lg border border-line bg-void px-3 py-2 text-sm text-ink placeholder:text-mute/50 focus:border-lumen focus:outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-mute">Duration (ledgers, {ledgersToDuration(Number(durationLedgers) || 0)})</span>
          <input
            value={durationLedgers}
            onChange={(e) => setDurationLedgers(e.target.value)}
            placeholder="17280"
            inputMode="numeric"
            disabled={!creatorAddress}
            className="rounded-lg border border-line bg-void px-3 py-2 text-sm text-ink placeholder:text-mute/50 focus:border-lumen focus:outline-none disabled:opacity-50"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!creatorAddress || isSubmitting}
        className="mt-4 w-full rounded-full bg-lumen px-5 py-2.5 text-sm font-semibold text-void shadow-glow transition hover:bg-lumen-dim disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isSubmitting ? 'Creating…' : 'Create campaign'}
      </button>

      {!creatorAddress && <p className="mt-3 text-xs text-mute">Connect your wallet to create a campaign.</p>}
    </form>
  );
}
