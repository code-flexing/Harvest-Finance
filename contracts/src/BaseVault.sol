// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IStrategy.sol";
import "./libraries/VaultLib.sol";

/**
 * @title BaseVault
 * @notice Modular, upgradeable ERC4626-compliant vault with pluggable strategy support.
 *
 * Security properties:
 *  - Virtual shares offset (1000:1) prevents inflation attacks on first deposit
 *  - Reentrancy guard on all state-mutating external functions
 *  - Role-based access control (ADMIN, PAUSER, UPGRADER, STRATEGY_MANAGER)
 *  - Debt ratios sum enforced ≤ MAX_BPS
 *  - Emergency pause halts deposits/withdrawals
 *  - Harvest fee taken as shares minted to treasury on gain reports
 */
contract BaseVault is
    Initializable,
    IVault,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using VaultLib for uint256;

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_BPS        = 10_000;
    uint256 public constant MAX_STRATEGIES = 20;
    /// @dev Virtual shares/assets offset to prevent inflation attacks (ERC4626 recommendation)
    uint256 private constant VIRTUAL_OFFSET = 1_000;

    bytes32 public constant ADMIN_ROLE            = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE           = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE         = keccak256("UPGRADER_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");

    // ── Errors ───────────────────────────────────────────────────────────────
    error ZeroAddress();
    error ZeroAmount();
    error Paused();
    error DepositCapExceeded();
    error ZeroSharesMinted();
    error ZeroSharesBurned();
    error ZeroAssetsRedeemed();
    error InsufficientShares();
    error InsufficientVaultAssets();
    error StrategyAlreadyAdded();
    error StrategyNotFound();
    error TooManyStrategies();
    error DebtRatioExceeded();
    error NotStrategy();
    error CannotRescueVaultAsset();
    error InvalidFee();

    // ── Strategy state ───────────────────────────────────────────────────────
    struct StrategyParams {
        uint256 debtRatio;   // allocation in BPS (0–10 000)
        uint256 totalDebt;   // assets currently deployed to strategy
        uint256 totalGain;   // cumulative gains reported
        uint256 totalLoss;   // cumulative losses reported
        bool    active;
    }

    // ── Storage ──────────────────────────────────────────────────────────────
    IERC20Upgradeable public underlyingAsset;
    uint256 private _totalAssets;
    uint256 public depositCap;
    bool    public paused;

    address[] public strategyList;
    mapping(address => StrategyParams) public strategies;
    uint256 public totalDebtRatio;

    /// @notice Fee on harvested gains, in BPS (e.g. 1000 = 10%)
    uint256 public harvestFeeBps;
    /// @notice Recipient of harvest fee shares
    address public treasury;

    // ── Events ───────────────────────────────────────────────────────────────
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    event FundsAllocated(address indexed strategy, uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed recipient, uint256 amount);
    event DebtRatioUpdated(address indexed strategy, uint256 oldRatio, uint256 newRatio);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ── Initializer ──────────────────────────────────────────────────────────

    function initialize(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _admin
    ) public initializer {
        if (_asset == address(0) || _admin == address(0)) revert ZeroAddress();

        __ERC20_init(_name, _symbol);
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        underlyingAsset = IERC20Upgradeable(_asset);
        depositCap      = type(uint256).max;
        treasury        = _admin;

        _grantRole(DEFAULT_ADMIN_ROLE,    _admin);
        _grantRole(ADMIN_ROLE,            _admin);
        _grantRole(PAUSER_ROLE,           _admin);
        _grantRole(UPGRADER_ROLE,         _admin);
        _grantRole(STRATEGY_MANAGER_ROLE, _admin);
    }

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    // ── ERC4626: deposit / mint / withdraw / redeem ───────────────────────────

    /// @inheritdoc IVault
    function deposit(uint256 assets, address receiver)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (assets == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();
        if (_totalAssets + assets > depositCap) revert DepositCapExceeded();

        shares = _convertToShares(assets);
        if (shares == 0) revert ZeroSharesMinted();

        _totalAssets += assets;
        _mint(receiver, shares);
        underlyingAsset.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /// @inheritdoc IVault
    /// @notice Mint exactly `shares` by depositing the required assets.
    function mint(uint256 shares, address receiver)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        if (shares == 0) revert ZeroSharesMinted();
        if (receiver == address(0)) revert ZeroAddress();

        assets = _convertToAssets(shares);
        if (assets == 0) revert ZeroAmount();
        if (_totalAssets + assets > depositCap) revert DepositCapExceeded();

        _totalAssets += assets;
        _mint(receiver, shares);
        underlyingAsset.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /// @inheritdoc IVault
    function withdraw(uint256 assets, address receiver, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (assets == 0) revert ZeroAmount();
        if (receiver == address(0) || owner == address(0)) revert ZeroAddress();

        shares = _convertToShares(assets);
        if (shares == 0) revert ZeroSharesBurned();
        if (balanceOf(owner) < shares) revert InsufficientShares();

        _pullFromStrategiesIfNeeded(assets);
        if (underlyingAsset.balanceOf(address(this)) < assets) revert InsufficientVaultAssets();

        if (msg.sender != owner) _spendAllowance(owner, msg.sender, shares);

        _totalAssets -= assets;
        _burn(owner, shares);
        underlyingAsset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /// @inheritdoc IVault
    function redeem(uint256 shares, address receiver, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        if (shares == 0) revert ZeroSharesBurned();
        if (receiver == address(0) || owner == address(0)) revert ZeroAddress();
        if (balanceOf(owner) < shares) revert InsufficientShares();

        assets = _convertToAssets(shares);
        if (assets == 0) revert ZeroAssetsRedeemed();

        _pullFromStrategiesIfNeeded(assets);
        if (underlyingAsset.balanceOf(address(this)) < assets) revert InsufficientVaultAssets();

        if (msg.sender != owner) _spendAllowance(owner, msg.sender, shares);

        _totalAssets -= assets;
        _burn(owner, shares);
        underlyingAsset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    // ── Strategy management ──────────────────────────────────────────────────

    /// @inheritdoc IVault
    function addStrategy(address strategy, uint256 debtRatio)
        external
        onlyRole(STRATEGY_MANAGER_ROLE)
    {
        if (strategy == address(0)) revert ZeroAddress();
        if (strategies[strategy].active) revert StrategyAlreadyAdded();
        if (strategyList.length >= MAX_STRATEGIES) revert TooManyStrategies();
        if (totalDebtRatio + debtRatio > MAX_BPS) revert DebtRatioExceeded();
        if (IStrategy(strategy).vault() != address(this)) revert NotStrategy();

        strategies[strategy] = StrategyParams({
            debtRatio:  debtRatio,
            totalDebt:  0,
            totalGain:  0,
            totalLoss:  0,
            active:     true
        });
        strategyList.push(strategy);
        totalDebtRatio += debtRatio;

        emit StrategyAdded(strategy);
    }

    /// @inheritdoc IVault
    function removeStrategy(address strategy) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (!strategies[strategy].active) revert StrategyNotFound();

        totalDebtRatio -= strategies[strategy].debtRatio;
        strategies[strategy].active    = false;
        strategies[strategy].debtRatio = 0;

        uint256 len = strategyList.length;
        for (uint256 i; i < len; ++i) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[len - 1];
                strategyList.pop();
                break;
            }
        }

        emit StrategyRemoved(strategy);
    }

    /// @inheritdoc IVault
    function updateDebtRatio(address strategy, uint256 newDebtRatio)
        external
        onlyRole(STRATEGY_MANAGER_ROLE)
    {
        if (!strategies[strategy].active) revert StrategyNotFound();
        uint256 oldRatio = strategies[strategy].debtRatio;
        uint256 newTotal = totalDebtRatio - oldRatio + newDebtRatio;
        if (newTotal > MAX_BPS) revert DebtRatioExceeded();

        totalDebtRatio = newTotal;
        strategies[strategy].debtRatio = newDebtRatio;

        emit DebtRatioUpdated(strategy, oldRatio, newDebtRatio);
    }

    /// @inheritdoc IVault
    /// @dev Called by strategies (or STRATEGY_MANAGER) to report gain/loss after harvest.
    ///      Harvest fee is minted as shares to treasury on gains.
    function reportStrategy(address strategy, uint256 gain, uint256 loss)
        external
        nonReentrant
    {
        if (msg.sender != strategy && !hasRole(STRATEGY_MANAGER_ROLE, msg.sender)) revert NotStrategy();
        if (!strategies[strategy].active) revert StrategyNotFound();

        StrategyParams storage params = strategies[strategy];

        if (gain > 0) {
            // Collect harvest fee as shares minted to treasury
            if (harvestFeeBps > 0 && treasury != address(0)) {
                uint256 feeAssets = (gain * harvestFeeBps) / MAX_BPS;
                uint256 feeShares = _convertToShares(feeAssets);
                if (feeShares > 0) {
                    _mint(treasury, feeShares);
                    emit HarvestFeeCollected(treasury, feeShares);
                }
            }
            params.totalGain += gain;
            _totalAssets     += gain;
        }
        if (loss > 0) {
            if (loss > params.totalDebt) loss = params.totalDebt;
            params.totalLoss += loss;
            _totalAssets     -= loss;
            params.totalDebt -= loss;
        }

        emit StrategyReported(strategy, gain, loss);
    }

    // ── Capital allocation ───────────────────────────────────────────────────

    /// @notice Push idle funds to strategies according to their debt ratios.
    function allocate() external nonReentrant whenNotPaused {
        uint256 len = strategyList.length;
        for (uint256 i; i < len; ++i) {
            address strategy = strategyList[i];
            StrategyParams storage params = strategies[strategy];
            if (params.debtRatio == 0) continue;

            uint256 target = (_totalAssets * params.debtRatio) / MAX_BPS;
            if (target <= params.totalDebt) continue;

            uint256 toSend    = target - params.totalDebt;
            uint256 available = underlyingAsset.balanceOf(address(this));
            if (toSend > available) toSend = available;
            if (toSend == 0) continue;

            params.totalDebt += toSend;
            underlyingAsset.safeTransfer(strategy, toSend);
            IStrategy(strategy).invest();

            emit FundsAllocated(strategy, toSend);
        }
    }

    // ── ERC4626 view functions ────────────────────────────────────────────────

    /// @inheritdoc IVault
    function totalAssets() external view returns (uint256) { return _totalAssets; }

    /// @inheritdoc IVault
    function asset() external view returns (address) { return address(underlyingAsset); }

    /// @inheritdoc IVault
    function pricePerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 10 ** decimals();
        return (_totalAssets * 10 ** decimals()) / supply;
    }

    /// @inheritdoc IVault
    function convertToShares(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets);
    }

    /// @inheritdoc IVault
    function convertToAssets(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares);
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return _convertToShares(assets);
    }

    function previewMint(uint256 shares) external view returns (uint256) {
        return _convertToAssets(shares);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        return _convertToShares(assets);
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return _convertToAssets(shares);
    }

    function maxDeposit(address) external view returns (uint256) {
        if (paused) return 0;
        uint256 remaining = depositCap > _totalAssets ? depositCap - _totalAssets : 0;
        return remaining;
    }

    function maxMint(address receiver) external view returns (uint256) {
        if (paused) return 0;
        uint256 remaining = depositCap > _totalAssets ? depositCap - _totalAssets : 0;
        return _convertToShares(remaining);
    }

    function maxWithdraw(address owner) external view returns (uint256) {
        if (paused) return 0;
        return _convertToAssets(balanceOf(owner));
    }

    function maxRedeem(address owner) external view returns (uint256) {
        if (paused) return 0;
        return balanceOf(owner);
    }

    function strategyCount() external view returns (uint256) { return strategyList.length; }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setDepositCap(uint256 cap) external onlyRole(ADMIN_ROLE) {
        emit DepositCapUpdated(depositCap, cap);
        depositCap = cap;
    }

    /// @notice Set harvest fee. Max 50% (5000 BPS).
    function setHarvestFee(uint256 feeBps, address _treasury) external onlyRole(ADMIN_ROLE) {
        if (feeBps > 5000) revert InvalidFee();
        if (_treasury == address(0)) revert ZeroAddress();
        emit HarvestFeeUpdated(harvestFeeBps, feeBps);
        harvestFeeBps = feeBps;
        treasury      = _treasury;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        paused = false;
        emit VaultUnpaused(msg.sender);
    }

    function rescueToken(address token, address recipient) external onlyRole(ADMIN_ROLE) {
        if (token == address(underlyingAsset)) revert CannotRescueVaultAsset();
        uint256 bal = IERC20Upgradeable(token).balanceOf(address(this));
        IERC20Upgradeable(token).safeTransfer(recipient, bal);
        emit EmergencyWithdraw(token, recipient, bal);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /**
     * @dev Virtual offset (VIRTUAL_OFFSET shares + VIRTUAL_OFFSET assets) prevents
     *      the classic ERC4626 inflation attack where an attacker donates assets to
     *      manipulate the share price before the first deposit.
     */
    function _convertToShares(uint256 assets) internal view returns (uint256) {
        return (assets * (totalSupply() + VIRTUAL_OFFSET)) / (_totalAssets + VIRTUAL_OFFSET);
    }

    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        return (shares * (_totalAssets + VIRTUAL_OFFSET)) / (totalSupply() + VIRTUAL_OFFSET);
    }

    function _pullFromStrategiesIfNeeded(uint256 needed) internal {
        uint256 idle = underlyingAsset.balanceOf(address(this));
        if (idle >= needed) return;

        uint256 shortfall = needed - idle;
        uint256 len = strategyList.length;
        for (uint256 i; i < len && shortfall > 0; ++i) {
            address strategy = strategyList[i];
            StrategyParams storage params = strategies[strategy];
            if (params.totalDebt == 0) continue;

            uint256 toWithdraw = shortfall > params.totalDebt ? params.totalDebt : shortfall;
            uint256 withdrawn  = IStrategy(strategy).withdraw(toWithdraw);

            params.totalDebt = withdrawn < params.totalDebt
                ? params.totalDebt - withdrawn
                : 0;

            shortfall = withdrawn >= shortfall ? 0 : shortfall - withdrawn;
        }
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
