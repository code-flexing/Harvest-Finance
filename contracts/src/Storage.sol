// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./libraries/TokenValidation.sol";

/**
 * @title Storage
 * @dev Central storage for Harvest Finance, managing global roles and contract addresses.
 */
contract Storage is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    mapping(bytes32 => address) private _addresses;

    event StorageAddressSet(address indexed admin, bytes32 indexed key, address indexed value, address previousValue);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address governance) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
    }

    /**
     * @notice Set a contract address for a given key.
     * @param key   The key for the contract (e.g. keccak256("Controller")).
     * @param value The address of the contract.
     */
    function setAddress(bytes32 key, address value) external onlyRole(GOVERNANCE_ROLE) {
        TokenValidation.validateNonZero(value);
        TokenValidation.validateContractExists(value);
        _addresses[key] = value;
        emit StorageAddressSet(msg.sender, key, value, previousValue);
    }

    /**
     * @notice Get the address for a given key.
     * @param key The key to look up.
     */
    function getAddress(bytes32 key) external view returns (address) {
        return _addresses[key];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
