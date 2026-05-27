// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title TokenValidation
 * @dev Library for validating token addresses before contract interactions.
 * Provides functions to:
 * - Reject zero addresses
 * - Verify contract code exists (extcodesize)
 * - Check ERC20 interface compliance (optional)
 * - Maintain whitelist of supported tokens
 */
library TokenValidation {
    // ============================================================
    // Custom Errors
    // ============================================================

    error TokenValidation_ZeroAddress();
    error TokenValidation_NotAContract();
    error TokenValidation_NotERC20Compliant();
    error TokenValidation_NotWhitelisted();

    // ============================================================
    // Storage
    // ============================================================

    /// @dev Mapping of whitelisted tokens. Can be extended by contracts using this library.
    mapping(address => bool) private _whitelistedTokens;

    // ============================================================
    // Basic Validation
    // ============================================================

    /**
     * @notice Validates that a token address is not zero.
     * @param token The token address to validate.
     */
    function validateNonZero(address token) internal pure {
        if (token == address(0)) revert TokenValidation_ZeroAddress();
    }

    /**
     * @notice Validates that a token address has contract code deployed.
     * @param token The token address to validate.
     */
    function validateContractExists(address token) internal view {
        if (token.code.length == 0) revert TokenValidation_NotAContract();
    }

    /**
     * @notice Validates that a token address is a valid ERC20 token.
     * Checks that:
     * 1. Address is not zero
     * 2. Contract code exists
     * 3. Basic ERC20 interface functions respond correctly
     * @param token The token address to validate.
     */
    function validateERC20(address token) internal view {
        validateNonZero(token);
        validateContractExists(token);

        // Check ERC20 interface compliance by calling view functions
        // These should not revert for a valid ERC20 token
        (bool success, ) = token.staticcall(
            abi.encodeWithSelector(IERC20Metadata.name.selector)
        );
        if (!success) revert TokenValidation_NotERC20Compliant();

        (success, ) = token.staticcall(
            abi.encodeWithSelector(IERC20Metadata.symbol.selector)
        );
        if (!success) revert TokenValidation_NotERC20Compliant();

        (success, ) = token.staticcall(
            abi.encodeWithSelector(IERC20Metadata.decimals.selector)
        );
        if (!success) revert TokenValidation_NotERC20Compliant();
    }

    /**
     * @notice Full validation: zero check, contract check, and ERC20 compliance.
     * @param token The token address to validate.
     */
    function validateToken(address token) internal view {
        validateNonZero(token);
        validateContractExists(token);
        validateERC20(token);
    }

    // ============================================================
    // Whitelist Management
    // ============================================================

    /**
     * @notice Adds a token to the whitelist.
     * @param token The token address to whitelist.
     */
    function whitelistToken(address token) internal {
        validateToken(token);
        _whitelistedTokens[token] = true;
    }

    /**
     * @notice Removes a token from the whitelist.
     * @param token The token address to remove from whitelist.
     */
    function unwhitelistToken(address token) internal {
        validateNonZero(token);
        _whitelistedTokens[token] = false;
    }

    /**
     * @notice Checks if a token is whitelisted.
     * @param token The token address to check.
     * @return True if the token is whitelisted.
     */
    function isWhitelisted(address token) internal view returns (bool) {
        return _whitelistedTokens[token];
    }

    /**
     * @notice Validates that a token is whitelisted.
     * @param token The token address to validate.
     */
    function validateWhitelisted(address token) internal view {
        if (!isWhitelisted(token)) revert TokenValidation_NotWhitelisted();
    }

    /**
     * @notice Full validation including whitelist check.
     * @param token The token address to validate.
     */
    function validateTokenAndWhitelist(address token) internal view {
        validateToken(token);
        validateWhitelisted(token);
    }
}

/**
 * @title IERC20Metadata
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 */
interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}