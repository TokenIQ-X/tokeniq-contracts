// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IStakingStrategy
 * @notice Interface for staking strategies used by LSTBTCVault
 */
interface IStakingStrategy {
    /**
     * @notice Stake WBTC in the strategy
     * @param amount Amount of WBTC to stake
     */
    function stake(uint256 amount) external;
    
    /**
     * @notice Unstake WBTC from the strategy
     * @param amount Amount of WBTC to unstake
     * @param receiver Address to receive the unstaked WBTC
     */
    function unstake(uint256 amount, address receiver) external;
    
    /**
     * @notice Emergency withdraw all funds from the strategy
     * @dev Only callable by the vault
     */
    function emergencyWithdraw() external;
    
    /**
     * @notice Get the total value of assets managed by the strategy
     * @return Total assets in WBTC terms
     */
    function totalAssets() external view returns (uint256);
    
    /**
     * @notice Get the APY of the strategy
     * @return APY in basis points (1 = 0.01%)
     */
    function getAPY() external view returns (uint256);
    
    /**
     * @notice Harvest rewards and reinvest them
     * @return Amount of rewards harvested in WBTC terms
     */
    function harvest() external returns (uint256);
}
