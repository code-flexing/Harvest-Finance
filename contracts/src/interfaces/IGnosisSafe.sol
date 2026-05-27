// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IGnosisSafe {
    function getThreshold() external view returns (uint256);
    function isOwner(address owner) external view returns (bool);
}
