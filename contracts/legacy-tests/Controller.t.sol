// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../../src/Controller.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ControllerTest is Test {
    Controller public implementation;
    Controller public proxy;
    address public governance = address(0x1);
    address public operator = address(0x2);
    address public vault = address(0x3);
    address public strategy = address(0x4);

    function setUp() public {
        implementation = new Controller();
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Controller.initialize.selector, governance, address(0x99))
        );
        proxy = Controller(address(proxyContract));
        
        vm.prank(governance);
        proxy.grantRole(proxy.OPERATOR_ROLE(), operator);
    }

    function test_AddVault() public {
        vm.prank(governance);
        proxy.addVault(vault);
        assertEq(proxy.vaults(vault), true);
    }

    function test_SetStrategy() public {
        vm.prank(governance);
        proxy.addVault(vault);
        
        vm.prank(governance);
        proxy.setStrategy(vault, strategy);
        assertEq(proxy.strategies(vault), strategy);
    }

    function test_RevertSetStrategyNoVault() public {
        vm.prank(governance);
        vm.expectRevert("Controller: vault not added");
        proxy.setStrategy(vault, strategy);
    }

    function test_DoHardWork() public {
        vm.prank(governance);
        proxy.addVault(vault);
        vm.prank(governance);
        proxy.setStrategy(vault, strategy);

        vm.prank(operator);
        proxy.doHardWork(vault);
    }

    function test_RevertDoHardWorkNotOperator() public {
        vm.prank(governance);
        vm.expectRevert();
        proxy.doHardWork(vault);
    }

    function test_Upgrade() public {
        Controller newImplementation = new Controller();
        vm.prank(governance);
        proxy.upgradeTo(address(newImplementation));
    }
}
