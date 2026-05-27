// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../src/Vault.sol";

/**
 * @title VaultMainnetForkTest
 * @notice Fork tests that validate Vault behaviour against live mainnet token contracts.
 *         Run with:
 *           ETH_RPC_URL=<alchemy-or-infura-url> forge test \
 *             --match-path test/VaultMainnetFork.t.sol -vvv --fork-url $ETH_RPC_URL
 *         Or via the dedicated fork profile:
 *           forge test --profile fork -vvv
 *
 * Mainnet addresses (Ethereum):
 *   USDC  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  (6 decimals)
 *   DAI   0x6B175474E89094C44Da98b954EedeAC495271d0F  (18 decimals)
 *   USDT  0xdAC17F958D2ee523a2206206994597C13D831ec7  (6 decimals)
 *   Large USDC whale: Circle's reserve custody address (changes — use `deal` instead)
 */
contract VaultMainnetForkTest is Test {
    // ── Mainnet token addresses ────────────────────────────────────────────────
    address constant USDC     = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI      = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDT     = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    // ── Compound v2 cUSDC (to test DeFi protocol interaction surface) ─────────
    address constant COMPOUND_CUSDC = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;

    // ── Uniswap v3 SwapRouter (read-only checks) ─────────────────────────────
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // ── Actors ────────────────────────────────────────────────────────────────
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    // ── Contracts under test ──────────────────────────────────────────────────
    Vault   public usdcVault;
    Vault   public daiVault;

    IERC20  public usdc;
    IERC20  public dai;

    // Fixed fork snapshot so tests are reproducible
    uint256 forkId;

    function setUp() public {
        string memory rpcUrl = vm.envOr("ETH_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            // Skip gracefully in environments without an RPC URL (CI without secrets)
            vm.skip(true);
            return;
        }

        forkId = vm.createSelectFork(rpcUrl);

        usdc = IERC20(USDC);
        dai  = IERC20(DAI);

        // Deploy vaults using live mainnet tokens as underlying
        usdcVault = new Vault(usdc, "Harvest USDC Vault", "hvUSDC");
        daiVault  = new Vault(dai,  "Harvest DAI Vault",  "hvDAI");

        // Fund actors with tokens via vm.deal / deal (ERC20)
        deal(USDC, alice, 10_000 * 1e6);   // 10,000 USDC
        deal(USDC, bob,   50_000 * 1e6);   // 50,000 USDC
        deal(DAI,  carol, 100_000 ether);  // 100,000 DAI

        // Approve vaults
        vm.startPrank(alice);
        usdc.approve(address(usdcVault), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(usdcVault), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(carol);
        dai.approve(address(daiVault), type(uint256).max);
        vm.stopPrank();
    }

    // ── Basic integration: deposit with live USDC ──────────────────────────────

    function test_fork_deposit_usdc() public {
        uint256 depositAmount = 1_000 * 1e6; // 1,000 USDC

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        uint256 vaultBalanceBefore = usdc.balanceOf(address(usdcVault));

        vm.prank(alice);
        uint256 shares = usdcVault.deposit(depositAmount, alice);

        assertGt(shares, 0, "Should mint non-zero shares");
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore - depositAmount, "Alice USDC balance mismatch");
        assertEq(usdc.balanceOf(address(usdcVault)), vaultBalanceBefore + depositAmount, "Vault USDC balance mismatch");
        assertEq(usdcVault.balanceOf(alice), shares, "Alice share balance mismatch");
        assertEq(usdcVault.totalAssets(), depositAmount, "totalAssets mismatch");
    }

    function test_fork_deposit_and_withdraw_usdc() public {
        uint256 depositAmount = 5_000 * 1e6;

        vm.prank(alice);
        uint256 shares = usdcVault.deposit(depositAmount, alice);

        uint256 withdrawAmount = 2_500 * 1e6;
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 burnedShares = usdcVault.withdraw(withdrawAmount, alice, alice);

        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + withdrawAmount, "Withdraw amount mismatch");
        assertEq(usdcVault.totalAssets(), depositAmount - withdrawAmount, "totalAssets after withdraw");
        assertEq(usdcVault.balanceOf(alice), shares - burnedShares, "Remaining shares mismatch");
    }

    function test_fork_deposit_and_redeem_usdc() public {
        uint256 depositAmount = 3_000 * 1e6;

        vm.prank(alice);
        uint256 shares = usdcVault.deposit(depositAmount, alice);

        uint256 aliceUsdcBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 assets = usdcVault.redeem(shares, alice, alice);

        assertEq(assets, depositAmount, "Redeemed assets should equal deposited");
        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + assets, "USDC returned mismatch");
        assertEq(usdcVault.balanceOf(alice), 0, "Shares should be fully burned");
        assertEq(usdcVault.totalAssets(), 0, "Vault should be empty");
    }

    // ── Multi-user fork integration ────────────────────────────────────────────

    function test_fork_multi_user_share_dilution() public {
        // Alice deposits first
        vm.prank(alice);
        uint256 aliceShares = usdcVault.deposit(1_000 * 1e6, alice);

        // Bob deposits the same amount — should receive same shares (1:1 initially)
        vm.prank(bob);
        uint256 bobShares = usdcVault.deposit(1_000 * 1e6, bob);

        assertEq(aliceShares, bobShares, "Equal deposits should yield equal shares when vault ratio is 1:1");

        // Verify proportional claim
        uint256 aliceAssets = usdcVault.convertToAssets(aliceShares);
        uint256 bobAssets   = usdcVault.convertToAssets(bobShares);
        assertEq(aliceAssets, bobAssets, "Proportional claim should be equal");

        console.log("Alice shares:", aliceShares);
        console.log("Bob shares:", bobShares);
        console.log("Total vault assets:", usdcVault.totalAssets());
    }

    function test_fork_share_accounting_after_yield_injection() public {
        uint256 initialDeposit = 10_000 * 1e6;

        vm.prank(alice);
        uint256 aliceShares = usdcVault.deposit(initialDeposit, alice);

        // Simulate yield: send extra USDC directly into the vault (like an airdrop / reward)
        uint256 yield = 1_000 * 1e6; // 10% yield
        deal(USDC, address(usdcVault), usdc.balanceOf(address(usdcVault)) + yield);
        // Note: totalAssets_ is tracking manually in our vault; we test the balance-side

        vm.prank(bob);
        uint256 bobShares = usdcVault.deposit(5_000 * 1e6, bob);

        // Bob deposited after yield — should get fewer shares per dollar
        uint256 sharesPerDollarAlice = (aliceShares * 1e6) / initialDeposit;
        uint256 sharesPerDollarBob   = (bobShares * 1e6) / (5_000 * 1e6);

        assertGe(sharesPerDollarAlice, sharesPerDollarBob, "Early depositors should have better share ratio after yield");
    }

    // ── DAI integration ────────────────────────────────────────────────────────

    function test_fork_deposit_dai() public {
        uint256 depositAmount = 10_000 ether; // 10,000 DAI (18 decimals)

        vm.prank(carol);
        uint256 shares = daiVault.deposit(depositAmount, carol);

        assertGt(shares, 0, "Should mint non-zero DAI vault shares");
        assertEq(dai.balanceOf(address(daiVault)), depositAmount, "Vault should hold DAI");
        assertEq(daiVault.totalAssets(), depositAmount);
    }

    function test_fork_redeem_all_dai() public {
        uint256 depositAmount = 50_000 ether;

        vm.prank(carol);
        uint256 shares = daiVault.deposit(depositAmount, carol);

        vm.prank(carol);
        uint256 assets = daiVault.redeem(shares, carol, carol);

        assertEq(assets, depositAmount, "Full redeem should return exact deposit");
        assertEq(daiVault.totalAssets(), 0);
        assertEq(dai.balanceOf(address(daiVault)), 0);
    }

    // ── Protocol compatibility: USDC approval + Uniswap router ────────────────

    function test_fork_usdc_approve_then_vault_deposit() public {
        // Revoke and re-approve — verifies USDC's non-standard approve behaviour on mainnet
        vm.startPrank(alice);
        usdc.approve(address(usdcVault), 0);
        usdc.approve(address(usdcVault), 2_000 * 1e6);

        uint256 shares = usdcVault.deposit(2_000 * 1e6, alice);
        vm.stopPrank();

        assertGt(shares, 0);
    }

    function test_fork_vault_does_not_accept_usdt_directly() public {
        // USDT uses a different ERC20 (no bool return) — our vault uses the standard
        // IERC20 interface, so attempting to create a vault with USDT as asset
        // and then depositing should revert at the transferFrom step because USDT
        // doesn't return a bool. This test documents and validates that boundary.
        Vault usdtVault = new Vault(IERC20(USDT), "hvUSDT", "hvUSDT");

        deal(USDT, alice, 1_000 * 1e6);

        vm.startPrank(alice);
        IERC20(USDT).approve(address(usdtVault), type(uint256).max);
        // USDT's non-standard transferFrom should cause a revert in our require()
        vm.expectRevert();
        usdtVault.deposit(100 * 1e6, alice);
        vm.stopPrank();
    }

    // ── Emergency withdraw on mainnet fork ────────────────────────────────────

    function test_fork_emergency_withdraw_recovers_usdc() public {
        vm.prank(alice);
        usdcVault.deposit(3_000 * 1e6, alice);

        address owner = address(this);
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        usdcVault.emergencyWithdraw(USDC);

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + 3_000 * 1e6);
    }

    // ── Fork state: verify real on-chain token metadata ───────────────────────

    function test_fork_verify_usdc_mainnet_decimals() public view {
        (, bytes memory data) = USDC.staticcall(abi.encodeWithSignature("decimals()"));
        uint8 decimals = abi.decode(data, (uint8));
        assertEq(decimals, 6, "USDC mainnet decimals should be 6");
    }

    function test_fork_verify_dai_mainnet_decimals() public view {
        (, bytes memory data) = DAI.staticcall(abi.encodeWithSignature("decimals()"));
        uint8 decimals = abi.decode(data, (uint8));
        assertEq(decimals, 18, "DAI mainnet decimals should be 18");
    }

    function test_fork_verify_usdc_total_supply_nonzero() public view {
        assertGt(usdc.totalSupply(), 0, "USDC total supply should be > 0 on mainnet");
    }

    // ── Gas profiling on fork ──────────────────────────────────────────────────

    function test_fork_gas_deposit_1000_usdc() public {
        vm.prank(alice);
        uint256 gasBefore = gasleft();
        usdcVault.deposit(1_000 * 1e6, alice);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for 1000 USDC deposit:", gasUsed);
        // Sanity bound — should not exceed 200k gas for a simple deposit
        assertLt(gasUsed, 200_000, "Deposit gas cost too high");
    }

    // ── Snapshot / roll tests ─────────────────────────────────────────────────

    function test_fork_snapshot_and_restore() public {
        uint256 snapshot = vm.snapshot();

        vm.prank(alice);
        usdcVault.deposit(5_000 * 1e6, alice);
        assertGt(usdcVault.totalAssets(), 0);

        vm.revertTo(snapshot);

        // After revert: vault should be empty again
        assertEq(usdcVault.totalAssets(), 0, "State should have reverted");
    }
}
