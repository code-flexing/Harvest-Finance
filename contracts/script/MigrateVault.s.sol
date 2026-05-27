// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";

/**
 * @title MigrateVault
 * @notice Upgrades an existing BaseVault proxy to a new implementation.
 *
 * Usage:
 *   forge script script/MigrateVault.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Environment variables:
 *   DEPLOYER_PRIVATE_KEY  — deployer private key (must have UPGRADER_ROLE on vault)
 *   VAULT_PROXY           — address of the vault proxy to upgrade
 */
contract MigrateVault is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address vaultProxy  = vm.envAddress("VAULT_PROXY");

        vm.startBroadcast(deployerKey);

        // Deploy new implementation
        BaseVault newImpl = new BaseVault();
        console2.log("New BaseVault implementation:", address(newImpl));

        // Upgrade the proxy
        BaseVault(vaultProxy).upgradeTo(address(newImpl));
        console2.log("Vault proxy upgraded:        ", vaultProxy);

        vm.stopBroadcast();
    }
}
