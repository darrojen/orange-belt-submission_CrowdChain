pub const WASM: &[u8] = soroban_sdk::contractfile!(
    file = "..\\..\\target\\wasm32v1-none\\release\\registry_contract.wasm",
    sha256 = "118a7949eaedb054782ba5b65ae1b1a39d30e5548dec919d2df303ee9efa51e6"
);

#[soroban_sdk::contractargs(name = "Args")]
#[soroban_sdk::contractclient(name = "Client")]
pub trait Contract {
    fn initialize(
        env: soroban_sdk::Env,
        admin: soroban_sdk::Address,
        crowdfunding_contract: soroban_sdk::Address,
    ) -> Result<(), Error>;

    fn get_total_raised(env: soroban_sdk::Env) -> i128;

    fn get_campaign_total(
        env: soroban_sdk::Env,
        campaign_id: u32,
    ) -> i128;

    fn record_contribution(
        env: soroban_sdk::Env,
        caller: soroban_sdk::Address,
        campaign_id: u32,
        contributor: soroban_sdk::Address,
        amount: i128,
    ) -> Result<i128, Error>;

    fn get_crowdfunding_contract(
        env: soroban_sdk::Env,
    ) -> Result<soroban_sdk::Address, Error>;
}

#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum DataKey {
    Admin,
    CrowdfundingContract,
    TotalRaised,
    CampaignTotal(u32),
    Initialized,
}

#[soroban_sdk::contracterror(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
}