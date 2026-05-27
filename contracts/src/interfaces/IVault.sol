// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IVault
/// @notice Full ERC4626-compliant interface for the Harvest Finance modular yield vault.
interface IVault {
    // ── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event StrategyReported(address indexed strategy, uint256 gain, uint256 loss);
    event HarvestFeeUpdated(uint256 oldFee, uint256 newFee);
    event HarvestFeeCollected(address indexed recipient, uint256 amount);

    // ── ERC4626 core ─────────────────────────────────────────────────────────
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);

    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);

    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);

    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);

    function maxDeposit(address receiver) external view returns (uint256);
    function maxMint(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);

    // ── Vault metadata ───────────────────────────────────────────────────────
    function pricePerShare() external view returns (uint256);

    // ── Strategy management ──────────────────────────────────────────────────
    function addStrategy(address strategy, uint256 debtRatio) external;
    function removeStrategy(address strategy) external;
    function updateDebtRatio(address strategy, uint256 newDebtRatio) external;
    function reportStrategy(address strategy, uint256 gain, uint256 loss) external;
}
