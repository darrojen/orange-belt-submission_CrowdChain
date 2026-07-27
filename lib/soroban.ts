import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  Account,
  Keypair,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { signXdr } from './wallet-kit';
import type { TxStatus, Campaign } from '@/types/campaign';

export const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const CROWDFUNDING_CONTRACT_ID = process.env.NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID || '';
export const REGISTRY_CONTRACT_ID = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || '';

export const server = new rpc.Server(SOROBAN_RPC_URL);

export function explorerLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function contractExplorerLink(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

function requireContractId(id: string, label: string) {
  if (!id) {
    throw new Error(`${label} is not set. Deploy the contract and add its ID to .env.local.`);
  }
}

async function simulateRead<T>(contractId: string, method: string, args: xdr.ScVal[] = []): Promise<T> {
  const contract = new Contract(contractId);
  const account = new Account(Keypair.random().publicKey(), '0');

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  if (!sim.result) {
    throw new Error('Simulation returned no result.');
  }
  return scValToNative(sim.result.retval) as T;
}

async function pollTransaction(hash: string, maxAttempts = 15, delayMs = 1500): Promise<rpc.Api.GetTransactionStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await server.getTransaction(hash);
    if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return result.status;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return rpc.Api.GetTransactionStatus.NOT_FOUND;
}

async function callContractWrite(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
  onStatus: (status: TxStatus) => void
): Promise<string> {
  onStatus({ state: 'simulating', hash: null, message: 'Simulating transaction…', explorerUrl: null });

  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(contractId);

  const builtTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(builtTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }

  const prepared = rpc.assembleTransaction(builtTx, sim).build();

  onStatus({ state: 'signing', hash: null, message: 'Waiting for signature in your wallet…', explorerUrl: null });
  const signedXdr = await signXdr(prepared.toXDR(), sourceAddress);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  onStatus({ state: 'submitting', hash: null, message: 'Submitting to the testnet ledger…', explorerUrl: null });
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('The network rejected this transaction before it could be included.');
  }

const hash = sendResult.hash;

try {
  const status = await pollTransaction(hash);

  if (status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    console.warn(`Transaction status: ${status}`);
  }
} catch (error) {
  console.warn("Could not confirm transaction, but it was submitted:", error);
}

return hash;


}

// ---- Crowdfunding contract calls ----

export async function getCampaignCount(): Promise<number> {
  requireContractId(CROWDFUNDING_CONTRACT_ID, 'NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID');
  return simulateRead<number>(CROWDFUNDING_CONTRACT_ID, 'get_campaign_count');
}

export async function getCampaign(id: number): Promise<Campaign> {
  requireContractId(CROWDFUNDING_CONTRACT_ID, 'NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID');
  const args = [nativeToScVal(id, { type: 'u32' })];
  const raw = await simulateRead<{
    creator: string;
    goal: bigint;
    deadline_ledger: number;
    raised: bigint;
    claimed: boolean;
  }>(CROWDFUNDING_CONTRACT_ID, 'get_campaign', args);

  return {
    id,
    creator: raw.creator,
    goal: raw.goal.toString(),
    raised: raw.raised.toString(),
    deadlineLedger: raw.deadline_ledger,
    claimed: raw.claimed,
  };
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const count = await getCampaignCount();
  const campaigns = await Promise.all(Array.from({ length: count }, (_, i) => getCampaign(i)));
  return campaigns;
}

export async function createCampaign(
  creatorAddress: string,
  goal: string,
  durationLedgers: number,
  onStatus: (status: TxStatus) => void
): Promise<{ hash: string }> {
  requireContractId(CROWDFUNDING_CONTRACT_ID, 'NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID');
  const args = [
    nativeToScVal(Address.fromString(creatorAddress), { type: 'address' }),
    nativeToScVal(BigInt(goal), { type: 'i128' }),
    nativeToScVal(durationLedgers, { type: 'u32' }),
  ];
  const hash = await callContractWrite(CROWDFUNDING_CONTRACT_ID, 'create_campaign', args, creatorAddress, onStatus);
  return { hash };
}

export async function contributeToCampaign(
  campaignId: number,
  contributorAddress: string,
  amount: string,
  onStatus: (status: TxStatus) => void
): Promise<string> {
  requireContractId(CROWDFUNDING_CONTRACT_ID, 'NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID');
  const args = [
    nativeToScVal(campaignId, { type: 'u32' }),
    nativeToScVal(Address.fromString(contributorAddress), { type: 'address' }),
    nativeToScVal(BigInt(amount), { type: 'i128' }),
  ];
  return callContractWrite(CROWDFUNDING_CONTRACT_ID, 'contribute', args, contributorAddress, onStatus);
}

export async function claimCampaign(
  campaignId: number,
  callerAddress: string,
  onStatus: (status: TxStatus) => void
): Promise<string> {
  requireContractId(CROWDFUNDING_CONTRACT_ID, 'NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID');
  const args = [
    nativeToScVal(campaignId, { type: 'u32' }),
    nativeToScVal(Address.fromString(callerAddress), { type: 'address' }),
  ];
  return callContractWrite(CROWDFUNDING_CONTRACT_ID, 'claim', args, callerAddress, onStatus);
}




export async function getGlobalTotalRaised(): Promise<number> {
  requireContractId(REGISTRY_CONTRACT_ID, 'NEXT_PUBLIC_REGISTRY_CONTRACT_ID');

  const total = await simulateRead<bigint>(
    REGISTRY_CONTRACT_ID,
    'get_total_raised'
  );

  return Number(total);
}

export async function getLatestLedgerSequence(): Promise<number> {
  const { sequence } = await server.getLatestLedger();
  return sequence;
}
