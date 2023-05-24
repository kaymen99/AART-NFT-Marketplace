// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(uint256 _decimals) ERC20("mockERC20", "ERC20") {
        _mint(msg.sender, 1e6 * 10 ** _decimals);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(address(this), amount);
    }
}
