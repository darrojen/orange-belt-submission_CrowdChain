'use client';

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';

let kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

export function openWalletModal(onSelected: (walletId: string) => void, onClosed?: () => void): void {
  getKit().openModal({
    modalTitle: 'Connect a wallet',
    onWalletSelected: (option) => {
      getKit().setWallet(option.id);
      onSelected(option.id);
    },
    onClosed: () => onClosed?.(),
  });
}

export async function getConnectedAddress(): Promise<string> {
  const { address } = await getKit().getAddress();
  if (!address) {
    throw new Error('No wallet is selected. Choose a wallet to continue.');
  }
  return address;
}

export async function signXdr(xdr: string, address: string): Promise<string> {
  const { signedTxXdr } = await getKit().signTransaction(xdr, {
    address,
    networkPassphrase: WalletNetwork.TESTNET,
  });
  return signedTxXdr;
}

export async function disconnectWallet(): Promise<void> {
  await getKit().disconnect();
}
