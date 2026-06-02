// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "../src/MockERC20.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @dev Minimal V2 implementation that adds a new storage variable and a new function,
 *      while preserving all V1 storage layout.
 */
contract VaultV2 is Vault {
    uint256 public newField; // appended after all V1 slots

    function setNewField(uint256 val) external onlyRole(ADMIN_ROLE) {
        newField = val;
    }

    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract VaultUpgradeabilityTest is Test {
    address internal admin = address(0xA1);
    address internal user  = address(0xA2);

    MockERC20 internal asset;

    // ── UUPS fixtures ──────────────────────────────────────────────────────────
    Vault    internal uupsImpl;
    Vault    internal uupsProxy;

    // ── Transparent fixtures ───────────────────────────────────────────────────
    Vault        internal tpImpl;
    ProxyAdmin   internal proxyAdmin;
    Vault        internal tpProxy;

    // ── Common setup ──────────────────────────────────────────────────────────

    function setUp() public {
        asset = new MockERC20("Test Token", "TEST", 18);
        asset.mint(user, 1_000e18);

        // ── UUPS proxy ────────────────────────────────────────────────────────
        uupsImpl = new Vault();
        ERC1967Proxy uupsProxyContract = new ERC1967Proxy(
            address(uupsImpl),
            abi.encodeCall(Vault.initialize, (IERC20Upgradeable(address(asset)), "Vault Token", "vTEST", admin))
        );
        uupsProxy = Vault(address(uupsProxyContract));

        // ── TransparentUpgradeableProxy ───────────────────────────────────────
        tpImpl     = new Vault();
        proxyAdmin = new ProxyAdmin();
        TransparentUpgradeableProxy tp = new TransparentUpgradeableProxy(
            address(tpImpl),
            address(proxyAdmin),
            abi.encodeCall(Vault.initialize, (IERC20Upgradeable(address(asset)), "Vault Token", "vTEST", admin))
        );
        tpProxy = Vault(address(tp));

        // Approve both proxies
        vm.startPrank(user);
        asset.approve(address(uupsProxy), type(uint256).max);
        asset.approve(address(tpProxy),   type(uint256).max);
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UUPS upgradeability
    // ══════════════════════════════════════════════════════════════════════════

    function test_UUPS_StatePreservedAfterUpgrade() public {
        // Deposit before upgrade
        vm.prank(user);
        uupsProxy.deposit(200e18, user);

        uint256 sharesBefore      = uupsProxy.balanceOf(user);
        uint256 totalAssetsBefore = uupsProxy.totalAssets();
        uint256 capBefore         = uupsProxy.depositCap();

        // Upgrade to V2
        VaultV2 newImpl = new VaultV2();
        vm.prank(admin);
        uupsProxy.upgradeTo(address(newImpl));

        VaultV2 uupsV2 = VaultV2(address(uupsProxy));

        // State must be identical after upgrade
        assertEq(uupsV2.balanceOf(user),  sharesBefore,      "shares preserved");
        assertEq(uupsV2.totalAssets(),    totalAssetsBefore, "totalAssets preserved");
        assertEq(uupsV2.depositCap(),     capBefore,         "depositCap preserved");
        assertEq(uupsV2.asset(),          address(asset),    "asset preserved");

        // New V2 functionality works
        assertEq(uupsV2.version(), "v2");
        vm.prank(admin);
        uupsV2.setNewField(42);
        assertEq(uupsV2.newField(), 42);
    }

    function test_UUPS_OnlyUpgraderCanUpgrade() public {
        VaultV2 newImpl = new VaultV2();
        vm.prank(user); // not UPGRADER_ROLE
        vm.expectRevert();
        uupsProxy.upgradeTo(address(newImpl));
    }

    function test_UUPS_CannotReinitializeAfterUpgrade() public {
        VaultV2 newImpl = new VaultV2();
        vm.prank(admin);
        uupsProxy.upgradeTo(address(newImpl));

        VaultV2 uupsV2 = VaultV2(address(uupsProxy));
        vm.expectRevert(); // Initializable: contract is already initialized
        uupsV2.initialize(IERC20Upgradeable(address(asset)), "X", "X", admin);
    }

    function test_UUPS_DepositAndWithdrawWorkAfterUpgrade() public {
        vm.prank(user);
        uupsProxy.deposit(100e18, user);

        VaultV2 newImpl = new VaultV2();
        vm.prank(admin);
        uupsProxy.upgradeTo(address(newImpl));

        VaultV2 uupsV2 = VaultV2(address(uupsProxy));

        // Withdraw after upgrade
        vm.prank(user);
        uupsV2.withdraw(100e18, user, user);

        assertEq(uupsV2.balanceOf(user), 0);
        assertEq(uupsV2.totalAssets(),   0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TransparentUpgradeableProxy upgradeability
    // ══════════════════════════════════════════════════════════════════════════

    function test_Transparent_StatePreservedAfterUpgrade() public {
        // Deposit before upgrade
        vm.prank(user);
        tpProxy.deposit(300e18, user);

        uint256 sharesBefore      = tpProxy.balanceOf(user);
        uint256 totalAssetsBefore = tpProxy.totalAssets();

        // Admin sets a deposit cap before upgrade
        vm.prank(admin);
        tpProxy.setDepositCap(500e18);
        uint256 capBefore = tpProxy.depositCap();

        // Upgrade via ProxyAdmin
        VaultV2 newImpl = new VaultV2();
        proxyAdmin.upgrade(ITransparentUpgradeableProxy(address(tpProxy)), address(newImpl));

        VaultV2 tpV2 = VaultV2(address(tpProxy));

        // All state preserved
        assertEq(tpV2.balanceOf(user),  sharesBefore,      "shares preserved");
        assertEq(tpV2.totalAssets(),    totalAssetsBefore, "totalAssets preserved");
        assertEq(tpV2.depositCap(),     capBefore,         "depositCap preserved");
        assertEq(tpV2.asset(),          address(asset),    "asset preserved");

        // New V2 functionality works
        assertEq(tpV2.version(), "v2");
        vm.prank(admin);
        tpV2.setNewField(99);
        assertEq(tpV2.newField(), 99);
    }

    function test_Transparent_OnlyProxyAdminCanUpgrade() public {
        VaultV2 newImpl = new VaultV2();
        // Calling upgrade from a non-admin address must revert
        vm.prank(user);
        vm.expectRevert();
        proxyAdmin.upgrade(ITransparentUpgradeableProxy(address(tpProxy)), address(newImpl));
    }

    function test_Transparent_CannotReinitializeAfterUpgrade() public {
        VaultV2 newImpl = new VaultV2();
        proxyAdmin.upgrade(ITransparentUpgradeableProxy(address(tpProxy)), address(newImpl));

        VaultV2 tpV2 = VaultV2(address(tpProxy));
        vm.expectRevert(); // Initializable: contract is already initialized
        tpV2.initialize(IERC20Upgradeable(address(asset)), "X", "X", admin);
    }

    function test_Transparent_DepositAndWithdrawWorkAfterUpgrade() public {
        vm.prank(user);
        tpProxy.deposit(150e18, user);

        VaultV2 newImpl = new VaultV2();
        proxyAdmin.upgrade(ITransparentUpgradeableProxy(address(tpProxy)), address(newImpl));

        VaultV2 tpV2 = VaultV2(address(tpProxy));

        vm.prank(user);
        tpV2.withdraw(150e18, user, user);

        assertEq(tpV2.balanceOf(user), 0);
        assertEq(tpV2.totalAssets(),   0);
    }

    function test_Transparent_NewFieldDoesNotCorruptOldState() public {
        vm.prank(user);
        tpProxy.deposit(50e18, user);

        VaultV2 newImpl = new VaultV2();
        proxyAdmin.upgrade(ITransparentUpgradeableProxy(address(tpProxy)), address(newImpl));

        VaultV2 tpV2 = VaultV2(address(tpProxy));

        // newField starts at zero (uninitialized slot)
        assertEq(tpV2.newField(), 0);

        // Writing to newField must not affect shares or totalAssets
        vm.prank(admin);
        tpV2.setNewField(777);

        assertEq(tpV2.balanceOf(user), 50e18);
        assertEq(tpV2.totalAssets(),   50e18);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Implementation slot integrity
    // ══════════════════════════════════════════════════════════════════════════

    function test_ImplementationSlotUpdatedAfterUUPSUpgrade() public {
        // ERC-1967 implementation slot
        bytes32 implSlot = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

        address implBefore = address(uint160(uint256(vm.load(address(uupsProxy), implSlot))));
        assertEq(implBefore, address(uupsImpl));

        VaultV2 newImpl = new VaultV2();
        vm.prank(admin);
        uupsProxy.upgradeTo(address(newImpl));

        address implAfter = address(uint160(uint256(vm.load(address(uupsProxy), implSlot))));
        assertEq(implAfter, address(newImpl));
    }
}
