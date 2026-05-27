// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./BaseStrategy.sol";
import "./MockERC20.sol";

/**
 * @title MockAaveStrategy
 * @notice Concrete strategy that simulates Aave-style lending for testing.
 *
 * Behaviour:
 *  - invest()       — "deposits" want tokens into a mock Aave pool (tracked as `deployed`)
 *  - harvest()      — accrues configurable APY and reports gain to vault
 *  - withdraw()     — pulls funds back from the mock pool
 *  - emergencyExit()— liquidates everything and returns to vault
 *
 * The mock pool is simulated entirely in-contract; no external calls are made.
 * Gain tokens are minted via MockERC20.mint() to simulate yield accrual.
 */
contract MockAaveStrategy is BaseStrategy {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Simulated balance deployed into the mock Aave pool
    uint256 public deployedBalance;

    /// @notice Configurable gain to return on next harvest (set by tests)
    uint256 public pendingGain;

    /// @notice Configurable loss to return on next harvest (set by tests)
    uint256 public pendingLoss;

    // ── Initializer ──────────────────────────────────────────────────────────

    function initialize(address _vault, address _want, address _admin) external initializer {
        __BaseStrategy_init(_vault, _want, _admin);
    }

    // ── Test helpers ─────────────────────────────────────────────────────────

    function setPendingGain(uint256 gain) external { pendingGain = gain; }
    function setPendingLoss(uint256 loss) external { pendingLoss = loss; }

    // ── IStrategy view ───────────────────────────────────────────────────────

    /// @inheritdoc IStrategy
    function estimatedTotalAssets() external view override returns (uint256) {
        return IERC20Upgradeable(want).balanceOf(address(this)) + deployedBalance;
    }

    // ── Internal hooks ───────────────────────────────────────────────────────

    /// @dev Move idle want balance into the simulated Aave pool.
    function _invest() internal override {
        uint256 idle = IERC20Upgradeable(want).balanceOf(address(this));
        if (idle > 0) {
            deployedBalance += idle;
            // In a real strategy: aToken.deposit(want, idle, address(this), 0)
            // Here the tokens remain in this contract; deployedBalance tracks them.
        }
    }

    /// @dev Simulate yield accrual: mint gain tokens, consume pendingLoss from deployed.
    function _harvest() internal override returns (uint256 gain, uint256 loss) {
        gain = pendingGain;
        loss = pendingLoss;
        pendingGain = 0;
        pendingLoss = 0;

        if (gain > 0) {
            // Mint yield tokens to simulate Aave interest
            MockERC20(want).mint(address(this), gain);
            deployedBalance += gain;
        }
        if (loss > 0 && loss <= deployedBalance) {
            deployedBalance -= loss;
        }
    }

    /// @dev Withdraw `amount` from the simulated pool.
    function _withdrawSome(uint256 amount) internal override returns (uint256 freed) {
        freed = amount > deployedBalance ? deployedBalance : amount;
        deployedBalance -= freed;
        // Tokens are already held by this contract; nothing to transfer.
    }

    /// @dev Liquidate entire simulated pool position.
    function _withdrawAll() internal override {
        deployedBalance = 0;
    }
}
