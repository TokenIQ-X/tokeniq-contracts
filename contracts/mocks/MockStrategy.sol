// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../vaults/IStakingStrategy.sol";

contract MockStakingStrategy is IStakingStrategy {
    IERC20 public token;
    address public vault;
    uint256 public totalStaked;
    uint256 public constant APY_BPS = 500; // 5% APY for testing

    constructor(address _token) {
        token = IERC20(_token);
    }

    function setVault(address _vault) external {
        require(vault == address(0), "Vault already set");
        vault = _vault;
    }

    function stake(uint256 amount) external override {
        require(msg.sender == vault, "Only vault can call");
        token.transferFrom(vault, address(this), amount);
        totalStaked += amount;
    }

    function unstake(uint256 amount, address receiver) external override {
        require(msg.sender == vault, "Only vault can call");
        totalStaked -= amount;
        token.transfer(receiver, amount);
    }

    function getAPY() external pure override returns (uint256) {
        return APY_BPS; // 5% in basis points
    }

    // Function to simulate yield (for testing only)
    function simulateYield(uint256 amount) external {
        token.transfer(vault, amount);
    }
}