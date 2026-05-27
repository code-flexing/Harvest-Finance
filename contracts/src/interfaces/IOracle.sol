// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IOracle {
    function getPrice(address asset) external view returns (uint256 price, uint256 updatedAt);
    function isStale(address asset) external view returns (bool);
}
