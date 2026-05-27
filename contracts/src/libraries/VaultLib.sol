// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title VaultLib
/// @notice Pure math library for share/asset conversions used by Vault
library VaultLib {
    /// @notice Convert assets to shares given current vault state
    /// @param assets Amount of assets to convert
    /// @param totalSupply Current total share supply
    /// @param totalAssets_ Current total assets in vault
    /// @return shares Equivalent share amount
    function toShares(
        uint256 assets,
        uint256 totalSupply,
        uint256 totalAssets_
    ) internal pure returns (uint256 shares) {
        if (totalSupply == 0) return assets;
        return (assets * totalSupply) / totalAssets_;
    }

    /// @notice Convert shares to assets given current vault state
    /// @param shares Amount of shares to convert
    /// @param totalSupply Current total share supply
    /// @param totalAssets_ Current total assets in vault
    /// @return assets Equivalent asset amount
    function toAssets(
        uint256 shares,
        uint256 totalSupply,
        uint256 totalAssets_
    ) internal pure returns (uint256 assets) {
        if (totalSupply == 0) return shares;
        return (shares * totalAssets_) / totalSupply;
    }
}
