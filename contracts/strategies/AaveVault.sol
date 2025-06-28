// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../interfaces/ISimpleAavePool.sol";

/**
 * @title AaveVault
 * @notice Optimized strategy contract for Aave V3 integration
 */
contract AaveVault is ReentrancyGuard, Ownable, Initializable {
    using SafeERC20 for IERC20;

    // Aave pool interface
    ISimpleAavePool public immutable POOL;
    
    // Token addresses
    address public immutable UNDERLYING_TOKEN;
    address public immutable ATOKEN;
    
    // Chainlink price feed
    AggregatorV3Interface public immutable PRICE_FEED;
    
    // State variables
    uint256 public totalAssets;
    uint256 public targetAllocation = 7500; // 75% default allocation
    uint256 public lastRebalance;
    
    // Constants
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant REBALANCE_COOLDOWN = 1 days;
    uint256 public constant MIN_DEPOSIT = 1e6; // Minimum deposit amount (1 unit for 6-decimal tokens)
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Rebalanced(uint256 oldAllocation, uint256 newAllocation);
    event AllocationChanged(uint256 newAllocation);
    event EmergencyWithdrawn(uint256 amount);
    
    /**
     * @dev Initializes the vault (called by the factory)
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    function initialize(address _treasuryAIManager) public initializer {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager");
        _transferOwnership(msg.sender);
    }
    
    constructor(
        address _underlyingToken,
        address _aToken,
        address _aavePool,
        address _priceFeed
    ) Ownable() {
        require(_underlyingToken != address(0), "Invalid token");
        require(_aToken != address(0), "Invalid aToken");
        require(_aavePool != address(0), "Invalid pool");
        require(_priceFeed != address(0), "Invalid price feed");

        UNDERLYING_TOKEN = _underlyingToken;
        ATOKEN = _aToken;
        POOL = ISimpleAavePool(_aavePool);
        PRICE_FEED = AggregatorV3Interface(_priceFeed);

        // Approve Aave pool to spend tokens
        IERC20(_underlyingToken).safeApprove(_aavePool, type(uint256).max);
    }
    
    /**
     * @notice Deposit tokens into the strategy
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external onlyOwner nonReentrant {
        require(amount >= MIN_DEPOSIT, "Amount too small");
        
        // Transfer tokens from sender
        IERC20(UNDERLYING_TOKEN).safeTransferFrom(msg.sender, address(this), amount);
        
        // Get current aToken balance before supply
        uint256 aTokenBalanceBefore = IERC20(ATOKEN).balanceOf(address(this));
        
        // Supply to Aave
        POOL.supply(UNDERLYING_TOKEN, amount, address(this), 0);
        
        // Calculate actual aTokens received (should be 1:1 in mock)
        uint256 aTokensReceived = IERC20(ATOKEN).balanceOf(address(this)) - aTokenBalanceBefore;
        require(aTokensReceived > 0, "No aTokens received");
        
        totalAssets += amount;
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw tokens from the strategy
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(amount <= getTotalValue(), "Insufficient balance");
        
        // Get current balances and total value
        uint256 tokenBalanceBefore = IERC20(UNDERLYING_TOKEN).balanceOf(address(this));
        uint256 aTokenBalanceBefore = IERC20(ATOKEN).balanceOf(address(this));
        
        // Withdraw from Aave
        POOL.withdraw(UNDERLYING_TOKEN, amount, address(this));
        
        // Calculate actual tokens received
        uint256 tokensReceived = IERC20(UNDERLYING_TOKEN).balanceOf(address(this)) - tokenBalanceBefore;
        require(tokensReceived > 0, "No tokens received");
        
        // Calculate aTokens burned
        uint256 aTokensBurned = aTokenBalanceBefore - IERC20(ATOKEN).balanceOf(address(this));
        
        // Update total assets to reflect the withdrawal
        totalAssets -= amount;
        
        // Transfer tokens to owner
        IERC20(UNDERLYING_TOKEN).safeTransfer(msg.sender, tokensReceived);
        
        emit Withdrawn(msg.sender, tokensReceived);
    }
    
    /**
     * @notice Rebalance the strategy
     */
    function rebalance() external onlyOwner nonReentrant {
        require(block.timestamp >= lastRebalance + REBALANCE_COOLDOWN, "Cooldown active");
        
        uint256 currentAllocation = getCurrentAllocation();
        uint256 totalValue = getTotalValue();
        
        if (currentAllocation != targetAllocation) {
            if (currentAllocation > targetAllocation) {
                // Withdraw excess
                uint256 excessAmount = (currentAllocation - targetAllocation) * totalValue / MAX_BPS;
                POOL.withdraw(UNDERLYING_TOKEN, excessAmount, address(this));
            } else {
                // Deposit more
                uint256 depositAmount = (targetAllocation - currentAllocation) * totalValue / MAX_BPS;
                IERC20(UNDERLYING_TOKEN).safeTransferFrom(msg.sender, address(this), depositAmount);
                POOL.supply(UNDERLYING_TOKEN, depositAmount, address(this), 0);
            }
        }
        
        lastRebalance = block.timestamp;
        totalAssets = getTotalValue(); // Update total assets
        emit Rebalanced(currentAllocation, targetAllocation);
    }
    
    /**
     * @notice Set target allocation (10000 = 100%)
     * @param _targetAllocation New target allocation in basis points
     */
    function setTargetAllocation(uint256 _targetAllocation) external onlyOwner {
        require(_targetAllocation <= MAX_BPS, "Invalid allocation");
        uint256 oldAllocation = targetAllocation;
        targetAllocation = _targetAllocation;
        emit AllocationChanged(_targetAllocation);
        
        // Auto-rebalance if difference > 10%
        if (_absDiff(oldAllocation, _targetAllocation) > 1000) {
            this.rebalance();
        }
    }
    
    /**
     * @notice Get total value of assets (on-chain + in Aave)
     * @return Total value in underlying tokens
     */
    function getTotalValue() public view returns (uint256) {
        // The total value is the sum of:
        // 1. Underlying tokens held by the vault
        // 2. The value of aTokens held by the vault (1 aToken = 1 underlying token)
        return IERC20(UNDERLYING_TOKEN).balanceOf(address(this)) + 
               IERC20(ATOKEN).balanceOf(address(this));
    }
    
    /**
     * @notice Get current allocation percentage (10000 = 100%)
     * @return Current allocation in basis points
     */
    function getCurrentAllocation() public view returns (uint256) {
        uint256 totalValue = getTotalValue();
        if (totalValue == 0) return 0;
        
        uint256 aTokenBalance = IERC20(ATOKEN).balanceOf(address(this));
        return (aTokenBalance * MAX_BPS) / totalValue;
    }
    
    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        // Get initial balances
        uint256 aTokenBalance = IERC20(ATOKEN).balanceOf(address(this));
        uint256 initialBalance = IERC20(UNDERLYING_TOKEN).balanceOf(address(this));
        
        // Withdraw from Aave
        if (aTokenBalance > 0) {
            POOL.withdraw(UNDERLYING_TOKEN, type(uint256).max, owner());
        }
        
        // Transfer any remaining tokens
        uint256 remainingBalance = IERC20(UNDERLYING_TOKEN).balanceOf(address(this));
        if (remainingBalance > 0) {
            IERC20(UNDERLYING_TOKEN).safeTransfer(owner(), remainingBalance);
        }
        
        // Calculate total withdrawn amount
        uint256 totalWithdrawn = remainingBalance - initialBalance + aTokenBalance;
        
        totalAssets = 0;
        emit EmergencyWithdrawn(totalWithdrawn);
    }
    
    /**
     * @notice Get current price from Chainlink
     * @return price Current price with 8 decimals
     * @return lastUpdated Timestamp of last update
     */
    function getCurrentPrice() public view returns (uint256 price, uint256 lastUpdated) {
        (, int256 answer,, uint256 updatedAt,) = PRICE_FEED.latestRoundData();
        require(answer > 0, "Invalid price");
        return (uint256(answer), updatedAt);
    }

    /**
     * @dev Calculate absolute difference
     */
    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}