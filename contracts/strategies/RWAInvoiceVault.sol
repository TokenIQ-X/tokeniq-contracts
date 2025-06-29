// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/ITreasuryAIManager.sol";

interface ITokenizedInvoice {
    function fundInvoice(uint256 tokenId, uint256 amount) external;
    function repayInvoice(uint256 tokenId, uint256 amount) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @title RWAInvoiceVault
 * @notice Vault for managing funding and payments of a single tokenized invoice
 */
contract RWAInvoiceVault is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    // Address of the payment token (e.g., USDC, DAI)
    address public paymentToken;
    
    // Address of the invoice registry
    address public registry;
    
    // Treasury AI Manager for automated management
    ITreasuryAIManager public treasuryAIManager;
    
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
     * @dev Initializes the vault with the TreasuryAIManager
     * @param _treasuryAIManager Address of the TreasuryAIManager contract
     */
    function initialize(address _treasuryAIManager) external initializer {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager");
        
        // Initialize upgradeable contracts
        __Ownable_init();
        __ReentrancyGuard_init();
        
        // Initialize state variables
        treasuryAIManager = ITreasuryAIManager(_treasuryAIManager);
        isConfigured = false;
        isFullyFunded = false;
        isFullyRepaid = false;
        totalFunded = 0;
        totalRepaid = 0;
        fundingTarget = 0;
        fundingDeadline = 0;
        invoiceTokenId = 0;
        
        // Transfer ownership to the deployer
        _transferOwnership(msg.sender);
    }
    
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
        
        // Verify the registry contract is valid
        require(
            IERC165Upgradeable(_registry).supportsInterface(type(IERC721Upgradeable).interfaceId) ||
            IERC165Upgradeable(_registry).supportsInterface(type(ITokenizedInvoice).interfaceId),
            "Registry must support required interfaces"
        );
        
        // Verify the payment token is a valid ERC20
        (bool success, ) = _paymentToken.staticcall(
            abi.encodeWithSelector(IERC20Upgradeable(_paymentToken).balanceOf.selector, address(this))
        );
        require(success, "Invalid ERC20 token");
        
        emit InvoiceConfigured(
            _paymentToken,
            _registry,
            _invoiceTokenId,
            _fundingTarget,
            _fundingDeadline
        );
        
        // Notify TreasuryAIManager about the configuration
        treasuryAIManager.notifyVaultConfigured(
            address(this),
            _paymentToken,
            _invoiceTokenId,
            _fundingTarget,
            _fundingDeadline
        );
    }
    
    /**
     * @notice Allows users to fund this invoice
     * @param amount Amount to fund
     */
    function fund(uint256 amount) external {
        require(isConfigured, "Vault not configured");
        require(!isFullyFunded, "Invoice already fully funded");
        require(block.timestamp <= fundingDeadline, "Funding period has ended");
        require(amount > 0, "Amount must be greater than 0");
        
        // Get payment token from TreasuryAIManager if not set
        if (paymentToken == address(0)) {
            paymentToken = treasuryAIManager.defaultPaymentToken();
            require(paymentToken != address(0), "No payment token available");
        }
        
        // Transfer tokens from funder to this contract
        IERC20Upgradeable(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update funding state
        totalFunded += amount;
        
        // Check if funding target is reached
        if (totalFunded >= fundingTarget) {
            isFullyFunded = true;
            
            // Notify TreasuryAIManager about successful funding
            treasuryAIManager.notifyFundingComplete(
                address(this),
                invoiceTokenId,
                totalFunded
            );
            
            // Notify the registry that funding is complete
            if (registry != address(0)) {
                ITokenizedInvoice(registry).fundInvoice(invoiceTokenId, totalFunded);
            }
        }
        
        emit Funded(msg.sender, amount);
    }
    
    /**
     * @notice Allows the owner to repay the invoice
     * @param amount Amount to repay
     */
    function repay(uint256 amount) external onlyOwner {
        require(isConfigured, "Vault not configured");
        require(isFullyFunded, "Invoice not fully funded");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= totalFunded, "Cannot repay more than funded amount");
        require(!isFullyRepaid, "Invoice already fully repaid");
        
        // Get payment token from storage
        require(paymentToken != address(0), "Payment token not set");
        
        // Transfer tokens from owner to this contract
        IERC20Upgradeable(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update repayment state
        uint256 previousRepaid = totalRepaid;
        totalRepaid += amount;
        
        // Calculate interest if needed (this is a simplified example)
        uint256 interest = 0;
        if (totalRepaid > totalFunded) {
            interest = totalRepaid - totalFunded;
        }
        
        // Notify TreasuryAIManager about the repayment
        treasuryAIManager.notifyRepayment(
            address(this),
            invoiceTokenId,
            amount,
            interest
        );
        
        // Check if fully repaid
        if (totalRepaid >= totalFunded) {
            isFullyRepaid = true;
            
            // Notify the registry that repayment is complete
            if (registry != address(0)) {
                ITokenizedInvoice(registry).repayInvoice(invoiceTokenId, totalRepaid);
            }
            
            emit FullyRepaid(msg.sender, totalRepaid, interest);
        }
        
        emit Repaid(msg.sender, amount, previousRepaid, totalRepaid);
    }
    
    /**
     * @notice Allows the owner to withdraw funds from the vault
     * @param to Address to send funds to
     * @param tokenAddress Address of the token to withdraw (address(0) for native token)
     * @param amount Amount to withdraw (0 = all available)
     */
    function withdrawFunds(
        address to,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient address");
        require(isConfigured, "Vault not configured");
        
        // Check if we're withdrawing native token or ERC20
        if (tokenAddress == address(0)) {
            // Native token withdrawal
            uint256 balance = address(this).balance;
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount > 0, "No funds to withdraw");
            require(withdrawAmount <= balance, "Insufficient balance");
            
            // Transfer native tokens
            (bool success, ) = payable(to).call{value: withdrawAmount}("");
            require(success, "Native token transfer failed");
            
            emit NativeFundsWithdrawn(to, withdrawAmount);
        } else {
            // ERC20 token withdrawal
            require(tokenAddress != address(paymentToken) || isFullyFunded || !isFullyFunded, 
                "Cannot withdraw payment token before repayment");
                
            IERC20Upgradeable token = IERC20Upgradeable(tokenAddress);
            uint256 balance = token.balanceOf(address(this));
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            
            require(withdrawAmount > 0, "No token balance to withdraw");
            require(withdrawAmount <= balance, "Insufficient token balance");
            
            // Transfer ERC20 tokens
            token.safeTransfer(to, withdrawAmount);
            
            emit ERC20FundsWithdrawn(tokenAddress, to, withdrawAmount);
        }
        
        // Notify TreasuryAIManager about the withdrawal
        treasuryAIManager.notifyFundsWithdrawn(
            address(this),
            tokenAddress,
            to,
            amount
        );
    }
    
    /**
     * @notice Returns the current balance of the vault
     * @return Current balance in payment tokens
     */
    function getBalance() external view returns (uint256) {
        return IERC20Upgradeable(paymentToken).balanceOf(address(this));
    }
    
    /**
     * @notice Returns the funding progress
     * @return fundedAmount Amount funded so far
     * @return targetAmount Funding target
     * @return progress Funding progress as a percentage (0-100)
     */
    function getFundingProgress() external view returns (
        uint256 fundedAmount,
        uint256 targetAmount,
        uint256 progress
    ) {
        fundedAmount = totalFunded;
        targetAmount = fundingTarget;
        progress = targetAmount > 0 ? (fundedAmount * 100) / targetAmount : 0;
    }
    
    /**
     * @notice Checks if the funding period is active
     * @return True if funding period is active, false otherwise
     */
    function isFundingActive() external view returns (bool) {
        return block.timestamp <= fundingDeadline && !isFullyFunded;
    }
}
