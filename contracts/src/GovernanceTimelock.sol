// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernanceTimelock
 * @dev Queues, cancels, and executes delayed administrative calls.
 *
 * Grant privileged roles on protocol contracts to this timelock, then assign
 * proposer/executor roles here to the multisig admin path.
 */
contract GovernanceTimelock is AccessControl {
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    uint256 public minDelay;
    mapping(bytes32 => uint256) public timestamps;

    event AdminActionQueued(
        bytes32 indexed operationId,
        address indexed proposer,
        address indexed target,
        uint256 value,
        bytes data,
        bytes32 salt,
        uint256 eta
    );
    event AdminActionExecuted(bytes32 indexed operationId, address indexed executor, address indexed target, uint256 value);
    event AdminActionCancelled(bytes32 indexed operationId, address indexed canceller);
    event MinDelayUpdated(uint256 oldDelay, uint256 newDelay);

    error InvalidDelay();
    error ZeroAddress();
    error OperationAlreadyQueued(bytes32 operationId);
    error OperationNotQueued(bytes32 operationId);
    error OperationNotReady(bytes32 operationId, uint256 eta);
    error TimelockOnly();

    constructor(
        uint256 minDelay_,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) {
        if (minDelay_ == 0) revert InvalidDelay();
        if (admin == address(0)) revert ZeroAddress();

        minDelay = minDelay_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CANCELLER_ROLE, admin);

        for (uint256 i = 0; i < proposers.length; i++) {
            if (proposers[i] == address(0)) revert ZeroAddress();
            _grantRole(PROPOSER_ROLE, proposers[i]);
            _grantRole(CANCELLER_ROLE, proposers[i]);
        }

        for (uint256 i = 0; i < executors.length; i++) {
            if (executors[i] == address(0)) revert ZeroAddress();
            _grantRole(EXECUTOR_ROLE, executors[i]);
        }
    }

    function hashOperation(address target, uint256 value, bytes calldata data, bytes32 salt)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(target, value, keccak256(data), salt));
    }

    function queue(address target, uint256 value, bytes calldata data, bytes32 salt)
        external
        onlyRole(PROPOSER_ROLE)
        returns (bytes32 operationId)
    {
        if (target == address(0)) revert ZeroAddress();

        operationId = hashOperation(target, value, data, salt);
        if (timestamps[operationId] != 0) revert OperationAlreadyQueued(operationId);

        uint256 eta = block.timestamp + minDelay;
        timestamps[operationId] = eta;

        emit AdminActionQueued(operationId, msg.sender, target, value, data, salt, eta);
    }

    function cancel(bytes32 operationId) external onlyRole(CANCELLER_ROLE) {
        if (timestamps[operationId] == 0) revert OperationNotQueued(operationId);
        delete timestamps[operationId];
        emit AdminActionCancelled(operationId, msg.sender);
    }

    function execute(address target, uint256 value, bytes calldata data, bytes32 salt)
        external
        payable
        onlyRole(EXECUTOR_ROLE)
        returns (bytes memory result)
    {
        bytes32 operationId = hashOperation(target, value, data, salt);
        uint256 eta = timestamps[operationId];
        if (eta == 0) revert OperationNotQueued(operationId);
        if (block.timestamp < eta) revert OperationNotReady(operationId, eta);

        delete timestamps[operationId];

        (bool success, bytes memory response) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(response, 32), mload(response))
            }
        }

        emit AdminActionExecuted(operationId, msg.sender, target, value);
        return response;
    }

    function updateDelay(uint256 newDelay) external {
        if (msg.sender != address(this)) revert TimelockOnly();
        if (newDelay == 0) revert InvalidDelay();

        uint256 oldDelay = minDelay;
        minDelay = newDelay;
        emit MinDelayUpdated(oldDelay, newDelay);
    }

    receive() external payable {}
}
