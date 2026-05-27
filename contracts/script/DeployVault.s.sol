// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Script.sol";
import "../src/VaultFactory.sol";

/**
 * @title DeployVault
 * @notice Deploys a single vault for a given asset via VaultFactory.
 *
 * Usage:
 *   forge script script/DeployVault.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     -vvvv
 *
 * Environment variables:
 *   DEPLOYER_PRIVATE_KEY  — deployer private key
 *   VAULT_FACTORY         — address of deployed VaultFactory
 *   VAULT_ASSET           — underlying ERC20 token address
 *   VAULT_NAME            — share token name  (e.g. "Harvest USDC")
 *   VAULT_SYMBOL          — share token symbol (e.g. "hUSDC")
 *   ADMIN_ADDRESS         — vault admin (defaults to deployer)
 */
contract DeployVault is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address factoryAddr = vm.envAddress("VAULT_FACTORY");
        address asset       = vm.envAddress("VAULT_ASSET");
        string  memory name   = vm.envString("VAULT_NAME");
        string  memory symbol = vm.envString("VAULT_SYMBOL");
        address admin       = vm.envOr("ADMIN_ADDRESS", deployer);

        vm.startBroadcast(deployerKey);

        address vault = VaultFactory(factoryAddr).deployVault(asset, name, symbol, admin);
        console2.log("Vault deployed:", vault);
        console2.log("  Asset:       ", asset);
        console2.log("  Admin:       ", admin);

        vm.stopBroadcast();
    }
}
