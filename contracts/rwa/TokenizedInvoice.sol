// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TokenizedInvoice
 * @notice ERC721 token representing an invoice with additional metadata and status tracking
 */
contract TokenizedInvoice is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    // Invoice statuses
    enum InvoiceStatus { Created, Funded, Paid, Defaulted, Settled }
    
    struct InvoiceData {
        address issuer;             // Entity that issued the invoice
        address beneficiary;         // Entity that will receive payment
        uint256 amount;              // Invoice amount in wei
        uint256 dueDate;             // Unix timestamp when payment is due
        string  invoiceURI;          // IPFS or other URI pointing to invoice metadata
        InvoiceStatus status;        // Current status of the invoice
        uint256 fundingAmount;       // Amount currently funded against this invoice
    }
    
    // Token ID to invoice data mapping
    mapping(uint256 => InvoiceData) private _invoices;
    
    // Invoice token counter
    Counters.Counter private _tokenIds;
    
    // Events
    event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, address beneficiary, uint256 amount);
    event InvoiceFunded(uint256 indexed tokenId, uint256 amount);
    event InvoicePaid(uint256 indexed tokenId);
    event InvoiceDefaulted(uint256 indexed tokenId);
    event InvoiceSettled(uint256 indexed tokenId);
    
    constructor() ERC721("TokenizedInvoice", "TINV") {}
    
    /**
     * @notice Creates a new invoice token
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
        string memory invoiceURI
    ) external returns (uint256) {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _invoices[newTokenId] = InvoiceData({
            issuer: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            dueDate: dueDate,
            invoiceURI: invoiceURI,
            status: InvoiceStatus.Created,
            fundingAmount: 0
        });
        
        _safeMint(msg.sender, newTokenId);
        
        emit InvoiceCreated(newTokenId, msg.sender, beneficiary, amount);
        return newTokenId;
    }
    
    /**
     * @notice Updates the funding amount for an invoice
     * @dev Only callable by the owner
     * @param tokenId The ID of the invoice token
     * @param amount The amount being funded
     */
    function fundInvoice(uint256 tokenId, uint256 amount) external onlyOwner {
        require(_exists(tokenId), "Invoice does not exist");
        InvoiceData storage invoice = _invoices[tokenId];
        
        require(invoice.status == InvoiceStatus.Created || invoice.status == InvoiceStatus.Funded, "Invalid status");
        require(amount > 0, "Amount must be greater than 0");
        
        invoice.fundingAmount += amount;
        invoice.status = InvoiceStatus.Funded;
        
        emit InvoiceFunded(tokenId, amount);
    }
    
    /**
     * @notice Marks an invoice as paid
     * @dev Only callable by the owner
     * @param tokenId The ID of the invoice token
     */
    function markAsPaid(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Invoice does not exist");
        InvoiceData storage invoice = _invoices[tokenId];
        
        require(invoice.status == InvoiceStatus.Funded, "Invoice must be funded first");
        
        invoice.status = InvoiceStatus.Paid;
        emit InvoicePaid(tokenId);
    }
    
    /**
     * @notice Marks an invoice as defaulted
     * @dev Only callable by the owner
     * @param tokenId The ID of the invoice token
     */
    function markAsDefaulted(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Invoice does not exist");
        InvoiceData storage invoice = _invoices[tokenId];
        
        require(invoice.status == InvoiceStatus.Funded, "Invoice must be funded first");
        require(block.timestamp > invoice.dueDate, "Invoice is not yet due");
        
        invoice.status = InvoiceStatus.Defaulted;
        emit InvoiceDefaulted(tokenId);
    }
    
    /**
     * @notice Marks an invoice as settled
     * @dev Only callable by the owner
     * @param tokenId The ID of the invoice token
     */
    function settleInvoice(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Invoice does not exist");
        InvoiceData storage invoice = _invoices[tokenId];
        
        require(
            invoice.status == InvoiceStatus.Paid || 
            invoice.status == InvoiceStatus.Defaulted,
            "Invalid status"
        );
        
        invoice.status = InvoiceStatus.Settled;
        emit InvoiceSettled(tokenId);
    }
    
    /**
     * @notice Returns the invoice data for a given token ID
     * @param tokenId The ID of the invoice token
     * @return InvoiceData The invoice data
     */
    function getInvoice(uint256 tokenId) external view returns (InvoiceData memory) {
        require(_exists(tokenId), "Invoice does not exist");
        return _invoices[tokenId];
    }
    
    /**
     * @notice Override to include the token URI
     * @param tokenId The ID of the token
     * @return string The token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _invoices[tokenId].invoiceURI;
    }
    
    /**
     * @notice Override to prevent transfers of tokens that are not in a transferable state
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Only allow transfers if the invoice is in a transferable state
        if (from != address(0) && to != address(0)) { // Not minting or burning
            InvoiceStatus status = _invoices[tokenId].status;
            require(
                status == InvoiceStatus.Created || status == InvoiceStatus.Settled,
                "Cannot transfer invoice in current state"
            );
        }
    }
}
