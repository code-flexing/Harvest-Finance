// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/libraries/TokenValidation.sol";

/**
 * @title TokenValidationTest
 * @dev Comprehensive tests for the TokenValidation library.
 * Tests cover:
 * - Zero address rejection
 * - Non-contract address rejection
 * - Valid ERC20 token acceptance
 * - Whitelist functionality
 */
contract TokenValidationTest is Test {
    using TokenValidation for address;

    MockERC20 public validToken;
    address public zeroAddress = address(0);
    address public nonContractAddress = address(0x1234567890123456789012345678901234567890);
    address public walletAddress = address(0x1111111111111111111111111111111111111111);

    // Contract using TokenValidation library for testing
    TokenValidationTestContract public testContract;

    function setUp() public {
        validToken = new MockERC20("Test Token", "TEST", 1e30);
        testContract = new TokenValidationTestContract();
    }

    // ============================================================
    // Zero Address Tests
    // ============================================================

    function test_ValidateNonZero_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        TokenValidation.validateNonZero(zeroAddress);
    }

    function test_ValidateNonZero_AcceptsNonZeroAddress() public {
        // Should not revert
        TokenValidation.validateNonZero(address(validToken));
        TokenValidation.validateNonZero(walletAddress);
    }

    // ============================================================
    // Contract Existence Tests
    // ============================================================

    function test_ValidateContractExists_RejectsNonContract() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.validateContractExists(walletAddress);
    }

    function test_ValidateContractExists_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.validateContractExists(zeroAddress);
    }

    function test_ValidateContractExists_AcceptsContract() public {
        // Should not revert
        TokenValidation.validateContractExists(address(validToken));
        TokenValidation.validateContractExists(address(testContract));
    }

    // ============================================================
    // ERC20 Validation Tests
    // ============================================================

    function test_ValidateERC20_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        TokenValidation.validateERC20(zeroAddress);
    }

    function test_ValidateERC20_RejectsNonContract() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.validateERC20(walletAddress);
    }

    function test_ValidateERC20_RejectsNonERC20Contract() public {
        // A contract that doesn't implement ERC20 interface
        vm.expectRevert(TokenValidation.TokenValidation_NotERC20Compliant.selector);
        TokenValidation.validateERC20(address(testContract));
    }

    function test_ValidateERC20_AcceptsValidERC20() public {
        // Should not revert
        TokenValidation.validateERC20(address(validToken));
    }

    // ============================================================
    // Full Token Validation Tests
    // ============================================================

    function test_ValidateToken_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        TokenValidation.validateToken(zeroAddress);
    }

    function test_ValidateToken_RejectsNonContract() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.validateToken(walletAddress);
    }

    function test_ValidateToken_RejectsNonERC20() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotERC20Compliant.selector);
        TokenValidation.validateToken(address(testContract));
    }

    function test_ValidateToken_AcceptsValidToken() public {
        // Should not revert
        TokenValidation.validateToken(address(validToken));
    }

    // ============================================================
    // Whitelist Tests
    // ============================================================

    function test_WhitelistToken_AddsToWhitelist() public {
        TokenValidation.whitelistToken(address(validToken));
        assertTrue(TokenValidation.isWhitelisted(address(validToken)));
    }

    function test_WhitelistToken_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        TokenValidation.whitelistToken(zeroAddress);
    }

    function test_WhitelistToken_RejectsNonContract() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.whitelistToken(walletAddress);
    }

    function test_WhitelistToken_RejectsNonERC20() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotERC20Compliant.selector);
        TokenValidation.whitelistToken(address(testContract));
    }

    function test_UnwhitelistToken_RemovesFromWhitelist() public {
        TokenValidation.whitelistToken(address(validToken));
        assertTrue(TokenValidation.isWhitelisted(address(validToken)));

        TokenValidation.unwhitelistToken(address(validToken));
        assertFalse(TokenValidation.isWhitelisted(address(validToken)));
    }

    function test_ValidateWhitelisted_AcceptsWhitelistedToken() public {
        TokenValidation.whitelistToken(address(validToken));
        // Should not revert
        TokenValidation.validateWhitelisted(address(validToken));
    }

    function test_ValidateWhitelisted_RejectsNonWhitelistedToken() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotWhitelisted.selector);
        TokenValidation.validateWhitelisted(address(validToken));
    }

    function test_ValidateWhitelisted_RejectsZeroAddress() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        TokenValidation.validateWhitelisted(zeroAddress);
    }

    function test_ValidateTokenAndWhitelist_AcceptsWhitelistedToken() public {
        TokenValidation.whitelistToken(address(validToken));
        // Should not revert
        TokenValidation.validateTokenAndWhitelist(address(validToken));
    }

    function test_ValidateTokenAndWhitelist_RejectsNonWhitelistedToken() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotWhitelisted.selector);
        TokenValidation.validateTokenAndWhitelist(address(validToken));
    }

    function test_ValidateTokenAndWhitelist_RejectsInvalidToken() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        TokenValidation.validateTokenAndWhitelist(walletAddress);
    }

    // ============================================================
    // Integration Tests with TestContract
    // ============================================================

    function test_TestContract_ValidateNonZero() public {
        vm.expectRevert(TokenValidation.TokenValidation_ZeroAddress.selector);
        testContract.testValidateNonZero(zeroAddress);
    }

    function test_TestContract_ValidateContractExists() public {
        vm.expectRevert(TokenValidation.TokenValidation_NotAContract.selector);
        testContract.testValidateContractExists(walletAddress);
    }

    function test_TestContract_ValidateERC20() public {
        // Should not revert
        testContract.testValidateERC20(address(validToken));
    }

    function test_TestContract_WhitelistOperations() public {
        testContract.testWhitelistToken(address(validToken));
        assertTrue(testContract.isWhitelisted(address(validToken)));

        testContract.testUnwhitelistToken(address(validToken));
        assertFalse(testContract.isWhitelisted(address(validToken)));
    }
}

/**
 * @title TokenValidationTestContract
 * @dev Test contract that uses TokenValidation library to test internal functions.
 */
contract TokenValidationTestContract {
    using TokenValidation for address;

    mapping(address => bool) public whitelisted;

    function testValidateNonZero(address token) public pure {
        token.validateNonZero();
    }

    function testValidateContractExists(address token) public view {
        token.validateContractExists();
    }

    function testValidateERC20(address token) public view {
        token.validateERC20();
    }

    function testValidateToken(address token) public view {
        token.validateToken();
    }

    function testWhitelistToken(address token) public {
        token.whitelistToken();
        whitelisted[token] = true;
    }

    function testUnwhitelistToken(address token) public {
        token.unwhitelistToken();
        whitelisted[token] = false;
    }

    function isWhitelisted(address token) public view returns (bool) {
        return token.isWhitelisted();
    }
}