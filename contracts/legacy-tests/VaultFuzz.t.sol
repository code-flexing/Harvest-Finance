// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/Vault.sol";
import "../../src/MockERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title VaultFuzzTest
 * @dev Fuzz tests for Vault deposit/withdraw/redeem operations
 * Tests for:
 * - Math overflow/underflow scenarios
 * - State consistency across operations
 * - Edge cases with random inputs
 */
contract VaultFuzzTest is Test {
    Vault public vault;
    MockERC20 public token;
    
    address public user1 = address(0x1111);
    address public user2 = address(0x2222);
    
    uint256 constant MAX_ASSETS = 1e30; // Large but safe number

    function setUp() public {
        // Deploy mock token with large initial supply
        token = new MockERC20("Test Token", "TEST", 18);
        
        // Deploy vault implementation
        Vault implementation = new Vault();
        
        // Deploy proxy and initialize
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Vault.initialize.selector, address(token), "Vault Token", "vTEST", address(this))
        );
        
        vault = Vault(address(proxy));
        
        // Mint tokens to users
        token.mint(user1, 1e26);
        token.mint(user2, 1e26);
        
        // Approve vault to spend tokens
        vm.prank(user1);
        token.approve(address(vault), type(uint256).max);
        
        vm.prank(user2);
        token.approve(address(vault), type(uint256).max);
    }

    // ============== FUZZ TESTS: DEPOSIT ==============

    /**
     * @dev Fuzz test: deposit with random assets
     * Invariants:
     * - Shares minted should equal assets when vault is empty
     * - Vault totalAssets should increase by deposit amount
     * - User balance should increase by shares amount
     */
    function testFuzz_Deposit_RandomAssets(uint256 assets) public {
        // Bound assets to reasonable range
        assets = bound(assets, 1, 1e25);
        
        uint256 vaultAssetsBefore = vault.totalAssets();
        uint256 userSharesBefore = vault.balanceOf(user1);
        
        vm.prank(user1);
        uint256 sharesReceived = vault.deposit(assets, user1);
        
        // Invariant 1: Vault assets increased by deposit amount
        assertEq(
            vault.totalAssets(),
            vaultAssetsBefore + assets,
            "Vault totalAssets should increase by deposit amount"
        );
        
        // Invariant 2: User shares increased
        assertEq(
            vault.balanceOf(user1),
            userSharesBefore + sharesReceived,
            "User shares should increase by sharesReceived"
        );
        
        // Invariant 3: Shares returned matches balanceOf change
        assertGt(sharesReceived, 0, "Shares received should be greater than 0");
    }

    /**
     * @dev Fuzz test: sequential deposits preserve total
     * Invariant: Sum of user assets should equal vault total assets
     */
    function testFuzz_SequentialDeposits(uint256 assets1, uint256 assets2) public {
        assets1 = bound(assets1, 1, 1e24);
        assets2 = bound(assets2, 1, 1e24);
        
        vm.prank(user1);
        vault.deposit(assets1, user1);
        
        vm.prank(user2);
        vault.deposit(assets2, user2);
        
        // Invariant: Total vault assets = sum of deposits
        assertEq(
            vault.totalAssets(),
            assets1 + assets2,
            "Vault assets should equal sum of deposits"
        );
    }

    /**
     * @dev Fuzz test: deposit -> convert to shares ratio consistency
     */
    function testFuzz_DepositShareConversion(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        
        // First deposit
        vm.prank(user1);
        uint256 shares1 = vault.deposit(assets, user1);
        
        // Second deposit of same amount
        vm.prank(user2);
        uint256 shares2 = vault.deposit(assets, user2);
        
        // Invariant: Same deposit amount should yield same shares
        assertEq(
            shares1,
            shares2,
            "Same deposit should yield same shares when vault state is consistent"
        );
    }

    // ============== FUZZ TESTS: WITHDRAW ==============

    /**
     * @dev Fuzz test: withdraw with random assets after deposit
     * Invariants:
     * - Cannot withdraw more than deposited
     * - Vault totalAssets decreases by withdrawal amount
     * - User shares decrease by correct amount
     */
    function testFuzz_Withdraw_AfterDeposit(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, 1e24);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);
        
        // Deposit
        vm.prank(user1);
        vault.deposit(depositAmount, user1);
        
        uint256 vaultAssetsBefore = vault.totalAssets();
        uint256 userSharesBefore = vault.balanceOf(user1);
        
        // Withdraw
        vm.prank(user1);
        uint256 sharesBurned = vault.withdraw(withdrawAmount, user1, user1);
        
        // Invariant 1: Vault assets decreased correctly
        assertEq(
            vault.totalAssets(),
            vaultAssetsBefore - withdrawAmount,
            "Vault totalAssets should decrease by withdrawal amount"
        );
        
        // Invariant 2: User shares decreased
        assertEq(
            vault.balanceOf(user1),
            userSharesBefore - sharesBurned,
            "User shares should decrease by sharesBurned"
        );
        
        // Invariant 3: Shares burned should be positive
        assertGt(sharesBurned, 0, "Shares burned should be positive");
    }

    /**
     * @dev Fuzz test: cannot withdraw more than balance
     */
    function testFuzz_Withdraw_InsufficientBalance(uint256 depositAmount, uint256 excessWithdraw) public {
        depositAmount = bound(depositAmount, 1, 1e24);
        excessWithdraw = bound(excessWithdraw, depositAmount + 1, 2 * depositAmount);
        
        vm.prank(user1);
        vault.deposit(depositAmount, user1);
        
        // Try to withdraw more than available
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(excessWithdraw, user1, user1);
    }

    /**
     * @dev Fuzz test: withdraw -> deposit cycles maintain vault integrity
     */
    function testFuzz_WithdrawDepositCycles(uint256 assets) public {
        assets = bound(assets, 1, 1e23);
        
        vm.prank(user1);
        vault.deposit(assets, user1);
        
        uint256 assetsAfterFirstDeposit = vault.totalAssets();
        
        vm.prank(user1);
        vault.withdraw(assets / 2, user1, user1);
        
        uint256 assetsAfterWithdraw = vault.totalAssets();
        assertEq(assetsAfterWithdraw, assetsAfterFirstDeposit - (assets / 2));
        
        vm.prank(user1);
        vault.deposit(assets / 2, user1);
        
        // Invariant: After deposit -> withdraw -> deposit, should be close to original
        uint256 finalAssets = vault.totalAssets();
        assertEq(finalAssets, assetsAfterFirstDeposit);
    }

    // ============== FUZZ TESTS: REDEEM ==============

    /**
     * @dev Fuzz test: redeem with random shares after deposit
     */
    function testFuzz_Redeem_AfterDeposit(uint256 depositAmount, uint256 redeemAmount) public {
        depositAmount = bound(depositAmount, 1, 1e24);
        redeemAmount = bound(redeemAmount, 1, depositAmount);
        
        vm.prank(user1);
        uint256 sharesReceived = vault.deposit(depositAmount, user1);
        
        uint256 redeemShares = bound(redeemAmount, 1, sharesReceived);
        
        uint256 vaultAssetsBefore = vault.totalAssets();
        uint256 userSharesBefore = vault.balanceOf(user1);
        
        vm.prank(user1);
        uint256 assetsReceived = vault.redeem(redeemShares, user1, user1);
        
        // Invariant 1: Assets received should be positive
        assertGt(assetsReceived, 0, "Assets received should be positive");
        
        // Invariant 2: Vault assets decreased
        assertLt(vault.totalAssets(), vaultAssetsBefore);
        
        // Invariant 3: User shares decreased
        assertEq(vault.balanceOf(user1), userSharesBefore - redeemShares);
    }

    /**
     * @dev Fuzz test: redeem cannot exceed user shares
     */
    function testFuzz_Redeem_InsufficientShares(uint256 depositAmount, uint256 excessShares) public {
        depositAmount = bound(depositAmount, 1, 1e24);
        
        vm.prank(user1);
        uint256 sharesReceived = vault.deposit(depositAmount, user1);
        
        excessShares = bound(excessShares, sharesReceived + 1, sharesReceived * 2);
        
        vm.prank(user1);
        vm.expectRevert();
        vault.redeem(excessShares, user1, user1);
    }

    // ============== FUZZ TESTS: STATE CONSISTENCY ==============

    /**
     * @dev Fuzz test: vault maintains accounting consistency
     * Invariant: shares * totalAssets / totalSupply <= actual assets
     */
    function testFuzz_AccountingConsistency(
        uint256 depositAmount1,
        uint256 depositAmount2
    ) public {
        depositAmount1 = bound(depositAmount1, 1, 1e24);
        depositAmount2 = bound(depositAmount2, 1, 1e24);
        
        vm.prank(user1);
        vault.deposit(depositAmount1, user1);
        
        vm.prank(user2);
        vault.deposit(depositAmount2, user2);
        
        uint256 user1Shares = vault.balanceOf(user1);
        uint256 user2Shares = vault.balanceOf(user2);
        uint256 totalShares = vault.totalSupply();
        uint256 totalAssets = vault.totalAssets();
        
        // Invariant: Sum of user assets should equal total assets
        uint256 user1Assets = vault.convertToAssets(user1Shares);
        uint256 user2Assets = vault.convertToAssets(user2Shares);
        
        // Note: Due to rounding, may have 1-2 wei difference
        assertLe(
            totalAssets - (user1Assets + user2Assets),
            2,
            "Accounting should be consistent (allowing for rounding)"
        );
    }

    /**
     * @dev Fuzz test: conversion functions are inverses
     * convertToShares(convertToAssets(x)) ≈ x
     */
    function testFuzz_ConversionInverses(uint256 shares) public {
        // First, deposit something so conversions work
        vm.prank(user1);
        vault.deposit(1e20, user1);
        
        shares = bound(shares, 1, 1e20);
        
        uint256 assets = vault.convertToAssets(shares);
        uint256 sharesBack = vault.convertToShares(assets);
        
        // Invariant: Should be approximately equal (rounding allowed)
        assertApproxEqAbs(shares, sharesBack, 1, "Conversion should be reversible");
    }

    // ============== FUZZ TESTS: MATH SAFETY ==============

    /**
     * @dev Fuzz test: no overflow in deposit calculation
     */
    function testFuzz_NoOverflowOnDeposit(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        
        // This should not overflow or underflow
        vm.prank(user1);
        uint256 shares = vault.deposit(assets, user1);
        
        assertGt(shares, 0);
        assertEq(vault.totalAssets(), assets);
    }

    /**
     * @dev Fuzz test: no overflow in share conversion
     */
    function testFuzz_NoOverflowInConversion(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        
        vm.prank(user1);
        vault.deposit(assets, user1);
        
        // These conversions should not overflow
        uint256 sharesFromAssets = vault.convertToShares(1e20);
        uint256 assetsFromShares = vault.convertToAssets(sharesFromAssets);
        
        assertGt(sharesFromAssets, 0);
        assertGt(assetsFromShares, 0);
    }

    /**
     * @dev Fuzz test: operations maintain monotonicity
     * If asset amount increases, shares should increase
     */
    function testFuzz_Monotonicity(uint256 assets1, uint256 assets2) public {
        assets1 = bound(assets1, 1, 1e24);
        assets2 = bound(assets2, assets1 + 1, 1e25);
        
        uint256 shares1 = vault.convertToShares(assets1);
        uint256 shares2 = vault.convertToShares(assets2);
        
        assertGt(shares2, shares1, "More assets should convert to more shares");
    }

    // ============== FUZZ TESTS: EDGE CASES ==============

    /**
     * @dev Fuzz test: handle dust/rounding edge cases
     */
    function testFuzz_DustAmounts(uint256 dustAmount) public {
        dustAmount = bound(dustAmount, 1, 100);
        
        vm.prank(user1);
        vault.deposit(dustAmount, user1);
        
        assertEq(vault.totalAssets(), dustAmount);
        assertGt(vault.balanceOf(user1), 0);
    }

    /**
     * @dev Fuzz test: first depositor receives 1:1 ratio
     */
    function testFuzz_FirstDepositor(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        
        assertEq(vault.totalSupply(), 0, "Vault should start empty");
        
        vm.prank(user1);
        uint256 shares = vault.deposit(assets, user1);
        
        // Invariant: First depositor should get 1:1 ratio
        assertEq(shares, assets, "First deposit should have 1:1 ratio");
    }

    /**
     * @dev Fuzz test: large deposit doesn't break conversion
     */
    function testFuzz_LargeDeposits(uint256 largeAmount) public {
        largeAmount = bound(largeAmount, 1e24, 1e25);
        
        vm.prank(user1);
        vault.deposit(largeAmount, user1);
        
        vm.prank(user2);
        uint256 shares = vault.deposit(1000, user2);
        
        assertGt(shares, 0, "Even small deposits should work with large vault");
        assertLt(shares, 1000, "Small deposit should have reduced shares with large vault");
    }
}
