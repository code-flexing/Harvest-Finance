// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IStrategy.sol";

/**
 * @title StrategyManager
 * @notice Central coordinator for adding, removing, rebalancing, and harvesting
 *         strategies across multiple BaseVault instances.
 */
contract StrategyManager is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    error ZeroAddress();
    error LengthMismatch();
    error AllocateFailed();

    event StrategyAdded(address indexed vault, address indexed strategy, uint256 debtRatio);
    event StrategyRemoved(address indexed vault, address indexed strategy);
    event DebtRatioUpdated(address indexed vault, address indexed strategy, uint256 newDebtRatio);
    event Rebalanced(address indexed vault);
    event Harvested(address indexed vault, address indexed strategy, uint256 gain, uint256 loss);

    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE,       _admin);
    }

    // ── Strategy lifecycle ───────────────────────────────────────────────────

    function addStrategy(address vault, address strategy, uint256 debtRatio)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (vault == address(0) || strategy == address(0)) revert ZeroAddress();
        IVault(vault).addStrategy(strategy, debtRatio);
        emit StrategyAdded(vault, strategy, debtRatio);
    }

    function removeStrategy(address vault, address strategy)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (vault == address(0) || strategy == address(0)) revert ZeroAddress();
        IVault(vault).removeStrategy(strategy);
        emit StrategyRemoved(vault, strategy);
    }

    /// @notice Update the debt ratio of a strategy on a vault.
    function updateDebtRatio(address vault, address strategy, uint256 newDebtRatio)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (vault == address(0) || strategy == address(0)) revert ZeroAddress();
        IVault(vault).updateDebtRatio(strategy, newDebtRatio);
        emit DebtRatioUpdated(vault, strategy, newDebtRatio);
    }

    // ── Operations ───────────────────────────────────────────────────────────

    function harvestStrategy(address strategy) external onlyRole(MANAGER_ROLE) {
        if (strategy == address(0)) revert ZeroAddress();
        address vault = IStrategy(strategy).vault();
        (uint256 gain, uint256 loss) = IStrategy(strategy).harvest();
        emit Harvested(vault, strategy, gain, loss);
    }

    function harvestBatch(address[] calldata strategies_) external onlyRole(MANAGER_ROLE) {
        uint256 len = strategies_.length;
        for (uint256 i; i < len; ++i) {
            address strategy = strategies_[i];
            address vault    = IStrategy(strategy).vault();
            (uint256 gain, uint256 loss) = IStrategy(strategy).harvest();
            emit Harvested(vault, strategy, gain, loss);
        }
    }

    /// @notice Trigger capital rebalancing on a single vault.
    function rebalance(address vault) external onlyRole(MANAGER_ROLE) {
        if (vault == address(0)) revert ZeroAddress();
        (bool ok,) = vault.call(abi.encodeWithSignature("allocate()"));
        if (!ok) revert AllocateFailed();
        emit Rebalanced(vault);
    }

    /// @notice Rebalance multiple vaults in one transaction.
    function batchRebalance(address[] calldata vaults) external onlyRole(MANAGER_ROLE) {
        uint256 len = vaults.length;
        for (uint256 i; i < len; ++i) {
            address vault = vaults[i];
            if (vault == address(0)) revert ZeroAddress();
            (bool ok,) = vault.call(abi.encodeWithSignature("allocate()"));
            if (!ok) revert AllocateFailed();
            emit Rebalanced(vault);
        }
    }

    function triggerEmergencyExit(address strategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (strategy == address(0)) revert ZeroAddress();
        IStrategy(strategy).emergencyExit();
    }
}
