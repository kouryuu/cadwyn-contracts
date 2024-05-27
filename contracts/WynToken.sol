// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract WynToken is ERC20, ERC20Pausable, Ownable {
    constructor(address initialOwner, uint8 initialWyns)
        ERC20("Wyn Token", "WYN")
        Ownable(initialOwner)
        //ERC20Permit("Wyn")
    {
        _mint(msg.sender, initialWyns * 10 ** decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 6; //The same as USDC
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}