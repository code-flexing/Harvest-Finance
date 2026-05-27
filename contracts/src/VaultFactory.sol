// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./BaseVault.sol";

/**
 * @title VaultFactory
 * @notice Deploys new BaseVault instances as ERC1967 (UUPS) proxies.
 *         Maintains a registry of all deployed vaults.
 *
 * Only FACTORY_ADMIN_ROLE can deploy vaults.
 * The factory itself does NOT hold funds; it only creates proxies.
 */
contract VaultFactory is AccessControl {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");

    // ── Errors ───────────────────────────────────────────────────────────────
    error ZeroAddress();
    error VaultAlreadyExists();

    // ── State ────────────────────────────────────────────────────────────────
    address public immutable vaultImplementation;

    address[] public allVaults;
    /// @notice asset → vault address (one vault per asset enforced)
    mapping(address => address) public vaultByAsset;

    // ── Events ───────────────────────────────────────────────────────────────
    event VaultDeployed(address indexed vault, address indexed asset, address indexed admin);

    constructor(address _vaultImpl, address _admin) {
        if (_vaultImpl == address(0) || _admin == address(0)) revert ZeroAddress();
        vaultImplementation = _vaultImpl;
        _grantRole(DEFAULT_ADMIN_ROLE,  _admin);
        _grantRole(FACTORY_ADMIN_ROLE,  _admin);
    }

    /**
     * @notice Deploy a new BaseVault proxy for `asset`.
     * @param asset   Underlying ERC20 token address.
     * @param name    Share token name.
     * @param symbol  Share token symbol.
     * @param admin   Address that receives all roles on the new vault.
     * @return vault  Address of the deployed proxy.
     */
    function deployVault(
        address asset,
        string calldata name,
        string calldata symbol,
        address admin
    ) external onlyRole(FACTORY_ADMIN_ROLE) returns (address vault) {
        if (asset == address(0) || admin == address(0)) revert ZeroAddress();
        if (vaultByAsset[asset] != address(0)) revert VaultAlreadyExists();

        bytes memory initData = abi.encodeCall(
            BaseVault.initialize,
            (asset, name, symbol, admin)
        );

        vault = address(new ERC1967Proxy(vaultImplementation, initData));

        allVaults.push(vault);
        vaultByAsset[asset] = vault;

        emit VaultDeployed(vault, asset, admin);
    }

    /// @notice Total number of vaults deployed by this factory.
    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}
