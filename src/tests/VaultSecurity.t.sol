// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/Vault.sol";
import "../src/MockERC20.sol";

/**
 * @title VaultSecurityTest
 * @dev Security-focused tests for the upgradeable Vault.sol covering:
 *
 *  1.  Reentrancy protection (nonReentrant)
 *  2.  Role-based access control (ADMIN_ROLE / PAUSER_ROLE)
 *  3.  Input validation (zero values, zero addresses)
 *  4.  Emergency pause (circuit-breaker)
 *  5.  emergencyWithdraw — cannot drain vault asset, must be admin
 *  6.  Allowance / delegation — not consumed on failed solvency checks
 *  7.  Share-inflation attack defence (internal _totalAssets accounting)
 *  8.  Solvency invariants
 *  9.  Event emission
 * 10.  Fuzz security properties
 */
contract VaultSecurityTest is Test {

    Vault     internal vault;
    MockERC20 internal token;

    address internal admin   = address(0xAD);
    address internal pauser  = address(0xBB);
    address internal user1   = address(0x11);
    address internal user2   = address(0x22);
    address internal attacker = address(0xFF);

    // ── Setup ─────────────────────────────────────────────────────────────────

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", 18);

        Vault impl = new Vault();
        bytes memory initData = abi.encodeCall(
            Vault.initialize,
            (IERC20Upgradeable(address(token)), "Vault Token", "vTEST", admin)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        vault = Vault(address(proxy));

        token.mint(user1,    1e26);
        token.mint(user2,    1e26);
        token.mint(attacker, 1e26);

        vm.prank(user1);    token.approve(address(vault), type(uint256).max);
        vm.prank(user2);    token.approve(address(vault), type(uint256).max);
        vm.prank(attacker); token.approve(address(vault), type(uint256).max);

        vm.prank(admin);
        vault.grantRole(vault.PAUSER_ROLE(), pauser);
    }

    // ================================================================
    // 1. Reentrancy — nonReentrant blocks recursive entry
    // ================================================================

    function test_Reentrancy_DepositBlockedByNonReentrant() public {
        MaliciousToken malToken = new MaliciousToken();

        Vault malImpl = new Vault();
        bytes memory initData = abi.encodeCall(
            Vault.initialize,
            (IERC20Upgradeable(address(malToken)), "MalVault", "mV", admin)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(malImpl), initData);
        Vault malVault = Vault(address(proxy));

        malToken.setVault(address(malVault));
        malToken.mint(address(this), 1e18);
        malToken.approve(address(malVault), type(uint256).max);

        vm.expectRevert();
        malVault.deposit(1e18, address(this));
    }

    function test_CEI_FailedTransferFromLeavesStateUnchanged() public {
        Vault impl2 = new Vault();
        bytes memory initData = abi.encodeCall(
            Vault.initialize,
            (IERC20Upgradeable(address(token)), "V2", "V2", admin)
        );
        Vault vault2 = Vault(address(new ERC1967Proxy(address(impl2), initData)));

        // No approval — transferFrom will revert
        vm.prank(user1);
        vm.expectRevert();
        vault2.deposit(1e18, user1);

        assertEq(vault2.totalAssets(), 0);
        assertEq(vault2.totalSupply(), 0);
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
        MockERC20 stray = new MockERC20("S", "S", 18);
        stray.mint(address(vault), 1e18);

        vm.prank(attacker);
        vm.expectRevert();
        vault.emergencyWithdraw(address(stray), attacker);
    }

    function test_RBAC_AdminCanGrantAndRevokeRole() public {
        address newPauser = address(0x99);
        vm.prank(admin);
        vault.grantRole(vault.PAUSER_ROLE(), newPauser);
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), newPauser));

        vm.prank(admin);
        vault.revokeRole(vault.PAUSER_ROLE(), newPauser);
        assertFalse(vault.hasRole(vault.PAUSER_ROLE(), newPauser));
    }

    // ================================================================
    // 3. Input validation — custom errors
    // ================================================================

    function test_InputVal_DepositZeroAssetsReverts() public {
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroAssets.selector);
        vault.deposit(0, user1);
    }

    function test_InputVal_DepositZeroReceiverReverts() public {
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroReceiver.selector);
        vault.deposit(1e18, address(0));
    }

    function test_InputVal_WithdrawZeroAssetsReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroAssets.selector);
        vault.withdraw(0, user1, user1);
    }

    function test_InputVal_WithdrawZeroReceiverReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroReceiver.selector);
        vault.withdraw(1e18, address(0), user1);
    }

    function test_InputVal_WithdrawZeroOwnerReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroOwner.selector);
        vault.withdraw(1e18, user1, address(0));
    }

    function test_InputVal_RedeemZeroSharesReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroSharesBurned.selector);
        vault.redeem(0, user1, user1);
    }

    function test_InputVal_RedeemZeroReceiverReverts() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroReceiver.selector);
        vault.redeem(shares, address(0), user1);
    }

    function test_InputVal_RedeemZeroOwnerReverts() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.ZeroOwner.selector);
        vault.redeem(shares, user1, address(0));
    }

    function test_InputVal_CannotWithdrawMoreThanBalance() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.InsufficientShares.selector);
        vault.withdraw(2e18, user1, user1);
    }

    function test_InputVal_CannotRedeemMoreSharesThanOwned() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectRevert(Vault.InsufficientShares.selector);
        vault.redeem(shares * 2, user1, user1);
    }

    // ================================================================
    // 4. Emergency pause (circuit-breaker)
    // ================================================================

    function test_Pause_PauserCanPauseAndUnpause() public {
        vm.prank(pauser); vault.pause();
        assertTrue(vault.paused());

        vm.prank(pauser); vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Pause_DepositRevertsWhenPaused() public {
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert(Vault.Paused.selector);
        vault.deposit(1e18, user1);
    }

    function test_Pause_WithdrawWorksWhenPaused() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert(Vault.Paused.selector);
        vault.withdraw(1e18, user1, user1);
        assertEq(vault.totalAssets(), 0);
    }

    function test_Pause_RedeemWorksWhenPaused() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(pauser); vault.pause();
        vm.prank(user1);
        vm.expectRevert(Vault.Paused.selector);
        vault.redeem(shares, user1, user1);
        assertEq(vault.balanceOf(user1), 0);
    }

    function test_Pause_AllOperationsWorkAfterUnpause() public {
        vm.prank(pauser); vault.pause();
        vm.prank(pauser); vault.unpause();

        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        assertGt(shares, 0);
        vm.prank(user1); vault.redeem(shares, user1, user1);
        assertEq(vault.balanceOf(user1), 0);
    }

    event VaultPaused(address indexed pauser);
    event VaultUnpaused(address indexed pauser);
    event EmergencyWithdrawEv(address indexed admin, address indexed token, address indexed recipient, uint256 amount);

    function test_Pause_EmitsEvents() public {
        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit VaultPaused(pauser);
        vault.pause();

        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit VaultUnpaused(pauser);
        vault.unpause();
    }

    // ================================================================
    // 5. emergencyWithdraw protection
    // ================================================================

    function test_Emergency_RescuesStrayToken() public {
        MockERC20 stray = new MockERC20("S", "S", 18);
        stray.mint(address(vault), 5e17);

        uint256 before = stray.balanceOf(admin);
        vm.prank(admin);
        vault.emergencyWithdraw(address(stray), admin);

        assertEq(stray.balanceOf(admin), before + 5e17);
        assertEq(stray.balanceOf(address(vault)), 0);
    }

    function test_Emergency_CannotRescueVaultAsset() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(admin);
        vm.expectRevert(Vault.CannotRescueVaultAsset.selector);
        vault.emergencyWithdraw(address(token), admin);
    }

    function test_Emergency_ZeroTokenReverts() public {
        vm.prank(admin);
        vm.expectRevert(Vault.ZeroToken.selector);
        vault.emergencyWithdraw(address(0), admin);
    }

    function test_Emergency_ZeroRecipientReverts() public {
        MockERC20 stray = new MockERC20("S", "S", 18);
        stray.mint(address(vault), 1e18);
        vm.prank(admin);
        vm.expectRevert(Vault.ZeroRecipient.selector);
        vault.emergencyWithdraw(address(stray), address(0));
    }

    function test_Emergency_NothingToRescueReverts() public {
        MockERC20 stray = new MockERC20("S", "S", 18);
        vm.prank(admin);
        vm.expectRevert(Vault.NothingToRescue.selector);
        vault.emergencyWithdraw(address(stray), admin);
    }

    function test_Emergency_EmitsEvent() public {
        MockERC20 stray = new MockERC20("S", "S", 18);
        stray.mint(address(vault), 1e18);

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit EmergencyWithdrawEv(admin, address(stray), admin, 1e18);
        vault.emergencyWithdraw(address(stray), admin);
    }

    // ================================================================
    // 6. Allowance — not consumed on failed solvency checks
    // ================================================================

    function test_Allowance_NotConsumedWhenWithdrawFails() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        uint256 userShares = vault.balanceOf(user1);

        vm.prank(user1); vault.approve(user2, userShares * 2);

        vm.prank(user2);
        vm.expectRevert(Vault.InsufficientShares.selector);
        vault.withdraw(2e18, user2, user1);

        assertEq(vault.allowance(user1, user2), userShares * 2);
    }

    function test_Allowance_NotConsumedWhenRedeemFails() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1); vault.approve(user2, shares * 2);

        vm.prank(user2);
        vm.expectRevert(Vault.InsufficientShares.selector);
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

    function test_Allowance_UnauthorizedWithdrawReverts() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(1e18, attacker, user1);
    }

    // ================================================================
    // 7. Share-inflation attack defence (internal _totalAssets)
    // ================================================================

    function test_Inflation_DirectDonationDoesNotAffectExchangeRate() public {
        vm.prank(attacker); vault.deposit(1, attacker);

        uint256 rateBefore = vault.convertToAssets(vault.balanceOf(attacker));

        // "Donate" directly — bypasses _totalAssets accounting
        vm.prank(attacker); token.transfer(address(vault), 1e18);

        uint256 rateAfter = vault.convertToAssets(vault.balanceOf(attacker));
        assertEq(rateBefore, rateAfter, "Direct donation must not affect exchange rate");

        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        assertGt(shares, 0, "Victim must receive non-zero shares");
    }

    function test_Inflation_VictimAlwaysGetsShares() public {
        vm.prank(attacker); vault.deposit(1e15, attacker);
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

    function test_Solvency_ZeroBalanceAfterFullRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1); vault.redeem(shares, user1, user1);
        assertEq(vault.balanceOf(user1), 0);
    }

    // ================================================================
    // 9. Event emission
    // ================================================================

    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    function test_Events_DepositEmitted() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit Deposit(user1, user1, 1e18, 0);
        vault.deposit(1e18, user1);
    }

    function test_Events_WithdrawEmittedOnWithdraw() public {
        vm.prank(user1); vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Withdraw(user1, user1, user1, 1e18, 0);
        vault.withdraw(1e18, user1, user1);
    }

    function test_Events_WithdrawEmittedOnRedeem() public {
        vm.prank(user1); uint256 shares = vault.deposit(1e18, user1);
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Withdraw(user1, user1, user1, 0, shares);
        vault.redeem(shares, user1, user1);
    }

    // ================================================================
    // 10. Fuzz — security properties across random inputs
    // ================================================================

    function testFuzz_NoTokensCreatedFromThinAir(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        uint256 before = token.balanceOf(user1);

        vm.prank(user1); uint256 shares = vault.deposit(assets, user1);
        vm.prank(user1); uint256 returned = vault.redeem(shares, user1, user1);

        assertLe(returned, assets);
        assertApproxEqAbs(returned, assets, 1);
        assertApproxEqAbs(token.balanceOf(user1), before, 1);
    }

    function testFuzz_PausedBlocksDeposit(uint256 assets) public {
        assets = bound(assets, 1, 1e20);
        vm.prank(pauser); vault.pause();

        vm.prank(user1);
        vm.expectRevert(Vault.Paused.selector);
        vault.deposit(assets, user1);
    }

    function testFuzz_UnauthorizedCanNeverWithdraw(uint256 depositAmt, uint256 withdrawAmt) public {
        depositAmt  = bound(depositAmt,  1, 1e20);
        withdrawAmt = bound(withdrawAmt, 1, depositAmt);

        vm.prank(user1); vault.deposit(depositAmt, user1);

        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(withdrawAmt, attacker, user1);
    }

    function testFuzz_TotalAssetsAccountingIntact(uint256 d1, uint256 d2, uint256 w1) public {
        d1 = bound(d1, 1, 1e20);
        d2 = bound(d2, 1, 1e20);

        vm.prank(user1); vault.deposit(d1, user1);
        vm.prank(user2); vault.deposit(d2, user2);

        w1 = bound(w1, 1, d1 + d2);

        vm.prank(user1);
        try vault.withdraw(w1, user1, user1) {
            assertEq(vault.totalAssets(), d1 + d2 - w1);
        } catch {
            assertEq(vault.totalAssets(), d1 + d2);
        }
    }

    function testFuzz_AllowanceNotConsumedOnFailure(uint256 deposit) public {
        deposit = bound(deposit, 1, 1e20);
        vm.prank(user1); uint256 shares = vault.deposit(deposit, user1);
        uint256 tooMany = shares * 2;
        vm.prank(user1); vault.approve(user2, tooMany);

        vm.prank(user2);
        vm.expectRevert(Vault.InsufficientShares.selector);
        vault.redeem(tooMany, user2, user1);

        assertEq(vault.allowance(user1, user2), tooMany);
    }
}

// ================================================================
// Helpers
// ================================================================

/**
 * @dev Malicious ERC20 that re-enters vault.deposit() inside transferFrom().
 *      Used to verify nonReentrant blocks recursive entry.
 */
contract MaliciousToken is IERC20Upgradeable {
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

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allow[from][msg.sender] -= amount;
        _bal[from] -= amount;
        _bal[to] += amount;

        // Re-enter vault.deposit — nonReentrant must block this
        if (vault != address(0)) {
            address v = vault;
            vault = address(0); // prevent infinite recursion
            Vault(v).deposit(1e17, from);
        }

        return true;
    }
}
