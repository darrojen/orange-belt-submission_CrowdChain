#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

/// The Registry is a second, independent contract whose only job is to keep
/// a global ledger of activity across every campaign managed by the
/// Crowdfunding contract. It never talks to a wallet directly — the only
/// caller it accepts is the Crowdfunding contract itself, authorized once
/// at `initialize` and verified on every write via `require_auth`.
///
/// This is the inter-contract communication piece of the submission:
/// Crowdfunding::contribute() invokes Registry::record_contribution() as
/// part of the same transaction, and Registry checks that the caller is
/// really the Crowdfunding contract before trusting the numbers it's given.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    CrowdfundingContract,
    TotalRaised,
    CampaignTotal(u32),
    Initialized,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
}

/// Topic for contribution events: (CONTRIB_EVENT, campaign_id) -> (contributor, amount, campaign_total, global_total)
const CONTRIB_EVENT: Symbol = symbol_short!("contrib");

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    /// One-time setup. `crowdfunding_contract` is the only address that will
    /// ever be allowed to call `record_contribution`.
    pub fn initialize(env: Env, admin: Address, crowdfunding_contract: Address) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::CrowdfundingContract, &crowdfunding_contract);
        env.storage().instance().set(&DataKey::TotalRaised, &0i128);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().extend_ttl(500_000, 500_000);

        Ok(())
    }

    /// Records a contribution. `caller` must be the registered Crowdfunding
    /// contract address. When a contract calls another contract directly
    /// (rather than an end user calling it), `require_auth` on the
    /// *calling contract's own address* is satisfied automatically by the
    /// runtime — no separate signature is needed — which is what makes this
    /// a safe way to gate access to one specific contract.
    pub fn record_contribution(
        env: Env,
        caller: Address,
        campaign_id: u32,
        contributor: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        caller.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let expected: Address = env
            .storage()
            .instance()
            .get(&DataKey::CrowdfundingContract)
            .unwrap();
        if caller != expected {
            return Err(Error::Unauthorized);
        }

        let campaign_key = DataKey::CampaignTotal(campaign_id);
        let campaign_total: i128 = env.storage().instance().get(&campaign_key).unwrap_or(0);
        let new_campaign_total = campaign_total + amount;
        env.storage().instance().set(&campaign_key, &new_campaign_total);

        let total_raised: i128 = env.storage().instance().get(&DataKey::TotalRaised).unwrap_or(0);
        let new_total = total_raised + amount;
        env.storage().instance().set(&DataKey::TotalRaised, &new_total);

        env.events().publish(
            (CONTRIB_EVENT, campaign_id),
            (contributor, amount, new_campaign_total, new_total),
        );

        Ok(new_campaign_total)
    }

    pub fn get_total_raised(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalRaised).unwrap_or(0)
    }

    pub fn get_campaign_total(env: Env, campaign_id: u32) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignTotal(campaign_id))
            .unwrap_or(0)
    }

    pub fn get_crowdfunding_contract(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::CrowdfundingContract)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
