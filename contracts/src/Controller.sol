// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./libraries/TokenValidation.sol";

/**
 * @title Controller
 * @dev Manages vaults and strategies for Harvest Finance.
 */
contract Controller is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    address public storageContract;
    address public oracle;
    mapping(address => bool) public vaults;
    mapping(address => address) public strategies;

    event VaultAdded(address indexed vault);
    event StrategySet(address indexed vault, address indexed strategy);
    event OracleSet(address indexed oracle);
    event ControllerAdminAction(address indexed admin, bytes32 indexed action, address indexed target);
    event ControllerStrategyChanged(address indexed admin, address indexed vault, address indexed oldStrategy, address newStrategy);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address governance, address _storage) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        storageContract = _storage;
    }

    function setOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_oracle != address(0), "Controller: zero address");
        address oldOracle = oracle;
        oracle = _oracle;
        emit OracleSet(_oracle);
        emit ControllerAdminAction(msg.sender, keccak256("SET_ORACLE"), _oracle);
        if (oldOracle != address(0)) {
            emit ControllerAdminAction(msg.sender, keccak256("REPLACE_ORACLE"), oldOracle);
        }
    }

    /**
     * @notice Add a vault to be managed by this controller.
     * @param vault Address of the vault.
     */
    function addVault(address vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenValidation.validateNonZero(vault);
        TokenValidation.validateContractExists(vault);
        vaults[vault] = true;
        emit VaultAdded(vault);
        emit ControllerAdminAction(msg.sender, keccak256("ADD_VAULT"), vault);
    }

    /**
     * @notice Set the strategy for a specific vault.
     * @param vault    Address of the vault.
     * @param strategy Address of the strategy.
     */
    function setStrategy(address vault, address strategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(vaults[vault], "Controller: vault not added");
        TokenValidation.validateNonZero(strategy);
        TokenValidation.validateContractExists(strategy);
        strategies[vault] = strategy;
        emit StrategySet(vault, strategy);
        emit ControllerStrategyChanged(msg.sender, vault, oldStrategy, strategy);
    }

    /**
     * @notice Perform "hard work" (rebalancing, compounding) for a vault.
     * @param vault Address of the vault.
     */
    function doHardWork(address vault) external onlyRole(OPERATOR_ROLE) {
        require(vaults[vault], "Controller: unknown vault");
        require(strategies[vault] != address(0), "Controller: no strategy");
        require(oracle != address(0), "Controller: oracle not set");
        
        address asset = address(IVault(vault).asset());
        require(!IOracle(oracle).isStale(asset), "Controller: stale price");
        emit ControllerAdminAction(msg.sender, keccak256("DO_HARD_WORK"), vault);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
