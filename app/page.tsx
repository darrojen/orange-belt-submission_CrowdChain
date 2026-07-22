'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WalletConnect from '@/components/WalletConnect';
import GlobalStats from '@/components/GlobalStats';
import CreateCampaignForm from '@/components/CreateCampaignForm';
import CampaignCard from '@/components/CampaignCard';
import TransactionStatus from '@/components/TransactionStatus';
import ActivityFeed from '@/components/ActivityFeed';
import ErrorBanner from '@/components/ErrorBanner';
import { getAllCampaigns, getGlobalTotalRaised, getLatestLedgerSequence } from '@/lib/soroban';
import { fetchContributionEvents } from '@/lib/events';
import { classifyError } from '@/lib/errors';
import type { WalletState, Campaign, TxStatus, AppError, ContributionEvent } from '@/types/campaign';

const EMPTY_WALLET: WalletState = { isConnected: false, address: null, walletId: null };
const EMPTY_TX: TxStatus = { state: 'idle', hash: null, message: null, explorerUrl: null };

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [totalRaised, setTotalRaised] = useState<number | null>(null);
  const [currentLedger, setCurrentLedger] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>(EMPTY_TX);
  const [appError, setAppError] = useState<AppError | null>(null);
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const cursorLedger = useRef<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [campaignList, total, ledger] = await Promise.all([
        getAllCampaigns(),
        getGlobalTotalRaised(),
        getLatestLedgerSequence(),
      ]);
      setCampaigns(campaignList);
      setTotalRaised(total);
      setCurrentLedger(ledger);
    } catch (err) {
      setAppError(classifyError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Anchor the event-polling cursor near the current ledger on mount.
  useEffect(() => {
    getLatestLedgerSequence()
      .then((ledger) => {
        cursorLedger.current = Math.max(ledger - 100, 1);
        setIsLive(true);
      })
      .catch(() => {
        cursorLedger.current = null;
        setIsLive(false);
      });
  }, []);

  // Poll Soroban RPC for new Registry contribution events every few
  // seconds so the activity feed and totals update without a manual
  // refresh, even for contributions made by other people in other tabs.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (cursorLedger.current === null) return;
      try {
        const { events: newEvents, latestLedger } = await fetchContributionEvents(cursorLedger.current);
        if (newEvents.length > 0) {
          setEvents((prev) => [...prev, ...newEvents]);
          setTotalRaised(newEvents[newEvents.length - 1].globalTotal);
          setCampaigns((prev) => {
            if (!prev) return prev;
            const updated = [...prev];
            for (const e of newEvents) {
              const idx = updated.findIndex((c) => c.id === e.campaignId);
              if (idx !== -1) updated[idx] = { ...updated[idx], raised: String(e.campaignTotal) };
            }
            return updated;
          });
        }
        cursorLedger.current = latestLedger + 1;
      } catch {
        // Transient RPC hiccups shouldn't surface as user-facing errors;
        // the next tick retries automatically.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function handleDisconnect() {
    setWallet(EMPTY_WALLET);
    setTxStatus(EMPTY_TX);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">CrowdChain</p>
          <p className="text-xs text-mute">On-chain crowdfunding · multi-contract · Stellar testnet</p>
        </div>
        <WalletConnect wallet={wallet} onConnect={setWallet} onDisconnect={handleDisconnect} onError={setAppError} />
      </header>

      {appError && (
        <div className="mt-6">
          <ErrorBanner error={appError} onDismiss={() => setAppError(null)} />
        </div>
      )}

      <section className="mt-6">
        <GlobalStats totalRaised={totalRaised} campaignCount={campaigns?.length ?? null} isLive={isLive} />
      </section>

      <section className="mt-5">
        <CreateCampaignForm
          creatorAddress={wallet.address}
          onStatusUpdate={setTxStatus}
          onError={setAppError}
          onCreated={loadAll}
        />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Campaigns</h2>

        {isLoading ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-panel/40" />
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                currentLedger={currentLedger}
                senderAddress={wallet.address}
                onStatusUpdate={setTxStatus}
                onError={setAppError}
                onChanged={loadAll}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-line bg-panel/40 p-6 text-center">
            <p className="text-sm text-mute">No campaigns yet. Be the first to create one above.</p>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2">
        <TransactionStatus status={txStatus} />
        <ActivityFeed events={events} />
      </section>

      <footer className="mt-12 text-center text-xs text-mute">
        Stellar Testnet · Rise Level 3 Orange Belt submission
      </footer>
    </main>
  );
}
