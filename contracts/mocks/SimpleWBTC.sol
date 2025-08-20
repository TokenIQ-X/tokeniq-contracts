// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleWBTC is ERC20 {
    constructor() ERC20("Simple WBTC", "sWBTC") {
        _mint(msg.sender, 1000000 * 10**decimals()); // Mint 1M sWBTC to deployer
    }
}
