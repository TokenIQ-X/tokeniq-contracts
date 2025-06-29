// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./TokenizedInvoice.sol";
import "../strategies/RWAInvoiceVaultSimple.sol";

/**
 * @title InvoiceRegistry
 * @notice Registry for managing tokenized invoices and their lifecycle
 */
contract InvoiceRegistry is Ownable, IERC721Receiver {
    // Address of the TokenizedInvoice contract
    TokenizedInvoice public tokenizedInvoice;
    
    // Mapping from invoice ID to funding vault address
    mapping(uint256 => address) public invoiceVaults;
    
    // Events
    event InvoiceCreated(
        uint256 indexed tokenId,
        address indexed issuer,
        address beneficiary,
        uint256 amount,
        uint256 dueDate,
        string invoiceURI
    );
    
    event InvoiceFunded(
        uint256 indexed tokenId,
        address indexed funder,
        uint256 amount,
        address vault
    );
    
    event InvoicePaid(uint256 indexed tokenId);
    event InvoiceDefaulted(uint256 indexed tokenId);
    event InvoiceSettled(uint256 indexed tokenId);
    
    /**
     * @dev Constructor that deploys a new TokenizedInvoice contract
     */
    constructor() {
        tokenizedInvoice = new TokenizedInvoice();
        tokenizedInvoice.transferOwnership(msg.sender);
    }
    
    /**
     * @dev Handles the receipt of an ERC721 token
     * @return bytes4 `IERC721Receiver.onERC721Received.selector`
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    /**
     * @notice Creates a new invoice
     * @param beneficiary The address that will receive payment
     * @param amount The invoice amount in wei
     * @param dueDate Unix timestamp when payment is due
     * @param invoiceURI URI pointing to invoice metadata
     * @return tokenId The ID of the newly created invoice token
     */
    function createInvoice(
        address beneficiary,
        uint256 amount,
        uint256 dueDate,
        string calldata invoiceURI
    ) external returns (uint256) {
        uint256 tokenId = tokenizedInvoice.createInvoice(
            beneficiary,
            amount,
            dueDate,
            invoiceURI
        );
        
        emit InvoiceCreated(
            tokenId,
            msg.sender,
            beneficiary,
            amount,
            dueDate,
            invoiceURI
        );
        
        return tokenId;
    }
    
    /**
     * @notice Funds an invoice by deploying a new vault
     * @param tokenId The ID of the invoice token to fund
     * @param vaultFactory Address of the vault factory contract
     * @param fundingAmount Amount to fund the invoice with
     */
    function fundInvoice(
        uint256 tokenId,
        address vaultFactory,
        uint256 fundingAmount,
        address paymentToken
    ) external onlyOwner {
        require(invoiceVaults[tokenId] == address(0), "Invoice already funded");
        require(paymentToken != address(0), "Invalid payment token");
        
        // Deploy a new vault for this invoice
        address vault = _deployVault(vaultFactory, tokenId, paymentToken);
        invoiceVaults[tokenId] = vault;
        
        // Update invoice status and funding amount
        tokenizedInvoice.fundInvoice(tokenId, fundingAmount);
        
        emit InvoiceFunded(tokenId, msg.sender, fundingAmount, vault);
    }
    
    /**
     * @notice Marks an invoice as paid
     * @param tokenId The ID of the invoice token
     */
    function markAsPaid(uint256 tokenId) external onlyOwner {
        tokenizedInvoice.markAsPaid(tokenId);
        emit InvoicePaid(tokenId);
    }
    
    /**
     * @notice Marks an invoice as defaulted
     * @param tokenId The ID of the invoice token
     */
    function markAsDefaulted(uint256 tokenId) external onlyOwner {
        tokenizedInvoice.markAsDefaulted(tokenId);
        emit InvoiceDefaulted(tokenId);
    }
    
    /**
     * @notice Marks an invoice as settled
     * @param tokenId The ID of the invoice token
     */
    function settleInvoice(uint256 tokenId) external onlyOwner {
        tokenizedInvoice.settleInvoice(tokenId);
        emit InvoiceSettled(tokenId);
    }
    
    /**
     * @notice Deploys a new vault for an invoice
     * @param factory Address of the vault factory contract
     * @param tokenId The ID of the invoice token
     * @return vault Address of the deployed vault
     */
    function _deployVault(
        address factory,
        uint256 tokenId,
        address paymentToken
    ) internal returns (address) {
        // Get the invoice data
        TokenizedInvoice.InvoiceData memory invoice = tokenizedInvoice.getInvoice(tokenId);
        
        // Deploy a new vault using create2 for deterministic address
        bytes memory bytecode = type(RWAInvoiceVaultSimple).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(address(this), tokenId));
        address payable vault;
        
        assembly {
            vault := create2(0, add(bytecode, 32), mload(bytecode), salt)
            if iszero(extcodesize(vault)) {
                revert(0, 0)
            }
        }
        
        // Cast to RWAInvoiceVaultSimple and initialize with invoice details
        RWAInvoiceVaultSimple vaultContract = RWAInvoiceVaultSimple(vault);
        
        // Use the provided payment token address
        require(paymentToken != address(0), "Invalid payment token");
        
        // Configure the vault with invoice details
        vaultContract.configureInvoice(
            paymentToken, // paymentToken
            address(this), // registry - InvoiceRegistry is the registry
            tokenId, // invoiceTokenId
            invoice.amount, // fundingTarget
            invoice.dueDate // fundingDeadline
        );
        
        // Transfer ownership of the vault to the invoice issuer
        vaultContract.transferOwnership(invoice.issuer);
        
        return vault;
    }
    
    /**
     * @notice Gets the vault address for an invoice
     * @param tokenId The ID of the invoice token
     * @return vault Address of the vault, or address(0) if not funded
     */
    /**
     * @notice Transfers ownership of a vault to a new owner
     * @dev Only callable by the registry owner
     * @param tokenId The ID of the invoice token
     * @param newOwner The address to transfer ownership to
     */
    function transferVaultOwnership(uint256 tokenId, address newOwner) external onlyOwner {
        address payable vault = payable(invoiceVaults[tokenId]);
        require(vault != address(0), "Vault not found");
        
        // Use the interface directly with the payable address
        RWAInvoiceVaultSimple(vault).transferOwnership(newOwner);
    }
    
    /**
     * @notice Gets the vault address for an invoice
     * @param tokenId The ID of the invoice token
     * @return vault Address of the vault, or address(0) if not funded
     */
    function getInvoiceVault(uint256 tokenId) external view returns (address) {
        return invoiceVaults[tokenId];
    }
    
    /**
     * @notice Gets the invoice data
     * @param tokenId The ID of the invoice token
     * @return InvoiceData The invoice data
     */
    function getInvoice(uint256 tokenId) external view returns (TokenizedInvoice.InvoiceData memory) {
        return tokenizedInvoice.getInvoice(tokenId);
    }
    
    /**
     * @notice Pay an invoice
     * @param tokenId The ID of the invoice token to pay
     * @param amount The amount being paid
     */
    function payInvoice(uint256 tokenId, uint256 amount) external {
        // Get the invoice data
        TokenizedInvoice.InvoiceData memory invoice = tokenizedInvoice.getInvoice(tokenId);
        
        // Check if the invoice exists
        require(invoice.amount > 0, "Invoice does not exist");
        
        // Check if the invoice is still open
        require(invoice.status == TokenizedInvoice.InvoiceStatus.Created, "Invoice is not open for payment");
        
        // Check if the payment is for the full amount
        require(amount >= invoice.amount, "Insufficient payment amount");
        
        // Transfer the payment to the beneficiary
        (bool success, ) = invoice.beneficiary.call{value: amount}("");
        require(success, "Payment transfer failed");
        
        // Mark the invoice as paid
        tokenizedInvoice.markAsPaid(tokenId);
        
        emit InvoicePaid(tokenId);
    }
}
