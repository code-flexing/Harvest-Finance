// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";
import "../src/MockERC20.sol";

/**
 * @title VaultDepositCapTest
 * @dev Unit + fuzz tests for the per-vault deposit-cap risk control.
 */
contract VaultDepositCapTest is Test {
    BaseVault internal vault;
    MockERC20 internal asset;

    address internal owner    = address(0xAD);
    address internal alice    = address(0xA11CE);
    address internal bob      = address(0xB0B);
    address internal stranger = address(0xBADBAD);

    event DepositCapUpdated(uint256 oldCap, uint256 newCap);

    function setUp() public {
        asset = new MockERC20("Test", "TEST", 0);

        BaseVault impl = new BaseVault();
        bytes memory init = abi.encodeCall(
            BaseVault.initialize,
            (address(asset), "Vault", "vTEST", owner)
        );
        vault = BaseVault(address(new ERC1967Proxy(address(impl), init)));

        asset.mint(alice, 1e30);
        asset.mint(bob,   1e30);

        vm.prank(alice); asset.approve(address(vault), type(uint256).max);
        vm.prank(bob);   asset.approve(address(vault), type(uint256).max);
    }

    // ── Defaults & view ───────────────────────────────────────────────────────

    function test_DefaultCapIsUnlimited() public {
        assertEq(vault.depositCap(), type(uint256).max);
        assertEq(vault.maxDeposit(alice), type(uint256).max);
    }

    function test_MaxDepositReflectsRemainingCapacity() public {
        vm.prank(owner); vault.setDepositCap(1_000e18);
        assertEq(vault.maxDeposit(alice), 1_000e18);

        vm.prank(alice); vault.deposit(400e18, alice);
        assertEq(vault.maxDeposit(alice), 600e18);

        vm.prank(bob); vault.deposit(600e18, bob);
        assertEq(vault.maxDeposit(alice), 0);
    }

    function test_MaxDepositReturnsZeroWhenOverCap() public {
        vm.prank(alice); vault.deposit(500e18, alice);
        vm.prank(owner); vault.setDepositCap(100e18);
        assertEq(vault.maxDeposit(alice), 0);
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    function test_OwnerCanSetCap() public {
        vm.prank(owner); vault.setDepositCap(123e18);
        assertEq(vault.depositCap(), 123e18);
    }

    function test_NonOwnerCannotSetCap() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.setDepositCap(123e18);
    }

    // ── Event emission ────────────────────────────────────────────────────────

    function test_SetDepositCapEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(vault));
        emit DepositCapUpdated(type(uint256).max, 500e18);
        vault.setDepositCap(500e18);
    }

    // ── Enforcement: boundaries ───────────────────────────────────────────────

    function test_DepositExactlyAtCapSucceeds() public {
        vm.prank(owner); vault.setDepositCap(1_000e18);

        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);

        assertEq(vault.totalAssets(), 1_000e18);
        assertGt(shares, 0);
        assertEq(vault.maxDeposit(alice), 0);
    }

    function test_DepositOneWeiOverCapReverts() public {
        vm.prank(owner); vault.setDepositCap(1_000e18);

        vm.prank(alice);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(1_000e18 + 1, alice);
    }

    function test_DepositSpanningCapAcrossUsersReverts() public {
        vm.prank(owner); vault.setDepositCap(1_000e18);

        vm.prank(alice); vault.deposit(900e18, alice);

        vm.prank(bob);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(200e18, bob);

        vm.prank(bob); vault.deposit(100e18, bob);
        assertEq(vault.totalAssets(), 1_000e18);
    }

    function test_ZeroCapBlocksAllDeposits() public {
        vm.prank(owner); vault.setDepositCap(0);
        vm.prank(alice);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(1, alice);
    }

    // ── Enforcement: dynamic cap changes ─────────────────────────────────────

    function test_IncreasingCapAllowsMoreDeposits() public {
        vm.prank(owner); vault.setDepositCap(500e18);
        vm.prank(alice); vault.deposit(500e18, alice);

        vm.prank(bob);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(1, bob);

        vm.prank(owner); vault.setDepositCap(1_500e18);
        vm.prank(bob); vault.deposit(1_000e18, bob);
        assertEq(vault.totalAssets(), 1_500e18);
    }

    function test_DecreasingCapBelowTotalAssetsBlocksNewDeposits() public {
        vm.prank(owner); vault.setDepositCap(2_000e18);
        vm.prank(alice); vault.deposit(1_500e18, alice);

        uint256 aliceSharesBefore = vault.balanceOf(alice);
        uint256 totalBefore       = vault.totalAssets();

        vm.prank(owner); vault.setDepositCap(1_000e18);

        assertEq(vault.balanceOf(alice), aliceSharesBefore);
        assertEq(vault.totalAssets(), totalBefore);

        vm.prank(bob);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(1, bob);

        vm.prank(alice); vault.withdraw(700e18, alice, alice);
        assertEq(vault.totalAssets(), 800e18);

        vm.prank(bob); vault.deposit(200e18, bob);
        assertEq(vault.totalAssets(), 1_000e18);
    }

    function test_LoweringCapToCurrentTotalBlocksFurtherDeposits() public {
        vm.prank(alice); vault.deposit(500e18, alice);
        vm.prank(owner); vault.setDepositCap(500e18);

        vm.prank(bob);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(1, bob);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_DepositRespectsCap(uint256 cap, uint256 first, uint256 second) public {
        cap   = bound(cap,   1,     1e27);
        first = bound(first, 1,     cap);
        second = bound(second, 1,   type(uint128).max);

        vm.prank(owner); vault.setDepositCap(cap);

        vm.prank(alice); vault.deposit(first, alice);
        assertEq(vault.totalAssets(), first);

        if (vault.totalAssets() + second <= cap) {
            vm.prank(bob); vault.deposit(second, bob);
            assertEq(vault.totalAssets(), first + second);
        } else {
            vm.prank(bob);
            vm.expectRevert(BaseVault.DepositCapExceeded.selector);
            vault.deposit(second, bob);
        }
    }

    function testFuzz_OnlyOwnerCanSetCap(address caller, uint256 newCap) public {
        vm.assume(caller != owner && caller != address(0));
        vm.prank(caller);
        vm.expectRevert();
        vault.setDepositCap(newCap);
    }
}
