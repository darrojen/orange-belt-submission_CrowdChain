#![cfg(test)]

use super::*;
use registry_contract::RegistryContract;
use soroban_sdk::testutils::{Address as _, Ledger};

struct TestSetup {
    env: Env,
    crowdfunding: CrowdfundingContractClient<'static>,
    registry: RegistryContractClient<'static>,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let crowdfunding_id = env.register(CrowdfundingContract, ());
    let registry_id = env.register(RegistryContract, ());

    let crowdfunding = CrowdfundingContractClient::new(&env, &crowdfunding_id);
    let registry = RegistryContractClient::new(&env, &registry_id);

    let admin = Address::generate(&env);
    // Registry only trusts calls that come from this specific contract address.
    registry.initialize(&admin, &crowdfunding_id);
    crowdfunding.initialize(&admin, &registry_id);

    TestSetup { env, crowdfunding, registry }
}

#[test]
fn create_campaign_and_contribute_updates_registry() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let contributor = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &1000, &1000);
    assert_eq!(id, 0);

    let new_raised = setup.crowdfunding.contribute(&id, &contributor, &400);
    assert_eq!(new_raised, 400);

    // The cross-contract call landed: Registry independently reflects the
    // same contribution without the test touching Registry directly.
    assert_eq!(setup.registry.get_campaign_total(&id), 400);
    assert_eq!(setup.registry.get_total_raised(), 400);

    let campaign = setup.crowdfunding.get_campaign(&id);
    assert_eq!(campaign.raised, 400);
    assert_eq!(campaign.goal, 1000);
}

#[test]
fn multiple_contributions_accumulate_in_both_contracts() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let alice = Address::generate(&setup.env);
    let bob = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &1000, &1000);
    setup.crowdfunding.contribute(&id, &alice, &300);
    setup.crowdfunding.contribute(&id, &bob, &300);

    assert_eq!(setup.crowdfunding.get_campaign(&id).raised, 600);
    assert_eq!(setup.registry.get_campaign_total(&id), 600);
}

#[test]
fn rejects_contribution_after_deadline() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let contributor = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &1000, &100);

    setup.env.ledger().with_mut(|li| li.sequence_number += 101);

    let result = setup.crowdfunding.try_contribute(&id, &contributor, &50);
    assert_eq!(result, Err(Ok(Error::CampaignExpired)));
}

#[test]
fn claim_requires_goal_met_and_deadline_passed() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let contributor = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &500, &100);
    setup.crowdfunding.contribute(&id, &contributor, &500);

    // Deadline hasn't passed yet.
    let too_early = setup.crowdfunding.try_claim(&id, &creator);
    assert_eq!(too_early, Err(Ok(Error::CampaignStillOpen)));

    setup.env.ledger().with_mut(|li| li.sequence_number += 101);

    let raised = setup.crowdfunding.claim(&id, &creator);
    assert_eq!(raised, 500);

    let already = setup.crowdfunding.try_claim(&id, &creator);
    assert_eq!(already, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn claim_rejects_when_goal_not_met() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let contributor = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &1000, &100);
    setup.crowdfunding.contribute(&id, &contributor, &200);

    setup.env.ledger().with_mut(|li| li.sequence_number += 101);

    let result = setup.crowdfunding.try_claim(&id, &creator);
    assert_eq!(result, Err(Ok(Error::GoalNotMet)));
}

#[test]
fn claim_rejects_non_creator() {
    let setup = setup();
    let creator = Address::generate(&setup.env);
    let stranger = Address::generate(&setup.env);
    let contributor = Address::generate(&setup.env);

    let id = setup.crowdfunding.create_campaign(&creator, &500, &100);
    setup.crowdfunding.contribute(&id, &contributor, &500);
    setup.env.ledger().with_mut(|li| li.sequence_number += 101);

    let result = setup.crowdfunding.try_claim(&id, &stranger);
    assert_eq!(result, Err(Ok(Error::NotCreator)));
}
