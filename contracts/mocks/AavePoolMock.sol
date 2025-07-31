// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC20Mock.sol";

contract AavePoolMock {
    IERC20 public immutable underlyingToken;
    IERC20 public immutable aToken;
    
    constructor(address _underlyingToken, address _aToken) {
        underlyingToken = IERC20(_underlyingToken);
        aToken = IERC20(_aToken);
    }
    
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external returns (uint256) {
        require(asset == address(underlyingToken), "Unsupported asset");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer underlying tokens from the sender (strategy contract)
        // The strategy should have already transferred the tokens to this contract
        
        // Mint aTokens to the onBehalfOf address using the ERC20Mock interface
        // We need to cast to the actual ERC20Mock type to access the mint function
        ERC20Mock token = ERC20Mock(address(aToken));
        token.mint(onBehalfOf, amount);
        
        // Emit an event to simulate the deposit
        emit Supply(asset, msg.sender, onBehalfOf, amount, referralCode);
        emit Transfer(address(0), onBehalfOf, amount);
        
        return amount;
    }
    
    // Event to simulate Aave's supply event
    event Supply(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 indexed referral
    );
    
    // Event to simulate Aave's withdraw event
    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );
    
    // Event to simulate ERC20 Transfer event
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset == address(underlyingToken), "Unsupported asset");
        require(amount > 0, "Amount must be greater than 0");
        
        // In a real Aave pool, the aToken would be burned during withdrawal
        // For the mock, we'll just ensure the sender has enough aTokens
        require(IERC20(aToken).balanceOf(msg.sender) >= amount, "Insufficient aToken balance");
        
        // Transfer aTokens from the sender to this contract (simulating burning)
        bool success = IERC20(aToken).transferFrom(msg.sender, address(this), amount);
        require(success, "aToken transfer failed");
        
        // Transfer underlying tokens to recipient
        IERC20(asset).transfer(to, amount);
        
        // Emit an event to simulate the withdrawal
        emit Withdraw(asset, msg.sender, to, amount);
        
        return amount;
    }
    
    // Helper function for testing - mint aTokens to simulate rewards
    function mintATokens(address to, uint256 amount) external {
        // In a real Aave pool, this would be called by the Aave protocol
        aToken.transfer(to, amount);
    }
}
