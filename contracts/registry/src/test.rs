#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;

fn setup(env: &Env) -> (Address, RegistryContractClient) {
    let contract_id = env.register(RegistryContract, ());
    (contract_id.clone(), RegistryContractClient::new(env, &contract_id))
}

#[test]
fn initialize_and_record_contribution() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let crowdfunding = Address::generate(&env);
    let contributor = Address::generate(&env);

    client.initialize(&admin, &crowdfunding);

    let new_total = client.record_contribution(&crowdfunding, &1, &contributor, &500);
    assert_eq!(new_total, 500);
    assert_eq!(client.get_campaign_total(&1), 500);
    assert_eq!(client.get_total_raised(), 500);

    // A second contribution to the same campaign accumulates.
    client.record_contribution(&crowdfunding, &1, &contributor, &250);
    assert_eq!(client.get_campaign_total(&1), 750);
    assert_eq!(client.get_total_raised(), 750);
}

#[test]
fn rejects_unauthorized_caller() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let crowdfunding = Address::generate(&env);
    let impostor = Address::generate(&env);
    let contributor = Address::generate(&env);

    client.initialize(&admin, &crowdfunding);

    let result = client.try_record_contribution(&impostor, &1, &contributor, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn rejects_non_positive_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let crowdfunding = Address::generate(&env);
    let contributor = Address::generate(&env);

    client.initialize(&admin, &crowdfunding);

    let result = client.try_record_contribution(&crowdfunding, &1, &contributor, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn cannot_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let crowdfunding = Address::generate(&env);

    client.initialize(&admin, &crowdfunding);
    let result = client.try_initialize(&admin, &crowdfunding);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn tracks_separate_campaigns_independently() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let crowdfunding = Address::generate(&env);
    let contributor = Address::generate(&env);

    client.initialize(&admin, &crowdfunding);
    client.record_contribution(&crowdfunding, &1, &contributor, &300);
    client.record_contribution(&crowdfunding, &2, &contributor, &700);

    assert_eq!(client.get_campaign_total(&1), 300);
    assert_eq!(client.get_campaign_total(&2), 700);
    assert_eq!(client.get_total_raised(), 1000);
}
