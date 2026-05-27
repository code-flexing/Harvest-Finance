// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./interfaces/IGnosisSafe.sol";

/**
 * @title GnosisSafeAdminRouter
 * @dev Safe-compatible administrative executor.
 *
 * Privileged roles should be granted to this router or to a timelock that this
 * router controls. The router accepts calls only from the configured Gnosis Safe
 * and checks the Safe threshold before every execution.
 */
contract GnosisSafeAdminRouter {
    error ZeroSafe();
    error ZeroTarget();
    error InvalidThreshold();
    error CallerNotSafe();
    error SafeThresholdTooLow(uint256 currentThreshold, uint256 requiredThreshold);

    IGnosisSafe public immutable safe;
    uint256 public minThreshold;

    event AdminActionExecuted(
        address indexed safe,
        address indexed target,
        bytes4 indexed selector,
        uint256 value,
        bytes32 dataHash
    );
    event MinimumThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(IGnosisSafe safe_, uint256 minThreshold_) {
        if (address(safe_) == address(0)) revert ZeroSafe();
        if (minThreshold_ < 2) revert InvalidThreshold();

        safe = safe_;
        minThreshold = minThreshold_;
        _validateSafeThreshold();
    }

    modifier onlySafe() {
        if (msg.sender != address(safe)) revert CallerNotSafe();
        _;
    }

    function executeAdminAction(address target, uint256 value, bytes calldata data)
        external
        onlySafe
        returns (bytes memory result)
    {
        if (target == address(0)) revert ZeroTarget();
        _validateSafeThreshold();

        (bool success, bytes memory response) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(response, 32), mload(response))
            }
        }

        bytes4 selector;
        if (data.length >= 4) {
            assembly {
                selector := calldataload(data.offset)
            }
        }

        emit AdminActionExecuted(msg.sender, target, selector, value, keccak256(data));
        return response;
    }

    function updateMinimumThreshold(uint256 newThreshold) external onlySafe {
        if (newThreshold < 2) revert InvalidThreshold();
        uint256 oldThreshold = minThreshold;
        minThreshold = newThreshold;
        _validateSafeThreshold();
        emit MinimumThresholdUpdated(oldThreshold, newThreshold);
    }

    function _validateSafeThreshold() internal view {
        uint256 currentThreshold = safe.getThreshold();
        if (currentThreshold < minThreshold) {
            revert SafeThresholdTooLow(currentThreshold, minThreshold);
        }
    }

    receive() external payable {}
}
