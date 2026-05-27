// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./interfaces/IOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Simple oracle implementation with staleness checks.
 */
contract PriceOracle is IOracle, Ownable {
    struct PriceData {
        uint256 price;
        uint256 updatedAt;
    }

    mapping(address => PriceData) public prices;
    uint256 public staleThreshold = 1 hours;

    event PriceUpdated(address indexed asset, uint256 price, uint256 updatedAt);
    event StaleThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event OracleAdminAction(address indexed admin, bytes32 indexed action, address indexed asset, uint256 oldValue, uint256 newValue);

    function setPrice(address asset, uint256 price) external onlyOwner {
        uint256 oldPrice = prices[asset].price;
        prices[asset] = PriceData(price, block.timestamp);
        emit PriceUpdated(asset, price, block.timestamp);
        emit OracleAdminAction(msg.sender, keccak256("SET_PRICE"), asset, oldPrice, price);
    }

    function setStaleThreshold(uint256 threshold) external onlyOwner {
        emit StaleThresholdUpdated(staleThreshold, threshold);
        emit OracleAdminAction(msg.sender, keccak256("SET_STALE_THRESHOLD"), address(0), staleThreshold, threshold);
        staleThreshold = threshold;
    }

    function getPrice(address asset) external view override returns (uint256 price, uint256 updatedAt) {
        PriceData memory data = prices[asset];
        require(data.updatedAt > 0, "Oracle: price not set");
        return (data.price, data.updatedAt);
    }

    function isStale(address asset) external view override returns (bool) {
        PriceData memory data = prices[asset];
        if (data.updatedAt == 0) return true;
        return (block.timestamp - data.updatedAt) > staleThreshold;
    }
}
