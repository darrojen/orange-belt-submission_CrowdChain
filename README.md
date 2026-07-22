# CrowdChain

An on-chain crowdfunding dApp for the Rise Stellar Hackathon — Level 3 (Orange Belt).

Create a campaign, fund it in small contributions from any supported wallet, and watch a second, independent contract track cross-campaign totals in real time — a genuine two-contract system, not a single contract wearing two hats.

> **Live demo:** _add your Vercel/Netlify URL here after deploying_
> **Demo video:** _add your 1–2 minute walkthrough link here_

## Architecture

Two Soroban contracts, deployed separately, that talk to each other on-chain:

```
                    ┌──────────────────────────┐
   wallet ────────▶ │   Crowdfunding contract   │
  (Freighter,       │  campaigns, contributions,│
   xBull, ...)       │  claims                   │
                    └────────────┬──────────────┘
                                 │ cross-contract call
                                 │ record_contribution(caller, id, who, amt)
                                 ▼
                    ┌──────────────────────────┐
                    │     Registry contract     │
                    │  global + per-campaign    │
                    │  totals, emits events     │
                    └────────────┬──────────────┘
                                 │ getEvents (Soroban RPC)
                                 ▼
                    ┌──────────────────────────┐
                    │   Next.js frontend        │
                    │  polls RPC every 5s for   │
                    │  new events → live UI     │
                    └──────────────────────────┘
```

**Why two contracts instead of one?** It's the cleanest way to demonstrate real inter-contract communication: the Crowdfunding contract doesn't maintain its own global counters — every contribution is *proven* to the Registry via a cross-contract call that only the Crowdfunding contract's own address can make (`registry::record_contribution` checks `caller.require_auth()` against the address stored at `initialize`). If that call reverts, the whole transaction — including the contribution itself — rolls back, so the two contracts can never drift out of sync.

## How it meets the Level 3 requirements

| Requirement | Where |
|---|---|
| Inter-contract communication | `contracts/crowdfunding/src/lib.rs::contribute()` calls `RegistryContractClient::record_contribution()` |
| Event streaming & real-time updates | Registry emits a `contrib` event per contribution; `lib/events.ts` polls Soroban RPC `getEvents` every 5s; UI updates without a refresh |
| CI/CD pipeline | `.github/workflows/ci.yml` — contract build+test job, frontend lint/typecheck/test/build job, runs on every push and PR |
| Smart contract deployment workflow | Documented step-by-step below, using the Stellar CLI |
| Mobile responsive frontend | Tailwind responsive utilities throughout (`sm:` breakpoints); stacked layout on narrow screens, grid on wider ones |
| Error handling & loading states | `lib/errors.ts` classifies wallet-not-found / user-rejected / insufficient-balance / contract errors; skeleton loaders while campaigns load; `TransactionStatus` tracks simulating → signing → submitting → success/error |
| Contract tests | `contracts/*/src/test.rs` — 5 tests in `registry`, 6 in `crowdfunding` |
| Frontend tests | `lib/*.test.ts` — 15 Vitest tests, run in CI |
| Production-ready architecture | Separated concerns (contracts / lib / components / types), typed contract calls, env-based contract IDs, no hardcoded secrets |

## Tech stack

- **Contracts:** Rust + `soroban-sdk` 22, two-contract workspace
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Wallets:** [`@creit.tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit) — multi-wallet picker
- **Chain access:** [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) `rpc.Server` for simulate / submit / getEvents
- **Testing:** `cargo test` (contracts), [Vitest](https://vitest.dev) (frontend)
- **CI/CD:** GitHub Actions

## Project structure

```
crowdfund/
├── contracts/
│   ├── registry/            # Global + per-campaign stats, event emitter
│   │   └── src/{lib.rs, test.rs}
│   └── crowdfunding/        # Campaigns, contributions, claims
│       └── src/{lib.rs, test.rs}
├── app/                     # Next.js pages, layout, global styles
├── components/              # WalletConnect, CampaignCard, CreateCampaignForm,
│                             # GlobalStats, ActivityFeed, TransactionStatus, ErrorBanner
├── lib/                     # wallet-kit.ts, soroban.ts, events.ts, errors.ts, format.ts
│                             # (errors.ts and format.ts have paired *.test.ts files)
├── types/                   # Shared TypeScript types
├── .github/workflows/ci.yml # CI/CD pipeline
```

## Prerequisites

- Node.js 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable, recent — install via `rustup`, not your OS package manager, which is often too old) + the `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli) (`stellar` command)
- A wallet extension set to **testnet**: [Freighter](https://freighter.app), [xBull](https://xbull.app), or [Albedo](https://albedo.link)

## 1. Deploy the contracts

```bash
# From the repo root
rustup target add wasm32v1-none

# Create (or reuse) a funded testnet identity
stellar keys generate deployer --network testnet --fund

# Build both contracts
stellar contract build

# Deploy the Registry first — prints its contract ID, save it as REGISTRY_ID
stellar contract deploy \
  --wasm target/wasm32v1-none/release/registry_contract.wasm \
  --source deployer --network testnet

# Deploy Crowdfunding — prints its contract ID, save it as CROWDFUNDING_ID
stellar contract deploy \
  --wasm target/wasm32v1-none/release/crowdfunding_contract.wasm \
  --source deployer --network testnet
```

Now wire them together — each needs to know the other's address:

```bash
DEPLOYER=$(stellar keys address deployer)

# Registry only trusts calls coming from this Crowdfunding contract
stellar contract invoke --id REGISTRY_ID --source deployer --network testnet \
  -- initialize --admin $DEPLOYER --crowdfunding_contract CROWDFUNDING_ID

# Crowdfunding knows where to report contributions
stellar contract invoke --id CROWDFUNDING_ID --source deployer --network testnet \
  -- initialize --admin $DEPLOYER --registry REGISTRY_ID
```

Record the resulting IDs and a sample transaction hash (e.g. from creating a test campaign) for your submission:

- **Registry contract:** `REGISTRY_ID` — _paste here_
- **Crowdfunding contract:** `CROWDFUNDING_ID` — _paste here_
- **Sample transaction hash:** _paste here (e.g. from `create_campaign` or `contribute`)_

## 2. Configure the frontend

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID=CROWDFUNDING_ID
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=REGISTRY_ID
```

## 3. Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

## 4. Test

```bash
# Contracts (from repo root)
cargo test --workspace

# Frontend
npm test
```

Expected: 11 contract tests (5 registry + 6 crowdfunding) and 15 frontend tests, all passing.

## 5. Deploy the frontend (for your live demo link)

Any static-friendly host works; Vercel is the path of least resistance for Next.js:

```bash
npm install -g vercel
vercel
```

Add `NEXT_PUBLIC_CROWDFUNDING_CONTRACT_ID`, `NEXT_PUBLIC_REGISTRY_CONTRACT_ID`, and `NEXT_PUBLIC_SOROBAN_RPC_URL` as environment variables in the Vercel project settings (same values as `.env.local`), then redeploy so the build picks them up.

## How to use

1. Click **Connect Wallet** and pick a wallet from the picker.
2. Create a campaign with a goal and a duration (in ledgers — the form shows a rough day/hour estimate as you type).
3. Anyone with a connected wallet can contribute to an open campaign. The transaction card tracks simulating → signing → submitting → success/error live.
4. Once a campaign's deadline has passed and its goal is met, the creator sees a **Claim funds** button.
5. The **Activity** feed and the **Total raised** stat update automatically as contributions land on-chain — the frontend polls the Registry contract's events every 5 seconds, so contributions from other people/tabs show up without a refresh.

## Error handling

`lib/errors.ts` classifies failures into distinct, user-facing categories:

- **Wallet not found** — no compatible extension detected
- **Request rejected** — the user declined a connection or signature request
- **Insufficient balance** — the account can't cover the transaction fee
- **Contract error** — mapped from each contract's `Error` enum (e.g. campaign expired, goal not met, not the creator, already claimed)
- **Unknown** — anything else, shown with the raw message for debugging

Loading states: skeleton placeholders while campaigns load, disabled/pending buttons mid-transaction, and a distinct pending/success/error look in `TransactionStatus`.

## Extending this project

This version tracks contribution and goal amounts as plain ledger bookkeeping (an `i128` per campaign) rather than moving real XLM, so the contract logic is fully unit-testable without a token dependency. A production version would:

- Route `contribute`/`claim` through the native XLM Stellar Asset Contract (`soroban_sdk::token::Client`) to actually escrow and disburse funds
- Add a refund path for campaigns that miss their goal
- Paginate `get_all_campaigns` instead of fetching every campaign on load
- Add a contract-level admin pause switch

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

- **Contracts job:** `cargo test --workspace`, then builds the release Wasm and uploads it as a build artifact
- **Frontend job:** `next lint`, `tsc --noEmit`, `npm test` (Vitest), then `next build`

Screenshot the Actions tab showing a green run for your submission.

## Submission checklist

- [ ] Public GitHub repository (push this project, keep the commit history)
- [ ] This README, filled in with your contract IDs, tx hash, live demo link, and video link
- [ ] 10+ meaningful commits (this repo ships with an initial history — keep committing as you deploy/customize)
- [ ] Live demo link (Vercel/Netlify)
- [ ] Contract deployment addresses (both contracts)
- [ ] Transaction hash for a real contract interaction
- [ ] Screenshot: mobile responsive UI (resize your browser or use dev tools' device toolbar)
- [ ] Screenshot: CI/CD pipeline running green in the Actions tab
- [ ] Screenshot: test output showing 3+ passing tests (`cargo test` and/or `npm test`)
- [ ] Demo video (1–2 minutes): connect wallet → create campaign → contribute → show live activity feed updating → claim
