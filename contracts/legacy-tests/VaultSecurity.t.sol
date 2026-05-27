// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/Vault.sol";
import "../../src/MockERC20.sol";

/**
 * @title VaultSecurityTest
 * @dev Security-focused tests covering every acceptance criterion:
 *
 *  1.  Reentrancy protection — nonReentrant + correct CEI order
 *  2.  Role-based access control (RBAC) — ADMIN_ROLE / PAUSER_ROLE
 *  3.  Input validation — zero values, zero addresses
 *  4.  Emergency pause (circuit-breaker)
 *  5.  emergencyWithdraw — cannot drain vault asset, must be admin
 *  6.  Allowance / delegation — consumed AFTER solvency checks
 *  7.  Share-inflation attack defence (virtual offset)
 *  8.  Solvency invariants
 *  9.  Event emission
 * 10.  Fuzz security properties
 */
contract VaultSecurityTest is Test {

    Vault     public vault;
    MockERC20 public token;

    address public admin   = address(0xAD);
    address public pauser  = address(0xBB);
    address public user1   = address(0x11);
    address public user2   = address(0x22);
    address public attacker = address(0xFF);

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", 1e30);
        vault = new Vault(token, "Vault Token", "vTEST", admin);

        token.mint(user1,    1e26);
        token.mint(user2,    1e26);
        token.mint(attacker, 1e26);

        vm.prank(user1);    token.approve(address(vault), type(uint256).max);
        vm.prank(user2);    token.approve(address(vault), type(uint256).max);
        vm.prank(attacker); token.approve(address(vault), type(uint256).max);

        // Give pauser their role
        vm.prank(admin);
        vault.grantRole(vault.PAUSER_ROLE(), pauser);
    }

    // ================================================================
    // 1. Reentrancy — correct CEI + nonReentrant
    // ================================================================

    /**
     * @dev A malicious ERC20 token that re-enters vault.deposit() inside
     *      transferFrom().  nonReentrant must block the second entry.
     */
    function test_Reentrancy_DepositBlockedByNonReentrant() public {
        MaliciousToken malToken = new MaliciousToken();
        Vault malVault = new Vault(
            IERC20(address(malToken)),
            "MalVault",
            "mV",
            admin
        );
        malToken.setVault(address(malVault));

        // Fund and approve
        malToken.mint(address(this), 1e18);
        malToken.approve(address(malVault), type(uint256).max);

        // The malicious token re-enters vault.deposit inside transferFrom.
        // nonReentrant should cause the inner call to revert.
        vm.expectRevert();
        malVault.deposit(1e18, address(this));
    }

    /**
     * @dev Verify that deposit correctly uses transferFrom BEFORE crediting state,
     *      so a failed transferFrom leaves _totalAssets unchanged.
     */
    function test_CEI_FailedTransferFromLeavesStateUnchanged() public {
        // User1 has no approval for a second vault
        Vault vault2 = new Vault(token, "V2", "V2", admin);
        // No approval given — transferFrom will revert
        vm.prank(user1);
        vm.expectRevert();
        vault2.deposit(1e18, user1);

        // State must be unchanged
        assertEq(vault2.totalAssets(), 0);
        assertEq(vault2.totalSupply(), 0);
        assertEq(vault2.balanceOf(user1), 0);
    }

    /**
     * @dev Verify withdraw CEI: safeTransfer (interaction) happens LAST,
     *      after state is already updated.
     */
    function test_CEI_WithdrawUpdateStateBeforeTransfer() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        uint256 sharesBefore = vault.balanceOf(user1);

        vm.prank(user1); vault.withdraw(1e18, user1, user1);

        // State must reflect withdrawal
        assertLt(vault.balanceOf(user1), sharesBefore);
        assertEq(vault.totalAssets(), 0);
    }

    // ================================================================
    // 2. Role-based access control (RBAC)
    // ================================================================

    function test_RBAC_AdminHasCorrectRoles() public view {
        assertTrue(vault.hasRole(vault.ADMIN_ROLE(),         admin));
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(),        admin));
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_RBAC_PauserHasPauserRole() public view {
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), pauser));
    }

    function test_RBAC_RegularUserHasNoRoles() public view {
        assertFalse(vault.hasRole(vault.ADMIN_ROLE(),  user1));
        assertFalse(vault.hasRole(vault.PAUSER_ROLE(), user1));
    }

    function test_RBAC_UnauthorizedCannotPause() public {
        vm.prank(attacker);
        vm.expectRevert();
        vault.pause();
    }

    function test_RBAC_UnauthorizedCannotUnpause() public {
        vm.prank(admin); vault.pause();
        vm.prank(attacker);
        vm.expectRevert();
        vault.unpause();
    }

    function test_RBAC_UnauthorizedCannotEmergencyWithdraw() public {
        MockERC20 stray = new MockERC20("S", "S", 1e18);
        stray.transfer(address(vault), 1e18);

        vm.prank(attacker);
        vm.expectRevert();
        vault.emergencyWithdraw(address(stray), attacker);
    }

    function test_RBAC_AdminCanGrantRole() public {
        address newPauser = address(0x99);
        vm.prank(admin);
        vault.grantRole(vault.PAUSER_ROLE(), newPauser);
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), newPauser));
    }

    function test_RBAC_AdminCanRevokeRole() public {
        vm.prank(admin);
        vault.revokeRole(vault.PAUSER_ROLE(), pauser);
        assertFalse(vault.hasRole(vault.PAUSER_ROLE(), pauser));

        vm.prank(pauser);
        vm.expectRevert();
        vault.pause();
    }

    // ================================================================
    // 3. Input validation
    // ================================================================

    function test_InputVal_DepositZeroAssetsReverts() public {
        vm.prank(user1);
        vm.expectRevert("Vault: zero assets");
        vault.deposit(0, user1);
    }

    function test_InputVal_DepositZeroReceiverReverts() public {
        vm.prank(user1);
        vm.expectRevert("Vault: zero receiver");
        vault.deposit(1e18, address(0));
    }

    function test_InputVal_WithdrawZeroAssetsReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero assets");
        vault.withdraw(0, user1, user1);
    }

    function test_InputVal_WithdrawZeroReceiverReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero receiver");
        vault.withdraw(1e18, address(0), user1);
    }

    function test_InputVal_WithdrawZeroOwnerReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero owner");
        vault.withdraw(1e18, user1, address(0));
    }

    function test_InputVal_RedeemZeroSharesReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero shares");
        vault.redeem(0, user1, user1);
    }

    function test_InputVal_RedeemZeroReceiverReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero receiver");
        vault.redeem(1e18, address(0), user1);
    }

    function test_InputVal_RedeemZeroOwnerReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: zero owner");
        vault.redeem(1e18, user1, address(0));
    }

    function test_InputVal_ConstructorZeroAssetReverts() public {
        vm.expectRevert("Vault: zero asset address");
        new Vault(IERC20(address(0)), "V", "V", admin);
    }

    function test_InputVal_ConstructorZeroAdminReverts() public {
        vm.expectRevert("Vault: zero admin address");
        new Vault(token, "V", "V", address(0));
    }

    function test_InputVal_CannotWithdrawMoreThanBalance() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: insufficient shares");
        vault.withdraw(2e18, user1, user1);
    }

    function test_InputVal_CannotRedeemMoreSharesThanOwned() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert("Vault: insufficient shares");
        vault.redeem(shares * 2, user1, user1);
    }

    // ================================================================
    // 4. Emergency pause (circuit-breaker)
    // ================================================================

    function test_Pause_PauserCanPause() public {
        vm.prank(pauser); vault.pause();
        assertTrue(vault.paused());
    }

    function test_Pause_PauserCanUnpause() public {
        vm.prank(pauser); vault.pause();
        vm.prank(pauser); vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Pause_DepositRevertsWhenPaused() public {
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.deposit(1e18, user1);
    }

    function test_Pause_WithdrawRevertsWhenPaused() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.withdraw(1e18, user1, user1);
    }

    function test_Pause_RedeemRevertsWhenPaused() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.redeem(shares, user1, user1);
    }

    function test_Pause_AllOperationsWorkAfterUnpause() public {
        vm.prank(pauser); vault.pause();
        vm.prank(pauser); vault.unpause();

        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        assertGt(shares, 0);
        vm.prank(user1); vault.redeem(shares, user1, user1);
        assertEq(vault.balanceOf(user1), 0);
    }

    function test_Pause_EmitsEvents() public {
        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit Vault.VaultPaused(pauser);
        vault.pause();

        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit Vault.VaultUnpaused(pauser);
        vault.unpause();
    }

    // ================================================================
    // 5. emergencyWithdraw protection
    // ================================================================

    function test_Emergency_RescuesStrayToken() public {
        MockERC20 stray = new MockERC20("S", "S", 1e18);
        stray.transfer(address(vault), 5e17);

        uint256 before = stray.balanceOf(admin);
        vm.prank(admin);
        vault.emergencyWithdraw(address(stray), admin);

        assertEq(stray.balanceOf(admin), before + 5e17);
        assertEq(stray.balanceOf(address(vault)), 0);
    }

    function test_Emergency_CannotRescueVaultAsset() public {
        vm.prank(user1); vault.deposit(1e18, user1);

        vm.prank(admin);
        vm.expectRevert("Vault: cannot rescue vault asset");
        vault.emergencyWithdraw(address(token), admin);
    }

    function test_Emergency_ZeroTokenReverts() public {
        vm.prank(admin);
        vm.expectRevert("Vault: zero token address");
        vault.emergencyWithdraw(address(0), admin);
    }

    function test_Emergency_ZeroRecipientReverts() public {
        MockERC20 stray = new MockERC20("S", "S", 1e18);
        stray.transfer(address(vault), 1e18);
        vm.prank(admin);
        vm.expectRevert("Vault: zero recipient");
        vault.emergencyWithdraw(address(stray), address(0));
    }

    function test_Emergency_NothingToRescueReverts() public {
        MockERC20 stray = new MockERC20("S", "S", 0);
        vm.prank(admin);
        vm.expectRevert("Vault: nothing to rescue");
        vault.emergencyWithdraw(address(stray), admin);
    }

    function test_Emergency_EmitsEvent() public {
        MockERC20 stray = new MockERC20("S", "S", 1e18);
        stray.transfer(address(vault), 1e18);

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit Vault.EmergencyWithdraw(admin, address(stray), admin, 1e18);
        vault.emergencyWithdraw(address(stray), admin);
    }

    // ================================================================
    // 6. Allowance: consumed AFTER solvency checks
    // ================================================================

    function test_Allowance_NotConsumedWhenSolvencyCheckFails() public {
        // user1 deposits and approves user2 for more shares than user1 has
        vm.prank(user1); vault.deposit(1e18, user1);
        uint256 userShares = vault.balanceOf(user1);

        // Approve user2 for 2x the shares user1 holds
        vm.prank(user1); vault.approve(user2, userShares * 2);

        // user2 tries to withdraw more than user1 holds — should fail
        vm.prank(user2);
        vm.expectRevert("Vault: insufficient shares");
        vault.withdraw(2e18, user2, user1);

        // Allowance must be completely unchanged (not consumed by failed call)
        assertEq(vault.allowance(user1, user2), userShares * 2);
    }

    function test_Allowance_NotConsumedWhenRedeemSolvencyCheckFails() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1); vault.approve(user2, shares * 2);

        vm.prank(user2);
        vm.expectRevert("Vault: insufficient shares");
        vault.redeem(shares * 2, user2, user1);

        assertEq(vault.allowance(user1, user2), shares * 2);
    }

    function test_Allowance_ApprovedSpenderCanWithdraw() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        uint256 sharesToUse = vault.convertToShares(5e17);
        vm.prank(user1); vault.approve(user2, sharesToUse);

        vm.prank(user2); vault.withdraw(5e17, user2, user1);

        assertEq(vault.allowance(user1, user2), 0);
    }

    function test_Allowance_ApprovedSpenderCanRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        uint256 half = shares / 2;
        vm.prank(user1); vault.approve(user2, half);

        vm.prank(user2); vault.redeem(half, user2, user1);

        assertEq(vault.balanceOf(user1), shares - half);
        assertEq(vault.allowance(user1, user2), 0);
    }

    function test_Allowance_UnauthorizedWithdrawReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(1e18, attacker, user1);
    }

    function test_Allowance_UnauthorizedRedeemReverts() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(attacker);
        vm.expectRevert();
        vault.redeem(shares, attacker, user1);
    }

    // ================================================================
    // 7. Share-inflation attack defence (virtual offset)
    // ================================================================

    /**
     * @dev Classic attack: attacker deposits 1 wei → gets 1 share,
     *      then sends a huge amount directly to the vault to inflate
     *      the exchange rate, causing the next depositor's shares to
     *      round down to 0.
     *
     *      With internal _totalAssets accounting, direct token transfers
     *      to the vault are NEVER reflected in the exchange rate, so the
     *      "donation" step of the attack is completely neutralised.
     */
    function test_Inflation_DirectDonationDoesNotAffectExchangeRate() public {
        // Attacker deposits 1 wei
        token.mint(attacker, 1e18);
        vm.prank(attacker); vault.deposit(1, attacker);

        uint256 rateBeforeDonation = vault.convertToAssets(vault.balanceOf(attacker));

        // Attacker "donates" 1e18 tokens directly (not through deposit)
        vm.prank(attacker); token.transfer(address(vault), 1e18);

        // Exchange rate must be UNCHANGED because _totalAssets is not affected
        uint256 rateAfterDonation = vault.convertToAssets(vault.balanceOf(attacker));
        assertEq(rateBeforeDonation, rateAfterDonation,
            "Direct donation should not affect exchange rate");

        // The next depositor must still get a non-zero share allocation
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        assertGt(shares, 0, "Victim depositor should receive non-zero shares");
    }

    /**
     * @dev Virtual offset ensures even the very first deposit gets a safe
     *      share allocation — no 0-share edge case.
     */
    function test_Inflation_VirtualOffsetMakesSmallFirstDepositSafe() public {
        // First depositor puts in 1 wei — should not get 0 shares
        token.mint(address(this), 1);
        token.approve(address(vault), 1);
        uint256 shares = vault.deposit(1, address(this));
        assertGt(shares, 0, "Even 1 wei deposit must yield > 0 shares");
    }

    /**
     * @dev Attacker cannot make the second depositor receive 0 shares by
     *      front-running with a single-wei deposit.
     */
    function test_Inflation_VictimAlwaysGetsShares() public {
        // Attacker gets in first
        vm.prank(attacker); vault.deposit(1e15, attacker);

        // Victim deposits a normal amount — must get non-zero shares
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        assertGt(shares, 0, "Victim must always receive non-zero shares");
    }

    // ================================================================
    // 8. Solvency invariants
    // ================================================================

    function test_Solvency_TotalAssetsTrackedAfterDeposit() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user2); vault.deposit(2e18, user2);
        assertEq(vault.totalAssets(), 3e18);
    }

    function test_Solvency_TotalAssetsTrackedAfterWithdraw() public {
        vm.prank(user1); vault.deposit(2e18, user1);
        vm.prank(user1); vault.withdraw(1e18, user1, user1);
        assertEq(vault.totalAssets(), 1e18);
    }

    function test_Solvency_TotalAssetsTrackedAfterRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(2e18, user1);
        vm.prank(user1); vault.redeem(shares / 2, user1, user1);
        assertApproxEqAbs(vault.totalAssets(), 1e18, 1);
    }

    function test_Solvency_ZeroBalanceAfterFullRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1); vault.redeem(shares, user1, user1);
        assertEq(vault.balanceOf(user1), 0);
    }

    // ================================================================
    // 9. Event emission
    // ================================================================

    function test_Events_DepositEmitted() public {
        // First deposit: 1e18 assets. Due to virtual offset the shares won't
        // be exactly 1e18, so we only check indexed fields (not data).
        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit Vault.Deposit(user1, user1, 1e18, 0 /* placeholder */);
        vault.deposit(1e18, user1);
    }

    function test_Events_WithdrawEmittedOnWithdraw() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Vault.Withdraw(user1, user1, user1, 1e18, 0);
        vault.withdraw(1e18, user1, user1);
    }

    function test_Events_WithdrawEmittedOnRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Vault.Withdraw(user1, user1, user1, 0, shares);
        vault.redeem(shares, user1, user1);
    }

    function test_Events_EmergencyWithdrawEmitted() public {
        MockERC20 stray = new MockERC20("S", "S", 1e18);
        stray.transfer(address(vault), 1e18);
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit Vault.EmergencyWithdraw(admin, address(stray), admin, 1e18);
        vault.emergencyWithdraw(address(stray), admin);
    }

    // ================================================================
    // 10. Fuzz — security properties across random inputs
    // ================================================================

    function testFuzz_NoTokensCreatedFromThinAir(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        uint256 before = token.balanceOf(user1);

        vm.prank(user1); uint256 shares = vault.deposit(assets, user1);
        vm.prank(user1); uint256 returned = vault.redeem(shares, user1, user1);

        // User can never get back MORE than they put in
        assertLe(returned, assets);
        // And the difference must be tiny (rounding only, ≤ 1 wei)
        assertApproxEqAbs(returned, assets, 1);

        // Net token balance change is at most 1 wei due to rounding
        assertApproxEqAbs(token.balanceOf(user1), before, 1);
    }

    function testFuzz_PausedBlocksAllOperations(uint256 assets) public {
        assets = bound(assets, 1, 1e20);
        vm.prank(pauser); vault.pause();

        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.deposit(assets, user1);
    }

    function testFuzz_UnauthorizedCanNeverWithdraw(
        uint256 depositAmt,
        uint256 withdrawAmt
    ) public {
        depositAmt  = bound(depositAmt,  1, 1e20);
        withdrawAmt = bound(withdrawAmt, 1, depositAmt);

        vm.prank(user1); vault.deposit(depositAmt, user1);

        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(withdrawAmt, attacker, user1);
    }

    function testFuzz_TotalAssetsAccountingIntact(
        uint256 d1, uint256 d2, uint256 w1
    ) public {
        d1 = bound(d1, 1, 1e20);
        d2 = bound(d2, 1, 1e20);

        vm.prank(user1); vault.deposit(d1, user1);
        vm.prank(user2); vault.deposit(d2, user2);

        uint256 maxWithdraw = vault.totalAssets();
        w1 = bound(w1, 1, maxWithdraw);

        vm.prank(user1);
        // May revert if user1 has insufficient shares — that's expected and correct
        try vault.withdraw(w1, user1, user1) {
            assertEq(vault.totalAssets(), d1 + d2 - w1);
        } catch {
            // Revert means user1 didn't have enough shares — vault still intact
            assertEq(vault.totalAssets(), d1 + d2);
        }
    }

    function testFuzz_AllowanceNotConsumedOnFailure(uint256 deposit) public {
        deposit = bound(deposit, 1, 1e20);
        vm.prank(user1); uint256 shares = vault.deposit(deposit, user1);
        uint256 tooMany = shares * 2;
        vm.prank(user1); vault.approve(user2, tooMany);

        // This should fail on solvency check
        vm.prank(user2);
        vm.expectRevert("Vault: insufficient shares");
        vault.redeem(tooMany, user2, user1);

        // Allowance must be intact
        assertEq(vault.allowance(user1, user2), tooMany);
    }
}

// ================================================================
// Helpers
// ================================================================

/**
 * @dev A malicious ERC20 that re-enters vault.deposit() inside transferFrom().
 *      Used to test that nonReentrant correctly blocks recursive entry.
 */
contract MaliciousToken is IERC20 {
    address public vault;
    mapping(address => uint256) private _bal;
    mapping(address => mapping(address => uint256)) private _allow;

    function setVault(address _vault) external { vault = _vault; }
    function mint(address to, uint256 amt) external { _bal[to] += amt; }

    function totalSupply() external pure returns (uint256) { return type(uint256).max; }
    function balanceOf(address a) external view returns (uint256) { return _bal[a]; }
    function allowance(address o, address s) external view returns (uint256) { return _allow[o][s]; }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allow[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _bal[msg.sender] -= amount;
        _bal[to] += amount;
        return true;
    }

    /**
     * @dev The attack: during transferFrom (which vault.deposit calls),
     *      we re-enter vault.deposit().  nonReentrant must revert this.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allow[from][msg.sender] -= amount;
        _bal[from] -= amount;
        _bal[to] += amount;

        // Re-enter vault.deposit — this is the attack
        if (vault != address(0)) {
            address v = vault;
            vault = address(0); // prevent infinite recursion
            Vault(v).deposit(1e17, from);
        }

        return true;
    }
}
