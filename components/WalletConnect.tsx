'use client';

import { useState } from 'react';
import { openWalletModal, getConnectedAddress, disconnectWallet } from '@/lib/wallet-kit';
import { classifyError } from '@/lib/errors';
import { shortenAddress } from '@/lib/format';
import type { WalletState, AppError } from '@/types/campaign';

interface WalletConnectProps {
  wallet: WalletState;
  onConnect: (wallet: WalletState) => void;
  onDisconnect: () => void;
  onError: (error: AppError) => void;
}

export default function WalletConnect({ wallet, onConnect, onDisconnect, onError }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  function handleConnect() {
    setIsConnecting(true);
    try {
      openWalletModal(
        async (walletId) => {
          try {
            const address = await getConnectedAddress();
            onConnect({ isConnected: true, address, walletId });
          } catch (err) {
            onError(classifyError(err));
          } finally {
            setIsConnecting(false);
          }
        },
        () => setIsConnecting(false)
      );
    } catch (err) {
      onError(classifyError(err));
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    onDisconnect();
  }

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="flex-1 truncate rounded-full border border-line px-3 py-1.5 text-xs text-mute sm:flex-none sm:px-4">
          <span className="text-lumen">{wallet.walletId}</span> · {shortenAddress(wallet.address)}
        </div>
        <button
          onClick={handleDisconnect}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-ink transition hover:border-signal hover:text-signal sm:px-4"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full rounded-full bg-lumen px-5 py-2 text-sm font-semibold text-void shadow-glow transition hover:bg-lumen-dim disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
