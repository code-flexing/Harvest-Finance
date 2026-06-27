// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";
import "../src/MockERC20.sol";

/**
 * @title VaultEdgeCaseFuzzTest
 * @dev Advanced fuzz tests for edge cases and boundary conditions
 */
contract VaultEdgeCaseFuzzTest is Test {
    BaseVault public vault;
    MockERC20 public token;

    address public admin = address(0xAD);
    address public user  = address(0x1111);

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", 0);

        BaseVault impl = new BaseVault();
        bytes memory init = abi.encodeCall(
            BaseVault.initialize,
            (address(token), "Vault Token", "vTEST", admin)
        );
        vault = BaseVault(address(new ERC1967Proxy(address(impl), init)));

        token.mint(user, type(uint96).max);
        vm.prank(user);
        token.approve(address(vault), type(uint256).max);
    }

    function testFuzz_MinimumDeposit() public {
        vm.prank(user);
        uint256 shares = vault.deposit(1, user);
        assertGt(shares, 0);
        assertEq(vault.totalAssets(), 1);
    }

    function testFuzz_WithdrawExactBalance(uint256 amount) public {
        amount = bound(amount, 1e3, 1e20);
        vm.prank(user); vault.deposit(amount, user);
        vm.startPrank(user);
        vault.withdraw(vault.totalAssets(), user, user);
        vm.stopPrank();
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(user), 0);
    }

    function testFuzz_RoundingWithLargeVault(uint256 smallDeposit, uint256 hugeVault) public {
        smallDeposit = bound(smallDeposit, 1e3, 1000);
        hugeVault    = bound(hugeVault, 1e24, 1e26);
        vm.prank(user); vault.deposit(hugeVault, user);
        vm.prank(user);
        uint256 shares = vault.deposit(smallDeposit, user);
        assertGt(shares, 0);
    }

    function testFuzz_RedeemWithRounding(uint256 assets) public {
        assets = bound(assets, 1e3, 1e20);
        vm.prank(user);
        uint256 sharesReceived = vault.deposit(assets, user);
        uint256 redeemShares = sharesReceived / 2;
        if (redeemShares == 0) return;
        vm.startPrank(user);
        uint256 assetsReceived = vault.redeem(redeemShares, user, user);
        vm.stopPrank();
        assertLe(assetsReceived, assets);
    }

    function testFuzz_ManySmallDeposits(uint8 numDeposits, uint256 baseAmount) public {
        numDeposits = uint8(bound(numDeposits, 1, 50));
        baseAmount  = bound(baseAmount, 1e3, 1e18);
        uint256 expectedTotal = 0;
        for (uint256 i = 0; i < numDeposits; i++) {
            vm.prank(user); vault.deposit(baseAmount, user);
            expectedTotal += baseAmount;
        }
        assertEq(vault.totalAssets(), expectedTotal);
    }

    function testFuzz_AlternatingOperations(uint256 amount, uint8 iterations) public {
        amount     = bound(amount, 1e3, 1e20);
        iterations = uint8(bound(iterations, 1, 20));
        uint256 netAssets = 0;
        for (uint256 i = 0; i < iterations; i++) {
            if (i % 2 == 0) {
                vm.prank(user); vault.deposit(amount, user);
                netAssets += amount;
            } else if (netAssets > 0) {
                uint256 w = netAssets > amount ? amount : netAssets;
                vm.startPrank(user); vault.withdraw(w, user, user); vm.stopPrank();
                netAssets -= w;
            }
        }
        assertEq(vault.totalAssets(), netAssets);
    }

    function testFuzz_ZeroDeposit() public {
        vm.prank(user);
        vm.expectRevert(BaseVault.ZeroAmount.selector);
        vault.deposit(0, user);
    }

    function testFuzz_ZeroWithdrawal() public {
        vm.prank(user); vault.deposit(1e20, user);
        vm.prank(user);
        vm.expectRevert(BaseVault.ZeroAmount.selector);
        vault.withdraw(0, user, user);
    }

    function testFuzz_ZeroRedeem() public {
        vm.prank(user); vault.deposit(1e20, user);
        vm.prank(user);
        vm.expectRevert(BaseVault.ZeroSharesBurned.selector);
        vault.redeem(0, user, user);
    }

    function testFuzz_ConversionEmptyVault() public {
        assertGt(vault.convertToShares(100), 0);
        assertGt(vault.convertToAssets(100), 0);
    }

    function testFuzz_WithdrawInsufficientAllowance(uint256 depositAmount) public {
        depositAmount = bound(depositAmount, 1e3, 1e20);
        address attacker = address(0xdeadbeef);
        vm.prank(user); vault.deposit(depositAmount, user);
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(1, attacker, user);
    }

    function testFuzz_CascadingOperations(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1e3, 1e20);
        amount2 = bound(amount2, 1e3, 1e20);
        vm.prank(user); vault.deposit(amount1, user);
        vm.startPrank(user); vault.withdraw(amount1 / 2, user, user); vm.stopPrank();
        vm.prank(user); vault.deposit(amount2, user);
        assertEq(vault.totalAssets(), (amount1 - amount1 / 2) + amount2);
    }

    function testFuzz_PrecisionLoss(uint256 assets) public {
        assets = bound(assets, 1e3, 1e25);
        vm.prank(user); vault.deposit(assets, user);
        assertGe(vault.convertToAssets(3), 0);
    }

    function testFuzz_LargeDepositRatio() public {
        vm.prank(user); vault.deposit(1e25, user);
        address user2 = address(0x2222);
        token.mint(user2, 1e26);
        vm.startPrank(user2);
        token.approve(address(vault), type(uint256).max);
        uint256 shares = vault.deposit(1000, user2);
        vm.stopPrank();
        assertGt(shares, 0);
    }
}
