// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWBTC is ERC20 {
    constructor() ERC20("Mock WBTC", "mWBTC") {
        _mint(msg.sender, 1000000 * 10**decimals()); // Mint 1M mWBTC to deployer
    }

    // Function to mint tokens for testing
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}