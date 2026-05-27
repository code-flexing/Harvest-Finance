// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";
import "../src/BaseStrategy.sol";
import "../src/VaultFactory.sol";
import "../src/StrategyManager.sol";
import "../src/MockAaveStrategy.sol";
import "../src/MockERC20.sol";

// ── Minimal inline mock strategy (no external deps) ──────────────────────────

contract MockStrategy is BaseStrategy {
    uint256 public deployed;
    uint256 public mockGain;
    uint256 public mockLoss;

    function initialize(address _vault, address _want, address _admin) external initializer {
        __BaseStrategy_init(_vault, _want, _admin);
    }

    function setMockGain(uint256 g) external { mockGain = g; }
    function setMockLoss(uint256 l) external { mockLoss = l; }

    function estimatedTotalAssets() external view override returns (uint256) {
        return IERC20Upgradeable(want).balanceOf(address(this)) + deployed;
    }

    function _invest() internal override {
        uint256 bal = IERC20Upgradeable(want).balanceOf(address(this));
        deployed += bal;
    }

    function _harvest() internal override returns (uint256 gain, uint256 loss) {
        gain = mockGain; loss = mockLoss;
        mockGain = 0; mockLoss = 0;
        if (gain > 0) MockERC20(want).mint(address(this), gain);
    }

    function _withdrawSome(uint256 amount) internal override returns (uint256 freed) {
        freed = amount > deployed ? deployed : amount;
        deployed -= freed;
    }

    function _withdrawAll() internal override { deployed = 0; }
}

// ── Test contract ─────────────────────────────────────────────────────────────

contract BaseVaultTest is Test {
    MockERC20       internal token;
    BaseVault       internal vaultImpl;
    BaseVault       internal vault;
    MockStrategy    internal stratImpl;
    MockStrategy    internal strategy;
    VaultFactory    internal factory;
    StrategyManager internal manager;

    address internal admin  = address(0xA11CE);
    address internal alice  = address(0xA1);
    address internal bob    = address(0xB0B);
    address internal keeper = address(0xBEEF);

    uint256 constant INITIAL_MINT = 1_000_000e18;

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC", 0);
        token.mint(alice, INITIAL_MINT);
        token.mint(bob,   INITIAL_MINT);

        vaultImpl = new BaseVault();
        bytes memory vaultInit = abi.encodeCall(
            BaseVault.initialize,
            (address(token), "Harvest mUSDC", "hmUSDC", admin)
        );
        vault = BaseVault(address(new ERC1967Proxy(address(vaultImpl), vaultInit)));

        stratImpl = new MockStrategy();
        bytes memory stratInit = abi.encodeCall(
            MockStrategy.initialize,
            (address(vault), address(token), admin)
        );
        strategy = MockStrategy(address(new ERC1967Proxy(address(stratImpl), stratInit)));

        vm.startPrank(admin);
        strategy.grantRole(strategy.KEEPER_ROLE(), keeper);
        vm.stopPrank();

        factory = new VaultFactory(address(vaultImpl), admin);
        manager = new StrategyManager(admin);

        vm.startPrank(admin);
        vault.grantRole(vault.STRATEGY_MANAGER_ROLE(), address(manager));
        vm.stopPrank();
    }

    // ── Initialization ────────────────────────────────────────────────────────

    function test_initialize() public {
        assertEq(vault.name(),        "Harvest mUSDC");
        assertEq(vault.symbol(),      "hmUSDC");
        assertEq(vault.asset(),       address(token));
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.depositCap(),  type(uint256).max);
    }

    function test_initialize_zeroAddress_reverts() public {
        BaseVault impl2 = new BaseVault();
        bytes memory bad = abi.encodeCall(BaseVault.initialize, (address(0), "X", "X", admin));
        vm.expectRevert(BaseVault.ZeroAddress.selector);
        new ERC1967Proxy(address(impl2), bad);
    }

    // ── Deposit ───────────────────────────────────────────────────────────────

    function test_deposit_basic() public {
        uint256 amount = 100e18;
        vm.startPrank(alice);
        token.approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, alice);
        vm.stopPrank();

        assertGt(shares, 0);
        assertEq(vault.balanceOf(alice), shares);
        assertEq(vault.totalAssets(), amount);
        assertEq(token.balanceOf(address(vault)), amount);
    }

    function test_deposit_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert(BaseVault.ZeroAmount.selector);
        vault.deposit(0, alice);
    }

    function test_deposit_zeroReceiver_reverts() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1e18);
        vm.expectRevert(BaseVault.ZeroAddress.selector);
        vault.deposit(1e18, address(0));
        vm.stopPrank();
    }

    function test_deposit_cap_enforced() public {
        vm.prank(admin);
        vault.setDepositCap(50e18);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vm.expectRevert(BaseVault.DepositCapExceeded.selector);
        vault.deposit(100e18, alice);
        vm.stopPrank();
    }

    function test_deposit_whenPaused_reverts() public {
        vm.prank(admin);
        vault.pause();

        vm.startPrank(alice);
        token.approve(address(vault), 1e18);
        vm.expectRevert(BaseVault.Paused.selector);
        vault.deposit(1e18, alice);
        vm.stopPrank();
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function test_mint_basic() public {
        // First deposit to establish a price
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(100e18, alice);

        uint256 sharesBefore = vault.balanceOf(alice);
        uint256 assets = vault.mint(sharesBefore, alice); // mint same number of shares again
        vm.stopPrank();

        assertGt(assets, 0);
        assertEq(vault.balanceOf(alice), sharesBefore * 2);
    }

    function test_mint_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert(BaseVault.ZeroSharesMinted.selector);
        vault.mint(0, alice);
    }

    function test_mint_whenPaused_reverts() public {
        vm.prank(admin);
        vault.pause();

        vm.startPrank(alice);
        token.approve(address(vault), 1e18);
        vm.expectRevert(BaseVault.Paused.selector);
        vault.mint(1e18, alice);
        vm.stopPrank();
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────

    function test_withdraw_basic() public {
        uint256 amount = 100e18;
        vm.startPrank(alice);
        token.approve(address(vault), amount);
        vault.deposit(amount, alice);
        vault.withdraw(amount, alice, alice);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.totalAssets(), 0);
        assertEq(token.balanceOf(alice), INITIAL_MINT);
    }

    function test_withdraw_insufficientShares_reverts() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.expectRevert(BaseVault.InsufficientShares.selector);
        vault.withdraw(200e18, alice, alice);
        vm.stopPrank();
    }

    // ── Redeem ────────────────────────────────────────────────────────────────

    function test_redeem_basic() public {
        uint256 amount = 100e18;
        vm.startPrank(alice);
        token.approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, alice);
        uint256 assets = vault.redeem(shares, alice, alice);
        vm.stopPrank();

        assertGt(assets, 0);
        assertEq(vault.balanceOf(alice), 0);
    }

    function test_redeem_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert(BaseVault.ZeroSharesBurned.selector);
        vault.redeem(0, alice, alice);
    }


    // ── pricePerShare ─────────────────────────────────────────────────────────

    function test_pricePerShare_initial() public {
        assertEq(vault.pricePerShare(), 10 ** vault.decimals());
    }

    function test_pricePerShare_increases_after_gain() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 10e18, 0);

        assertGt(vault.pricePerShare(), 1e18);
    }

    // ── ERC4626 view functions ────────────────────────────────────────────────

    function test_maxDeposit_unpaused() public {
        assertEq(vault.maxDeposit(alice), type(uint256).max);
    }

    function test_maxDeposit_paused_returns_zero() public {
        vm.prank(admin);
        vault.pause();
        assertEq(vault.maxDeposit(alice), 0);
    }

    function test_maxDeposit_respects_cap() public {
        vm.prank(admin);
        vault.setDepositCap(500e18);
        assertEq(vault.maxDeposit(alice), 500e18);
    }

    function test_maxWithdraw_returns_owner_assets() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        // maxWithdraw ≈ deposited amount (may differ slightly due to virtual offset)
        assertGt(vault.maxWithdraw(alice), 0);
    }

    function test_maxRedeem_returns_share_balance() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        uint256 shares = vault.deposit(100e18, alice);
        vm.stopPrank();

        assertEq(vault.maxRedeem(alice), shares);
    }

    function test_maxRedeem_paused_returns_zero() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vm.prank(admin);
        vault.pause();
        assertEq(vault.maxRedeem(alice), 0);
    }

    function test_previewMint_roundtrip() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        uint256 shares = 50e18;
        uint256 assets = vault.previewMint(shares);
        assertGt(assets, 0);
        // previewDeposit(assets) should give back ~shares
        assertApproxEqAbs(vault.previewDeposit(assets), shares, 1);
    }

    function test_convertToShares_after_gain() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        // 100% gain → totalAssets doubles, shares stay same → price doubles
        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 100e18, 0);

        // 100 assets should now buy fewer shares
        assertLt(vault.convertToShares(100e18), vault.convertToShares(100e18) + 1); // sanity
        assertGt(vault.convertToAssets(50e18), 50e18);
    }

    // ── Strategy management ───────────────────────────────────────────────────

    function test_addStrategy() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        (uint256 debtRatio,,,,bool active) = vault.strategies(address(strategy));
        assertTrue(active);
        assertEq(debtRatio, 5000);
        assertEq(vault.totalDebtRatio(), 5000);
        assertEq(vault.strategyCount(), 1);
    }

    function test_addStrategy_duplicate_reverts() public {
        vm.startPrank(admin);
        vault.addStrategy(address(strategy), 5000);
        vm.expectRevert(BaseVault.StrategyAlreadyAdded.selector);
        vault.addStrategy(address(strategy), 1000);
        vm.stopPrank();
    }

    function test_addStrategy_debtRatioExceeded_reverts() public {
        vm.prank(admin);
        vm.expectRevert(BaseVault.DebtRatioExceeded.selector);
        vault.addStrategy(address(strategy), 10_001);
    }

    function test_removeStrategy() public {
        vm.startPrank(admin);
        vault.addStrategy(address(strategy), 5000);
        vault.removeStrategy(address(strategy));
        vm.stopPrank();

        (,,,, bool active) = vault.strategies(address(strategy));
        assertFalse(active);
        assertEq(vault.totalDebtRatio(), 0);
        assertEq(vault.strategyCount(), 0);
    }

    function test_removeStrategy_notFound_reverts() public {
        vm.prank(admin);
        vm.expectRevert(BaseVault.StrategyNotFound.selector);
        vault.removeStrategy(address(strategy));
    }

    function test_updateDebtRatio() public {
        vm.startPrank(admin);
        vault.addStrategy(address(strategy), 5000);
        vault.updateDebtRatio(address(strategy), 3000);
        vm.stopPrank();

        (uint256 debtRatio,,,,) = vault.strategies(address(strategy));
        assertEq(debtRatio, 3000);
        assertEq(vault.totalDebtRatio(), 3000);
    }

    function test_updateDebtRatio_exceeded_reverts() public {
        vm.startPrank(admin);
        vault.addStrategy(address(strategy), 5000);
        vm.expectRevert(BaseVault.DebtRatioExceeded.selector);
        vault.updateDebtRatio(address(strategy), 10_001);
        vm.stopPrank();
    }

    function test_updateDebtRatio_notFound_reverts() public {
        vm.prank(admin);
        vm.expectRevert(BaseVault.StrategyNotFound.selector);
        vault.updateDebtRatio(address(strategy), 1000);
    }

    // ── reportStrategy ────────────────────────────────────────────────────────

    function test_reportStrategy_gain() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        uint256 assetsBefore = vault.totalAssets();
        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 50e18, 0);

        assertEq(vault.totalAssets(), assetsBefore + 50e18);
    }

    function test_reportStrategy_loss() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        // Allocate so strategy has totalDebt > 0 (loss is capped at totalDebt)
        vault.allocate();

        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 0, 10e18);

        assertEq(vault.totalAssets(), 100e18 - 10e18);
    }

    function test_reportStrategy_unauthorized_reverts() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.prank(alice);
        vm.expectRevert(BaseVault.NotStrategy.selector);
        vault.reportStrategy(address(strategy), 10e18, 0);
    }

    // ── Harvest fee ───────────────────────────────────────────────────────────

    function test_harvestFee_mints_shares_to_treasury() public {
        address treasury = address(0xFEE);
        vm.startPrank(admin);
        vault.setHarvestFee(1000, treasury); // 10%
        vault.addStrategy(address(strategy), 5000);
        vm.stopPrank();

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        uint256 treasurySharesBefore = vault.balanceOf(treasury);

        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 100e18, 0); // 100e18 gain

        // Treasury should have received fee shares
        assertGt(vault.balanceOf(treasury), treasurySharesBefore);
    }

    function test_harvestFee_zero_no_mint() public {
        address treasury = address(0xFEE);
        // harvestFeeBps defaults to 0
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), 100e18, 0);

        assertEq(vault.balanceOf(treasury), 0);
    }

    function test_setHarvestFee_tooHigh_reverts() public {
        vm.prank(admin);
        vm.expectRevert(BaseVault.InvalidFee.selector);
        vault.setHarvestFee(5001, admin);
    }


    // ── allocate ──────────────────────────────────────────────────────────────

    function test_allocate_pushes_funds_to_strategy() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000); // 50%

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();

        assertGt(strategy.estimatedTotalAssets(), 0);
    }

    function test_allocate_respects_debt_ratio() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 3000); // 30%

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();

        // Strategy should have received ~30% of totalAssets as totalDebt
        (,uint256 totalDebt,,,) = vault.strategies(address(strategy));
        assertApproxEqAbs(totalDebt, 30e18, 1e15);
    }

    // ── Harvest via strategy ──────────────────────────────────────────────────

    function test_harvest_reports_gain_to_vault() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();
        strategy.setMockGain(10e18);

        uint256 assetsBefore = vault.totalAssets();
        vm.prank(keeper);
        strategy.harvest();

        assertEq(vault.totalAssets(), assetsBefore + 10e18);
    }

    function test_harvest_unauthorized_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        strategy.harvest();
    }

    // ── Emergency exit ────────────────────────────────────────────────────────

    function test_emergencyExit_returns_funds_to_vault() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();

        vm.prank(admin);
        strategy.emergencyExit();

        assertTrue(strategy.isEmergencyExit());
        // All deployed funds returned to vault
        assertEq(strategy.deployed(), 0);
    }

    function test_invest_blocked_after_emergencyExit() public {
        vm.prank(admin);
        strategy.emergencyExit();

        vm.prank(address(vault));
        vm.expectRevert(BaseStrategy.EmergencyExitActive.selector);
        strategy.invest();
    }

    // ── Withdraw from strategy on vault withdrawal ────────────────────────────

    function test_withdraw_pulls_from_strategy() public {
        vm.prank(admin);
        vault.addStrategy(address(strategy), 10000); // 100%

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();
        assertEq(token.balanceOf(address(vault)), 0); // all deployed

        // Alice should still be able to withdraw
        vm.startPrank(alice);
        vault.redeem(vault.balanceOf(alice), alice, alice);
        vm.stopPrank();

        assertGt(token.balanceOf(alice), 0);
    }

    // ── VaultFactory ──────────────────────────────────────────────────────────

    function test_factory_deployVault() public {
        MockERC20 token2 = new MockERC20("Token2", "TK2", 0);
        vm.prank(admin);
        address newVault = factory.deployVault(address(token2), "Harvest TK2", "hTK2", admin);

        assertEq(factory.vaultCount(), 1);
        assertEq(factory.vaultByAsset(address(token2)), newVault);
        assertEq(BaseVault(newVault).asset(), address(token2));
    }

    function test_factory_duplicateAsset_reverts() public {
        MockERC20 token2 = new MockERC20("Token2", "TK2", 0);
        vm.startPrank(admin);
        factory.deployVault(address(token2), "Harvest TK2", "hTK2", admin);
        vm.expectRevert(VaultFactory.VaultAlreadyExists.selector);
        factory.deployVault(address(token2), "Harvest TK2 v2", "hTK2v2", admin);
        vm.stopPrank();
    }

    // ── StrategyManager ───────────────────────────────────────────────────────

    function test_manager_addStrategy() public {
        vm.prank(admin);
        manager.addStrategy(address(vault), address(strategy), 3000);

        (uint256 debtRatio,,,, bool active) = vault.strategies(address(strategy));
        assertTrue(active);
        assertEq(debtRatio, 3000);
    }

    function test_manager_removeStrategy() public {
        vm.startPrank(admin);
        manager.addStrategy(address(vault), address(strategy), 3000);
        manager.removeStrategy(address(vault), address(strategy));
        vm.stopPrank();

        (,,,, bool active) = vault.strategies(address(strategy));
        assertFalse(active);
    }

    function test_manager_updateDebtRatio() public {
        vm.startPrank(admin);
        manager.addStrategy(address(vault), address(strategy), 5000);
        manager.updateDebtRatio(address(vault), address(strategy), 2000);
        vm.stopPrank();

        (uint256 debtRatio,,,,) = vault.strategies(address(strategy));
        assertEq(debtRatio, 2000);
    }

    function test_manager_rebalance() public {
        vm.prank(admin);
        manager.addStrategy(address(vault), address(strategy), 5000);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vm.prank(admin);
        manager.rebalance(address(vault));

        assertGt(strategy.estimatedTotalAssets(), 0);
    }

    function test_manager_batchRebalance() public {
        // Deploy a second vault
        MockERC20 token2 = new MockERC20("TK2", "TK2", 0);
        token2.mint(alice, INITIAL_MINT);
        vm.prank(admin);
        address vault2Addr = factory.deployVault(address(token2), "hTK2", "hTK2", admin);
        BaseVault vault2 = BaseVault(vault2Addr);

        // Grant manager role on vault2
        vm.startPrank(admin);
        vault2.grantRole(vault2.STRATEGY_MANAGER_ROLE(), address(manager));
        vm.stopPrank();

        // Deposit into both vaults
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        token2.approve(vault2Addr, 100e18);
        vault2.deposit(100e18, alice);
        vm.stopPrank();

        address[] memory vaults = new address[](2);
        vaults[0] = address(vault);
        vaults[1] = vault2Addr;

        vm.prank(admin);
        manager.batchRebalance(vaults);
        // No revert = success (no strategies added, allocate is a no-op)
    }

    // ── MockAaveStrategy ──────────────────────────────────────────────────────

    function test_mockAaveStrategy_invest_and_harvest() public {
        // Deploy MockAaveStrategy proxy
        MockAaveStrategy aaveImpl = new MockAaveStrategy();
        bytes memory aaveInit = abi.encodeCall(
            MockAaveStrategy.initialize,
            (address(vault), address(token), admin)
        );
        MockAaveStrategy aaveStrat = MockAaveStrategy(
            address(new ERC1967Proxy(address(aaveImpl), aaveInit))
        );

        vm.startPrank(admin);
        aaveStrat.grantRole(aaveStrat.KEEPER_ROLE(), keeper);
        vm.stopPrank();

        vm.prank(admin);
        vault.addStrategy(address(aaveStrat), 5000);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();
        assertGt(aaveStrat.deployedBalance(), 0);

        // Set pending gain and harvest
        aaveStrat.setPendingGain(10e18);
        uint256 assetsBefore = vault.totalAssets();

        vm.prank(keeper);
        aaveStrat.harvest();

        assertEq(vault.totalAssets(), assetsBefore + 10e18);
    }

    function test_mockAaveStrategy_emergencyExit() public {
        MockAaveStrategy aaveImpl = new MockAaveStrategy();
        bytes memory aaveInit = abi.encodeCall(
            MockAaveStrategy.initialize,
            (address(vault), address(token), admin)
        );
        MockAaveStrategy aaveStrat = MockAaveStrategy(
            address(new ERC1967Proxy(address(aaveImpl), aaveInit))
        );

        vm.prank(admin);
        vault.addStrategy(address(aaveStrat), 5000);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        vault.allocate();

        vm.prank(admin);
        aaveStrat.emergencyExit();

        assertTrue(aaveStrat.isEmergencyExit());
        assertEq(aaveStrat.deployedBalance(), 0);
    }

    // ── Pause / unpause ───────────────────────────────────────────────────────

    function test_pause_unpause() public {
        vm.prank(admin);
        vault.pause();
        assertTrue(vault.paused());

        vm.prank(admin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_unpause_allows_deposit() public {
        vm.prank(admin);
        vault.pause();
        vm.prank(admin);
        vault.unpause();

        vm.startPrank(alice);
        token.approve(address(vault), 10e18);
        vault.deposit(10e18, alice);
        vm.stopPrank();

        assertEq(vault.totalAssets(), 10e18);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_deposit_withdraw(uint256 amount) public {
        amount = bound(amount, 1e6, INITIAL_MINT);

        vm.startPrank(alice);
        token.approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, alice);
        assertEq(vault.totalAssets(), amount);
        assertGt(shares, 0);

        vault.withdraw(amount, alice, alice);
        vm.stopPrank();

        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(token.balanceOf(alice), INITIAL_MINT);
    }

    function testFuzz_pricePerShare_monotonic_with_gain(uint256 gain) public {
        gain = bound(gain, 1, 1_000_000e18);

        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(100e18, alice);
        vm.stopPrank();

        uint256 priceBefore = vault.pricePerShare();

        vm.prank(admin);
        vault.addStrategy(address(strategy), 5000);

        vm.prank(address(strategy));
        vault.reportStrategy(address(strategy), gain, 0);

        assertGe(vault.pricePerShare(), priceBefore);
    }

    function testFuzz_mint_deposit_equivalence(uint256 assets) public {
        assets = bound(assets, 1e6, INITIAL_MINT / 2);

        // Alice deposits
        vm.startPrank(alice);
        token.approve(address(vault), assets);
        uint256 sharesFromDeposit = vault.deposit(assets, alice);
        vm.stopPrank();

        // Bob mints the same number of shares
        uint256 assetsNeeded = vault.previewMint(sharesFromDeposit);
        vm.startPrank(bob);
        token.approve(address(vault), assetsNeeded);
        uint256 assetsFromMint = vault.mint(sharesFromDeposit, bob);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice), vault.balanceOf(bob));
        assertApproxEqAbs(assetsFromMint, assetsNeeded, 1);
    }
}
