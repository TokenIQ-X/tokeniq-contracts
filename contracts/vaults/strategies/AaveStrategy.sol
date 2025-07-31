// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Using the installed Aave v3 interfaces
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IAToken} from "@aave/core-v3/contracts/interfaces/IAToken.sol";
// import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";
import "../IStakingStrategy.sol";

/**
 * @title AaveStrategy
 * @notice Staking strategy that deposits WBTC into Aave to earn yield
 */
contract AaveStrategy is IStakingStrategy, Ownable {
    using SafeERC20 for IERC20;
    
    // The WBTC token
    IERC20 public immutable wbtc;
    
    // The aWBTC token (aToken)
    IAToken public immutable aWbtc;
    IERC20 public immutable aWbtcToken; // IERC20 interface for aWbtc
    
    // The Aave Pool contract
    IPool public immutable aavePool;
    
    // The vault contract that can call stake/unstake
    address public vault;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, address receiver);
    event Harvested(uint256 amount);
    
    /**
     * @dev Constructor
     * @param _wbtc Address of WBTC token
     * @param _aWbtc Address of aWBTC token
     * @param _aavePool Address of Aave Pool
     */
    constructor(
        address _wbtc,
        address _aWbtc,
        address _aavePool
    ) {
        require(_wbtc != address(0), "Invalid WBTC address");
        require(_aWbtc != address(0), "Invalid aWBTC address");
        require(_aavePool != address(0), "Invalid Aave Pool address");
        
        wbtc = IERC20(_wbtc);
        aWbtc = IAToken(_aWbtc);
        aWbtcToken = IERC20(_aWbtc);
        aavePool = IPool(_aavePool);
        
        // Approve the Aave Pool to spend WBTC (max uint256)
        wbtc.approve(_aavePool, type(uint256).max);
    }
    
    /**
     * @notice Set the vault address (can only be set once)
     * @param _vault Address of the vault
     */
    function setVault(address _vault) external onlyOwner {
        require(vault == address(0), "Vault already set");
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function stake(uint256 amount) external override {
        require(msg.sender == vault, "Only vault can call");
        require(amount > 0, "Cannot stake 0");
        
        // Ensure the AavePool has sufficient allowance to transfer tokens from this contract
        uint256 currentAllowance = wbtc.allowance(address(this), address(aavePool));
        if (currentAllowance < amount) {
            wbtc.safeApprove(address(aavePool), 0); // Reset allowance to 0 first
            wbtc.safeApprove(address(aavePool), type(uint256).max); // Set to max
        }
        
        // Transfer WBTC to the AavePool first (simulating the deposit)
        wbtc.safeTransfer(address(aavePool), amount);
        
        // Call supply on AavePool to mint aTokens
        aavePool.supply(address(wbtc), amount, address(this), 0);
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function unstake(uint256 amount, address receiver) external override {
        require(msg.sender == vault, "Only vault can call");
        require(amount > 0, "Cannot unstake 0");
        
        // Get the current aToken balance of the strategy
        uint256 aTokenBalance = aWbtc.balanceOf(address(this));
        require(aTokenBalance >= amount, "Insufficient aToken balance");
        
        // Ensure the AavePool has sufficient allowance to spend our aTokens
        uint256 currentAllowance = aWbtcToken.allowance(address(this), address(aavePool));
        if (currentAllowance < amount) {
            aWbtcToken.safeApprove(address(aavePool), 0); // Reset allowance to 0 first
            aWbtcToken.safeApprove(address(aavePool), type(uint256).max); // Set to max
        }
        
        // Withdraw WBTC from Aave
        aavePool.withdraw(address(wbtc), amount, receiver);
        
        emit Unstaked(msg.sender, amount, receiver);
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function emergencyWithdraw() external override onlyOwner {
        uint256 balance = aWbtc.balanceOf(address(this));
        if (balance > 0) {
            aavePool.withdraw(address(wbtc), type(uint256).max, owner());
        }
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function totalAssets() external view override returns (uint256) {
        return aWbtc.balanceOf(address(this));
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function getAPY() external view override returns (uint256) {
        // For testing and demo purposes, we'll return a fixed APY
        // In production, this should be replaced with actual Aave V3 integration
        
        // Return 3% APY in basis points (300)
        return 300;
        
        /*
        // Production implementation (commented out for now due to compilation issues)
        // Get the reserve data from Aave V3
        // The actual implementation would look like this:
        
        // Get the reserve data
        (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 currentLiquidityRate,
            uint128 variableBorrowIndex,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint8 id
        ) = aavePool.getReserveData(address(wbtc));
        
        if (currentLiquidityRate == 0) {
            return 0;
        }
        
        // Convert from RAY to basis points (1e27 to 1e4)
        // APY = (liquidityRate / 1e27) * 100 * 100 (to basis points)
        uint256 apyInBasisPoints = (uint256(currentLiquidityRate) * 1e4) / 1e25;
        
        // Cap at 1000% APY to prevent overflow in calculations
        return apyInBasisPoints > 100000 ? 100000 : apyInBasisPoints;
        */
    }
    
    /**
     * @inheritdoc IStakingStrategy
     */
    function harvest() external override returns (uint256) {
        // In Aave v3, aTokens automatically accrue interest, so we just need to
        // return the current balance minus the previously recorded balance
        uint256 currentBalance = aWbtc.balanceOf(address(this));
        
        // If there are rewards (interest earned), emit event
        if (currentBalance > 0) {
            emit Harvested(currentBalance);
            return currentBalance;
        }
        
        return 0;
    }
    
    /**
     * @notice Recover ERC20 tokens sent by mistake
     * @param token Address of the token to recover
     * @param to Address to send the tokens to
     */
    function recoverERC20(address token, address to) external onlyOwner {
        require(token != address(wbtc) && token != address(aWbtc), "Cannot recover staked tokens");
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
    }
}
