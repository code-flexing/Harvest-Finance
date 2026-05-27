# Harvest Finance DAO Governance

This document defines the rules and parameters for the Harvest Finance decentralized autonomous organization (DAO).

## Architecture

The governance mechanism utilizes OpenZeppelin's standard DAO contract suite:
- **HarvestToken (ERC20Votes)**: The governance token (`HARV`) representing voting weight.
- **HarvestGovernor**: The primary logic contract handling the proposal lifecycle (Propose, Vote, Execute/Cancel).
- **HarvestTimelock**: The smart contract acting as the "owner" of the protocol's upgradeable components and treasury. It enforces a minimum wait time between a passed vote and execution.

## Governance Rules

### 1. Delegation
Before a user can participate in governance, they **must** delegate their voting weight. A user may delegate to themselves or to another trusted community member. Voting power is snapshotted when a proposal is created to prevent double-voting.

### 2. Proposal Threshold
- **Current Threshold**: `0 HARV`
- *Note*: This is initially set to zero for the bootstrap phase but can be adjusted via a governance vote (calling `setProposalThreshold`) to prevent spam.

### 3. Voting Delay & Period
- **Voting Delay**: `1 block`
  - The time between when a proposal is submitted and when voting begins.
  - Allows token holders a brief window to ensure their delegations are set.
- **Voting Period**: `50,400 blocks` (~1 week on Ethereum mainnet)
  - The duration for which the voting polls are open.

### 4. Quorum
- **Required Quorum**: `4%` of the total `HARV` supply.
- A proposal must receive "For" votes totaling at least 4% of the circulating supply at the snapshot block to be eligible to pass.

### 5. Timelock Execution
- **Minimum Delay**: Defined at Timelock deployment (typically 24 to 48 hours).
- If a proposal successfully passes, it is moved to the `Queued` state in the Timelock.
- After the time delay expires, anyone can call the execution function, triggering the Timelock to perform the proposed on-chain actions.

## Proposal Lifecycle

1. **Propose**: A member creates a proposal encompassing target addresses, transaction values, execution calldata, and a description.
2. **Pending**: The proposal is pending for the `Voting Delay` period (1 block).
3. **Active**: The poll opens. Members vote `For`, `Against`, or `Abstain`.
4. **Succeeded / Defeated**: Once the `Voting Period` concludes, the proposal succeeds if `For > Against` and `For + Abstain >= Quorum`.
5. **Queued**: If successful, the proposal is pushed into the Timelock.
6. **Executed**: After the Timelock delay, the transactions are executed on-chain.

## Security & Upgradability

- **Access Control**: To ensure the protocol is decentralized, the `Vault` contract (and other administrative functions) should transfer its `ADMIN_ROLE` or ownership to the `HarvestTimelock` contract address.
- **Parameter Adjustments**: Any changes to Quorum, Voting Delay, Voting Period, or Timelock duration can solely be executed via a successful governance proposal calling the respective setter functions on the Governor/Timelock contracts.