// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsControllerMock {
    // Mock function to claim all rewards
    function claimAllRewards(
        address[] calldata assets,
        address to
    ) external returns (uint256) {
        // In a real implementation, this would calculate and transfer rewards
        // For testing, we'll return a fixed amount (1 WBTC)
        return 1e8; // 1 WBTC (8 decimals)
    }
    
    // Mock function to get the reward for an asset
    function getRewardsBalance(
        address[] calldata assets,
        address user
    ) external pure returns (uint256) {
        // Return a fixed reward balance for testing
        return 1e8; // 1 WBTC (8 decimals)
    }
}
