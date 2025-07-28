// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IBTCfi
 * @notice Interface for Core's BTCfi contract
 */
interface IBTCfi {
    /**
     * @notice Deposit WBTC to mint BTCfi tokens
     * @param amount Amount of WBTC to deposit
     */
    function deposit(uint256 amount) external;
    
    /**
     * @notice Withdraw WBTC by burning BTCfi tokens
     * @param amount Amount of WBTC to withdraw
     */
    function withdraw(uint256 amount) external;
    
    /**
     * @notice Get the exchange rate between WBTC and BTCfi tokens
     * @return The current exchange rate (WBTC per BTCfi token, scaled by 1e18)
     */
    function getExchangeRate() external view returns (uint256);
    
    /**
     * @notice Get the total amount of WBTC controlled by the contract
     * @return Total WBTC balance
     */
    function totalAssets() external view returns (uint256);
    
    /**
     * @notice Get the amount of BTCfi tokens for a given WBTC amount
     * @param wbtcAmount Amount of WBTC to convert
     * @return Amount of BTCfi tokens
     */
    function convertToShares(uint256 wbtcAmount) external view returns (uint256);
    
    /**
     * @notice Get the amount of WBTC for a given amount of BTCfi tokens
     * @param shares Amount of BTCfi tokens to convert
     * @return Amount of WBTC
     */
    function convertToAssets(uint256 shares) external view returns (uint256);
    
    /**
     * @notice Get the maximum amount of WBTC that can be withdrawn
     * @return Maximum withdrawable amount
     */
    function maxWithdraw() external view returns (uint256);
    
    /**
     * @notice Get the maximum amount of BTCfi tokens that can be minted
     * @return Maximum mintable amount
     */
    function maxMint() external view returns (uint256);
    
    // Events
    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 assets, uint256 shares);
}
