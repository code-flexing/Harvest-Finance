// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title HarvestTimelock
 * @dev Acts as the executor of the DAO. It enforces a minimum delay for executed proposals.
 * The Governor contract should be granted the PROPOSER_ROLE and CANCELLER_ROLE.
 * The EXECUTOR_ROLE should generally be left open (address(0)) so anyone can execute a passed and queued proposal.
 */
contract HarvestTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {
        // The admin role is usually renounced after setup to ensure the DAO has exclusive control
    }
}