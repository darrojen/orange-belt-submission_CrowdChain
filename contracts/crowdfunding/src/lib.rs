#![no_std]
use registry_contract::RegistryContractClient;
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

/// Core campaign record. Amounts are tracked as plain i128 ledger entries
/// (bookkeeping only) rather than moving a real asset, so the contract
/// logic — goals, deadlines, one-claim-per-campaign — can be fully unit
/// tested without wiring up a token contract. A production version would
/// swap `contribute`/`claim` to move funds through the native XLM Stellar
/// Asset Contract (`token::Client`); see the README's "Extending this
/// project" section.
#[derive(Clone)]
#[contracttype]
pub struct Campaign {
    pub creator: Address,
    pub goal: i128,
    pub deadline_ledger: u32,
    pub raised: i128,
    pub claimed: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Registry,
    NextCampaignId,
    Campaign(u32),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidGoal = 3,
    InvalidAmount = 4,
    CampaignNotFound = 5,
    CampaignExpired = 6,
    NotCreator = 7,
    GoalNotMet = 8,
    AlreadyClaimed = 9,
    CampaignStillOpen = 10,
}

const CREATED_EVENT: Symbol = symbol_short!("created");
const CLAIMED_EVENT: Symbol = symbol_short!("claimed");

#[contract]
pub struct CrowdfundingContract;

#[contractimpl]
impl CrowdfundingContract {
    /// `registry` is the deployed Registry contract's address. It must be
    /// initialized separately with this crowdfunding contract's own address
    /// as its authorized caller before any contribution will succeed.
    pub fn initialize(env: Env, admin: Address, registry: Address) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::NextCampaignId, &0u32);
        env.storage().instance().extend_ttl(500_000, 500_000);

        Ok(())
    }

    /// Creates a new campaign and returns its id. `duration_ledgers` is
    /// added to the current ledger sequence to compute the deadline —
    /// Stellar's ledger close time averages ~5 seconds, so e.g. ~17,280
    /// ledgers is roughly one day.
    pub fn create_campaign(
        env: Env,
        creator: Address,
        goal: i128,
        duration_ledgers: u32,
    ) -> Result<u32, Error> {
        creator.require_auth();

        if goal <= 0 {
            return Err(Error::InvalidGoal);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextCampaignId)
            .unwrap_or(0);

        let deadline_ledger = env.ledger().sequence() + duration_ledgers;
        let campaign = Campaign {
            creator: creator.clone(),
            goal,
            deadline_ledger,
            raised: 0,
            claimed: false,
        };

        env.storage().instance().set(&DataKey::Campaign(id), &campaign);
        env.storage().instance().set(&DataKey::NextCampaignId, &(id + 1));
        env.storage().instance().extend_ttl(500_000, 500_000);

        env.events().publish((CREATED_EVENT, id), (creator, goal, deadline_ledger));

        Ok(id)
    }

    /// Records a contribution against a campaign, then calls into the
    /// Registry contract so global stats stay in sync — this cross-contract
    /// call is what demonstrates inter-contract communication for this
    /// submission. If the Registry call fails (e.g. it rejects the caller),
    /// the whole transaction, including this contribution, is rolled back.
    pub fn contribute(env: Env, campaign_id: u32, contributor: Address, amount: i128) -> Result<i128, Error> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Campaign(campaign_id);
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&key)
            .ok_or(Error::CampaignNotFound)?;

        if env.ledger().sequence() > campaign.deadline_ledger {
            return Err(Error::CampaignExpired);
        }

        campaign.raised += amount;
        env.storage().instance().set(&key, &campaign);

        let registry_address: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = RegistryContractClient::new(&env, &registry_address);
        registry_client.record_contribution(
            &env.current_contract_address(),
            &campaign_id,
            &contributor,
            &amount,
        );

        Ok(campaign.raised)
    }

    /// Lets the creator mark a fully-funded, closed campaign as claimed.
    /// Bookkeeping only in this version — see the struct doc comment above.
    pub fn claim(env: Env, campaign_id: u32, caller: Address) -> Result<i128, Error> {
        caller.require_auth();

        let key = DataKey::Campaign(campaign_id);
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&key)
            .ok_or(Error::CampaignNotFound)?;

        if caller != campaign.creator {
            return Err(Error::NotCreator);
        }
        if env.ledger().sequence() <= campaign.deadline_ledger {
            return Err(Error::CampaignStillOpen);
        }
        if campaign.raised < campaign.goal {
            return Err(Error::GoalNotMet);
        }
        if campaign.claimed {
            return Err(Error::AlreadyClaimed);
        }

        campaign.claimed = true;
        env.storage().instance().set(&key, &campaign);

        env.events()
            .publish((CLAIMED_EVENT, campaign_id), (caller, campaign.raised));

        Ok(campaign.raised)
    }

    pub fn get_campaign(env: Env, campaign_id: u32) -> Result<Campaign, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)
    }

    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextCampaignId).unwrap_or(0)
    }
}

mod test;
