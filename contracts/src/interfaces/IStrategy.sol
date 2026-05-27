// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IStrategy
/// @notice Interface for pluggable yield strategies used by Harvest Finance vaults
interface IStrategy {
    // ── Events ───────────────────────────────────────────────────────────────
    event Harvested(uint256 gain, uint256 loss);
    event EmergencyExitEnabled();

    // ── Core ─────────────────────────────────────────────────────────────────

    /// @notice Deploy idle funds into the underlying protocol
    function invest() external;

    /// @notice Harvest yield, report gain/loss to vault
    /// @return gain Profit realised since last harvest
    /// @return loss Loss realised since last harvest
    function harvest() external returns (uint256 gain, uint256 loss);

    /// @notice Withdraw `amount` of underlying asset back to vault
    /// @return withdrawn Actual amount withdrawn (may be less than requested)
    function withdraw(uint256 amount) external returns (uint256 withdrawn);

    /// @notice Liquidate all positions and return funds to vault (emergency)
    function emergencyExit() external;

    // ── View ─────────────────────────────────────────────────────────────────

    /// @notice Total assets managed by this strategy (deployed + idle)
    function estimatedTotalAssets() external view returns (uint256);

    /// @notice The vault this strategy reports to
    function vault() external view returns (address);

    /// @notice The underlying asset token address
    function want() external view returns (address);

    /// @notice Whether the strategy is in emergency exit mode
    function isEmergencyExit() external view returns (bool);
}
