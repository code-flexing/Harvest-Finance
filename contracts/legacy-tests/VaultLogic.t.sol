// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../../src/Vault.sol";
import "../../src/MockERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract VaultLogicTest is Test {
    Vault public implementation;
    Vault public proxy;
    MockERC20 public asset;
    address public admin = address(0x1);
    address public user = address(0x2);

    function setUp() public {
        asset = new MockERC20("Test Token", "TEST", 18);
        implementation = new Vault();
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Vault.initialize.selector, address(asset), "Vault Token", "vTEST", admin)
        );
        proxy = Vault(address(proxyContract));
        
        asset.mint(user, 1000e18);
        vm.prank(user);
        asset.approve(address(proxy), type(uint256).max);
    }

    function test_DepositAndWithdraw() public {
        uint256 amount = 100e18;
        vm.prank(user);
        proxy.deposit(amount, user);
        assertEq(proxy.balanceOf(user), amount);
        assertEq(proxy.totalAssets(), amount);

        vm.prank(user);
        proxy.withdraw(amount, user, user);
        assertEq(proxy.balanceOf(user), 0);
        assertEq(proxy.totalAssets(), 0);
    }

    function test_WithdrawalRateLimit() public {
        uint256 limit = 50e18;
        vm.prank(admin);
        proxy.setWithdrawalLimit(limit);

        vm.prank(user);
        proxy.deposit(100e18, user);

        // First withdrawal within limit
        vm.prank(user);
        proxy.withdraw(30e18, user, user);

        // Second withdrawal exceeds limit in same block
        vm.prank(user);
        vm.expectRevert("Vault: block withdrawal limit exceeded");
        proxy.withdraw(30e18, user, user);

        // Works in next block
        vm.roll(block.number + 1);
        vm.prank(user);
        proxy.withdraw(30e18, user, user);
    }

    function test_DepositCap() public {
        uint256 cap = 50e18;
        vm.prank(admin);
        proxy.setDepositCap(cap);

        vm.prank(user);
        proxy.deposit(30e18, user);

        vm.prank(user);
        vm.expectRevert("Vault: deposit cap exceeded");
        proxy.deposit(30e18, user);
    }

    function test_Pause() public {
        vm.prank(admin);
        proxy.pause();

        vm.prank(user);
        vm.expectRevert("Vault: paused");
        proxy.deposit(10e18, user);

        vm.prank(admin);
        proxy.unpause();

        vm.prank(user);
        proxy.deposit(10e18, user);
    }

    function test_EmergencyWithdraw() public {
        MockERC20 otherToken = new MockERC20("Other", "OT", 18);
        otherToken.mint(address(proxy), 10e18);

        vm.prank(admin);
        proxy.emergencyWithdraw(address(otherToken), admin);
        assertEq(otherToken.balanceOf(admin), 10e18);
    }

    function test_RevertEmergencyWithdrawVaultAsset() public {
        vm.prank(admin);
        vm.expectRevert("Vault: cannot rescue vault asset");
        proxy.emergencyWithdraw(address(asset), admin);
    }

    function test_Upgrade() public {
        Vault newImplementation = new Vault();
        vm.prank(admin);
        proxy.upgradeTo(address(newImplementation));
    }
}
