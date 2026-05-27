// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IOracle.sol";
import "./libraries/VaultLib.sol";
import "./libraries/TokenValidation.sol";

/**
 * @title Vault
 * @dev ERC4626-like vault implementing IVault. Upgradeable via UUPS.
 * Includes withdrawal rate limiting per block.
 */
contract Vault is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using VaultLib for uint256;

    // Custom Errors
    error ZeroAssets();
    error ZeroReceiver();
    error ZeroOwner();
    error DepositCapExceeded();
    error ZeroSharesMinted();
    error ZeroSharesBurned();
    error ZeroAssetsRedeemed();
    error InsufficientShares();
    error InsufficientVaultAssets();
    error BlockWithdrawalLimitExceeded();
    error ZeroToken();
    error ZeroRecipient();
    error CannotRescueVaultAsset();
    error NothingToRescue();
    error Paused();
    error InvalidSlippage();
    error SlippageExceeded();
    error PriceOracleNotConfigured();
    error StaleOraclePrice();
    error PriceDeviationExceeded(uint256 oraclePrice, uint256 expectedPrice, uint256 maxSlippageBps);
    error MaxGasPriceExceeded(uint256 gasPrice, uint256 maxGasPrice);

    // Events (previously inherited from IVault)
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    // Roles
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // State
    IERC20Upgradeable public asset;
    uint256 private _totalAssets;
    uint256 public depositCap;
    bool public paused;
    IOracle public priceOracle;
    uint256 public maxGasPrice;

    // Rate Limiting
    uint256 public maxWithdrawalPerBlock;
    uint256 public lastWithdrawalBlock;
    uint256 public cumulativeWithdrawalsInBlock;

    // Events
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);
    event WithdrawalLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event VaultPaused(address indexed pauser);
    event VaultUnpaused(address indexed pauser);
    event EmergencyWithdraw(address indexed admin, address indexed token, address indexed recipient, uint256 amount);
    event VaultAdminAction(address indexed admin, bytes32 indexed action, uint256 oldValue, uint256 newValue);
    event VaultEmergencyAction(address indexed admin, bytes32 indexed action, address indexed target, uint256 amount);
    event PriceOracleUpdated(address indexed admin, address indexed oldOracle, address indexed newOracle);
    event MaxGasPriceUpdated(address indexed admin, uint256 oldMaxGasPrice, uint256 newMaxGasPrice);
    event MEVProtectionChecked(
        address indexed caller,
        address indexed asset,
        uint256 oraclePrice,
        uint256 expectedPrice,
        uint256 maxSlippageBps
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param _asset   The underlying ERC20 token.
     * @param _name    Vault share token name.
     * @param _symbol  Vault share token symbol.
     * @param admin    Address that receives roles.
     */
    function initialize(
        IERC20Upgradeable _asset,
        string memory _name,
        string memory _symbol,
        address admin
    ) public initializer {
        TokenValidation.validateNonZero(address(_asset));
        TokenValidation.validateNonZero(admin);
        TokenValidation.validateContractExists(address(_asset));

        __ERC20_init(_name, _symbol);
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        asset = _asset;
        depositCap = type(uint256).max;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(PAUSER_ROLE,        admin);
        _grantRole(UPGRADER_ROLE,      admin);
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    /**
     * @notice Deposit assets and receive shares.
     */
    function deposit(uint256 assets, address receiver)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        shares = _deposit(assets, receiver);
    }

    function depositWithSlippage(
        uint256 assets,
        address receiver,
        uint256 minShares,
        uint256 expectedAssetPrice,
        uint256 maxSlippageBps
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        _enforceMEVProtection(expectedAssetPrice, maxSlippageBps);
        shares = _deposit(assets, receiver);
        if (shares < minShares) revert SlippageExceeded();
    }

    function _deposit(uint256 assets, address receiver) internal returns (uint256 shares) {
        if (assets == 0) revert ZeroAssets();
        if (receiver == address(0)) revert ZeroReceiver();
        
        uint256 currentTotalAssets = _totalAssets;
        if (currentTotalAssets + assets > depositCap) revert DepositCapExceeded();

        shares = VaultLib.toShares(assets, totalSupply(), currentTotalAssets);
        if (shares == 0) revert ZeroSharesMinted();

        unchecked {
            _totalAssets = currentTotalAssets + assets;
        }
        _mint(receiver, shares);

        asset.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @notice Withdraw assets by burning shares. Subject to per-block rate limit.
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    )
        external
        nonReentrant
        returns (uint256 shares)
    {
        shares = _withdraw(assets, receiver, owner);
    }

    function withdrawWithSlippage(
        uint256 assets,
        address receiver,
        address owner,
        uint256 maxShares,
        uint256 expectedAssetPrice,
        uint256 maxSlippageBps
    )
        external
        nonReentrant
        returns (uint256 shares)
    {
        _enforceMEVProtection(expectedAssetPrice, maxSlippageBps);
        shares = _withdraw(assets, receiver, owner);
        if (shares > maxShares) revert SlippageExceeded();
    }

    function _withdraw(uint256 assets, address receiver, address owner) internal returns (uint256 shares) {
        if (assets == 0) revert ZeroAssets();
        if (receiver == address(0)) revert ZeroReceiver();
        if (owner == address(0)) revert ZeroOwner();

        _checkWithdrawalLimit(assets);

        uint256 currentTotalAssets = _totalAssets;
        shares = VaultLib.toShares(assets, totalSupply(), currentTotalAssets);
        if (shares == 0) revert ZeroSharesBurned();

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        if (balanceOf(owner) < shares) revert InsufficientShares();
        if (currentTotalAssets < assets) revert InsufficientVaultAssets();

        unchecked {
            _totalAssets = currentTotalAssets - assets;
        }
        _burn(owner, shares);

        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Redeem shares for assets. Subject to per-block rate limit.
     */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    )
        external
        nonReentrant
        returns (uint256 assets)
    {
        assets = _redeem(shares, receiver, owner);
    }

    function redeemWithSlippage(
        uint256 shares,
        address receiver,
        address owner,
        uint256 minAssets,
        uint256 expectedAssetPrice,
        uint256 maxSlippageBps
    )
        external
        nonReentrant
        returns (uint256 assets)
    {
        _enforceMEVProtection(expectedAssetPrice, maxSlippageBps);
        assets = _redeem(shares, receiver, owner);
        if (assets < minAssets) revert SlippageExceeded();
    }

    function _redeem(uint256 shares, address receiver, address owner) internal returns (uint256 assets) {
        if (shares == 0) revert ZeroSharesBurned();
        if (receiver == address(0)) revert ZeroReceiver();
        if (owner == address(0)) revert ZeroOwner();

        uint256 currentTotalAssets = _totalAssets;
        assets = VaultLib.toAssets(shares, totalSupply(), currentTotalAssets);
        if (assets == 0) revert ZeroAssetsRedeemed();

        _checkWithdrawalLimit(assets);

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        if (balanceOf(owner) < shares) revert InsufficientShares();
        if (currentTotalAssets < assets) revert InsufficientVaultAssets();

        unchecked {
            _totalAssets = currentTotalAssets - assets;
        }
        _burn(owner, shares);

        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function _enforceMEVProtection(uint256 expectedAssetPrice, uint256 maxSlippageBps) internal {
        if (maxSlippageBps > 10_000) revert InvalidSlippage();
        if (address(priceOracle) == address(0)) revert PriceOracleNotConfigured();
        if (maxGasPrice != 0 && tx.gasprice > maxGasPrice) {
            revert MaxGasPriceExceeded(tx.gasprice, maxGasPrice);
        }
        if (priceOracle.isStale(address(asset))) revert StaleOraclePrice();

        (uint256 oraclePrice,) = priceOracle.getPrice(address(asset));
        uint256 deviation = oraclePrice > expectedAssetPrice
            ? oraclePrice - expectedAssetPrice
            : expectedAssetPrice - oraclePrice;

        if (expectedAssetPrice == 0 || (deviation * 10_000) / expectedAssetPrice > maxSlippageBps) {
            revert PriceDeviationExceeded(oraclePrice, expectedAssetPrice, maxSlippageBps);
        }

        emit MEVProtectionChecked(msg.sender, address(asset), oraclePrice, expectedAssetPrice, maxSlippageBps);
    }

    /**
     * @dev Internal helper to enforce per-block withdrawal limits.
     */
    function _checkWithdrawalLimit(uint256 amount) internal {
        uint256 limit = maxWithdrawalPerBlock;
        if (limit == 0) return; // Limit disabled

        if (block.number > lastWithdrawalBlock) {
            lastWithdrawalBlock = block.number;
            cumulativeWithdrawalsInBlock = amount;
        } else {
            uint256 newCumulative = cumulativeWithdrawalsInBlock + amount;
            if (newCumulative > limit) revert BlockWithdrawalLimitExceeded();
            cumulativeWithdrawalsInBlock = newCumulative;
        }
    }

    // --- Admin Functions ---

    function setWithdrawalLimit(uint256 limit) external onlyRole(ADMIN_ROLE) {
        emit WithdrawalLimitUpdated(maxWithdrawalPerBlock, limit);
        emit VaultAdminAction(msg.sender, keccak256("SET_WITHDRAWAL_LIMIT"), maxWithdrawalPerBlock, limit);
        maxWithdrawalPerBlock = limit;
    }

    function setPriceOracle(IOracle oracle_) external onlyRole(ADMIN_ROLE) {
        emit PriceOracleUpdated(msg.sender, address(priceOracle), address(oracle_));
        priceOracle = oracle_;
    }

    function setMaxGasPrice(uint256 newMaxGasPrice) external onlyRole(ADMIN_ROLE) {
        emit MaxGasPriceUpdated(msg.sender, maxGasPrice, newMaxGasPrice);
        emit VaultAdminAction(msg.sender, keccak256("SET_MAX_GAS_PRICE"), maxGasPrice, newMaxGasPrice);
        maxGasPrice = newMaxGasPrice;
    }

    function setDepositCap(uint256 cap) external onlyRole(ADMIN_ROLE) {
        emit DepositCapUpdated(depositCap, cap);
        emit VaultAdminAction(msg.sender, keccak256("SET_DEPOSIT_CAP"), depositCap, cap);
        depositCap = cap;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit VaultPaused(msg.sender);
        emit VaultEmergencyAction(msg.sender, keccak256("PAUSE"), address(this), 0);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        paused = false;
        emit VaultUnpaused(msg.sender);
        emit VaultEmergencyAction(msg.sender, keccak256("UNPAUSE"), address(this), 0);
    }

    function emergencyWithdraw(address token, address recipient) external onlyRole(ADMIN_ROLE) {
        TokenValidation.validateNonZero(token);
        TokenValidation.validateNonZero(recipient);
        require(token != address(asset), "Vault: cannot rescue vault asset");

        uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
        if (balance == 0) revert NothingToRescue();

        IERC20Upgradeable(token).safeTransfer(recipient, balance);
        emit EmergencyWithdraw(msg.sender, token, recipient, balance);
        emit VaultEmergencyAction(msg.sender, keccak256("EMERGENCY_WITHDRAW"), token, balance);
    }

    // --- View Functions ---

    function convertToShares(uint256 assets) public view returns (uint256) {
        return VaultLib.toShares(assets, totalSupply(), _totalAssets);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return VaultLib.toAssets(shares, totalSupply(), _totalAssets);
    }

    function totalAssets() external view returns (uint256) {
        return _totalAssets;
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return convertToShares(assets);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        return convertToShares(assets);
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return convertToAssets(shares);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
