// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../vaults/IStakingStrategy.sol";

contract MockStakingStrategy is IStakingStrategy {
    IERC20 public token;
    address public vault;
    uint256 public totalStaked;
    uint256 public constant APY_BPS = 500; // 5% APY for testing
    uint256 public lastHarvestTimestamp;
    uint256 public totalHarvested;

    constructor(address _token) {
        token = IERC20(_token);
        lastHarvestTimestamp = block.timestamp;
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

    function totalAssets() external view override returns (uint256) {
        return totalStaked;
    }

    function emergencyWithdraw() external override {
        require(msg.sender == vault, "Only vault can call");
        uint256 amount = totalStaked;
        totalStaked = 0;
        token.transfer(vault, amount);
    }

    function harvest() external override returns (uint256) {
        // Simple yield calculation: 5% APY
        uint256 timeElapsed = block.timestamp - lastHarvestTimestamp;
        uint256 yield = (totalStaked * APY_BPS * timeElapsed) / (10000 * 365 days);
        
        if (yield > 0) {
            // In a real scenario, this would come from staking rewards
            // For the mock, we just mint new tokens
            MockWBTC(address(token)).mint(address(this), yield);
            totalHarvested += yield;
        }
        
        lastHarvestTimestamp = block.timestamp;
        return yield;
    }

    // Function to simulate yield (for testing only)
    function simulateYield(uint256 amount) external {
        MockWBTC(address(token)).mint(address(this), amount);
        totalHarvested += amount;
    }
}

interface MockWBTC {
    function mint(address to, uint256 amount) external;
}