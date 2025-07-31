// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "./IStakingStrategy.sol";

/**
 * @title LSTBTCVault
 * @notice ERC-4626 compliant vault for liquid staking of WBTC with LSTBTC as receipt token
 */
contract LSTBTCVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Events
    event StrategyUpdated(address indexed newStrategy);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event Recovered(address indexed token, address indexed to, uint256 amount);
    event DebugLog(uint256 indexed step, string message, uint256 value1, uint256 value2);
    
    // The staking strategy contract
    address public strategy;
    
    // Track total staked amount
    uint256 private _totalStaked;
    
    /**
     * @dev Constructor
     * @param _wbtc Address of the WBTC token
     * @param _strategy Address of the staking strategy
     */
    constructor(IERC20 _wbtc, address _strategy)
        ERC20("Liquid Staked WBTC", "lstBTC")
        ERC4626(_wbtc)
        Ownable()  // msg.sender is the default owner in OpenZeppelin Ownable
    {
        require(address(_wbtc) != address(0), "Invalid WBTC");
        require(_strategy != address(0), "Invalid strategy");
        
        strategy = _strategy;
        _wbtc.safeApprove(_strategy, type(uint256).max);
    }
    
    /**
     * @notice Deposit WBTC and mint LSTBTC on a 1:1
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(assets > 0, "Cannot deposit 0");
        
        // Log pre-transfer state
        emit DebugLog(0, "Before transferFrom", address(this).balance, IERC20(asset()).balanceOf(address(this)));
        
        // Transfer WBTC from user to vault
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        
        // Log post-transfer state
        emit DebugLog(1, "After transferFrom", assets, IERC20(asset()).balanceOf(address(this)));
        
        // Stake in strategy
        _stake(assets);
        
        // Calculate and mint shares - use 1:1 for simplicity in this implementation
        uint256 shares = assets;
        
        emit DebugLog(2, "Before minting shares", shares, balanceOf(receiver));
        
        // Mint shares to receiver
        _mint(receiver, shares);
        
        // Log post-mint state
        emit DebugLog(3, "After minting shares", shares, balanceOf(receiver));
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }
    
    /**
     * @notice Withdraw WBTC by burning LSTBTC on a 1:1 basis
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant whenNotPaused returns (uint256) {
        require(assets > 0, "Cannot withdraw 0");
        
        // Calculate shares needed for the requested assets (1:1 in our case)
        uint256 shares = assets;
        
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        // Check for sufficient balance
        require(balanceOf(owner) >= shares, "Insufficient balance");
        
        // Burn shares first (checks-effects-interaction pattern)
        _burn(owner, shares);
        
        // Then perform the unstake
        _unstake(assets, receiver);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }
    
    /**
     * @dev Override _mint to add debug logging
     */
    function _mint(address account, uint256 amount) internal override(ERC20) {
        emit DebugLog(10, "Before _mint", amount, balanceOf(account));
        super._mint(account, amount);
        emit DebugLog(11, "After _mint", amount, balanceOf(account));
    }
    
    /**
     * @dev Internal function to stake assets using the strategy
     * @param amount The amount of assets to stake
     */
    function _stake(uint256 amount) internal {
        if (amount == 0) return;
        
        // Transfer WBTC to strategy for staking
        IERC20(asset()).safeTransfer(strategy, amount);
        
        // Call stake on strategy using the interface
        IStakingStrategy strategyContract = IStakingStrategy(strategy);
        strategyContract.stake(amount);
        
        _totalStaked += amount;
    }
    
    /**
     * @notice Allows the owner to recover ERC20 tokens sent to the contract by mistake
     * @param tokenAddress The address of the token to recover
     * @param to The address to send the tokens to
     * @param amount The amount of tokens to recover
     */
    function recoverERC20(address tokenAddress, address to, uint256 amount) external onlyOwner {
        require(tokenAddress != address(asset()), "Cannot recover the underlying token");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(amount <= balance, "Insufficient balance");
        
        token.safeTransfer(to, amount);
        emit Recovered(tokenAddress, to, amount);
    }
    
    /**
     * @dev Internal function to unstake assets
     */
    function _unstake(uint256 amount, address receiver) internal {
        require(amount > 0, "Cannot unstake 0");
        require(amount <= _totalStaked, "Insufficient staked amount");
        
        // Get the strategy instance
        IStakingStrategy strategyContract = IStakingStrategy(strategy);
        
        // Call the unstake function on the strategy
        strategyContract.unstake(amount, receiver);
        
        // Update the total staked amount (safe math not needed in Solidity 0.8+)
        _totalStaked -= amount;
        
        // Ensure we never have a negative total staked
        if (_totalStaked < 0) {
            _totalStaked = 0;
        }
    }
    
    /**
     * @notice Update the staking strategy by the owner
     */
    function updateStrategy(address newStrategy) external onlyOwner {
        require(newStrategy != address(0), "Invalid strategy");
        strategy = newStrategy;
        IERC20(asset()).safeApprove(newStrategy, type(uint256).max);
        emit StrategyUpdated(newStrategy);
    }
    
    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdraw() external onlyOwner {
        _pause();
        (bool success, ) = strategy.call(
            abi.encodeWithSignature("emergencyWithdraw()")
        );
        require(success, "Emergency withdrawal failed");
        _totalStaked = 0;
    }
    
    /**
     * @notice Total assets in the vault (staked + waiting to be staked)
     */
    function totalAssets() public view override returns (uint256) {
        uint256 total = _totalStaked + IERC20(asset()).balanceOf(address(this));
        // Ensure we never return 0 when there are shares to prevent division by zero
        return total == 0 ? 1 : total;
    }
    
    /**
     * @notice Pause all deposits and withdrawals
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the vault
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
