// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ITokenizedInvoice {
    function fundInvoice(uint256 tokenId, uint256 amount) external;
    function repayInvoice(uint256 tokenId, uint256 amount) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @title RWAInvoiceVaultSimple
 * @notice Simplified non-upgradeable version of RWAInvoiceVault for testing
 */
contract RWAInvoiceVaultSimple is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Address of the payment token (e.g., USDC, DAI)
    address public paymentToken;
    
    // Address of the invoice registry
    address public registry;
    
    // Invoice token ID
    uint256 public invoiceTokenId;
    
    // Total amount funded
    uint256 public totalFunded;
    
    // Total amount repaid
    uint256 public totalRepaid;
    
    // Funding deadline
    uint256 public fundingDeadline;
    
    // Funding target
    uint256 public fundingTarget;
    
    // Funding status
    bool public isConfigured;
    bool public isFullyFunded;
    bool public isFullyRepaid;
    
    // Events
    event Funded(address indexed funder, uint256 amount);
    event Repayment(address indexed payer, uint256 amount);
    event Repaid(address indexed payer, uint256 amount, uint256 previousRepaid, uint256 totalRepaid);
    event FullyRepaid(address indexed payer, uint256 totalRepaid, uint256 totalInterest);
    event Withdrawn(address indexed to, uint256 amount);
    event NativeFundsWithdrawn(address indexed to, uint256 amount);
    event ERC20FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event InvoiceConfigured(
        address indexed paymentToken,
        address indexed registry,
        uint256 invoiceTokenId,
        uint256 fundingTarget,
        uint256 fundingDeadline
    );

    /**
     * @notice Configures the invoice details for this vault
     * @param _paymentToken Address of the payment token (e.g., USDC, DAI)
     * @param _registry Address of the InvoiceRegistry contract
     * @param _invoiceTokenId The token ID of the invoice NFT
     * @param _fundingTarget Target funding amount in payment token decimals
     * @param _fundingDeadline Deadline for funding in UNIX timestamp
     */
    function configureInvoice(
        address _paymentToken,
        address _registry,
        uint256 _invoiceTokenId,
        uint256 _fundingTarget,
        uint256 _fundingDeadline
    ) external onlyOwner {
        // Check if already configured
        require(!isConfigured, "Vault already configured");
        
        // Validate parameters
        require(_paymentToken != address(0), "Invalid payment token");
        require(_registry != address(0), "Invalid registry address");
        require(_fundingTarget > 0, "Funding target must be greater than 0");
        require(
            _fundingDeadline > block.timestamp && 
            _fundingDeadline < block.timestamp + 365 days, // Max 1 year funding period
            "Invalid funding deadline"
        );
        
        // Set invoice configuration
        paymentToken = _paymentToken;
        registry = _registry;
        invoiceTokenId = _invoiceTokenId;
        fundingTarget = _fundingTarget;
        fundingDeadline = _fundingDeadline;
        isConfigured = true;
        
        emit InvoiceConfigured(
            _paymentToken,
            _registry,
            _invoiceTokenId,
            _fundingTarget,
            _fundingDeadline
        );
    }

    // Add other necessary functions with minimal implementation for testing
    function fund(uint256 amount) external nonReentrant {
        // Simplified implementation for testing
        require(isConfigured, "Vault not configured");
        require(block.timestamp <= fundingDeadline, "Funding period has ended");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        totalFunded += amount;
        
        emit Funded(msg.sender, amount);
    }
    
    function repay(uint256 amount) external onlyOwner nonReentrant {
        // Simplified implementation for testing
        require(isConfigured, "Vault not configured");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        totalRepaid += amount;
        
        emit Repaid(msg.sender, amount, totalRepaid - amount, totalRepaid);
    }
    
    function withdrawFunds(address to, address tokenAddress, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        if (tokenAddress == address(0)) {
            // Native token
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
            emit NativeFundsWithdrawn(to, amount);
        } else {
            // ERC20 token
            IERC20(tokenAddress).safeTransfer(to, amount);
            emit ERC20FundsWithdrawn(tokenAddress, to, amount);
        }
    }
    
    // View functions
    function getBalance() external view returns (uint256) {
        return IERC20(paymentToken).balanceOf(address(this));
    }
    
    function getFundingProgress() external view returns (uint256 fundedAmount, uint256 targetAmount, uint256 progress) {
        return (totalFunded, fundingTarget, (totalFunded * 10000) / fundingTarget);
    }
    
    function isFundingActive() external view returns (bool) {
        return block.timestamp <= fundingDeadline && !isFullyFunded;
    }
    
    // Receive function to accept native tokens
    receive() external payable {}
}
