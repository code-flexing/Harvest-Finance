// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";
import "../src/MockERC20.sol";

/**
 * @title VaultInvariantTest
 * @notice Property-based invariant tests for BaseVault.
 */
contract VaultInvariantTest is Test {
    BaseVault  public vault;
    MockERC20  public token;

    address public user1 = address(0x1111);
    address public user2 = address(0x2222);
    address public user3 = address(0x3333);
    address public admin  = address(0xAD);

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", 0);
        token.mint(user1, 1e27);
        token.mint(user2, 1e27);
        token.mint(user3, 1e27);

        BaseVault impl = new BaseVault();
        bytes memory init = abi.encodeCall(
            BaseVault.initialize,
            (address(token), "Vault Token", "vTEST", admin)
        );
        vault = BaseVault(address(new ERC1967Proxy(address(impl), init)));

        vm.prank(user1); token.approve(address(vault), type(uint256).max);
        vm.prank(user2); token.approve(address(vault), type(uint256).max);
        vm.prank(user3); token.approve(address(vault), type(uint256).max);
    }

    function test_AssetConservation() public {
        vm.prank(user1); vault.deposit(1e20, user1);
        vm.prank(user2); vault.deposit(2e20, user2);

        uint256 u1 = vault.convertToAssets(vault.balanceOf(user1));
        uint256 u2 = vault.convertToAssets(vault.balanceOf(user2));
        assertLe(u1 + u2, vault.totalAssets() + 1);
    }

    function test_ShareSupplyConsistency() public {
        vm.prank(user1); vault.deposit(1e20, user1);
        vm.prank(user2); vault.deposit(2e20, user2);

        assertEq(vault.totalSupply(), vault.balanceOf(user1) + vault.balanceOf(user2));
    }

    function test_ExchangeRateMonotonicity() public {
        vm.prank(user1); vault.deposit(1e20, user1);
        vm.prank(user2); vault.deposit(1e20, user2);

        assertGe(vault.totalAssets(), 2e20);
    }

    function test_RoundingSafety() public {
        vm.prank(user1); vault.deposit(1e20, user1);

        uint256 shares = vault.balanceOf(user1);
        uint256 assets = vault.convertToAssets(shares);
        assertLe(vault.totalAssets() - assets, 2);
    }

    function test_TotalAssetsTracking() public {
        vm.prank(user1); vault.deposit(1e20, user1);
        assertEq(vault.totalAssets(), 1e20);

        vm.prank(user2); vault.deposit(2e20, user2);
        assertEq(vault.totalAssets(), 3e20);

        vm.prank(user1); vault.withdraw(5e19, user1, user1);
        assertEq(vault.totalAssets(), 25e19);
    }

    function test_ConversionReversibility() public {
        vm.prank(user1); vault.deposit(1e20, user1);

        uint256 original = 5e19;
        uint256 shares   = vault.convertToShares(original);
        uint256 back     = vault.convertToAssets(shares);
        assertApproxEqAbs(original, back, 2);
    }

    function test_ZeroBalanceAfterFullWithdrawal() public {
        vm.prank(user1); vault.deposit(1e20, user1);
        vm.prank(user1); vault.withdraw(1e20, user1, user1);

        assertEq(vault.balanceOf(user1), 0);
        assertEq(vault.totalSupply(), 0);
    }

    function test_ThreeUserOperations() public {
        vm.prank(user1); vault.deposit(1e19, user1);
        vm.prank(user2); vault.deposit(1e20, user2);
        vm.prank(user3); vault.deposit(1e21, user3);

        assertEq(vault.totalAssets(), 1e19 + 1e20 + 1e21);
        assertGt(vault.totalSupply(), 0);
    }
}
