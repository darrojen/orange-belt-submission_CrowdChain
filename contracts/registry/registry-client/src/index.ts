import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"InvalidAmount"}
}

/**
 * The Registry is a second, independent contract whose only job is to keep
 * a global ledger of activity across every campaign managed by the
 * Crowdfunding contract. It never talks to a wallet directly — the only
 * caller it accepts is the Crowdfunding contract itself, authorized once
 * at `initialize` and verified on every write via `require_auth`.
 * 
 * This is the inter-contract communication piece of the submission:
 * Crowdfunding::contribute() invokes Registry::record_contribution() as
 * part of the same transaction, and Registry checks that the caller is
 * really the Crowdfunding contract before trusting the numbers it's given.
 */
export type DataKey = {tag: "Admin", values: void} | {tag: "CrowdfundingContract", values: void} | {tag: "TotalRaised", values: void} | {tag: "CampaignTotal", values: readonly [u32]} | {tag: "Initialized", values: void};

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * One-time setup. `crowdfunding_contract` is the only address that will
   * ever be allowed to call `record_contribution`.
   */
  initialize: ({admin, crowdfunding_contract}: {admin: string, crowdfunding_contract: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_total_raised transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_raised: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_campaign_total transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_campaign_total: ({campaign_id}: {campaign_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a record_contribution transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Records a contribution. `caller` must be the registered Crowdfunding
   * contract address. When a contract calls another contract directly
   * (rather than an end user calling it), `require_auth` on the
   * *calling contract's own address* is satisfied automatically by the
   * runtime — no separate signature is needed — which is what makes this
   * a safe way to gate access to one specific contract.
   */
  record_contribution: ({caller, campaign_id, contributor, amount}: {caller: string, campaign_id: u32, contributor: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_crowdfunding_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_crowdfunding_contract: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABAAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAEAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAMVW5hdXRob3JpemVkAAAAAwAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAQ=",
        "AAAAAgAAAm9UaGUgUmVnaXN0cnkgaXMgYSBzZWNvbmQsIGluZGVwZW5kZW50IGNvbnRyYWN0IHdob3NlIG9ubHkgam9iIGlzIHRvIGtlZXAKYSBnbG9iYWwgbGVkZ2VyIG9mIGFjdGl2aXR5IGFjcm9zcyBldmVyeSBjYW1wYWlnbiBtYW5hZ2VkIGJ5IHRoZQpDcm93ZGZ1bmRpbmcgY29udHJhY3QuIEl0IG5ldmVyIHRhbGtzIHRvIGEgd2FsbGV0IGRpcmVjdGx5IOKAlCB0aGUgb25seQpjYWxsZXIgaXQgYWNjZXB0cyBpcyB0aGUgQ3Jvd2RmdW5kaW5nIGNvbnRyYWN0IGl0c2VsZiwgYXV0aG9yaXplZCBvbmNlCmF0IGBpbml0aWFsaXplYCBhbmQgdmVyaWZpZWQgb24gZXZlcnkgd3JpdGUgdmlhIGByZXF1aXJlX2F1dGhgLgoKVGhpcyBpcyB0aGUgaW50ZXItY29udHJhY3QgY29tbXVuaWNhdGlvbiBwaWVjZSBvZiB0aGUgc3VibWlzc2lvbjoKQ3Jvd2RmdW5kaW5nOjpjb250cmlidXRlKCkgaW52b2tlcyBSZWdpc3RyeTo6cmVjb3JkX2NvbnRyaWJ1dGlvbigpIGFzCnBhcnQgb2YgdGhlIHNhbWUgdHJhbnNhY3Rpb24sIGFuZCBSZWdpc3RyeSBjaGVja3MgdGhhdCB0aGUgY2FsbGVyIGlzCnJlYWxseSB0aGUgQ3Jvd2RmdW5kaW5nIGNvbnRyYWN0IGJlZm9yZSB0cnVzdGluZyB0aGUgbnVtYmVycyBpdCdzIGdpdmVuLgAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAUQ3Jvd2RmdW5kaW5nQ29udHJhY3QAAAAAAAAAAAAAAAtUb3RhbFJhaXNlZAAAAAABAAAAAAAAAA1DYW1wYWlnblRvdGFsAAAAAAAAAQAAAAQAAAAAAAAAAAAAAAtJbml0aWFsaXplZAA=",
        "AAAAAAAAAHRPbmUtdGltZSBzZXR1cC4gYGNyb3dkZnVuZGluZ19jb250cmFjdGAgaXMgdGhlIG9ubHkgYWRkcmVzcyB0aGF0IHdpbGwKZXZlciBiZSBhbGxvd2VkIHRvIGNhbGwgYHJlY29yZF9jb250cmlidXRpb25gLgAAAAppbml0aWFsaXplAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAFWNyb3dkZnVuZGluZ19jb250cmFjdAAAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3JhaXNlZAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAASZ2V0X2NhbXBhaWduX3RvdGFsAAAAAAABAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAEAAAAAQAAAAs=",
        "AAAAAAAAAYJSZWNvcmRzIGEgY29udHJpYnV0aW9uLiBgY2FsbGVyYCBtdXN0IGJlIHRoZSByZWdpc3RlcmVkIENyb3dkZnVuZGluZwpjb250cmFjdCBhZGRyZXNzLiBXaGVuIGEgY29udHJhY3QgY2FsbHMgYW5vdGhlciBjb250cmFjdCBkaXJlY3RseQoocmF0aGVyIHRoYW4gYW4gZW5kIHVzZXIgY2FsbGluZyBpdCksIGByZXF1aXJlX2F1dGhgIG9uIHRoZQoqY2FsbGluZyBjb250cmFjdCdzIG93biBhZGRyZXNzKiBpcyBzYXRpc2ZpZWQgYXV0b21hdGljYWxseSBieSB0aGUKcnVudGltZSDigJQgbm8gc2VwYXJhdGUgc2lnbmF0dXJlIGlzIG5lZWRlZCDigJQgd2hpY2ggaXMgd2hhdCBtYWtlcyB0aGlzCmEgc2FmZSB3YXkgdG8gZ2F0ZSBhY2Nlc3MgdG8gb25lIHNwZWNpZmljIGNvbnRyYWN0LgAAAAAAE3JlY29yZF9jb250cmlidXRpb24AAAAABAAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAEAAAAAAAAAAtjb250cmlidXRvcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAAAAAAAZZ2V0X2Nyb3dkZnVuZGluZ19jb250cmFjdAAAAAAAAAAAAAABAAAD6QAAABMAAAAD" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<Result<void>>,
        get_total_raised: this.txFromJSON<i128>,
        get_campaign_total: this.txFromJSON<i128>,
        record_contribution: this.txFromJSON<Result<i128>>,
        get_crowdfunding_contract: this.txFromJSON<Result<string>>
  }
}