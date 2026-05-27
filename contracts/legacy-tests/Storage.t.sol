// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../../src/Storage.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract StorageTest is Test {
    Storage public implementation;
    Storage public proxy;
    address public governance = address(0x1);
    address public user = address(0x2);

    function setUp() public {
        implementation = new Storage();
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Storage.initialize.selector, governance)
        );
        proxy = Storage(address(proxyContract));
    }

    function test_Initialize() public {
        assertEq(proxy.hasRole(proxy.DEFAULT_ADMIN_ROLE(), governance), true);
        assertEq(proxy.hasRole(proxy.GOVERNANCE_ROLE(), governance), true);
    }

    function test_SetAndGetAddress() public {
        vm.prank(governance);
        bytes32 key = keccak256("Vault");
        address value = address(0x123);
        proxy.setAddress(key, value);
        assertEq(proxy.getAddress(key), value);
    }

    function test_RevertSetAddressNotGovernance() public {
        vm.prank(user);
        vm.expectRevert();
        proxy.setAddress(keccak256("Vault"), address(0x123));
    }

    function test_RevertSetZeroAddress() public {
        vm.prank(governance);
        vm.expectRevert("Storage: zero address");
        proxy.setAddress(keccak256("Vault"), address(0));
    }

    function test_Upgrade() public {
        Storage newImplementation = new Storage();
        vm.prank(governance);
        proxy.upgradeTo(address(newImplementation));
    }

    function test_RevertUpgradeNotAdmin() public {
        Storage newImplementation = new Storage();
        vm.prank(user);
        vm.expectRevert();
        proxy.upgradeTo(address(newImplementation));
    }
}
