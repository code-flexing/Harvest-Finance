// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/BaseVault.sol";
import "../src/VaultFactory.sol";
import "../src/StrategyManager.sol";

/**
 * @title DeployProtocol
 * @notice Deploys the full modular yield aggregation protocol:
 *         1. BaseVault implementation (logic contract)
 *         2. VaultFactory (creates vault proxies)
 *         3. StrategyManager (coordinates strategies across vaults)
 *
 * Usage:
 *   forge script script/DeployProtocol.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Environment variables:
 *   DEPLOYER_PRIVATE_KEY  — deployer private key
 *   ADMIN_ADDRESS         — address that receives admin roles (defaults to deployer)
 */
contract DeployProtocol is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address admin       = vm.envOr("ADMIN_ADDRESS", deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy BaseVault implementation (no initializer — proxies call initialize)
        BaseVault vaultImpl = new BaseVault();
        console2.log("BaseVault implementation:", address(vaultImpl));

        // 2. Deploy VaultFactory
        VaultFactory factory = new VaultFactory(address(vaultImpl), admin);
        console2.log("VaultFactory:            ", address(factory));

        // 3. Deploy StrategyManager
        StrategyManager manager = new StrategyManager(admin);
        console2.log("StrategyManager:         ", address(manager));

        vm.stopBroadcast();

        // Print summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("Admin:                   ", admin);
        console2.log("BaseVault impl:          ", address(vaultImpl));
        console2.log("VaultFactory:            ", address(factory));
        console2.log("StrategyManager:         ", address(manager));
    }
}
