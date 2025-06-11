// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISimpleAavePool.sol";

// Interface for aToken that includes minting functionality
interface IAToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

// Minimal mock that implements only what AaveVault needs
contract MockAavePool is ISimpleAavePool {
    address public aToken;
    
    // Track underlying token balances per user
    mapping(address => uint256) public userBalances;
    
    // Track total underlying token balance in the pool
    mapping(address => uint256) public tokenBalances;
    
    // Track aToken balances per user (aToken address => user address => balance)
    mapping(address => mapping(address => uint256)) public aTokenBalances;

    event Supply(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 indexed referralCode
    );

    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    function setAToken(address _aToken) external {
        aToken = _aToken;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(asset != address(0), "Invalid asset address");
        require(onBehalfOf != address(0), "Invalid onBehalfOf address");
        
        // Get the token contract
        IERC20 token = IERC20(asset);
        
        // Get the sender's allowance and balance
        uint256 allowance = token.allowance(msg.sender, address(this));
        uint256 senderBalance = token.balanceOf(msg.sender);
        
        require(allowance >= amount, "Insufficient allowance");
        require(senderBalance >= amount, "Insufficient balance");
        
        // Transfer tokens from the user to this contract
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        // Update user's balance and total supply
        userBalances[onBehalfOf] += amount;
        tokenBalances[asset] += amount;
        
        // Update aToken balance for the user
        aTokenBalances[aToken][onBehalfOf] += amount;
        
        // Mint aTokens to the onBehalfOf address
        IAToken(aToken).mint(onBehalfOf, amount);
        
        emit Supply(asset, msg.sender, onBehalfOf, amount, referralCode);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset != address(0), "Invalid asset address");
        require(to != address(0), "Invalid recipient address");
        
        // For emergency withdrawals (amount == type(uint256).max), use the entire aToken balance
        uint256 userATokenBalance = aTokenBalances[aToken][msg.sender];
        uint256 withdrawAmount = amount == type(uint256).max ? userATokenBalance : amount;
        require(userATokenBalance >= withdrawAmount, "Insufficient aToken balance");
        
        uint256 availableLiquidity = tokenBalances[asset];
        require(availableLiquidity >= withdrawAmount, "Insufficient liquidity in pool");
        
        IERC20 token = IERC20(asset);
        
        // Burn aTokens from the sender
        aTokenBalances[aToken][msg.sender] = userATokenBalance - withdrawAmount;
        userBalances[msg.sender] -= withdrawAmount;
        tokenBalances[asset] = availableLiquidity - withdrawAmount;
        
        // Actually burn the aTokens
        IAToken(aToken).burn(msg.sender, withdrawAmount);
        
        // Transfer underlying tokens to the recipient
        bool success = token.transfer(to, withdrawAmount);
        require(success, "Token transfer failed");
        
        emit Withdraw(asset, msg.sender, to, withdrawAmount);
        
        return withdrawAmount;
    }

    // Add tokens to the pool (for testing)
    function addLiquidity(address token, uint256 amount) external {
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        tokenBalances[token] += amount;
    }

    function getReserveNormalizedIncome(address asset) external pure returns (uint256) {
        return 1e27; // Return 1:1 ratio for simplicity
    }
    
    // Get aToken balance for a user
    function getATokenBalance(address user) external view returns (uint256) {
        return aTokenBalances[aToken][user];
    }

    // Get reserve data (simplified for testing)
    function getReserveData(address asset) external view returns (uint256) {
        return 0;
    }
} 