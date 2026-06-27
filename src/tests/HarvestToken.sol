// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title HarvestToken
 * @dev ERC20 token with governance voting capabilities (ERC20Votes).
 * Users must delegate their votes to themselves or others to participate in the DAO.
 */
contract HarvestToken is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("Harvest DAO Token", "HARV") ERC20Permit("Harvest DAO Token") {
        _mint(msg.sender, 10_000_000 * 10 ** decimals());
    }

    // --- Overrides required by Solidity for multiple inheritance ---

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}