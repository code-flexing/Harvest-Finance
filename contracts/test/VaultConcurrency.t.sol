// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "../src/MockERC20.sol";

contract VaultConcurrencyTest is Test {
    Vault public vault;
    MockERC20 public token;

    address[] public users;

    function setUp() public {
        // Deploy mock token and vault
        token = new MockERC20();
        vault = new Vault(address(token));

        // Set up 5 concurrent users
        for(uint256 i = 1; i <= 5; i++) {
            address user = address(uint160(i));
            users.push(user);
            
            // Mint tokens to user and approve the vault
            token.mint(user, 10000 ether);
            vm.prank(user);
            token.approve(address(vault), type(uint256).max);
        }
    }

    function test_ConcurrentDeposits() public {
        uint256 depositAmount = 100 ether;

        // Simulate multiple users depositing in the exact same block/timestamp
        for(uint256 i = 0; i < users.length; i++) {
            vm.prank(users[i]);
            vault.deposit(depositAmount, users[i]);
        }

        // Assert shared state consistency
        assertEq(token.balanceOf(address(vault)), depositAmount * users.length, "Total vault balance mismatch");
        assertEq(vault.totalSupply(), depositAmount * users.length, "Total shares mismatch");

        // Verify individual states
        for(uint256 i = 0; i < users.length; i++) {
            assertEq(vault.balanceOf(users[i]), depositAmount, "Individual share mismatch");
        }
    }

    function test_ConcurrentDepositsAndWithdrawals() public {
        // First, simulate the concurrent deposits
        test_ConcurrentDeposits();

        // Advance to the next block to simulate a new transaction batch
        vm.roll(block.number + 1);

        uint256 withdrawAmount = 50 ether;

        // Simulate a subset of users withdrawing simultaneously
        for(uint256 i = 0; i < 3; i++) {
            vm.prank(users[i]);
            vault.withdraw(withdrawAmount, users[i], users[i]);
        }

        // Assert shared state consistency after mixed operations
        uint256 expectedRemaining = (100 ether * 5) - (withdrawAmount * 3);
        assertEq(token.balanceOf(address(vault)), expectedRemaining, "Vault balance mismatch after withdrawals");
        assertEq(vault.totalSupply(), expectedRemaining, "Total shares mismatch after withdrawals");
    }
}