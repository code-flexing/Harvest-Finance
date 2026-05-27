// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IVault.sol";

/**
 * @title BaseStrategy
 * @notice Abstract base for all Harvest Finance yield strategies.
 *
 * Concrete strategies must implement:
 *  - _invest()              — deploy idle `want` tokens into the protocol
 *  - _harvest()             — claim rewards, convert to `want`, return (gain, loss)
 *  - _withdrawSome(amount)  — liquidate `amount` of `want` from the protocol
 *  - _withdrawAll()         — liquidate everything (used in emergency exit)
 *  - estimatedTotalAssets() — total `want` managed (deployed + idle)
 *
 * Security:
 *  - Only the vault may call withdraw()
 *  - Only KEEPER_ROLE may call harvest()
 *  - Emergency exit liquidates all positions and blocks further investment
 */
abstract contract BaseStrategy is
    Initializable,
    IStrategy,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ── Errors ───────────────────────────────────────────────────────────────
    error NotVault();
    error EmergencyExitActive();
    error ZeroAddress();

    // ── State ────────────────────────────────────────────────────────────────
    address public override vault;
    address public override want;
    bool    public override isEmergencyExit;

    // ── Initializer ──────────────────────────────────────────────────────────

    // solhint-disable-next-line func-name-mixedcase
    function __BaseStrategy_init(address _vault, address _want, address _admin) internal onlyInitializing {
        if (_vault == address(0) || _want == address(0) || _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        vault = _vault;
        want  = _want;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(KEEPER_ROLE,        _admin);
        _grantRole(UPGRADER_ROLE,      _admin);
    }

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    modifier notEmergency() {
        if (isEmergencyExit) revert EmergencyExitActive();
        _;
    }

    // ── IStrategy implementation ─────────────────────────────────────────────

    /// @inheritdoc IStrategy
    function invest() external override onlyVault notEmergency nonReentrant {
        _invest();
    }

    /// @inheritdoc IStrategy
    function harvest() external override onlyRole(KEEPER_ROLE) nonReentrant returns (uint256 gain, uint256 loss) {
        (gain, loss) = _harvest();
        IVault(vault).reportStrategy(address(this), gain, loss);
        emit Harvested(gain, loss);
    }

    /// @inheritdoc IStrategy
    /// @dev Vault calls this to pull funds back. Returns actual amount withdrawn.
    function withdraw(uint256 amount) external override onlyVault nonReentrant returns (uint256 withdrawn) {
        uint256 idle = IERC20Upgradeable(want).balanceOf(address(this));
        if (idle >= amount) {
            withdrawn = amount;
        } else {
            uint256 needed = amount - idle;
            uint256 freed  = _withdrawSome(needed);
            withdrawn = idle + freed;
            if (withdrawn > amount) withdrawn = amount;
        }
        IERC20Upgradeable(want).safeTransfer(vault, withdrawn);
    }

    /// @inheritdoc IStrategy
    function emergencyExit() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        isEmergencyExit = true;
        _withdrawAll();
        // Return all funds to vault
        uint256 bal = IERC20Upgradeable(want).balanceOf(address(this));
        if (bal > 0) IERC20Upgradeable(want).safeTransfer(vault, bal);
        emit EmergencyExitEnabled();
    }

    // ── Abstract hooks ───────────────────────────────────────────────────────

    /// @dev Deploy idle `want` into the yield protocol.
    function _invest() internal virtual;

    /// @dev Harvest yield. Return (gain, loss) in `want` terms.
    function _harvest() internal virtual returns (uint256 gain, uint256 loss);

    /// @dev Withdraw `amount` of `want` from the protocol. Return actual freed.
    function _withdrawSome(uint256 amount) internal virtual returns (uint256 freed);

    /// @dev Liquidate all positions. Called during emergency exit.
    function _withdrawAll() internal virtual;

    // ── Upgrade auth ─────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
