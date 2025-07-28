// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../interfaces/ITreasuryAIManager.sol";
import "../interfaces/IBTCfi.sol";

/**
 * @title BTCfiVault
 * @notice Strategy contract for Core's BTCfi integration
 */
contract BTCfiVault is ReentrancyGuard, Ownable, Initializable {
    using SafeERC20 for IERC20;

    // Core BTCfi contract interface
    IBTCfi public immutable btcfiCore;
    
    // Token addresses
    address public immutable WBTC;  // Wrapped BTC
    address public immutable BTCFI; // Core BTCfi token
    
    // Chainlink price feed for BTC/USD
    AggregatorV3Interface public immutable PRICE_FEED;
    
    // Treasury AI Manager
    ITreasuryAIManager public treasuryAIManager;
    
    // State variables
    uint256 public totalAssets;
    uint256 public targetAllocation = 5000; // 50% default allocation
    uint256 public lastRebalance;
    
    // Constants
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant REBALANCE_COOLDOWN = 1 days;
    uint256 public constant MIN_DEPOSIT = 0.001 ether; // 0.001 WBTC minimum
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Rebalanced(uint256 oldAllocation, uint256 newAllocation);
    event AllocationChanged(uint256 newAllocation);
    
    /**
     * @dev Constructor
     * @param _wbtc Wrapped BTC token address
     * @param _btcfi Core BTCfi token address
     * @param _btcfiCore Core BTCfi contract address
     * @param _priceFeed Chainlink price feed for BTC/USD
     */
    constructor(
        address _wbtc,
        address _btcfi,
        address _btcfiCore,
        address _priceFeed
    ) {
        require(_wbtc != address(0), "Invalid WBTC address");
        require(_btcfi != address(0), "Invalid BTCfi token address");
        require(_btcfiCore != address(0), "Invalid BTCfi core address");
        require(_priceFeed != address(0), "Invalid price feed");
        
        WBTC = _wbtc;
        BTCFI = _btcfi;
        btcfiCore = IBTCfi(_btcfiCore);
        PRICE_FEED = AggregatorV3Interface(_priceFeed);
        
        // Approve BTCfi contract to spend WBTC
        IERC20(WBTC).safeApprove(_btcfiCore, type(uint256).max);
    }
    
    /**
     * @dev Initializes the vault (called by the factory)
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    function initialize(address _treasuryAIManager) public initializer {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager");
        treasuryAIManager = ITreasuryAIManager(_treasuryAIManager);
        _transferOwnership(msg.sender);
    }
    
    /**
     * @notice Deposit WBTC into the BTCfi strategy
     * @param amount Amount of WBTC to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount >= MIN_DEPOSIT, "Amount below minimum");
        
        // Transfer WBTC from sender
        IERC20(WBTC).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update state before external call (checks-effects-interactions pattern)
        uint256 shares = btcfiCore.convertToShares(amount);
        totalAssets += amount;
        
        // Interact with BTCfi contract
        btcfiCore.deposit(amount);
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw WBTC from the BTCfi strategy
     * @param amount Amount of WBTC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= totalAssets, "Insufficient balance");
        
        // Update state before external call (checks-effects-interactions pattern)
        totalAssets -= amount;
        
        // Interact with BTCfi contract
        btcfiCore.withdraw(amount);
        
        // Transfer WBTC to owner
        IERC20(WBTC).safeTransfer(owner(), amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Rebalance the strategy allocation
     */
    function rebalance() external onlyOwner nonReentrant {
        require(block.timestamp >= lastRebalance + REBALANCE_COOLDOWN, "Cooldown active");
        
        uint256 currentAllocation = getCurrentAllocation();
        
        if (currentAllocation != targetAllocation) {
            // TODO: Implement rebalancing logic based on Core's BTCfi interface
            // This is a placeholder - actual implementation will depend on Core's BTCfi interface
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
     * @notice Get total value of assets in the strategy
     * @return Total value in WBTC
     */
    function getTotalValue() public view returns (uint256) {
        // TODO: Implement actual value calculation based on Core's BTCfi interface
        // This is a placeholder - actual implementation will depend on Core's BTCfi interface
        return totalAssets;
    }
    
    /**
     * @notice Get current allocation percentage (10000 = 100%)
     * @return Current allocation in basis points
     */
    function getCurrentAllocation() public view returns (uint256) {
        // TODO: Implement actual allocation calculation based on Core's BTCfi interface
        // This is a placeholder - actual implementation will depend on Core's BTCfi interface
        return targetAllocation;
    }
    
    /**
     * @notice Get target allocation percentage (10000 = 100%)
     * @return Target allocation in basis points
     */
    function getTargetAllocation() external view returns (uint256) {
        return targetAllocation;
    }
    
    /**
     * @dev Internal helper to calculate absolute difference
     */
    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
    
    /**
     * @notice Emergency withdraw all funds (only owner)
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = IERC20(WBTC).balanceOf(address(this));
        
        // Update state before external call
        uint256 assetsToWithdraw = totalAssets;
        totalAssets = 0;
        
        // Withdraw from BTCfi if there are assets there
        if (assetsToWithdraw > 0) {
            btcfiCore.withdraw(btcfiCore.maxWithdraw());
        }
        
        // Transfer all WBTC to owner
        uint256 finalBalance = IERC20(WBTC).balanceOf(address(this));
        IERC20(WBTC).safeTransfer(owner(), finalBalance);
        
        emit Withdrawn(owner(), finalBalance);
    }
}
